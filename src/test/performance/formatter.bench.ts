/**
 * Performance benchmarks for Formatter
 * Why: Provides a repeatable baseline for formatting larger SBOMs
 */

import { bench, describe } from "vitest";
import { Formatter } from "@/renderer/Formatter/Formatter";
import { createLargeBom } from "@/test/mockData";

const createNoopProgress = () => () => {
  // Why: Formatter requires progress updates; bench should focus on runtime cost
};

describe("Formatter performance", () => {
  const mediumBom = createLargeBom({
    depth: 4,
    fanout: 4,
    vulnerabilitiesPerLeaf: 2,
  });

  bench("formats medium SBOM", async () => {
    await Formatter({ rawSBOM: mediumBom, setProgress: createNoopProgress() });
  });
});
