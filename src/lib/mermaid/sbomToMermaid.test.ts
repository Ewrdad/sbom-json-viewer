import { describe, it, expect } from "vitest";
import { buildMermaidDiagram } from "./sbomToMermaid";
import type { EnhancedComponent, formattedSBOM } from "../../types/sbom";

const createMockNode = (
  name: string,
  bomRef: string,
): EnhancedComponent =>
  ({
    name,
    version: "1.0.0",
    group: "test",
    bomRef: { value: bomRef } as any,
    vulnerabilities: {
      inherent: {
        Critical: [],
        High: [],
        Medium: [],
        Low: [],
        Informational: [],
      },
      transitive: {
        Critical: [],
        High: [],
        Medium: [],
        Low: [],
        Informational: [],
      },
    },
  }) as any;

const createMockSbom = (
  nodes: EnhancedComponent[],
  graph: Record<string, string[]>,
  topLevelRefs: string[],
): formattedSBOM => ({
  statistics: {
    licenses: [],
    vulnerabilities: {
      Critical: [],
      High: [],
      Medium: [],
      Low: [],
      Informational: [],
    },
  },
  metadata: {} as any,
  componentMap: new Map(nodes.map((n) => [typeof n.bomRef === 'string' ? n.bomRef : n.bomRef?.value || "", n])),
  dependencyGraph: new Map(Object.entries(graph)),
  dependentsGraph: new Map(),
  blastRadius: new Map(),
  topLevelRefs,
});

