import { useState, useEffect, useMemo, useRef } from "react";
import { Search, Package, ShieldAlert, Command, CornerDownLeft, EyeOff } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogPortal, 
  DialogOverlay 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useSbom } from "../../context/SbomContext";
import { useSelection } from "../../context/SelectionContext";
import { useView } from "../../context/ViewContext";
import { useVex } from "../../context/VexContext";
import { cn } from "@/lib/utils";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { sbom, sbomStats } = useSbom();
  const { assessments, updateAssessment } = useVex();
  const { setSelectedComponent, setSelectedVulnerability, setViewFilters, selectedComponent, selectedVulnerability, selectedLicense } = useSelection();
  const isAnyPanelOpen = !!(selectedComponent || selectedVulnerability || selectedLicense);
  const { setActiveView } = useView();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Keyboard shortcut Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      // Small timeout to ensure dialog is rendered
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  const results = useMemo(() => {
    if (!query || query.length < 2 || !sbom) return { components: [], vulnerabilities: [] };

    const q = query.toLowerCase();
    
    // Search components
    const components = Array.from(sbom.components || [])
      .filter((c: any) => 
        c.name?.toLowerCase().includes(q) || 
        c.purl?.toLowerCase().includes(q) ||
        c.group?.toLowerCase().includes(q)
      )
      .slice(0, 10);

    // Search vulnerabilities
    const vulnerabilities = (sbomStats?.allVulnerabilities || [])
      .filter((v: any) => 
        v.id?.toLowerCase().includes(q) || 
        v.title?.toLowerCase().includes(q)
      )
      .slice(0, 10);

    return { components, vulnerabilities };
  }, [query, sbom, sbomStats]);

  const allResults = [...results.vulnerabilities, ...results.components];

  const handleSelect = (item: any) => {
    if (item.id && (item.id.startsWith('CVE-') || item.id.startsWith('GHSA-'))) {
      // It's a vulnerability
      setViewFilters('vulnerabilities', { viewMode: 'vulnerabilities' });
      setActiveView('vulnerabilities');
      setSelectedVulnerability(item);
    } else {
      // It's a component
      setActiveView('explorer');
      setSelectedComponent(item);
    }
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, allResults.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allResults.length) % Math.max(1, allResults.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (allResults[selectedIndex]) {
        handleSelect(allResults[selectedIndex]);
      }
    }
  };

  return (
    <>
      <Button
        variant="outline"
        className={cn(
          "relative h-9 w-9 p-0 transition-all duration-300 overflow-hidden",
          isAnyPanelOpen ? "3xl:w-64 3xl:justify-start 3xl:px-3 3xl:py-2" : "lg:h-9 lg:w-64 lg:justify-start lg:px-3 lg:py-2"
        )}
        onClick={() => setOpen(true)}
        data-testid="search-trigger"
      >
        <Search className={cn("h-4 w-4 shrink-0", isAnyPanelOpen ? "3xl:mr-2" : "lg:mr-2")} />
        <span className={cn(
          "hidden text-xs text-muted-foreground truncate",
          isAnyPanelOpen ? "3xl:inline-flex" : "lg:inline-flex"
        )}>Search SBOM...</span>
        <kbd className={cn(
          "pointer-events-none absolute right-1.5 top-1.5 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100",
          isAnyPanelOpen ? "3xl:flex" : "lg:flex"
        )}>
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogPortal>
          <DialogOverlay />
          <DialogContent className="max-w-2xl p-0 overflow-hidden top-[20%] translate-y-0">
            <div className="flex items-center border-b px-4">
              <Search className="h-4 w-4 shrink-0 opacity-50" />
              <Input
                ref={inputRef}
                placeholder="Search components, CVEs, licenses..."
                className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none border-none focus-visible:ring-0"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleKeyDown}
              />
              <Badge variant="secondary" className="hidden sm:flex ml-2">ESC to close</Badge>
            </div>
            
            <ScrollArea className="max-h-[400px]">
              <div className="p-2">
                {query.length < 2 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    <Command className="h-8 w-8 mx-auto mb-3 opacity-20" />
                    Type at least 2 characters to search across the SBOM...
                  </div>
                ) : allResults.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    No results found for "{query}"
                  </div>
                ) : (
                  <div className="space-y-4">
                    {results.vulnerabilities.length > 0 && (
                      <div>
                        <h4 className="px-2 mb-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Vulnerabilities</h4>
                        {results.vulnerabilities.map((v: any, i) => {
                          const isSelected = allResults.indexOf(v) === selectedIndex;
                          const vex = assessments[v.id];
                          const isMuted = vex?.status === 'not_affected';
                          
                          return (
                            <div
                              key={v.id}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors group",
                                isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                              )}
                              onClick={() => handleSelect(v)}
                              onMouseEnter={() => setSelectedIndex(allResults.indexOf(v))}
                              data-testid="search-result-item"
                            >
                              <ShieldAlert className={cn("h-4 w-4 shrink-0", isSelected ? "text-primary-foreground" : "text-destructive")} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={cn("font-bold font-mono text-sm", isMuted && "line-through opacity-50")}>{v.id}</span>
                                  <Badge variant="outline" className={cn("text-[9px] px-1 py-0 h-4 border-none", isSelected ? "bg-white/20 text-white" : "bg-destructive/10 text-destructive")}>
                                    {v.severity}
                                  </Badge>
                                  {isMuted && (
                                    <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 bg-muted text-muted-foreground border-none">
                                      MUTED
                                    </Badge>
                                  )}
                                </div>
                                <p className={cn("text-xs truncate opacity-70", isSelected ? "text-primary-foreground" : "text-muted-foreground", isMuted && "line-through")}>
                                  {v.title || "No description"}
                                </p>
                              </div>
                              
                              {/* Quick VEX (Recommendation 20) */}
                              {isSelected && !isMuted && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-7 px-2 text-[10px] bg-white/10 hover:bg-white/20 text-white border-white/20"
                                  onClick={(e: any) => {
                                    e.stopPropagation();
                                    updateAssessment(v.id, { 
                                      status: 'not_affected', 
                                      justification: 'Quick muted from search.' 
                                    });
                                  }}
                                >
                                  <EyeOff className="h-3 w-3 mr-1" />
                                  Mute
                                </Button>
                              )}
                              {isSelected && <CornerDownLeft className="h-3 w-3 opacity-50" />}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {results.components.length > 0 && (
                      <div>
                        <h4 className="px-2 mb-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Components</h4>
                        {results.components.map((c: any, i) => {
                          const isSelected = allResults.indexOf(c) === selectedIndex;
                          return (
                            <div
                              key={c.bomRef?.value || c.name + c.version}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors group",
                                isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                              )}
                              onClick={() => handleSelect(c)}
                              onMouseEnter={() => setSelectedIndex(allResults.indexOf(c))}
                              data-testid="search-result-item"
                            >
                              <Package className={cn("h-4 w-4 shrink-0", isSelected ? "text-primary-foreground" : "text-primary")} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm truncate">{c.name}</span>
                                  <span className={cn("text-[10px] font-mono opacity-70", isSelected ? "text-primary-foreground" : "text-muted-foreground")}>
                                    {c.version}
                                  </span>
                                </div>
                                <p className={cn("text-xs truncate opacity-70", isSelected ? "text-primary-foreground" : "text-muted-foreground")}>
                                  {c.group || c.purl || "Component"}
                                </p>
                              </div>
                              {isSelected && <CornerDownLeft className="h-3 w-3 opacity-50" />}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
            
            <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30 text-[10px] text-muted-foreground font-medium">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="rounded border bg-background px-1.5 py-0.5 font-mono">↑↓</kbd> Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border bg-background px-1.5 py-0.5 font-mono">Enter</kbd> Select
                </span>
              </div>
              <span className="flex items-center gap-1">
                <kbd className="rounded border bg-background px-1.5 py-0.5 font-mono">ESC</kbd> Close
              </span>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </>
  );
}

// Internal Button component since it might not be exported from ui/button correctly in this context if we want to be sure
function Button({ className, variant, size, ...props }: any) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        variant === "outline" ? "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground" : "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        size === "sm" ? "h-8 px-3 text-xs" : size === "icon" ? "h-9 w-9" : "h-10 px-4 py-2",
        className
      )}
      {...props}
    />
  );
}
