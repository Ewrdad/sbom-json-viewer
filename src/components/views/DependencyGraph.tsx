import { useEffect, useMemo, useState } from "react";
import { type Bom } from "@cyclonedx/cyclonedx-library/Models";
import {
  Formatter,
} from "../../renderer/Formatter/Formatter";
import { type formattedSBOM } from "../../types/sbom";
import { buildMermaidDiagram } from "../../lib/mermaid/sbomToMermaid";
import { Mermaid } from "@/components/ui/mermaid";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Layers, RefreshCw } from "lucide-react";
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
  const [allowLargeFormat, setAllowLargeFormat] = useState(false);
  const [progress, setProgress] = useState({
    progress: 0,
    message: "Preparing graph...",
  });
  const { componentCount, isLarge } = getSbomSizeProfile(sbom);

  useEffect(() => {
    if (preFormattedSbom) {
      setFormattedData(preFormattedSbom);
    } else {
      setAllowLargeFormat(false);
      setFormattedData(null);
    }
  }, [sbom, preFormattedSbom]);

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
      if (!sbom || preFormattedSbom) return;
      setFormatting(true);
      setProgress({ progress: 0, message: "Initializing formatter..." });
      try {
        const result = await Formatter({ rawSBOM: sbom, setProgress });
        if (mounted) {
          setFormattedData(result);
        }
      } catch (error) {
        console.error("Error formatting SBOM:", error);
      } finally {
        if (mounted) setFormatting(false);
      }
    };

    runFormatter();
    return () => {
      mounted = false;
    };
  }, [sbom, allowLargeFormat, isLarge, preFormattedSbom]);

  const mermaidChart = useMemo(() => {
    if (!formattedData) return "";

    const options = {
      maxDepth: maxDepth,
      query: "",
      pruneNonMatches: false,
      showVulnerableOnly: false,
    };

    const result = buildMermaidDiagram(formattedData, options);
    return result.diagram;
  }, [formattedData, maxDepth]);

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

  if (formatting || !formattedData) {
    const width = Math.min(Math.max(progress.progress, 0), 100);
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">{progress.message}</p>
        <div className="w-64 h-2 rounded-full bg-muted/50 overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${width}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between flex-none">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Dependency Graph
          </h2>
          <p className="text-sm text-muted-foreground">
            Visualization of component relationships
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Depth:</span>
            <Select
              value={maxDepth.toString()}
              onValueChange={(val) => setMaxDepth(parseInt(val))}
            >
              <SelectTrigger className="w-[80px]">
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
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export SVG
          </Button>
        </div>
      </div>

      <Card className="flex-1 overflow-hidden bg-card border flex flex-col shadow-sm">
        {mermaidChart ? (
          <div className="flex-1 overflow-auto relative">
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
