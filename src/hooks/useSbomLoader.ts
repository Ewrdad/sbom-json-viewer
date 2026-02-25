import { useCallback, useEffect, useRef, useState } from "react";
import type { Bom } from "@cyclonedx/cyclonedx-library/Models";
import type { formattedSBOM, SbomStats } from "@/types/sbom";

type LoadingState = {
  status: "idle" | "loading";
  message: string;
  progress: number | null;
};

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

export function useSbomLoader() {
  const [sbom, setSbom] = useState<Bom | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<string>("");
  const [loadingState, setLoadingState] = useState<LoadingState>({
    status: "loading",
    message: "Preparing viewer...",
    progress: null,
  });
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [formattedSbom, setFormattedSbom] = useState<formattedSBOM | null>(null);
  const [sbomStats, setSbomStats] = useState<SbomStats | null>(null);

  const loadSequence = useRef(0);

  const updateLoading = useCallback(
    (message: string, progress: number | null = null) => {
      setLoadingState({ status: "loading", message, progress });
    },
    [],
  );

  const resetLoading = useCallback(() => {
    setLoadingState({ status: "idle", message: "", progress: null });
  }, []);

  const processWithWorker = useCallback(
    (
      options: {
        jsonText?: string;
        url?: string;
        file?: File;
        files?: File[];
        filename: string;
      },
      loadId: number,
    ) => {
      return new Promise<void>((resolve, reject) => {
        const worker = new Worker(
          new URL("../workers/sbomWorker.ts", import.meta.url),
          {
            type: "module",
          },
        );

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
                  formatted.componentMap = new Map(
                    Object.entries(formatted.componentMap),
                  );
                } else {
                  formatted.componentMap = new Map();
                }
                if (formatted.dependencyGraph) {
                  formatted.dependencyGraph = new Map(
                    Object.entries(formatted.dependencyGraph),
                  );
                } else {
                  formatted.dependencyGraph = new Map();
                }
                if (formatted.dependentsGraph) {
                  formatted.dependentsGraph = new Map(
                    Object.entries(formatted.dependentsGraph),
                  );
                } else {
                  formatted.dependentsGraph = new Map();
                }
                if (formatted.blastRadius) {
                  formatted.blastRadius = new Map(
                    Object.entries(formatted.blastRadius),
                  );
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
    },
    [updateLoading, resetLoading],
  );

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

  const handleImport = useCallback(
    async (files: File[]) => {
      const loadId = ++loadSequence.current;
      setSbom(null);
      setFormattedSbom(null);
      setSbomStats(null);
      setError(null);
      
      const fileNameDisplay = files.length === 1 ? files[0].name : `Merged: ${files.map(f => f.name).join(', ')}`;
      setCurrentFile(`Local: ${fileNameDisplay}`);
      updateLoading(`Preparing ${fileNameDisplay}...`, 0);

      try {
        await processWithWorker({ files, filename: fileNameDisplay }, loadId);
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

  const retry = () => {
    setError(null);
    if (currentFile.startsWith("Local:")) {
      resetLoading();
      return;
    }

    // Attempt to reconstruct URL from currentFile if manifest is present
    if (manifest) {
      const found = manifest.files.find((f) => f.id === currentFile);
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

  return {
    sbom,
    formattedSbom,
    sbomStats,
    error,
    currentFile,
    setCurrentFile,
    loadingState,
    manifest,
    handleImport,
    retry,
  };
}
