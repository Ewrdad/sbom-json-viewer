import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useSbomStats } from "../../hooks/useSbomStats";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import type { SbomStats } from "@/types/sbom";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from "recharts";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Filter,
  Fingerprint,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  X,
  Network,
  ExternalLink,
  BookOpen,
  Info,
  Layers,
  User,
  Building,
} from "lucide-react";
import { HelpTooltip } from "@/components/common/HelpTooltip";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ComponentDetailPanel } from "./ComponentDetailPanel";
import { useDependencyAnalysis } from "../../hooks/useDependencyAnalysis";
import { SearchButton } from "@/components/common/SearchButton";
import { CHART_TOOLTIP_STYLE, CHART_CURSOR, CHART_AXIS_PROPS, CHART_TOOLTIP_LABEL_STYLE, CHART_TOOLTIP_ITEM_STYLE } from "@/lib/chartTheme";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

const ITEMS_PER_PAGE = 20;

type SortKey = "name" | "critical" | "high" | "medium" | "low" | "total" | "id" | "severity" | "affectedCount";
type SortDir = "asc" | "desc";
type ViewMode = "components" | "vulnerabilities";

const SEVERITY_COLORS = {
  Critical: "#dc2626",
  High: "#ea580c",
  Medium: "#ca8a04",
  Low: "#2563eb",
  None: "#16a34a",
};

