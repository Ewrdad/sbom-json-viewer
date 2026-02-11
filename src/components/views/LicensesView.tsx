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
  ScrollText,
  FileCheck,
  ShieldAlert,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  BookOpen,
  X,
  Network,
  Scale,
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
import { CHART_TOOLTIP_STYLE, CHART_CURSOR, CHART_TOOLTIP_LABEL_STYLE, CHART_TOOLTIP_ITEM_STYLE } from "@/lib/chartTheme";

const ITEMS_PER_PAGE = 20;

type SortKey = "name" | "total" | "id" | "category" | "affectedCount";
type SortDir = "asc" | "desc";
type ViewMode = "components" | "licenses";

const CATEGORY_COLORS = {
  permissive: "#16a34a", // green-600
  copyleft: "#dc2626", // red-600
  "weak-copyleft": "#ea580c", // orange-600
  proprietary: "#2563eb", // blue-600
  unknown: "#64748b", // slate-500
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function LicensesView({ sbom, preComputedStats }: { sbom: any; preComputedStats?: SbomStats }) {
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
    allLicenses: [],
    allLicenseComponents: [],
    ...(preComputedStats ?? stats ?? {}),
  } as SbomStats;

  const [viewMode, setViewMode] = useState<ViewMode>("components");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [licenseSortKey, setLicenseSortKey] = useState<SortKey>("affectedCount");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [licenseSortDir, setLicenseSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);
  const [selectedComponent, setSelectedComponent] = useState<any | null>(null);
  const [selectedLicense, setSelectedLicense] = useState<any | null>(null);

  const { analysis } = useDependencyAnalysis(sbom);

  const handleSort = (key: SortKey) => {
    if (viewMode === "components") {
      if (sortKey === key) {
        setSortDir(sortDir === "desc" ? "asc" : "desc");
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
    } else {
      if (licenseSortKey === key) {
        setLicenseSortDir(licenseSortDir === "desc" ? "asc" : "desc");
      } else {
        setLicenseSortKey(key);
        setLicenseSortDir("desc");
      }
    }
    setPage(0);
  };

  const filteredAndSortedComponents = useMemo(() => {
    let list = displayStats.allLicenseComponents;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.version.toLowerCase().includes(q) ||
          c.licenses.some(l => l.name.toLowerCase().includes(q) || l.id.toLowerCase().includes(q))
      );
    }

    return [...list].sort((a, b) => {
      const aVal = sortKey === "name" ? a.name : (a as any)[sortKey];
      const bVal = sortKey === "name" ? b.name : (b as any)[sortKey];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [displayStats.allLicenseComponents, searchQuery, sortKey, sortDir]);

  const filteredAndSortedLicenses = useMemo(() => {
    let list = displayStats.allLicenses;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((l) => 
        l.name.toLowerCase().includes(q) || 
        l.id.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      const aVal = (a as any)[licenseSortKey];
      const bVal = (b as any)[licenseSortKey];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return licenseSortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return licenseSortDir === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [displayStats.allLicenses, searchQuery, licenseSortKey, licenseSortDir]);

  const activeList = viewMode === "components" ? filteredAndSortedComponents : filteredAndSortedLicenses;

  const totalPages = Math.max(1, Math.ceil(activeList.length / ITEMS_PER_PAGE));
  const pageItems = activeList.slice(
    page * ITEMS_PER_PAGE,
    (page + 1) * ITEMS_PER_PAGE,
  );

  const { permissive, copyleft, weakCopyleft, proprietary, unknown } = displayStats.licenseDistribution;
  const totalInDistribution = permissive + copyleft + weakCopyleft + proprietary + unknown;

  const distributionPieData = [
    { name: "Permissive", value: permissive, color: CATEGORY_COLORS.permissive },
    { name: "Copyleft", value: copyleft, color: CATEGORY_COLORS.copyleft },
    { name: "Weak Copyleft", value: weakCopyleft, color: CATEGORY_COLORS["weak-copyleft"] },
    { name: "Proprietary", value: proprietary, color: CATEGORY_COLORS.proprietary },
    { name: "Unknown", value: unknown, color: CATEGORY_COLORS.unknown },
  ].filter((d) => d.value > 0);

  const topBarData = displayStats.topLicenses.map((l, i) => ({
    name: l.name,
    count: l.count,
    fill: i === 0 ? "#6366f1" : "#818cf8",
  }));

  const renderSortHeader = (label: string, sortKeyVal: SortKey) => {
    const activeSortKey = viewMode === "components" ? sortKey : licenseSortKey;
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
      key={selectedComponent || selectedLicense ? "split" : "single"}
    >
      <ResizablePanel
        defaultSize={selectedComponent || selectedLicense ? 60 : 100}
        minSize={30}
      >
        <ScrollArea className="h-full pr-2">
      <div className="pb-6 space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center gap-3">
          <ScrollText className="h-7 w-7 text-primary" />
          <h2 className="text-3xl font-bold tracking-tight">Licenses</h2>
          {isLoadingStats && (
            <Badge variant="outline" className="text-xs">
              Computing stats…
            </Badge>
          )}
        </div>

        {/* KPI Cards Row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card className="border-l-4 border-l-primary/60">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                Unique Licenses
                <HelpTooltip text="Total number of distinct licenses identified in the SBOM." />
              </CardTitle>
              <Scale className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{displayStats.allLicenses.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Found across the project</p>
            </CardContent>
          </Card>

          <Card className="border-l-4" style={{ borderLeftColor: CATEGORY_COLORS.permissive }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                Permissive
                <HelpTooltip text="Licenses with minimal restrictions (e.g., MIT, Apache-2.0). Business-friendly." />
              </CardTitle>
              <FileCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{permissive}</div>
              <p className="text-xs text-muted-foreground mt-1">Business friendly</p>
            </CardContent>
          </Card>

          <Card className="border-l-4" style={{ borderLeftColor: CATEGORY_COLORS.copyleft }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                Copyleft
                <HelpTooltip text="Licenses requiring derivative works to be open source (e.g., GPL)." />
              </CardTitle>
              <ShieldAlert className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{copyleft}</div>
              <p className="text-xs text-muted-foreground mt-1">High compliance risk</p>
            </CardContent>
          </Card>

          <Card className="border-l-4" style={{ borderLeftColor: CATEGORY_COLORS["weak-copyleft"] }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                Weak Copyleft
                <HelpTooltip text="Licenses requiring changes to the library itself to be shared (e.g., LGPL, MPL)." />
              </CardTitle>
              <ShieldAlert className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{weakCopyleft}</div>
              <p className="text-xs text-muted-foreground mt-1">Moderate compliance risk</p>
            </CardContent>
          </Card>

          <Card className="border-l-4" style={{ borderLeftColor: CATEGORY_COLORS.unknown }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                Unknown
                <HelpTooltip text="Components with no license information or unrecognized license strings." />
              </CardTitle>
              <BookOpen className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-500">{unknown}</div>
              <p className="text-xs text-muted-foreground mt-1">Requires review</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
          {/* Category Donut */}
          <Card className="shadow-sm border-muted-foreground/10">
            <CardHeader>
              <CardTitle className="text-lg">License Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="h-[220px] w-full md:w-1/2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={distributionPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {distributionPieData.map((entry, index) => (
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
                </div>
                <div className="w-full md:w-1/2 space-y-3">
                  {distributionPieData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="text-sm font-medium">{entry.name}</span>
                      <div className="flex-1 border-b border-muted mx-2 border-dotted" />
                      <span className="text-sm text-muted-foreground font-mono">
                         {entry.value} ({totalInDistribution > 0 ? Math.round((entry.value / totalInDistribution) * 100) : 0}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Licenses Bar Chart */}
          <Card className="shadow-sm border-muted-foreground/10">
            <CardHeader>
              <CardTitle className="text-lg">Top 5 Licenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topBarData} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }} 
                      width={100}
                    />
                    <Tooltip
                      cursor={CHART_CURSOR}
                      contentStyle={CHART_TOOLTIP_STYLE}
                      labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                      itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table Card */}
        <Card className="shadow-sm border-muted-foreground/10">
          <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap pb-2">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <CardTitle className="text-xl">
                  {viewMode === "components" ? "Component Licenses" : "License Registry"}
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  {activeList.length} total
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {viewMode === "components" 
                  ? "Breakdown of licenses for each component in the project" 
                  : "List of all unique licenses detected and their reach"}
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
                variant={viewMode === "licenses" ? "secondary" : "ghost"} 
                size="sm"
                className="text-xs h-8 px-3"
                onClick={() => {
                  setViewMode("licenses");
                  setPage(0);
                }}
              >
                By License
              </Button>
            </div>
            
            <div className="relative w-full max-w-xs ml-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={viewMode === "components" ? "Search components or licenses..." : "Search licenses..."}
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
                      <th className="px-4 py-3">Licenses</th>
                       <th className="px-4 py-3 text-right pr-6">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((comp: any, i) => (
                      <tr
                        key={`${comp.ref}-${i}`}
                        className="border-b hover:bg-muted/50 transition-colors"
                      >
                         <td className="px-4 py-3 font-medium cursor-pointer hover:underline" onClick={() => {
                            const fullComp = Array.from(sbom.components).find((c: any) => c.bomRef?.value === comp.ref || (c as any).bomRef === comp.ref);
                            setSelectedComponent(fullComp || comp);
                            setSelectedLicense(null);
                         }}>
                           {comp.name}
                         </td>
                         <td className="px-4 py-3 font-mono text-xs">{comp.version || "—"}</td>
                         <td className="px-4 py-3">
                           <div className="flex flex-wrap gap-1">
                             {comp.licenses.length > 0 ? (
                               comp.licenses.map((l: any, idx: number) => (
                                 <Badge 
                                   key={`${idx}`} 
                                   variant="outline" 
                                   className="text-[10px] whitespace-nowrap"
                                   style={{ 
                                     borderColor: CATEGORY_COLORS[l.category as keyof typeof CATEGORY_COLORS] + "40",
                                     color: CATEGORY_COLORS[l.category as keyof typeof CATEGORY_COLORS],
                                     backgroundColor: CATEGORY_COLORS[l.category as keyof typeof CATEGORY_COLORS] + "10"
                                   }}
                                 >
                                   {l.id}
                                 </Badge>
                               ))
                             ) : (
                               <Badge variant="secondary" className="text-[10px] opacity-50">Unknown</Badge>
                             )}
                           </div>
                         </td>
                         <td className="px-4 py-3 text-right pr-6">
                           <Button
                             variant="outline"
                             size="xs"
                             className="h-7 text-[10px]"
                             onClick={() => {
                               const fullComp = Array.from(sbom.components).find((c: any) => c.bomRef?.value === comp.ref || (c as any).bomRef === comp.ref);
                               setSelectedComponent(fullComp || comp);
                               setSelectedLicense(null);
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
                          {renderSortHeader("License ID", "id")}
                          <HelpTooltip text="SPDX License Identifier." />
                        </div>
                      </th>
                      <th className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {renderSortHeader("Category", "category")}
                          <HelpTooltip text="Legal categorization of the license (Permissive, Copyleft, etc.)." />
                        </div>
                      </th>
                      <th className="px-4 py-3 text-center">
                        {renderSortHeader("Affected Components", "affectedCount")}
                      </th>
                      <th className="px-4 py-3 text-right pr-6">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((license: any, i) => (
                      <tr
                        key={`${license.id}-${i}`}
                        className="border-b hover:bg-muted/50 transition-colors"
                      >
                        <td className="px-4 py-3 font-bold font-mono text-xs">
                          {license.id}
                        </td>
                        <td className="px-4 py-3">
                          <Badge 
                            variant="secondary" 
                            className="text-white border-0 h-5 text-[10px] uppercase"
                            style={{ 
                              backgroundColor: CATEGORY_COLORS[license.category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.unknown
                            }}
                          >
                            {license.category}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center font-bold">
                          {license.affectedCount}
                        </td>
                         <td className="px-4 py-3 text-right pr-6">
                           <Button 
                             variant="outline" 
                             size="xs" 
                             className="h-7 text-[10px]"
                             onClick={() => {
                               setSelectedLicense(license);
                               setSelectedComponent(null);
                             }}
                           >
                             Full Terms
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
                      <td colSpan={viewMode === "components" ? 3 : 4} className="px-4 py-12 text-center text-muted-foreground italic">
                        No results match your search.
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
                  {activeList.length} {viewMode === "components" ? "components" : "licenses"}
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

      {(selectedComponent || selectedLicense) && (
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
                      <Scale className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-lg breadcrumb">License Details</h3>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedLicense(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="p-4 space-y-6">
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">License ID</h4>
                        <div className="text-xl font-bold font-mono">{selectedLicense.id}</div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Category</h4>
                        <Badge 
                          variant="secondary" 
                          className="text-white border-0 uppercase"
                          style={{ 
                            backgroundColor: CATEGORY_COLORS[selectedLicense.category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.unknown
                          }}
                        >
                          {selectedLicense.category}
                        </Badge>
                      </div>

                      <Separator />

                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                          <Network className="h-4 w-4" /> Affected Components ({selectedLicense.affectedCount})
                        </h4>
                        <div className="space-y-2">
                          {displayStats.allLicenseComponents
                            .filter(c => c.licenses.some((l: any) => l.id === selectedLicense.id))
                            .slice(0, 15).map((comp: any, i: number) => (
                              <div key={i} className="flex items-center justify-between p-2 rounded-md bg-muted/30 border text-sm">
                                <span className="font-medium truncate mr-2">{comp.name}</span>
                                <Badge variant="outline" className="text-[10px] shrink-0">{comp.version}</Badge>
                              </div>
                            ))
                          }
                          {selectedLicense.affectedCount > 15 && (
                            <p className="text-[10px] text-muted-foreground text-center">+ {selectedLicense.affectedCount - 15} more components</p>
                          )}
                        </div>
                      </div>

                      <div className="pt-4 mt-auto">
                        <Button className="w-full" variant="outline" onClick={() => window.open(`https://spdx.org/licenses/${selectedLicense.id}.html`, '_blank', 'noopener,noreferrer')}>
                          View SPDX License Terms
                        </Button>
                      </div>
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
