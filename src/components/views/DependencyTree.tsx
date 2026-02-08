import { useState, useEffect, useMemo, useCallback } from "react";
import { type Bom } from "@cyclonedx/cyclonedx-library/Models";
import {
  Formatter,
  type formattedSBOM,
  type NestedSBOMComponent,
} from "../../renderer/Formatter/Formatter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronDown, Package } from "lucide-react";
import { cn } from "../../lib/utils";
import { Badge } from "@/components/ui/badge";
import { getSbomSizeProfile } from "../../lib/sbomSizing";
import { Virtuoso } from "react-virtuoso";

interface FlatNode {
  node: NestedSBOMComponent;
  level: number;
  path: string;
  hasChildren: boolean;
  isExpanded: boolean;
}

interface TreeItemRowProps {
  item: FlatNode;
  showDetailed: boolean;
  onToggle: (path: string) => void;
}

function TreeItemRow({ item, showDetailed, onToggle }: TreeItemRowProps) {
  const { node, level, hasChildren, isExpanded } = item;
  const children = node.formattedDependencies || [];

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

  return (
    <div className="select-none text-card-foreground">
      <div
        className={cn(
          "flex items-center py-1.5 px-2 hover:bg-muted/50 cursor-pointer rounded-sm group transition-colors",
          level === 0 &&
            "font-semibold border-b border-muted/50 mb-1 bg-muted/10",
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => hasChildren && onToggle(item.path)}
      >
        <div className="w-5 flex items-center justify-center shrink-0">
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

        <span className="truncate mr-2 text-sm">{node.name}</span>
        <span className="text-xs text-muted-foreground/60 font-mono shrink-0">
          {node.version}
        </span>

        <div className="ml-auto flex items-center gap-1.5 flex-none overflow-hidden">
          {showDetailed ? (
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
          ) : (
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
              {children.length}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

const flattenTree = (
  nodes: NestedSBOMComponent[],
  expandedPaths: Set<string>,
  level = 0,
  path = "",
  result: FlatNode[] = [],
) => {
  for (const node of nodes) {
    const nodeId = node.bomRef?.value || node.name || `idx-${result.length}`;
    const nodePath = path ? `${path}/${nodeId}` : nodeId;
    const isExpanded = expandedPaths.has(nodePath);
    const hasChildren = (node.formattedDependencies?.length || 0) > 0;

    result.push({
      node,
      level,
      path: nodePath,
      hasChildren,
      isExpanded,
    });

    if (isExpanded && node.formattedDependencies) {
      flattenTree(
        node.formattedDependencies,
        expandedPaths,
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
  formattedData: preFormattedData,
}: {
  sbom: Bom;
  formattedData?: formattedSBOM | null;
}) {
  const [formattedData, setFormattedData] = useState<formattedSBOM | null>(
    preFormattedData || null,
  );
  const [loading, setLoading] = useState(false);
  const [showDetailed, setShowDetailed] = useState(false);
  const [allowLargeFormat, setAllowLargeFormat] = useState(false);
  const [progress, setProgress] = useState({
    progress: 0,
    message: "Preparing tree...",
  });
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const { componentCount, isLarge } = getSbomSizeProfile(sbom);

  useEffect(() => {
    if (preFormattedData) {
      setFormattedData(preFormattedData);
      // Automatically expand level 0 components initially
      const topLevelPaths = new Set<string>();
      preFormattedData.components.forEach((c) => {
        const id = c.bomRef?.value || c.name;
        if (id) topLevelPaths.add(id);
      });
      setExpandedPaths(topLevelPaths);
    } else {
      setAllowLargeFormat(false);
      setFormattedData(null);
      setExpandedPaths(new Set());
    }
  }, [sbom, preFormattedData]);

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
      if (preFormattedData) return;
      setLoading(true);
      setProgress({ progress: 0, message: "Initializing formatter..." });
      try {
        const result = await Formatter({ rawSBOM: sbom, setProgress });
        if (mounted) {
          setFormattedData(result);
          const topLevelPaths = new Set<string>();
          result.components.forEach((c) => {
            const id = c.bomRef?.value || c.name;
            if (id) topLevelPaths.add(id);
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
  }, [sbom, allowLargeFormat, isLarge, preFormattedData]);

  const flatNodes = useMemo(() => {
    if (!formattedData) return [];
    return flattenTree(formattedData.components, expandedPaths);
  }, [formattedData, expandedPaths]);

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
    <div className="space-y-4 h-full flex flex-col overflow-hidden pb-6">
      <div className="flex items-center justify-between flex-none">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dependency Tree</h2>
          <p className="text-sm text-muted-foreground">
            Explore {componentCount.toLocaleString()} components hierarchically
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden sm:inline-block">
            Detail Level:
          </span>
          <div className="flex items-center bg-muted p-1 rounded-md border">
            <Button
              variant={!showDetailed ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-[10px] px-2 py-0"
              onClick={() => setShowDetailed(false)}
            >
              Summary
            </Button>
            <Button
              variant={showDetailed ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-[10px] px-2 py-0"
              onClick={() => setShowDetailed(true)}
            >
              Severity
            </Button>
          </div>
        </div>
      </div>

      <Card className="flex-1 overflow-hidden bg-card/30 border border-muted/50 flex flex-col shadow-sm relative">
        <Virtuoso
          style={{ height: "100%" }}
          totalCount={flatNodes.length}
          data={flatNodes}
          itemContent={(index, item) => (
            <TreeItemRow
              key={item.path}
              item={item}
              showDetailed={showDetailed}
              onToggle={toggleNode}
            />
          )}
        />
      </Card>
    </div>
  );
}
