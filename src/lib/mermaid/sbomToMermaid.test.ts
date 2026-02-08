import { describe, it, expect } from "vitest";
import type { NestedSBOMComponent } from "@/renderer/Formatter/Formatter";
import { buildMermaidDiagram } from "./sbomToMermaid";

const createMockNode = (
  name: string,
  bomRef: string,
  deps: NestedSBOMComponent[] = [],
): NestedSBOMComponent =>
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
    formattedDependencies: deps,
  }) as any;

describe("buildMermaidDiagram", () => {
  it("creates nodes and edges for a dependency tree", () => {
    // Why: Ensures the diagram captures hierarchy for export.
    const leaf = createMockNode("leaf", "pkg:npm/leaf@1.0.0");
    const root = createMockNode("root", "pkg:npm/root@1.0.0", [leaf]);

    const result = buildMermaidDiagram([root], {
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
    // Why: Keeps diagrams compact and aligned with UI depth limits.
    const deepLeaf = createMockNode("deep", "pkg:npm/deep@1.0.0");
    const mid = createMockNode("mid", "pkg:npm/mid@1.0.0", [deepLeaf]);
    const root = createMockNode("root", "pkg:npm/root@1.0.0", [mid]);

    const result = buildMermaidDiagram([root], {
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
    // Why: Export should mirror vulnerable-only filter.
    const clean = createMockNode("clean", "pkg:npm/clean@1.0.0");
    const vulnerable = {
      ...createMockNode("vuln", "pkg:npm/vuln@1.0.0"),
      vulnerabilities: {
        inherent: {
          Critical: [{ id: "CVE-1" } as any],
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
    } as NestedSBOMComponent;

    const result = buildMermaidDiagram([clean, vulnerable], {
      maxDepth: 2,
      pruneNonMatches: false,
      query: "",
      showVulnerableOnly: true,
    });

    expect(result.diagram).toContain("vuln");
    expect(result.diagram).not.toContain('["clean');
  });

  it("prunes non-matching branches when query is set", () => {
    // Why: Export should mirror pruning behavior.
    const match = createMockNode("match", "pkg:npm/match@1.0.0");
    const other = createMockNode("other", "pkg:npm/other@1.0.0");

    const result = buildMermaidDiagram([match, other], {
      maxDepth: 2,
      pruneNonMatches: true,
      query: "match",
      showVulnerableOnly: false,
    });

    expect(result.diagram).toContain("match");
    expect(result.diagram).not.toContain("other");
  });

  it("truncates when exceeding node limits", () => {
    // Why: Protects UI from excessively large diagrams.
    const nodes = Array.from({ length: 10 }, (_, index) =>
      createMockNode(`node-${index}`, `pkg:npm/node-${index}@1.0.0`),
    );

    const result = buildMermaidDiagram(nodes, {
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
    // Why: Prevents Mermaid syntax errors from special characters.
    const tricky = createMockNode('Component <with> "quotes" & \\slashes', "pkg:npm/tricky@1.0.0");
    
    const result = buildMermaidDiagram([tricky], {
      maxDepth: 1,
      pruneNonMatches: false,
      query: "",
      showVulnerableOnly: false,
    });

    expect(result.diagram).toContain("Component &lt;with&gt; &quot;quotes&quot; &amp; \\\\slashes");
  });

  it("applies the highest severity class to nodes", () => {
    // Why: Nodes should be visually prioritized by their worst vulnerability.
    const component = createMockNode("vuln-comp", "pkg:npm/vuln@1.0.0");
    component.vulnerabilities.inherent.High = [{ id: "CVE-HIGH" } as any];
    component.vulnerabilities.transitive.Critical = [{ id: "CVE-CRITICAL" } as any];

    const result = buildMermaidDiagram([component], {
      maxDepth: 1,
      pruneNonMatches: false,
      query: "",
      showVulnerableOnly: false,
    });

    // Should be critical because it has a transitive critical vuln
    expect(result.diagram).toContain('node_0["vuln-comp');
    expect(result.diagram).toContain('node_0["vuln-comp<br/>v1.0.0<br/>2 vulns (1nd, 1tr)"]:::critical');
  });
});
