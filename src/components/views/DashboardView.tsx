import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VulnerabilityLink } from "@/components/common/VulnerabilityLink";
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
import { ShieldAlert, ShieldCheck, Package, Fingerprint, Wrench, Info, ArrowRight } from "lucide-react";
import { useView } from "../../context/ViewContext";
import { useSelection } from "../../context/SelectionContext";
import { useSbom } from "../../context/SbomContext";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { CHART_TOOLTIP_STYLE, CHART_CURSOR, CHART_AXIS_PROPS, CHART_TOOLTIP_LABEL_STYLE, CHART_TOOLTIP_ITEM_STYLE } from "@/lib/chartTheme";

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 40;
  const height = 15;
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="flex items-center gap-1 bg-muted/50 px-1 rounded border border-border/50">
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary/50"
          points={points}
        />
        <circle 
          cx={width} 
          cy={height - ((data[data.length-1] - min) / range) * height} 
          r="2" 
          className="fill-primary"
        />
      </svg>
    </div>
  );
}

export function DashboardView({ 
  sbom, 
  preComputedStats 
}: { 
  sbom: any; 
  preComputedStats?: SbomStats; 
}) {
  const { setActiveView } = useView();
  const { setViewFilters } = useSelection();
  const { scoreHistory } = useSbom();
  const stats = useSbomStats(preComputedStats ? null : sbom);
  const isLoadingStats = !preComputedStats && !stats;
  const displayStats: SbomStats = preComputedStats ?? stats ?? {
    totalComponents: Number(sbom ? (Array.isArray(sbom.components) ? sbom.components.length : (sbom.components?.size ?? 0)) : 0),
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
    totalVulnerabilityInstances: 0,
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

  const hasVulnData = vulnData.some(d => d.count > 0);

  return (
    <ScrollArea className="h-full">
      <div className="pb-6 space-y-6 animate-in fade-in duration-500">
        {isLoadingStats && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Computing stats…
            </Badge>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5 text-center">
          <Card 
            className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
            onClick={() => setActiveView('explorer')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                Total Components
                <HelpTooltip text="Total number of components found in the SBOM file." />
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {displayStats.totalComponents}
              </div>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 group-hover:text-primary transition-colors">
                View explorer <ArrowRight className="h-3 w-3" />
              </p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:border-destructive/50 hover:shadow-md transition-all group"
            onClick={() => {
              setViewFilters('vulnerabilities', { viewMode: 'components' });
              setActiveView('vulnerabilities');
            }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive">
                Vulnerability Findings
                <HelpTooltip text="The total number of vulnerability instances across all components. One CVE affecting three packages counts as three findings." />
              </CardTitle>
              <ShieldAlert className="h-4 w-4 text-destructive group-hover:scale-110 transition-transform" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {displayStats.totalVulnerabilityInstances || displayStats.totalVulnerabilities}
              </div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold mt-1 flex items-center justify-center gap-1 group-hover:text-destructive transition-colors">
                Analyze findings <ArrowRight className="h-3 w-3" />
              </p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:border-orange-500/50 hover:shadow-md transition-all group"
            onClick={() => {
              setViewFilters('vulnerabilities', { viewMode: 'vulnerabilities' });
              setActiveView('vulnerabilities');
            }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-500">
                Unique CVEs
                <HelpTooltip text="The number of distinct security vulnerabilities identified by their unique IDs (e.g., CVE-2023-XYZ)." />
              </CardTitle>
              <Fingerprint className="h-4 w-4 text-orange-500 group-hover:scale-110 transition-transform" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">
                {displayStats.uniqueVulnerabilityCount}
              </div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold mt-1 flex items-center justify-center gap-1 group-hover:text-orange-500 transition-colors">
                View distinct IDs <ArrowRight className="h-3 w-3" />
              </p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
            onClick={() => setActiveView('developer')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                Metadata Health
                <HelpTooltip text="Score based on the completeness of SBOM metadata (purls, hashes, licenses, etc.). Higher is better for security automation." />
              </CardTitle>
              <Wrench className="h-4 w-4 text-primary group-hover:rotate-12 transition-transform" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 justify-center">
                <div className={`text-2xl font-bold ${
                  displayStats.developerStats?.metadataQuality.grade === 'A' ? 'text-green-600' :
                  displayStats.developerStats?.metadataQuality.grade === 'B' ? 'text-blue-600' :
                  displayStats.developerStats?.metadataQuality.grade === 'C' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {displayStats.developerStats?.metadataQuality.grade || 'N/A'}
                </div>
                <div className="flex flex-col items-start">
                  <div className="text-xs font-semibold text-muted-foreground">
                    ({displayStats.developerStats?.metadataQuality.score || 0}/100)
                  </div>
                  {scoreHistory && scoreHistory.length > 1 && (
                    <div className="mt-0.5" title="Score history in this session">
                      <Sparkline data={scoreHistory} />
                    </div>
                  )}
                </div>
              </div>
              <div className="text-[10px] text-primary group-hover:underline font-medium flex items-center justify-center gap-1 mt-1">
                View health breakdown <ArrowRight className="h-3 w-3" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className={sbom.signature ? "border-green-500/50 bg-green-500/5 cursor-pointer hover:shadow-md transition-all group" : "cursor-pointer hover:shadow-md transition-all group"}
            onClick={() => setActiveView('metadata')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                Signature
                <HelpTooltip text={sbom.signature ? `Digital signature detected (${sbom.signature.algorithm}). This verifies the SBOM was created by a trusted source and hasn't been tampered with.` : "No digital signature detected. There is no cryptographic assurance of this SBOM's origin or integrity."} />
              </CardTitle>
              <ShieldCheck className={`h-4 w-4 ${sbom.signature ? "text-green-500" : "text-muted-foreground"} group-hover:scale-110 transition-transform`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${sbom.signature ? "text-green-500" : "text-muted-foreground"}`}>
                {sbom.signature ? "Verified" : "Unsigned"}
              </div>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 group-hover:text-primary transition-colors">
                {sbom.signature ? sbom.signature.algorithm : "View raw metadata"} <ArrowRight className="h-3 w-3" />
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Data Source Notice */}
        <div className="flex flex-col gap-2 bg-muted/30 p-3 rounded border border-dashed">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <Info className="h-3 w-3" />
            <span>Vulnerability and component data is derived directly from the SBOM metadata. No external scanning is performed.</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <Info className="h-3 w-3" />
            <span>Direct/Transitive breakdown is based on the SBOM's defined root. Results may vary if the root is not explicitly specified.</span>
          </div>
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
                  {hasVulnData ? (
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
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-muted/10 rounded-lg border-2 border-dashed border-muted">
                      <ShieldCheck className="h-12 w-12 text-green-500/50 mb-3" />
                      <p className="text-sm font-medium text-foreground">No Vulnerabilities Detected</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
                        Clean scan results! This SBOM contains no known security vulnerabilities in its metadata.
                      </p>
                    </div>
                  )}
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
                        <p className="text-sm font-bold leading-none">
                          <VulnerabilityLink id={vuln.id} />
                        </p>
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
          <Card className="shadow-sm border-muted-foreground/10 overflow-hidden">
            <ErrorBoundary fallback={<div className="p-10 text-center text-muted-foreground">Components table unavailable due to a rendering error.</div>}>
              <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap pb-3">
                <CardTitle className="text-xl">
                  Most Vulnerable Components
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  Top 5 by Severity
                </Badge>
              </CardHeader>
              <CardContent className="p-0 sm:p-6">
                <div className="relative overflow-x-auto scrollbar-thin">
                  <table className="w-full text-sm text-left border-collapse min-w-[600px] md:min-w-0">
                    <thead className="text-[10px] md:text-xs text-muted-foreground uppercase border-y bg-muted/30">
                      <tr>
                        <th className="px-4 py-3 font-bold">Component</th>
                        <th className="px-4 py-3 font-bold">Version</th>
                        <th className="px-4 py-3 font-bold text-center">Critical</th>
                        <th className="px-4 py-3 font-bold text-center">High</th>
                        <th className="px-4 py-3 font-bold text-center">Medium</th>
                        <th className="px-4 py-3 font-bold text-center">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {displayStats.vulnerableComponents.map((comp, i) => (
                        <tr
                          key={i}
                          className="hover:bg-muted/50 transition-colors"
                        >
                          <td className="px-4 py-3 font-medium truncate max-w-[200px]" title={comp.name}>{comp.name}</td>
                          <td className="px-4 py-3 font-mono text-[10px] md:text-xs whitespace-nowrap">
                            {comp.version}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {comp.critical > 0 ? (
                              <Badge
                                variant="destructive"
                                className="h-5 min-w-[20px] justify-center text-[10px] px-1"
                              >
                                {comp.critical}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground/30">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {comp.high > 0 ? (
                              <Badge
                                variant="secondary"
                                className="bg-orange-500 hover:bg-orange-600 text-white border-0 h-5 min-w-[20px] justify-center text-[10px] px-1"
                              >
                                {comp.high}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground/30">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {comp.medium > 0 ? (
                              <Badge
                                variant="secondary"
                                className="bg-yellow-500 hover:bg-yellow-600 text-white border-0 h-5 min-w-[20px] justify-center text-[10px] px-1"
                              >
                                {comp.medium}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground/30">—</span>
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
                            className="px-4 py-12 text-center text-muted-foreground"
                          >
                            <div className="flex flex-col items-center gap-3">
                              <ShieldCheck className="h-12 w-12 text-green-500 opacity-50" />
                              <div>
                                <p className="font-bold text-foreground">No vulnerabilities detected</p>
                                <p className="text-sm">Your components appear to be secure based on current SBOM metadata.</p>
                              </div>
                              <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/10 max-w-md">
                                <p className="text-[10px] uppercase font-black text-primary mb-1 tracking-widest text-left">Pro-tip</p>
                                <p className="text-xs text-left leading-relaxed">
                                  Try uploading multiple SBOMs from different scanners (e.g., Syft + Trivy) to see a combined security posture and discover hidden risks.
                                </p>
                              </div>
                            </div>
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

export function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="h-24">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="h-[300px]">
            <CardHeader className="pb-2"><Skeleton className="h-6 w-32" /></CardHeader>
            <CardContent><Skeleton className="h-full w-full" /></CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
