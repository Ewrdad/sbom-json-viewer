import { useEffect, useState } from "react";
import { type Bom } from "@cyclonedx/cyclonedx-library/Models";
import { tick } from "../lib/asyncUtils";

import { type SbomStats } from "../types/sbom";
import { calculateSbomStats } from "../lib/statsUtils";

export function useSbomStats(sbom: Bom | null): SbomStats | null {
  const [stats, setStats] = useState<SbomStats | null>(null);

  useEffect(() => {
    if (!sbom) {
      setStats(null);
      return;
    }

    let cancelled = false;
    const run = async () => {
      // Use the shared utility
      const computed = calculateSbomStats(sbom);
      // Wait a tick to simulate async if needed (original code did it)
      await tick();
      if (!cancelled) {
        setStats(computed);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [sbom]);

  return stats;
}

