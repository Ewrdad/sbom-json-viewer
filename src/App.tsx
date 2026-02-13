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
const ReverseDependencyTree = lazy(() =>
  import("./components/views/ReverseDependencyTree").then((module) => ({
    default: module.ReverseDependencyTree,
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
  manifest,
}: {
  sbom: Bom | null;
  formattedSbom: formattedSBOM | null;
  sbomStats: SbomStats | null;
  currentFile: string;
  setCurrentFile: (f: string) => void;
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
          <div className="w-px h-8 bg-border mx-2" />
          {manifest?.files.map((file) => (
            <Button
              key={file.id}
              variant={currentFile === file.id ? "default" : "outline"}
              size="sm"
              onClick={() => {
                window.location.hash = `#/${file.id}`;
              }}
            >
              {file.name}
            </Button>
          ))}
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
              <DashboardView sbom={sbom} preComputedStats={sbomStats} />
            </ErrorBoundary>
          </KeepAliveView>

          <KeepAliveView activeView={activeView} viewKey="vulnerabilities">
            <ErrorBoundary resetKeys={[sbom]}>
              <VulnerabilitiesView sbom={sbom} preComputedStats={sbomStats} />
            </ErrorBoundary>
          </KeepAliveView>
          
          <KeepAliveView activeView={activeView} viewKey="licenses">
            <ErrorBoundary resetKeys={[sbom]}>
              <LicensesView sbom={sbom} preComputedStats={sbomStats} />
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

interface ManifestFile {
  name: string;
  path: string;
  id: string;
}

interface Manifest {
  default: string;
  files: ManifestFile[];
}

export function App() {
  const [sbom, setSbom] = useState<Bom | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<string>("");
  const [loadingState, setLoadingState] = useState<LoadingState>({
    status: "loading",
    message: "Preparing viewer...",
    progress: null,
  });
  const [manifest, setManifest] = useState<Manifest | null>(null);
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
              if (formatted.dependentsGraph) {
                formatted.dependentsGraph = new Map(Object.entries(formatted.dependentsGraph));
              } else {
                formatted.dependentsGraph = new Map();
              }
              if (formatted.blastRadius) {
                formatted.blastRadius = new Map(Object.entries(formatted.blastRadius));
              } else {
                formatted.blastRadius = new Map();
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
    async (url: string, filename: string) => {
      const loadId = ++loadSequence.current;
      setSbom(null);
      setFormattedSbom(null);
      setSbomStats(null);
      setError(null);
      updateLoading(`Preparing ${filename}...`, null);

      try {
        await processWithWorker({ url, filename }, loadId);
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
    const fetchManifest = async () => {
      try {
        const response = await fetch("/sboms/manifest.json");
        if (response.ok) {
          const data = await response.json();
          setManifest(data);
        }
      } catch (err) {
        console.error("Failed to fetch manifest:", err);
      }
    };
    fetchManifest();
  }, []);

  useEffect(() => {
    if (!manifest) return;

    const handleHashChange = () => {
      const hash = window.location.hash;
      let targetId = "";
      let targetUrl = "";

      if (hash.startsWith("#/")) {
        targetId = hash.substring(2);
        const found = manifest.files.find((f) => f.id === targetId);
        if (found) {
          targetUrl = `/${found.path}`;
        } else {
          // Direct mapping fallback
          const parts = targetId.split("/");
          if (parts.length >= 2) {
            targetUrl = `/sboms/${targetId}.sbom.json`;
          }
        }
      } else if (!currentFile.startsWith("Local:")) {
        // Use default from manifest
        targetId = manifest.default;
        const found = manifest.files.find((f) => f.id === targetId);
        if (found) {
          targetUrl = `/${found.path}`;
        }
      }

      // Only load if it's a new file and not already loading it
      if (targetId && targetId !== currentFile) {
        loadSBOM(targetUrl, targetId);
        setCurrentFile(targetId);
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    handleHashChange();

    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [loadSBOM, currentFile, manifest]);

  useEffect(() => {
    // If we are in local mode, we don't want the hash change to trigger anything
    // but the above effect already handles that by checking startsWith("Local:")
  }, [currentFile]);

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
    
    // Attempt to reconstruct URL from currentFile if manifest is present
    if (manifest) {
      const found = manifest.files.find(f => f.id === currentFile);
      if (found) {
        loadSBOM(`/${found.path}`, currentFile);
        return;
      }
    }
    
    // Fallback logic
    const parts = currentFile.split("/");
    if (parts.length >= 2) {
      loadSBOM(`/sboms/${currentFile}.sbom.json`, currentFile);
    } else {
      loadSBOM(`/sboms/examples/${currentFile}.sbom.json`, currentFile);
    }
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
      manifest={manifest}
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
