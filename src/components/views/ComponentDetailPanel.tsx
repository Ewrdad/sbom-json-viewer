import { type Component } from "@cyclonedx/cyclonedx-library/Models";
import { type EnhancedComponent } from "../../types/sbom";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronRight, GitGraph, X, Network, Package, Copy, Check, ShieldAlert, Info, Download, Search } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { type DependencyAnalysis } from "../../lib/bomUtils";
import { getLicenseCategory, checkLicenseConflict } from "../../lib/licenseUtils";
import { useState, useEffect } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { HelpTooltip } from "@/components/common/HelpTooltip";
import { SearchButton } from "@/components/common/SearchButton";
import { CopyButton } from "@/components/common/CopyButton";
import { VulnerabilityLink } from "@/components/common/VulnerabilityLink";
import { VulnerabilityRawJson } from "@/components/common/VulnerabilityRawJson";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cleanSbomMetadata, getPathToRoot } from "../../lib/sbomUtils";
import { useView } from "../../context/ViewContext";

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
  
  const { isMultiSbom, setActiveView } = useView();
  const [copied, setCopied] = useState(false);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);
  const [activeRawTab, setActiveRawTab] = useState("combined");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    setActiveRawTab("combined");
    setSearchTerm("");
  }, [component.bomRef?.value, component.name, component.version, isMultiSbom, component._rawSources?.length]);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(component, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(component, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeName = (component.name || "component").replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.download = `sbom-component-${safeName}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleJumpToGraph = () => {
    setActiveView('graph');
  };

  const allProperties = Array.from(component.properties || []);
  const filteredProperties = allProperties.filter((prop: any) => 
    !searchTerm || 
    prop.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    prop.value?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const propertiesCount = filteredProperties.length;

  useEffect(() => {
    if (searchTerm && propertiesCount > 0) {
      setIsPropertiesOpen(true);
    }
  }, [searchTerm, propertiesCount]);

  // Helper to count vulns
  const getVulnCount = (vulns: Record<string, any[]> | undefined) => {
    if (!vulns) return 0;
    return (vulns.Critical?.length || 0) + (vulns.High?.length || 0) + (vulns.Medium?.length || 0) + (vulns.Low?.length || 0);
  };

  const inherentCount = getVulnCount(component.vulnerabilities?.inherent);
  const transitiveCount = getVulnCount(component.vulnerabilities?.transitive);
  const hasVulns = inherentCount > 0 || transitiveCount > 0;

  const pathToRoot = ref && analysis ? getPathToRoot(ref, analysis.inverseDependencyMap, analysis.componentMap) : null;

  return (
    <div data-testid="component-detail-panel" className="h-full border-l bg-card flex flex-col shadow-2xl z-20">
      <div className="flex items-center justify-between p-4 border-b flex-none">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg" data-testid="detail-panel-title">Component Details</h3>
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
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-6">
          <div className="relative group/panel-search">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground transition-colors group-focus-within/panel-search:text-primary" />
            <Input
              placeholder="Search in details..."
              className="pl-8 h-9 text-xs bg-muted/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-1">
              Name
            </h4>
            <div className="text-xl font-bold break-all leading-tight">
              {component.name}
            </div>
            <div className="mt-2 flex gap-2">
              <SearchButton query={component.name} className="flex-1 justify-start" />
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 gap-2"
                onClick={handleJumpToGraph}
                title="View in Dependency Graph"
              >
                <Network className="h-4 w-4 text-emerald-500" />
                <span className="sr-only">Graph</span>
              </Button>
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

          {/* Shortest Dependency Path */}
          {pathToRoot && pathToRoot.length > 1 && (
            <div className="p-3 bg-muted/40 rounded-lg border border-primary/5">
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <GitGraph className="h-3 w-3" /> Shortest Path to Root
              </h4>
              <div className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                {pathToRoot.map((step, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <span className={cn(
                      "px-1.5 py-0.5 rounded",
                      i === pathToRoot.length - 1 ? "bg-primary/10 text-primary font-bold" : "bg-muted border border-border/50"
                    )} title={step.ref}>
                      {step.name}
                    </span>
                    {i < pathToRoot.length - 1 && (
                      <ChevronRight className="h-3 w-3 opacity-50" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {component._rawSources && component._rawSources.length > 0 && (
            <div className="bg-muted/40 p-3 rounded-lg border border-primary/5">
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <Info className="h-3 w-3" /> Data Source
              </h4>
              <div className="flex flex-col gap-1">
                <div className="text-xs font-semibold">
                  Primary: <span className="text-primary">{component._rawSources[0].name}</span>
                </div>
                {component._rawSources.length > 1 && (
                  <div className="text-[10px] text-muted-foreground leading-tight mt-1">
                    Matched in <strong>{component._rawSources.length - 1} other source(s)</strong>: {component._rawSources.slice(1).map(s => s.name).join(", ")}. 
                    <p className="mt-1 italic opacity-80">Metadata from the primary source was prioritized.</p>
                  </div>
                )}
              </div>
            </div>
          )}

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

          {!!(component.author || (component.authors && component.authors.length > 0) || (component.maintainers && component.maintainers.length > 0) || component.publisher || component.supplier) && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="text-sm font-semibold">Origin & Contacts</h4>
                
                {component.author && (
                  <div>
                    <h5 className="text-xs font-medium text-muted-foreground mb-1">Author</h5>
                    <div className="text-sm">{component.author}</div>
                  </div>
                )}

                {component.authors && component.authors.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium text-muted-foreground mb-1">Authors</h5>
                    <div className="text-sm space-y-1">
                      {component.authors.map((a, i) => (
                        <div key={i}>
                          {a.name || "Unknown"}
                          {a.email && (
                            <a href={`mailto:${a.email}`} className="text-primary hover:underline ml-1">
                              &lt;{a.email}&gt;
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {component.maintainers && component.maintainers.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium text-muted-foreground mb-1">Maintainers</h5>
                    <div className="text-sm space-y-1">
                      {component.maintainers.map((m, i) => (
                        <div key={i}>
                          {m.name || "Unknown"}
                          {m.email && (
                            <a href={`mailto:${m.email}`} className="text-primary hover:underline ml-1">
                              &lt;{m.email}&gt;
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {component.publisher && (
                  <div>
                    <h5 className="text-xs font-medium text-muted-foreground mb-1">Publisher</h5>
                    <div className="text-sm">{component.publisher}</div>
                  </div>
                )}

                {!!component.supplier && (
                  <div>
                    <h5 className="text-xs font-medium text-muted-foreground mb-1">Supplier</h5>
                    <div className="text-sm">
                      {(component.supplier as any).name?.toString() || "Unknown"}
                      {!!component.supplier.url && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {Array.from((component.supplier.url as string[]) || []).map((url: string, i: number) => (
                            <a key={i} href={url.toString()} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline break-all">
                              {url.toString()}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          <Separator />

          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              Licenses
            </h4>
            {(() => {
               const licenseArray = Array.from(component.licenses || []);
               const categories = licenseArray.map((l: any) => getLicenseCategory(l.id || l.name));
               const conflict = checkLicenseConflict(categories as any);
               
               return (
                 <div className="space-y-3">
                   <div className="flex flex-wrap gap-2">
                     {licenseArray.map((l: any, i) => {
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
                     {licenseArray.length === 0 && (
                       <span className="text-sm text-muted-foreground">
                         No license info
                       </span>
                     )}
                   </div>
                   
                   {conflict.hasConflict && (
                     <div className="p-2 bg-destructive/10 border border-destructive/20 rounded-md flex gap-2 items-start">
                       <ShieldAlert className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                       <div className="space-y-1">
                         <p className="text-[10px] font-bold text-destructive uppercase tracking-wider leading-none">License Conflict Detected</p>
                         <p className="text-[10px] text-destructive leading-tight">{conflict.reason}</p>
                       </div>
                     </div>
                   )}
                 </div>
               );
            })()}
          </div>

          <Separator />

          {/* Vulnerabilities */}
          {hasVulns && (
            <>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ShieldAlert className="h-4 w-4 text-destructive" />
                  <h4 id="vulnerabilities-section" data-testid="vulnerabilities-section" className="text-sm font-semibold flex items-center gap-2">
                    Vulnerabilities
                    <HelpTooltip text="Known security vulnerabilities affected this component." />
                  </h4>
                </div>
                
                <div className="space-y-4">
                  {/* Inherent */}
                   {inherentCount > 0 && (
                     <div className="space-y-2">
                       {['Critical', 'High', 'Medium', 'Low'].map(severity => {
                          const vulns = (component.vulnerabilities?.inherent[severity as keyof typeof component.vulnerabilities.inherent] || [])
                            .filter((v: any) => !searchTerm || v.id?.toLowerCase().includes(searchTerm.toLowerCase()));
                          if (vulns.length === 0) return null;
                          return (
                             <div key={severity} className="bg-destructive/10 rounded-md p-2">
                                 <h5 className="text-xs font-bold text-destructive mb-1">{severity} ({vulns.length})</h5>
                                 <div className="space-y-4">
                                    {vulns.map((v: any) => (
                                       <div key={v.id} className="space-y-1">
                                           <div className="flex items-center gap-2">
                                               <VulnerabilityLink
                                                 id={v.id}
                                                 className="text-xs font-mono text-destructive/80"
                                               />
                                           </div>
                                           <VulnerabilityRawJson v={v} />
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
                              const vulns = (component.vulnerabilities?.transitive[severity as keyof typeof component.vulnerabilities.transitive] || [])
                                .filter((v: any) => !searchTerm || v.id?.toLowerCase().includes(searchTerm.toLowerCase()));
                              if (vulns.length === 0) return null;
                              return (
                                <div key={severity}>
                                    <div className="flex justify-between items-center text-xs mb-1">
                                        <span className={severity === 'Critical' || severity === 'High' ? 'font-semibold text-destructive' : 'font-medium'}>
                                            {severity} ({vulns.length})
                                        </span>
                                    </div>
                                    <div className="space-y-3 mb-3">
                                      {vulns.map((v: any) => {
                                        // Handle both Map and plain object (if serialized)
                                        const sources = component._transitiveSources as any;
                                        const sourceRef = sources?.get ? sources.get(v.id) : sources?.[v.id];
                                        const sourceComp = sourceRef ? analysis?.componentMap.get(sourceRef) : null;

                                        return (
                                          <div key={v.id} className="space-y-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <VulnerabilityLink
                                                id={v.id}
                                                className="text-xs font-mono text-destructive/80"
                                              />
                                              {sourceComp && (
                                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground italic bg-muted/50 px-1.5 py-0.5 rounded border border-border/50">
                                                  <span className="opacity-70">via</span>
                                                  <span className="font-semibold text-foreground/80">{sourceComp.name}</span>
                                                </div>
                                              )}
                                            </div>
                                            <VulnerabilityRawJson v={v} />
                                          </div>
                                        );
                                      })}
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

          {allProperties.length > 0 && (
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
                    {propertiesCount > 0 ? (
                      filteredProperties.map((prop: {name?: string, value?: string}, i) => (
                        <div key={i} className="grid grid-cols-3 gap-2 py-1 border-b last:border-0 border-border/50">
                          <span className="font-semibold text-muted-foreground truncate" title={prop.name}>{prop.name}</span>
                          <span className="col-span-2 truncate select-all" title={prop.value}>{prop.value}</span>
                        </div>
                      ))
                    ) : (
                      <div className="py-2 text-center text-muted-foreground italic">No property matches</div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </>
          )}

          {component.hashes && (Array.isArray(component.hashes) ? component.hashes.length > 0 : (typeof component.hashes.size === 'number' ? component.hashes.size > 0 : false)) && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                Cryptographic Hashes
                <HelpTooltip text="Cryptographic hashes verify the integrity of the component." />
              </h4>
              <div className="space-y-2">
                {Array.from((component.hashes as unknown as {alg: string, content: string}[]) || []).map((hash: {alg?: string, content?: string}, i) => (
                  <div key={i} className="bg-muted p-2 rounded border group/hash relative">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase mb-1">{hash.alg}</div>
                    <code className="text-[10px] break-all block pr-6">{hash.content}</code>
                    <CopyButton 
                      value={hash.content || ""} 
                      tooltip="Copy Hash" 
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover/hash:opacity-100" 
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {component.purl ? (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                Package URL (PURL)
                <HelpTooltip text="Standardized identifier for software packages." />
              </h4>
              <div className="relative group/purl">
                <code className="bg-muted p-2 rounded text-[10px] break-all block border pr-8">
                  {String(component.purl)}
                </code>
                <CopyButton 
                  value={String(component.purl)} 
                  tooltip="Copy PURL" 
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover/purl:opacity-100" 
                />
              </div>
            </div>
          ) : null}

          {component.bomRef ? (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                BOM Ref
                <HelpTooltip text="Internal identifier used within the CycloneDX SBOM file." />
              </h4>
              <div className="relative group/bomref">
                <code className="bg-muted p-2 rounded text-[10px] break-all block border pr-8">
                  {String(component.bomRef.value || component.bomRef)}
                </code>
                <CopyButton 
                  value={String(component.bomRef.value || component.bomRef)} 
                  tooltip="Copy BOM Ref" 
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover/bomref:opacity-100" 
                />
              </div>
            </div>
          ) : null}

          {component._raw || (component._rawSources && component._rawSources.length > 0) ? (
            <>
              <Separator />
              <Collapsible>
                <div className="flex items-center justify-between mb-2">
                  <CollapsibleTrigger className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors bg-transparent border-none p-0 group data-[state=open]:[&>svg]:rotate-90">
                    <ChevronRight className="h-4 w-4 transition-transform" />
                    <h4 className="text-sm font-semibold flex items-center gap-1">
                      Raw JSON Data
                      <HelpTooltip text="The complete, underlying CycloneDX JSON structure for this component." />
                    </h4>
                  </CollapsibleTrigger>

                  {component._rawSources && component._rawSources.length > 1 && (
                    <Select value={activeRawTab} onValueChange={(v) => v && setActiveRawTab(v)}>
                      <SelectTrigger data-testid="source-selector" className="h-7 text-[10px] w-[140px] bg-muted/50">
                        <SelectValue placeholder="Source" />
                      </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="combined" label="Merged (Combined)" className="text-[10px] font-semibold">Merged (Combined)</SelectItem>
                                                  {component._rawSources.map((src) => (
                                                    <SelectItem key={src.name} value={src.name} label={src.name} className="text-[10px]">
                                                      {src.name}
                                                    </SelectItem>
                                                  ))}
                                                </SelectContent>                    </Select>
                  )}
                </div>

                <CollapsibleContent>
                  <Tabs value={activeRawTab} onValueChange={setActiveRawTab} className="w-full">
                     {component._rawSources?.map((src) => (
                       <TabsContent key={src.name} value={src.name} className="mt-0 focus-visible:outline-none">
                         <div className="rounded-md border p-2 text-[10px] font-mono bg-muted/50 overflow-auto max-h-[400px]">
                           <pre className="whitespace-pre-wrap break-all">
                             {JSON.stringify(src.json, null, 2)}
                           </pre>
                         </div>
                       </TabsContent>
                     ))}

                     <TabsContent value="combined" className="mt-0 focus-visible:outline-none">
                       <div className="rounded-md border p-2 text-[10px] font-mono bg-muted/50 overflow-auto max-h-[400px]">
                         <pre className="whitespace-pre-wrap break-all">
                           {JSON.stringify(cleanSbomMetadata(component), null, 2)}
                         </pre>
                       </div>
                     </TabsContent>
                  </Tabs>
                </CollapsibleContent>
              </Collapsible>
            </>
          ) : null}

          <Separator />
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1" 
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
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={handleDownload}
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