const getSeverityColor = (sev?: string) => {
  if (!sev) return SEVERITY_COLORS.None;
  try {
    const normalized = sev.charAt(0).toUpperCase() + sev.slice(1).toLowerCase();
    return SEVERITY_COLORS[normalized as keyof typeof SEVERITY_COLORS] || SEVERITY_COLORS.None;
  } catch {
    return SEVERITY_COLORS.None;
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function VulnerabilitiesView({ sbom, preComputedStats }: { sbom: any; preComputedStats?: SbomStats }) {
  const stats = useSbomStats(preComputedStats ? null : sbom);
  const isLoadingStats = !preComputedStats && !stats;
  
  // High-defensive initialization
  const fallbackStats: SbomStats = {
    totalComponents: 0,
    vulnerabilityCounts: { critical: 0, high: 0, medium: 0, low: 0, none: 0 },
    licenseCounts: {},
    topLicenses: [],
    licenseDistribution: { permissive: 0, copyleft: 0, weakCopyleft: 0, proprietary: 0, unknown: 0 },
    vulnerableComponents: [],
    allVulnerableComponents: [],
    totalVulnerabilities: 0,
    allVulnerabilities: [],
    allLicenses: [],
    allLicenseComponents: [],
    uniqueVulnerabilityCount: 0,
    avgVulnerabilitiesPerComponent: 0,
    dependencyStats: { direct: 0, transitive: 0 },
    dependentsDistribution: {},
    vulnerabilityImpactDistribution: {},
    cweCounts: {},
    sourceCounts: {},
  };

  const displayStats: SbomStats = {
    ...fallbackStats,
    ...(preComputedStats ?? stats ?? {}),
  } as SbomStats;

  // Final safety check to ensure vulnerabilityCounts is never undefined
  if (!displayStats.vulnerabilityCounts) {
    displayStats.vulnerabilityCounts = fallbackStats.vulnerabilityCounts;
  }
  
  // Debug log (only in dev)
  if (import.meta.env.DEV && !isLoadingStats) {
    console.log('[VulnerabilitiesView] displayStats:', displayStats);
  }

  const [viewMode, setViewMode] = useState<ViewMode>("components");

  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [cveSortKey, setCveSortKey] = useState<SortKey>("affectedCount");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [cveSortDir, setCveSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);
  const [selectedComponent, setSelectedComponent] = useState<unknown | null>(null);
  const [selectedVulnerability, setSelectedVulnerability] = useState<any>(null);
  const [selectedSeverities, setSelectedSeverities] = useState<string[]>([]);

  const { analysis } = useDependencyAnalysis(sbom);

  const handleSort = (key: SortKey) => {
    if (viewMode === "components") {
      if (sortKey === key) {
        setSortDir(sortDir === "desc" ? "asc" : "desc");
      } else {
        setSortKey(key);
        setSortDir("desc");
      }
    } else {
      if (cveSortKey === key) {
        setCveSortDir(cveSortDir === "desc" ? "asc" : "desc");
      } else {
        setCveSortKey(key);
        setCveSortDir("desc");
      }
    }
    setPage(0);
  };

  const toggleSeverity = (severity: string) => {
    setSelectedSeverities(prev => 
      prev.includes(severity) 
        ? prev.filter(s => s !== severity) 
        : [...prev, severity]
    );
    setPage(0);
  };

  const clearFilters = () => {
    setSelectedSeverities([]);
    setSearchQuery("");
    setPage(0);
  };

  const filteredAndSorted = useMemo(() => {
    let list = displayStats.allVulnerableComponents;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.version.toLowerCase().includes(q),
      );
    }

    if (selectedSeverities.length > 0) {
      list = list.filter(c => {
        // Check if any of the component's severities are in the selected list
        return selectedSeverities.some(s => {
          const key = s.toLowerCase() as "critical" | "high" | "medium" | "low";
          return ((c as any)[key] || 0) > 0;
        });
      });
    }

    const sorted = [...list].sort((a, b) => {
      const aVal = sortKey === "name" ? a.name : (a as Record<string, unknown>)[sortKey];
      const bVal = sortKey === "name" ? b.name : (b as Record<string, unknown>)[sortKey];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return sorted;
  }, [displayStats.allVulnerableComponents, searchQuery, sortKey, sortDir, selectedSeverities]);

  const filteredAndSortedVulnerabilities = useMemo(() => {
    let list = displayStats.allVulnerabilities;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((v) => 
        v.id.toLowerCase().includes(q) || 
        (v.title && v.title.toLowerCase().includes(q))
      );
    }

    if (selectedSeverities.length > 0) {
      list = list.filter(v => {
        if (!v.severity) return false;
        const normalized = v.severity.charAt(0).toUpperCase() + v.severity.slice(1).toLowerCase();
        return selectedSeverities.includes(normalized);
      });
    }

    const sorted = [...list].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[cveSortKey];
      const bVal = (b as Record<string, unknown>)[cveSortKey];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return cveSortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return cveSortDir === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return sorted;
  }, [displayStats.allVulnerabilities, searchQuery, cveSortKey, cveSortDir, selectedSeverities]);

  const activeList = viewMode === "components" ? filteredAndSorted : filteredAndSortedVulnerabilities;

  const totalPages = Math.max(1, Math.ceil(activeList.length / ITEMS_PER_PAGE));
  const pageItems = activeList.slice(
    page * ITEMS_PER_PAGE,
    (page + 1) * ITEMS_PER_PAGE,
  );

  // 2. Top CWEs
  const topCwes = useMemo(() => {
    return Object.entries(displayStats.cweCounts || {})
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [displayStats.cweCounts]);

  // 3. Top Sources
  const topSources = useMemo(() => {
    return Object.entries(displayStats.sourceCounts || {})
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [displayStats.sourceCounts]);

  const { critical, high, medium, low } = displayStats.vulnerabilityCounts;
  const totalVulns = displayStats.totalVulnerabilities;

  const severityPieData = [
    { name: "Critical", value: critical, color: SEVERITY_COLORS.Critical },
    { name: "High", value: high, color: SEVERITY_COLORS.High },
    { name: "Medium", value: medium, color: SEVERITY_COLORS.Medium },
    { name: "Low", value: low, color: SEVERITY_COLORS.Low },
  ].filter((d) => d.value > 0);

  const barData = [
    { name: "Critical", count: critical, fill: SEVERITY_COLORS.Critical },
    { name: "High", count: high, fill: SEVERITY_COLORS.High },
    { name: "Medium", count: medium, fill: SEVERITY_COLORS.Medium },
    { name: "Low", count: low, fill: SEVERITY_COLORS.Low },
  ];


  const originData = [
    { 
      name: "None (Leaf)", 
      value: displayStats.vulnerabilityImpactDistribution[0] || 0, 
      color: "#94a3b8" 
    },
    { 
      name: "1 Dependent", 
      value: displayStats.vulnerabilityImpactDistribution[1] || 0, 
      color: "#60a5fa" 
    },
    { 
      name: "2-5 Dependents", 
      value: Object.entries(displayStats.vulnerabilityImpactDistribution)
        .filter(([count]) => parseInt(count) >= 2 && parseInt(count) <= 5)
        .reduce((sum, [, count]) => sum + count, 0),
      color: "#3b82f6" 
    },
    { 
      name: "6+ Dependents (Hubs)", 
      value: Object.entries(displayStats.vulnerabilityImpactDistribution)
        .filter(([count]) => parseInt(count) >= 6)
        .reduce((sum, [, count]) => sum + count, 0),
      color: "#2563eb" 
    },
  ].filter(d => d.value > 0);

  const renderSortHeader = (label: string, sortKeyVal: SortKey) => {
    const activeSortKey = viewMode === "components" ? sortKey : cveSortKey;
    return (
      <button
        className="flex items-center gap-1 group cursor-pointer text-xs uppercase font-medium hover:text-foreground transition-colors bg-transparent border-none p-0"
        onClick={() => handleSort(sortKeyVal)}
      >
        {label}
        <ArrowUpDown className={`h-3 w-3 transition-opacity ${activeSortKey === sortKeyVal ? "opacity-100" : "opacity-30 group-hover:opacity-60"}`} />
      </button>
    );
  };

  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="h-full"
      key={selectedComponent || selectedVulnerability ? "split" : "single"}
    >
      <ResizablePanel
        defaultSize={selectedComponent || selectedVulnerability ? 60 : 100}
        minSize={30}
      >
        <ScrollArea className="h-full min-h-0 pr-2">
      <div className="pb-6 space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-7 w-7 text-destructive" />
          <h2 className="text-3xl font-bold tracking-tight">Vulnerabilities</h2>
          {isLoadingStats && (
            <Badge variant="outline" className="text-xs">
              Computing stats…
            </Badge>
          )}
        </div>

        {/* KPI Cards Row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6 mb-6">
          <Card className="border-l-4 border-l-destructive/60">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Findings
              </CardTitle>
              <ShieldAlert className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalVulns}</div>
              <p className="text-xs text-muted-foreground mt-1">Total package hits</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique CVEs</CardTitle>
              <ShieldCheck className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{displayStats.uniqueVulnerabilityCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Distinct IDs</p>
            </CardContent>
          </Card>

          <Card 
            className={cn(
              "border-l-4 cursor-pointer transition-all hover:bg-muted/50",
              selectedSeverities.includes("Critical") ? "ring-2 ring-red-600 ring-inset bg-red-600/5" : "border-l-red-600"
            )}
            onClick={() => toggleSeverity("Critical")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{critical}</div>
              <p className="text-xs text-muted-foreground mt-1">Immediate action</p>
            </CardContent>
          </Card>

          <Card 
            className={cn(
              "border-l-4 cursor-pointer transition-all hover:bg-muted/50",
              selectedSeverities.includes("High") ? "ring-2 ring-orange-600 ring-inset bg-orange-600/5" : "border-l-orange-600"
            )}
            onClick={() => toggleSeverity("High")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{high}</div>
              <p className="text-xs text-muted-foreground mt-1">High priority</p>
            </CardContent>
          </Card>

          <Card 
            className={cn(
              "border-l-4 cursor-pointer transition-all hover:bg-muted/50",
              selectedSeverities.includes("Medium") ? "ring-2 ring-yellow-600 ring-inset bg-yellow-600/5" : "border-l-yellow-600"
            )}
            onClick={() => toggleSeverity("Medium")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Medium</CardTitle>
              <ShieldAlert className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{medium}</div>
              <p className="text-xs text-muted-foreground mt-1">Should be fixed</p>
            </CardContent>
          </Card>

          <Card 
            className={cn(
              "border-l-4 cursor-pointer transition-all hover:bg-muted/50",
              selectedSeverities.includes("Low") ? "ring-2 ring-blue-600 ring-inset bg-blue-600/5" : "border-l-blue-600"
            )}
            onClick={() => toggleSeverity("Low")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low</CardTitle>
              <ShieldCheck className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{low}</div>
              <p className="text-xs text-muted-foreground mt-1">Minor issues</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Severity Donut */}
          <Card className="shadow-sm border-muted-foreground/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                Severity Breakdown
                <HelpTooltip text="Breakdown of individual findings by severity level." />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                {severityPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={severityPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {severityPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={CHART_TOOLTIP_STYLE}
                        labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                        itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <ShieldCheck className="h-12 w-12 text-green-500 mx-auto" />
                      <p className="text-sm text-muted-foreground">No vulnerabilities detected!</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {severityPieData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-[10px] font-medium">{entry.name}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {totalVulns > 0 ? Math.round((entry.value / totalVulns) * 100) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

            {/* Vulnerability Distribution / CWEs */}
            <Card className="shadow-sm border-muted-foreground/10 overflow-hidden relative">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                   {viewMode === "vulnerabilities" ? <Layers className="h-4 w-4" /> : <ChevronRight className="h-5 w-5" />}
                   {viewMode === "vulnerabilities" ? "Top CWE Types" : "Vulnerability Distribution"}
                   <HelpTooltip text={viewMode === "vulnerabilities" ? "Most common vulnerability types (CWEs) detected." : "Count of findings per severity level."} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[260px] w-full">
                  {viewMode === "vulnerabilities" ? (
                    topCwes.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topCwes} layout="vertical" margin={{ left: 30, right: 30, top: 10, bottom: 10 }}>
                          <XAxis type="number" hide />
                          <YAxis 
                            dataKey="name" 
                            type="category" 
                            stroke="#888888" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false}
                            width={100}
                          />
                          <Tooltip
                            contentStyle={CHART_TOOLTIP_STYLE}
                            labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                            itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                          />
                          <Bar dataKey="value" fill="#ca8a04" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic">No CWE data available</div>
                    )
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData}>
                        <XAxis dataKey="name" {...CHART_AXIS_PROPS} />
                        <YAxis {...CHART_AXIS_PROPS} />
                        <Tooltip
                          cursor={CHART_CURSOR}
                          contentStyle={CHART_TOOLTIP_STYLE}
                          labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                          itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

          <Card className="shadow-sm border-muted-foreground/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Fingerprint className="h-4 w-4" />
                {viewMode === "vulnerabilities" ? "Primary Sources" : "Vulnerability Impact"}
                <HelpTooltip text={viewMode === "vulnerabilities" ? "Distribution of vulnerability data sources." : "Shows the blast radius of vulnerabilities based on how many other components depend on the affected package."} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                {(viewMode === "vulnerabilities" ? topSources : originData).length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={viewMode === "vulnerabilities" ? topSources : originData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {(viewMode === "vulnerabilities" ? topSources : originData).map((entry: any, index: number) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={viewMode === "vulnerabilities" 
                              ? ["#2563eb", "#ea580c", "#dc2626", "#ca8a04", "#7c3aed"][index % 5]
                              : entry.color} 
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={CHART_TOOLTIP_STYLE}
                        labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                        itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-sm text-muted-foreground italic text-center px-4">
                      {viewMode === "vulnerabilities" ? "No source data available." : "No dependency graph data available to track impact."}
                    </p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {(viewMode === "vulnerabilities" ? topSources : originData).map((entry: any, index: number) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ 
                        backgroundColor: viewMode === "vulnerabilities" 
                          ? ["#2563eb", "#ea580c", "#dc2626", "#ca8a04", "#7c3aed"][index % 5] 
                          : entry.color 
                      }} 
                    />
                    <span className="text-[10px] font-medium truncate max-w-[80px]" title={entry.name}>{entry.name}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{entry.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Vulnerable Components Table */}
        <Card className="shadow-sm border-muted-foreground/10">
          <ErrorBoundary fallback={<div className="p-10 text-center text-muted-foreground">Vulnerabilities list unavailable due to a rendering error.</div>}>
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap pb-2">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-xl">
                    {viewMode === "components" ? "Vulnerable Components" : "Unique Vulnerabilities"}
                  </CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {activeList.length} total
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {viewMode === "components" 
                    ? "List of components with detected security issues" 
                    : "Unique security vulnerabilities affecting your software"}
                </p>
              </div>
              
              <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-md">
                <Button 
                  variant={viewMode === "components" ? "secondary" : "ghost"} 
                  size="sm"
                  className="text-xs h-8 px-3"
                  onClick={() => {
                    setViewMode("components");
                    setPage(0);
                  }}
                >
                  By Component
                </Button>
                <Button 
                  variant={viewMode === "vulnerabilities" ? "secondary" : "ghost"} 
                  size="sm"
                  className="text-xs h-8 px-3"
                  onClick={() => {
                    setViewMode("vulnerabilities");
                    setPage(0);
                  }}
                >
                  By Vulnerability
                </Button>
              </div>
              
              <div className="flex items-center gap-2 ml-auto">
                {(selectedSeverities.length > 0 || searchQuery) && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-8 text-muted-foreground hover:text-foreground">
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-2" data-testid="severity-filter-button">
                      <Filter className="h-3.5 w-3.5" />
                      Filter
                      {selectedSeverities.length > 0 && (
                        <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                          {selectedSeverities.length}
                        </Badge>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Severity</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {["Critical", "High", "Medium", "Low"].map((sev) => (
                      <DropdownMenuCheckboxItem
                        key={sev}
                        checked={selectedSeverities.includes(sev)}
                        onCheckedChange={() => toggleSeverity(sev)}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: SEVERITY_COLORS[sev as keyof typeof SEVERITY_COLORS] }} />
                          {sev}
                        </div>
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={viewMode === "components" ? "Search components..." : "Search CVEs..."}
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(0);
                    }}
                    className="pl-9 h-8 text-xs"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative overflow-x-auto rounded-lg border">
                <table className="w-full text-sm text-left">
                  {viewMode === "components" ? (
                    <>
                    <thead className="text-xs text-muted-foreground uppercase border-b bg-muted/30">
                      <tr>
                        <th className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {renderSortHeader("Component", "name")}
                            <HelpTooltip text="Name of the software component/package." />
                          </div>
                        </th>
                        <th className="px-4 py-3">Version</th>
                        <th className="px-4 py-3 text-center">
                          {renderSortHeader("Critical", "critical")}
                        </th>
                        <th className="px-4 py-3 text-center">
                          {renderSortHeader("High", "high")}
                        </th>
                        <th className="px-4 py-3 text-center">
                          {renderSortHeader("Medium", "medium")}
                        </th>
                        <th className="px-4 py-3 text-center">
                          {renderSortHeader("Low", "low")}
                        </th>
                        <th className="px-4 py-3 text-center">
                          {renderSortHeader("Total", "total")}
                        </th>
                        <th className="px-4 py-3 text-right pr-6">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageItems.map((comp: any, i) => (
                        <tr
                          key={`${comp.ref}-${i}`}
                          className="border-b hover:bg-muted/50 transition-colors"
                        >
                          <td className="px-4 py-3 font-medium max-w-[200px] truncate" title={comp.name}>
                            {comp.name}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">{comp.version || "—"}</td>
                          <td className="px-4 py-3 text-center">
                            {comp.critical > 0 ? (
                              <Badge variant="destructive" className="h-5 min-w-[20px] justify-center">
                                {comp.critical}
                              </Badge>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {comp.high > 0 ? (
                              <Badge variant="secondary" className="bg-orange-500 hover:bg-orange-600 text-white border-0 h-5 min-w-[20px] justify-center">
                                {comp.high}
                              </Badge>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {comp.medium > 0 ? (
                              <Badge variant="secondary" className="bg-yellow-500 hover:bg-yellow-600 text-white border-0 h-5 min-w-[20px] justify-center">
                                {comp.medium}
                              </Badge>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {comp.low > 0 ? (
                              <Badge variant="secondary" className="bg-blue-500 hover:bg-blue-600 text-white border-0 h-5 min-w-[20px] justify-center">
                                {comp.low}
                              </Badge>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3 text-center font-bold">{comp.total}</td>
                          <td className="px-4 py-3 text-right pr-6">
                            <Button
                              variant="outline"
                              size="xs"
                              className="h-7 text-[10px]"
                              onClick={() => {
                                // Cross-reference with SBOM components to get the full object
                                const fullComp = Array.from(sbom.components).find((c: any) => c.bomRef?.value === comp.ref || (c as any).bomRef === comp.ref);
                                setSelectedComponent(fullComp || comp);
                                setSelectedVulnerability(null);
                              }}
                            >
                              Details
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    </>
                  ) : (
                    <>
                    <thead className="text-xs text-muted-foreground uppercase border-b bg-muted/30">
                      <tr>
                        <th className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {renderSortHeader("Vulnerability ID", "id")}
                            <HelpTooltip text="Common Vulnerabilities and Exposures (CVE) or GitHub Security Advisory (GHSA) identifier." />
                          </div>
                        </th>
                        <th className="px-4 py-3">Severity</th>
                        <th className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {renderSortHeader("Affected Components", "affectedCount")}
                            <HelpTooltip text="Number of components affected by this specific vulnerability." />
                          </div>
                        </th>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3 text-right pr-6">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageItems.map((vuln: any, i) => (
                        <tr
                          key={`${vuln.id}-${i}`}
                          className="border-b hover:bg-muted/50 transition-colors"
                        >
                          <td className="px-4 py-3 font-bold font-mono text-xs text-destructive">
                            {vuln.id.startsWith('CVE-') ? (
                              <a 
                                href={`https://nvd.nist.gov/vuln/detail/${vuln.id}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="hover:underline flex items-center gap-1"
                              >
                                {vuln.id}
                              </a>
                            ) : vuln.id}
                          </td>
                          <td className="px-4 py-3">
                            <Badge 
                              variant="secondary" 
                              className="text-white border-0 h-5"
                              style={{ 
                                backgroundColor: SEVERITY_COLORS[vuln.severity.charAt(0).toUpperCase() + vuln.severity.slice(1) as keyof typeof SEVERITY_COLORS] || '#666'
                              }}
                            >
                              {vuln.severity}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-center font-bold">
                            {vuln.affectedCount}
                          </td>
                          <td className="px-4 py-3 max-w-[300px] truncate text-muted-foreground italic text-xs" title={vuln.title}>
                            {vuln.title || "No description provided"}
                          </td>
                          <td className="px-4 py-3 text-right pr-6">
                            <Button 
                              variant="outline" 
                              size="xs" 
                              className="h-7 text-[10px]"
                              onClick={() => {
                                setSelectedVulnerability(vuln);
                                setSelectedComponent(null);
                              }}
                            >
                              Details
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    </>
                  )}
                  
                  {activeList.length === 0 && (
                    <tbody>
                      <tr>
                        <td colSpan={viewMode === "components" ? 7 : 5} className="px-4 py-12 text-center">
                          <div className="space-y-2">
                            <ShieldCheck className="h-10 w-10 text-green-500 mx-auto" />
                            <p className="text-muted-foreground text-sm font-medium">
                              {searchQuery ? "No results match your search." : "No vulnerabilities detected — all components are secure!"}
                            </p>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  )}
                </table>
              </div>
  
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-xs text-muted-foreground">
                    Showing {page * ITEMS_PER_PAGE + 1}–{Math.min((page + 1) * ITEMS_PER_PAGE, activeList.length)} of{" "}
                    {activeList.length} {viewMode === "components" ? "components" : "vulnerabilities"}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {page + 1} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </ErrorBoundary>
        </Card>
      </div>
        </ScrollArea>
      </ResizablePanel>

      {(selectedComponent || selectedVulnerability) && (
        <>
          <ResizableHandle withHandle className="w-2 bg-border hover:bg-primary/50 transition-colors" />
          <ResizablePanel defaultSize={40} minSize={20}>
            <div className="h-full pl-2">
              <ErrorBoundary 
                resetKeys={[selectedComponent, selectedVulnerability]} 
                fallback={<div className="h-full border-l flex items-center justify-center p-6 text-center text-muted-foreground text-sm">Details panel failed to load.</div>}
              >
                {selectedComponent ? (
                  <ComponentDetailPanel
                    component={selectedComponent as any}
                    analysis={analysis}
                    onClose={() => setSelectedComponent(null)}
                  />
                ) : (
                  <div className="h-full border-l bg-card flex flex-col shadow-2xl z-20">
                    <div className="flex items-center justify-between p-4 border-b flex-none bg-background sticky top-0 z-20">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-destructive" />
                        <h3 className="font-semibold text-lg">Vulnerability Details</h3>
                      </div>
                      <Button aria-label="Close" variant="ghost" size="icon" onClick={() => setSelectedVulnerability(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <ScrollArea className="flex-1 min-h-0">
                      {(() => {
                        const v = selectedVulnerability as any;
                        if (!v) return null;
                        return (
                          <div className="p-4 space-y-6">
                            {/* Sticky Header with ID and Severity */}
                            <div className="flex items-center justify-between p-4 bg-muted/40 rounded-xl border border-primary/10 sticky top-0 z-10 backdrop-blur-md">
                              <div>
                                <div data-testid="vuln-id-label" className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">ID:</div>
                                <div className="text-2xl font-black font-mono text-destructive flex items-center gap-2">
                                  {v.id}
                                  {v.source?.url && (
                                    <a href={v.source.url} target="_blank" rel="noopener noreferrer" className="inline-flex p-1 hover:bg-muted rounded text-muted-foreground transition-colors">
                                      <ExternalLink className="h-4 w-4" />
                                    </a>
                                  )}
                                </div>
                                <div className="flex gap-2 mt-2">
                                  <SearchButton query={v.id} size="sm" />
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Severity:</div>
                                <Badge 
                                  variant="outline" 
                                  className="text-white border-none py-1.5 px-3 text-sm font-bold shadow-sm"
                                  style={{ backgroundColor: getSeverityColor(v.severity) }}
                                >
                                  {v.severity}
                                </Badge>
                              </div>
                            </div>

                            <Accordion multiple defaultValue={["overview", "technical"]} className="w-full space-y-4">

                              {/* 1. Overview Section */}
                              <AccordionItem value="overview" className="border rounded-xl px-4 bg-card shadow-sm overflow-hidden">
                                <AccordionTrigger className="hover:no-underline py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                      <Layers className="h-4 w-4 text-primary" />
                                    </div>
                                    <span className="font-bold">Overview</span>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="pb-4 space-y-6 pt-2">
                                  {v.recommendation && (
                                    <div>
                                      <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <ShieldCheck className="h-3 w-3 text-emerald-500" /> Recommendation
                                      </h4>
                                      <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg text-sm leading-relaxed text-foreground/90 font-medium">
                                        {v.recommendation}
                                      </div>
                                    </div>
                                  )}

                                  {v.cwes && v.cwes.length > 0 && (
                                    <div>
                                      <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2">CWE Classification</h4>
                                      <div className="flex flex-wrap gap-2">
                                        {v.cwes.map((cwe: number) => (
                                          <Badge key={cwe} variant="secondary" className="font-mono text-[10px] py-0 px-2 h-6 border-primary/10 bg-muted/60">
                                            CWE-{cwe}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {v.advisories && v.advisories.length > 0 && (
                                    <div>
                                      <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2">Primary Advisories</h4>
                                      <div className="grid grid-cols-1 gap-2">
                                        {v.advisories.map((adv: any, i: number) => (
                                          <a 
                                            key={i}
                                            href={adv.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="flex flex-col p-3 bg-muted/40 hover:bg-muted/80 rounded-lg text-xs transition-colors border border-transparent hover:border-primary/20 group"
                                          >
                                            <div className="flex items-center justify-between mb-1">
                                              <span className="font-bold text-primary group-hover:underline line-clamp-1">{adv.title || (adv.url ? new URL(adv.url).hostname : 'Advisory')}</span>
                                              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                            <span className="text-[10px] text-muted-foreground line-clamp-1 opacity-70">{adv.url}</span>
                                          </a>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </AccordionContent>
                              </AccordionItem>

                              {/* 2. Technical Details Section */}
                              <AccordionItem value="technical" className="border rounded-xl px-4 bg-card shadow-sm overflow-hidden">
                                <AccordionTrigger className="hover:no-underline py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                      <Info className="h-4 w-4 text-primary" />
                                    </div>
                                    <span className="font-bold">Technical Details</span>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="pb-4 space-y-6 pt-2">
                                  {v.description && (
                                    <div>
                                      <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2">Description</h4>
                                      <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/80">
                                        {v.description}
                                      </div>
                                    </div>
                                  )}

                                  {v.detail && v.description !== v.detail && (
                                    <div>
                                      <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2">In-Depth Analysis</h4>
                                      <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/80 p-4 bg-muted/30 rounded-lg border border-primary/5">
                                        {v.detail}
                                      </div>
                                    </div>
                                  )}

                                  {v.ratings && v.ratings.length > 0 && (
                                    <div>
                                      <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2">Scoring & System Ratings</h4>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {v.ratings.map((rating: any, i: number) => (
                                          <div key={i} className="p-3 bg-muted/40 rounded-lg border border-primary/10 shadow-sm">
                                            <div className="flex items-center justify-between mb-2">
                                              <span className="text-[10px] font-black uppercase text-muted-foreground">{rating.method || 'Score'}</span>
                                              <Badge 
                                                variant="outline" 
                                                className="text-[9px] font-bold py-0 h-4"
                                                style={{ borderColor: SEVERITY_COLORS[rating.severity as keyof typeof SEVERITY_COLORS] || '#666', color: SEVERITY_COLORS[rating.severity as keyof typeof SEVERITY_COLORS] || '#666' }}
                                              >
                                                {rating.severity}
                                              </Badge>
                                            </div>
                                            <div className="text-2xl font-black text-primary">{rating.score}</div>
                                            {rating.vector && <div className="text-[9px] font-mono text-muted-foreground mt-2 break-all opacity-80" title={rating.vector}>{rating.vector}</div>}
                                            {rating.source?.name && <div className="text-[9px] text-muted-foreground mt-2 text-right italic font-medium">Source: {rating.source.name}</div>}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {v.analysis && (
                                    <div>
                                      <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <Search className="h-3 w-3" /> Status Analysis
                                      </h4>
                                      <div className="p-4 bg-muted/30 rounded-lg border border-primary/10 grid grid-cols-2 gap-4">
                                        {v.analysis.state && (
                                          <div>
                                            <div className="text-[10px] font-black uppercase text-muted-foreground mb-1">State</div>
                                            <Badge variant="outline" className="uppercase font-bold text-[10px] border-primary/30">{v.analysis.state}</Badge>
                                          </div>
                                        )}
                                        {v.analysis.justification && (
                                          <div className="col-span-2 sm:col-span-1">
                                            <div className="text-[10px] font-black uppercase text-muted-foreground mb-1">Justification</div>
                                            <div className="text-xs font-medium">{v.analysis.justification}</div>
                                          </div>
                                        )}
                                        {v.analysis.response && (
                                          <div className="col-span-2">
                                            <div className="text-[10px] font-black uppercase text-muted-foreground mb-1">Response</div>
                                            <div className="flex flex-wrap gap-1">
                                              {v.analysis.response.map((r: string, i: number) => (
                                                <Badge key={i} variant="secondary" className="text-[9px] py-0">{r}</Badge>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {v.tools && v.tools.length > 0 && (
                                    <div>
                                      <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2">Detection Tools</h4>
                                      <div className="flex flex-wrap gap-2">
                                        {v.tools.map((tool: any, i: number) => (
                                          <Badge key={i} variant="outline" className="text-[10px] bg-muted/20">
                                            {tool.name || tool.vendor} {tool.version}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </AccordionContent>
                              </AccordionItem>

                              {/* 3. Remediation & Evidence */}
                              <AccordionItem value="remediation" className="border rounded-xl px-4 bg-card shadow-sm overflow-hidden">
                                <AccordionTrigger className="hover:no-underline py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                      <ShieldAlert className="h-4 w-4 text-primary" />
                                    </div>
                                    <span className="font-bold">Remediation & Evidence</span>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="pb-4 space-y-6 pt-2">
                                  {v.recommendation && (
                                    <div>
                                      <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <ShieldCheck className="h-3 w-3 text-emerald-500" /> Recommendation
                                      </h4>
                                      <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg text-sm leading-relaxed text-foreground/90 font-medium">
                                        {v.recommendation}
                                      </div>
                                    </div>
                                  )}

                                  {v.workaround && (
                                    <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-lg">
                                      <h4 className="text-xs font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <AlertTriangle className="h-3 w-3" /> Workaround
                                      </h4>
                                      <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                                        {v.workaround}
                                      </div>
                                    </div>
                                  )}

                                  {v.proofOfConcept && (
                                    <div className="bg-orange-500/5 border border-orange-500/20 p-4 rounded-lg">
                                      <h4 className="text-xs font-black text-orange-600 dark:text-orange-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <ShieldAlert className="h-3 w-3" /> Proof of Concept
                                      </h4>
                                      {v.proofOfConcept.reproductionSteps && (
                                        <div className="mt-2">
                                          <div className="text-[10px] font-black uppercase text-muted-foreground mb-1">Reproduction Steps</div>
                                          <div className="text-xs p-3 bg-muted/40 rounded border border-primary/5 whitespace-pre-wrap font-mono leading-tight">
                                            {v.proofOfConcept.reproductionSteps}
                                          </div>
                                        </div>
                                      )}
                                      {v.proofOfConcept.environment && (
                                        <div className="mt-3">
                                          <div className="text-[10px] font-black uppercase text-muted-foreground mb-1">Target Environment</div>
                                          <p className="text-xs italic text-foreground/80">{v.proofOfConcept.environment}</p>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {!v.recommendation && !v.workaround && !v.proofOfConcept && (
                                    <div className="text-xs text-muted-foreground italic text-center py-4 bg-muted/20 rounded-lg">
                                      No specific recommendation, workaround or proof of concept evidence provided.
                                    </div>
                                  )}
                                </AccordionContent>
                              </AccordionItem>

                              {/* 4. Affected Components */}
                              <AccordionItem value="affected" className="border rounded-xl px-4 bg-card shadow-sm overflow-hidden">
                                <AccordionTrigger className="hover:no-underline py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                      <Network className="h-4 w-4 text-primary" />
                                    </div>
                                    <span className="font-bold">Affected Components ({v.affectedCount})</span>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="pb-4 space-y-3 pt-2">
                                  {displayStats.allVulnerableComponents
                                    .filter(c => v.affectedComponentRefs?.includes(c.ref))
                                    .slice(0, 15).map((comp: any, i: number) => {
                                      const affect = v.affects?.find((a: any) => (a.ref?.value || a.ref) === comp.ref);
                                      const status = affect?.versions?.[0]?.status || 'affected';
                                      
                                      return (
                                        <div key={i} className="flex flex-col p-3 rounded-xl bg-muted/30 border border-primary/5 hover:border-primary/20 transition-all text-sm gap-2">
                                          <div className="flex items-center justify-between">
                                            <div className="flex flex-col truncate pr-2">
                                              <span className="font-bold truncate text-foreground/90">{comp.name}</span>
                                              <span className="text-[9px] text-muted-foreground truncate opacity-70 font-mono" title={comp.ref}>{comp.ref}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                              <Badge 
                                                variant={status === 'affected' ? 'destructive' : 'outline'} 
                                                className="text-[9px] py-0 h-5 px-2 uppercase font-black"
                                              >
                                                {status}
                                              </Badge>
                                              <Badge variant="secondary" className="text-[10px] shrink-0 font-mono h-5 font-bold border-primary/10">{comp.version}</Badge>
                                            </div>
                                          </div>
                                          {affect?.versions && affect.versions.length > 1 && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                              {affect.versions.slice(1).map((ver: any, vi: number) => (
                                                <Badge key={vi} variant="outline" className="text-[8px] py-0 opacity-60 font-mono">
                                                  {ver.version}: {ver.status}
                                                </Badge>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })
                                  }
                                  {v.affectedCount > 15 && (
                                    <div className="text-center pt-2">
                                      <Badge variant="ghost" className="text-[10px] text-muted-foreground italic">
                                        + {v.affectedCount - 15} more components affected
                                      </Badge>
                                    </div>
                                  )}
                                </AccordionContent>
                              </AccordionItem>

                              {/* 5. Metadata & Provenance */}
                              <AccordionItem value="metadata" className="border rounded-xl px-4 bg-card shadow-sm overflow-hidden">
                                <AccordionTrigger className="hover:no-underline py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                      <Fingerprint className="h-4 w-4 text-primary" />
                                    </div>
                                    <span className="font-bold">Metadata & Provenance</span>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="pb-4 space-y-6 pt-2">
                                  <div className="grid grid-cols-2 gap-4">
                                    {v.created && (
                                      <div>
                                        <div className="text-[10px] font-black uppercase text-muted-foreground mb-1">Created</div>
                                        <div className="text-xs font-medium">{new Date(v.created).toLocaleDateString()}</div>
                                      </div>
                                    )}
                                    {v.published && (
                                      <div>
                                        <div className="text-[10px] font-black uppercase text-muted-foreground mb-1">Published</div>
                                        <div className="text-xs font-medium">{new Date(v.published).toLocaleDateString()}</div>
                                      </div>
                                    )}
                                    {v.updated && (
                                      <div>
                                        <div className="text-[10px] font-black uppercase text-muted-foreground mb-1">Last Updated</div>
                                        <div className="text-xs font-medium">{new Date(v.updated).toLocaleDateString()}</div>
                                      </div>
                                    )}
                                    {v.rejected && (
                                      <div>
                                        <div className="text-[10px] font-black uppercase text-muted-foreground mb-1">Rejected</div>
                                        <div className="text-xs font-medium text-destructive">{new Date(v.rejected).toLocaleDateString()}</div>
                                      </div>
                                    )}
                                  </div>

                                  {v.source && (
                                    <div className="pt-2 border-t border-primary/5">
                                      <div className="text-[10px] font-black uppercase text-muted-foreground mb-2">Primary Source</div>
                                      <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary text-xs">
                                          {v.source.name?.charAt(0) || '?'}
                                        </div>
                                        <div className="flex flex-col">
                                          <span className="text-sm font-bold">{v.source.name || 'Unknown Provider'}</span>
                                          {v.source.url && <a href={v.source.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline line-clamp-1">{v.source.url}</a>}
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {v.credits && (
                                    <div className="pt-2 border-t border-primary/5">
                                      <div className="text-[10px] font-black uppercase text-muted-foreground mb-2">Credits</div>
                                      <div className="space-y-2">
                                        {v.credits.individuals?.map((ind: any, i: number) => (
                                          <div key={i} className="text-xs flex items-center gap-2">
                                            <User className="h-3 w-3 text-muted-foreground" />
                                            <span className="font-medium">{ind.name}</span>
                                            {ind.email && <span className="text-muted-foreground opacity-60">({ind.email})</span>}
                                          </div>
                                        ))}
                                        {v.credits.organizations?.map((org: any, i: number) => (
                                          <div key={i} className="text-xs flex items-center gap-2">
                                            <Building className="h-3 w-3 text-muted-foreground" />
                                            <span className="font-medium">{org.name}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {v.properties && v.properties.length > 0 && (
                                    <div className="pt-2 border-t border-primary/5">
                                      <div className="text-[10px] font-black uppercase text-muted-foreground mb-2">Extended Properties</div>
                                      <div className="grid grid-cols-1 gap-1">
                                        {v.properties.map((prop: any, i: number) => (
                                          <div key={i} className="flex items-center justify-between p-2 bg-muted/20 rounded text-[10px]">
                                            <span className="font-mono text-muted-foreground">{prop.name}</span>
                                            <span className="font-bold">{prop.value}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>

                            {v.references && v.references.length > 0 && (
                              <div className="pt-6 border-t border-primary/10">
                                <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                                  <BookOpen className="h-3 w-3" /> External References
                                </h4>
                                <div className="space-y-2">
                                  {v.references.map((ref: any, i: number) => (
                                    <a 
                                      key={i} 
                                      href={ref.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="block p-3 bg-muted/30 hover:bg-muted/60 rounded-lg text-xs border border-transparent hover:border-primary/10 transition-all group"
                                    >
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="font-bold text-primary group-hover:underline line-clamp-1">{ref.url}</span>
                                        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                      </div>
                                      {ref.comment && <p className="text-[10px] text-muted-foreground italic leading-relaxed">{ref.comment}</p>}
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}

                            {v.id.startsWith('CVE-') && (
                              <div className="pt-8">
                                <a 
                                  href={`https://nvd.nist.gov/vuln/detail/${v.id}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="w-full inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground h-11 px-6 text-sm font-black shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                                >
                                  Investigate on NVD
                                  <ExternalLink className="ml-2 h-4 w-4" />
                                </a>
                              </div>
                            )}
                      </div>
                        );
                      })()}
                    </ScrollArea>
                  </div>
                )}
              </ErrorBoundary>
            </div>
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  );
}
