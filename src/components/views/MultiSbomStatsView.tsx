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
  Package
} from "lucide-react";
import { 
  CHART_TOOLTIP_STYLE, 
  CHART_CURSOR, 
  CHART_AXIS_PROPS, 
  CHART_TOOLTIP_LABEL_STYLE, 
  CHART_TOOLTIP_ITEM_STYLE 
} from "@/lib/chartTheme";

// Sub-components
import { KpiCards } from "./multi-sbom/KpiCards";
import { SourceEfficacyTable } from "./multi-sbom/SourceEfficacyTable";
import { DetailedComparisonTable } from "./multi-sbom/DetailedComparisonTable";
import { GapAnalysisCards } from "./multi-sbom/GapAnalysisCards";
import { MethodologyNotice } from "./multi-sbom/MethodologyNotice";

/**
 * Main view for Multi-SBOM comparison statistics.
 * Provides a comprehensive analysis of multiple security discovery feeds (scanners) 
 * by comparing their results, identifying gaps, and calculating consensus metrics.
 */
export function MultiSbomStatsView({ stats }: { stats?: SbomStats }) {
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

  const { sources, overlap, gaps = [], crossSourceComponents = [], trustScore, discoveryDensity } = stats.multiSbomStats;
  const numSources = sources.length;
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
        <KpiCards 
          overlap={overlap} 
          trustScore={trustScore} 
          discoveryDensity={discoveryDensity} 
        />

        {/* Ranking Table */}
        <SourceEfficacyTable sources={sources} />

        {/* Detailed Comparison Table */}
        <DetailedComparisonTable 
          crossSourceComponents={crossSourceComponents} 
          sources={sources} 
        />

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
        <GapAnalysisCards gaps={gaps} />

        {/* Methodology Notice */}
        <MethodologyNotice />
      </div>
    </ScrollArea>
  );
}
