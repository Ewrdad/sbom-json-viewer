import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSbomStats } from "../../hooks/useSbomStats";
import { HelpTooltip } from "@/components/common/HelpTooltip";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { ReportGenerator } from "./reports/ReportGenerator";
import type { SbomStats } from "@/types/sbom";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Pie,
  PieChart,
  Cell,
} from "recharts";
import { ShieldAlert, ShieldCheck, Package, Fingerprint, Scale } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CHART_TOOLTIP_STYLE, CHART_CURSOR, CHART_AXIS_PROPS, CHART_TOOLTIP_LABEL_STYLE, CHART_TOOLTIP_ITEM_STYLE } from "@/lib/chartTheme";

export function DashboardView({ 
  sbom, 
  preComputedStats 
}: { 
  sbom: any; 
  preComputedStats?: SbomStats; 
}) {
  const stats = useSbomStats(preComputedStats ? null : sbom);
  const isLoadingStats = !preComputedStats && !stats;
  const displayStats: SbomStats = preComputedStats ?? stats ?? {
    totalComponents: sbom ? (Array.isArray(sbom.components) ? sbom.components.length : (sbom.components?.size ?? 0)) : 0,
    vulnerabilityCounts: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      none: 0,
    },
    licenseCounts: {},
    topLicenses: [],
    licenseDistribution: {
      permissive: 0,
      copyleft: 0,
      weakCopyleft: 0,
      proprietary: 0,
      unknown: 0,
    },
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

  const vulnData = [
    {
      name: "Critical",
      count: displayStats.vulnerabilityCounts.critical,
      fill: "#ef4444",
    },
    {
      name: "High",
      count: displayStats.vulnerabilityCounts.high,
      fill: "#f97316",
    },
    {
      name: "Medium",
      count: displayStats.vulnerabilityCounts.medium,
      fill: "#eab308",
    },
    {
      name: "Low",
      count: displayStats.vulnerabilityCounts.low,
      fill: "#3b82f6",
    },
  ];

  const licenseDistData = [
    { name: "Permissive", value: displayStats.licenseDistribution.permissive, color: "#22c55e" },
    { name: "Copyleft", value: displayStats.licenseDistribution.copyleft, color: "#ef4444" },
    { name: "Weak Copyleft", value: displayStats.licenseDistribution.weakCopyleft, color: "#f97316" },
    { name: "Proprietary", value: displayStats.licenseDistribution.proprietary, color: "#a855f7" },
    { name: "Unknown", value: displayStats.licenseDistribution.unknown, color: "#94a3b8" },
  ].filter(d => d.value > 0);

  const totalLicenseCount = Object.values(displayStats.licenseDistribution).reduce((a, b) => a + b, 0);

  const dependencyData = [
    { 
      name: "None (Leaf)", 
      value: displayStats.dependentsDistribution[0] || 0, 
      fill: "#94a3b8" 
    },
    { 
      name: "1 Dependent", 
      value: displayStats.dependentsDistribution[1] || 0, 
      fill: "#60a5fa" 
    },
    { 
      name: "2-5 Dependents", 
      value: Object.entries(displayStats.dependentsDistribution)
        .filter(([count]) => parseInt(count) >= 2 && parseInt(count) <= 5)
        .reduce((sum, [, count]) => sum + count, 0),
      fill: "#3b82f6" 
    },
    { 
      name: "6+ Dependents (Hubs)", 
      value: Object.entries(displayStats.dependentsDistribution)
        .filter(([count]) => parseInt(count) >= 6)
        .reduce((sum, [, count]) => sum + count, 0),
      fill: "#2563eb" 
    },
  ].filter(d => d.value > 0);

  return (
    <ScrollArea className="h-full">
      <div className="pb-6 space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center gap-2">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          {isLoadingStats && (
            <Badge variant="outline" className="text-xs">
              Computing stats…
            </Badge>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6 text-center">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                Total Components
                <HelpTooltip text="Total number of components found in the SBOM file." />
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {displayStats.totalComponents}
              </div>
              <p className="text-xs text-muted-foreground">in current SBOM</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Vulnerability Findings
              </CardTitle>
              <ShieldAlert className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {displayStats.totalVulnerabilities}
              </div>
              <p className="text-xs text-muted-foreground">Total package hits</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Unique CVEs
              </CardTitle>
              <Fingerprint className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">
                {displayStats.uniqueVulnerabilityCount}
              </div>
              <p className="text-xs text-muted-foreground">Distinct issues</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                Secure Components
                <HelpTooltip text="Number of components with no known vulnerabilities." />
              </CardTitle>
              <ShieldCheck className="h-4 w-4 text-sky-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.max(0, displayStats.totalComponents - displayStats.allVulnerableComponents.length)}
              </div>
              <p className="text-xs text-muted-foreground">No known issues</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Unique Licenses
              </CardTitle>
              <Scale className="h-4 w-4 text-indigo-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {displayStats.allLicenses.length}
              </div>
              <p className="text-xs text-muted-foreground">License variations</p>
            </CardContent>
          </Card>

          <Card className={sbom.signature ? "border-green-500/50 bg-green-500/5" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                Signature
                <HelpTooltip text={sbom.signature ? `Digital signature detected using ${sbom.signature.algorithm}.` : "No digital signature detected in this SBOM."} />
              </CardTitle>
              <ShieldCheck className={`h-4 w-4 ${sbom.signature ? "text-green-500" : "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${sbom.signature ? "text-green-500" : "text-muted-foreground"}`}>
                {sbom.signature ? "Verified" : "Unsigned"}
              </div>
              <p className="text-xs text-muted-foreground">
                {sbom.signature ? sbom.signature.algorithm : "No assurance"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-12">
          {/* Severity Chart */}
          <Card className="lg:col-span-8 shadow-sm border-muted-foreground/10">
            <ErrorBoundary fallback={<div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">Severity chart unavailable</div>}>
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  Vulnerability Severity
                  <HelpTooltip text="Distribution of vulnerabilities by severity level (Critical, High, Medium, Low)." />
                </CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={vulnData}>
                      <XAxis
                        dataKey="name"
                        {...CHART_AXIS_PROPS}
                      />
                      <YAxis
                        {...CHART_AXIS_PROPS}
                        tickFormatter={(value) => `${value}`}
                      />
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
            </ErrorBoundary>
          </Card>

          {/* Dependency Composition */}
          <Card className="lg:col-span-4 shadow-sm border-muted-foreground/10">
            <ErrorBoundary fallback={<div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Dependency distribution chart unavailable</div>}>
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  Dependency Centrality
                  <HelpTooltip text="Shows how many other components depend on each package. High numbers indicate critical hubs." />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dependencyData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {dependencyData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
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
                <div className="space-y-2 mt-6">
                  {dependencyData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.fill }} />
                      <span className="text-xs font-medium">{entry.name}</span>
                      <span className="text-xs font-bold ml-auto">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </ErrorBoundary>
          </Card>

          {/* License Pie Chart */}
          <Card className="lg:col-span-12 xl:col-span-4 shadow-sm border-muted-foreground/10">
            <ErrorBoundary fallback={<div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">License distribution chart unavailable</div>}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xl flex items-center gap-2">
                  License Distribution
                  <HelpTooltip text="Breakdown of components by license type." />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={licenseDistData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {licenseDistData.map((entry, index) => (
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
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {licenseDistData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="text-[10px] font-medium truncate">{entry.name}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {Math.round((entry.value / (totalLicenseCount || 1)) * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </ErrorBoundary>
          </Card>

          {/* Top Licenses */}
          <Card className="lg:col-span-6 xl:col-span-4 shadow-sm border-muted-foreground/10">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                Top Licenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {displayStats.topLicenses.map((license) => (
                  <div key={license.name} className="flex items-center">
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {license.name}
                      </p>
                      <div className="w-full bg-secondary h-1.5 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="bg-primary h-full transition-all duration-1000"
                          style={{
                            width: `${(license.count / (displayStats.totalComponents || 1)) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="ml-4 text-sm font-semibold text-muted-foreground">
                      {license.count}
                    </div>
                  </div>
                ))}
                {displayStats.topLicenses.length === 0 && (
                  <p className="text-muted-foreground text-sm text-center py-8">
                    No license data found.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Impactful CVEs */}
          <Card className="lg:col-span-6 xl:col-span-4 shadow-sm border-muted-foreground/10">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                Impactful CVEs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {displayStats.allVulnerabilities.slice(0, 5).map((vuln) => (
                  <div key={vuln.id} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                          {vuln.severity}
                        </Badge>
                        <p className="text-sm font-bold leading-none">{vuln.id}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground line-clamp-1 max-w-[180px]">
                        {vuln.title || "No description available"}
                      </p>
                    </div>
                    <div className="text-xs text-right">
                      <span className="font-bold">{vuln.affectedCount}</span>
                      <p className="text-[10px] text-muted-foreground">affects</p>
                    </div>
                  </div>
                ))}
                {displayStats.allVulnerabilities.length === 0 && (
                  <p className="text-muted-foreground text-sm text-center py-8">
                    No vulnerabilities found.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Most Vulnerable Components Table */}
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-1">
          <Card className="shadow-sm border-muted-foreground/10">
            <ErrorBoundary fallback={<div className="p-10 text-center text-muted-foreground">Components table unavailable due to a rendering error.</div>}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl">
                  Most Vulnerable Components
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  Top 5 by Severity
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="relative overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase border-b bg-muted/30">
                      <tr>
                        <th className="px-4 py-3">Component</th>
                        <th className="px-4 py-3">Version</th>
                        <th className="px-4 py-3 text-center">Critical</th>
                        <th className="px-4 py-3 text-center">High</th>
                        <th className="px-4 py-3 text-center">Medium</th>
                        <th className="px-4 py-3 text-center font-bold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayStats.vulnerableComponents.map((comp, i) => (
                        <tr
                          key={i}
                          className="border-b hover:bg-muted/50 transition-colors"
                        >
                          <td className="px-4 py-3 font-medium">{comp.name}</td>
                          <td className="px-4 py-3 font-mono text-xs">
                            {comp.version}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {comp.critical > 0 ? (
                              <Badge
                                variant="destructive"
                                className="h-5 min-w-[20px] justify-center"
                              >
                                {comp.critical}
                              </Badge>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {comp.high > 0 ? (
                              <Badge
                                variant="secondary"
                                className="bg-orange-500 hover:bg-orange-600 text-white border-0 h-5 min-w-[20px] justify-center"
                              >
                                {comp.high}
                              </Badge>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {comp.medium > 0 ? (
                              <Badge
                                variant="secondary"
                                className="bg-yellow-500 hover:bg-yellow-600 text-white border-0 h-5 min-w-[20px] justify-center"
                              >
                                {comp.medium}
                              </Badge>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="px-4 py-3 text-center font-bold">
                            {comp.total}
                          </td>
                        </tr>
                      ))}
                      {displayStats.vulnerableComponents.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-8 text-center text-muted-foreground italic"
                          >
                            No vulnerabilities detected in any components.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </ErrorBoundary>
          </Card>
        </div>
        <ReportGenerator stats={displayStats} />
      </div>
    </ScrollArea>
  );
}
