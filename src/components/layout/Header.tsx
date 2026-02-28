import { 
  Download, 
  Globe, 
  LayoutDashboard, 
  ShieldAlert, 
  Scale, 
  Search, 
  Network, 
  Info, 
  BarChart3, 
  GitGraph, 
  Wrench,
  Menu,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { GlobalSearch } from "../common/GlobalSearch";
import { ProcessingLog } from "../common/ProcessingLog";
import { HelpGuide } from "../common/HelpGuide";
import { useView } from "../../context/ViewContext";
import { getSbomSizeProfile } from "../../lib/sbomSizing";
import type { Bom } from "@cyclonedx/cyclonedx-library/Models";

/**
 * @interface HeaderProps
 * @description Properties for the Header component
 * @property {Bom} sbom - The current CycloneDX SBOM object
 * @property {string} currentFile - The name or path of the currently loaded file
 * @property {string[]} processingLogs - Array of log messages from the SBOM processing worker
 * @property {function} [onMenuClick] - Optional callback for mobile menu toggle
 */
interface HeaderProps {
  sbom: Bom;
  currentFile: string;
  processingLogs: string[];
  onMenuClick?: () => void;
}

/**
 * @function Header
 * @description The main header component that displays current view title, SBOM metadata badges, 
 * and global action buttons (Search, Download, Logs, Help).
 * 
 * @example
 * <Header 
 *   sbom={mySbom} 
 *   currentFile="Local: my-app.json" 
 *   processingLogs={["File read complete", "Deduplicating..."]} 
 * />
 * 
 * @param {HeaderProps} props - Component props
 */
export function Header({
  sbom,
  currentFile,
  processingLogs,
  onMenuClick,
}: HeaderProps) {
  const { activeView } = useView();
  const { componentCount, isLarge } = getSbomSizeProfile(sbom);
  const isRemote = !currentFile.startsWith("Local:");

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(sbom, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeName = currentFile.replace("Local: ", "").replace(/\//g, "_");
    a.download = `${safeName}.sbom.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getViewIcon = (view: string) => {
    const className = "h-5 w-5";
    switch (view) {
      case "dashboard": return <LayoutDashboard className={`${className} text-primary`} />;
      case "vulnerabilities": return <ShieldAlert className={`${className} text-destructive`} />;
      case "licenses": return <Scale className={`${className} text-blue-500`} />;
      case "explorer": return <Search className={`${className} text-orange-500`} />;
      case "tree": return <Network className={`${className} text-indigo-500 rotate-90`} />;
      case "reverse-tree": return <GitGraph className={`${className} text-indigo-500`} />;
      case "graph": return <Network className={`${className} text-emerald-500`} />;
      case "metadata": return <Info className={`${className} text-muted-foreground`} />;
      case "developer": return <Wrench className={`${className} text-purple-500`} />;
      case "multi-stats": return <BarChart3 className={`${className} text-pink-500`} />;
      default: return null;
    }
  };

  const viewLabels: Record<string, string> = {
    dashboard: "Dashboard",
    vulnerabilities: "Vulnerabilities",
    licenses: "Licenses",
    explorer: "Component Explorer",
    tree: "Dependency Tree",
    graph: "Dependency Graph",
    "reverse-tree": "Reverse Tree",
    metadata: "Metadata",
    developer: "Developer Insights",
    "multi-stats": "Multi-SBOM Stats"
  };

  return (
    <header className={cn(
      "flex flex-col gap-4 pb-4 border-b-2 mb-4 md:mb-6 flex-none bg-background/95 backdrop-blur-sm sticky top-0 z-10 transition-colors",
      isRemote ? "border-b-blue-500/30" : "border-b-purple-500/30"
    )}>
      <div className="flex items-center justify-between gap-2">
        {/* Left Side: Title & Current Context */}
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          {onMenuClick && (
            <Button variant="ghost" size="icon" onClick={onMenuClick} className="md:hidden shrink-0" data-testid="mobile-menu-button">
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <div className="bg-muted/50 p-1.5 md:p-2.5 rounded-lg border shadow-sm shrink-0">
            {getViewIcon(activeView)}
          </div>
          <div className="flex flex-col min-w-0">
            <h2 
              className="text-lg md:text-2xl font-bold tracking-tight truncate"
              data-testid="view-title"
            >
              {viewLabels[activeView] || activeView}
            </h2>
          </div>
        </div>

        {/* Center: Metadata Badges (conditionally visible) */}
        <div className="hidden lg:flex items-center gap-2 px-4 py-1.5 rounded-full bg-muted/30 border border-border/50">
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="h-6 text-[10px] cursor-help bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">
                  <ShieldCheck className="h-3 w-3 mr-1" />
                  Privacy First
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs p-3">
                <div className="space-y-1">
                  <p className="font-bold text-xs flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-green-600" /> 
                    Zero-Knowledge Architecture
                  </p>
                  <p className="text-[10px] leading-relaxed text-muted-foreground">
                    Your data is processed entirely in your browser. No files are uploaded to any server.
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {isRemote && (
            <Badge variant="secondary" className="h-6 text-[10px] bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
              <Globe className="h-3 w-3 mr-1" />
              Remote
            </Badge>
          )}
          <Badge variant="outline" className="h-6 text-[10px] font-medium border-border/60">
            {componentCount.toLocaleString()} components
          </Badge>
          {isLarge && (
            <Badge 
              variant="outline" 
              className="h-6 text-[10px] font-medium border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/50"
              data-testid="large-sbom-badge"
            >
              Large SBOM
            </Badge>
          )}
        </div>

        {/* Right Side: Action Cluster */}
        <div className="flex items-center gap-1 md:gap-2 shrink-0">
          <TooltipProvider delayDuration={300}>
            {/* System Tools */}
            <div className="flex items-center gap-1 md:gap-1.5 mr-0.5 md:mr-1">
              <GlobalSearch />
            </div>

            <Separator orientation="vertical" className="hidden sm:block h-8 mx-0.5 md:mx-1 opacity-50" />

            {/* Data Operations */}
            <div className="flex items-center gap-1 md:gap-1.5 mx-0.5 md:mx-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={handleDownload} className="h-8 md:h-9 px-2 md:px-3">
                    <Download className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">Download</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="md:hidden">
                  <p className="text-xs">Download SBOM</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <Separator orientation="vertical" className="hidden sm:block h-8 mx-0.5 md:mx-1 opacity-50" />

            {/* Support Tools */}
            <div className="flex items-center gap-0.5 md:gap-1 ml-0.5 md:ml-1">
              <ProcessingLog logs={processingLogs} />
              <HelpGuide />
            </div>
          </TooltipProvider>
        </div>
      </div>
    </header>
  );
}
