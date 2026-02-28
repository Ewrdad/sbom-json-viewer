import type { EnhancedComponent, formattedSBOM } from "../../types/sbom";
import { formatComponentName } from "../utils";

export type MermaidBuildOptions = {
  maxDepth: number;
  query: string;
  pruneNonMatches: boolean;
  showVulnerableOnly: boolean;
  maxNodes?: number;
  maxEdges?: number;
  maxLabelLength?: number;
  rootRefs?: string[];
  enableGrouping?: boolean;
  onProgress?: (message: string) => void;
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
  const name = sanitizeLabelText(formatComponentName(component.name || "Unnamed Component"));
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

const tick = () => new Promise(resolve => setTimeout(resolve, 0));

/**
 * Build a Mermaid flowchart for the SBOM dependency tree using flat structure.
 */
export const buildMermaidDiagram = async (
  formattedSbom: formattedSBOM,
  options: MermaidBuildOptions,
): Promise<MermaidBuildResult> => {
  const maxNodes = options.maxNodes ?? 320;
  const maxEdges = options.maxEdges ?? 640;
  const maxLabelLength = options.maxLabelLength ?? 160;
  const enableGrouping = options.enableGrouping ?? true; 
  const onProgress = options.onProgress;

  if (onProgress) onProgress("Initializing graph builder...");
  await tick();

  const idMap = new Map<string, string>();
  let idCounter = 0;
  const nodes = new Map<string, string>();
  const edges = new Set<string>();
  const flowChartEdges: string[] = [];
  let truncated = false;

  const { componentMap, dependencyGraph, topLevelRefs } = formattedSbom;

  const getNodeId = (ref: string) => {
    if (idMap.has(ref)) return idMap.get(ref)!;
    const id = `node_${idCounter++}`;
    idMap.set(ref, id);
    return id;
  };

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

  const queue: { ref: string; depth: number; parentRef?: string }[] = [];
  const expandedRefs = new Set<string>();

  const initialRoots = options.rootRefs && options.rootRefs.length > 0 
    ? options.rootRefs 
    : topLevelRefs;

  const filteredRoots = options.showVulnerableOnly
    ? initialRoots.filter(ref => {
        const comp = componentMap.get(ref);
        return comp ? hasAnyVulnerability(comp) : false;
      })
    : initialRoots;

  filteredRoots.forEach(root => {
    if (shouldIncludeNode(root)) {
      queue.push({ ref: root, depth: 0 });
    }
  });

  const renderedNodes = new Set<string>();
  let processCount = 0;

  while (queue.length > 0) {
    if (nodes.size >= maxNodes || flowChartEdges.length >= maxEdges) {
      truncated = true;
      break;
    }

    const { ref, depth, parentRef } = queue.shift()!;
    const component = componentMap.get(ref);

    if (!component) continue;

    processCount++;
    if (processCount % 50 === 0) {
      if (onProgress) onProgress(`Processed ${processCount} nodes...`);
      await tick();
    }

    // Process Node
    const nodeId = getNodeId(ref);
    if (!renderedNodes.has(ref)) {
      if (nodes.size >= maxNodes) {
        truncated = true;
        break;
      }
      const label = buildLabel(component, maxLabelLength);
      const klass = severityClass(component);
      nodes.set(ref, `${nodeId}["${label}"]:::${klass}`);
      renderedNodes.add(ref);
    }

    // Process Edge
    if (parentRef) {
      const parentId = getNodeId(parentRef);
      const edgeKey = `${parentId}->${nodeId}`;
      if (!edges.has(edgeKey)) {
        if (flowChartEdges.length >= maxEdges) {
          truncated = true;
          break;
        }
        flowChartEdges.push(`${parentId} --> ${nodeId}`);
        edges.add(edgeKey);
      }
    }

    // Enqueue Children if not already expanded
    if (depth < options.maxDepth && !expandedRefs.has(ref)) {
      const deps = dependencyGraph.get(ref) || [];
      deps.forEach(childRef => {
        if (shouldIncludeNode(childRef)) {
          queue.push({ ref: childRef, depth: depth + 1, parentRef: ref });
        }
      });
      expandedRefs.add(ref);
    }
  }

  if (onProgress) onProgress("Generating diagram string...");
  await tick();

  // Group nodes
  const nodesByGroup = new Map<string, string[]>();
  const ungroupedNodes: string[] = [];

  nodes.forEach((def, ref) => {
    const component = componentMap.get(ref);
    const group = component?.group;
    
    if (enableGrouping && group && group.trim().length > 0) {
      if (!nodesByGroup.has(group)) {
        nodesByGroup.set(group, []);
      }
      nodesByGroup.get(group)!.push(def);
    } else {
      ungroupedNodes.push(def);
    }
  });

  const diagramParts: string[] = [
    "flowchart LR",
    "classDef critical fill:#7f1d1d,stroke:#fecaca,color:#fff;",
    "classDef high fill:#b45309,stroke:#fed7aa,color:#111;",
    "classDef medium fill:#a16207,stroke:#fde68a,color:#111;",
    "classDef low fill:#0f766e,stroke:#99f6e4,color:#fff;",
    "classDef clean fill:#1e3a8a,stroke:#bfdbfe,color:#fff;"
  ];

  // Add subgroups
  nodesByGroup.forEach((groupNodes, groupName) => {
    // Sanitize group name for ID
    const groupId = `group_${groupName.replace(/[^a-zA-Z0-9]/g, '_')}`;
    diagramParts.push(`subgraph ${groupId} ["${groupName}"]`);
    diagramParts.push("direction TB");
    diagramParts.push(...groupNodes);
    diagramParts.push("end");
  });

  diagramParts.push(...ungroupedNodes);
  diagramParts.push(...flowChartEdges);

  if (renderedNodes.size === 0) {
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

  return {
    diagram: diagramParts.join("\n"),
    nodeCount: nodes.size,
    edgeCount: edges.size,
    truncated,
    maxNodes,
    maxEdges,
  };
};
