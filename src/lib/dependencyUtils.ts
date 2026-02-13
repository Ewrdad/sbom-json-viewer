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
