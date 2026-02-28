import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Package, 
  ShieldAlert, 
  ShieldCheck, 
  SearchX,
  Target
} from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useState, useMemo } from "react";
import type { MultiSbomStats } from "@/types/sbom";

interface GapAnalysisCardsProps {
  gaps: MultiSbomStats["gaps"];
}

/**
 * Visualizes scanner blind spots by showing unique components and vulnerabilities 
 * identified by only one scanning tool. Uses a dropdown to toggle between sources.
 */
export function GapAnalysisCards({ gaps = [] }: GapAnalysisCardsProps) {
  const [selectedSourceName, setSelectedSourceName] = useState<string>(gaps[0]?.sourceName || "");

  const activeGap = useMemo(() => {
    return gaps.find(g => g.sourceName === selectedSourceName) || gaps[0];
  }, [gaps, selectedSourceName]);

  if (gaps.length === 0) return null;

  const totalUniqueFindings = gaps.reduce((sum, g) => 
    sum + g.uniqueComponents.length + g.uniqueVulnerabilities.length, 0
  );

  return (
    <div className="space-y-4 pt-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 border-amber-500 pl-4">
        <div className="flex items-center gap-2">
          <SearchX className="h-5 w-5 text-amber-500" />
          <div className="flex flex-col">
            <h3 className="text-lg font-bold tracking-tight">Scanner Blind Spots (Gap Analysis)</h3>
            <p className="text-xs text-muted-foreground italic">
              {totalUniqueFindings} unique items identified across all scanners.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest whitespace-nowrap">
            View Unique Findings From:
          </label>
          <Select 
            value={activeGap?.sourceName} 
            onValueChange={(val) => setSelectedSourceName(val || "")}
          >
            <SelectTrigger className="w-[200px] h-9 text-xs font-bold border-amber-200 bg-amber-50/20">
              <SelectValue placeholder="Select scanner..." />
            </SelectTrigger>
            <SelectContent>
              {gaps.map((gap) => (
                <SelectItem 
                  key={gap.sourceName} 
                  value={gap.sourceName}
                  className="text-xs font-medium"
                >
                  <div className="flex items-center gap-2">
                    <Target className="h-3.5 w-3.5 opacity-50" />
                    {gap.sourceName} 
                    <span className="opacity-40 ml-auto">
                      ({gap.uniqueComponents.length + gap.uniqueVulnerabilities.length})
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {activeGap && (
        <Card className="flex flex-col border-amber-200 shadow-sm animate-in zoom-in-95 duration-200">
          <CardHeader className="py-4 bg-amber-50/30 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                <Target className="h-4 w-4 text-amber-600" />
                Unique to {activeGap.sourceName}
              </CardTitle>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-[10px] bg-white font-black border-amber-200">
                  {activeGap.uniqueComponents.length} Components
                </Badge>
                <Badge variant="outline" className="text-[10px] bg-white font-black border-amber-200">
                  {activeGap.uniqueVulnerabilities.length} Vulnerabilities
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-amber-100">
              {/* Unique Components Column */}
              <div className="flex flex-col h-[400px]">
                <div className="p-3 bg-muted/20 border-b flex items-center justify-between">
                  <p className="text-[10px] uppercase font-black text-muted-foreground flex items-center gap-1.5 tracking-tighter">
                    <Package className="h-3.5 w-3.5" /> Unique Components
                  </p>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-2">
                    {activeGap.uniqueComponents.length > 0 ? (
                      activeGap.uniqueComponents.map((c, idx) => (
                        <div key={idx} className="text-[11px] p-2.5 rounded-lg bg-card border border-muted/60 hover:border-amber-400 hover:shadow-sm transition-all group flex items-start gap-3" title={c.purl || `${c.name}@${c.version}`}>
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-foreground truncate">{c.name}</p>
                            <p className="text-muted-foreground font-mono truncate">{c.version}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="h-64 flex flex-col items-center justify-center text-xs text-muted-foreground italic gap-2 text-center">
                        <ShieldCheck className="h-8 w-8 opacity-10" />
                        <p>All components found by this scanner<br/>were also identified by others.</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Unique Vulnerabilities Column */}
              <div className="flex flex-col h-[400px]">
                <div className="p-3 bg-muted/20 border-b flex items-center justify-between">
                  <p className="text-[10px] uppercase font-black text-muted-foreground flex items-center gap-1.5 tracking-tighter">
                    <ShieldAlert className="h-3.5 w-3.5" /> Unique Vulnerabilities
                  </p>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-2">
                    {activeGap.uniqueVulnerabilities.length > 0 ? (
                      activeGap.uniqueVulnerabilities.map((v, idx) => (
                        <div key={idx} className="text-[11px] p-2.5 rounded-lg bg-red-50/30 border border-red-100 flex flex-col gap-1.5 hover:border-red-300 transition-all group shadow-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono font-black text-red-600 truncate">{v.id}</span>
                            <Badge variant="outline" className="text-[8px] h-4 px-1.5 border-amber-500 text-amber-700 font-black uppercase leading-none bg-white">
                              {v.severity}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground italic">
                            <span>Target:</span>
                            <span className="font-bold text-foreground truncate">{v.componentName}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="h-64 flex flex-col items-center justify-center text-xs text-muted-foreground italic gap-2 text-center">
                        <ShieldCheck className="h-8 w-8 opacity-10" />
                        <p>All security findings from this scanner<br/>were verified by at least one other tool.</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
