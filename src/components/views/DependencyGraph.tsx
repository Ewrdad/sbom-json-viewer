import { useEffect, useState } from "react";
import { type Bom } from "@cyclonedx/cyclonedx-library/Models";
import {
  Formatter,
} from "../../renderer/Formatter/Formatter";
import { type formattedSBOM } from "../../types/sbom";
import { buildMermaidDiagram } from "../../lib/mermaid/sbomToMermaid";
import { Mermaid } from "@/components/ui/mermaid";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Layers, RefreshCw, AlertTriangle } from "lucide-react";
import { getSbomSizeProfile } from "../../lib/sbomSizing";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function DependencyGraph({
  sbom,
  formattedSbom: preFormattedSbom,
}: {
  sbom: Bom;
  formattedSbom?: formattedSBOM | null;
}) {
  const [formattedData, setFormattedData] = useState<formattedSBOM | null>(
    preFormattedSbom || null,
  );
  const [formatting, setFormatting] = useState(false);
  const [maxDepth, setMaxDepth] = useState<number>(3);
  const [enableGrouping, setEnableGrouping] = useState(true);
  const [showVulnerableOnly, setShowVulnerableOnly] = useState(false);
  const [allowLargeFormat, setAllowLargeFormat] = useState(false);
  const [progress, setProgress] = useState({
    progress: 0,
    message: "Analyzing SBOM data...",
  });
  const { componentCount, isLarge } = getSbomSizeProfile(sbom);

  const [mermaidChart, setMermaidChart] = useState<string>("");
  const [generationProgress, setGenerationProgress] = useState<string>("");
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    if (preFormattedSbom) {
      setFormattedData(preFormattedSbom);
    } else {
      setAllowLargeFormat(false);
      setFormattedData(null);
    }
  }, [sbom, preFormattedSbom]);

  const [formatterError, setFormatterError] = useState<string | null>(null);

  // Format the SBOM when it changes
  useEffect(() => {
    let mounted = true;

    if (isLarge && !allowLargeFormat) {
      setFormatting(false);
      setFormattedData(null);
      return () => {
        mounted = false;
      };
    }

    const runFormatter = async () => {
      // If we have pre-formatted data from the parent/worker, use it!
      // This is crucial for large SBOMs where we don't want to re-run formatting on the main thread.
      if (preFormattedSbom) {
        setFormatting(false);
        setFormattedData(preFormattedSbom);
        return;
      }

      if (!sbom) return;
      
      setFormatting(true);
      setFormatterError(null);
      setProgress({ progress: 0, message: "Starting formatter..." });
      
      // Small yield to allow UI update
      await new Promise(resolve => setTimeout(resolve, 0));

      try {
        const result = await Formatter({ rawSBOM: sbom, setProgress });
        if (mounted) {
          setFormattedData(result);
        }
      } catch (error) {
        console.error("Error formatting SBOM:", error);
        if (mounted) setFormatterError(error instanceof Error ? error.message : String(error));
      } finally {
        if (mounted) setFormatting(false);
      }
    };

    runFormatter();
    return () => {
      mounted = false;
    };
  }, [sbom, allowLargeFormat, isLarge, preFormattedSbom]);

  // Generate Mermaid Chart
  useEffect(() => {
    let mounted = true;
    if (!formattedData) {
      setMermaidChart("");
      return;
    }

    const generate = async () => {
      setGenerationProgress("Preparing graph...");
      
      // Allow UI to update
      await new Promise(resolve => setTimeout(resolve, 0));

      const options = {
        maxDepth: maxDepth,
        query: "",
        pruneNonMatches: false,
        showVulnerableOnly: showVulnerableOnly,
        enableGrouping: enableGrouping,
        onProgress: (msg: string) => {
          if (mounted) setGenerationProgress(msg);
        }
      };

      try {
        const result = await buildMermaidDiagram(formattedData, options);
        if (mounted) {
          setMermaidChart(result.diagram);
          setIsTruncated(result.truncated);
          setGenerationProgress("");
        }
      } catch (error) {
        console.error("Error generating mermaid diagram:", error);
        if (mounted) setGenerationProgress("Error generating graph");
      }
    };

    generate();

    return () => {
      mounted = false;
    };
  }, [formattedData, maxDepth, showVulnerableOnly, enableGrouping]);

  const handleDownloadSVG = () => {
    const svgElement = document.querySelector(".mermaid-container svg");
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement("a");
    downloadLink.href = svgUrl;
    downloadLink.download = `dependency-graph-${new Date().toISOString()}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  if (isLarge && !allowLargeFormat) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
        <h2 className="text-xl font-semibold">Large SBOM detected</h2>
        <p className="text-sm text-muted-foreground">
          This SBOM has {componentCount.toLocaleString()} components. Building
          the visual graph can be slow and memory-intensive.
        </p>
        <div className="flex items-center gap-2">
          <Button onClick={() => setAllowLargeFormat(true)}>
            Render graph anyway
          </Button>
        </div>
      </div>
    );
  }

  // Initial Formatting Loading State (Full Screen)
  if (formatting || !formattedData) {
    if (formatterError) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center bg-muted/10">
          <h2 className="text-xl font-bold text-red-600">Formatting Error</h2>
          <p className="text-sm text-muted-foreground max-w-md">{formatterError}</p>
          <Button onClick={() => setAllowLargeFormat(false)}>Go Back</Button>
        </div>
      );
    }

    const width = Math.min(Math.max(progress.progress, 0), 100);
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">{progress.message || "Initializing..."}</p>
        <div className="w-64 h-2 rounded-full bg-muted/50 overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${width}%` }}
          />
        </div>
      </div>
    );
  }

  // Graph Generation Loading State (Overlay/Replacement)
  // We keep this as a replacement for now to prevent showing stale graph, 
  // but we style it slightly differently or provide more context.
  if (generationProgress) {
     return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <div className="relative">
             <RefreshCw className="h-8 w-8 animate-spin text-primary" />
             <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-bold text-primary">...</span>
             </div>
        </div>
        <div className="text-center">
            <p className="font-medium">Updating Visual Graph</p>
            <p className="text-sm text-muted-foreground">{generationProgress}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 h-full flex flex-col overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 flex-none">
        <div className="flex flex-col">
          <p className="hidden md:block text-sm text-muted-foreground">
            Visualization of component relationships
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-4">
          <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-md border border-muted-foreground/10">
             <Button
              variant={enableGrouping ? "secondary" : "ghost"}
              size="sm"
              className="h-8 text-[11px] px-2 md:px-3"
              onClick={() => setEnableGrouping(!enableGrouping)}
              title="Toggle Grouping"
            >
              Group
            </Button>
            <Button
              variant={showVulnerableOnly ? "destructive" : "ghost"}
              size="sm"
              className="h-8 text-[11px] px-2 md:px-3"
              onClick={() => setShowVulnerableOnly(!showVulnerableOnly)}
              title="Show Vulnerable Only"
            >
              Vuln Only
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Layers className="hidden sm:block h-4 w-4 text-muted-foreground" />
            <span className="hidden sm:block text-sm font-medium">Depth:</span>
            <Select
              value={maxDepth.toString()}
              onValueChange={(val) => val && setMaxDepth(parseInt(val))}
            >
              <SelectTrigger className="w-[70px] md:w-[80px] h-8 md:h-10">
                <SelectValue placeholder="Depth" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10 (Full)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadSVG}
            disabled={!mermaidChart}
            className="h-8 md:h-9 gap-2 px-2 md:px-3"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export SVG</span>
          </Button>
        </div>

      </div>

      <Card className="flex-1 overflow-hidden bg-card border flex flex-col shadow-sm relative">
        {mermaidChart ? (
          <div className="flex-1 overflow-auto relative">
            {isTruncated && (
              <div className="absolute top-4 left-4 z-10 animate-in fade-in slide-in-from-left-2 duration-500">
                <div className="flex flex-col gap-1.5 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-[10px] font-semibold shadow-md dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-200 max-w-xs">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 flex-none" />
                    <span>Visual Truncation Active</span>
                  </div>
                  <p className="font-normal opacity-90 leading-relaxed">
                    To maintain browser performance and prevent crashes, the graph is limited to <strong>320 nodes</strong> and <strong>640 edges</strong>. 
                  </p>
                  <p className="font-normal opacity-90 leading-relaxed">
                    Current view is limited by depth ({maxDepth}) or these safety thresholds. Try reducing depth or filtering by "Vuln Only".
                  </p>
                </div>
              </div>
            )}
            <Mermaid chart={mermaidChart} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No graph data available.
          </div>
        )}
      </Card>
      <div className="text-[10px] text-muted-foreground text-center flex-none">
        Note: Large graphs with high depth may take a moment to render.
      </div>
    </div>
  );
}
