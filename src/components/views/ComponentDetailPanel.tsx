import { type Component } from "@cyclonedx/cyclonedx-library/Models";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Network, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { type DependencyAnalysis } from "../../lib/bomUtils";
import { getLicenseCategory } from "../../lib/licenseUtils";

interface ComponentDetailPanelProps {
  component: Component;
  analysis: DependencyAnalysis | null;
  onClose: () => void;
}

export function ComponentDetailPanel({
  component,
  analysis,
  onClose,
}: ComponentDetailPanelProps) {
  const ref = component.bomRef?.value;
  const upstreamRefs =
    ref && analysis ? analysis.inverseDependencyMap.get(ref) || [] : [];
  const upstreamComponents = analysis
    ? (upstreamRefs
        .map((r) => analysis.componentMap.get(r))
        .filter(Boolean) as Component[])
    : [];

  return (
    <div className="h-full border-l bg-card flex flex-col shadow-2xl z-20">
      <div className="flex items-center justify-between p-4 border-b flex-none">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">Component Details</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-1">
              Name
            </h4>
            <div className="text-xl font-bold break-all leading-tight">
              {component.name}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">
                Version
              </h4>
              <div className="font-mono text-sm">
                {component.version || (
                  <span className="text-muted-foreground italic">N/A</span>
                )}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">
                Type
              </h4>
              <Badge variant="outline" className="capitalize">
                {component.type}
              </Badge>
            </div>
          </div>

          {component.group && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">
                Group
              </h4>
              <div className="text-sm">{component.group}</div>
            </div>
          )}

          {component.description && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">
                Description
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {component.description}
              </p>
            </div>
          )}

          <Separator />

          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              Licenses
            </h4>
            <div className="flex flex-wrap gap-2">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {Array.from(component.licenses || []).map((l: any, i) => {
                const id = l.id || l.name;
                const name = id || "Unknown";
                const category = getLicenseCategory(id);
                
                let badgeVariant: "secondary" | "destructive" | "outline" | "default" = "secondary";
                let customClassName = "font-mono text-[10px]";
                
                if (category === "copyleft") {
                  badgeVariant = "destructive";
                } else if (category === "weak-copyleft") {
                  customClassName += " bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800";
                } else if (category === "permissive") {
                  customClassName += " bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
                } else if (category === "unknown") {
                  badgeVariant = "outline";
                }

                return (
                  <Badge
                    key={i}
                    variant={badgeVariant}
                    className={customClassName}
                    title={`${name} (${category})`}
                  >
                    {name}
                  </Badge>
                );
              })}
              {(!component.licenses || component.licenses.size === 0) && (
                <span className="text-sm text-muted-foreground">
                  No license info
                </span>
              )}
            </div>
          </div>

          <Separator />

          {/* Impact Analysis / Reverse Dependencies */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Network className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold">
                Impact Analysis (Used By)
              </h4>
            </div>
            {analysis ? (
              upstreamComponents.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground mb-2">
                    The following components directly depend on this package:
                  </p>
                  <div className="grid gap-2">
                    {upstreamComponents.map((parent, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 rounded-md bg-muted/30 border text-sm"
                      >
                        <span
                          className="font-medium truncate mr-2"
                          title={parent.name}
                        >
                          {parent.name}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] shrink-0"
                        >
                          {parent.version}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-md border border-dashed text-center">
                  <p className="text-xs text-muted-foreground font-medium">
                    Top-level component
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    No upstream dependencies found in this SBOM.
                  </p>
                </div>
              )
            ) : (
              <div className="p-4 rounded-md border border-dashed text-center text-sm">
                Dependency analysis is still running…
              </div>
            )}
          </div>

          {component.purl && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">
                Package URL (PURL)
              </h4>
              <code className="bg-muted p-2 rounded text-[10px] break-all block border">
                {component.purl.toString()}
              </code>
            </div>
          )}

          {component.bomRef && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">
                BOM Ref
              </h4>
              <code className="bg-muted p-2 rounded text-[10px] break-all block border">
                {component.bomRef.value}
              </code>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
