import type { NestedSBOMComponent } from "@/renderer/Formatter/Formatter";

export type MermaidBuildOptions = {
  maxDepth: number;
  query: string;
  pruneNonMatches: boolean;
  showVulnerableOnly: boolean;
  maxNodes?: number;
  maxEdges?: number;
  maxLabelLength?: number;
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

const matchesQuery = (component: NestedSBOMComponent, query: string) => {
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

const hasAnyVulnerability = (component: NestedSBOMComponent) => {
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
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "'")
    .replace(/\n/g, " ");

const buildLabel = (component: NestedSBOMComponent, maxLabelLength: number) => {
  const name = sanitizeLabelText(component.name || "Unnamed Component");
  const version = component.version ? sanitizeLabelText(component.version) : "";
  const group = component.group ? sanitizeLabelText(component.group) : "";
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
      ? "No known vulnerabilities"
      : `Vulns: ${total} (direct ${inherentTotal}, inherited ${transitiveTotal})`;
  const vulnSummary =
    vulnSummaryBase.length > maxLabelLength
      ? `Vulns: ${total} (direct ${inherentTotal})`
      : vulnSummaryBase;

  const parts = [name];
  if (version) parts.push(`v${version}`);
  if (group) parts.push(group);
  parts.push(vulnSummary);

  const label = parts.join("\\n");
  if (label.length <= maxLabelLength) return label;

  return `${label.slice(0, maxLabelLength - 3)}...`;
};

const severityClass = (component: NestedSBOMComponent) => {
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
 * Build a Mermaid flowchart for the SBOM dependency tree.
 * Why: Enables exportable diagrams that mirror the viewer's filtering controls.
 */
export const buildMermaidDiagram = (
  roots: NestedSBOMComponent[],
  options: MermaidBuildOptions,
): MermaidBuildResult => {
  const maxNodes = options.maxNodes ?? 320;
  const maxEdges = options.maxEdges ?? 640;
  const maxLabelLength = options.maxLabelLength ?? 160;
  const idMap = new Map<string, string>();
  let idCounter = 0;
  const nodes: string[] = [];
  const edges: string[] = [];
  const visited = new Set<string>();
  let truncated = false;

  const getNodeId = (component: NestedSBOMComponent) => {
    const ref = component.bomRef?.value || component.name || "unknown";
    if (idMap.has(ref)) return idMap.get(ref)!;
    const id = `node_${idCounter++}`;
    idMap.set(ref, id);
    return id;
  };

  const matchesTree = (component: NestedSBOMComponent): boolean => {
    if (matchesQuery(component, options.query)) return true;
    return component.formattedDependencies?.some(matchesTree) ?? false;
  };

  const shouldIncludeNode = (component: NestedSBOMComponent) => {
    if (options.pruneNonMatches && options.query.trim()) {
      return matchesTree(component);
    }
    return true;
  };

  const walk = (
    component: NestedSBOMComponent,
    depth: number,
    parent?: NestedSBOMComponent,
  ) => {
    if (!shouldIncludeNode(component)) return;
    if (nodes.length >= maxNodes || edges.length >= maxEdges) {
      truncated = true;
      return;
    }

    const nodeId = getNodeId(component);
    if (!visited.has(nodeId)) {
      const label = buildLabel(component, maxLabelLength);
      const klass = severityClass(component);
      nodes.push(`${nodeId}["${label}"]:::${klass}`);
      visited.add(nodeId);
    }

    if (parent) {
      const parentId = getNodeId(parent);
      if (edges.length < maxEdges) {
        edges.push(`${parentId} --> ${nodeId}`);
      } else {
        truncated = true;
        return;
      }
    }

    if (depth >= options.maxDepth) return;

    component.formattedDependencies?.forEach((child) => {
      if (nodes.length >= maxNodes || edges.length >= maxEdges) {
        truncated = true;
        return;
      }
      walk(child, depth + 1, component);
    });
  };

  const filteredRoots = options.showVulnerableOnly
    ? roots.filter(hasAnyVulnerability)
    : roots;

  filteredRoots.forEach((root) => walk(root, 0));

  if (nodes.length === 0) {
    return {
      diagram: [
        "flowchart TB",
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
    "flowchart TB",
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
