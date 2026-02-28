import { type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useSelection } from "../../context/SelectionContext";
import { ComponentDetailPanel } from "../views/ComponentDetailPanel";
import { VulnerabilityDetailPanel } from "../views/VulnerabilityDetailPanel";
import { useDependencyAnalysis } from "../../hooks/useDependencyAnalysis";
import { useSbomStats } from "../../hooks/useSbomStats";
import { ErrorBoundary } from "../common/ErrorBoundary";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Scale, X, Network } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useLayout } from "../../context/LayoutContext";
import { cn } from "../../lib/utils";

const CATEGORY_COLORS = {
  permissive: "#16a34a",
  copyleft: "#dc2626",
  "weak-copyleft": "#ea580c",
  proprietary: "#2563eb",
  unknown: "#64748b",
};

export function Layout({ children, sbom }: { children: ReactNode; sbom?: any }) {
  const { isMobile, sidebarOpen, setSidebarOpen } = useLayout();
  const { 
    selectedComponent, 
    selectedVulnerability, 
    setSelectedComponent, 
    setSelectedVulnerability,
    selectedLicense,
    setSelectedLicense 
  } = useSelection();
  const { analysis } = useDependencyAnalysis(sbom);
  const stats = useSbomStats(sbom);

  const hasSelection = !!selectedComponent || !!selectedVulnerability || !!selectedLicense;

  const renderDetailContent = () => {
    if (selectedComponent) {
      return (
        <ComponentDetailPanel
          component={selectedComponent}
          analysis={analysis}
          onClose={() => setSelectedComponent(null)}
        />
      );
    } else if (selectedVulnerability) {
      return (
        <VulnerabilityDetailPanel 
          vulnerability={selectedVulnerability}
          onClose={() => setSelectedVulnerability(null)}
          allVulnerableComponents={stats?.allVulnerableComponents}
        />
      );
    } else if (selectedLicense) {
      return (
        <div className="h-full border-l bg-card flex flex-col shadow-2xl z-20">
          <div className="flex items-center justify-between p-4 border-b flex-none">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg breadcrumb">License Details</h3>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSelectedLicense(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4 space-y-6">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">License ID</h4>
                <div className="text-xl font-bold font-mono">{(selectedLicense as any).id}</div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Category</h4>
                <Badge 
                  variant="secondary" 
                  className="text-white border-0 uppercase"
                  style={{ 
                    backgroundColor: CATEGORY_COLORS[(selectedLicense as any).category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.unknown
                  }}
                >
                  {(selectedLicense as any).category}
                </Badge>
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Network className="h-4 w-4" /> Affected Components ({(selectedLicense as any).affectedCount})
                </h4>
                <div className="space-y-2">
                  {stats?.allLicenseComponents
                    ?.filter(c => c.licenses.some((l: any) => l.id === (selectedLicense as any).id))
                    .slice(0, 15).map((comp: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-md bg-muted/30 border text-sm">
                        <span className="font-medium truncate mr-2">{comp.name}</span>
                        <Badge variant="outline" className="text-[10px] shrink-0">{comp.version}</Badge>
                      </div>
                    ))
                  }
                  {(selectedLicense as any).affectedCount > 15 && (
                    <p className="text-[10px] text-muted-foreground text-center">+ {(selectedLicense as any).affectedCount - 15} more components</p>
                  )}
                </div>
              </div>

              <div className="pt-4 mt-auto">
                <Button className="w-full" variant="outline" onClick={() => window.open(`https://spdx.org/licenses/${(selectedLicense as any).id}.html`, '_blank', 'noopener,noreferrer')}>
                  View SPDX License Terms
                </Button>
              </div>
            </div>
          </ScrollArea>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-background text-foreground relative">
      {/* Mobile Backdrop */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 transition-opacity" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - fixed drawer on mobile, relative on desktop */}
      <div 
        data-testid="sidebar-wrapper"
        className={cn(
        "z-50 h-full transition-transform duration-300 ease-in-out",
        isMobile 
          ? "fixed left-0 top-0 w-64 shadow-2xl bg-card" 
          : "relative",
        isMobile && !sidebarOpen && "-translate-x-full"
      )}>
        <Sidebar 
          mobileOpen={sidebarOpen} 
          setMobileOpen={setSidebarOpen} 
        />
      </div>

      <main className="flex-1 overflow-hidden relative flex flex-col">
        <div className="flex-1 overflow-hidden">
          {isMobile ? (
            <div className="h-full relative overflow-hidden">
              {children}
              
              {/* Mobile Overlay Detail Panel */}
              {hasSelection && (
                <div className="fixed inset-0 z-50 bg-background animate-in slide-in-from-bottom duration-300">
                  <ErrorBoundary 
                    resetKeys={[selectedComponent, selectedVulnerability, selectedLicense]} 
                  >
                    {renderDetailContent()}
                  </ErrorBoundary>
                </div>
              )}
            </div>
          ) : (
            <ResizablePanelGroup direction="horizontal">
              <ResizablePanel defaultSize={hasSelection ? 60 : 100} minSize={30}>
                <div className="h-full overflow-hidden">
                  {children}
                </div>
              </ResizablePanel>

              {hasSelection && (
                <>
                  <ResizableHandle withHandle className="w-2 bg-border hover:bg-primary/50 transition-colors" />
                  <ResizablePanel defaultSize={40} minSize={20}>
                    <div className="h-full pl-2" data-testid="detail-panel">
                      <ErrorBoundary 
                        resetKeys={[selectedComponent, selectedVulnerability, selectedLicense]} 
                      >
                        {renderDetailContent()}
                      </ErrorBoundary>
                    </div>
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          )}
        </div>
      </main>
    </div>
  );
}
