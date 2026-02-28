import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Boxes, FileCheck, ArrowRight } from "lucide-react";
import { VersionConflictCard } from "./developer/VersionConflictCard";
import { MetadataQualityCard } from "./developer/MetadataQualityCard";
import type { SbomStats } from "@/types/sbom";
import { useSbomStats } from "../../hooks/useSbomStats";
import { useView } from "../../context/ViewContext";
import { useSelection } from "../../context/SelectionContext";

import type { Bom } from "@cyclonedx/cyclonedx-library/Models";

export default function DeveloperView({ 
  sbom, 
  preComputedStats 
}: { 
  sbom: Bom; 
  preComputedStats?: SbomStats; 
}) {
  const { setActiveView } = useView();
  const { setViewFilters } = useSelection();
  const stats = useSbomStats(preComputedStats ? null : sbom);
  const displayStats = preComputedStats ?? stats;

  if (!displayStats) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const developerStats = displayStats.developerStats || {
    versionConflicts: [],
    metadataQuality: {
      score: 0,
      grade: "F",
      checks: { purl: false, hashes: false, licenses: false, supplier: false, properties: false, tools: false, dependencies: false, versions: false, types: false, timestamp: false }
    }
  };

  const { versionConflicts, metadataQuality } = developerStats;

  // Derive extra metrics for the summary
  const totalDuplicated = versionConflicts.reduce((sum, c) => sum + (c.versions.length - 1), 0);
  const topConflicts = [...versionConflicts].sort((a, b) => b.versions.length - a.versions.length).slice(0, 5);
  
  const distribution = versionConflicts.reduce((acc, c) => {
    const count = c.versions.length;
    if (count === 2) acc.two++;
    else if (count === 3) acc.three++;
    else if (count >= 4) acc.fourPlus++;
    return acc;
  }, { two: 0, three: 0, fourPlus: 0 });

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6 animate-in fade-in duration-500 pb-12">

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="md:col-span-1 border-primary/10 bg-primary/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-green-500" />
                Metadata Quality
              </CardTitle>
              <Badge 
                variant="outline" 
                className={`text-xl font-bold h-10 w-10 flex items-center justify-center rounded-full ${
                  metadataQuality.grade === 'A' ? 'border-green-500 text-green-600 bg-green-50' :
                  metadataQuality.grade === 'B' ? 'border-blue-500 text-blue-600 bg-blue-50' :
                  metadataQuality.grade === 'C' ? 'border-yellow-500 text-yellow-600 bg-yellow-50' :
                  'border-red-500 text-red-600 bg-red-50'
                }`}
              >
                {metadataQuality.grade}
              </Badge>
            </CardHeader>
            <CardContent>
              <MetadataQualityCard quality={metadataQuality} />
            </CardContent>
          </Card>

          <Card className="md:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Boxes className="h-5 w-5 text-orange-500" />
                Version Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Conflicts</span>
                    <div className={`text-2xl font-bold ${versionConflicts.length > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {versionConflicts.length}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Duplicated</span>
                    <div className={`text-2xl font-bold ${totalDuplicated > 10 ? 'text-red-600' : totalDuplicated > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {totalDuplicated}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <span>Conflict Distribution</span>
                  </div>
                  <div className="h-3 w-full bg-muted rounded-full overflow-hidden flex">
                    {versionConflicts.length > 0 ? (
                      <>
                        <div 
                          className="h-full bg-orange-400" 
                          style={{ width: `${(distribution.two / versionConflicts.length) * 100}%` }}
                          title={`${distribution.two} packages with 2 versions`}
                        />
                        <div 
                          className="h-full bg-orange-600" 
                          style={{ width: `${(distribution.three / versionConflicts.length) * 100}%` }}
                          title={`${distribution.three} packages with 3 versions`}
                        />
                        <div 
                          className="h-full bg-red-600" 
                          style={{ width: `${(distribution.fourPlus / versionConflicts.length) * 100}%` }}
                          title={`${distribution.fourPlus} packages with 4+ versions`}
                        />
                      </>
                    ) : (
                      <div className="h-full bg-green-500 w-full" />
                    )}
                  </div>
                  <div className="flex gap-4 text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-orange-400" /> 2 versions
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-orange-600" /> 3 versions
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-red-600" /> 4+ versions
                    </div>
                  </div>
                </div>

                {topConflicts.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Top Offenders</span>
                    <div className="space-y-1.5">
                      {topConflicts.map((c, i) => (
                        <button 
                          key={i} 
                          className="w-full flex items-center justify-between text-sm p-2 rounded bg-muted/30 border border-transparent hover:border-orange-500/50 hover:bg-orange-500/5 transition-all group"
                          onClick={() => {
                            setViewFilters('dependencyTree', { searchQuery: c.name });
                            setActiveView('tree');
                          }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium truncate">{c.name}</span>
                            <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-orange-500" />
                          </div>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                            {c.versions.length} versions
                          </Badge>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t text-xs">
                  <span className="text-muted-foreground">Metadata Quality Score</span>
                  <span className="font-bold">{metadataQuality.score}/100</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Boxes className="h-6 w-6 text-orange-500" />
              Version Conflict Visualizer
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              These packages have multiple versions installed. This often leads to larger bundle sizes and potential runtime bugs.
            </p>
          </CardHeader>
          <CardContent>
            <VersionConflictCard conflicts={versionConflicts} />
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
