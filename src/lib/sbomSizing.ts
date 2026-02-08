import { type Bom } from "@cyclonedx/cyclonedx-library/Models";

export const LARGE_SBOM_COMPONENT_THRESHOLD = 15000;

export type SbomSizeProfile = {
  componentCount: number;
  isLarge: boolean;
};

/**
 * Centralized sizing heuristic for performance-sensitive views.
 * Why: Large SBOMs can make deep formatting and graph rendering memory-heavy.
 */
export const getSbomSizeProfile = (sbom: Bom): SbomSizeProfile => {
  const componentCount = sbom.components.size;
  return {
    componentCount,
    isLarge: componentCount >= LARGE_SBOM_COMPONENT_THRESHOLD,
  };
};
