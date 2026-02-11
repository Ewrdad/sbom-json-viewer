import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ViewProvider, useView } from "./context/ViewContext";
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
import type { Bom } from "@cyclonedx/cyclonedx-library/Models";
import { Upload } from "lucide-react";
import {
  type SbomStats,
  type formattedSBOM,
} from "./types/sbom";
import { getSbomSizeProfile } from "./lib/sbomSizing";
import { KeepAliveView } from "./components/common/KeepAliveView";

function AppContent({
  sbom,
  formattedSbom,
  sbomStats,
  currentFile,
  setCurrentFile,
  onImport,
}: {
  sbom: Bom | null;
  formattedSbom: formattedSBOM | null;
  sbomStats: SbomStats | null;
  currentFile: string;
  setCurrentFile: (f: string) => void;
  onImport: (file: File) => void;
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
          <div className="w-px h-8 bg-border mx-2" />
          <Button
            variant={
              currentFile === "sample-simple.cyclonedx.json"
                ? "default"
                : "outline"
            }
            size="sm"
            onClick={() => setCurrentFile("sample-simple.cyclonedx.json")}
          >
            Simple Sample
          </Button>
          <Button
            variant={
              currentFile === "sbom.cyclonedx.json" ? "default" : "outline"
            }
            size="sm"
            onClick={() => setCurrentFile("sbom.cyclonedx.json")}
          >
            Full SBOM
          </Button>
          <Button
            variant={
              currentFile === "sbom-huge.json" ? "default" : "outline"
            }
            size="sm"
            onClick={() => setCurrentFile("sbom-huge.json")}
          >
            Huge SBOM (20k)
          </Button>
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
            <DashboardView sbom={sbom} preComputedStats={sbomStats} />
          </KeepAliveView>

          <KeepAliveView activeView={activeView} viewKey="vulnerabilities">
            <VulnerabilitiesView sbom={sbom} preComputedStats={sbomStats} />
          </KeepAliveView>
          
          <KeepAliveView activeView={activeView} viewKey="licenses">
            <LicensesView sbom={sbom} preComputedStats={sbomStats} />
          </KeepAliveView>
          
          <KeepAliveView activeView={activeView} viewKey="explorer">
            <ComponentExplorer sbom={sbom} formattedSbom={formattedSbom} />
          </KeepAliveView>

          <KeepAliveView activeView={activeView} viewKey="tree">
            <DependencyTree sbom={sbom} formattedSbom={formattedSbom} />
          </KeepAliveView>

          <KeepAliveView activeView={activeView} viewKey="graph">
            <DependencyGraph sbom={sbom} formattedSbom={formattedSbom} />
          </KeepAliveView>

          <KeepAliveView activeView={activeView} viewKey="metadata">
            <MetadataView sbom={sbom} />
          </KeepAliveView>
        </Suspense>
      </div>
    </div>
  );
}

// Utility helpers for progress reporting removed - now handled in worker for reliability

type LoadingState = {
  status: "idle" | "loading";
  message: string;
  progress: number | null;
};

