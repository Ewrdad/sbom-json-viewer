import type { SbomStats } from "@/types/sbom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HelpTooltip } from "@/components/common/HelpTooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { 
  Trophy, 
  ShieldAlert, 
  Package, 
  CheckCircle2, 
  FileCheck, 
  SearchX, 
  Search, 
  Check, 
  X,
  Layers,
  Zap,
  ShieldCheck,
  Info
} from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { 
  CHART_TOOLTIP_STYLE, 
  CHART_CURSOR, 
  CHART_AXIS_PROPS, 
  CHART_TOOLTIP_LABEL_STYLE, 
  CHART_TOOLTIP_ITEM_STYLE 
} from "@/lib/chartTheme";

export function MultiSbomStatsView({ stats }: { stats?: SbomStats }) {
  const [compareSearch, setCompareSearch] = useState("");

  if (!stats?.multiSbomStats) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center bg-muted/10 rounded-lg border border-dashed">
        <div className="flex flex-col items-center gap-2 text-muted-foreground max-w-sm">
          <p className="font-medium text-foreground text-lg">No Multi-SBOM Data Available</p>
          <p className="text-sm">You need to select and upload multiple SBOM JSON files simultaneously to view merge statistics and deduplication overlaps.</p>
        </div>
      </div>
    );
  }

  const { sources, overlap, gaps, crossSourceComponents = [] } = stats.multiSbomStats;
  const numSources = sources.length;

  // Prepare data for cross-source component table
  const filteredCrossSource = crossSourceComponents.filter(c => 
    c.name.toLowerCase().includes(compareSearch.toLowerCase()) ||
    (c.purl && c.purl.toLowerCase().includes(compareSearch.toLowerCase()))
  ).slice(0, 50);

  const bestSource = sources.find(s => s.isBest);

  return (
    <ScrollArea className="h-full">
      <div className="pb-6 space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-bold tracking-tight">Multi-SBOM Comparison</h2>
            <p className="text-sm text-muted-foreground">
              Cross-source analysis of {numSources} security discovery feeds.
            </p>
          </div>
          {bestSource && (
            <Badge variant="outline" className="h-9 px-4 gap-2 bg-primary/5 text-primary border-primary/20 font-bold">
              <Trophy className="h-4 w-4" />
              Primary Source: {bestSource.name}
            </Badge>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 text-center">
          <Card className="border-primary/20 shadow-sm overflow-hidden group">
            <div className="h-1 bg-primary/20 w-full" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                Unified Components
                <HelpTooltip text="Total unique components identified across all sources after deduplication by PURL and name/version." />
              </CardTitle>
              <Package className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overlap.components.total.toLocaleString()}</div>
              <p className="text-[10px] text-muted-foreground mt-1 flex items-center justify-center gap-1 font-bold uppercase">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                {overlap.components.shared.toLocaleString()} Shared ({Math.round((overlap.components.shared / (overlap.components.total || 1)) * 100)}%)
              </p>
            </CardContent>
          </Card>

          <Card className="border-red-500/20 shadow-sm overflow-hidden group">
            <div className="h-1 bg-red-500/20 w-full" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-600">
                Unified Findings
                <HelpTooltip text="Total unique vulnerabilities identified across all tools. Deduplicated by CVE/GHSA ID and component reference." />
              </CardTitle>
              <ShieldAlert className="h-4 w-4 text-red-600 group-hover:scale-110 transition-transform" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{overlap.vulnerabilities.total.toLocaleString()}</div>
              <p className="text-[10px] text-muted-foreground mt-1 flex items-center justify-center gap-1 font-bold uppercase">
                <Zap className="h-3 w-3 text-amber-500" />
                {overlap.vulnerabilities.shared.toLocaleString()} Overlaps ({Math.round((overlap.vulnerabilities.shared / (overlap.vulnerabilities.total || 1)) * 100)}%)
              </p>
            </CardContent>
          </Card>

          <Card className="border-indigo-500/20 shadow-sm overflow-hidden group">
            <div className="h-1 bg-indigo-500/20 w-full" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-indigo-600">
                Discovery Density
                <HelpTooltip text="A measure of how many sources found each component on average. Higher indicates better consensus." />
              </CardTitle>
              <Layers className="h-4 w-4 text-indigo-600 group-hover:scale-110 transition-transform" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-600">
                {(overlap.components.total > 0 ? (sources.reduce((sum, s) => sum + s.componentsFound, 0) / overlap.components.total).toFixed(2) : "0.00")}x
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase">
                Average Scans Per Component
              </p>
            </CardContent>
          </Card>

          <Card className="border-green-500/20 shadow-sm overflow-hidden group">
            <div className="h-1 bg-green-500/20 w-full" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-600">
                Trust Score
                <HelpTooltip text="Calculated based on the consensus between different scanning tools. Higher consensus increases confidence in the results." />
              </CardTitle>
              <ShieldCheck className="h-4 w-4 text-green-600 group-hover:scale-110 transition-transform" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {Math.round(((overlap.components.shared / (overlap.components.total || 1)) * 0.4 + (overlap.vulnerabilities.shared / (overlap.vulnerabilities.total || 1)) * 0.6) * 100)}%
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase">
                Scans Alignment Rate
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Ranking Table */}
        <Card className="shadow-md overflow-hidden border-muted-foreground/10">
          <CardHeader className="bg-muted/30 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2 font-bold">
                Source Efficacy Ranking
                <HelpTooltip text="Sources are ranked based on discovery breadth (components), depth (vulnerabilities), and metadata quality scores." />
              </CardTitle>
              <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                <span className="flex items-center gap-1"><Trophy className="h-3 w-3 text-amber-500" /> Rank</span>
                <span className="flex items-center gap-1"><FileCheck className="h-3 w-3 text-blue-500" /> Quality</span>
                <span className="flex items-center gap-1"><ShieldAlert className="h-3 w-3 text-red-500" /> Findings</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[10px] text-muted-foreground uppercase border-b bg-muted/20">
                  <tr>
                    <th className="px-4 py-3 text-center w-16">Rank</th>
                    <th className="px-4 py-3 text-left">Scanner / Source</th>
                    <th className="px-4 py-3 text-center">Components</th>
                    <th className="px-4 py-3 text-center">Vulnerabilities</th>
                    <th className="px-4 py-3 text-center">Quality Score</th>
                    <th className="px-4 py-3 text-right pr-6">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.sort((a, b) => (a.rank || 0) - (b.rank || 0)).map((s, i) => (
                    <tr key={i} className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${s.isBest ? 'bg-primary/5' : ''}`}>
                      <td className="px-4 py-4 text-center">
                         {s.rank === 1 ? (
                           <div className="flex justify-center"><Trophy className="h-5 w-5 text-amber-500" /></div>
                         ) : (
                           <span className="font-bold text-muted-foreground">#{s.rank}</span>
                         )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold">{s.name}</span>
                          <span className="text-[10px] text-muted-foreground">Uploaded SBOM provider</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 font-mono font-bold">
                          <Package className="h-3.5 w-3.5 text-muted-foreground" />
                          {s.componentsFound}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1.5 font-mono font-bold">
                            <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
                            {s.vulnerabilitiesFound}
                          </div>
                          {s.vulnerabilitiesFound > 0 && (
                            <div className="flex gap-1">
                              {s.criticalCount > 0 && <Badge variant="destructive" className="text-[8px] h-3 px-1 leading-none">{s.criticalCount}C</Badge>}
                              {s.highCount > 0 && <Badge className="text-[8px] h-3 px-1 leading-none bg-orange-500 border-0">{s.highCount}H</Badge>}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                         <div className="flex flex-col items-center gap-1">
                            <span className={`text-xs font-bold ${s.metadataScore > 70 ? 'text-green-600' : s.metadataScore > 40 ? 'text-amber-600' : 'text-red-600'}`}>
                              {s.metadataScore}/100
                            </span>
                            <Badge variant="secondary" className="text-[9px] h-4 py-0 uppercase font-black">Grade {s.metadataGrade}</Badge>
                         </div>
                      </td>
                      <td className="px-4 py-4 text-right pr-6">
                        {s.isBest ? (
                          <div className="flex items-center justify-end gap-1.5 text-primary text-xs font-bold">
                            <CheckCircle2 className="h-4 w-4" />
                            Primary
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-tight">Secondary Source</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Comparison Table */}
        {crossSourceComponents.length > 0 && (
          <Card className="shadow-md border-muted-foreground/10">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div>
                <CardTitle className="text-lg font-bold">Detailed Discovery Comparison</CardTitle>
                <p className="text-xs text-muted-foreground">Consensus analysis for individual packages across tools.</p>
              </div>
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Filter components..." 
                  className="pl-9 h-9 text-xs" 
                  value={compareSearch}
                  onChange={(e) => setCompareSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-[10px] text-muted-foreground uppercase border-b bg-muted/20">
                    <tr>
                      <th className="px-4 py-3 text-left min-w-[200px]">Component</th>
                      {sources.map(s => (
                        <th key={s.name} className="px-4 py-3 text-center border-l font-bold">{s.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCrossSource.map((c, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-bold text-sm truncate max-w-[300px]" title={c.purl || c.name}>{c.name}</div>
                          <div className="text-[10px] font-mono opacity-60 truncate max-w-[300px]">{c.version}</div>
                        </td>
                        {sources.map(s => {
                          const foundByThisSource = c.foundBy.includes(s.name);
                          const meta = c.metadataBySource[s.name];
                          return (
                            <td key={s.name} className="px-4 py-3 text-center border-l">
                              {foundByThisSource ? (
                                <div className="flex flex-col items-center gap-1">
                                  <Check className="h-5 w-5 text-green-500 stroke-[3]" />
                                  <div className="flex gap-1">
                                    <div className={`w-2 h-2 rounded-full ${meta?.hasPurl ? 'bg-blue-500' : 'bg-muted'}`} title={meta?.hasPurl ? "PURL included" : "No PURL"} />
                                    <div className={`w-2 h-2 rounded-full ${meta?.hasLicenses ? 'bg-emerald-500' : 'bg-muted'}`} title={meta?.hasLicenses ? "License included" : "No License"} />
                                    <div className={`w-2 h-2 rounded-full ${meta?.hasHashes ? 'bg-purple-500' : 'bg-muted'}`} title={meta?.hasHashes ? "Hashes included" : "No Hashes"} />
                                  </div>
                                </div>
                              ) : (
                                <X className="h-5 w-5 text-muted-foreground/20 mx-auto" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t bg-muted/20 flex justify-center gap-6 text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500" /> PURL</div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500" /> License</div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-purple-500" /> Hashes</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts & Visualizations */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Discovery Chart */}
          <Card className="lg:col-span-8 shadow-sm border-muted-foreground/10">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                Discovery Volume by Source
                <HelpTooltip text="Shows how many components and vulnerabilities each tool successfully identified." />
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[320px]">
               <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={sources}
                  margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="name" {...CHART_AXIS_PROPS} />
                  <YAxis {...CHART_AXIS_PROPS} />
                  <RechartsTooltip 
                    cursor={CHART_CURSOR}
                    contentStyle={CHART_TOOLTIP_STYLE}
                    labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                    itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                  <Bar dataKey="componentsFound" name="Components" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="vulnerabilitiesFound" name="Vulnerabilities" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Overlap Summary Card */}
          <Card className="lg:col-span-4 shadow-sm border-muted-foreground/10 flex flex-col">
            <CardHeader>
              <CardTitle className="text-base font-bold">Consensus Metrics</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-around py-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold uppercase">
                    <span className="flex items-center gap-1.5"><Package className="h-3.5 w-3.5 text-blue-500" /> Component Overlap</span>
                    <span>{Math.round((overlap.components.shared / (overlap.components.total || 1)) * 100)}%</span>
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-1000" 
                      style={{ width: `${(overlap.components.shared / (overlap.components.total || 1)) * 100}%` }} 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold uppercase">
                    <span className="flex items-center gap-1.5"><ShieldAlert className="h-3.5 w-3.5 text-red-500" /> Finding Overlap</span>
                    <span>{Math.round((overlap.vulnerabilities.shared / (overlap.vulnerabilities.total || 1)) * 100)}%</span>
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-500 transition-all duration-1000" 
                      style={{ width: `${(overlap.vulnerabilities.shared / (overlap.vulnerabilities.total || 1)) * 100}%` }} 
                    />
                  </div>
                </div>
              </div>

              <div className="bg-primary/5 p-4 rounded-lg border border-primary/10 mt-6">
                <p className="text-[10px] font-black uppercase text-primary mb-2 tracking-widest">Merger Strategy</p>
                <p className="text-xs text-muted-foreground leading-relaxed italic">
                  Results are consolidated using Package URL (PURL) as the primary key. When sources diverge on metadata, the highest ranking scanner's data is preferred.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gap Analysis Section */}
        {gaps && gaps.length > 0 && (
          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-2 border-l-4 border-amber-500 pl-4">
              <SearchX className="h-5 w-5 text-amber-500" />
              <div className="flex flex-col">
                <h3 className="text-lg font-bold tracking-tight">Scanner Blind Spots (Gap Analysis)</h3>
                <p className="text-xs text-muted-foreground italic">Unique data identified by only one scanner.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {gaps.map((gap, i) => (
                <Card key={i} className="flex flex-col h-[340px] border-amber-200/50 shadow-sm group hover:shadow-md transition-shadow">
                  <CardHeader className="py-3 bg-amber-50/50 border-b">
                    <CardTitle className="text-sm font-bold flex items-center justify-between">
                      Unique to {gap.sourceName}
                      <Badge variant="outline" className="text-[10px] bg-white font-black">{gap.uniqueComponents.length + gap.uniqueVulnerabilities.length} items</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 min-h-0 p-0 overflow-hidden">
                    <ScrollArea className="h-full">
                      <div className="p-4 space-y-4">
                        {gap.uniqueComponents.length > 0 && (
                          <div>
                            <p className="text-[9px] uppercase font-black text-muted-foreground mb-2 flex items-center gap-1 tracking-tighter">
                              <Package className="h-3 w-3" /> Unique Components ({gap.uniqueComponents.length})
                            </p>
                            <div className="space-y-1">
                              {gap.uniqueComponents.map((c: any, idx: number) => (
                                <div key={idx} className="text-[11px] p-2 rounded-md bg-muted/40 border border-muted/60 truncate hover:bg-muted transition-colors" title={c.purl || `${c.name}@${c.version}`}>
                                  <span className="font-bold">{c.name}</span>
                                  <span className="text-muted-foreground ml-1 font-mono">{c.version}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {gap.uniqueVulnerabilities.length > 0 && (
                          <div>
                            <p className="text-[9px] uppercase font-black text-muted-foreground mb-2 flex items-center gap-1 tracking-tighter">
                              <ShieldAlert className="h-3 w-3" /> Unique Vulnerabilities ({gap.uniqueVulnerabilities.length})
                            </p>
                            <div className="space-y-1">
                              {gap.uniqueVulnerabilities.map((v: any, idx: number) => (
                                <div key={idx} className="text-[11px] p-2 rounded-md bg-red-50/50 border border-red-100 flex items-center justify-between gap-2 hover:bg-red-50 transition-colors">
                                  <div className="min-w-0 flex-1 truncate">
                                    <span className="font-mono font-bold text-red-600">{v.id}</span>
                                    <span className="text-muted-foreground ml-1">in {v.componentName}</span>
                                  </div>
                                  <Badge variant="outline" className="text-[8px] h-4 px-1.5 border-amber-500 text-amber-600 font-black uppercase shrink-0 leading-none">{v.severity}</Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {gap.uniqueComponents.length === 0 && gap.uniqueVulnerabilities.length === 0 && (
                          <div className="h-32 flex flex-col items-center justify-center text-xs text-muted-foreground italic gap-2 text-center px-4">
                            <ShieldCheck className="h-8 w-8 opacity-20" />
                            <p>No unique findings. This scanner's results were fully replicated by other tools.</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Methodology Notice */}
        <Card className="bg-muted/30 border-dashed shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black flex items-center gap-2 text-muted-foreground uppercase tracking-widest">
              <Info className="h-3.5 w-3.5" />
              Ranking & Verification Methodology
            </CardTitle>
          </CardHeader>
          <CardContent className="text-[11px] space-y-4 text-muted-foreground leading-relaxed">
            <p>
              The system performs real-time reconciliation of overlapping security data streams. Each source is evaluated based on three weighted pillars:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="space-y-1">
                <p className="font-bold text-foreground flex items-center gap-1.5"><FileCheck className="h-3.5 w-3.5 text-blue-500" /> Metadata Quality (40%)</p>
                <p>Score for technical enrichment: PURLs, licenses, dependency relationship depth, and cryptographic provenance.</p>
              </div>
              <div className="space-y-1">
                <p className="font-bold text-foreground flex items-center gap-1.5"><Package className="h-3.5 w-3.5 text-indigo-500" /> Discovery Breadth (30%)</p>
                <p>Efficacy in identifying components at different layers of the stack (OS, runtime, and application).</p>
              </div>
              <div className="space-y-1">
                <p className="font-bold text-foreground flex items-center gap-1.5"><ShieldAlert className="h-3.5 w-3.5 text-red-500" /> Security Signal (30%)</p>
                <p>Proven track record in identifying unique vulnerabilities with high severity and actionable ratings.</p>
              </div>
            </div>
            <p className="pt-2 border-t italic font-medium">
               A high "Trust Score" indicates that your scanners are in agreement, while a low score suggests complementary discovery where one tool fills the gaps left by another.
            </p>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
