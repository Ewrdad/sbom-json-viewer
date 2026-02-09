import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { NestedSBOMComponent } from "../Formatter/Formatter";

interface SBOMComponentProps {
  component: NestedSBOMComponent;
  currentDepth?: number;
  maxDepth?: number;
  expandMode?: "auto" | "expand" | "collapse";
  searchQuery?: string;
  pruneNonMatches?: boolean;
  sortMode?: "name" | "vulns" | "deps";
  compactMode?: boolean;
  parentPath?: string;
  parentPathRefs?: string[];
  onFocus?: (pathRefs: string[]) => void;
}

/**
 * SBOMComponent - Renders a single SBOM component with its vulnerabilities and dependencies
 * @param component - The formatted SBOM component to render
 * @param currentDepth - Current nesting level (default: 0)
 * @param maxDepth - Maximum nesting depth to render (default: 3)
 */
export const SBOMComponent = ({
  component,
  currentDepth = 0,
  maxDepth = 3,
  expandMode = "auto",
  searchQuery = "",
  pruneNonMatches = true,
  sortMode = "vulns",
  compactMode = false,
  parentPath,
  parentPathRefs = [],
  onFocus,
}: SBOMComponentProps) => {
  const [showDeps, setShowDeps] = useState(currentDepth < 2);
  const [expandedVulns, setExpandedVulns] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const componentName = component.name || "Unnamed Component";
  const componentVersion = component.version || "";
  const componentGroup = component.group || "";
  const bomRef = typeof component.bomRef === 'string' ? component.bomRef : component.bomRef?.value || "No reference";
  const componentType = component.type || "library";
  const purl =
    typeof component.purl === "string"
      ? component.purl
      : component.purl?.toString?.();
  const displayName = componentGroup
    ? `${componentGroup}/${componentName}`
    : componentName;
  const fullPath = parentPath ? `${parentPath} › ${displayName}` : displayName;
  const currentPathRefs = useMemo(
    () => [...parentPathRefs, bomRef],
    [parentPathRefs, bomRef],
  );

  const licenses: string[] = [];
  if (component.licenses) {
    const licensesToProcess = Array.isArray(component.licenses) 
      ? component.licenses 
      : typeof (component.licenses as any)[Symbol.iterator] === 'function'
        ? Array.from(component.licenses)
        : [];
        
    for (const license of licensesToProcess) {
      if (typeof license === 'string') {
        licenses.push(license);
      } else if (license && typeof license === 'object') {
        if ("id" in license && license.id) {
          licenses.push(license.id);
        } else if ("name" in license && license.name) {
          licenses.push(license.name);
        } else if ("expression" in license && license.expression) {
          licenses.push(license.expression);
        }
      }
    }
  }

  const getVulnCount = (
    severity: keyof typeof component.vulnerabilities.inherent,
  ) => {
    const inherent = component.vulnerabilities.inherent[severity]?.length || 0;
    const transitive =
      component.vulnerabilities.transitive[severity]?.length || 0;
    return { inherent, transitive, total: inherent + transitive };
  };

  const criticalCount = getVulnCount("Critical");
  const highCount = getVulnCount("High");
  const mediumCount = getVulnCount("Medium");
  const lowCount = getVulnCount("Low");

  const hasVulnerabilities =
    criticalCount.total > 0 ||
    highCount.total > 0 ||
    mediumCount.total > 0 ||
    lowCount.total > 0;

  const totalVulnCount =
    criticalCount.total + highCount.total + mediumCount.total + lowCount.total;

  const hasDependencies =
    component.formattedDependencies &&
    component.formattedDependencies.length > 0;
  const canShowMoreDeps = currentDepth < maxDepth && hasDependencies;

  const normalize = (value: string) => value.toLowerCase();
  const matchesComponent = (node: NestedSBOMComponent) => {
    if (!searchQuery.trim()) return true;
    const haystack = [
      node.name,
      node.group,
      node.bomRef?.value,
      typeof node.purl === "string" ? node.purl : node.purl?.toString?.(),
    ]
      .filter(Boolean)
      .join(" ");
    return normalize(haystack).includes(normalize(searchQuery));
  };

  const matchesTree = (node: NestedSBOMComponent): boolean => {
    if (matchesComponent(node)) return true;
    return node.formattedDependencies?.some(matchesTree) ?? false;
  };

  const isMatch = searchQuery.trim() ? matchesComponent(component) : false;

  useEffect(() => {
    if (expandMode === "expand") {
      setShowDeps(true);
    } else if (expandMode === "collapse") {
      setShowDeps(false);
    } else {
      setShowDeps(currentDepth < 2);
    }
  }, [expandMode, currentDepth]);

  const depthBadge = useMemo(() => {
    if (currentDepth === 0) return "Root";
    if (currentDepth === 1) return "Direct";
    return `Depth ${currentDepth + 1}`;
  }, [currentDepth]);

  const sortedDependencies = useMemo(() => {
    const deps = [...(component.formattedDependencies || [])];
    if (!deps.length) return deps;
    if (sortMode === "name") {
      return deps.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }
    if (sortMode === "deps") {
      return deps.sort(
        (a, b) =>
          (b.formattedDependencies?.length || 0) -
          (a.formattedDependencies?.length || 0),
      );
    }
    const vulnScore = (node: NestedSBOMComponent) => {
      const { inherent, transitive } = node.vulnerabilities;
      return (
        inherent.Critical.length +
        inherent.High.length +
        inherent.Medium.length +
        inherent.Low.length +
        transitive.Critical.length +
        transitive.High.length +
        transitive.Medium.length +
        transitive.Low.length
      );
    };
    return deps.sort((a, b) => vulnScore(b) - vulnScore(a));
  }, [component.formattedDependencies, sortMode]);

  const visibleDependencies = pruneNonMatches
    ? sortedDependencies.filter(matchesTree)
    : sortedDependencies;

  const handleCopyRef = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(bomRef);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch {
      setCopied(false);
    }
  };

  const renderVulnBadge = (
    severity: string,
    count: { inherent: number; transitive: number; total: number },
    variant: "destructive" | "default" | "secondary" | "outline",
  ) => {
    if (count.total === 0) return null;

    const severityKey = severity.toLowerCase();
    const isExpanded = expandedVulns.has(severityKey);

    return (
      <Collapsible
        key={severity}
        open={isExpanded}
        onOpenChange={(open) => {
          const newSet = new Set(expandedVulns);
          if (open) {
            newSet.add(severityKey);
          } else {
            newSet.delete(severityKey);
          }
          setExpandedVulns(newSet);
        }}
      >
        <CollapsibleTrigger className="h-auto p-2">
          <Badge variant={variant} className="cursor-pointer">
            {severity}: {count.inherent}
            {count.transitive > 0 && ` (+${count.transitive} inherited)`}
          </Badge>
        </CollapsibleTrigger>
        <CollapsibleContent className="ml-4 mt-2 space-y-1">
          {count.inherent > 0 && (
            <div className="text-sm">
              <strong>Direct:</strong>
              <ul className="ml-4 list-disc">
                {component.vulnerabilities.inherent[
                  severity as keyof typeof component.vulnerabilities.inherent
                ]?.map((vuln, idx) => (
                  <li key={idx} className="text-xs">
                    {vuln.id || `Vuln-${idx + 1}`}
                    {vuln.description && (
                      <span className="text-muted-foreground">
                        {" "}
                        - {vuln.description.substring(0, 100)}
                        {vuln.description.length > 100 && "..."}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {count.transitive > 0 && (
            <div className="text-sm">
              <strong>Inherited:</strong>
              <span className="ml-2 text-muted-foreground">
                {count.transitive} from dependencies
              </span>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <Card
      className={`border-muted/60 shadow-sm ${compactMode ? "mb-2" : "mb-4"} ${currentDepth > 0 ? "ml-4" : ""} ${isMatch ? "ring-1 ring-primary/50 bg-primary/5" : ""}`}
    >
      <CardHeader>
        <CardTitle
          className={`flex items-start gap-2 ${compactMode ? "text-sm" : ""}`}
        >
          <span className="flex flex-col">
            <span className="flex items-center gap-2">
              {componentGroup && `${componentGroup}/`}
              {componentName}
              {componentVersion && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  v{componentVersion}
                </span>
              )}
            </span>
            <span className="text-xs text-muted-foreground">{bomRef}</span>
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Badge variant="outline">{componentType}</Badge>
            <Badge variant="secondary">{depthBadge}</Badge>
            {hasDependencies && (
              <Badge variant="outline">
                {component.formattedDependencies.length} deps
              </Badge>
            )}
            {licenses.length > 0 && (
              <Badge variant="outline">{licenses.length} licenses</Badge>
            )}
            {totalVulnCount > 0 && (
              <Badge variant="destructive">{totalVulnCount} vulns</Badge>
            )}
            {onFocus && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFocus(currentPathRefs)}
              >
                Focus
              </Button>
            )}
          </div>
        </CardTitle>
        <CardDescription className="text-xs">
          {purl ? `purl: ${purl}` : ""}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <ResizablePanelGroup
          direction="horizontal"
          className={`rounded-lg bg-muted/20 ${compactMode ? "min-h-40" : "min-h-50"}`}
        >
          <ResizablePanel defaultSize={canShowMoreDeps ? 60 : 100} minSize={30}>
            <div className={`space-y-3 p-2 ${compactMode ? "text-xs" : ""}`}>
              {hasVulnerabilities ? (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Vulnerabilities</h4>
                  <div className="flex flex-wrap gap-2">
                    {renderVulnBadge("Critical", criticalCount, "destructive")}
                    {renderVulnBadge("High", highCount, "default")}
                    {renderVulnBadge("Medium", mediumCount, "secondary")}
                    {renderVulnBadge("Low", lowCount, "outline")}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  ✓ No known vulnerabilities
                </div>
              )}

              <div>
                <h4 className="text-sm font-semibold mb-2">Details</h4>
                <ScrollArea
                  className={`${compactMode ? "h-32" : "h-40"} w-full rounded-md border p-3`}
                >
                  <div className="space-y-2 text-xs">
                    <div>
                      <strong>Name:</strong> {componentName}
                    </div>
                    {componentVersion && (
                      <div>
                        <strong>Version:</strong> {componentVersion}
                      </div>
                    )}
                    {componentGroup && (
                      <div>
                        <strong>Group:</strong> {componentGroup}
                      </div>
                    )}
                    <div>
                      <strong>Type:</strong> {componentType}
                    </div>
                    {licenses.length > 0 && (
                      <div>
                        <strong>License(s):</strong> {licenses.join(", ")}
                      </div>
                    )}
                    {hasDependencies && (
                      <div>
                        <strong>Dependencies:</strong>{" "}
                        {pruneNonMatches && searchQuery.trim()
                          ? `${visibleDependencies.length}/${component.formattedDependencies.length}`
                          : component.formattedDependencies.length}
                      </div>
                    )}
                    <div>
                      <strong>Path:</strong> {fullPath}
                    </div>
                    {purl && (
                      <div>
                        <strong>PURL:</strong> {purl}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </ResizablePanel>

          {canShowMoreDeps && showDeps && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={40} minSize={20}>
                <ScrollArea className="h-full p-2">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold sticky top-0 bg-background pb-2">
                      Dependencies (
                      {pruneNonMatches && searchQuery.trim()
                        ? `${visibleDependencies.length}/${component.formattedDependencies.length}`
                        : component.formattedDependencies.length}
                      )
                    </h4>
                    {visibleDependencies.map((dep, idx) => (
                      <SBOMComponent
                        key={dep.bomRef?.value || idx}
                        component={dep}
                        currentDepth={currentDepth + 1}
                        maxDepth={maxDepth}
                        expandMode={expandMode}
                        searchQuery={searchQuery}
                        pruneNonMatches={pruneNonMatches}
                        sortMode={sortMode}
                        compactMode={compactMode}
                        parentPath={fullPath}
                        parentPathRefs={currentPathRefs}
                        onFocus={onFocus}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </CardContent>

      <CardFooter className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {canShowMoreDeps && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeps(!showDeps)}
            >
              {showDeps ? "Hide" : "Show"} Dependencies (
              {component.formattedDependencies.length})
            </Button>
          )}
          {!canShowMoreDeps && hasDependencies && currentDepth >= maxDepth && (
            <span className="text-xs text-muted-foreground">
              {component.formattedDependencies.length} more dependencies (max
              depth reached)
            </span>
          )}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {licenses.length > 0 && (
            <div className="text-xs text-muted-foreground">
              {licenses.join(", ")}
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={handleCopyRef}>
            {copied ? "Copied" : "Copy ref"}
          </Button>
          {purl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(purl, "_blank")}
            >
              Open purl
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};
