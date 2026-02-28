import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { 
  ShieldAlert, 
  GitGraph, 
  Scale, 
  AlertTriangle, 
  Info,
  TrendingUp,
  Search,
  Target
} from "lucide-react";
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  ZAxis, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";
import { useSbom } from "../../context/SbomContext";
import { useView } from "../../context/ViewContext";
import { getLicenseCategory } from "../../lib/licenseUtils";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { ScrollArea } from "../../components/ui/scroll-area";
import { cn } from "../../lib/utils";
import { CHART_TOOLTIP_STYLE, CHART_AXIS_PROPS, CHART_TOOLTIP_LABEL_STYLE, CHART_TOOLTIP_ITEM_STYLE } from "../../lib/chartTheme";

/**
 * @function SupplyChainRiskView
 * @description Provides a high-level analysis of supply chain risks including vulnerability impact,
 * license compliance, and dependency centrality (blast radius). It calculates a composite
 * Risk Score to help prioritize component remediation.
 * 
 * @example
 * <SupplyChainRiskView />
 */
export const SupplyChainRiskView: React.FC = () => {
  const { formattedSbom } = useSbom();
  const { setActiveView } = useView();
  const [searchTerm, setSearchTerm] = useState("");

  const componentMap = formattedSbom?.componentMap;
  const blastRadiusMap = formattedSbom?.blastRadius;

  const riskData = useMemo(() => {
    if (!componentMap) return [];

    return Array.from(componentMap.values()).map(comp => {
      const ref = comp.bomRef?.value || (comp.bomRef as unknown as string) || "";
      const blastRadius = blastRadiusMap?.get(ref) || 0;
      
      // Vulnerability Score
      const v = comp.vulnerabilities?.inherent || { Critical: [], High: [], Medium: [], Low: [] };
      const vScore = 
        ((v.Critical?.length || 0) * 10) + 
        ((v.High?.length || 0) * 5) + 
        ((v.Medium?.length || 0) * 2) + 
        ((v.Low?.length || 0) * 0.5);

      // License Risk
      const firstLicense = Array.from(comp.licenses || [])[0] as {id?: string, name?: string} | undefined;
      const licenseId = firstLicense ? (firstLicense.id || firstLicense.name) : null;
      const licenseCat = getLicenseCategory(licenseId);
      let lScore = 0;
      if (licenseCat === 'copyleft') lScore = 15;
      else if (licenseCat === 'weak-copyleft') lScore = 5;
      else if (licenseCat === 'unknown') lScore = 2;

      // Centrality Score (normalized blast radius)
      // We'll use a log scale or similar since blast radius can be huge
      const cScore = Math.log1p(blastRadius) * 2;

      // Combined Risk Score
      // Higher is riskier. 
      // Formula: (VulnScore * (1 + CentralityWeight)) + LicenseScore
      const totalScore = (vScore * (1 + (blastRadius / 100))) + lScore + cScore;

      return {
        id: ref,
        name: comp.name || "Unknown",
        version: comp.version || "N/A",
        vScore,
        lScore,
        cScore,
        blastRadius,
        totalScore: Math.round(totalScore * 10) / 10,
        licenseCat,
        vulns: {
          critical: v.Critical?.length || 0,
          high: v.High?.length || 0,
          medium: v.Medium?.length || 0,
          low: v.Low?.length || 0,
          total: (v.Critical?.length || 0) + (v.High?.length || 0) + (v.Medium?.length || 0) + (v.Low?.length || 0)
        }
      };
    }).sort((a, b) => b.totalScore - a.totalScore)
      .map((item, index, self) => ({
        ...item,
        percentile: Math.round(((self.length - index) / self.length) * 100)
      }));
  }, [componentMap, blastRadiusMap]);

  const filteredRiskData = useMemo(() => {
    if (!searchTerm) return riskData;
    return riskData.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [riskData, searchTerm]);

  const topRisky = filteredRiskData.slice(0, 10);

  // Scatter data: X = Blast Radius, Y = Vulnerability Score, Z = Total Risk
  const scatterData = useMemo(() => {
    return riskData
      .filter(d => d.blastRadius > 0 || d.vScore > 0)
      .map(d => ({
        x: d.blastRadius,
        y: d.vScore,
        z: d.totalScore,
        name: d.name,
        score: d.totalScore
      }));
  }, [riskData]);

  if (!formattedSbom) {
    return <div className="p-8 text-center text-muted-foreground">Loading analysis...</div>;
  }

  const avgRisk = riskData.length > 0 ? riskData.reduce((acc, d) => acc + d.totalScore, 0) / riskData.length : 0;
  const maxRisk = riskData.length > 0 ? Math.max(...riskData.map(d => d.totalScore)) : 0;

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-bold tracking-tight">Supply Chain Risk</h2>
          <p className="text-muted-foreground">
            Analysis of component risk based on vulnerabilities, impact (blast radius), and license compliance.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg Risk Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(avgRisk * 10) / 10}</div>
              <p className="text-xs text-muted-foreground mt-1">Across all components</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Max Risk Component</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold truncate" title={topRisky[0]?.name}>{topRisky[0]?.name || "N/A"}</div>
              <p className="text-xs text-muted-foreground mt-1">Score: {topRisky[0]?.totalScore || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">High Impact Vulns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {riskData.filter(d => d.vScore > 0 && d.blastRadius > 5).length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Components with vulns & blast radius {'>'} 5</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">License Red Flags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {riskData.filter(d => d.licenseCat === 'copyleft').length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Copyleft licenses detected</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-12">
          {/* Risk Matrix */}
          <Card className="lg:col-span-7">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Risk Exposure Matrix
              </CardTitle>
              <CardDescription>
                Visualization of Impact (Blast Radius) vs. Security Risk (Vulnerability Score).
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <XAxis 
                      type="number" 
                      dataKey="x" 
                      name="Blast Radius" 
                      label={{ value: 'Blast Radius (Impact)', position: 'insideBottom', offset: -10 }}
                      {...CHART_AXIS_PROPS}
                    />
                    <YAxis 
                      type="number" 
                      dataKey="y" 
                      name="Vuln Score" 
                      label={{ value: 'Vulnerability Score', angle: -90, position: 'insideLeft' }}
                      {...CHART_AXIS_PROPS}
                    />
                    <ZAxis type="number" dataKey="z" range={[50, 400]} name="Risk Score" />
                    <Tooltip 
                      cursor={{ strokeDasharray: '3 3' }}
                      contentStyle={CHART_TOOLTIP_STYLE}
                      labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                      itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-background border p-3 rounded-lg shadow-lg">
                              <p className="font-bold text-sm mb-1">{data.name}</p>
                              <div className="space-y-1 text-xs">
                                <p className="flex justify-between gap-4 text-muted-foreground">
                                  Blast Radius: <span className="text-foreground font-mono">{data.x}</span>
                                </p>
                                <p className="flex justify-between gap-4 text-muted-foreground">
                                  Vuln Score: <span className="text-foreground font-mono">{data.y}</span>
                                </p>
                                <div className="border-t pt-1 mt-1 flex justify-between gap-4 text-primary font-bold">
                                  Total Risk: <span>{data.z}</span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Scatter name="Components" data={scatterData}>
                      {scatterData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.score > 50 ? "#ef4444" : entry.score > 20 ? "#f97316" : "#3b82f6"} 
                          fillOpacity={0.6}
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 flex items-center justify-center gap-6 text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                <div className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full bg-blue-500/60" /> Low Risk
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full bg-orange-500/60" /> Medium Risk
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full bg-red-500/60" /> High Risk (Priority)
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Risky Components */}
          <Card className="lg:col-span-5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Risk Leaderboard
                </CardTitle>
                <div className="relative w-32 md:w-48">
                  <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                  <Input 
                    placeholder="Search..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-7 h-8 text-xs"
                  />
                </div>
              </div>
              <CardDescription>
                Components requiring immediate attention.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mt-2">
                {topRisky.map((item, idx) => (
                  <div key={item.id} className="group relative">
                    <div className="flex items-start justify-between mb-1">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-muted-foreground w-4">{idx + 1}.</span>
                          <h4 className="text-sm font-bold truncate max-w-[150px]" title={item.name}>
                            {item.name}
                          </h4>
                          {item.vulns.critical > 0 && (
                            <div className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
                          )}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-5 w-5 hover:bg-primary/10 hover:text-primary" 
                              title="View in Explorer"
                              onClick={() => setActiveView('explorer')}
                            >
                              <Search className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-5 w-5 hover:bg-indigo-100 hover:text-indigo-600" 
                              title="View in Graph"
                              onClick={() => setActiveView('graph')}
                            >
                              <GitGraph className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground pl-6">
                          v{item.version} • Impact: {item.blastRadius}
                        </p>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <span className={cn(
                          "text-xs font-black leading-none",
                          item.totalScore > 50 ? "text-destructive" : item.totalScore > 20 ? "text-orange-500" : "text-primary"
                        )}>
                          {item.totalScore}
                        </span>
                        <span className="text-[8px] text-muted-foreground font-medium mt-1 uppercase tracking-tighter">
                          Top {100 - (item as any).percentile}% Risk
                        </span>
                      </div>
                    </div>
                    <div className="pl-6 flex flex-col gap-1.5">
                       <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                         <div 
                          className={cn("h-full", item.totalScore > 50 ? "bg-destructive" : item.totalScore > 20 ? "bg-orange-500" : "bg-primary")}
                          style={{ width: `${Math.min((item.totalScore / (maxRisk || 1)) * 100, 100)}%` }}
                         />
                       </div>
                      <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                        {item.vulns.total > 0 && (
                          <span className="flex items-center gap-0.5">
                            <ShieldAlert className="h-2.5 w-2.5 text-destructive" /> {item.vulns.total} vulns
                          </span>
                        )}
                        {item.licenseCat !== 'permissive' && (
                          <span className="flex items-center gap-0.5">
                            <Scale className="h-2.5 w-2.5 text-orange-500" /> {item.licenseCat}
                          </span>
                        )}
                        {item.blastRadius > 0 && (
                          <span className="flex items-center gap-0.5">
                            <GitGraph className="h-2.5 w-2.5 text-blue-500" /> {item.blastRadius} deps
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {topRisky.length === 0 && (
                   <div className="text-center py-12 text-muted-foreground italic text-sm">
                     No risky components found matching your search.
                   </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Methodology Card */}
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="p-4 flex items-start gap-4">
            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4 className="text-sm font-bold">How is the Risk Score calculated?</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The Risk Score is a composite metric designed to highlight components that pose the greatest threat. 
                It utilizes a <strong>linear impact multiplier</strong> to ensure transitive risk is properly weighted against base severity.
              </p>
              <div className="grid md:grid-cols-3 gap-4 mt-2">
                <div className="bg-background p-2 rounded border border-border/50">
                  <p className="text-[10px] font-bold uppercase mb-1 flex items-center gap-1">
                    <ShieldAlert className="h-3 w-3 text-destructive" /> Security (Base)
                  </p>
                  <p className="text-[10px] text-muted-foreground">Weighted score: Critical (10), High (5), Medium (2), Low (0.5).</p>
                </div>
                <div className="bg-background p-2 rounded border border-border/50">
                  <p className="text-[10px] font-bold uppercase mb-1 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-blue-500" /> Impact Multiplier
                  </p>
                  <p className="text-[10px] text-muted-foreground">Security risk is multiplied by <code>(1 + BlastRadius/100)</code>. This ensures vulnerabilities in high-reachability components are prioritized.</p>
                </div>
                <div className="bg-background p-2 rounded border border-border/50">
                  <p className="text-[10px] font-bold uppercase mb-1 flex items-center gap-1">
                    <Scale className="h-3 w-3 text-orange-500" /> Compliance
                  </p>
                  <p className="text-[10px] text-muted-foreground">Additional penalties for high-risk licenses like Copyleft or Unknown types.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
};
