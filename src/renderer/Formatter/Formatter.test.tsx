/**
 * Tests for the Formatter function
 *
 * Why: Validates the complete SBOM transformation process including:
 * - Nested component structure building
 * - Vulnerability aggregation (inherent and transitive)
 * - Circular dependency handling
 * - Component replication
 * - Progress tracking
 */

import { describe, it, expect, vi } from "vitest";
import { Formatter } from "./Formatter";
import type { NestedSBOMComponent } from "./Formatter";
import {
  createLinearDependencyBom,
  createDiamondDependencyBom,
  createCircularDependencyBom,
  createMultiVulnerabilityBom,
  createEmptyBom,
  createMockBom,
  createMockComponent,
  createMockVulnerability,
} from "@/test/mockData";

describe("Formatter", () => {
  // Helper to create a mock progress setter
  const createMockProgressSetter = () => {
    const progressUpdates: Array<{ progress: number; message: string }> = [];
    const setProgress = vi.fn((updater) => {
      const update =
        typeof updater === "function" ? updater({} as any) : updater;
      progressUpdates.push(update);
    });
    return { setProgress, progressUpdates };
  };

  describe("Basic Functionality", () => {
    it("should format an empty SBOM without errors", async () => {
      // Why: Edge case - ensures formatter handles empty input gracefully
      const bom = createEmptyBom();
      const { setProgress } = createMockProgressSetter();

      const result = await Formatter({ rawSBOM: bom, setProgress });

      expect(result).toBeDefined();
      expect(result.components).toEqual([]);
      expect(result.statistics.licenses).toEqual([]);
    });

    it("should extract metadata from SBOM", async () => {
      // Why: Metadata should be preserved in formatted output
      const bom = createLinearDependencyBom();
      const { setProgress } = createMockProgressSetter();

      const result = await Formatter({ rawSBOM: bom, setProgress });

      expect(result.metadata).toBeDefined();
    });

    it("should report progress throughout formatting", async () => {
      // Why: Progress tracking is essential for UX feedback
      const bom = createLinearDependencyBom();
      const { setProgress, progressUpdates } = createMockProgressSetter();

      await Formatter({ rawSBOM: bom, setProgress });

      expect(setProgress).toHaveBeenCalled();
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0].progress).toBe(0);
      expect(progressUpdates[progressUpdates.length - 1].progress).toBe(100);
    });

    it("should extract unique licenses into statistics", async () => {
      // Why: Statistics should contain aggregated license information
      const bom = createLinearDependencyBom();
      const { setProgress } = createMockProgressSetter();

      const result = await Formatter({ rawSBOM: bom, setProgress });

      expect(result.statistics.licenses).toBeDefined();
      expect(result.statistics.licenses.length).toBeGreaterThan(0);
    });

    it("should extract unique vulnerabilities into statistics", async () => {
      // Why: Statistics should contain aggregated vulnerability information
      const bom = createLinearDependencyBom();
      const { setProgress } = createMockProgressSetter();

      const result = await Formatter({ rawSBOM: bom, setProgress });

      expect(result.statistics.vulnerabilities).toBeDefined();
      expect(result.statistics.vulnerabilities.High).toBeDefined();
      expect(Array.isArray(result.statistics.vulnerabilities.High)).toBe(true);
    });
  });

  describe("Linear Dependency Structure", () => {
    it("should build nested component structure for linear dependencies", async () => {
      // Why: A -> B -> C should create nested structure
      const bom = createLinearDependencyBom();
      const { setProgress } = createMockProgressSetter();

      const result = await Formatter({ rawSBOM: bom, setProgress });

      // Should have one top-level component (A)
      expect(result.components).toHaveLength(1);
      expect(result.components[0].name).toBe("a");

      // A should have B as dependency
      expect(result.components[0].formattedDependencies).toHaveLength(1);
      expect(result.components[0].formattedDependencies[0].name).toBe("b");

      // B should have C as dependency
      expect(
        result.components[0].formattedDependencies[0].formattedDependencies,
      ).toHaveLength(1);
      expect(
        result.components[0].formattedDependencies[0].formattedDependencies[0]
          .name,
      ).toBe("c");
    });

    it("should aggregate transitive vulnerabilities in linear chain", async () => {
      // Why: A depends on B depends on C (with vuln), so A should have transitive vuln
      const bom = createLinearDependencyBom();
      const { setProgress } = createMockProgressSetter();

      const result = await Formatter({ rawSBOM: bom, setProgress });

      const componentA = result.components[0];

      // A should have no inherent vulnerabilities
      expect(componentA.vulnerabilities.inherent.High).toHaveLength(0);

      // A should have transitive vulnerability from C
      expect(componentA.vulnerabilities.transitive.High.length).toBeGreaterThan(
        0,
      );
    });

    it("should track inherent vulnerabilities at the correct level", async () => {
      // Why: C has the vulnerability, so it should be in C's inherent vulns
      const bom = createLinearDependencyBom();
      const { setProgress } = createMockProgressSetter();

      const result = await Formatter({ rawSBOM: bom, setProgress });

      const componentC =
        result.components[0].formattedDependencies[0].formattedDependencies[0];

      // C should have inherent vulnerability
      expect(componentC.vulnerabilities.inherent.High).toHaveLength(1);
      expect(componentC.vulnerabilities.inherent.High[0].id).toBe(
        "CVE-2024-0001",
      );
    });
  });

  describe("Diamond Dependency Structure", () => {
    it("should replicate shared dependencies", async () => {
      // Why: D is used by both B and C, should appear fully in both places
      const bom = createDiamondDependencyBom();
      const { setProgress } = createMockProgressSetter();

      const result = await Formatter({ rawSBOM: bom, setProgress });

      const componentA = result.components[0];
      expect(componentA.formattedDependencies).toHaveLength(2); // B and C

      const componentB = componentA.formattedDependencies.find(
        (c) => c.name === "b",
      )!;
      const componentC = componentA.formattedDependencies.find(
        (c) => c.name === "c",
      )!;

      // Both B and C should have D as dependency
      expect(componentB.formattedDependencies).toHaveLength(1);
      expect(componentB.formattedDependencies[0].name).toBe("d");

      expect(componentC.formattedDependencies).toHaveLength(1);
      expect(componentC.formattedDependencies[0].name).toBe("d");

      // D should be fully replicated (not a reference)
      expect(componentB.formattedDependencies[0]).not.toBe(
        componentC.formattedDependencies[0],
      );
    });

    it("should aggregate transitive vulnerabilities from multiple paths", async () => {
      // Why: A depends on B and C, both depend on D (with vuln)
      // A should have D's vuln as transitive
      const bom = createDiamondDependencyBom();
      const { setProgress } = createMockProgressSetter();

      const result = await Formatter({ rawSBOM: bom, setProgress });

      const componentA = result.components[0];

      // A should have transitive critical vulnerability from D
      expect(
        componentA.vulnerabilities.transitive.Critical.length,
      ).toBeGreaterThan(0);
    });

    it("should deduplicate transitive vulnerabilities", async () => {
      // Why: Same vulnerability from D appears via both B and C paths
      // Should only appear once in A's transitive vulnerabilities
      const bom = createDiamondDependencyBom();
      const { setProgress } = createMockProgressSetter();

      const result = await Formatter({ rawSBOM: bom, setProgress });

      const componentA = result.components[0];

      // Should have exactly 1 critical vulnerability (deduplicated)
      expect(componentA.vulnerabilities.transitive.Critical).toHaveLength(1);
      expect(componentA.vulnerabilities.transitive.Critical[0].id).toBe(
        "CVE-2024-0002",
      );
    });
  });

  describe("Circular Dependency Handling", () => {
    it("should handle circular dependencies without infinite recursion", async () => {
      // Why: A -> B -> C -> B (circular) should not cause stack overflow
      const bom = createCircularDependencyBom();
      const { setProgress } = createMockProgressSetter();

      // Should complete without throwing
      const result = await Formatter({ rawSBOM: bom, setProgress });

      expect(result).toBeDefined();
      expect(result.components).toHaveLength(1); // A is top-level
    });

    it("should still build partial structure with circular dependencies", async () => {
      // Why: Circular reference should be detected and skipped
      const bom = createCircularDependencyBom();
      const { setProgress } = createMockProgressSetter();

      const result = await Formatter({ rawSBOM: bom, setProgress });

      const componentA = result.components[0];
      expect(componentA.name).toBe("a");
      expect(componentA.formattedDependencies).toHaveLength(1); // B

      const componentB = componentA.formattedDependencies[0];
      expect(componentB.name).toBe("b");
      expect(componentB.formattedDependencies).toHaveLength(1); // C

      const componentC = componentB.formattedDependencies[0];
      expect(componentC.name).toBe("c");
      // C's dependency on B should be skipped due to circular detection
      expect(componentC.formattedDependencies).toHaveLength(0);
    });
  });

  describe("Vulnerability Categorization", () => {
    it("should categorize vulnerabilities by severity", async () => {
      // Why: Multiple severity levels should be properly categorized
      const bom = createMultiVulnerabilityBom();
      const { setProgress } = createMockProgressSetter();

      const result = await Formatter({ rawSBOM: bom, setProgress });

      expect(result.statistics.vulnerabilities.Critical).toHaveLength(1);
      expect(result.statistics.vulnerabilities.High).toHaveLength(1);
      expect(result.statistics.vulnerabilities.Medium).toHaveLength(1);
      expect(result.statistics.vulnerabilities.Low).toHaveLength(1);
    });

    it("should separate inherent from transitive vulnerabilities", async () => {
      // Why: Clear distinction between direct and inherited vulnerabilities
      const componentA = createMockComponent("pkg:npm/a@1.0.0", "a", {
        dependencies: ["pkg:npm/b@1.0.0"],
      });
      const componentB = createMockComponent("pkg:npm/b@1.0.0", "b");

      const vulnForA = createMockVulnerability("CVE-2024-0001", "high", [
        "pkg:npm/a@1.0.0",
      ]);
      const vulnForB = createMockVulnerability("CVE-2024-0002", "critical", [
        "pkg:npm/b@1.0.0",
      ]);

      const bom = createMockBom({
        components: [componentA, componentB],
        vulnerabilities: [vulnForA, vulnForB],
      });

      const { setProgress } = createMockProgressSetter();
      const result = await Formatter({ rawSBOM: bom, setProgress });

      const formattedA = result.components[0];

      // A should have its own vulnerability as inherent
      expect(formattedA.vulnerabilities.inherent.High).toHaveLength(1);
      expect(formattedA.vulnerabilities.inherent.High[0].id).toBe(
        "CVE-2024-0001",
      );

      // A should have B's vulnerability as transitive
      expect(formattedA.vulnerabilities.transitive.Critical).toHaveLength(1);
      expect(formattedA.vulnerabilities.transitive.Critical[0].id).toBe(
        "CVE-2024-0002",
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle component with no dependencies", async () => {
      // Why: Leaf components should work correctly
      const component = createMockComponent("pkg:npm/a@1.0.0", "a");
      const bom = createMockBom({ components: [component] });
      const { setProgress } = createMockProgressSetter();

      const result = await Formatter({ rawSBOM: bom, setProgress });

      expect(result.components).toHaveLength(1);
      expect(result.components[0].formattedDependencies).toHaveLength(0);
    });

    it("should handle component with missing dependency reference", async () => {
      // Why: Robustness - missing dependency shouldn't crash formatter
      const componentA = createMockComponent("pkg:npm/a@1.0.0", "a", {
        dependencies: ["pkg:npm/missing@1.0.0"], // This component doesn't exist
      });
      const bom = createMockBom({ components: [componentA] });
      const { setProgress } = createMockProgressSetter();

      const result = await Formatter({ rawSBOM: bom, setProgress });

      expect(result.components).toHaveLength(1);
      // Should have no formatted dependencies since the reference is invalid
      expect(result.components[0].formattedDependencies).toHaveLength(0);
    });

    it("should handle SBOM with only vulnerabilities, no components", async () => {
      // Why: Edge case - ensure formatter doesn't crash
      const vuln = createMockVulnerability("CVE-2024-0001", "high", [
        "pkg:npm/a@1.0.0",
      ]);
      const bom = createMockBom({
        components: [],
        vulnerabilities: [vuln],
      });
      const { setProgress } = createMockProgressSetter();

      const result = await Formatter({ rawSBOM: bom, setProgress });

      expect(result.components).toHaveLength(0);
      expect(result.statistics.vulnerabilities.High).toHaveLength(1);
    });
  });

  describe("Component Structure Integrity", () => {
    it("should preserve component properties in nested structure", async () => {
      // Why: Component metadata should not be lost during nesting
      const bom = createLinearDependencyBom();
      const { setProgress } = createMockProgressSetter();

      const result = await Formatter({ rawSBOM: bom, setProgress });

      const componentA = result.components[0];
      expect(componentA.name).toBeDefined();
      expect(componentA.name).toBe("a");
      expect(componentA.version).toBeDefined();
      expect(componentA.version).toBe("1.0.0");
      // Check that component has expected properties (avoiding private field access)
      expect(componentA.type).toBeDefined();
    });

    it("should add vulnerability tracking to each component", async () => {
      // Why: Every nested component should have vulnerability tracking structure
      const bom = createLinearDependencyBom();
      const { setProgress } = createMockProgressSetter();

      const result = await Formatter({ rawSBOM: bom, setProgress });

      const checkVulnerabilityStructure = (component: NestedSBOMComponent) => {
        expect(component.vulnerabilities).toBeDefined();
        expect(component.vulnerabilities.inherent).toBeDefined();
        expect(component.vulnerabilities.transitive).toBeDefined();
        expect(component.vulnerabilities.inherent.Critical).toBeDefined();
        expect(component.vulnerabilities.inherent.High).toBeDefined();
        expect(component.vulnerabilities.inherent.Medium).toBeDefined();
        expect(component.vulnerabilities.inherent.Low).toBeDefined();
        expect(component.vulnerabilities.inherent.Informational).toBeDefined();

        component.formattedDependencies.forEach(checkVulnerabilityStructure);
      };

      result.components.forEach(checkVulnerabilityStructure);
    });

    it("should add formattedDependencies array to each component", async () => {
      // Why: Every component needs the formattedDependencies property
      const bom = createLinearDependencyBom();
      const { setProgress } = createMockProgressSetter();

      const result = await Formatter({ rawSBOM: bom, setProgress });

      const checkFormattedDeps = (component: NestedSBOMComponent) => {
        expect(component.formattedDependencies).toBeDefined();
        expect(Array.isArray(component.formattedDependencies)).toBe(true);
        component.formattedDependencies.forEach(checkFormattedDeps);
      };

      result.components.forEach(checkFormattedDeps);
    });
  });
});
