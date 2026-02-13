import React, { useState, useMemo } from "react";
import { Bom } from "@cyclonedx/cyclonedx-library/Models";
import type { formattedSBOM, EnhancedComponent } from "../../types/sbom";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { ScrollArea } from "../ui/scroll-area";
import { Badge } from "../ui/badge";
import { GitGraph, Search, ArrowRight, Layers, ShieldAlert, ShieldCheck, Scale } from "lucide-react";
import { getLicenseCategory } from "../../lib/licenseUtils";

interface ReverseDependencyTreeProps {
  sbom: Bom | null;
  formattedSbom: formattedSBOM | null;
}

export const ReverseDependencyTree: React.FC<ReverseDependencyTreeProps> = ({
  sbom,
  formattedSbom,
}) => {
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const dependentsGraph = formattedSbom?.dependentsGraph;
  const componentMap = formattedSbom?.componentMap;

  // Helper to count vulns
  const getVulnCount = (vulns: EnhancedComponent["vulnerabilities"]["inherent"] | undefined) => {
    if (!vulns) return { critical: 0, high: 0, medium: 0, low: 0, total: 0 };
    // Re-check typo or access
    const cVal = (v: any) => Array.isArray(v) ? v.length : 0;
    const finalCounts = {
      critical: cVal(vulns.Critical),
      high: cVal(vulns.High),
      medium: cVal(vulns.Medium),
      low: cVal(vulns.Low),
    };
    return { ...finalCounts, total: finalCounts.critical + finalCounts.high + finalCounts.medium + finalCounts.low };
  };

  // Calculate dependent counts for all components
  const sortedComponents = useMemo(() => {
    if (!dependentsGraph || !componentMap) return [];

    const components = Array.from(componentMap.values()).map((comp) => {
      const ref = comp.bomRef?.value || (comp.bomRef as unknown as string) || "";
      const dependents = dependentsGraph.get(ref) || [];
      return {
        component: comp,
        directDependentsCount: dependents.length,
        // TODO: Calculate transitive dependents count if needed for sorting
      };
    });

    // Sort by direct dependents count desc
    return components
      .sort((a, b) => b.directDependentsCount - a.directDependentsCount)
      .filter((item) => 
        item.component.name?.toLowerCase().includes(filter.toLowerCase())
      );
  }, [dependentsGraph, componentMap, filter]);

  const selectedComponent = useMemo(() => {
    if (!selectedComponentId || !componentMap) return null;
    return componentMap.get(selectedComponentId);
  }, [selectedComponentId, componentMap]);

  const selectedDependents = useMemo(() => {
    if (!selectedComponentId || !dependentsGraph || !componentMap) return [];
    
    // Get direct dependents
    const directDependentIds = dependentsGraph.get(selectedComponentId) || [];
    return directDependentIds.map(id => componentMap.get(id)).filter(Boolean) as EnhancedComponent[];
  }, [selectedComponentId, dependentsGraph, componentMap]);

  if (!sbom || !formattedSbom) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="flex h-full gap-4 p-4">
      {/* Component List Sidebar */}
      <Card className="w-1/3 flex flex-col h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Components
          </CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search components..."
              className="pl-8"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full">
            <div className="flex flex-col">
              {sortedComponents.map(({ component, directDependentsCount }, index) => (
                <button
                  key={component.bomRef?.value || index}
                  onClick={() => setSelectedComponentId(component.bomRef?.value || null)}
                  className={`flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors border-b ${
                    selectedComponentId === component.bomRef?.value ? "bg-muted" : ""
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="font-medium truncate" title={component.name}>
                        {component.name}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                        {component.version}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {directDependentsCount} deps
                    </Badge>
                    {getVulnCount(component.vulnerabilities?.inherent).total > 0 && (
                      <div className="flex gap-1">
                        {getVulnCount(component.vulnerabilities?.inherent).critical > 0 && (
                          <div className="h-2 w-2 rounded-full bg-destructive" title="Critical Vulnerabilities" />
                        )}
                        {getVulnCount(component.vulnerabilities?.inherent).high > 0 && (
                          <div className="h-2 w-2 rounded-full bg-orange-500" title="High Vulnerabilities" />
                        )}
                      </div>
                    )}
                  </div>
                </button>
              ))}
              {sortedComponents.length === 0 && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No components found
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Main Visualization Area */}
      <Card className="flex-1 flex flex-col h-full">
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <GitGraph className="h-5 w-5" />
                Reverse Dependency Tree
            </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto p-6">
            {selectedComponent ? (
                <div className="space-y-6">
                    <div className="flex items-center gap-4 p-4 border rounded-lg bg-card/50">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                            {selectedComponent.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-xl font-bold truncate">{selectedComponent.name}</h3>
                                {Array.from(selectedComponent.licenses || []).map((l, i) => {
                                    const licenseId = (l as any).id || (l as any).name || "Unknown";
                                    return (
                                    <Badge key={i} variant="outline" className="text-[10px] font-mono">
                                        {licenseId}
                                    </Badge>
                                    );
                                })}
                            </div>
                            <p className="text-sm text-muted-foreground">Version: {selectedComponent.version}</p>
                            <div className="flex items-center gap-4 mt-2">
                                <div className="flex items-center gap-1 text-xs">
                                    <Scale className="h-3 w-3 text-muted-foreground" />
                                    <span className="capitalize">
                                        {(() => {
                                            const firstLicense = Array.from(selectedComponent.licenses || [])[0];
                                            const id = firstLicense ? ((firstLicense as any).id || (firstLicense as any).name) : null;
                                            return getLicenseCategory(id);
                                        })()}
                                    </span>
                                </div>
                                {getVulnCount(selectedComponent.vulnerabilities?.inherent).total > 0 && (
                                    <div className="flex items-center gap-2 text-xs">
                                        <ShieldAlert className="h-3 w-3 text-destructive" />
                                        <span className="text-destructive font-semibold">
                                            {getVulnCount(selectedComponent.vulnerabilities?.inherent).critical}C, 
                                            {getVulnCount(selectedComponent.vulnerabilities?.inherent).high}H
                                        </span>
                                    </div>
                                )}
                                {getVulnCount(selectedComponent.vulnerabilities?.inherent).total === 0 && (
                                    <div className="flex items-center gap-1 text-xs text-green-600">
                                        <ShieldCheck className="h-3 w-3" />
                                        <span>No known vulnerabilities</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-lg font-semibold mb-3">Used By ({selectedDependents.length})</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {selectedDependents.map((dep, idx) => {
                                const v = getVulnCount(dep.vulnerabilities?.inherent);
                                const l = Array.from(dep.licenses || [])[0];
                                const licenseId = l ? ((l as any).id || (l as any).name) : null;
                                const category = getLicenseCategory(licenseId);
                                
                                return (
                                <div key={dep.bomRef?.value || idx} className="p-3 border rounded-md hover:border-primary transition-colors cursor-pointer group" 
                                     onClick={() => setSelectedComponentId(dep.bomRef?.value || null)}>
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                                            <span className="font-medium truncate">{dep.name}</span>
                                        </div>
                                        <div className="flex gap-1 shrink-0">
                                            {v.total > 0 && (
                                                <ShieldAlert className={`h-3 w-3 ${v.critical > 0 ? "text-destructive" : "text-orange-500"}`} />
                                            )}
                                            {category !== "unknown" && (
                                                <Scale className={`h-3 w-3 ${category === "copyleft" ? "text-destructive" : "text-blue-500"}`} />
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-[10px] text-muted-foreground pl-5 flex justify-between items-center">
                                        <span>v{dep.version}</span>
                                        {licenseId && <span className="text-[9px] opacity-70 px-1 border rounded bg-muted/50 truncate max-w-[60px]">{licenseId}</span>}
                                    </div>
                                </div>
                                );
                            })}
                            {selectedDependents.length === 0 && (
                                <div className="col-span-full p-8 text-center border border-dashed rounded-lg text-muted-foreground">
                                    <p>No components depend on this component directly.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                    <div className="text-center">
                        <Layers className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>Select a component to view its reverse dependency tree</p>
                    </div>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
};
