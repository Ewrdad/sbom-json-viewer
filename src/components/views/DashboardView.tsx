import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSbomStats } from "../../hooks/useSbomStats";
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
import { ShieldAlert, ShieldCheck, FileText, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

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
    totalComponents: Array.isArray(sbom.components) ? sbom.components.length : (sbom.components?.size ?? 0),
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Components
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
                Vulnerabilities
              </CardTitle>
              <ShieldAlert className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {displayStats.vulnerabilityCounts.critical +
                  displayStats.vulnerabilityCounts.high}
              </div>
              <p className="text-xs text-muted-foreground">
                Critical & High risk
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Unique Licenses
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.keys(displayStats.licenseCounts).length}
              </div>
              <p className="text-xs text-muted-foreground">Detected types</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Secure Components
              </CardTitle>
              <ShieldCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.max(
                  0,
                  displayStats.totalComponents -
                    (displayStats.vulnerabilityCounts.critical +
                      displayStats.vulnerabilityCounts.high +
                      displayStats.vulnerabilityCounts.medium +
                      displayStats.vulnerabilityCounts.low),
                )}
              </div>
              <p className="text-xs text-muted-foreground">No known issues</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4 shadow-sm border-muted-foreground/10">
            <CardHeader>
              <CardTitle className="text-xl">Vulnerability Severity</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={vulnData}>
                    <XAxis
                      dataKey="name"
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value}`}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(0,0,0,0.05)" }}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-3 shadow-sm border-muted-foreground/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xl">License Distribution</CardTitle>
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
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {licenseDistData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-xs font-medium">{entry.name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {Math.round((entry.value / (totalLicenseCount || 1)) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-3 shadow-sm border-muted-foreground/10">
            <CardHeader>
              <CardTitle className="text-xl">Top Licenses</CardTitle>
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
        </div>

        {/* Most Vulnerable Components Table */}
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-1">
          <Card className="shadow-sm border-muted-foreground/10">
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
          </Card>
        </div>
      </div>
    </ScrollArea>
  );
}
