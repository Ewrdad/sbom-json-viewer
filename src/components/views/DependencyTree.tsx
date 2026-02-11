import { useState, useEffect, useMemo, useCallback } from "react";
import { type Bom } from "@cyclonedx/cyclonedx-library/Models";
import {
  Formatter,
} from "../../renderer/Formatter/Formatter";
import { type EnhancedComponent, type formattedSBOM } from "../../types/sbom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronDown, Package, Search, X, Layers, ShieldAlert, Maximize2, Minimize2, Settings2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { HelpTooltip } from "@/components/common/HelpTooltip";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

import { getSbomSizeProfile } from "../../lib/sbomSizing";
import { Virtuoso } from "react-virtuoso";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ComponentDetailPanel } from "./ComponentDetailPanel";
import { useDependencyAnalysis } from "../../hooks/useDependencyAnalysis";
import { useDebounce } from "../../hooks/useDebounce";

interface FlatNode {
  node: EnhancedComponent;
  ref: string;
  level: number;
  path: string;
  hasChildren: boolean;
  isExpanded: boolean;
}

interface TreeItemRowProps {
  item: FlatNode;
  detailMode: "summary" | "severity" | "license";
  isSelected: boolean;
  searchQuery?: string;
  onSelect: (node: EnhancedComponent) => void;
  onToggle: (path: string) => void;
  dependencyGraph: Map<string, string[]>;
}

