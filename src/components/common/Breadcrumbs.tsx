import { ChevronRight, Home, Package, ShieldAlert } from "lucide-react";
import { useView } from "../../context/ViewContext";
import { useSelection } from "../../context/SelectionContext";
import { cn, formatComponentName } from "../../lib/utils";
import type { ViewType } from "../../types";

export function Breadcrumbs() {
  const { activeView, setActiveView } = useView();
  const { selectedComponent, selectedVulnerability, clearSelection } = useSelection();

  const viewLabels: Record<ViewType, string> = {
    dashboard: "Dashboard",
    vulnerabilities: "Vulnerabilities",
    licenses: "Licenses",
    explorer: "Components",
    tree: "Dependency Tree",
    graph: "Dependency Graph",
    "reverse-tree": "Reverse Tree",
    metadata: "Metadata",
    developer: "Developer Insights",
    "multi-stats": "Multi-SBOM Stats",
    risk: "Supply Chain Risk"
  };

  const navigateToView = (view: ViewType) => {
    setActiveView(view);
    clearSelection();
  };

  return (
    <nav className="flex items-center space-x-1 text-xs text-muted-foreground mb-4 overflow-hidden h-6">
      <button 
        onClick={() => navigateToView('dashboard')}
        className="hover:text-foreground transition-colors flex items-center gap-1 shrink-0"
      >
        <Home className="h-3 w-3" />
        <span className="hidden sm:inline">SBom Viewer</span>
      </button>

      {activeView !== 'dashboard' && (
        <>
          <ChevronRight className="h-3 w-3 shrink-0" />
          <button 
            onClick={() => navigateToView(activeView)}
            className={cn(
              "hover:text-foreground transition-colors shrink-0",
              !selectedComponent && !selectedVulnerability && "font-bold text-foreground"
            )}
          >
            {viewLabels[activeView]}
          </button>
        </>
      )}

      {selectedComponent && (
        <>
          <ChevronRight className="h-3 w-3 shrink-0" />
          <div className="flex items-center gap-1 truncate font-bold text-foreground min-w-0" title={`${selectedComponent.name}@${selectedComponent.version}`}>
            <Package className="h-3 w-3 shrink-0" />
            <span className="truncate">{formatComponentName(selectedComponent.name)}@{selectedComponent.version}</span>
          </div>
        </>
      )}

      {selectedVulnerability && (
        <>
          <ChevronRight className="h-3 w-3 shrink-0" />
          <div className="flex items-center gap-1 truncate font-bold text-foreground min-w-0">
            <ShieldAlert className="h-3 w-3 shrink-0 text-destructive" />
            <span className="truncate">{selectedVulnerability.id}</span>
          </div>
        </>
      )}
    </nav>
  );
}
