import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { ComponentErrorBoundary } from "./ComponentErrorBoundary";
import { type formattedSBOM, type EnhancedComponent } from "../types/sbom";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Bom } from "@cyclonedx/cyclonedx-library/Models";

// Why: keep large SBOM render paths out of the initial bundle.
const SBOMComponent = lazy(() =>
  import("./SBOMComponent/SBOMComponent").then((module) => ({
    default: module.SBOMComponent,
  })),
);

/**
 * MARK: Renderer
 * @description Renders a viewer for an SBOM
 * @param {{ SBOM: Bom | object }} props A CycloneDX Bom instance or raw SBOM object to render
 * @example <Suspence>
 * <Renderer SBOM={SBOM}
 * </Suspence>
 */
export const Renderer = ({ SBOM }: { SBOM: Bom }) => {
  const [loadingStatus, setLoadingStatus] = useState({
    progress: 0,
    message: "Initializing Formatter...",
  });
  const [formattedNestedSBOM, setFormattedNestedSBOM] = useState<formattedSBOM | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [query, setQuery] = useState("");
  const [showVulnerableOnly, setShowVulnerableOnly] = useState(false);
  const [maxDepth, setMaxDepth] = useState(3);
  const [expandMode, setExpandMode] = useState<"auto" | "expand" | "collapse">(
    "auto",
  );
  const [pruneNonMatches, setPruneNonMatches] = useState(true);
  const [compactMode, setCompactMode] = useState(false);
  const [sortMode, setSortMode] = useState<"name" | "vulns" | "deps">("vulns");
  const [focusedPathRefs, setFocusedPathRefs] = useState<string[] | null>(null);
  const [mermaidOpen, setMermaidOpen] = useState(false);
  const [mermaidSource, setMermaidSource] = useState("");
  const [mermaidPreviewSource, setMermaidPreviewSource] = useState("");
  const [mermaidSvg, setMermaidSvg] = useState("");
  const [mermaidError, setMermaidError] = useState<string | null>(null);
  const [mermaidPending, setMermaidPending] = useState(false);
  const [mermaidNotice, setMermaidNotice] = useState<string | null>(null);
  const [mermaidScale, setMermaidScale] = useState(1);
  const [mermaidStats, setMermaidStats] = useState<{
    nodeCount: number;
    edgeCount: number;
  } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const maxPreviewChars = 160000;

  useEffect(() => {
    let cancelled = false;

    const formatSBOM = async () => {
      // Why: reset state while we lazily load the formatter for large inputs.
      setFormattedNestedSBOM(null);
      setLoadingStatus({ progress: 0, message: "Initializing Formatter..." });

       try {
         const { Formatter } = await import("./Formatter/Formatter");
         abortControllerRef.current?.abort();
         abortControllerRef.current = new AbortController();
         const formatted = await Formatter({
           rawSBOM: SBOM,
           setProgress: (status) => {
             if (!cancelled) setLoadingStatus(status);
           },
           abortSignal: abortControllerRef.current.signal,
         });
         if (!cancelled) setFormattedNestedSBOM(formatted);
       } catch (error) {
         if (!cancelled) {
           console.error("Formatter load failed:", error);
           const aborted =
             (error instanceof Error && /aborted/i.test(error.message)) || false;
           setLoadingStatus((prev) => ({
             progress: aborted ? prev.progress : 100,
             message: aborted ? "Formatting cancelled" : "Unable to format SBOM.",
           }));
         }
       }
    };

    formatSBOM();
    
    return () => {
      cancelled = true;
      abortControllerRef.current?.abort();
    };
  }, [SBOM]);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      const isTyping =
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement;

      if (event.key === "/" && !isTyping) {
        event.preventDefault();
        searchRef.current?.focus();
      }

      if (
        event.key === "Escape" &&
        document.activeElement === searchRef.current
      ) {
        setQuery("");
        searchRef.current?.blur();
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, []);

  useEffect(() => {
    if (!mermaidOpen || !mermaidPreviewSource) return;
    let cancelled = false;

    const renderPreview = async () => {
      try {
        setMermaidPending(true);
        setMermaidError(null);
        setMermaidNotice(null);
        if (mermaidPreviewSource.length > maxPreviewChars) {
          setMermaidError(
            "Preview disabled for large diagrams. Download the .mmd file to view.",
          );
          setMermaidSvg("");
          return;
        }
        const { default: mermaid } = await import("mermaid");
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "base",
          flowchart: {
            htmlLabels: false,
          },
        });
        const { svg } = await mermaid.render(
          `sbom-${Date.now()}`,
          mermaidPreviewSource,
        );
        if (!cancelled) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(svg, "image/svg+xml");
          const svgElement = doc.querySelector("svg");
          if (svgElement) {
            const widthAttr = svgElement.getAttribute("width");
            const heightAttr = svgElement.getAttribute("height");
            const hasViewBox = svgElement.hasAttribute("viewBox");
            if (!hasViewBox && widthAttr && heightAttr) {
              const width = Number.parseFloat(widthAttr);
              const height = Number.parseFloat(heightAttr);
              if (Number.isFinite(width) && Number.isFinite(height)) {
                svgElement.setAttribute("viewBox", `0 0 ${width} ${height}`);
              }
            }
            svgElement.setAttribute("width", "100%");
            svgElement.setAttribute("height", "100%");
            svgElement.setAttribute("preserveAspectRatio", "xMinYMin meet");
            const style = svgElement.getAttribute("style") || "";
            svgElement.setAttribute(
              "style",
              `${style};width:100%;height:auto;display:block;`.replace(
                /^;+/,
                "",
              ),
            );
          }
          const serialized = new XMLSerializer().serializeToString(
            doc.documentElement,
          );
          setMermaidSvg(serialized);
        }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_error) {
        if (!cancelled) {
          setMermaidSvg("");
          setMermaidError("Unable to render Mermaid preview.");
        }
      } finally {
        if (!cancelled) setMermaidPending(false);
      }
    };

    renderPreview();

    return () => {
      cancelled = true;
    };
  }, [mermaidOpen, mermaidPreviewSource]);

  if (loadingStatus.progress < 100 || !formattedNestedSBOM) {
    return (
      <div className="flex items-center justify-center min-h-screen">
         <div className="text-center space-y-4">
           <Spinner />
           <div className="space-y-2">
             <p className="text-lg font-medium">{loadingStatus.message}</p>
             <div className="mx-auto h-2 w-64 overflow-hidden rounded bg-muted">
               <div
                 className="h-full bg-primary transition-all"
                 style={{ width: `${Math.max(0, Math.min(100, loadingStatus.progress))}%` }}
               />
             </div>
             <p className="text-sm text-muted-foreground">
               {loadingStatus.progress}%
             </p>
             <Button
               variant="outline"
               size="sm"
               onClick={() => abortControllerRef.current?.abort()}
             >
               Cancel
             </Button>
           </div>
         </div>
      </div>
    );
  }

  const normalize = (value: string) => value.toLowerCase();
  const matchesQuery = (node: EnhancedComponent) => {
    if (!query.trim()) return true;
    const haystack = [
      node.name,
      node.group,
      node.bomRef?.value,
      typeof node.purl === "string"
        ? node.purl
        : node.purl?.toString?.(),
    ]
      .filter(Boolean)
      .join(" ");

    return normalize(haystack).includes(normalize(query));
  };

  const hasAnyVuln = (component: EnhancedComponent) => {
    return component.vulnerabilities && (
      Object.values(component.vulnerabilities.inherent).some(v => v.length > 0) ||
      Object.values(component.vulnerabilities.transitive).some(v => v.length > 0)
    );
  };

  const vulnCount = (component: EnhancedComponent) => {
    const { inherent, transitive } = component.vulnerabilities;
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

  const matchesTree = (ref: string) => {
    const component = formattedNestedSBOM.componentMap.get(ref);
    if (!component) return false;
    if (matchesQuery(component)) return true;
    const deps = formattedNestedSBOM.dependencyGraph.get(ref) || [];
    return deps.some(matchesTree);
  };

  const rootComponents = formattedNestedSBOM.topLevelRefs
    .map(ref => formattedNestedSBOM.componentMap.get(ref))
    .filter(Boolean) as EnhancedComponent[];

  const filteredComponents = rootComponents.filter(
    (component) => {
      if (showVulnerableOnly && !hasAnyVuln(component)) return false;
      const ref = typeof component.bomRef === 'string' ? component.bomRef : component.bomRef?.value || "";
      return matchesTree(ref);
    },
  );

  const sortedComponents = [...filteredComponents].sort((a, b) => {
    if (sortMode === "name") {
      return (a.name || "").localeCompare(b.name || "");
    }
    if (sortMode === "deps") {
      const aRef = typeof a.bomRef === 'string' ? a.bomRef : a.bomRef?.value || "";
      const bRef = typeof b.bomRef === 'string' ? b.bomRef : b.bomRef?.value || "";
      return (
        (formattedNestedSBOM.dependencyGraph.get(bRef)?.length || 0) -
        (formattedNestedSBOM.dependencyGraph.get(aRef)?.length || 0)
      );
    }
    return vulnCount(b) - vulnCount(a);
  });

  const visibleCount = filteredComponents.length;
  const totalCount = formattedNestedSBOM.componentMap.size;

  const findFocusedComponent = (
    pathRefs: string[] | null,
  ): EnhancedComponent | null => {
    if (!pathRefs || pathRefs.length === 0) return null;
    const ref = pathRefs[pathRefs.length - 1];
    return formattedNestedSBOM.componentMap.get(ref) || null;
  };

  const focusedComponent = findFocusedComponent(
    focusedPathRefs,
  );

  const mermaidRoots = focusedComponent ? [focusedComponent] : sortedComponents;

  // This variable was unused, removed to avoid linting warnings.
  // const exportRoots = mermaidRoots;

  const prepareMermaidSource = async () => {
    const { buildMermaidDiagram } = await import("@/lib/mermaid/sbomToMermaid");
    const result = await buildMermaidDiagram(formattedNestedSBOM, {
      maxDepth,
      query,
      pruneNonMatches,
      showVulnerableOnly,
      rootRefs: mermaidRoots.map(r => typeof r.bomRef === 'string' ? r.bomRef : r.bomRef?.value || ""),
    });
    const previewResult = await buildMermaidDiagram(formattedNestedSBOM, {
      maxDepth,
      query,
      pruneNonMatches,
      showVulnerableOnly,
      maxNodes: 140,
      maxEdges: 280,
      maxLabelLength: 120,
      rootRefs: mermaidRoots.map(r => typeof r.bomRef === 'string' ? r.bomRef : r.bomRef?.value || ""),
    });
    setMermaidSource(result.diagram);
    setMermaidPreviewSource(previewResult.diagram);
    setMermaidStats({
      nodeCount: previewResult.nodeCount,
      edgeCount: previewResult.edgeCount,
    });
    if (previewResult.truncated) {
      setMermaidNotice(
        `Preview truncated at ${previewResult.maxNodes} nodes / ${previewResult.maxEdges} edges for stability.`,
      );
    } else {
      setMermaidNotice(null);
    }
  };

  const handleMermaidDownload = () => {
    if (!mermaidSource) return;
    const blob = new Blob([mermaidSource], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `sbom-${dateStamp}.mmd`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyMermaid = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(mermaidSource);
      }
    } catch {
      // Why: Clipboard permissions can be denied; ignore to avoid blocking UI.
    }
  };

  return (
    <>
      <div className="space-y-4 p-4">
        <div className="rounded-xl border bg-card/60 p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h2 className="text-lg font-semibold">SBOM Statistics</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void prepareMermaidSource();
                setMermaidOpen(true);
              }}
            >
              Export Mermaid
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
            <div>
              <span className="font-medium">Total Components:</span>{" "}
              {totalCount}
            </div>
            <div>
              <span className="font-medium">Visible:</span> {visibleCount}
            </div>
            <div>
              <span className="font-medium">Unique Licenses:</span>{" "}
              {formattedNestedSBOM.statistics.licenses.length}
            </div>
            <div>
              <span className="font-medium">Critical Vulns:</span>{" "}
              {formattedNestedSBOM.statistics.vulnerabilities.Critical.length}
            </div>
            <div>
              <span className="font-medium">High Vulns:</span>{" "}
              {formattedNestedSBOM.statistics.vulnerabilities.High.length}
            </div>
            <div>
              <span className="font-medium">Medium Vulns:</span>{" "}
              {formattedNestedSBOM.statistics.vulnerabilities.Medium.length}
            </div>
          </div>
        </div>

        <AlertDialog
          open={mermaidOpen}
          onOpenChange={(open) => {
            setMermaidOpen(open);
            if (open) void prepareMermaidSource();
            if (open) setMermaidScale(1);
          }}
        >
          <AlertDialogContent className="max-w-6xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Mermaid export preview</AlertDialogTitle>
              <AlertDialogDescription>
                Preview the diagram before saving. The export respects your
                current filters, search, and max depth.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="grid gap-4 md:grid-cols-[1.5fr_1fr]">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Diagram preview</span>
                  {mermaidStats && (
                    <span>
                      {mermaidStats.nodeCount} nodes • {mermaidStats.edgeCount}{" "}
                      edges
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setMermaidScale((value) => Math.max(0.5, value - 0.1))
                    }
                  >
                    Zoom -
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setMermaidScale((value) => Math.min(2.5, value + 0.1))
                    }
                  >
                    Zoom +
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMermaidScale(1)}
                  >
                    Reset zoom
                  </Button>
                  <span className="text-muted-foreground">
                    {Math.round(mermaidScale * 100)}%
                  </span>
                </div>
                {mermaidNotice && (
                  <p className="text-xs text-amber-600">{mermaidNotice}</p>
                )}
                <ScrollArea className="h-[22.5rem] max-h-[60vh] rounded-md border bg-muted/20 p-3">
                  {mermaidError ? (
                    <p className="text-sm text-destructive">{mermaidError}</p>
                  ) : mermaidPending ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Spinner className="size-3" />
                      <span>Rendering preview...</span>
                    </div>
                  ) : !mermaidSvg ? (
                    <p className="text-xs text-muted-foreground">
                      Preview unavailable. Use the .mmd export.
                    </p>
                  ) : (
                    <div
                      className="min-w-full [&_svg]:max-w-none"
                      style={{
                        transform: `scale(${mermaidScale})`,
                        transformOrigin: "top left",
                      }}
                      dangerouslySetInnerHTML={{ __html: mermaidSvg }}
                    />
                  )}
                </ScrollArea>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Mermaid source</span>
                  <Button variant="ghost" size="sm" onClick={handleCopyMermaid}>
                    Copy
                  </Button>
                </div>
                <Textarea
                  value={mermaidSource}
                  readOnly
                  className="h-[22.5rem] max-h-[60vh] font-mono text-xs"
                />
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel>Close</AlertDialogCancel>
              <AlertDialogAction onClick={handleMermaidDownload}>
                Save .mmd
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {focusedComponent && (
          <div className="rounded-xl border bg-card/60 p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Focused path</p>
                <p className="text-sm font-medium">
                  {focusedPathRefs?.join(" › ")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setFocusedPathRefs((prev) =>
                      prev && prev.length > 1 ? prev.slice(0, -1) : null,
                    )
                  }
                >
                  Focus parent
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setFocusedPathRefs(null)}
                >
                  Exit focus
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl border bg-card/60 p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex-1">
              <Input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search components, groups, bom-ref, or purl..."
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={showVulnerableOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowVulnerableOnly((prev) => !prev)}
              >
                {showVulnerableOnly ? "Vulnerable only" : "All components"}
              </Button>
              <Button
                variant={pruneNonMatches ? "default" : "outline"}
                size="sm"
                onClick={() => setPruneNonMatches((prev) => !prev)}
              >
                {pruneNonMatches ? "Prune non-matches" : "Show full branches"}
              </Button>
              <Button
                variant={compactMode ? "default" : "outline"}
                size="sm"
                onClick={() => setCompactMode((prev) => !prev)}
              >
                {compactMode ? "Compact" : "Comfort"}
              </Button>
              <Button
                variant={expandMode === "expand" ? "default" : "outline"}
                size="sm"
                onClick={() => setExpandMode("expand")}
              >
                Expand all
              </Button>
              <Button
                variant={expandMode === "collapse" ? "default" : "outline"}
                size="sm"
                onClick={() => setExpandMode("collapse")}
              >
                Collapse all
              </Button>
              <Button
                variant={expandMode === "auto" ? "default" : "outline"}
                size="sm"
                onClick={() => setExpandMode("auto")}
              >
                Auto expand
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setSortMode((current) =>
                    current === "vulns"
                      ? "deps"
                      : current === "deps"
                        ? "name"
                        : "vulns",
                  )
                }
              >
                Sort:{" "}
                {sortMode === "vulns"
                  ? "Vulns"
                  : sortMode === "deps"
                    ? "Deps"
                    : "Name"}
              </Button>
              <div className="flex items-center gap-2 rounded-md border px-2 py-1 text-xs">
                <span className="text-muted-foreground">Max depth</span>
                <Input
                  type="number"
                  min={1}
                  max={6}
                  value={maxDepth}
                  onChange={(event) =>
                    setMaxDepth(
                      Math.min(6, Math.max(1, Number(event.target.value || 3))),
                    )
                  }
                  className="h-6 w-16 text-xs"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setQuery("");
                  setShowVulnerableOnly(false);
                  setPruneNonMatches(true);
                  setCompactMode(false);
                  setSortMode("vulns");
                  setMaxDepth(3);
                  setExpandMode("auto");
                }}
              >
                Reset filters
              </Button>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Tips: Press "/" to focus search, "Esc" to clear it. Use max depth to
            limit dependency rendering.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="py-6 text-sm text-muted-foreground">
              Preparing components...
            </div>
          }
        >
          {(focusedComponent ? [focusedComponent] : sortedComponents).map(
            (component, index) => (
              <ComponentErrorBoundary
                key={component.bomRef?.value || index}
                name={component.name}
              >
                <SBOMComponent
                  component={component}
                  maxDepth={maxDepth}
                  expandMode={expandMode}
                  searchQuery={query}
                  pruneNonMatches={pruneNonMatches}
                  sortMode={sortMode}
                  compactMode={compactMode}
                  parentPathRefs={focusedComponent ? focusedPathRefs || [] : []}
                  componentMap={formattedNestedSBOM.componentMap}
                  dependencyGraph={formattedNestedSBOM.dependencyGraph}
                  onFocus={setFocusedPathRefs}
                />
              </ComponentErrorBoundary>
            ),
          )}
        </Suspense>
      </div>
    </>
  );
};
