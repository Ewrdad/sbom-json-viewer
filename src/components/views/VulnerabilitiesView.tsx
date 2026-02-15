import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Fingerprint,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  X,
  Network,
  ExternalLink,
  Clock,
  BookOpen,
  Info,
  Database,
  Calendar,
  Layers,
} from "lucide-react";
import { HelpTooltip } from "@/components/common/HelpTooltip";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ComponentDetailPanel } from "./ComponentDetailPanel";
import { useDependencyAnalysis } from "../../hooks/useDependencyAnalysis";
import { Separator } from "@/components/ui/separator";
import { SearchButton } from "@/components/common/SearchButton";
import { CHART_TOOLTIP_STYLE, CHART_CURSOR, CHART_AXIS_PROPS, CHART_TOOLTIP_LABEL_STYLE, CHART_TOOLTIP_ITEM_STYLE } from "@/lib/chartTheme";

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
  const [selectedVulnerability, setSelectedVulnerability] = useState<unknown | null>(null);

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
  }, [displayStats.allVulnerableComponents, searchQuery, sortKey, sortDir]);

  const filteredAndSortedVulnerabilities = useMemo(() => {
    let list = displayStats.allVulnerabilities;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((v) => 
        v.id.toLowerCase().includes(q) || 
        (v.title && v.title.toLowerCase().includes(q))
      );
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
  }, [displayStats.allVulnerabilities, searchQuery, cveSortKey, cveSortDir]);

  const activeList = viewMode === "components" ? filteredAndSorted : filteredAndSortedVulnerabilities;

  const totalPages = Math.max(1, Math.ceil(activeList.length / ITEMS_PER_PAGE));
  const pageItems = activeList.slice(
    page * ITEMS_PER_PAGE,
    (page + 1) * ITEMS_PER_PAGE,
  );

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

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Unique CVEs
              </CardTitle>
              <Fingerprint className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{displayStats.uniqueVulnerabilityCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Distinct definitions</p>
            </CardContent>
          </Card>

          <Card className="border-l-4" style={{ borderLeftColor: SEVERITY_COLORS.Critical }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{critical}</div>
              <p className="text-xs text-muted-foreground mt-1">Immediate action</p>
            </CardContent>
          </Card>

          <Card className="border-l-4" style={{ borderLeftColor: SEVERITY_COLORS.High }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{high}</div>
              <p className="text-xs text-muted-foreground mt-1">High priority</p>
            </CardContent>
          </Card>

          <Card className="border-l-4" style={{ borderLeftColor: SEVERITY_COLORS.Medium }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Medium</CardTitle>
              <ShieldAlert className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{medium}</div>
              <p className="text-xs text-muted-foreground mt-1">Should be fixed</p>
            </CardContent>
          </Card>

          <Card className="border-l-4" style={{ borderLeftColor: SEVERITY_COLORS.Low }}>
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

          {/* Bar Chart */}
          <Card className="shadow-sm border-muted-foreground/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                Vulnerability Distribution
                <HelpTooltip text="Count of findings per severity level." />
              </CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[260px]">
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
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-muted-foreground/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                Vulnerability Impact
                <HelpTooltip text="Shows the blast radius of vulnerabilities based on how many other components depend on the affected package." />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                {originData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={originData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {originData.map((entry, index) => (
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
                    <p className="text-sm text-muted-foreground italic text-center px-4">
                      No dependency graph data available to track impact.
                    </p>
                  </div>
                )}
              </div>
              <div className="space-y-2 mt-4">
                {originData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-[10px] font-medium">{entry.name}</span>
                    <span className="text-[10px] font-bold ml-auto">{entry.value}</span>
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
              
              <div className="relative w-full max-w-xs ml-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={viewMode === "components" ? "Search components..." : "Search CVEs..."}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(0);
                  }}
                  className="pl-9"
                />
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
                    <div className="flex items-center justify-between p-4 border-b flex-none">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-destructive" />
                        <h3 className="font-semibold text-lg breadcrumb">Vulnerability Details</h3>
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
                            <div>
                              <h4 className="text-sm font-medium text-muted-foreground mb-1">ID</h4>
                              <div className="text-xl font-bold font-mono text-destructive">{v.id}</div>
                              <div className="mt-2">
                                 <SearchButton query={v.id} className="w-full justify-start" />
                              </div>
                            </div>
                        
                            <div>
                              <h4 className="text-sm font-medium text-muted-foreground mb-1">Severity</h4>
                              <Badge 
                                variant="secondary" 
                                className="text-white border-0"
                                style={{ 
                                  backgroundColor: SEVERITY_COLORS[v.severity.charAt(0).toUpperCase() + v.severity.slice(1) as keyof typeof SEVERITY_COLORS] || '#666'
                                }}
                              >
                                {v.severity}
                              </Badge>
                            </div>

                        {v.description && (
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                              <Info className="h-4 w-4" /> Description
                            </h4>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{v.description}</p>
                          </div>
                        )}

                        {v.detail && v.detail !== v.description && (
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                              <BookOpen className="h-4 w-4" /> Details
                            </h4>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{v.detail}</p>
                          </div>
                        )}

                        {v.recommendation && (
                          <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-md">
                            <h4 className="text-sm font-semibold text-emerald-600 mb-1 flex items-center gap-2">
                              <ShieldCheck className="h-4 w-4" /> Recommendation
                            </h4>
                            <p className="text-sm leading-relaxed">{v.recommendation}</p>
                          </div>
                        )}

                        {v.workaround && (
                          <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-md">
                            <h4 className="text-sm font-semibold text-amber-600 mb-1 flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4" /> Workaround
                            </h4>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{v.workaround}</p>
                          </div>
                        )}

                        {v.cwes && v.cwes.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                               <Layers className="h-4 w-4" /> CWEs
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {v.cwes.map((cwe: number) => (
                                <Badge key={cwe} variant="outline" className="text-[10px] hover:bg-muted cursor-default">
                                  CWE-{cwe}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {v.analysis && (
                          <div className="space-y-3 p-3 bg-muted/40 rounded-lg border">
                            <h4 className="text-sm font-semibold flex items-center gap-2">
                              <Search className="h-4 w-4" /> Vulnerability Analysis
                            </h4>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                              {v.analysis.state && (
                                <div>
                                  <span className="text-muted-foreground">State: </span>
                                  <span className="font-medium uppercase">{v.analysis.state}</span>
                                </div>
                              )}
                              {v.analysis.justification && (
                                <div>
                                  <span className="text-muted-foreground">Justification: </span>
                                  <span className="font-medium">{v.analysis.justification}</span>
                                </div>
                              )}
                            </div>
                            {v.analysis.response && v.analysis.response.length > 0 && (
                              <div className="text-xs">
                                <span className="text-muted-foreground">Responses: </span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {v.analysis.response.map((r: string) => (
                                    <Badge key={r} variant="outline" className="text-[9px] py-0">{r}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {v.analysis.detail && (
                              <div className="text-xs mt-1">
                                <span className="text-muted-foreground">Analysis Detail: </span>
                                <p className="mt-1 italic">{v.analysis.detail}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {(v.created || v.published || v.updated || v.rejected) && (
                          <div className="grid grid-cols-1 gap-2 p-3 bg-muted/20 rounded-lg">
                            <h4 className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-1">Timeline</h4>
                            {v.created && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <Calendar className="h-3 w-3" /> Created
                                </span>
                                <span>{new Date(v.created).toLocaleDateString()}</span>
                              </div>
                            )}
                            {v.published && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <Clock className="h-3 w-3" /> Published
                                </span>
                                <span>{new Date(v.published).toLocaleDateString()}</span>
                              </div>
                            )}
                            {v.updated && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <Clock className="h-3 w-3" /> Modified
                                </span>
                                <span>{new Date(v.updated).toLocaleDateString()}</span>
                              </div>
                            )}
                            {v.rejected && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <X className="h-3 w-3" /> Rejected
                                </span>
                                <span>{new Date(v.rejected).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {v.source && (v.source.name || v.source.url) && (
                          <div className="flex items-center gap-2 p-2 bg-muted/20 rounded border border-dashed">
                             <Database className="h-3 w-3 text-muted-foreground" />
                             <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-tight">Report Source:</span>
                             <span className="text-xs font-semibold">
                               {v.source.name || (v.source.url && new URL(v.source.url).hostname) || 'Unknown Source'}
                             </span>
                             {v.source.url && (
                               <a href={v.source.url} target="_blank" rel="noopener noreferrer" className="ml-auto">
                                 <ExternalLink className="h-3 w-3 text-primary hover:text-primary/80" />
                               </a>
                             )}
                          </div>
                        )}

                        {v.ratings && v.ratings.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                               <ShieldAlert className="h-4 w-4" /> Ratings & Scores
                            </h4>
                            <div className="space-y-2">
                              {v.ratings.map((rate: any, idx: number) => (
                                <div key={idx} className="text-xs border rounded p-3 space-y-2 bg-muted/10 relative overflow-hidden">
                                  {rate.severity && (
                                    <div 
                                      className="absolute top-0 right-0 w-1 h-full" 
                                      style={{ 
                                        backgroundColor: SEVERITY_COLORS[rate.severity.charAt(0).toUpperCase() + rate.severity.slice(1) as keyof typeof SEVERITY_COLORS] || '#666'
                                      }} 
                                    />
                                  )}
                                  <div className="flex justify-between items-start">
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm">{rate.method || 'Score'}</span>
                                        {rate.source?.name && (
                                          <Badge variant="outline" className="text-[9px] py-0 px-1 font-normal opacity-70">
                                            via {rate.source.name}
                                          </Badge>
                                        )}
                                      </div>
                                      {rate.severity && (
                                        <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80" 
                                             style={{ color: SEVERITY_COLORS[rate.severity.charAt(0).toUpperCase() + rate.severity.slice(1) as keyof typeof SEVERITY_COLORS] }}>
                                          {rate.severity}
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-right flex flex-col items-end">
                                      <div className="text-lg font-black leading-none">{rate.score || '—'}</div>
                                      <span className="text-[9px] text-muted-foreground uppercase font-medium">Value</span>
                                    </div>
                                  </div>
                                  {rate.vector && (
                                    <div className="pt-1">
                                      <span className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">Vector String</span>
                                      <div className="text-[10px] bg-muted/50 p-1.5 rounded font-mono break-all leading-tight border border-muted-foreground/10">
                                        {rate.vector}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {v.credits && (v.credits.organizations?.length || v.credits.individuals?.length) && (
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                              <Fingerprint className="h-4 w-4" /> Credits
                            </h4>
                            <div className="space-y-2">
                              {v.credits.organizations?.map((org: any, idx: number) => (
                                <div key={`org-${idx}`} className="text-xs flex items-center gap-2 bg-muted/30 p-2 rounded">
                                  <Database className="h-3 w-3 text-muted-foreground" />
                                  <span className="font-medium">{org.name}</span>
                                  {org.url && (
                                    <a href={org.url} target="_blank" rel="noopener noreferrer" className="ml-auto">
                                      <ExternalLink className="h-3 w-3 text-primary" />
                                    </a>
                                  )}
                                </div>
                              ))}
                              {v.credits.individuals?.map((ind: any, idx: number) => (
                                <div key={`ind-${idx}`} className="text-xs flex flex-col bg-muted/30 p-2 rounded">
                                  <span className="font-medium">{ind.name}</span>
                                  {ind.email && <span className="text-muted-foreground text-[10px]">{ind.email}</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {v.tools && v.tools.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                              <Search className="h-4 w-4" /> Detection Tools
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {v.tools.map((tool: any, idx: number) => (
                                <Badge key={idx} variant="outline" className="text-[10px]">
                                  {tool.name || tool.vendor || 'Unknown Tool'} {tool.version}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {v.properties && v.properties.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                               <Info className="h-4 w-4" /> Additional Properties
                            </h4>
                            <div className="grid grid-cols-1 gap-1">
                              {v.properties.map((prop: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between text-[10px] p-1.5 bg-muted/20 rounded border border-transparent hover:border-muted-foreground/20 transition-colors">
                                  <span className="font-semibold text-muted-foreground uppercase tracking-tight">{prop.name}</span>
                                  <span className="font-mono text-foreground">{prop.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {v.advisories && v.advisories.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                               <ExternalLink className="h-4 w-4" /> Security Advisories
                            </h4>
                            <div className="grid grid-cols-1 gap-2">
                              {v.advisories.map((adv: any, idx: number) => (
                                <a 
                                  key={idx} 
                                  href={adv.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="group flex flex-col p-2.5 border rounded-md hover:bg-muted/50 transition-all no-underline"
                                >
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <span className="text-xs font-semibold text-primary group-hover:underline truncate">
                                      {adv.title || (adv.url && new URL(adv.url).hostname) || 'View Advisory'}
                                    </span>
                                    <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                                  </div>
                                  <span className="text-[10px] text-muted-foreground truncate opacity-70">
                                    {adv.url}
                                  </span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {v.references && v.references.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                               <BookOpen className="h-4 w-4" /> References
                            </h4>
                            <div className="space-y-1.5 line-clamp-2">
                              {v.references.map((ref: any, idx: number) => (
                                <div key={idx} className="flex flex-col border-l-2 border-muted pl-2 py-0.5">
                                  <a href={ref.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline truncate flex items-center gap-1">
                                    {ref.url}
                                  </a>
                                  {ref.comment && <span className="text-[10px] text-muted-foreground italic truncate">{ref.comment}</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {v.proofOfConcept && (
                          <div className="bg-orange-500/5 border border-orange-500/20 p-3 rounded-md">
                            <h4 className="text-sm font-semibold text-orange-600 mb-1 flex items-center gap-2">
                               <ShieldAlert className="h-4 w-4" /> Proof of Concept
                            </h4>
                            {v.proofOfConcept.reproductionSteps && (
                              <div className="mt-2">
                                <span className="text-[10px] font-bold uppercase text-muted-foreground">Steps</span>
                                <p className="text-xs mt-1 whitespace-pre-wrap">{v.proofOfConcept.reproductionSteps}</p>
                              </div>
                            )}
                            {v.proofOfConcept.environment && (
                              <div className="mt-2">
                                <span className="text-[10px] font-bold uppercase text-muted-foreground">Environment</span>
                                <p className="text-xs mt-1 italic">{v.proofOfConcept.environment}</p>
                              </div>
                            )}
                          </div>
                        )}

                        <Separator />

                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                            <Network className="h-4 w-4" /> Affected Components ({v.affectedCount})
                          </h4>
                          <div className="space-y-2">
                            {displayStats.allVulnerableComponents
                              .filter(c => v.affectedComponentRefs?.includes(c.ref))
                              .slice(0, 10).map((comp: any, i: number) => {
                                const affect = v.affects?.find((a: any) => (a.ref?.value || a.ref) === comp.ref);
                                const status = affect?.versions?.[0]?.status;
                                
                                return (
                                  <div key={i} className="flex flex-col p-2 rounded-md bg-muted/30 border text-sm gap-2">
                                    <div className="flex items-center justify-between">
                                      <div className="flex flex-col truncate">
                                        <span className="font-medium truncate">{comp.name}</span>
                                        <span className="text-[10px] text-muted-foreground truncate">{comp.ref}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        {status && (
                                          <Badge 
                                            variant={status === 'affected' ? 'destructive' : 'outline'} 
                                            className="text-[9px] py-0 h-4 uppercase"
                                          >
                                            {status}
                                          </Badge>
                                        )}
                                        <Badge variant="outline" className="text-[10px] shrink-0 font-mono">{comp.version}</Badge>
                                      </div>
                                    </div>
                                    {affect?.versions && affect.versions.length > 1 && (
                                      <div className="flex flex-wrap gap-1">
                                        {affect.versions.slice(1).map((ver: any, vi: number) => (
                                          <Badge key={vi} variant="outline" className="text-[8px] py-0 opacity-60">
                                            {ver.version}: {ver.status}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            }
                            {v.affectedCount > 10 && (
                              <p className="text-[10px] text-muted-foreground text-center">+ {v.affectedCount - 10} more components</p>
                            )}
                          </div>
                        </div>

                        {v.id.startsWith('CVE-') && (
                          <div className="pt-4 mt-auto">
                              <a 
                                href={`https://nvd.nist.gov/vuln/detail/${v.id}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="w-full inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-9 px-4 text-sm font-medium hover:bg-primary/90 transition-colors"
                              >
                                View on NVD
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
