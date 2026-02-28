import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpTooltip } from "@/components/common/HelpTooltip";
import { 
  Package, 
  ShieldAlert, 
  Layers, 
  ShieldCheck, 
  CheckCircle2, 
  Zap 
} from "lucide-react";
import type { MultiSbomStats } from "@/types/sbom";

interface KpiCardsProps {
  overlap: MultiSbomStats["overlap"];
  trustScore: number;
  discoveryDensity: number;
}

/**
 * KPI cards for unified metrics in Multi-SBOM view.
 * Displays total unique components, findings, discovery density and trust score.
 */
export function KpiCards({ overlap, trustScore, discoveryDensity }: KpiCardsProps) {
  const compSharedPercent = Math.round((overlap.components.shared / (overlap.components.total || 1)) * 100);
  const vulnSharedPercent = Math.round((overlap.vulnerabilities.shared / (overlap.vulnerabilities.total || 1)) * 100);

  return (
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
            {overlap.components.shared.toLocaleString()} Shared ({compSharedPercent}%)
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
            {overlap.vulnerabilities.shared.toLocaleString()} Overlaps ({vulnSharedPercent}%)
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
            {discoveryDensity.toFixed(2)}x
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
            {trustScore}%
          </div>
          <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase">
            Scans Alignment Rate
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
