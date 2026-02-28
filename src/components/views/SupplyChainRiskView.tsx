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
  Target,
  Zap,
  ArrowRight,
  ShieldCheck,
  Activity,
  Layers,
  Wrench
} from "lucide-react";
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  ZAxis, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  BarChart,
  Bar,
  CartesianGrid
} from "recharts";
import { useSbom } from "../../context/SbomContext";
import { useView } from "../../context/ViewContext";
import { useSelection } from "../../context/SelectionContext";
import { useSbomStats } from "../../hooks/useSbomStats";
import { getLicenseCategory } from "../../lib/licenseUtils";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Badge } from "../../components/ui/badge";
import { cn } from "../../lib/utils";
import { CHART_TOOLTIP_STYLE, CHART_AXIS_PROPS, CHART_TOOLTIP_LABEL_STYLE, CHART_TOOLTIP_ITEM_STYLE, CHART_CURSOR } from "../../lib/chartTheme";

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
  const { formattedSbom, sbom } = useSbom();
  const { setActiveView } = useView();
  const { setViewFilters } = useSelection();
  const [searchTerm, setSearchTerm] = useState("");
  
  const stats = useSbomStats(sbom);

  const componentMap = formattedSbom?.componentMap;
  const blastRadiusMap = formattedSbom?.blastRadius;

  const riskData = useMemo(() => {
    if (!componentMap) return [];

    const data = Array.from(componentMap.values()).map(comp => {
      const ref = comp.bomRef?.value || (comp.bomRef as unknown as string) || "";
      const blastRadius = blastRadiusMap?.get(ref) || 0;
      
      // 1. Security Score (0-100)
      const v = comp.vulnerabilities?.inherent || { Critical: [], High: [], Medium: [], Low: [] };
      const rawVScore = 
        ((v.Critical?.length || 0) * 10) + 
        ((v.High?.length || 0) * 5) + 
        ((v.Medium?.length || 0) * 2) + 
        ((v.Low?.length || 0) * 0.5);
      const securityScore = Math.min(rawVScore * 10, 100);

      // 2. Compliance Risk (0-100)
      const firstLicense = Array.from(comp.licenses || [])[0] as {id?: string, name?: string} | undefined;
      const licenseId = firstLicense ? (firstLicense.id || firstLicense.name) : null;
      const licenseCat = getLicenseCategory(licenseId);
      let complianceScore = 0;
      if (licenseCat === 'copyleft') complianceScore = 100;
      else if (licenseCat === 'weak-copyleft') complianceScore = 50;
      else if (licenseCat === 'unknown') complianceScore = 25;

      // 3. Impact Score (0-100)
      // Normalized blast radius (assuming max blast radius around 50 for normalization)
      const impactScore = Math.min((blastRadius / 20) * 100, 100);

      // 4. Quality/Maintenance Risk (0-100)
      // Check if it has a version conflict
      const hasConflict = stats?.developerStats?.versionConflicts.some(c => c.affectedRefs.includes(ref));
      // Check metadata quality (simulated based on presence of purl and supplier)
      const hasPurl = !!comp.purl;
      const hasSupplier = !!(comp as any).supplier || !!comp.author;
      let qualityScore = 0;
      if (hasConflict) qualityScore += 50;
      if (!hasPurl) qualityScore += 25;
      if (!hasSupplier) qualityScore += 25;

      // Combined Risk Score (Weighted)
      // Security (40%), Impact (30%), Compliance (15%), Quality (15%)
      const totalScore = (securityScore * 0.4) + (impactScore * 0.3) + (complianceScore * 0.15) + (qualityScore * 0.15);

      return {
        id: ref,
        name: comp.name || "Unknown",
        version: comp.version || "N/A",
        securityScore,
        complianceScore,
        impactScore,
        qualityScore,
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
    }).sort((a, b) => b.totalScore - a.totalScore);

    return data.map((item, index) => ({
      ...item,
      percentile: Math.round(((data.length - index) / data.length) * 100)
    }));
  }, [componentMap, blastRadiusMap, stats]);

  const filteredRiskData = useMemo(() => {
    if (!searchTerm) return riskData;
    return riskData.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [riskData, searchTerm]);

  const topRisky = filteredRiskData.slice(0, 10);

  // Remediation Planner: Items with High Impact + High Vulns
  const remediationItems = useMemo(() => {
    return riskData
      .filter(d => d.securityScore > 0 && d.impactScore > 20)
      .slice(0, 5);
  }, [riskData]);

  // Risk Distribution Data
  const riskTiers = useMemo(() => {
    const tiers = {
      Critical: 0, // Score > 75
      High: 0,     // Score > 50
      Medium: 0,   // Score > 25
      Low: 0       // Score <= 25
    };
    riskData.forEach(d => {
      if (d.totalScore > 75) tiers.Critical++;
      else if (d.totalScore > 50) tiers.High++;
      else if (d.totalScore > 25) tiers.Medium++;
      else tiers.Low++;
    });
    return [
      { name: "Critical", count: tiers.Critical, fill: "#ef4444" },
      { name: "High", count: tiers.High, fill: "#f97316" },
      { name: "Medium", count: tiers.Medium, fill: "#eab308" },
      { name: "Low", count: tiers.Low, fill: "#3b82f6" }
    ];
  }, [riskData]);

  // Scatter data: X = Impact (Blast Radius), Y = Security Score
  const scatterData = useMemo(() => {
    return riskData
      .filter(d => d.blastRadius > 0 || d.securityScore > 0)
      .map(d => ({
        x: d.blastRadius,
        y: d.securityScore,
        z: d.totalScore,
        name: d.name,
        score: d.totalScore
      }));
  }, [riskData]);

  if (!formattedSbom || !stats) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-muted-foreground animate-pulse">Analyzing supply chain risk vectors...</p>
      </div>
    );
  }

  const avgRisk = riskData.length > 0 ? riskData.reduce((acc, d) => acc + d.totalScore, 0) / riskData.length : 0;
  
  const getRiskGrade = (score: number) => {
    if (score < 10) return { label: "A", color: "text-green-500", bg: "bg-green-500/10", border: "border-green-500/20" };
    if (score < 25) return { label: "B", color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" };
    if (score < 40) return { label: "C", color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/20" };
    if (score < 60) return { label: "D", color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20" };
    return { label: "F", color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20" };
  };

  const grade = getRiskGrade(avgRisk);

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-8 max-w-7xl mx-auto pb-20">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="px-1.5 py-0 h-5 bg-primary/5 text-primary border-primary/20">Supply Chain Risk</Badge>
              <span className="text-xs text-muted-foreground">• Analysis Engine v2.0</span>
            </div>
            <h2 className="text-4xl font-black tracking-tight flex items-center gap-3">
              Security Posture
            </h2>
            <p className="text-muted-foreground max-w-2xl">
              A composite risk analysis evaluating <span className="text-foreground font-semibold">Security Exposure</span>, 
              <span className="text-foreground font-semibold"> Dependency Blast Radius</span>, and 
              <span className="text-foreground font-semibold"> Compliance Integrity</span>.
            </p>
          </div>
          
          <div className={cn("flex items-center gap-4 p-4 rounded-2xl border-2 transition-all shadow-sm", grade.bg, grade.border)}>
             <div className="text-right">
               <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-1">Global Risk Grade</p>
               <p className="text-xs font-bold">Avg Score: {Math.round(avgRisk * 10) / 10}</p>
             </div>
             <div className={cn("text-5xl font-black leading-none", grade.color)}>
               {grade.label}
             </div>
          </div>
        </div>

        {/* Top KPIs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="relative overflow-hidden group hover:border-primary/50 transition-all">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
              <ShieldAlert className="h-12 w-12 text-primary" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">High Exposure</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black">{riskData.filter(d => d.securityScore > 50).length}</div>
              <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-destructive" /> Components with high vuln density
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group hover:border-blue-500/50 transition-all">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
              <GitGraph className="h-12 w-12 text-blue-500" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Impact Hubs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-blue-600">{riskData.filter(d => d.blastRadius > 10).length}</div>
              <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-blue-500" /> Transitive reach {">"} 10 components
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group hover:border-orange-500/50 transition-all">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
              <Scale className="h-12 w-12 text-orange-500" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Compliance Risks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-orange-600">{riskData.filter(d => d.complianceScore > 0).length}</div>
              <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                <Scale className="h-3 w-3 text-orange-500" /> Restrictive or unknown licenses
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group hover:border-indigo-500/50 transition-all">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
              <Wrench className="h-12 w-12 text-indigo-500" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Quality Debt</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-indigo-600">{riskData.filter(d => d.qualityScore > 25).length}</div>
              <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                <Activity className="h-3 w-3 text-indigo-500" /> Version conflicts or poor metadata
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-12">
          {/* Risk Matrix */}
          <Card className="lg:col-span-8 shadow-md">
            <CardHeader className="border-b bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl font-bold">
                    <Target className="h-6 w-6 text-primary" />
                    Risk Exposure Matrix
                  </CardTitle>
                  <CardDescription>
                    Comparison of Component Impact (Reach) vs. Security Severity (Vulnerabilities).
                  </CardDescription>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                   <div className="flex items-center gap-1.5 px-2 py-1 bg-destructive/10 text-destructive text-[10px] font-bold rounded border border-destructive/20">
                     <Zap className="h-3 w-3" /> PRIORITY
                   </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-8">
              <div className="h-[450px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis 
                      type="number" 
                      dataKey="x" 
                      name="Blast Radius" 
                      label={{ value: 'BLAST RADIUS (IMPACT)', position: 'insideBottom', offset: -20, className: "text-[10px] font-black fill-muted-foreground tracking-widest" }}
                      {...CHART_AXIS_PROPS}
                    />
                    <YAxis 
                      type="number" 
                      dataKey="y" 
                      name="Security Score" 
                      label={{ value: 'SECURITY RISK SCORE', angle: -90, position: 'insideLeft', offset: 0, className: "text-[10px] font-black fill-muted-foreground tracking-widest" }}
                      {...CHART_AXIS_PROPS}
                    />
                    <ZAxis type="number" dataKey="z" range={[100, 1000]} name="Total Risk" />
                    <Tooltip 
                      cursor={{ strokeDasharray: '3 3' }}
                      contentStyle={CHART_TOOLTIP_STYLE}
                      labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                      itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-background border-2 p-4 rounded-xl shadow-2xl min-w-[200px]">
                              <div className="flex items-center justify-between mb-3 pb-2 border-b">
                                <p className="font-black text-sm">{data.name}</p>
                                <Badge className={cn(data.z > 50 ? "bg-destructive" : data.z > 25 ? "bg-orange-500" : "bg-primary")}>
                                  Score: {data.z}
                                </Badge>
                              </div>
                              <div className="space-y-2 text-xs">
                                <div className="flex justify-between items-center">
                                  <span className="text-muted-foreground flex items-center gap-1"><GitGraph className="h-3 w-3" /> Impact</span>
                                  <span className="font-mono font-bold">{data.x} deps</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-muted-foreground flex items-center gap-1"><ShieldAlert className="h-3 w-3" /> Security</span>
                                  <span className="font-mono font-bold">{data.y}/100</span>
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
                          fill={entry.score > 60 ? "#ef4444" : entry.score > 30 ? "#f97316" : "#3b82f6"} 
                          fillOpacity={0.7}
                          strokeWidth={entry.score > 60 ? 2 : 1}
                          stroke={entry.score > 60 ? "#991b1b" : "#1e40af"}
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-xl border border-dashed">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Safe Zone</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight">Low impact, low risk. Maintenance as needed.</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Review Area</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight">High impact but clean, or low impact with vulns.</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Critical Risk</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight">High impact components with verified vulnerabilities.</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-800" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Immediate Fix</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight">Extreme risk. Highest remediation priority.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Risk Distribution Chart */}
          <Card className="lg:col-span-4 shadow-md">
            <CardHeader className="bg-muted/20 border-b">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                Risk Distribution
              </CardTitle>
              <CardDescription>Breakdown by risk classification tiers.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={riskTiers}>
                    <XAxis dataKey="name" {...CHART_AXIS_PROPS} />
                    <YAxis {...CHART_AXIS_PROPS} />
                    <Tooltip cursor={CHART_CURSOR} contentStyle={CHART_TOOLTIP_STYLE} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-6 space-y-4">
                <div className="p-3 bg-destructive/5 rounded-lg border border-destructive/10">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black text-destructive uppercase tracking-widest">Remediation Planner</span>
                    <Zap className="h-4 w-4 text-destructive animate-pulse" />
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-3 leading-tight">
                    Items identified as high-impact security risks that should be addressed in the current sprint.
                  </p>
                  
                  <div className="space-y-2">
                    {remediationItems.length > 0 ? remediationItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-2 bg-background rounded border group hover:border-destructive/50 transition-all cursor-pointer"
                        onClick={() => {
                          setViewFilters('explorer', { searchQuery: item.name });
                          setActiveView('explorer');
                        }}>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold truncate">{item.name}</p>
                          <p className="text-[9px] text-muted-foreground">Reach: {item.blastRadius} | Score: {item.totalScore}</p>
                        </div>
                        <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-destructive group-hover:translate-x-1 transition-all" />
                      </div>
                    )) : (
                      <div className="flex flex-col items-center py-4 text-center">
                        <ShieldCheck className="h-8 w-8 text-green-500 mb-2 opacity-20" />
                        <p className="text-[10px] font-bold">Clear Skies</p>
                        <p className="text-[9px] text-muted-foreground">No high-impact vulns detected.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Risk Leaderboard & Breakdown */}
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-12">
          {/* Detailed Leaderboard */}
          <Card className="lg:col-span-12 shadow-md overflow-hidden">
            <CardHeader className="bg-muted/20 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black">Risk Intelligence Table</CardTitle>
                <CardDescription>In-depth look at top offenders across multiple risk vectors.</CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Filter components..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 rounded-full"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-[10px] text-muted-foreground uppercase bg-muted/30 border-b font-black tracking-widest">
                    <tr>
                      <th className="px-6 py-4">Component & Version</th>
                      <th className="px-6 py-4 text-center">Security (40%)</th>
                      <th className="px-6 py-4 text-center">Impact (30%)</th>
                      <th className="px-6 py-4 text-center">Compliance (15%)</th>
                      <th className="px-6 py-4 text-center">Quality (15%)</th>
                      <th className="px-6 py-4 text-right">Total Risk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {topRisky.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-muted/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono text-muted-foreground/50 w-4">{idx + 1}.</span>
                            <div className="min-w-0">
                              <p className="font-bold text-foreground truncate max-w-[250px]">{item.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 font-mono">{item.version}</Badge>
                                <span className="text-[9px] text-muted-foreground uppercase font-black tracking-tighter">Top {100 - item.percentile}% Risk</span>
                              </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                               <Button size="icon" variant="ghost" className="h-7 w-7" title="Explore" onClick={() => { setViewFilters('explorer', { searchQuery: item.name }); setActiveView('explorer'); }}>
                                 <Search className="h-3.5 w-3.5" />
                               </Button>
                               <Button size="icon" variant="ghost" className="h-7 w-7" title="Dependency Graph" onClick={() => { setViewFilters('tree', { searchQuery: item.name }); setActiveView('tree'); }}>
                                 <GitGraph className="h-3.5 w-3.5" />
                               </Button>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-full max-w-[80px] h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-destructive" style={{ width: `${item.securityScore}%` }} />
                            </div>
                            <span className="text-[10px] font-bold text-muted-foreground">{item.securityScore}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-full max-w-[80px] h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500" style={{ width: `${item.impactScore}%` }} />
                            </div>
                            <span className="text-[10px] font-bold text-muted-foreground">{item.blastRadius} deps</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-full max-w-[80px] h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-orange-500" style={{ width: `${item.complianceScore}%` }} />
                            </div>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">{item.licenseCat}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-full max-w-[80px] h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500" style={{ width: `${item.qualityScore}%` }} />
                            </div>
                            <span className="text-[10px] font-bold text-muted-foreground">{item.qualityScore}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex flex-col items-end">
                            <span className={cn(
                              "text-lg font-black leading-none",
                              item.totalScore > 60 ? "text-destructive" : item.totalScore > 30 ? "text-orange-500" : "text-primary"
                            )}>
                              {item.totalScore}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {topRisky.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-20 text-center text-muted-foreground">
                          <Search className="h-10 w-10 mx-auto mb-4 opacity-10" />
                          <p className="font-bold">No results found</p>
                          <p className="text-xs">Adjust your search to see risky components.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Methodology Card */}
        <Card className="bg-muted/30 border-dashed relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <ShieldCheck className="h-32 w-32" />
          </div>
          <CardContent className="p-8 flex flex-col md:flex-row gap-8 items-start relative z-10">
            <div className="space-y-4 max-w-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Info className="h-5 w-5 text-primary" />
                </div>
                <h4 className="text-xl font-black">Methodology</h4>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Our risk engine calculates a weighted composite score (0-100) using four primary vectors. 
                This provides a more holistic view of supply chain integrity than vulnerability counting alone.
              </p>
              <div className="flex items-center gap-4 pt-2">
                <div className="flex flex-col">
                   <span className="text-2xl font-black">4</span>
                   <span className="text-[10px] text-muted-foreground uppercase font-bold">Vectors</span>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="flex flex-col">
                   <span className="text-2xl font-black">100</span>
                   <span className="text-[10px] text-muted-foreground uppercase font-bold">Points</span>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="flex flex-col">
                   <span className="text-2xl font-black">Realtime</span>
                   <span className="text-[10px] text-muted-foreground uppercase font-bold">Analysis</span>
                </div>
              </div>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-4 flex-1">
                <div className="bg-background p-4 rounded-xl border-2 border-primary/5 hover:border-primary/20 transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-destructive" />
                    <span className="text-xs font-black uppercase tracking-widest">Security (40%)</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Evaluates inherent vulnerabilities in the component. Critical findings carry the most weight.
                  </p>
                </div>
                <div className="bg-background p-4 rounded-xl border-2 border-primary/5 hover:border-blue-500/20 transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    <span className="text-xs font-black uppercase tracking-widest">Impact (30%)</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Calculated via transitive blast radius. Measures how deep a component is in the tree and how many nodes depend on it.
                  </p>
                </div>
                <div className="bg-background p-4 rounded-xl border-2 border-primary/5 hover:border-orange-500/20 transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                    <span className="text-xs font-black uppercase tracking-widest">Compliance (15%)</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Legal risk detection. High scores for Copyleft or Unknown licenses that may require legal review.
                  </p>
                </div>
                <div className="bg-background p-4 rounded-xl border-2 border-primary/5 hover:border-indigo-500/20 transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                    <span className="text-xs font-black uppercase tracking-widest">Quality (15%)</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Software health metrics. Penalities for version conflicts, missing purls, or unknown suppliers.
                  </p>
                </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
};
