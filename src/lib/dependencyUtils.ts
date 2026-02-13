/**
 * Calculates the reverse dependency graph (dependents) from a dependency graph.
 * 
 * @param dependencyGraph A map where keys are component IDs and values are arrays of dependency IDs.
 * @returns A map where keys are component IDs and values are arrays of IDs of components that depend on them.
 */
export const calculateDependents = (
  dependencyGraph: Map<string, string[]>
): Map<string, string[]> => {
  const dependents = new Map<string, string[]>();

  // Initialize entry for every component in the dependency graph
  for (const [componentId] of dependencyGraph) {
    if (!dependents.has(componentId)) {
        dependents.set(componentId, []);
    }
  }

  // Populate dependents
  for (const [parentId, children] of dependencyGraph) {
    for (const childId of children) {
      if (!dependents.has(childId)) {
        dependents.set(childId, []);
      }
      dependents.get(childId)?.push(parentId);
    }
  }

  return dependents;
};

/**
 * Calculates the total number of transitive dependents (blast radius) for each component.
 * Uses a breadth-first search (BFS) approach with memoization for efficiency.
 * 
 * @param dependentsGraph The inverse dependency graph (child -> parents)
 * @returns A map where keys are component IDs and values are the total count of transitive dependents.
 */
export const calculateTransitiveDependents = (
  dependentsGraph: Map<string, string[]>
): Map<string, number> => {
  const result = new Map<string, number>();

  for (const [id] of dependentsGraph) {
    const visited = new Set<string>();
    const queue = [...(dependentsGraph.get(id) || [])];
    
    let head = 0;
    while (head < queue.length) {
      const currentId = queue[head++];
      if (!visited.has(currentId)) {
        visited.add(currentId);
        const parents = dependentsGraph.get(currentId) || [];
        for (const p of parents) {
          if (!visited.has(p)) {
            queue.push(p);
          }
        }
      }
    }
    
    visited.delete(id); // Don't count yourself in your own blast radius
    result.set(id, visited.size);
  }

  return result;
};
