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
  topLevelRefs,
});

describe("buildMermaidDiagram", () => {
  it("creates nodes and edges for a dependency tree", () => {
    const leaf = createMockNode("leaf", "leaf-ref");
    const root = createMockNode("root", "root-ref");
    
    const sbom = createMockSbom(
      [root, leaf],
      { "root-ref": ["leaf-ref"] },
      ["root-ref"]
    );

    const result = buildMermaidDiagram(sbom, {
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

  it("respects max depth when rendering", () => {
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

    const result = buildMermaidDiagram(sbom, {
      maxDepth: 1,
      pruneNonMatches: false,
      query: "",
      showVulnerableOnly: false,
    });

    expect(result.diagram).toContain("root");
    expect(result.diagram).toContain("mid");
    expect(result.diagram).not.toContain("deep");
  });

  it("filters to vulnerable components when enabled", () => {
    const clean = createMockNode("clean", "clean-ref");
    const vulnerable = createMockNode("vuln", "vuln-ref");
    vulnerable.vulnerabilities.inherent.Critical = [{ id: "CVE-1" } as any];

    const sbom = createMockSbom(
      [clean, vulnerable],
      {},
      ["clean-ref", "vuln-ref"]
    );

    const result = buildMermaidDiagram(sbom, {
      maxDepth: 2,
      pruneNonMatches: false,
      query: "",
      showVulnerableOnly: true,
    });

    expect(result.diagram).toContain("vuln");
    expect(result.diagram).not.toContain('["clean');
  });

  it("prunes non-matching branches when query is set", () => {
    const match = createMockNode("match", "match-ref");
    const other = createMockNode("other", "other-ref");

    const sbom = createMockSbom(
      [match, other],
      {},
      ["match-ref", "other-ref"]
    );

    const result = buildMermaidDiagram(sbom, {
      maxDepth: 2,
      pruneNonMatches: true,
      query: "match",
      showVulnerableOnly: false,
    });

    expect(result.diagram).toContain("match");
    expect(result.diagram).not.toContain("other");
  });

  it("truncates when exceeding node limits", () => {
    const nodes = Array.from({ length: 10 }, (_, index) =>
      createMockNode(`node-${index}`, `ref-${index}`),
    );

    const sbom = createMockSbom(
      nodes,
      {},
      nodes.map(n => n.bomRef?.value as string)
    );

    const result = buildMermaidDiagram(sbom, {
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

  it("sanitizes component names and versions in labels", () => {
    const tricky = createMockNode('Component <with> "quotes" & \\slashes', "tricky-ref");
    
    const sbom = createMockSbom([tricky], {}, ["tricky-ref"]);

    const result = buildMermaidDiagram(sbom, {
      maxDepth: 1,
      pruneNonMatches: false,
      query: "",
      showVulnerableOnly: false,
    });

    expect(result.diagram).toContain("Component &lt;with&gt; &quot;quotes&quot; &amp; \\\\slashes");
  });

  it("applies the highest severity class to nodes", () => {
    const component = createMockNode("vuln-comp", "vuln-ref");
    component.vulnerabilities.inherent.High = [{ id: "CVE-HIGH" } as any];
    component.vulnerabilities.transitive.Critical = [{ id: "CVE-CRITICAL" } as any];

    const sbom = createMockSbom([component], {}, ["vuln-ref"]);

    const result = buildMermaidDiagram(sbom, {
      maxDepth: 1,
      pruneNonMatches: false,
      query: "",
      showVulnerableOnly: false,
    });

    expect(result.diagram).toContain('node_0["vuln-comp');
    expect(result.diagram).toContain('node_0["vuln-comp<br/>v1.0.0<br/>2 vulns (1nd, 1tr)"]:::critical');
  });
});
