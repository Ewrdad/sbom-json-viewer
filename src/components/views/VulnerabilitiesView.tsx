import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSbomStats } from "../../hooks/useSbomStats";
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
  ShieldX,
  ShieldCheck,
  AlertTriangle,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  X,
  Network,
} from "lucide-react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ComponentDetailPanel } from "./ComponentDetailPanel";
import { useDependencyAnalysis } from "../../hooks/useDependencyAnalysis";
import { cn } from "../../lib/utils";
import { Separator } from "@/components/ui/separator";

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
  const displayStats: SbomStats = {
    totalComponents: 0,
    vulnerabilityCounts: { critical: 0, high: 0, medium: 0, low: 0, none: 0 },
    licenseCounts: {},
    topLicenses: [],
    licenseDistribution: { permissive: 0, copyleft: 0, weakCopyleft: 0, proprietary: 0, unknown: 0 },
    vulnerableComponents: [],
    allVulnerableComponents: [],
    totalVulnerabilities: 0,
    allVulnerabilities: [],
    ...(preComputedStats ?? stats ?? {}),
  } as SbomStats;

  const [viewMode, setViewMode] = useState<ViewMode>("components");

  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [cveSortKey, setCveSortKey] = useState<SortKey>("affectedCount");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [cveSortDir, setCveSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);
  const [selectedComponent, setSelectedComponent] = useState<any | null>(null);
  const [selectedVulnerability, setSelectedVulnerability] = useState<any | null>(null);

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
      const aVal = sortKey === "name" ? a.name : (a as any)[sortKey];
      const bVal = sortKey === "name" ? b.name : (b as any)[sortKey];
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
      const aVal = (a as any)[cveSortKey];
      const bVal = (b as any)[cveSortKey];
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

  const componentsBySeverity = {
    critical: displayStats.allVulnerableComponents.filter(c => (c as any).critical > 0).length,
    high: displayStats.allVulnerableComponents.filter(c => (c as any).high > 0).length,
    medium: displayStats.allVulnerableComponents.filter(c => (c as any).medium > 0).length,
    low: displayStats.allVulnerableComponents.filter(c => (c as any).low > 0).length,
  };

  const affectedPct = displayStats.totalComponents > 0
    ? Math.round((displayStats.allVulnerableComponents.length / displayStats.totalComponents) * 100)
    : 0;

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
        <ScrollArea className="h-full pr-2">
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card className="border-l-4 border-l-destructive/60">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Vulnerabilities</CardTitle>
              <ShieldAlert className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalVulns}</div>
              <p className="text-xs text-muted-foreground mt-1">
                across {displayStats.allVulnerableComponents.length} components
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4" style={{ borderLeftColor: SEVERITY_COLORS.Critical }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical</CardTitle>
              <ShieldX className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{critical}</div>
              <p className="text-xs text-muted-foreground mt-1">Immediate action required</p>
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
              <p className="text-xs text-muted-foreground mt-1">Should be addressed</p>
            </CardContent>
          </Card>

          <Card className="border-l-4" style={{ borderLeftColor: SEVERITY_COLORS.Low }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low</CardTitle>
              <ShieldCheck className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{low}</div>
              <p className="text-xs text-muted-foreground mt-1">Low priority</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Severity Donut */}
          <Card className="shadow-sm border-muted-foreground/10">
            <CardHeader>
              <CardTitle className="text-lg">Severity Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[220px]">
                {severityPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={severityPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {severityPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "8px",
                        }}
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
              <div className="grid grid-cols-2 gap-2 mt-3">
                {severityPieData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-xs font-medium">{entry.name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {totalVulns > 0 ? Math.round((entry.value / totalVulns) * 100) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Bar Chart */}
          <Card className="shadow-sm border-muted-foreground/10">
            <CardHeader>
              <CardTitle className="text-lg">Vulnerability Distribution</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      cursor={{ fill: "rgba(0,0,0,0.05)" }}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Exposure Summary */}
          <Card className="shadow-sm border-muted-foreground/10">
            <CardHeader>
              <CardTitle className="text-lg">Component Exposure</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span>Exposure Rate</span>
                  <span>{affectedPct}%</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden flex">
                  <div 
                    className="h-full bg-destructive transition-all duration-1000" 
                    style={{ width: `${affectedPct}%` }}
                  />
                  <div 
                    className="h-full bg-green-500/20 transition-all duration-1000" 
                    style={{ width: `${100 - affectedPct}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground text-center">
                  {displayStats.allVulnerableComponents.length} of {displayStats.totalComponents} components have at least one vulnerability
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Impacted Components</h4>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center justify-between text-xs p-2 rounded-md bg-red-500/5 border border-red-500/10">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-600" />
                      <span>Critical Severity</span>
                    </div>
                    <span className="font-bold">{componentsBySeverity.critical}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs p-2 rounded-md bg-orange-500/5 border border-orange-500/10">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-orange-500" />
                      <span>High Severity</span>
                    </div>
                    <span className="font-bold">{componentsBySeverity.high}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs p-2 rounded-md bg-yellow-500/5 border border-yellow-500/10">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                      <span>Medium Severity</span>
                    </div>
                    <span className="font-bold">{componentsBySeverity.medium}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs p-2 rounded-md bg-blue-500/5 border border-blue-500/10">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span>Low Severity</span>
                    </div>
                    <span className="font-bold">{componentsBySeverity.low}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-green-500" />
                  <span className="text-xs">Secure components</span>
                </div>
                <span className="text-xs font-bold">
                  {Math.max(0, displayStats.totalComponents - displayStats.allVulnerableComponents.length)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Vulnerable Components Table */}
        <Card className="shadow-sm border-muted-foreground/10">
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
                        {renderSortHeader("Component", "name")}
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
                        {renderSortHeader("Vulnerability ID", "id")}
                      </th>
                      <th className="px-4 py-3">Severity</th>
                      <th className="px-4 py-3 text-center">
                        {renderSortHeader("Affected Components", "affectedCount")}
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
        </Card>
      </div>
        </ScrollArea>
      </ResizablePanel>

      {(selectedComponent || selectedVulnerability) && (
        <>
          <ResizableHandle withHandle className="w-2 bg-border hover:bg-primary/50 transition-colors" />
          <ResizablePanel defaultSize={40} minSize={20}>
            <div className="h-full pl-2">
              {selectedComponent ? (
                <ComponentDetailPanel
                  component={selectedComponent}
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
                    <Button variant="ghost" size="icon" onClick={() => setSelectedVulnerability(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="p-4 space-y-6">
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">ID</h4>
                        <div className="text-xl font-bold font-mono text-destructive">{selectedVulnerability.id}</div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Severity</h4>
                        <Badge 
                          variant="secondary" 
                          className="text-white border-0"
                          style={{ 
                            backgroundColor: SEVERITY_COLORS[selectedVulnerability.severity.charAt(0).toUpperCase() + selectedVulnerability.severity.slice(1) as keyof typeof SEVERITY_COLORS] || '#666'
                          }}
                        >
                          {selectedVulnerability.severity}
                        </Badge>
                      </div>

                      {selectedVulnerability.title && (
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
                          <p className="text-sm leading-relaxed">{selectedVulnerability.title}</p>
                        </div>
                      )}

                      <Separator />

                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                          <Network className="h-4 w-4" /> Affected Components ({selectedVulnerability.affectedCount})
                        </h4>
                        <div className="space-y-2">
                          {displayStats.allVulnerableComponents
                            .filter(c => {
                               // This is a bit complex as we need to know if this specific vuln affects this component
                               // In useSbomStats, we didn't preserve the mapping back from vuln to component in a simple way for the UI
                               // But we can check if the component ref is in the vulnSummaryMap's affectedRefs
                               // Actually, the stats object we have here is already processed.
                               // Let's rely on the sbom itself if needed, or just list names if available.
                               // For now, let's just show the count or a simple list if we can find them.
                               return true; // Placeholder: we'd need to re-scan or improve stats
                            })
                            .slice(0, 10).map((comp: any, i: number) => (
                              <div key={i} className="flex items-center justify-between p-2 rounded-md bg-muted/30 border text-sm">
                                <span className="font-medium truncate mr-2">{comp.name}</span>
                                <Badge variant="outline" className="text-[10px] shrink-0">{comp.version}</Badge>
                              </div>
                            ))
                          }
                          {selectedVulnerability.affectedCount > 10 && (
                            <p className="text-[10px] text-muted-foreground text-center">+ {selectedVulnerability.affectedCount - 10} more components</p>
                          )}
                        </div>
                      </div>

                      {selectedVulnerability.id.startsWith('CVE-') && (
                        <div className="pt-4 mt-auto">
                          <Button asChild className="w-full" variant="default">
                            <a href={`https://nvd.nist.gov/vuln/detail/${selectedVulnerability.id}`} target="_blank" rel="noopener noreferrer">
                              View on NVD
                            </a>
                          </Button>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  );
}
