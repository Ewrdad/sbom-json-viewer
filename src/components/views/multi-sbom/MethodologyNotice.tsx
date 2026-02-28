import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, FileCheck, Package, ShieldAlert } from "lucide-react";

/**
 * Explains the ranking and verification methodology used for multi-SBOM analysis.
 */
export function MethodologyNotice() {
  return (
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
  );
}