function TreeItemRow({ item, detailMode, isSelected, searchQuery, onSelect, onToggle, dependencyGraph }: TreeItemRowProps) {
  const { node, ref, level, hasChildren, isExpanded } = item;
  const childRefs = dependencyGraph.get(ref) || [];

  // Sum vulnerabilities
  const vuls = node.vulnerabilities;
  const inherentCount = Object.values(vuls.inherent).reduce(
    (acc, list) => acc + list.length,
    0,
  );
  const transitiveCount = Object.values(vuls.transitive).reduce(
    (acc, list) => acc + list.length,
    0,
  );
  const totalVulnerabilities = inherentCount + transitiveCount;

  const renderSeverityBadge = (
    severity: "Critical" | "High" | "Medium" | "Low",
    colorClass: string,
  ) => {
    const d = vuls.inherent[severity]?.length || 0;
    const t = vuls.transitive[severity]?.length || 0;
    if (d === 0 && t === 0) return null;

    return (
      <Badge
        variant="outline"
        className={cn(
          "h-4 px-1 text-[9px] font-mono border flex gap-1",
          colorClass,
        )}
        title={`${severity}: ${d} direct, ${t} transitive`}
      >
        <span>{d}</span>
        <span className="opacity-60">({t})</span>
      </Badge>
    );
  };
  const renderLicenseBadge = (
    category: "permissive" | "copyleft" | "weak-copyleft" | "proprietary" | "unknown",
    label: string,
    colorClass: string,
  ) => {
    const key = category === "weak-copyleft" ? "weakCopyleft" : (category as keyof typeof node.licenseDistribution);
    const d = node.licenseDistribution[key] || 0;
    const t = node.transitiveLicenseDistribution?.[key] || 0;
    
    if (d === 0 && t === 0) return null;

    return (
      <Badge
        variant="outline"
        className={cn(
          "h-4 px-1 text-[9px] font-mono border flex gap-1",
          colorClass,
        )}
        title={`${label}: ${d} direct, ${t} transitive`}
      >
        <span>{label}</span>
        <div className="flex gap-1 items-center">
          <span>{d}</span>
          <span className="opacity-60">({t})</span>
        </div>
      </Badge>
    );
  };

  return (
    <div className="select-none text-card-foreground">
      <div
        className={cn(
          "flex items-center py-1.5 px-2 hover:bg-muted/50 cursor-pointer rounded-sm group transition-colors",
          level === 0 &&
            "font-semibold border-b border-muted/50 mb-1 bg-muted/10",
          isSelected && "bg-primary/15 hover:bg-primary/20 ring-1 ring-primary/30 ring-inset"
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('.chevron-toggle')) {
            if (hasChildren) onToggle(item.path);
          } else {
            onSelect(node);
          }
        }}
      >
        <div className="w-5 flex items-center justify-center shrink-0 chevron-toggle">
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )
          ) : null}
        </div>
        <Package
          className={cn(
            "h-4 w-4 mr-2 shrink-0",
            level === 0 ? "text-primary/70" : "text-muted-foreground/50",
          )}
        />

        <span className="truncate mr-2 text-sm">
          {searchQuery ? (
            <HighlightedText text={node.name} highlight={searchQuery} />
          ) : (
            node.name
          )}
        </span>
        <span className="text-xs text-muted-foreground/60 font-mono shrink-0">
          {node.version}
        </span>

        <div className="ml-auto flex items-center gap-1.5 flex-none overflow-hidden">
          {detailMode === "severity" && (
            <div className="flex items-center gap-1">
              {renderSeverityBadge(
                "Critical",
                "border-red-500/50 text-red-500 bg-red-500/5",
              )}
              {renderSeverityBadge(
                "High",
                "border-orange-500/50 text-orange-500 bg-orange-500/5",
              )}
              {renderSeverityBadge(
                "Medium",
                "border-yellow-500/50 text-yellow-500 bg-yellow-500/5",
              )}
              {renderSeverityBadge(
                "Low",
                "border-blue-500/50 text-blue-500 bg-blue-500/5",
              )}
            </div>
          )}

          {detailMode === "license" && (
            <div className="flex items-center gap-1">
              {renderLicenseBadge(
                "copyleft",
                "Copy",
                "border-red-500/50 text-red-500 bg-red-500/5",
              )}
              {renderLicenseBadge(
                "weak-copyleft",
                "Weak",
                "border-orange-500/50 text-orange-500 bg-orange-500/5",
              )}
              {renderLicenseBadge(
                "proprietary",
                "Prop",
                "border-purple-500/50 text-purple-500 bg-purple-500/5",
              )}
              {renderLicenseBadge(
                "permissive",
                "Perm",
                "border-green-500/50 text-green-500 bg-green-500/5",
              )}
              {renderLicenseBadge(
                "unknown",
                "Unk",
                "border-gray-500/50 text-gray-500 bg-gray-500/5",
              )}
            </div>
          )}

          {detailMode === "summary" && (
            <>
              {inherentCount > 0 && (
                <Badge
                  variant="destructive"
                  className="h-4 px-1 text-[9px] font-bold border-0"
                  title="Direct vulnerabilities"
                >
                  {inherentCount}d
                </Badge>
              )}
              {transitiveCount > 0 && (
                <Badge
                  variant="secondary"
                  className="h-4 px-1 text-[9px] font-medium opacity-80"
                  title="Transitive vulnerabilities"
                >
                  {transitiveCount}t
                </Badge>
              )}
              {totalVulnerabilities === 0 && (
                <div className="h-4 w-4 flex items-center justify-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500/30" />
                </div>
              )}
            </>
          )}

          {hasChildren && (
            <span className="text-[10px] text-muted-foreground/40 px-1 font-mono">
              {childRefs.length}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}


function HighlightedText({ text, highlight }: { text: string; highlight: string }) {
  const trimmed = highlight.trim();
  if (!trimmed || trimmed.length < 2) return <span>{text}</span>;
  const regex = new RegExp(`(${trimmed})`, "gi");
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) => 
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-500/30 text-foreground rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

const flattenTree = (
  componentRefs: string[],
  componentMap: Map<string, EnhancedComponent>,
  dependencyGraph: Map<string, string[]>,
  expandedPaths: Set<string>,
  visibleRefs: Set<string> | null = null,
  level = 0,
  path = "",
  result: FlatNode[] = [],
) => {
  for (const ref of componentRefs) {
    const node = componentMap.get(ref);
    if (!node) continue;
    
    if (visibleRefs && !visibleRefs.has(ref)) continue;

    const nodePath = path ? `${path}/${ref}` : ref;
    const deps = dependencyGraph.get(ref) || [];
    const hasChildren = deps.length > 0;
    
    // In search mode, we expand if it's an ancestor of a match
    const isExpanded = visibleRefs 
      ? hasChildren // Expand all ancestors in search mode
      : expandedPaths.has(nodePath);

    result.push({
      node,
      ref,
      level,
      path: nodePath,
      hasChildren,
      isExpanded,
    });

    if (isExpanded && hasChildren) {
      flattenTree(
        deps,
        componentMap,
        dependencyGraph,
        expandedPaths,
        visibleRefs,
        level + 1,
        nodePath,
        result,
      );
    }
  }
  return result;
};

export function DependencyTree({
  sbom,
  formattedSbom: preFormattedSbom,
}: {
  sbom: Bom;
  formattedSbom?: formattedSBOM | null;
}) {
  const [formattedData, setFormattedData] = useState<formattedSBOM | null>(
    preFormattedSbom || null,
  );
  const [loading, setLoading] = useState(false);
  const [detailMode, setDetailMode] = useState<"summary" | "severity" | "license">("summary");
  const [allowLargeFormat, setAllowLargeFormat] = useState(false);
  const [progress, setProgress] = useState({
    progress: 0,
    message: "Preparing tree...",
  });
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [selectedComponent, setSelectedComponent] = useState<EnhancedComponent | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
  const { analysis } = useDependencyAnalysis(sbom);
  const { componentCount, isLarge } = getSbomSizeProfile(sbom);

  useEffect(() => {
    setAllowLargeFormat(false);
  }, [sbom]);

  useEffect(() => {
    if (preFormattedSbom && (!isLarge || allowLargeFormat)) {
      setFormattedData(preFormattedSbom);
      // Automatically expand level 0 components initially
      const topLevelPaths = new Set<string>();
      preFormattedSbom.topLevelRefs.forEach((ref) => {
        topLevelPaths.add(ref);
      });
      setExpandedPaths(topLevelPaths);
    } else {
      setFormattedData(null);
      setExpandedPaths(new Set());
    }
  }, [sbom, preFormattedSbom, isLarge, allowLargeFormat]);

  useEffect(() => {
    let mounted = true;

    if (isLarge && !allowLargeFormat) {
      setLoading(false);
      setFormattedData(null);
      return () => {
        mounted = false;
      };
    }

    const runFormatter = async () => {
      if (preFormattedSbom) return;
      setLoading(true);
      setProgress({ progress: 0, message: "Initializing formatter..." });
      try {
        const result = await Formatter({ rawSBOM: sbom, setProgress });
        if (mounted) {
          setFormattedData(result);
          const topLevelPaths = new Set<string>();
          result.topLevelRefs.forEach((ref) => {
            topLevelPaths.add(ref);
          });
          setExpandedPaths(topLevelPaths);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    runFormatter();
    return () => {
      mounted = false;
    };
  }, [sbom, allowLargeFormat, isLarge, preFormattedSbom]);

  // 1. Consolidated Search State (Ground-up Rethink)
  const searchState = useMemo(() => {
    const trimmedQuery = debouncedSearchQuery.trim().toLowerCase();
    if (!trimmedQuery || trimmedQuery.length < 2 || !formattedData) {
      return { matches: new Set<string>(), visible: null };
    }

    const matches = new Set<string>();
    const visible = new Set<string>();
    const memo = new Map<string, boolean>(); // Memoize subtree results

    const searchGraph = (refs: string[], currentPath: string[] = []) => {
      let subtreeHasMatch = false;

      for (const ref of refs) {
        // Optimization: cyclical check in current path prevents infinite recursion
        if (currentPath.includes(ref)) continue;

        // Optimization: checked memoized result
        let matchResult = memo.get(ref);
        
        // If not memoized, calculate
        if (matchResult === undefined) {
             const node = formattedData.componentMap.get(ref);
             if (!node) {
                 memo.set(ref, false);
                 continue;
             }
     
             const name = node.name?.toLowerCase() || "";
             const group = node.group?.toLowerCase() || "";
             const version = node.version?.toLowerCase() || "";
             const fullName = group ? `${group}/${name}` : name;
     
             // Name/Version matching
             const nameMatch = name.includes(trimmedQuery) || fullName.includes(trimmedQuery);
             const versionMatch = version.includes(trimmedQuery);
     
             // CVE matching
             let cveMatch = false;
             const vuls = node.vulnerabilities;
             // Type assertion for `v` to `any` to avoid TS errors when accessing `id`
             const findCveMatch = (list: { id: string }[]) => list.some(v => (v as any).id?.toLowerCase().includes(trimmedQuery));
             
             if (findCveMatch(Object.values(vuls.inherent).flat() as { id: string }[]) || 
                 findCveMatch(Object.values(vuls.transitive).flat() as { id: string }[])) {
               cveMatch = true;
             }
     
             const isMatch = nameMatch || versionMatch || cveMatch;
             if (isMatch) matches.add(ref);
             
             let childrenHaveMatch = false;
             const deps = formattedData.dependencyGraph.get(ref) || [];
             if (deps.length > 0) {
                // For children, we pass a NEW recursion.
                // IMPORTANT: We cannot pass 'currentPath' to the memoized calculation 
                // because the result of "does subtree have match" is independent of path.
                // So we call a non-path-dependent helper?
                // No, wait. 
                // The boolean "subtreeHasMatch" IS independent of path.
                // But the side effect 'visible.add' IS dependent on path.
                
                // Correction:
                // We CANNOT fully memoize the SIDE EFFECTS (adding parents to visible).
                // But we CAN memoize the boolean result "does this node or its children have a match?"
                
                // So:
                // 1. Check memo for boolean result.
                // 2. If true (or calculated true), perform side effect (add self and parents to visible).
                
                childrenHaveMatch = searchGraph(deps, [...currentPath, ref]);
             }
             
             matchResult = isMatch || childrenHaveMatch;
             memo.set(ref, matchResult);
        }

        if (matchResult) {
          visible.add(ref);
          currentPath.forEach(p => visible.add(p));
          subtreeHasMatch = true;
        }
      }

      return subtreeHasMatch;
    };

    searchGraph(formattedData.topLevelRefs);
    return { matches, visible };
  }, [formattedData, debouncedSearchQuery]);

  const { visible: visibleRefs } = searchState;

  const flatNodes = useMemo(() => {
    if (!formattedData) return [];
    return flattenTree(
      formattedData.topLevelRefs,
      formattedData.componentMap,
      formattedData.dependencyGraph,
      expandedPaths,
      visibleRefs
    );
  }, [formattedData, expandedPaths, visibleRefs]);

  const toggleNode = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const expandToLevel = useCallback((targetLevel: number) => {
    if (!formattedData) return;
    const next = new Set<string>();

    const walk = (refs: string[], currentLevel: number, currentPath: string) => {
      if (currentLevel >= targetLevel) return;
      for (const ref of refs) {
        const nodePath = currentPath ? `${currentPath}/${ref}` : ref;
        const deps = formattedData.dependencyGraph.get(ref) || [];
        
        if (deps.length > 0) {
          next.add(nodePath);
          walk(deps, currentLevel + 1, nodePath);
        }
      }
    };

    walk(formattedData.topLevelRefs, 0, "");
    setExpandedPaths(next);
  }, [formattedData]);

  const expandVulnerableOnly = useCallback(() => {
    if (!formattedData) return;
    const next = new Set<string>();

    const walk = (refs: string[], currentPath: string) => {
      let subtreeHasVuln = false;
      for (const ref of refs) {
        const node = formattedData.componentMap.get(ref);
        if (!node) continue;
        const nodePath = currentPath ? `${currentPath}/${ref}` : ref;

        // Type assertion for `v` to `any` to avoid TS errors when checking length
        const hasDirectVuln = Object.values(node.vulnerabilities.inherent).some(v => (v as any[]).length > 0);
        const hasTransitiveVuln = Object.values(node.vulnerabilities.transitive).some(v => (v as any[]).length > 0);
        
        let childrenHaveVuln = false;
        const deps = formattedData.dependencyGraph.get(ref) || [];
        if (deps.length > 0) {
          childrenHaveVuln = walk(deps, nodePath);
        }

        if (hasDirectVuln || hasTransitiveVuln || childrenHaveVuln) {
          if (deps.length > 0) {
            next.add(nodePath);
          }
          subtreeHasVuln = true;
        }
      }
      return subtreeHasVuln;
    };

    walk(formattedData.topLevelRefs, "");
    setExpandedPaths(next);
  }, [formattedData]);

  const collapseAll = () => setExpandedPaths(new Set());
  const expandAll = () => expandToLevel(999);

  if (isLarge && !allowLargeFormat) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
        <h2 className="text-xl font-semibold">Large SBOM detected</h2>
        <p className="text-sm text-muted-foreground">
          This SBOM has {componentCount.toLocaleString()} components. Building
          the dependency tree can be slow and memory-intensive.
        </p>
        <div className="flex items-center gap-2">
          <Button onClick={() => setAllowLargeFormat(true)}>
            Render tree anyway
          </Button>
        </div>
      </div>
    );
  }

  if (loading || !formattedData) {
    const width = Math.min(Math.max(progress.progress, 0), 100);
    return (
      <div className="p-8 text-center text-muted-foreground space-y-3">
        <p>{progress.message}</p>
        <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${width}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden pb-6 gap-6">
      {/* Header Section */}
      <div className="flex flex-col gap-1 px-1">
        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent flex items-center gap-2">
          Dependency Tree
          <HelpTooltip text="Hierarchical view of all components and their dependencies. Shows how components bring in other components (transitive dependencies)." />
        </h2>
        <p className="text-sm text-muted-foreground">
          Explore {componentCount.toLocaleString()} components hierarchically through depth analysis and threat detection.
        </p>
      </div>

      {/* Unified Action Bar */}
      <div className="flex items-center gap-3 p-2 rounded-xl bg-card border border-muted/50 shadow-sm flex-none">
        {/* Search Group */}
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <Input
            placeholder="Search name, group or CVE..."
            className="pl-10 h-10 bg-muted/20 border-transparent focus-visible:ring-primary/30 focus-visible:border-primary/30 transition-all rounded-lg"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-muted/50 rounded-md"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-4 w-4 text-muted-foreground/50" />
            </Button>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-muted-foreground/20 mx-1" />

        {/* Detail Level Group */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2">
            <Settings2 className="h-4 w-4 text-muted-foreground/70" />
            <span className="text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider">Mode:</span>
            <HelpTooltip text="Summary: Show vulnerability counts. Severity: Show breakdown by severity. License: Show license types." />
          </div>
          <div className="flex items-center bg-muted/40 p-1 rounded-lg border border-muted-foreground/10">
            {[
              { id: 'summary', label: 'Summary' },
              { id: 'severity', label: 'Severity' },
              { id: 'license', label: 'License' }
            ].map((mode) => (
              <Button
                key={mode.id}
                variant={detailMode === mode.id ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "h-8 text-[11px] px-3 font-medium transition-all rounded-md",
                  detailMode === mode.id ? "shadow-sm bg-background border border-muted/20" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setDetailMode(mode.id as any)}
              >
                {mode.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-muted-foreground/20 mx-1" />

        {/* Explorer Group */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2">
            <Layers className="h-4 w-4 text-muted-foreground/70" />
            <span className="text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider">Depth:</span>
            <HelpTooltip text="Control how many levels of dependencies are expanded." />
          </div>
          
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 text-[11px] px-3 hover:bg-muted/50 font-medium"
              onClick={collapseAll}
              title="Collapse all to roots"
            >
              <Minimize2 className="h-3.5 w-3.5 mr-2 opacity-60" />
              Roots
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 text-[11px] px-3 hover:bg-muted/50 font-medium"
              onClick={() => expandToLevel(1)}
            >
              L1
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 text-[11px] px-3 hover:bg-muted/50 font-medium"
              onClick={() => expandToLevel(2)}
            >
              L2
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 text-[11px] px-3 hover:bg-muted/50 font-medium border-l border-muted-foreground/10"
              onClick={expandAll}
            >
              <Maximize2 className="h-3.5 w-3.5 mr-2 opacity-60" />
              Full
            </Button>
          </div>
        </div>

        {/* Vulnerability Focus - Right Aligned */}
        <div className="ml-auto flex items-center pr-1">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-9 text-[11px] px-4 border-red-500/30 text-red-500 hover:bg-red-500/10 hover:text-red-600 transition-all font-semibold rounded-lg shadow-sm active:scale-95"
            onClick={expandVulnerableOnly}
          >
            <ShieldAlert className="h-4 w-4 mr-2 animate-pulse" />
            Reveal Threats
          </Button>
        </div>
      </div>

    <ResizablePanelGroup
        direction="horizontal"
        className="flex-1 overflow-hidden"
        key={selectedComponent ? "split" : "single"}
      >
        <ResizablePanel 
          defaultSize={selectedComponent ? 60 : 100} 
          minSize={20}
          className="flex flex-col"
        >
          <Card className="flex-1 overflow-hidden bg-card/30 border border-muted/50 flex flex-col shadow-sm relative">
            {flatNodes.length > 0 ? (
              <Virtuoso
                style={{ height: "100%" }}
                totalCount={flatNodes.length}
                data={flatNodes}
                itemContent={(index, item) => (
                  <TreeItemRow
                    key={item.path}
                    item={item}
                    detailMode={detailMode}
                    isSelected={!!selectedComponent && (selectedComponent.bomRef?.value || (selectedComponent.bomRef as any) || selectedComponent.name) === item.ref}
                    searchQuery={searchQuery}
                    onSelect={setSelectedComponent}
                    onToggle={toggleNode}
                    dependencyGraph={formattedData.dependencyGraph}
                  />
                )}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground animate-in fade-in duration-300">
                <Search className="h-10 w-10 mb-4 opacity-20" />
                <p className="text-lg font-medium">No components found</p>
                <p className="text-sm opacity-70">
                  Try a different search term or clear the filter.
                </p>
                {searchQuery && (
                  <Button 
                    variant="link" 
                    onClick={() => setSearchQuery("")}
                    className="mt-2"
                  >
                    Clear search
                  </Button>
                )}
              </div>
            )}
          </Card>
        </ResizablePanel>

        {selectedComponent && (
          <>
            <ResizableHandle
              withHandle
              className="w-2 bg-border hover:bg-primary/50 transition-colors mx-1"
            />
            <ResizablePanel defaultSize={40} minSize={20}>
              <div className="h-full pl-2">
                <ComponentDetailPanel
                  component={selectedComponent} // Ensure 'component' prop is passed correctly
                  analysis={analysis}
                  onClose={() => setSelectedComponent(null)}
                />
              </div>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}
