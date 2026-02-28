import {
  Suspense,
  lazy,
  useEffect,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RotateCcw } from "lucide-react";
import { ViewProvider, useView } from "./context/ViewContext";
import { SettingsProvider } from "./context/SettingsContext";
import { VexProvider } from "./context/VexContext";
import { SelectionProvider } from "./context/SelectionContext";
import { SbomProvider } from "./context/SbomContext";
import { Layout } from "./components/layout/Layout";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { Breadcrumbs } from "./components/common/Breadcrumbs";
const DashboardView = lazy(() =>
  import("./components/views/DashboardView").then((module) => ({
    default: module.DashboardView,
  })),
);
import { DashboardSkeleton } from "./components/views/DashboardView";
const ComponentExplorer = lazy(() =>
  import("./components/views/ComponentExplorer").then((module) => ({
    default: module.ComponentExplorer,
  })),
);
const DependencyGraph = lazy(() =>
  import("./components/views/DependencyGraph").then((module) => ({
    default: module.DependencyGraph,
  })),
);
const DependencyTree = lazy(() =>
  import("./components/views/DependencyTree").then((module) => ({
    default: module.DependencyTree,
  })),
);
const VulnerabilitiesView = lazy(() =>
  import("./components/views/VulnerabilitiesView").then((module) => ({
    default: module.VulnerabilitiesView,
  })),
);
import { VulnerabilitiesSkeleton } from "./components/views/VulnerabilitiesView";
const LicensesView = lazy(() =>
  import("./components/views/LicensesView").then((module) => ({
    default: module.LicensesView,
  })),
);
const MetadataView = lazy(() =>
  import("./components/views/MetadataView").then((module) => ({
    default: module.MetadataView,
  })),
);
const ReverseDependencyTree = lazy(() =>
  import("./components/views/ReverseDependencyTree").then((module) => ({
    default: module.ReverseDependencyTree,
  })),
);
const DeveloperView = lazy(() => import("./components/views/DeveloperView"));
const MultiSbomStatsView = lazy(() =>
  import("./components/views/MultiSbomStatsView").then((module) => ({
    default: module.MultiSbomStatsView,
  })),
);
const SupplyChainRiskView = lazy(() =>
  import("./components/views/SupplyChainRiskView").then((module) => ({
    default: module.SupplyChainRiskView,
  })),
);
import type { Bom } from "@cyclonedx/cyclonedx-library/Models";
import {
  type SbomStats,
  type formattedSBOM,
} from "./types/sbom";
import { KeepAliveView } from "./components/common/KeepAliveView";
import { useSbomLoader } from "./hooks/useSbomLoader";
import { ProcessingLog } from "./components/common/ProcessingLog";
import { Header } from "./components/layout/Header";

import { LayoutProvider, useLayout } from "./context/LayoutContext";

// Define generic interface for Manifest since it's used in props
interface ManifestFile {
  name: string;
  path: string;
  id: string;
  group?: string;
}

interface Manifest {
  default: string;
  files: ManifestFile[];
}

function AppContent({
  sbom,
  formattedSbom,
  sbomStats,
  currentFile,
  onImport,
  manifest,
  processingLogs,
}: {
  sbom: Bom;
  formattedSbom: formattedSBOM | null;
  sbomStats: SbomStats | null;
  currentFile: string;
  onImport: (files: File[]) => void;
  manifest: Manifest | null;
  processingLogs: string[];
}) {
  const { activeView, setIsMultiSbom } = useView();
  const { setSidebarOpen } = useLayout();

  useEffect(() => {
    if (sbomStats?.multiSbomStats?.sources) {
      setIsMultiSbom(sbomStats.multiSbomStats.sources.length > 1);
    } else {
      setIsMultiSbom(false);
    }
  }, [sbomStats, setIsMultiSbom]);

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
    "multi-stats": "Multi-SBOM Stats",
    risk: "Supply Chain Risk"
  };

  const getSkeleton = () => {
    switch (activeView) {
      case "dashboard": return <DashboardSkeleton />;
      case "vulnerabilities": return <VulnerabilitiesSkeleton />;
      default: return (
        <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
          Preparing {viewLabels[activeView]}...
        </div>
      );
    }
  };

  return (
    <div className="flex flex-col h-full p-2 md:p-6 pb-0">
      <Header
        sbom={sbom}
        currentFile={currentFile}
        processingLogs={processingLogs}
        onMenuClick={() => setSidebarOpen(true)}
      />

      <div className="flex-1 overflow-hidden relative flex flex-col">
        <Breadcrumbs />
        <div className="flex-1 min-h-0">
          <Suspense fallback={getSkeleton()}>
          <KeepAliveView activeView={activeView} viewKey="dashboard">
            <ErrorBoundary resetKeys={[sbom]}>
              <DashboardView sbom={sbom} preComputedStats={sbomStats || undefined} />
            </ErrorBoundary>
          </KeepAliveView>

          <KeepAliveView activeView={activeView} viewKey="vulnerabilities">
            <ErrorBoundary resetKeys={[sbom]}>
              <VulnerabilitiesView sbom={sbom} preComputedStats={sbomStats || undefined} />
            </ErrorBoundary>
          </KeepAliveView>
          
          <KeepAliveView activeView={activeView} viewKey="licenses">
            <ErrorBoundary resetKeys={[sbom]}>
              <LicensesView sbom={sbom} preComputedStats={sbomStats || undefined} />
            </ErrorBoundary>
          </KeepAliveView>
          
          <KeepAliveView activeView={activeView} viewKey="explorer">
            <ErrorBoundary resetKeys={[sbom]}>
              <ComponentExplorer sbom={sbom} formattedSbom={formattedSbom} />
            </ErrorBoundary>
          </KeepAliveView>

          <KeepAliveView activeView={activeView} viewKey="tree">
            <ErrorBoundary resetKeys={[sbom]}>
              <DependencyTree sbom={sbom} formattedSbom={formattedSbom} />
            </ErrorBoundary>
          </KeepAliveView>

          <KeepAliveView activeView={activeView} viewKey="graph">
            <ErrorBoundary resetKeys={[sbom]}>
              <DependencyGraph sbom={sbom} formattedSbom={formattedSbom} />
            </ErrorBoundary>
          </KeepAliveView>

          <KeepAliveView activeView={activeView} viewKey="reverse-tree">
            <ErrorBoundary resetKeys={[sbom]}>
              <ReverseDependencyTree sbom={sbom} formattedSbom={formattedSbom} />
            </ErrorBoundary>
          </KeepAliveView>

          <KeepAliveView activeView={activeView} viewKey="metadata">
            <ErrorBoundary resetKeys={[sbom]}>
              <MetadataView sbom={sbom} />
            </ErrorBoundary>
          </KeepAliveView>

          <KeepAliveView activeView={activeView} viewKey="developer">
            <ErrorBoundary resetKeys={[sbom]}>
              <DeveloperView sbom={sbom} preComputedStats={sbomStats || undefined} />
            </ErrorBoundary>
          </KeepAliveView>

          <KeepAliveView activeView={activeView} viewKey="multi-stats">
            <ErrorBoundary resetKeys={[sbom]}>
              <MultiSbomStatsView stats={sbomStats || undefined} />
            </ErrorBoundary>
          </KeepAliveView>

          <KeepAliveView activeView={activeView} viewKey="risk">
            <ErrorBoundary resetKeys={[sbom]}>
              <SupplyChainRiskView />
            </ErrorBoundary>
          </KeepAliveView>
        </Suspense>
        </div>
      </div>
    </div>
  );
}