export function App() {
  const [sbom, setSbom] = useState<Bom | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<string>(
    "sample-simple.cyclonedx.json",
  );
  const [loadingState, setLoadingState] = useState<LoadingState>({
    status: "loading",
    message: "Preparing viewer...",
    progress: null,
  });
  const loadSequence = useRef(0);

  const [formattedSbom, setFormattedSbom] = useState<formattedSBOM | null>(null);
  const [sbomStats, setSbomStats] = useState<SbomStats | null>(null);

  const updateLoading = useCallback(
    (message: string, progress: number | null = null) => {
      setLoadingState({ status: "loading", message, progress });
    },
    [],
  );

  const resetLoading = useCallback(() => {
    setLoadingState({ status: "idle", message: "", progress: null });
  }, []);

  const processWithWorker = useCallback((options: { jsonText?: string; url?: string; file?: File; filename: string }, loadId: number) => {
    return new Promise<void>((resolve, reject) => {
      const worker = new Worker(new URL("./workers/sbomWorker.ts", import.meta.url), {
        type: "module",
      });

      worker.onmessage = (e) => {
        if (loadSequence.current !== loadId) {
          worker.terminate();
          return;
        }

        const { type, message, progress, result } = e.data;
        if (type === "progress") {
          updateLoading(message, progress / 100);
        } else if (type === "complete") {
          if (!result) {
            setError("Worker error: complete message missing result");
            resetLoading();
            worker.terminate();
            reject(new Error("complete message missing result"));
            return;
          }

          // Revive Maps from plain objects sent by worker
          const formatted = result.formatted;
          if (formatted) {
            try {
              if (formatted.componentMap) {
                formatted.componentMap = new Map(Object.entries(formatted.componentMap));
              } else {
                formatted.componentMap = new Map();
              }
              if (formatted.dependencyGraph) {
                formatted.dependencyGraph = new Map(Object.entries(formatted.dependencyGraph));
              } else {
                formatted.dependencyGraph = new Map();
              }
            } catch (err) {
              console.error("Map revival failed", err);
              // Continue anyway, UI will handle partial data
            }
          }
          
          setSbom(result.bom);
          setFormattedSbom(formatted);
          setSbomStats(result.stats);
          resetLoading();
          worker.terminate();
          resolve();
        } else if (type === "error") {
          setError(message);
          resetLoading();
          worker.terminate();
          reject(new Error(message));
        }
      };

      worker.onerror = (e) => {
        setError("Worker error: " + e.message);
        resetLoading();
        worker.terminate();
        reject(new Error(e.message));
      };

      worker.postMessage(options);
    });
  }, [updateLoading, resetLoading]);

  const loadSBOM = useCallback(
    async (filename: string) => {
      const loadId = ++loadSequence.current;
      setSbom(null);
      setFormattedSbom(null);
      setSbomStats(null);
      setError(null);
      updateLoading(`Preparing ${filename}...`, null);

      try {
        await processWithWorker({ url: `/${filename}`, filename }, loadId);
      } catch (err) {
        if (loadSequence.current !== loadId) return;
        const message =
          err instanceof Error ? err.message : "Failed to load SBOM";
        setError(message);
        console.error("Error loading SBOM:", err);
        resetLoading();
      }
    },
    [processWithWorker, resetLoading, updateLoading],
  );

  useEffect(() => {
    if (currentFile.endsWith(".json") && !currentFile.startsWith("Local:")) {
      loadSBOM(currentFile);
    }
  }, [currentFile, loadSBOM]);

  const handleImport = useCallback(
    async (file: File) => {
      const loadId = ++loadSequence.current;
      setSbom(null);
      setFormattedSbom(null);
      setSbomStats(null);
      setError(null);
      setCurrentFile(`Local: ${file.name}`);
      updateLoading(`Preparing ${file.name}...`, 0);

      try {
        await processWithWorker({ file, filename: file.name }, loadId);
      } catch (err) {
        if (loadSequence.current !== loadId) return;
        const message =
          err instanceof Error ? err.message : "Failed to process SBOM import";
        setError(message);
        console.error("Error importing SBOM:", err);
        resetLoading();
      }
    },
    [processWithWorker, resetLoading, updateLoading],
  );

  const handleRetry = () => {
    setError(null);
    if (currentFile.startsWith("Local:")) {
      resetLoading();
      return;
    }
    loadSBOM(currentFile);
  };

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
      <Button onClick={handleRetry}>Retry</Button>
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
      setCurrentFile={setCurrentFile}
      onImport={handleImport}
    />
  );

  return (
    <ErrorBoundary>
      <ViewProvider>
        <Layout>{mainContent}</Layout>
      </ViewProvider>
    </ErrorBoundary>
  );
}

export default App;
