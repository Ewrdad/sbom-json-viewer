import React, { useState, useMemo } from "react";
import { Bom } from "@cyclonedx/cyclonedx-library/Models";
import type { formattedSBOM, EnhancedComponent } from "../../types/sbom";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { Virtuoso } from "react-virtuoso";
import { Badge } from "../ui/badge";
import { GitGraph, Search, ArrowRight, Layers, ShieldAlert, ShieldCheck, Scale, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { getLicenseCategory } from "../../lib/licenseUtils";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "../ui/select";
import { ErrorBoundary } from "../common/ErrorBoundary";
import { HelpTooltip } from "../common/HelpTooltip";

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
  const [showFilters, setShowFilters] = useState(false);
  
  // Advanced Filter States
  const [onlyVulnerable, setOnlyVulnerable] = useState(false);
  const [minDirectDeps, setMinDirectDeps] = useState<number>(0);
  const [minBlastRadius, setMinBlastRadius] = useState<number>(0);
  const [licenseFilter, setLicenseFilter] = useState<string>("all");

  const dependentsGraph = formattedSbom?.dependentsGraph;
  const componentMap = formattedSbom?.componentMap;
  const blastRadius = formattedSbom?.blastRadius;

  // Helper to count vulns
  const getVulnCount = (vulns: EnhancedComponent["vulnerabilities"]["inherent"] | undefined) => {
    if (!vulns) return { critical: 0, high: 0, medium: 0, low: 0, total: 0 };
    // Re-check typo or access
    const cVal = (v: unknown) => Array.isArray(v) ? v.length : 0;
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
      const totalBlastRadius = blastRadius?.get(ref) || 0;
      const v = getVulnCount(comp.vulnerabilities?.inherent);
      
      // Calculate a simple Risk Score
      const riskScore = (v.critical * 10) + (v.high * 5) + (v.medium * 2) + (v.low * 0.5);
      
      return {
        component: comp,
        directDependentsCount: dependents.length,
        blastRadius: totalBlastRadius,
        riskScore,
        v
      };
    });

    // Apply Advanced Filters
    return components
      .filter((item) => {
        // Text Search
        const matchesName = item.component.name?.toLowerCase().includes(filter.toLowerCase());
        if (!matchesName) return false;

        // Vulnerability Filter
        if (onlyVulnerable && item.v.total === 0) return false;

        // Dependency Thresholds
        if (minDirectDeps > 0 && item.directDependentsCount < minDirectDeps) return false;
        if (minBlastRadius > 0 && item.blastRadius < minBlastRadius) return false;

        // License Filter
        if (licenseFilter !== "all") {
            const firstLicense = Array.from(item.component.licenses || [])[0] as {id?: string, name?: string} | undefined;
            const id = firstLicense ? (firstLicense.id || firstLicense.name) : null;
            const category = getLicenseCategory(id);
            if (category !== licenseFilter) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (b.riskScore !== a.riskScore) return b.riskScore - a.riskScore;
        return b.blastRadius - a.blastRadius;
      });
  }, [dependentsGraph, componentMap, blastRadius, filter, onlyVulnerable, minDirectDeps, minBlastRadius, licenseFilter]);

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
          <div className="flex items-center justify-between mt-2">
            <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs h-8 gap-1 px-2"
                onClick={() => setShowFilters(!showFilters)}
            >
                <Filter className="h-3 w-3" />
                Advanced Filters
                {showFilters ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
            </Button>
            <HelpTooltip 
                text="Filter components by vulnerability status, dependency counts, or license type." 
                className="ml-1"
                size={12}
            />
            {(onlyVulnerable || minDirectDeps > 0 || minBlastRadius > 0 || licenseFilter !== "all") && (
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-[10px] h-7 text-destructive hover:text-destructive"
                    onClick={() => {
                        setOnlyVulnerable(false);
                        setMinDirectDeps(0);
                        setMinBlastRadius(0);
                        setLicenseFilter("all");
                    }}
                >
                    Clear
                </Button>
            )}
          </div>

          {showFilters && (
            <div className="mt-3 p-3 bg-muted/30 rounded-md border space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex items-center gap-2">
                    <input 
                        type="checkbox" 
                        id="only-vulnerable" 
                        checked={onlyVulnerable}
                        onChange={(e) => setOnlyVulnerable(e.target.checked)}
                        className="rounded border-input bg-background"
                    />
                    <Label htmlFor="only-vulnerable" className="text-xs cursor-pointer">Only vulnerable</Label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <Label className="text-[10px] text-muted-foreground uppercase font-semibold">Min Direct Deps</Label>
                        <Input 
                            type="number" 
                            min="0"
                            value={minDirectDeps}
                            onChange={(e) => setMinDirectDeps(parseInt(e.target.value) || 0)}
                            className="h-8 text-xs"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[10px] text-muted-foreground uppercase font-semibold">Min Blast Radius</Label>
                        <Input 
                            type="number" 
                            min="0"
                            value={minBlastRadius}
                            onChange={(e) => setMinBlastRadius(parseInt(e.target.value) || 0)}
                            className="h-8 text-xs"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-[10px] text-muted-foreground uppercase font-semibold">License Category</Label>
                    <Select value={licenseFilter} onValueChange={(val) => val && setLicenseFilter(val)}>
                        <SelectTrigger size="sm" className="w-full h-8">
                            <SelectValue placeholder="All categories" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All categories</SelectItem>
                            <SelectItem value="permissive">Permissive</SelectItem>
                            <SelectItem value="weak-copyleft">Weak Copyleft</SelectItem>
                            <SelectItem value="copyleft">Copyleft</SelectItem>
                            <SelectItem value="unknown">Unknown</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ErrorBoundary title="Component list unavailable" resetKeys={[sortedComponents.length]}>
            {sortedComponents.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No components found
              </div>
            ) : (
              <Virtuoso
                style={{ height: "100%" }}
                data={sortedComponents}
                initialItemCount={20}
                itemContent={(index, item) => {
                  if (!item) return null;
                  const { component, directDependentsCount, blastRadius: itemBlastRadius } = item;
                  const v = getVulnCount(component.vulnerabilities?.inherent);
                  
                  return (
                    <button
                      key={component.bomRef?.value || index}
                      onClick={() => setSelectedComponentId(component.bomRef?.value || null)}
                      className={`flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors border-b group w-full ${
                        selectedComponentId === component.bomRef?.value ? "bg-muted" : ""
                      } ${
                        v.critical > 0 
                          ? "border-l-4 border-l-destructive" 
                          : v.high > 0 
                          ? "border-l-4 border-l-orange-500" 
                          : ""
                      }`}
                    >
                      <div className="overflow-hidden">
                          <div className="font-medium truncate group-hover:text-primary transition-colors" title={component.name}>
                              {component.name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                              {component.version}
                          </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                          <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                          {directDependentsCount} / {itemBlastRadius}
                          </Badge>
                          {v.total > 0 && (
                          <div className="flex gap-1">
                              {v.critical > 0 && (
                              <div className="h-2 w-2 rounded-full bg-destructive" title="Critical Vulnerabilities" />
                              )}
                              {v.high > 0 && (
                              <div className="h-2 w-2 rounded-full bg-orange-500" title="High Vulnerabilities" />
                              )}
                          </div>
                          )}
                      </div>
                    </button>
                  );
                }}
              />
            )}
          </ErrorBoundary>
        </CardContent>
      </Card>

      {/* Main Visualization Area */}
      <Card className="flex-1 flex flex-col h-full">
        <div className="px-6 pt-6">
          <p className="text-sm text-muted-foreground italic">
            Select a component from the list to analyze its upstream impact
          </p>
        </div>
        <CardContent className="flex-1 overflow-auto p-6">
            <ErrorBoundary 
                resetKeys={[selectedComponentId]} 
                title="Visualization failed to load"
            >
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
                                        const licenseId = (l as {id?: string, name?: string}).id || (l as {id?: string, name?: string}).name || "Unknown";
                                        return (
                                        <Badge key={i} variant="outline" className="text-[10px] font-mono">
                                            {licenseId}
                                        </Badge>
                                        );
                                    })}
                                </div>
                                <div className="flex items-center gap-4 mt-2">
                                    <div className="flex items-center gap-1 text-xs">
                                        <Scale className="h-3 w-3 text-muted-foreground" />
                                        <span className="capitalize">
                                            {(() => {
                                                const firstLicense = Array.from(selectedComponent.licenses || [])[0] as {id?: string, name?: string} | undefined;
                                                const id = firstLicense ? (firstLicense.id || firstLicense.name) : null;
                                                return getLicenseCategory(id);
                                            })()}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs">
                                        <GitGraph className="h-3 w-3 text-muted-foreground" />
                                        <span>Blast Radius: <strong>{blastRadius?.get(selectedComponentId || "") || 0}</strong> components</span>
                                        <HelpTooltip 
                                            text="Total number of components upstream that depend on this library (direct + transitive). If this library breaks or has a vulnerability, all these components could be affected." 
                                            size={12}
                                        />
                                    </div>
                                </div>
                                
                                <div className="mt-3 flex flex-wrap gap-2 items-center">
                                    {(() => {
                                        const v = getVulnCount(selectedComponent.vulnerabilities?.inherent);
                                        if (v.total === 0) return (
                                            <Badge variant="outline" className="text-green-600 bg-green-50 dark:bg-green-900/10 border-green-200">
                                                <ShieldCheck className="h-3 w-3 mr-1" />
                                                No known vulnerabilities
                                            </Badge>
                                        );
                                        
                                        return (
                                            <div className="flex items-center gap-2">
                                                {v.critical > 0 && (
                                                    <Badge variant="destructive" className="animate-pulse">
                                                        {v.critical} Critical Risk
                                                    </Badge>
                                                )}
                                                {v.high > 0 && (
                                                    <Badge className="bg-orange-500 hover:bg-orange-600 text-white">
                                                        {v.high} High Severity
                                                    </Badge>
                                                )}
                                                {v.medium > 0 && (
                                                    <Badge variant="secondary">
                                                        {v.medium} Medium
                                                    </Badge>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                Used By ({selectedDependents.length})
                                <HelpTooltip 
                                    text="Direct dependents Only. These are the components that explicitly import or declare formattedSbom.dependentsGraph dependency on the selected component." 
                                />
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {selectedDependents.map((dep, idx) => {
                                    const v = getVulnCount(dep.vulnerabilities?.inherent);
                                    const l = Array.from(dep.licenses || [])[0];
                                    const licenseId = l ? ((l as {id?: string, name?: string}).id || (l as {id?: string, name?: string}).name) : null;
                                    
                                    return (
                                    <div key={dep.bomRef?.value || idx} 
                                         className={`p-3 border rounded-md hover:border-primary transition-colors cursor-pointer group ${
                                             v.critical > 0 ? "border-l-4 border-l-destructive" : v.high > 0 ? "border-l-4 border-l-orange-500" : ""
                                         }`}
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
                                            </div>
                                        </div>
                                        <div className="text-[10px] text-muted-foreground pl-5 flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <span>v{dep.version}</span>
                                                {licenseId && <span className="text-[9px] opacity-70 px-1 border rounded bg-muted/50 truncate max-w-[60px]">{licenseId}</span>}
                                            </div>
                                            <div className="text-[9px] font-mono opacity-60">
                                                Impact: {blastRadius?.get(dep.bomRef?.value || "") || 0}
                                            </div>
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
            </ErrorBoundary>
        </CardContent>
      </Card>
    </div>
  );
};