describe("buildMermaidDiagram", () => {
  it("creates nodes and edges for a dependency tree", async () => {
    const leaf = createMockNode("leaf", "leaf-ref");
    const root = createMockNode("root", "root-ref");
    
    const sbom = createMockSbom(
      [root, leaf],
      { "root-ref": ["leaf-ref"] },
      ["root-ref"]
    );

    const result = await buildMermaidDiagram(sbom, {
      maxDepth: 3,
      pruneNonMatches: true,
      query: "",
      showVulnerableOnly: false,
    });

    expect(result.diagram).toContain("flowchart LR");
    expect(result.diagram).toContain("root");
    expect(result.diagram).toContain("leaf");
    expect(result.edgeCount).toBe(1);
  });

  it("respects max depth when rendering", async () => {
    const deepLeaf = createMockNode("deep", "deep-ref");
    const mid = createMockNode("mid", "mid-ref");
    const root = createMockNode("root", "root-ref");

    const sbom = createMockSbom(
      [root, mid, deepLeaf],
      { 
        "root-ref": ["mid-ref"],
        "mid-ref": ["deep-ref"]
      },
      ["root-ref"]
    );

    const result = await buildMermaidDiagram(sbom, {
      maxDepth: 1,
      pruneNonMatches: false,
      query: "",
      showVulnerableOnly: false,
    });

    expect(result.diagram).toContain("root");
    expect(result.diagram).toContain("mid");
    expect(result.diagram).not.toContain("deep");
  });

  it("filters to vulnerable components when enabled", async () => {
    const clean = createMockNode("clean", "clean-ref");
    const vulnerable = createMockNode("vuln", "vuln-ref");
    vulnerable.vulnerabilities.inherent.Critical = [{ id: "CVE-1" } as any];

    const sbom = createMockSbom(
      [clean, vulnerable],
      {},
      ["clean-ref", "vuln-ref"]
    );

    const result = await buildMermaidDiagram(sbom, {
      maxDepth: 2,
      pruneNonMatches: false,
      query: "",
      showVulnerableOnly: true,
    });

    expect(result.diagram).toContain("vuln");
    expect(result.diagram).not.toContain('["clean');
  });

  it("prunes non-matching branches when query is set", async () => {
    const match = createMockNode("match", "match-ref");
    const other = createMockNode("other", "other-ref");

    const sbom = createMockSbom(
      [match, other],
      {},
      ["match-ref", "other-ref"]
    );

    const result = await buildMermaidDiagram(sbom, {
      maxDepth: 2,
      pruneNonMatches: true,
      query: "match",
      showVulnerableOnly: false,
    });

    expect(result.diagram).toContain("match");
    expect(result.diagram).not.toContain("other");
  });

  it("truncates when exceeding node limits", async () => {
    const nodes = Array.from({ length: 10 }, (_, index) =>
      createMockNode(`node-${index}`, `ref-${index}`),
    );

    const sbom = createMockSbom(
      nodes,
      {},
      nodes.map(n => n.bomRef?.value as string)
    );

    const result = await buildMermaidDiagram(sbom, {
      maxDepth: 1,
      pruneNonMatches: false,
      query: "",
      showVulnerableOnly: false,
      maxNodes: 3,
      maxEdges: 2,
    });

    expect(result.truncated).toBe(true);
    expect(result.nodeCount).toBeLessThanOrEqual(3);
  });

  it("sanitizes component names and versions in labels", async () => {
    const tricky = createMockNode('Component <with> "quotes" & \\slashes', "tricky-ref");
    
    const sbom = createMockSbom([tricky], {}, ["tricky-ref"]);

    const result = await buildMermaidDiagram(sbom, {
      maxDepth: 1,
      pruneNonMatches: false,
      query: "",
      showVulnerableOnly: false,
    });

    expect(result.diagram).toContain("Component &lt;with&gt; &quot;quotes&quot; &amp; \\\\slashes");
  });

  it("applies the highest severity class to nodes", async () => {
    const component = createMockNode("vuln-comp", "vuln-ref");
    component.vulnerabilities.inherent.High = [{ id: "CVE-HIGH" } as any];
    component.vulnerabilities.transitive.Critical = [{ id: "CVE-CRITICAL" } as any];

    const sbom = createMockSbom([component], {}, ["vuln-ref"]);

    const result = await buildMermaidDiagram(sbom, {
      maxDepth: 1,
      pruneNonMatches: false,
      query: "",
      showVulnerableOnly: false,
    });

    expect(result.diagram).toContain('node_0["vuln-comp');
    expect(result.diagram).toContain('node_0["vuln-comp<br/>v1.0.0<br/>2 vulns (1nd, 1tr)"]:::critical');
  });

  it("groups components by their group property", async () => {
    const component1 = createMockNode("comp1", "ref1");
    component1.group = "backend";
    const component2 = createMockNode("comp2", "ref2");
    component2.group = "backend";
    const component3 = createMockNode("comp3", "ref3");
    component3.group = "frontend";

    const sbom = createMockSbom(
      [component1, component2, component3],
      {},
      ["ref1", "ref2", "ref3"]
    );

    const result = await buildMermaidDiagram(sbom, {
      maxDepth: 1,
      pruneNonMatches: false,
      query: "",
      showVulnerableOnly: false,
    });

    expect(result.diagram).toContain('subgraph group_backend ["backend"]');
    expect(result.diagram).toContain('subgraph group_frontend ["frontend"]');
  });

  it("prioritizes shallow nodes over deep nodes when truncating (BFS behavior)", async () => {
    // Create a tree: Root -> [Child1, Child2, Child3] -> [Grandchild1, Grandchild2...]
    // If we limit nodes to 4 (Root + 3 children), we should see Root, Child1, Child2, Child3
    // We should NOT see Grandchildren, even if Child1 was processed fully before Child2 in DFS.
    
    const root = createMockNode("root", "root");
    const child1 = createMockNode("child1", "c1");
    const child2 = createMockNode("child2", "c2");
    const child3 = createMockNode("child3", "c3");
    const grandchild1 = createMockNode("grandchild1", "gc1");

    const sbom = createMockSbom(
      [root, child1, child2, child3, grandchild1],
      {
        "root": ["c1", "c2", "c3"],
        "c1": ["gc1"]
      },
      ["root"]
    );

    const result = await buildMermaidDiagram(sbom, {
      maxDepth: 10,
      pruneNonMatches: false,
      query: "",
      showVulnerableOnly: false,
      maxNodes: 4 
    });

    // Root (1) + Child1 (2) + Child2 (3) + Child3 (4) = 4 nodes.
    // Grandchild1 would be the 5th node in BFS (or later).
    // In DFS, it might be Root -> Child1 -> Grandchild1 (3 nodes so far) -> Child2 -> Truncated.

    expect(result.diagram).toContain("root");
    expect(result.diagram).toContain("child1");
    expect(result.diagram).toContain("child2");
    expect(result.diagram).toContain("child3");
    expect(result.diagram).not.toContain("grandchild1");
    expect(result.truncated).toBe(true);
  });
});
