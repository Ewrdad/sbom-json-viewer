import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, ChevronRight } from "lucide-react";
import type { VersionConflict } from "@/types/sbom";
import { useView } from "../../../context/ViewContext";
import { useSelection } from "../../../context/SelectionContext";

export function VersionConflictCard({ conflicts }: { conflicts: VersionConflict[] }) {
  const { setActiveView } = useView();
  const { setViewFilters } = useSelection();

  if (conflicts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg bg-muted/30">
        <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
        <h3 className="text-lg font-semibold text-green-600">No version conflicts detected!</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Your dependency tree is clean. Every package has exactly one version.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {conflicts.map((conflict, i) => (
        <div key={i} 
             className="group border rounded-lg overflow-hidden border-orange-500/20 bg-orange-500/[0.02] hover:bg-orange-500/[0.04] transition-colors cursor-pointer"
             onClick={() => {
               setViewFilters('dependencyTree', { searchQuery: conflict.name });
               setActiveView('tree');
             }}>
          <div className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-lg">{conflict.name}</h4>
                <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200">
                  {conflict.versions.length} versions
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {conflict.versions.map((v, j) => (
                  <code key={j} className="text-xs bg-muted px-1.5 py-0.5 rounded border">
                    {v}
                  </code>
                ))}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-orange-600 flex items-center gap-1 justify-end">
                <AlertCircle className="h-4 w-4" />
                Dedupe Suggested
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Affects {conflict.affectedRefs.length} nodes
              </p>
            </div>
          </div>
          <div className="px-4 py-2 bg-muted/30 border-t flex items-center gap-2 text-xs text-muted-foreground italic">
            <ChevronRight className="h-3 w-3" />
            Paths causing duplication can be found in the Dependency Tree view
          </div>
        </div>
      ))}
    </div>
  );
}
