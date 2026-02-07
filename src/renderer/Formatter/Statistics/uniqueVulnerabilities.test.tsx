/**
 * Tests for uniqueVulnerabilities helper function
 *
 * Why: Validates that vulnerabilities are correctly extracted, categorized by severity,
 * and deduplicated across the entire SBOM.
 */

import { describe, it, expect } from "vitest";
import { uniqueVulnerabilities } from "./uniqueVulnerabilities";
import {
  createMockBom,
  createMockComponent,
  createMockVulnerability,
  createMultiVulnerabilityBom,
} from "@/test/mockData";

describe("uniqueVulnerabilities", () => {
  it("should return empty categories when no vulnerabilities exist", () => {
    // Why: Edge case - ensures function handles empty vulnerability sets gracefully
    const bom = createMockBom({ components: [] });

    const result = uniqueVulnerabilities(bom);

    expect(result.Critical).toEqual([]);
    expect(result.High).toEqual([]);
    expect(result.Medium).toEqual([]);
    expect(result.Low).toEqual([]);
    expect(result.Informational).toEqual([]);
  });

  it("should categorize vulnerabilities by severity", () => {
    // Why: Core functionality - vulnerabilities must be correctly categorized
    const bom = createMultiVulnerabilityBom();

    const result = uniqueVulnerabilities(bom);

    expect(result.Critical).toHaveLength(1);
    expect(result.High).toHaveLength(1);
    expect(result.Medium).toHaveLength(1);
    expect(result.Low).toHaveLength(1);
  });

  it("should extract vulnerability IDs correctly", () => {
    // Why: Ensures vulnerability objects maintain their identity
    const bom = createMultiVulnerabilityBom();

    const result = uniqueVulnerabilities(bom);

    expect(result.Critical[0].id).toBe("CVE-2024-0001");
    expect(result.High[0].id).toBe("CVE-2024-0002");
    expect(result.Medium[0].id).toBe("CVE-2024-0003");
    expect(result.Low[0].id).toBe("CVE-2024-0004");
  });

  it("should deduplicate vulnerabilities with same ID", () => {
    // Why: Same vulnerability affecting multiple components should appear once
    const component1 = createMockComponent("pkg:npm/a@1.0.0", "a");
    const component2 = createMockComponent("pkg:npm/b@1.0.0", "b");

    const vuln1 = createMockVulnerability("CVE-2024-0001", "high", [
      "pkg:npm/a@1.0.0",
    ]);
    const vuln2 = createMockVulnerability("CVE-2024-0001", "high", [
      "pkg:npm/b@1.0.0",
    ]);

    const bom = createMockBom({
      components: [component1, component2],
      vulnerabilities: [vuln1, vuln2],
    });

    const result = uniqueVulnerabilities(bom);

    expect(result.High).toHaveLength(1);
    expect(result.High[0].id).toBe("CVE-2024-0001");
  });

  it("should handle multiple critical vulnerabilities", () => {
    // Why: Real-world scenario - multiple critical issues
    const component = createMockComponent("pkg:npm/a@1.0.0", "a");

    const vuln1 = createMockVulnerability("CVE-2024-0001", "critical", [
      "pkg:npm/a@1.0.0",
    ]);
    const vuln2 = createMockVulnerability("CVE-2024-0002", "critical", [
      "pkg:npm/a@1.0.0",
    ]);
    const vuln3 = createMockVulnerability("CVE-2024-0003", "critical", [
      "pkg:npm/a@1.0.0",
    ]);

    const bom = createMockBom({
      components: [component],
      vulnerabilities: [vuln1, vuln2, vuln3],
    });

    const result = uniqueVulnerabilities(bom);

    expect(result.Critical).toHaveLength(3);
    const ids = result.Critical.map((v) => v.id);
    expect(ids).toContain("CVE-2024-0001");
    expect(ids).toContain("CVE-2024-0002");
    expect(ids).toContain("CVE-2024-0003");
  });

  it("should handle vulnerability without severity rating", () => {
    // Why: Edge case - some vulnerabilities may lack severity ratings
    const component = createMockComponent("pkg:npm/a@1.0.0", "a");

    const vuln: any = {
      id: "CVE-2024-0001",
      ratings: new Set([]), // No ratings
      affects: new Set([
        {
          ref: { value: "pkg:npm/a@1.0.0" },
          versions: new Set(),
        },
      ]),
      references: new Set(),
      cwes: new Set(),
      advisories: new Set(),
      tools: { components: new Set(), services: new Set() },
      properties: new Set(),
    };

    const bom = createMockBom({
      components: [component],
      vulnerabilities: [vuln],
    });

    const result = uniqueVulnerabilities(bom);

    // Should default to Informational
    expect(result.Informational).toHaveLength(1);
    expect(result.Informational[0].id).toBe("CVE-2024-0001");
  });

  it("should handle mixed severity levels", () => {
    // Why: Real SBOM typically has vulnerabilities at various severity levels
    const component = createMockComponent("pkg:npm/a@1.0.0", "a");

    const critical = createMockVulnerability("CVE-2024-0001", "critical", [
      "pkg:npm/a@1.0.0",
    ]);
    const high1 = createMockVulnerability("CVE-2024-0002", "high", [
      "pkg:npm/a@1.0.0",
    ]);
    const high2 = createMockVulnerability("CVE-2024-0003", "high", [
      "pkg:npm/a@1.0.0",
    ]);
    const medium = createMockVulnerability("CVE-2024-0004", "medium", [
      "pkg:npm/a@1.0.0",
    ]);
    const low1 = createMockVulnerability("CVE-2024-0005", "low", [
      "pkg:npm/a@1.0.0",
    ]);
    const low2 = createMockVulnerability("CVE-2024-0006", "low", [
      "pkg:npm/a@1.0.0",
    ]);
    const low3 = createMockVulnerability("CVE-2024-0007", "low", [
      "pkg:npm/a@1.0.0",
    ]);

    const bom = createMockBom({
      components: [component],
      vulnerabilities: [critical, high1, high2, medium, low1, low2, low3],
    });

    const result = uniqueVulnerabilities(bom);

    expect(result.Critical).toHaveLength(1);
    expect(result.High).toHaveLength(2);
    expect(result.Medium).toHaveLength(1);
    expect(result.Low).toHaveLength(3);
    expect(result.Informational).toHaveLength(0);
  });

  it("should handle case-insensitive severity matching", () => {
    // Why: Ensures severity parsing is robust to different case formats
    const component = createMockComponent("pkg:npm/a@1.0.0", "a");

    // Create vulnerability with uppercase severity
    const vuln: any = {
      id: "CVE-2024-0001",
      ratings: new Set([
        {
          severity: "HIGH", // Uppercase
          score: 8.5,
        },
      ]),
      affects: new Set([
        {
          ref: { value: "pkg:npm/a@1.0.0" },
          versions: new Set(),
        },
      ]),
      references: new Set(),
      cwes: new Set(),
      advisories: new Set(),
      tools: { components: new Set(), services: new Set() },
      properties: new Set(),
    };

    const bom = createMockBom({
      components: [component],
      vulnerabilities: [vuln],
    });

    const result = uniqueVulnerabilities(bom);

    expect(result.High).toHaveLength(1);
  });

  it("should maintain vulnerability object integrity", () => {
    // Why: Ensures the full vulnerability object is preserved, not just ID
    const component = createMockComponent("pkg:npm/a@1.0.0", "a");

    const vuln = createMockVulnerability("CVE-2024-0001", "critical", [
      "pkg:npm/a@1.0.0",
    ]);

    const bom = createMockBom({
      components: [component],
      vulnerabilities: [vuln],
    });

    const result = uniqueVulnerabilities(bom);

    expect(result.Critical[0]).toHaveProperty("id");
    expect(result.Critical[0]).toHaveProperty("ratings");
    expect(result.Critical[0]).toHaveProperty("affects");
  });
});
