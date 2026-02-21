import {
  Suspense,
  lazy,
  useRef,
} from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ViewProvider, useView } from "./context/ViewContext";
import { SettingsProvider } from "./context/SettingsContext";
import { Layout } from "./components/layout/Layout";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { HelpGuide } from "./components/common/HelpGuide";
const DashboardView = lazy(() =>
  import("./components/views/DashboardView").then((module) => ({
    default: module.DashboardView,
  })),
);
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
import type { Bom } from "@cyclonedx/cyclonedx-library/Models";
import { Upload, Download } from "lucide-react";
import {
  type SbomStats,
  type formattedSBOM,
} from "./types/sbom";
import { getSbomSizeProfile } from "./lib/sbomSizing";
import { KeepAliveView } from "./components/common/KeepAliveView";
import { SbomSelector } from "./components/common/SbomSelector";
import { useSbomLoader } from "./hooks/useSbomLoader";

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
}: {
  sbom: Bom;
  formattedSbom: formattedSBOM | null;
  sbomStats: SbomStats | null;
  currentFile: string;
  onImport: (file: File) => void;
  manifest: Manifest | null;
}) {
  const { activeView } = useView();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { componentCount, isLarge } = getSbomSizeProfile(sbom);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImport(file);
    }
  };
  return (
    <div className="flex flex-col h-full p-6 pb-0">
      <header className="flex items-center justify-between pb-6 border-b mb-6 flex-none">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            {activeView.charAt(0).toUpperCase() + activeView.slice(1)}
          </h2>
          <p className="text-sm text-muted-foreground">
            Viewing: {currentFile}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            {componentCount.toLocaleString()} components
          </Badge>
          {isLarge && (
            <Badge variant="outline" className="text-[10px]">
              Large SBOM mode
            </Badge>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />
          <Button variant="outline" size="sm" onClick={handleImportClick}>
            <Upload className="h-4 w-4 mr-2" />
            Upload SBOM
          </Button>
          {sbom && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const blob = new Blob([JSON.stringify(sbom, null, 2)], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                // Sanitize currentFile for filename
                const safeName = currentFile
                  .replace("Local: ", "")
                  .replace(/\//g, "_");
                a.download = `${safeName}.sbom.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          )}
          <div className="w-px h-8 bg-border mx-2" />
          <SbomSelector
            manifest={manifest}
            currentFile={currentFile}
            onSelect={(fileId) => {
              window.location.hash = `#/${fileId}`;
            }}
          />
          <div className="w-px h-8 bg-border mx-2" />
          <HelpGuide />
        </div>
      </header>

      <div className="flex-1 overflow-hidden relative">
        <Suspense
          fallback={
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              Preparing view...
            </div>
          }
        >
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
        </Suspense>
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
    handleImport,
    retry,
  } = useSbomLoader();

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
    </div>
  );

  const errorScreen = (
    <div className="h-full flex flex-col items-center justify-center gap-4 px-6 text-center bg-muted/10">
      <h1 className="text-2xl font-bold text-red-600">Error Loading SBOM</h1>
      <p className="text-gray-600">{error}</p>
      <Button onClick={retry}>Retry</Button>
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
    />
  );

  return (
    <ErrorBoundary>
      <SettingsProvider>
        <ViewProvider>
          <Layout>{mainContent}</Layout>
        </ViewProvider>
      </SettingsProvider>
    </ErrorBoundary>
  );
}

export default App;
