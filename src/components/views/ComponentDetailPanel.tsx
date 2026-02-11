import { type Component } from "@cyclonedx/cyclonedx-library/Models";
import { type EnhancedComponent } from "../../types/sbom";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Network, Package, Copy, Check, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { type DependencyAnalysis } from "../../lib/bomUtils";
import { getLicenseCategory } from "../../lib/licenseUtils";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";
import { HelpTooltip } from "@/components/common/HelpTooltip";

interface ComponentDetailPanelProps {
  component: Component | EnhancedComponent;
  analysis: DependencyAnalysis | null;
  onClose: () => void;
}

export function ComponentDetailPanel({
  component: rawComponent,
  analysis,
  onClose,
}: ComponentDetailPanelProps) {
  // Cast to EnhancedComponent to access extra props safely
  const component = rawComponent as EnhancedComponent;

  const ref = component.bomRef?.value;
  const upstreamRefs =
    ref && analysis ? analysis.inverseDependencyMap.get(ref) || [] : [];
  const upstreamComponents = analysis
    ? (upstreamRefs
        .map((r) => analysis.componentMap.get(r))
        .filter(Boolean) as Component[])
    : [];
  
  const [copied, setCopied] = useState(false);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(component, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const propertiesCount = component.properties?.size || (Array.isArray(component.properties) ? component.properties.length : 0);

  // Helper to count vulns
  const getVulnCount = (vulns: any) => {
    if (!vulns) return 0;
    return (vulns.Critical?.length || 0) + (vulns.High?.length || 0) + (vulns.Medium?.length || 0) + (vulns.Low?.length || 0);
  };

  const inherentCount = getVulnCount(component.vulnerabilities?.inherent);
  const transitiveCount = getVulnCount(component.vulnerabilities?.transitive);
  const hasVulns = inherentCount > 0 || transitiveCount > 0;

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

          {/* Vulnerabilities */}
          {hasVulns && (
            <>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ShieldAlert className="h-4 w-4 text-destructive" />
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    Vulnerabilities
                    <HelpTooltip text="Known security vulnerabilities affected this component." />
                  </h4>
                </div>
                
                <div className="space-y-4">
                  {/* Inherent */}
                   {inherentCount > 0 && (
                     <div className="space-y-2">
                       {['Critical', 'High', 'Medium', 'Low'].map(severity => {
                          const vulns = component.vulnerabilities?.inherent[severity as keyof typeof component.vulnerabilities.inherent] || [];
                          if (vulns.length === 0) return null;
                          return (
                             <div key={severity} className="bg-destructive/10 rounded-md p-2">
                                 <h5 className="text-xs font-bold text-destructive mb-1">{severity} ({vulns.length})</h5>
                                 <div className="space-y-1">
                                    {vulns.map((v: any) => (
                                       <div key={v.id} className="flex items-center gap-2">
                                           <a href={`https://nvd.nist.gov/vuln/detail/${v.id}`} target="_blank" rel="noopener noreferrer" className="text-xs font-mono hover:underline text-destructive/80">
                                             {v.id}
                                           </a>
                                       </div>
                                    ))}
                                 </div>
                             </div>
                          )
                      })}
                     </div>
                   )}

                   {/* Transitive */}
                   {transitiveCount > 0 && (
                     <div>
                       <h5 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
                          <Network className="h-3 w-3" /> Transitive
                       </h5>
                       <div className="space-y-2 pl-2 border-l-2 border-muted">
                          {['Critical', 'High', 'Medium', 'Low'].map(severity => {
                              const vulns = component.vulnerabilities?.transitive[severity as keyof typeof component.vulnerabilities.transitive] || [];
                              if (vulns.length === 0) return null;
                              return (
                                <div key={severity}>
                                    <div className="flex justify-between items-center text-xs mb-1">
                                        <span className={severity === 'Critical' || severity === 'High' ? 'font-semibold text-destructive' : 'font-medium'}>
                                            {severity} ({vulns.length})
                                        </span>
                                    </div>
                                </div>
                              )
                          })}
                       </div>
                     </div>
                   )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Impact Analysis / Reverse Dependencies */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Network className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold flex items-center gap-2">
                Impact Analysis (Used By)
                <HelpTooltip text="Reverse dependency lookup. Shows which other components in this SBOM depend on this component." />
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

          {propertiesCount > 0 && (
            <>
              <Separator />
              <Collapsible
                open={isPropertiesOpen}
                onOpenChange={setIsPropertiesOpen}
                className="space-y-2"
              >
                <div className="flex items-center justify-between space-x-4 px-4">
                  <CollapsibleTrigger className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors w-full bg-transparent border-none p-0"> 
                      <ChevronRight className={`h-4 w-4 transition-transform ${isPropertiesOpen ? 'transform rotate-90' : ''}`} />
                      <h4 className="text-sm font-semibold">
                        Properties ({propertiesCount})
                      </h4>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent className="space-y-2">
                  <div className="rounded-md border p-2 text-xs font-mono bg-muted/50 overflow-auto max-h-[200px]">
                    {Array.from(component.properties || []).map((prop: any, i) => (
                      <div key={i} className="grid grid-cols-3 gap-2 py-1 border-b last:border-0 border-border/50">
                        <span className="font-semibold text-muted-foreground truncate" title={prop.name}>{prop.name}</span>
                        <span className="col-span-2 truncate select-all" title={prop.value}>{prop.value}</span>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </>
          )}

          {component.purl && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                Package URL (PURL)
                <HelpTooltip text="Standardized identifier for software packages." />
              </h4>
              <code className="bg-muted p-2 rounded text-[10px] break-all block border">
                {component.purl.toString()}
              </code>
            </div>
          )}

          {component.bomRef && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                BOM Ref
                <HelpTooltip text="Internal identifier used within the CycloneDX SBOM file." />
              </h4>
              <code className="bg-muted p-2 rounded text-[10px] break-all block border">
                {component.bomRef.value}
              </code>
            </div>
          )}

          <Separator />
          
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleCopy}
            disabled={copied}
          >
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Copied JSON
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy JSON
              </>
            )}
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}
