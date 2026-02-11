import type { EnhancedComponent, formattedSBOM } from "../../types/sbom";

export type MermaidBuildOptions = {
  maxDepth: number;
  query: string;
  pruneNonMatches: boolean;
  showVulnerableOnly: boolean;
  maxNodes?: number;
  maxEdges?: number;
  maxLabelLength?: number;
  rootRefs?: string[];
};

type MermaidBuildResult = {
  diagram: string;
  nodeCount: number;
  edgeCount: number;
  truncated: boolean;
  maxNodes: number;
  maxEdges: number;
};

const normalize = (value: string) => value.toLowerCase();

const matchesQuery = (component: EnhancedComponent, query: string) => {
  if (!query.trim()) return true;
  const haystack = [
    component.name,
    component.group,
    component.bomRef?.value,
    typeof component.purl === "string"
      ? component.purl
      : component.purl?.toString?.(),
  ]
    .filter(Boolean)
    .join(" ");

  return normalize(haystack).includes(normalize(query));
};

const hasAnyVulnerability = (component: EnhancedComponent) => {
  const { inherent, transitive } = component.vulnerabilities;
  const count =
    inherent.Critical.length +
    inherent.High.length +
    inherent.Medium.length +
    inherent.Low.length +
    transitive.Critical.length +
    transitive.High.length +
    transitive.Medium.length +
    transitive.Low.length;
  return count > 0;
};

const sanitizeLabelText = (value: string) =>
  value
    .replace(/\\/g, "\\\\") // Escape backslashes
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;") // Escape quotes
    .replace(/\n/g, "<br/>"); // Use <br/> for newlines in Mermaid

const buildLabel = (component: EnhancedComponent, maxLabelLength: number) => {
  const name = sanitizeLabelText(component.name || "Unnamed Component");
  const version = component.version ? sanitizeLabelText(component.version) : "";
  const { inherent, transitive } = component.vulnerabilities;
  const inherentTotal =
    inherent.Critical.length +
    inherent.High.length +
    inherent.Medium.length +
    inherent.Low.length;
  const transitiveTotal =
    transitive.Critical.length +
    transitive.High.length +
    transitive.Medium.length +
    transitive.Low.length;
  const total = inherentTotal + transitiveTotal;
  const vulnSummaryBase =
    total === 0
      ? ""
      : `${total} vulns (${inherentTotal}nd, ${transitiveTotal}tr)`;
  const vulnSummary =
    vulnSummaryBase.length > maxLabelLength
      ? `${total} vulns`
      : vulnSummaryBase;

  const parts = [name];
  if (version) parts.push(`v${version}`);
  if (vulnSummary) parts.push(vulnSummary);

  const label = parts.join("<br/>");
  if (label.length <= maxLabelLength) return label;

  return `${label.slice(0, maxLabelLength - 3)}...`;
};

const severityClass = (component: EnhancedComponent) => {
  const { inherent, transitive } = component.vulnerabilities;
  const severityOrder: Array<keyof typeof component.vulnerabilities.inherent> =
    ["Critical", "High", "Medium", "Low"];

  for (const severity of severityOrder) {
    if (inherent[severity].length > 0 || transitive[severity].length > 0) {
      return severity.toLowerCase();
    }
  }

  return "clean";
};

/**
 * Build a Mermaid flowchart for the SBOM dependency tree using flat structure.
 */
export const buildMermaidDiagram = (
  formattedSbom: formattedSBOM,
  options: MermaidBuildOptions,
): MermaidBuildResult => {
  const maxNodes = options.maxNodes ?? 320;
  const maxEdges = options.maxEdges ?? 640;
  const maxLabelLength = options.maxLabelLength ?? 160;
  const idMap = new Map<string, string>();
  let idCounter = 0;
  const nodes: string[] = [];
  const edges: string[] = [];
  const visitedNodes = new Set<string>();
  const visitedEdges = new Set<string>();
  let truncated = false;

  const { componentMap, dependencyGraph, topLevelRefs } = formattedSbom;

  const getNodeId = (ref: string) => {
    if (idMap.has(ref)) return idMap.get(ref)!;
    const id = `node_${idCounter++}`;
    idMap.set(ref, id);
    return id;
  };

  // Helper to check if a component or its children match the query
  const memoMatchesTree = new Map<string, boolean>();
  const matchesTree = (ref: string): boolean => {
    if (memoMatchesTree.has(ref)) return memoMatchesTree.get(ref)!;
    
    const component = componentMap.get(ref);
    if (!component) return false;

    if (matchesQuery(component, options.query)) {
      memoMatchesTree.set(ref, true);
      return true;
    }

    const deps = dependencyGraph.get(ref) || [];
    const childMatch = deps.some(matchesTree);
    memoMatchesTree.set(ref, childMatch);
    return childMatch;
  };

  const shouldIncludeNode = (ref: string) => {
    if (options.pruneNonMatches && options.query.trim()) {
      return matchesTree(ref);
    }
    return true;
  };

  const walk = (
    ref: string,
    depth: number,
    parentId?: string,
  ) => {
    if (!shouldIncludeNode(ref)) return;
    if (nodes.length >= maxNodes || edges.length >= maxEdges) {
      truncated = true;
      return;
    }

    const component = componentMap.get(ref);
    if (!component) return;

    const nodeId = getNodeId(ref);
    if (!visitedNodes.has(nodeId)) {
      const label = buildLabel(component, maxLabelLength);
      const klass = severityClass(component);
      nodes.push(`${nodeId}["${label}"]:::${klass}`);
      visitedNodes.add(nodeId);
    }

    if (parentId) {
      const pId = getNodeId(parentId);
      const edgeId = `${pId}->${nodeId}`;
      if (!visitedEdges.has(edgeId)) {
        if (edges.length < maxEdges) {
          edges.push(`${pId} --> ${nodeId}`);
          visitedEdges.add(edgeId);
        } else {
          truncated = true;
          return;
        }
      }
    }

    if (depth >= options.maxDepth) return;

    const deps = dependencyGraph.get(ref) || [];
    deps.forEach((childRef) => {
      if (nodes.length >= maxNodes || edges.length >= maxEdges) {
        truncated = true;
        return;
      }
      walk(childRef, depth + 1, ref);
    });
  };

  const initialRoots = options.rootRefs && options.rootRefs.length > 0 
    ? options.rootRefs 
    : topLevelRefs;

  const filteredRoots = options.showVulnerableOnly
    ? initialRoots.filter(ref => {
        const comp = componentMap.get(ref);
        return comp ? hasAnyVulnerability(comp) : false;
      })
    : initialRoots;

  filteredRoots.forEach((rootRef) => walk(rootRef, 0));

  if (nodes.length === 0) {
    return {
      diagram: [
        "flowchart LR",
        'empty["No components matched the current filters"]',
      ].join("\n"),
      nodeCount: 0,
      edgeCount: 0,
      truncated: false,
      maxNodes,
      maxEdges,
    };
  }

  const diagram = [
    "flowchart LR",
    "classDef critical fill:#7f1d1d,stroke:#fecaca,color:#fff;",
    "classDef high fill:#b45309,stroke:#fed7aa,color:#111;",
    "classDef medium fill:#a16207,stroke:#fde68a,color:#111;",
    "classDef low fill:#0f766e,stroke:#99f6e4,color:#fff;",
    "classDef clean fill:#1e3a8a,stroke:#bfdbfe,color:#fff;",
    ...nodes,
    ...edges,
  ].join("\n");

  return {
    diagram,
    nodeCount: nodes.length,
    edgeCount: edges.length,
    truncated,
    maxNodes,
    maxEdges,
  };
};
