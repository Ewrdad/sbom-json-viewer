import { LayoutDashboard, List, Network, ShieldAlert, ScrollText, Info, GitGraph, Wrench, ChevronLeft, ChevronRight, Eye, X, Upload, Database, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { useState, useEffect, useRef, useMemo } from "react";
import { useView } from "../../context/ViewContext";
import { useSbom } from "../../context/SbomContext";
import type { ViewType } from "../../types";
import { useSettings } from "../../context/SettingsContext";
import { SbomSelector } from "../common/SbomSelector";
import { useLayout } from "../../context/LayoutContext";

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
  const { highContrast, setHighContrast } = useSettings();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAltPressed, setIsAltPressed] = useState(false);
  
  const criticalCount = sbomStats?.vulnerabilityCounts?.critical || 0;

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
      <div className={cn("p-4 border-b flex items-center", isCollapsed ? "justify-center" : "justify-between")}>
        {!isCollapsed && (
          <h1 className="font-bold text-lg flex items-center gap-2 truncate">
            <span>📦</span> SBOM Viewer
          </h1>
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
      <TooltipProvider delayDuration={0}>
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto scrollbar-none">
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
      <div className="px-2 pb-2 mt-auto border-t pt-4 space-y-2">
        {(!isCollapsed || (isMobile && mobileOpen)) && (
          <div className="px-2 mb-2" data-testid="sbom-selector-trigger">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
              Current SBOM
            </p>
            <div className="text-[11px] font-semibold text-foreground/80 truncate mb-2" data-testid="current-file-display" title={currentFile}>
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

        <TooltipProvider delayDuration={0}>
          {isCollapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-center px-0 text-muted-foreground"
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
                  "w-full transition-all text-muted-foreground",
                  isCollapsed ? "justify-center px-0" : "justify-start px-4"
                )}
                onClick={handleImportClick}
              >
                <Upload className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
                {!isCollapsed && <span className="truncate">Upload SBOM</span>}
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
                  "w-full transition-all",
                  isCollapsed ? "justify-center px-0" : "justify-start px-4",
                  highContrast ? "text-primary bg-primary/10" : "text-muted-foreground"
                )}
                onClick={() => setHighContrast(!highContrast)}
              >
                <Eye className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
                {!isCollapsed && <span className="truncate">High Contrast</span>}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" hidden={!isCollapsed}>
              <p className="font-bold">High Contrast</p>
              <p className="text-xs text-muted-foreground">Toggle accessible color mode</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <div className={cn(
          "p-2 text-[10px] text-muted-foreground transition-all truncate",
          isCollapsed ? "text-center px-0" : "px-4"
        )}>
          {isCollapsed ? "v0.2" : "v0.2.0 (Revamped)"}
        </div>
      </div>
    </div>
  );
}
