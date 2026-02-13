import { type EnhancedComponent } from "../types/sbom";

export interface FlatNode {
  node: EnhancedComponent;
  ref: string;
  level: number;
  path: string;
  hasChildren: boolean;
  isExpanded: boolean;
}

/**
 * Iteratively flattens a dependency tree into a list of nodes for virtualized rendering.
 */
export const flattenTree = (
  componentRefs: string[],
  componentMap: Map<string, EnhancedComponent>,
  dependencyGraph: Map<string, string[]>,
  expandedPaths: Set<string>,
  visibleRefs: Set<string> | null = null,
): FlatNode[] => {
  const result: FlatNode[] = [];
  const stack: { refs: string[]; level: number; path: string; index: number }[] = [
    { refs: componentRefs, level: 0, path: "", index: 0 }
  ];

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    
    if (current.index >= current.refs.length) {
      stack.pop();
      continue;
    }

    const ref = current.refs[current.index++];
    const node = componentMap.get(ref);
    if (!node) continue;
    
    if (visibleRefs && !visibleRefs.has(ref)) continue;

    const nodePath = current.path ? `${current.path}/${ref}` : ref;
    const deps = dependencyGraph.get(ref) || [];
    const hasChildren = deps.length > 0;
    
    const isExpanded = visibleRefs 
      ? hasChildren
      : expandedPaths.has(nodePath);

    result.push({
      node,
      ref,
      level: current.level,
      path: nodePath,
      hasChildren,
      isExpanded,
    });

    if (isExpanded && hasChildren) {
      stack.push({
        refs: deps,
        level: current.level + 1,
        path: nodePath,
        index: 0,
      });
    }
  }
  
  return result;
};
