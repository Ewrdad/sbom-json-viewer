import { useEffect, useState } from "react";
import { type Bom } from "@cyclonedx/cyclonedx-library/Models";
import {
  analyzeDependenciesAsync,
  type DependencyAnalysis,
} from "../lib/bomUtils";

export const useDependencyAnalysis = (
  sbom: Bom | null,
): { analysis: DependencyAnalysis | null; status: "idle" | "processing" } => {
  const [analysis, setAnalysis] = useState<DependencyAnalysis | null>(null);
  const [status, setStatus] = useState<"idle" | "processing">("idle");

  useEffect(() => {
    let cancelled = false;
    if (!sbom) {
      setAnalysis(null);
      setStatus("idle");
      return;
    }

    setStatus("processing");

    (async () => {
      try {
        const result = await analyzeDependenciesAsync(sbom);
        if (!cancelled) {
          setAnalysis(result);
          setStatus("idle");
        }
      } catch (error) {
        console.error("Dependency analysis failed", error);
        if (!cancelled) {
          setAnalysis(null);
          setStatus("idle");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sbom]);

  return { analysis, status };
};