export function App() {
  const {
    sbom,
    formattedSbom,
    sbomStats,
    error,
    currentFile,
    loadingState,
    manifest,
    processingLogs,
    handleImport,
    retry,
  } = useSbomLoader();

  const [scoreHistory, setScoreHistory] = useState<number[]>([]);

  useEffect(() => {
    if (sbomStats?.developerStats?.metadataQuality.score !== undefined) {
      const currentScore = sbomStats.developerStats.metadataQuality.score;
      setScoreHistory(prev => {
        // Only add if it's different from the last one or we have no history
        if (prev.length === 0 || prev[prev.length - 1] !== currentScore) {
          return [...prev, currentScore].slice(-10); // Keep last 10
        }
        return prev;
      });
    }
  }, [sbomStats]);

  const progressWidth =
    typeof loadingState.progress === "number"
      ? Math.min(Math.max(loadingState.progress, 0), 1) * 100
      : 0;

  const loadingScreen = (
    <div className="h-full flex flex-col items-center justify-center bg-background gap-4 px-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-muted-foreground text-lg font-medium">
          {loadingState.message || "Loading analysis..."}
        </p>
      </div>
      {typeof loadingState.progress === "number" && (
        <div className="w-full max-w-md bg-muted/30 h-2 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${progressWidth}%` }}
          />
        </div>
      )}
      <div className="mt-4">
        <ProcessingLog logs={processingLogs} />
      </div>
    </div>
  );

  const errorScreen = (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-background animate-in fade-in duration-500">
      <div className="max-w-md w-full p-8 border border-destructive/20 bg-destructive/5 rounded-2xl shadow-lg">
        <div className="bg-destructive/10 p-4 rounded-full w-fit mx-auto mb-6">
          <AlertCircle className="h-10 w-10 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-3">Error Loading SBOM</h1>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          {error || "We encountered an unexpected problem while loading the SBOM data. Please verify the file format and try again."}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button 
            onClick={retry} 
            className="gap-2 px-8 py-6 h-auto text-lg font-semibold shadow-md"
          >
            <RotateCcw className="h-5 w-5" />
            Try Again
          </Button>
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
            className="gap-2 px-8 py-6 h-auto text-lg font-semibold"
          >
            Reload App
          </Button>
        </div>
        {import.meta.env.DEV && (
           <div className="mt-8 text-left">
             <details className="text-[10px] p-2 bg-background/50 border rounded font-mono">
               <summary className="cursor-pointer text-muted-foreground hover:text-foreground mb-1">
                 Stack trace (Dev only)
               </summary>
               <pre className="whitespace-pre-wrap overflow-auto max-h-40">
                 {new Error().stack}
               </pre>
             </details>
           </div>
        )}
      </div>
    </div>
  );

  const mainContent = error ? (
    errorScreen
  ) : !sbom ? (
    loadingScreen
  ) : (
    <AppContent
      sbom={sbom}
      formattedSbom={formattedSbom}
      sbomStats={sbomStats}
      currentFile={currentFile}
      onImport={handleImport}
      manifest={manifest}
      processingLogs={processingLogs}
    />
  );

  return (
    <ErrorBoundary>
      <LayoutProvider>
        <SettingsProvider>
          <VexProvider>
            <ViewProvider>
              <SelectionProvider>
                <SbomProvider value={{ 
                  sbom, 
                  formattedSbom, 
                  sbomStats, 
                  scoreHistory,
                  currentFile,
                  manifest,
                  onImport: handleImport,
                  processingLogs
                }}>
                  <Layout sbom={sbom}>{mainContent}</Layout>
                </SbomProvider>
              </SelectionProvider>
            </ViewProvider>
          </VexProvider>
        </SettingsProvider>
      </LayoutProvider>
    </ErrorBoundary>
  );
}

export default App;
