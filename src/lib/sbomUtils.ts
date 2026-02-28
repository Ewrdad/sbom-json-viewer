/**
 * Removes internal tracking properties and metadata from an SBOM object
 * to return a "clean" CycloneDX-compliant representation.
 */
export function cleanSbomMetadata(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(cleanSbomMetadata);
  }

  // Clone to avoid mutating original
  const clean: any = {};
  
  // List of internal properties to exclude
  const internalProps = [
    '_raw',
    '_rawSources',
    '__multiSbomStats',
    'sourceInfo',
    'vulnerabilities', // We often calculate these ourselves for components
    'licenseDistribution',
    'transitiveLicenseDistribution'
  ];

  for (const [key, value] of Object.entries(obj)) {
    if (internalProps.includes(key)) continue;
    
    // Recurse for nested objects/arrays
    clean[key] = cleanSbomMetadata(value);
  }

  return clean;
}

/**
 * Finds the shortest path from a component to a root using Breadth-First Search.
 * Uses the inverseDependencyMap (child -> parents)
 */
export function getPathToRoot(
  targetRef: string,
  inverseDependencyMap: Map<string, string[]>,
  componentMap: Map<string, any>
): any[] | null {
  if (!targetRef || !componentMap.has(targetRef)) return null;
  
  const queue: { ref: string; path: any[] }[] = [
    { ref: targetRef, path: [componentMap.get(targetRef)] }
  ];
  const visited = new Set<string>([targetRef]);

  while (queue.length > 0) {
    const { ref, path } = queue.shift()!;
    const parents = inverseDependencyMap.get(ref) || [];

    if (parents.length === 0) {
      // Found a root! (no parents)
      return path.reverse();
    }

    for (const parentRef of parents) {
      if (!visited.has(parentRef)) {
        visited.add(parentRef);
        const parentComp = componentMap.get(parentRef);
        queue.push({ 
          ref: parentRef, 
          path: [...path, parentComp] 
        });
      }
    }
  }

  return null;
}
