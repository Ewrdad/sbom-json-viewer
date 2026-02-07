/**
 * Tests for uniqueLicenses helper function
 *
 * Why: Validates that unique licenses are correctly extracted from component trees
 * and deduplicated properly.
 */

import { describe, it, expect } from "vitest";
import { uniqueLicenses } from "./uniqueLicenses";
import { createMockComponent, createMockBom } from "@/test/mockData";

describe("uniqueLicenses", () => {
  it("should return empty array when no components have licenses", () => {
    // Why: Edge case - ensures function handles empty license sets gracefully
    const component1 = createMockComponent("pkg:npm/a@1.0.0", "a");
    const component2 = createMockComponent("pkg:npm/b@1.0.0", "b");

    const bom = createMockBom({ components: [component1, component2] });

    const licenses = uniqueLicenses(bom.components);

    expect(licenses).toEqual([]);
  });

  it("should extract unique licenses from components", () => {
    // Why: Basic functionality - single license per component
    const component1 = createMockComponent("pkg:npm/a@1.0.0", "a", {
      licenses: ["MIT"],
    });
    const component2 = createMockComponent("pkg:npm/b@1.0.0", "b", {
      licenses: ["Apache-2.0"],
    });

    const bom = createMockBom({ components: [component1, component2] });

    const licenses = uniqueLicenses(bom.components);

    expect(licenses).toHaveLength(2);
    // Extract license identifiers for comparison
    const licenseIds = licenses.map((l: any) => l.id);
    expect(licenseIds).toContain("MIT");
    expect(licenseIds).toContain("Apache-2.0");
  });

  it("should deduplicate identical licenses", () => {
    // Why: Core requirement - multiple components with same license should result in single entry
    const component1 = createMockComponent("pkg:npm/a@1.0.0", "a", {
      licenses: ["MIT"],
    });
    const component2 = createMockComponent("pkg:npm/b@1.0.0", "b", {
      licenses: ["MIT"],
    });
    const component3 = createMockComponent("pkg:npm/c@1.0.0", "c", {
      licenses: ["MIT"],
    });

    const bom = createMockBom({
      components: [component1, component2, component3],
    });

    const licenses = uniqueLicenses(bom.components);

    expect(licenses).toHaveLength(1);
    expect((licenses[0] as any).id).toBe("MIT");
  });

  it("should handle components with multiple licenses", () => {
    // Why: Real-world scenario - some packages have dual licenses
    const component1 = createMockComponent("pkg:npm/a@1.0.0", "a", {
      licenses: ["MIT", "Apache-2.0"],
    });
    const component2 = createMockComponent("pkg:npm/b@1.0.0", "b", {
      licenses: ["GPL-3.0"],
    });

    const bom = createMockBom({ components: [component1, component2] });

    const licenses = uniqueLicenses(bom.components);

    expect(licenses).toHaveLength(3);
    const licenseIds = licenses.map((l: any) => l.id);
    expect(licenseIds).toContain("MIT");
    expect(licenseIds).toContain("Apache-2.0");
    expect(licenseIds).toContain("GPL-3.0");
  });

  it("should handle mix of duplicate and unique licenses", () => {
    // Why: Complex scenario - ensures deduplication works with mixed data
    const component1 = createMockComponent("pkg:npm/a@1.0.0", "a", {
      licenses: ["MIT", "Apache-2.0"],
    });
    const component2 = createMockComponent("pkg:npm/b@1.0.0", "b", {
      licenses: ["MIT"],
    });
    const component3 = createMockComponent("pkg:npm/c@1.0.0", "c", {
      licenses: ["BSD-3-Clause"],
    });
    const component4 = createMockComponent("pkg:npm/d@1.0.0", "d", {
      licenses: ["Apache-2.0"],
    });

    const bom = createMockBom({
      components: [component1, component2, component3, component4],
    });

    const licenses = uniqueLicenses(bom.components);

    // Should have MIT, Apache-2.0, and BSD-3-Clause (3 unique)
    expect(licenses).toHaveLength(3);
    const licenseIds = licenses.map((l: any) => l.id);
    expect(licenseIds).toContain("MIT");
    expect(licenseIds).toContain("Apache-2.0");
    expect(licenseIds).toContain("BSD-3-Clause");
  });

  it("should handle empty ComponentRepository", () => {
    // Why: Edge case - function should not crash with empty input
    const bom = createMockBom({ components: [] });

    const licenses = uniqueLicenses(bom.components);

    expect(licenses).toEqual([]);
  });

  it("should preserve License objects, not just strings", () => {
    // Why: Type safety - ensures we return proper License objects
    const component = createMockComponent("pkg:npm/a@1.0.0", "a", {
      licenses: ["MIT"],
    });

    const bom = createMockBom({ components: [component] });

    const licenses = uniqueLicenses(bom.components);

    expect(licenses).toHaveLength(1);
    // Should be a License object with expected properties
    expect(licenses[0]).toHaveProperty("id");
  });
});
