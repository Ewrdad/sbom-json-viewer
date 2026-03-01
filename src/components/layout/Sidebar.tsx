import { LayoutDashboard, List, Network, ShieldAlert, ScrollText, Info, GitGraph, Wrench, ChevronLeft, ChevronRight, Eye, X, Upload, Database, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { useState, useEffect, useRef, useMemo } from "react";
import { useView } from "../../context/ViewContext";
import { useSbom } from "../../context/SbomContext";
import { useSelection } from "../../context/SelectionContext";
import type { ViewType } from "../../types";
import { useSettings } from "../../context/SettingsContext";
import { SbomSelector } from "../common/SbomSelector";
import { useLayout } from "../../context/LayoutContext";
import { SidebarRss } from "./SidebarRss";
import { ErrorBoundary } from "../common/ErrorBoundary";
import packageJson from "../../../package.json";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Sidebar component that provides navigation, SBOM selection, and settings toggles.
 * Adapts to mobile view by functioning as a drawer and housing data management 
 * controls (Selector, Upload) previously in the Header.
 * 
 * @param {boolean} mobileOpen - Whether the sidebar is open on mobile
 * @param {function} setMobileOpen - Function to toggle mobile sidebar state
 */
export function Sidebar({ 
  mobileOpen, 
  setMobileOpen
}: { 
  mobileOpen?: boolean; 
  setMobileOpen?: (open: boolean) => void;
}) {
  const { isMobile } = useLayout();
  
  const { activeView, setActiveView, isMultiSbom } = useView();
  const { sbomStats, manifest, currentFile, onImport } = useSbom();
  const { sourceFilter, setSourceFilter } = useSelection();
  const { highContrast, setHighContrast } = useSettings();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAltPressed, setIsAltPressed] = useState(false);
  
  const criticalCount = sbomStats?.vulnerabilityCounts?.critical || 0;

  const scanners = useMemo(() => {
    if (!sbomStats?.sourceCounts) return [];
    return Object.keys(sbomStats.sourceCounts).sort();
  }, [sbomStats?.sourceCounts]);

  const navItems = useMemo(() => {
    const items: { id: ViewType; label: string; icon: React.ReactNode; description: string; badge?: React.ReactNode }[] = [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: <LayoutDashboard className={cn("h-4 w-4", !isCollapsed && "mr-2")} />,
        description: "Overview of SBOM metrics and health",
      },
      {
        id: "vulnerabilities",
        label: "Vulnerabilities",
        icon: <ShieldAlert className={cn("h-4 w-4", !isCollapsed && "mr-2")} />,
        description: "Security vulnerabilities found in components",
        badge: criticalCount > 0 ? (
          <span className="ml-auto bg-destructive text-destructive-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-none">
            {criticalCount}
          </span>
        ) : null,
      },
      {
        id: "risk",
        label: "Supply Chain Risk",
        icon: <AlertTriangle className={cn("h-4 w-4", !isCollapsed && "mr-2")} />,
        description: "Analyze component risk by impact and security",
      },
      {
        id: "licenses",
        label: "Licenses",
        icon: <ScrollText className={cn("h-4 w-4", !isCollapsed && "mr-2")} />,
        description: "License usage and compliance oversight",
      },
      {
        id: "explorer",
        label: "Components",
        icon: <List className={cn("h-4 w-4", !isCollapsed && "mr-2")} />,
        description: "Detailed list of all software components",
      },
      {
        id: "tree",
        label: "Dependency Tree",
        icon: <Network className={cn("h-4 w-4 rotate-90", !isCollapsed && "mr-2")} />,
        description: "Hierarchical view of component dependencies",
      },
      {
        id: "graph",
        label: "Visual Graph",
        icon: <Network className={cn("h-4 w-4", !isCollapsed && "mr-2")} />,
        description: "Interactive graph visualization of dependencies",
      },
      {
        id: "reverse-tree",
        label: "Reverse Tree",
        icon: <GitGraph className={cn("h-4 w-4", !isCollapsed && "mr-2")} />,
        description: "Trace dependencies from leaf to root",
      },
      {
        id: "metadata",
        label: "Metadata",
        icon: <Info className={cn("h-4 w-4", !isCollapsed && "mr-2")} />,
        description: "Metadata about the SBOM file itself",
      },
      {
        id: "developer",
        label: "Developer Insights",
        icon: <Wrench className={cn("h-4 w-4", !isCollapsed && "mr-2")} />,
        description: "Package hygiene, version conflicts, and metadata quality",
      },
    ];

    if (isMultiSbom) {
      items.push({
        id: "multi-stats",
        label: "Multi-SBOM Stats",
        icon: <LayoutDashboard className={cn("h-4 w-4", !isCollapsed && "mr-2")} />,
        description: "Compare overlaps and tool efficacy across multiple SBOMs",
      });
    }
    return items;
  }, [isCollapsed, criticalCount, isMultiSbom]);


  // Sync isCollapsed with isMobile
  useEffect(() => {
    if (isMobile) {
      setIsCollapsed(false); // Sidebar is full width when open as drawer on mobile
    }
  }, [isMobile]);

  // Keyboard shortcuts Alt + 1-9
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) setIsAltPressed(true);
      if (e.altKey && e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key) - 1;
        if (navItems[index]) {
          e.preventDefault();
          setActiveView(navItems[index].id);
          if (isMobile && setMobileOpen) setMobileOpen(false);
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.altKey) setIsAltPressed(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [setActiveView, isMultiSbom, isMobile, setMobileOpen, navItems]); // Re-run if navItems changes (isMultiSbom)

  const handleNavClick = (viewId: ViewType) => {
    setActiveView(viewId);
    if (isMobile && setMobileOpen) {
      setMobileOpen(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      onImport?.(files);
    }
  };

  return (
    <div 
      data-testid="sidebar"
      className={cn(
        "border-r bg-card flex flex-col h-screen transition-all duration-300 relative",
        isCollapsed ? "w-16" : "w-64",
        isMobile && "border-none shadow-2xl"
      )}
    >
      <div className={cn("p-4 border-b flex flex-col gap-1", isCollapsed ? "items-center" : "items-start")}>
        <div className={cn("flex items-center w-full", isCollapsed ? "justify-center" : "justify-between")}>
          {!isCollapsed && (
            <div className="flex flex-col">
              <h1 className="font-bold text-lg flex items-center gap-2 truncate">
                <span>📦</span> SBOM Viewer
              </h1>
              <span className="text-[9px] font-mono font-bold text-muted-foreground/50 ml-7 -mt-1">
                v{packageJson.version}
              </span>
            </div>
          )}
          {isCollapsed && (
            <span className="text-[8px] font-mono font-bold text-muted-foreground/50 absolute bottom-1">
              v{packageJson.version.split('.').slice(0, 2).join('.')}
            </span>
          )}
          {!isMobile ? (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8" 
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          ) : (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8" 
              onClick={() => setMobileOpen?.(false)}
              title="Close sidebar"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        {!isCollapsed && (
          <a 
            href="https://www.linkedin.com/in/ewrdad/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[9px] text-muted-foreground/60 hover:text-primary flex items-center gap-1.5 font-bold transition-colors ml-7 animate-in fade-in slide-in-from-top-1 duration-500 tracking-wider"
          >
            <span>CREATED BY EWRDAD</span>
          </a>
        )}
      </div>
      <TooltipProvider delayDuration={0}>
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto scrollbar-none">
          {navItems.map((item, index) => (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <Button
                  variant={activeView === item.id ? "default" : "ghost"}
                  data-testid={`sidebar-link-${item.id}`}
                  className={cn(
                    "w-full transition-all relative group/nav flex items-center",
                    isCollapsed ? "justify-center px-0" : "justify-start px-4",
                    activeView === item.id ? "" : "text-muted-foreground",
                  )}
                  onClick={() => handleNavClick(item.id)}
                >
                  {item.icon}
                  {!isCollapsed && <span className="truncate flex-1 text-left">{item.label}</span>}
                  
                  {!isCollapsed && item.badge}
                  
                  {/* Shortcut hint */}
                  {isAltPressed && index < 9 && (
                    <span className={cn(
                      "absolute flex items-center justify-center bg-muted text-muted-foreground border rounded text-[8px] h-4 w-4 font-mono",
                      isCollapsed ? "top-0 right-0" : "right-2"
                    )}>
                      {index + 1}
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" hidden={!isCollapsed}>
                <p className="font-bold">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </nav>
      </TooltipProvider>

      {/* SBOM Source and Options */}
      <div className="px-2 pb-2 mt-auto border-t pt-2 space-y-1">
        {isMultiSbom && !isCollapsed && (
          <div className="px-2 mb-2 animate-in slide-in-from-bottom-2 duration-300">
            <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1.5 flex items-center gap-2">
              <Database className="h-3 w-3" /> Source Isolation
            </p>
            <Select 
              value={sourceFilter || "all"} 
              onValueChange={(v) => setSourceFilter(v === "all" ? null : v)}
            >
              <SelectTrigger className="h-7 text-[10px] bg-primary/5 border-primary/20 font-bold uppercase">
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-[10px] font-bold">ALL SOURCES (MERGED)</SelectItem>
                {scanners.map(s => (
                  <SelectItem key={s} value={s} className="text-[10px]">{s.toUpperCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {(!isCollapsed || (isMobile && mobileOpen)) && (
          <div className="px-2 mb-1" data-testid="sbom-selector-trigger">
            <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider mb-0.5">
              Current SBOM
            </p>
            <div className="text-[11px] font-bold text-foreground/80 truncate mb-1.5" data-testid="current-file-display" title={currentFile}>
              {currentFile}
            </div>
            <SbomSelector
              manifest={manifest}
              currentFile={currentFile || ""}
              onSelect={(fileId) => {
                window.location.hash = `#/${fileId}`;
              }}
            />
          </div>
        )}

        <div className="space-y-0.5">
          <TooltipProvider delayDuration={0}>
            {isCollapsed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full h-8 justify-center px-0 text-muted-foreground"
                    onClick={() => setIsCollapsed(false)}
                    title="Select SBOM"
                  >
                    <Database className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="font-bold">Select SBOM</p>
                  <p className="text-xs text-muted-foreground">Expand sidebar to switch</p>
                </TooltipContent>
              </Tooltip>
            )}

            <input
              type="file"
              multiple
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full h-8 transition-all text-muted-foreground",
                    isCollapsed ? "justify-center px-0" : "justify-start px-2"
                  )}
                  onClick={handleImportClick}
                >
                  <Upload className={cn("h-3.5 w-3.5", !isCollapsed && "mr-2")} />
                  {!isCollapsed && <span className="truncate text-xs font-medium">Upload SBOM</span>}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" hidden={!isCollapsed}>
                <p className="font-bold">Upload SBOM</p>
                <p className="text-xs text-muted-foreground">Processed in browser</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full h-8 transition-all",
                    isCollapsed ? "justify-center px-0" : "justify-start px-2",
                    highContrast ? "text-primary bg-primary/10 font-bold" : "text-muted-foreground font-medium"
                  )}
                  onClick={() => setHighContrast(!highContrast)}
                >
                  <Eye className={cn("h-3.5 w-3.5", !isCollapsed && "mr-2")} />
                  {!isCollapsed && <span className="truncate text-xs">High Contrast</span>}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" hidden={!isCollapsed}>
                <p className="font-bold">High Contrast</p>
                <p className="text-xs text-muted-foreground">Toggle accessible color mode</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {!isCollapsed && (
          <div className="pt-2 px-1">
            <ErrorBoundary title="Community Feed">
              <SidebarRss isCollapsed={isCollapsed} />
            </ErrorBoundary>
          </div>
        )}
        
        <div className={cn(
          "px-4 py-1.5 flex items-center justify-center transition-all border-t bg-muted/10",
          isCollapsed && "px-0"
        )}>
          <div className="h-1 w-8 rounded-full bg-muted/20" />
        </div>
      </div>
    </div>
  );
}
