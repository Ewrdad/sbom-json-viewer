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
} from "lucide-react";

const ITEMS_PER_PAGE = 20;

type SortKey = "name" | "critical" | "high" | "medium" | "low" | "total";
type SortDir = "asc" | "desc";

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
  const displayStats: SbomStats = preComputedStats ?? stats ?? {
    totalComponents: 0,
    vulnerabilityCounts: { critical: 0, high: 0, medium: 0, low: 0, none: 0 },
    licenseCounts: {},
    topLicenses: [],
    licenseDistribution: { permissive: 0, copyleft: 0, weakCopyleft: 0, proprietary: 0, unknown: 0 },
    vulnerableComponents: [],
    allVulnerableComponents: [],
    totalVulnerabilities: 0,
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortKey(key);
      setSortDir("desc");
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
      const aVal = sortKey === "name" ? a.name : a[sortKey];
      const bVal = sortKey === "name" ? b.name : b[sortKey];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return sorted;
  }, [displayStats.allVulnerableComponents, searchQuery, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / ITEMS_PER_PAGE));
  const pageItems = filteredAndSorted.slice(
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

  // Risk score: weighted sum (critical=10, high=5, medium=2, low=1) normalized to 0-100
  const riskRaw = critical * 10 + high * 5 + medium * 2 + low;
  const riskMax = Math.max(riskRaw, 1);
  const riskScore = Math.min(100, Math.round((riskRaw / Math.max(displayStats.totalComponents * 2, riskMax)) * 100));
  const riskLabel =
    riskScore >= 70 ? "Critical" : riskScore >= 40 ? "High" : riskScore >= 15 ? "Moderate" : "Low";
  const riskColor =
    riskScore >= 70 ? "text-red-500" : riskScore >= 40 ? "text-orange-500" : riskScore >= 15 ? "text-yellow-500" : "text-green-500";
  const riskBg =
    riskScore >= 70 ? "bg-red-500" : riskScore >= 40 ? "bg-orange-500" : riskScore >= 15 ? "bg-yellow-500" : "bg-green-500";

  const affectedPct = displayStats.totalComponents > 0
    ? Math.round((displayStats.allVulnerableComponents.length / displayStats.totalComponents) * 100)
    : 0;

  const renderSortHeader = (label: string, sortKeyVal: SortKey) => (
    <button
      className="flex items-center gap-1 group cursor-pointer text-xs uppercase font-medium hover:text-foreground transition-colors bg-transparent border-none p-0"
      onClick={() => handleSort(sortKeyVal)}
    >
      {label}
      <ArrowUpDown className={`h-3 w-3 transition-opacity ${sortKey === sortKeyVal ? "opacity-100" : "opacity-30 group-hover:opacity-60"}`} />
    </button>
  );

  return (
    <ScrollArea className="h-full">
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

          {/* Risk Score */}
          <Card className="shadow-sm border-muted-foreground/10">
            <CardHeader>
              <CardTitle className="text-lg">Risk Assessment</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center gap-4">
              <div className="relative w-32 h-32">
                <svg className="w-32 h-32 -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    className={riskBg.replace("bg-", "stroke-")}
                    strokeWidth="3"
                    strokeDasharray={`${riskScore}, 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-2xl font-bold ${riskColor}`}>{riskScore}</span>
                  <span className="text-[10px] text-muted-foreground">/ 100</span>
                </div>
              </div>
              <div className="text-center">
                <Badge className={`${riskBg} text-white border-0 text-sm px-3`}>{riskLabel} Risk</Badge>
                <p className="text-xs text-muted-foreground mt-2">
                  {affectedPct}% of components affected
                </p>
              </div>
              <div className="w-full space-y-2 mt-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Secure components</span>
                  <span className="font-medium">
                    {Math.max(0, displayStats.totalComponents - displayStats.allVulnerableComponents.length)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Affected components</span>
                  <span className="font-medium">{displayStats.allVulnerableComponents.length}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Total components</span>
                  <span className="font-medium">{displayStats.totalComponents}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Vulnerable Components Table */}
        <Card className="shadow-sm border-muted-foreground/10">
          <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <CardTitle className="text-xl">Vulnerable Components</CardTitle>
              <Badge variant="outline" className="text-xs">
                {filteredAndSorted.length} of {displayStats.allVulnerableComponents.length}
              </Badge>
            </div>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search components..."
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
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((comp, i) => (
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
                    </tr>
                  ))}
                  {filteredAndSorted.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center">
                        <div className="space-y-2">
                          <ShieldCheck className="h-10 w-10 text-green-500 mx-auto" />
                          <p className="text-muted-foreground text-sm font-medium">
                            {searchQuery ? "No components match your search." : "No vulnerabilities detected — all components are secure!"}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-muted-foreground">
                  Showing {page * ITEMS_PER_PAGE + 1}–{Math.min((page + 1) * ITEMS_PER_PAGE, filteredAndSorted.length)} of{" "}
                  {filteredAndSorted.length} components
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
  );
}
