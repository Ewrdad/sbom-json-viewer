import { useState, useMemo, useEffect } from "react";
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
  Download,
  Info,
  Layers,
  ExternalLink,
  EyeOff
} from "lucide-react";
import { useVex } from "../../context/VexContext";
import { useSelection } from "../../context/SelectionContext";
import { Skeleton } from "@/components/ui/skeleton";
import { HelpTooltip } from "@/components/common/HelpTooltip";
import { CHART_TOOLTIP_STYLE, CHART_CURSOR, CHART_AXIS_PROPS, CHART_TOOLTIP_LABEL_STYLE, CHART_TOOLTIP_ITEM_STYLE } from "@/lib/chartTheme";
import { VulnerabilityLink } from "@/components/common/VulnerabilityLink";
import { CopyButton } from "@/components/common/CopyButton";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { generateTicketCSV, downloadCSV, type ExportPlatform, type VulnerabilityItem, type ComponentItem } from "../../lib/ticketExportUtils";

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function VulnerabilitiesView({ sbom, preComputedStats }: { sbom: any; preComputedStats?: SbomStats }) {
  const stats = useSbomStats(preComputedStats ? null : sbom);
  const isLoadingStats = !preComputedStats && !stats;
  const { assessments } = useVex();
  const [showMuted, setShowMuted] = useState(false);
  
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
    totalVulnerabilityInstances: 0,
    avgVulnerabilitiesPerComponent: 0,
    dependencyStats: { direct: 0, transitive: 0 },
    dependentsDistribution: {},
    vulnerabilityImpactDistribution: {},
    cweCounts: {},
    sourceCounts: {},
  };

  const displayStats: SbomStats = useMemo(() => {
    const base = {
      ...fallbackStats,
      ...(preComputedStats ?? (stats || {} as SbomStats)),
    };

    if (showMuted) return base;

    // Recalculate counts excluding muted ones
    const activeVulns = base.allVulnerabilities.filter(v => 
      assessments[v.id]?.status !== 'not_affected'
    );

    const counts = { critical: 0, high: 0, medium: 0, low: 0, none: 0 };
    activeVulns.forEach(v => {
      const s = v.severity.toLowerCase();
      if (s === 'critical') counts.critical++;
      else if (s === 'high') counts.high++;
      else if (s === 'medium') counts.medium++;
      else if (s === 'low') counts.low++;
      else counts.none++;
    });

    return {
      ...base,
      allVulnerabilities: activeVulns,
      totalVulnerabilities: activeVulns.length,
      vulnerabilityCounts: counts
    };
  }, [stats, preComputedStats, assessments, showMuted]);
  
  // Use cn to avoid unused error if needed, but it is used below.
  // The error might be a red herring if tsc is confused.
  
  // Debug log (only in dev)
  if (import.meta.env.DEV && !isLoadingStats) {
    // Stats loaded
  }

  const [viewMode, setViewMode] = useState<ViewMode>("components");

  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [cveSortKey, setCveSortKey] = useState<SortKey>("affectedCount");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [cveSortDir, setCveSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const { 
    setSelectedComponent, 
    setSelectedVulnerability,
    viewFilters,
    setViewFilters
  } = useSelection();

  const toggleItemSelection = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === pageItems.length) {
      setSelectedItems([]);
    } else {
      const ids = pageItems.map((item: any) => viewMode === "components" ? item.ref : item.id);
      setSelectedItems(ids);
    }
  };
  const [selectedSeverities, setSelectedSeverities] = useState<string[]>([]);

  useEffect(() => {
    if (viewFilters.vulnerabilities) {
      const filters = viewFilters.vulnerabilities;
      if (filters.viewMode) setViewMode(filters.viewMode);
      if (filters.selectedSeverities) setSelectedSeverities(filters.selectedSeverities);
      if (filters.searchQuery) setSearchQuery(filters.searchQuery);
      
      // Clear filters after applying so they don't persist forever
      // but only if we want them to be "one-shot" from dashboard.
      // For now let's keep them one-shot.
      setViewFilters('vulnerabilities', null);
    }
  }, [viewFilters, setViewFilters]);

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

  const handleExport = (platform: ExportPlatform | 'VEX') => {
    if (platform === 'VEX') {
      const baseSbom = sbom?._raw || {};
      const enrichedSbom = JSON.parse(JSON.stringify(baseSbom));
      
      if (!enrichedSbom.vulnerabilities) enrichedSbom.vulnerabilities = [];
      
      // Inject VEX data as properties/analysis
      enrichedSbom.vulnerabilities.forEach((v: any) => {
        const vex = assessments[v.id];
        if (vex) {
          if (!v.analysis) v.analysis = {};
          v.analysis.state = vex.status === 'not_affected' ? 'not_affected' : 
                            vex.status === 'affected' ? 'in_triage' : 
                            vex.status === 'fixed' ? 'resolved' : 'under_investigation';
          v.analysis.detail = vex.justification;
          
          if (!v.properties) v.properties = [];
          v.properties.push({ name: 'vex:status', value: vex.status });
          v.properties.push({ name: 'vex:justification', value: vex.justification });
          v.properties.push({ name: 'vex:updatedAt', value: vex.updatedAt });
        }
      });

      const blob = new Blob([JSON.stringify(enrichedSbom, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vex-enriched-sbom-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }

    // We export activeList because it respects the current UI filter and search state,
    // ensuring the export matches exactly what the user sees in the table.
    let exportList = activeList as (VulnerabilityItem | ComponentItem)[];
    if (selectedItems.length > 0) {
      exportList = (activeList as any[]).filter((item: any) => 
        viewMode === "components" ? selectedItems.includes(item.ref) : selectedItems.includes(item.id)
      );
    }

    const csv = generateTicketCSV(exportList, viewMode, platform);
    const filename = `sbom-tickets-${platform.toLowerCase()}-${viewMode}-${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(csv, filename);
  };

  const getRowClass = (item: any) => {
    if (viewMode === "components") {
      if (item.critical > 0) return "bg-red-500/5 hover:bg-red-500/10";
      if (item.high > 0) return "bg-orange-500/5 hover:bg-orange-500/10";
      return "hover:bg-muted/50";
    } else {
      const s = item.severity?.toLowerCase();
      if (s === "critical") return "bg-red-500/5 hover:bg-red-500/10";
      if (s === "high") return "bg-orange-500/5 hover:bg-orange-500/10";
      return "hover:bg-muted/50";
    }
  };

  return (
    <ScrollArea className="h-full min-h-0 pr-2">
      <div className="pb-6 space-y-6 animate-in fade-in duration-500">
        {isLoadingStats && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Computing stats…
            </Badge>
          </div>
        )}

        {/* Data Source Notice */}
        <div className="flex flex-col gap-2 bg-muted/30 p-3 rounded border border-dashed">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <Info className="h-3 w-3" />
            <span>Vulnerability and component data is derived directly from the SBOM metadata. No external scanning is performed.</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <ExternalLink className="h-3 w-3" />
            <span>Clicking vulnerability or CWE links will open external databases (NVD, MITRE, GitHub) and share the ID with those providers for lookup.</span>
          </div>
        </div>

        {/* KPI Cards Row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6 mb-6">
          <Card className="border-l-4 border-l-destructive/60">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                Total Findings
                <HelpTooltip text="The total number of vulnerability instances across all components. One CVE affecting three packages counts as three findings." />
              </CardTitle>
              <ShieldAlert className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="total-vulnerability-count">{displayStats.totalVulnerabilityInstances || totalVulns}</div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold mt-1">Total Instances</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                Unique CVEs
                <HelpTooltip text="The number of distinct security vulnerabilities identified by their unique IDs (e.g., CVE-2023-XYZ)." />
              </CardTitle>
              <ShieldCheck className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="unique-vulnerability-count">{displayStats.uniqueVulnerabilityCount}</div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold mt-1">Distinct IDs</p>
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
              <div className="text-3xl font-bold text-red-600" data-testid="critical-vulnerability-count">{critical}</div>
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
              <div className="text-3xl font-bold text-orange-600" data-testid="high-vulnerability-count">{high}</div>
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
              <div className="text-3xl font-bold text-yellow-600" data-testid="medium-vulnerability-count">{medium}</div>
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
              <div className="text-3xl font-bold text-blue-600" data-testid="low-vulnerability-count">{low}</div>
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
                                                className="cursor-pointer"
                                                onClick={(data) => {
                                                  if (data && data.name) {
                                                    toggleSeverity(String(data.name));
                                                  }
                                                }}
                                              >                        {severityPieData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.color} 
                            className={cn(
                              "transition-opacity duration-300",
                              selectedSeverities.length > 0 && !selectedSeverities.includes(entry.name) && "opacity-30"
                            )}
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
                    <div className="text-center space-y-2">
                      <ShieldCheck className="h-12 w-12 text-green-500 mx-auto" />
                      <p className="text-sm text-muted-foreground">No vulnerabilities detected!</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {severityPieData.map((entry) => (
                  <div 
                    key={entry.name} 
                    className={cn(
                      "flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded transition-colors",
                      selectedSeverities.includes(entry.name) && "bg-muted font-bold"
                    )}
                    onClick={() => toggleSeverity(entry.name)}
                  >
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
                {viewMode === "vulnerabilities" && (
                  <p className="text-[10px] text-muted-foreground italic mt-1 leading-tight">
                    Note: One vulnerability may map to multiple CWE categories.
                  </p>
                )}
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
                            tick={(props) => {
                              const { x, y, payload } = props;
                              return (
                                <g transform={`translate(${x},${y})`}>
                                  <foreignObject x={-100} y={-10} width={100} height={20}>
                                    <div className="flex justify-end pr-2 h-full items-center">
                                      <VulnerabilityLink 
                                        id={payload.value} 
                                        className="text-[10px] text-[#888888] hover:text-primary transition-colors whitespace-nowrap overflow-hidden text-ellipsis"
                                      />
                                    </div>
                                  </foreignObject>
                                </g>
                              );
                            }}
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
                                                              <BarChart 
                                                                data={barData}
                                                                onClick={(data) => {
                                                                  if (data && data.activeLabel) {
                                                                    toggleSeverity(String(data.activeLabel));
                                                                  }
                                                                }}
                                                                className="cursor-pointer"
                                                              >                                            <XAxis dataKey="name" {...CHART_AXIS_PROPS} />
                                            <YAxis {...CHART_AXIS_PROPS} />
                                            <Tooltip
                                              cursor={CHART_CURSOR}
                                              contentStyle={CHART_TOOLTIP_STYLE}
                                              labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                                              itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                                            />
                                            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                              {barData.map((entry, index) => (
                                                <Cell 
                                                  key={`cell-${index}`} 
                                                  fill={entry.fill}
                                                  className={cn(
                                                    "transition-opacity duration-300",
                                                    selectedSeverities.length > 0 && !selectedSeverities.includes(entry.name) && "opacity-30"
                                                  )}
                                                />
                                              ))}
                                            </Bar>
                                          </BarChart>                    </ResponsiveContainer>
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
                  data-testid="vulnerabilities-mode-components"
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
                  data-testid="vulnerabilities-mode-vulnerabilities"
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
                    <DropdownMenuGroup>
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
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>

                {selectedItems.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedItems([])} 
                    className="text-xs h-8 text-destructive hover:text-destructive hover:bg-destructive/5"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear Selection ({selectedItems.length})
                  </Button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("h-8 text-xs gap-2", selectedItems.length > 0 && "border-primary bg-primary/5 text-primary")} data-testid="export-button">
                      <Download className="h-3.5 w-3.5" />
                      {selectedItems.length > 0 ? `Export Selected (${selectedItems.length})` : "Export"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="flex items-center gap-2">
                        Ticket Systems
                        <HelpTooltip text="Generates a localized CSV file for manual import. No network connections to these platforms are made." />
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleExport("Jira")}>
                        Download CSV for Jira
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport("GitLab")}>
                        Download CSV for GitLab
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport("GitHub")}>
                        Download CSV for GitHub
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleExport("Generic")}>
                        Download Generic CSV
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleExport("VEX")}>
                        VEX-Enriched CycloneDX
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant={showMuted ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setShowMuted(!showMuted)}
                  className="h-8 gap-2 text-xs"
                >
                  {showMuted ? <EyeOff className="h-3.5 w-3.5" /> : <Filter className="h-3.5 w-3.5" />}
                  {showMuted ? "Showing Muted" : "Hide Muted"}
                </Button>

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
                        <th className="px-4 py-3 w-10">
                          <input 
                            type="checkbox" 
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                            checked={pageItems.length > 0 && pageItems.every((item: any) => selectedItems.includes(item.ref))}
                            onChange={toggleSelectAll}
                          />
                        </th>
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
                          className={cn("border-b transition-colors", getRowClass(comp), selectedItems.includes(comp.ref) && "bg-primary/5")}
                        >
                          <td className="px-4 py-3">
                            <input 
                              type="checkbox" 
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                              checked={selectedItems.includes(comp.ref)}
                              onChange={() => toggleItemSelection(comp.ref)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td className="px-4 py-3 font-medium max-w-[200px] truncate" title={comp.name}>
                            {comp.name}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">{comp.version || "—"}</td>
                          <td className="px-4 py-3 text-center">
                            {comp.critical > 0 ? (
                              <Badge variant="destructive" className="h-5 min-w-[20px] justify-center flex items-center gap-1 px-1.5">
                                <ShieldAlert className="h-3 w-3 shrink-0" />
                                {comp.critical}
                              </Badge>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {comp.high > 0 ? (
                              <Badge variant="secondary" className="bg-orange-500 hover:bg-orange-600 text-white border-0 h-5 min-w-[20px] justify-center flex items-center gap-1 px-1.5">
                                <AlertTriangle className="h-3 w-3 shrink-0" />
                                {comp.high}
                              </Badge>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {comp.medium > 0 ? (
                              <Badge variant="secondary" className="bg-yellow-500 hover:bg-yellow-600 text-white border-0 h-5 min-w-[20px] justify-center flex items-center gap-1 px-1.5">
                                <Info className="h-3 w-3 shrink-0" />
                                {comp.medium}
                              </Badge>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {comp.low > 0 ? (
                              <Badge variant="secondary" className="bg-blue-500 hover:bg-blue-600 text-white border-0 h-5 min-w-[20px] justify-center flex items-center gap-1 px-1.5">
                                <Info className="h-3 w-3 shrink-0 opacity-70" />
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
                        <th className="px-4 py-3 w-10">
                          <input 
                            type="checkbox" 
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                            checked={pageItems.length > 0 && pageItems.every((item: any) => selectedItems.includes(item.id))}
                            onChange={toggleSelectAll}
                          />
                        </th>
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
                      {pageItems.map((vuln: any, i) => {
                        const vex = assessments[vuln.id];
                        const isMuted = vex?.status === 'not_affected';
                        
                        return (
                          <tr
                            key={`${vuln.id}-${i}`}
                            className={cn(
                              "border-b transition-colors",
                              getRowClass(vuln),
                              isMuted && "opacity-40",
                              selectedItems.includes(vuln.id) && "bg-primary/5"
                            )}
                          >
                            <td className="px-4 py-3">
                              <input 
                                type="checkbox" 
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                checked={selectedItems.includes(vuln.id)}
                                onChange={() => toggleItemSelection(vuln.id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </td>
                            <td className={cn(
                              "px-4 py-3 font-bold font-mono text-xs text-destructive flex items-center gap-2",
                              isMuted && "line-through text-muted-foreground"
                            )}>
                              <div className="flex items-center gap-1 group/vulnid">
                                <VulnerabilityLink id={vuln.id} />
                                <CopyButton value={vuln.id} tooltip="Copy ID" className="h-5 w-5 opacity-0 group-hover/vulnid:opacity-100" />
                              </div>
                              {vex && (
                                <Badge variant="outline" className="h-4 text-[8px] py-0 px-1 border-primary/20 bg-primary/5">
                                  {vex.status.replace('_', ' ')}
                                </Badge>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <Badge 
                                variant="secondary" 
                                className="text-white border-0 h-5 flex items-center gap-1 px-1.5"
                                style={{ 
                                  backgroundColor: isMuted ? '#94a3b8' : (SEVERITY_COLORS[vuln.severity.charAt(0).toUpperCase() + vuln.severity.slice(1) as keyof typeof SEVERITY_COLORS] || '#666')
                                }}
                              >
                                {(() => {
                                  switch (vuln.severity?.toLowerCase()) {
                                    case 'critical': return <ShieldAlert className="h-3 w-3 shrink-0" />;
                                    case 'high': return <AlertTriangle className="h-3 w-3 shrink-0" />;
                                    case 'medium': return <Info className="h-3 w-3 shrink-0" />;
                                    case 'low': return <Info className="h-3 w-3 shrink-0 opacity-70" />;
                                    default: return null;
                                  }
                                })()}
                                {vuln.severity}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-center font-bold">
                              {vuln.affectedCount}
                            </td>
                            <td className={cn(
                              "px-4 py-3 max-w-[300px] truncate text-muted-foreground italic text-xs",
                              isMuted && "line-through"
                            )} title={vuln.title}>
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
                        );
                      })}
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
  );
}

export function VulnerabilitiesSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="h-24">
            <CardHeader className="pb-2"><Skeleton className="h-4 w-16" /></CardHeader>
            <CardContent><Skeleton className="h-8 w-12" /></CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="h-[250px]">
            <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
            <CardContent><Skeleton className="h-full w-full" /></CardContent>
          </Card>
        ))}
      </div>
      <Card className="h-[400px]">
        <CardHeader><Skeleton className="h-8 w-48" /></CardHeader>
        <CardContent><Skeleton className="h-full w-full" /></CardContent>
      </Card>
    </div>
  );
}
