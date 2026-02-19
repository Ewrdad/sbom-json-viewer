import { describe, it, expect } from "vitest";
import {
  getAllComponents,
  analyzeDependencies,
  getAncestors,
} from "./bomUtils";
import { createMockComponent, createMockBom } from "../test/mockData";
import { BomRef } from "@cyclonedx/cyclonedx-library/Models";

describe("bomUtils", () => {
  describe("getAllComponents", () => {
    it("extracts all components including nested ones", () => {
      const child = createMockComponent("child", "child-comp");
      const parent = createMockComponent("parent", "parent-comp");
      parent.components.add(child);
      
      const bom = createMockBom({
        components: [parent],
      });

      const all = getAllComponents(bom);
      expect(all).toHaveLength(2);
      expect(all.map((c) => c.name)).toContain("child-comp");
      expect(all.map((c) => c.name)).toContain("parent-comp");
    });

    it("handles empty SBOM", () => {
      const bom = createMockBom({ components: [] });
      const all = getAllComponents(bom);
      expect(all).toHaveLength(0);
    });

    it("deduplicates components by bomRef", () => {
      const comp1 = createMockComponent("ref-1", "comp-1");
      const comp2 = createMockComponent("ref-1", "comp-1-duplicate"); // Same ref
      
      const bom = createMockBom({
        components: [comp1, comp2],
      });

      const all = getAllComponents(bom);
      expect(all).toHaveLength(1);
      expect(all[0].name).toBe("comp-1");
    });
  });

  describe("analyzeDependencies", () => {
    it("builds dependency maps correctly", () => {
      // A -> B
      const compB = createMockComponent("pkg:npm/b@1.0.0", "b");
      const compA = createMockComponent("pkg:npm/a@1.0.0", "a");
      compA.dependencies.add(new BomRef("pkg:npm/b@1.0.0"));

      const bom = createMockBom({
        components: [compA, compB],
      });

      const { dependencyMap, inverseDependencyMap, componentMap } = analyzeDependencies(bom);

      expect(dependencyMap.get("pkg:npm/a@1.0.0")).toContain("pkg:npm/b@1.0.0");
      expect(inverseDependencyMap.get("pkg:npm/b@1.0.0")).toContain("pkg:npm/a@1.0.0");
      expect(componentMap.has("pkg:npm/a@1.0.0")).toBe(true);
      expect(componentMap.has("pkg:npm/b@1.0.0")).toBe(true);
    });
  });

  describe("getAncestors", () => {
    it("finds all ancestors transitively", () => {
      // A -> B -> C
      const inverseMap = new Map<string, string[]>();
      inverseMap.set("C", ["B"]);
      inverseMap.set("B", ["A"]);

      const ancestors = getAncestors("C", inverseMap);
      expect(ancestors).toContain("B");
      expect(ancestors).toContain("A");
      expect(ancestors).toHaveLength(2);
    });

    it("handles cycles gracefully", () => {
      // A -> B -> A
      const inverseMap = new Map<string, string[]>();
      inverseMap.set("B", ["A"]);
      inverseMap.set("A", ["B"]);

      const ancestors = getAncestors("B", inverseMap);
      expect(ancestors).toContain("A");
      expect(ancestors).toContain("B"); // It includes direct parents, B is parent of A which is parent of B
    });
  });
});
