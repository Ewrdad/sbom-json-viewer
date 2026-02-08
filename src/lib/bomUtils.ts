import { type Bom, type Component } from "@cyclonedx/cyclonedx-library/Models";
import { batchProcess } from "./asyncUtils";

export interface DependencyAnalysis {
  dependencyMap: Map<string, string[]>;
  inverseDependencyMap: Map<string, string[]>;
  componentMap: Map<string, Component>;
}

/**
 * Builds dependency maps for efficient traversal
 */
export const analyzeDependencies = (sbom: any): DependencyAnalysis => {
  const dependencyMap = new Map<string, string[]>();
  const inverseDependencyMap = new Map<string, string[]>();
  const componentMap = new Map<string, any>();

  const components = Array.isArray(sbom.components) ? sbom.components : Array.from(sbom.components || []);

  // Initial pass to build component map and collect all refs
  components.forEach((comp) => {
    const ref = typeof comp.bomRef === 'string' ? comp.bomRef : comp.bomRef?.value;
    if (ref) {
      componentMap.set(ref, comp);
    }
  });

  // Second pass to build dependency maps
  components.forEach((comp) => {
    const ref = typeof comp.bomRef === 'string' ? comp.bomRef : comp.bomRef?.value;
    if (!ref) return;

    const deps: string[] = [];
    const compDeps = Array.isArray(comp.dependencies) ? comp.dependencies : Array.from(comp.dependencies || []);
    
    compDeps.forEach((depRef: any) => {
      const dRef = typeof depRef === 'string' ? depRef : depRef.value;
      if (dRef) {
        deps.push(dRef);

        // Track inverse
        const inverse = inverseDependencyMap.get(dRef) || [];
        if (!inverse.includes(ref)) {
          inverse.push(ref);
          inverseDependencyMap.set(dRef, inverse);
        }
      }
    });

    if (deps.length > 0) {
      dependencyMap.set(ref, deps);
    }
  });

  return { dependencyMap, inverseDependencyMap, componentMap };
};

export const analyzeDependenciesAsync = async (
  sbom: any,
): Promise<DependencyAnalysis> => {
  const dependencyMap = new Map<string, string[]>();
  const inverseDependencyMap = new Map<string, string[]>();
  const componentMap = new Map<string, any>();

  const components: any[] = Array.isArray(sbom.components) ? sbom.components : Array.from(sbom.components || []);
  
  await batchProcess(components, (comp: any) => {
    const ref = typeof comp.bomRef === 'string' ? comp.bomRef : comp.bomRef?.value;
    if (ref) {
      componentMap.set(ref, comp);
    }
  });

  await batchProcess(components, (comp) => {
    const ref = typeof comp.bomRef === 'string' ? comp.bomRef : comp.bomRef?.value;
    if (!ref) return;

    const deps: string[] = [];
    const compDeps = Array.isArray(comp.dependencies) ? comp.dependencies : Array.from(comp.dependencies || []);

    compDeps.forEach((depRef: any) => {
      const dRef = typeof depRef === 'string' ? depRef : depRef.value;
      if (dRef) {
        deps.push(dRef);
        const inverse = inverseDependencyMap.get(dRef) || [];
        if (!inverse.includes(ref)) {
          inverse.push(ref);
          inverseDependencyMap.set(dRef, inverse);
        }
      }
    });

    if (deps.length > 0) {
      dependencyMap.set(ref, deps);
    }
  });

  return { dependencyMap, inverseDependencyMap, componentMap };
};

/**
 * Finds all ancestors (transitive "Used By") for a component
 */
export const getAncestors = (
  ref: string,
  inverseMap: Map<string, string[]>,
  visited = new Set<string>(),
): string[] => {
  if (visited.has(ref)) return [];
  visited.add(ref);

  const direct = inverseMap.get(ref) || [];
  let ancestors = [...direct];

  direct.forEach((parent) => {
    ancestors = [...ancestors, ...getAncestors(parent, inverseMap, visited)];
  });

  return Array.from(new Set(ancestors));
};
