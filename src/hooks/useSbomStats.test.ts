import { renderHook, waitFor } from "@testing-library/react";
import { useSbomStats } from "./useSbomStats";
import { describe, it, expect } from "vitest";
import { Bom, Component } from "@cyclonedx/cyclonedx-library/Models";
import { ComponentType } from "@cyclonedx/cyclonedx-library/Enums";

describe("useSbomStats", () => {
  it("should return null if sbom is null", () => {
    const { result } = renderHook(() => useSbomStats(null as unknown as Bom));
    expect(result.current).toBeNull();
  });

  it("should calculate stats correctly for a comprehensive SBOM", async () => {
    const sbom = new Bom();

    // Component 1: 2 Critical, 1 High
    const component1 = new Component(ComponentType.Library, "comp1", {
      version: "1.0.0",
      bomRef: "ref1",
    });
    // @ts-expect-error - mock internal
    component1.licenses.add({ name: "MIT" });

    // Component 2: 1 Medium
    const component2 = new Component(ComponentType.Application, "plugin-a", {
      version: "2.5.1",
      bomRef: "ref2",
    });
    // @ts-expect-error - mock internal
    component2.licenses.add({ name: "Apache-2.0" });

    // Component 3: Clean, shared license
    const component3 = new Component(ComponentType.Library, "shared-lib", {
      version: "1.1.0",
      bomRef: "ref3",
    });
    // @ts-expect-error - mock internal
    component3.licenses.add({ name: "MIT" });

    sbom.components.add(component1);
    sbom.components.add(component2);
    sbom.components.add(component3);

    // Vulnerabilities
    const vuln1 = {
      id: "CVE-2024-0001",
      ratings: [{ severity: "critical" }, { severity: "high" }], // Use lower case as per hook logic
      affects: [{ ref: { value: "ref1" } }],
    };
    const vuln2 = {
      id: "CVE-2024-0002",
      ratings: [{ severity: "critical" }],
      affects: [{ ref: { value: "ref1" } }],
    };
    const vuln3 = {
      id: "CVE-2024-0003",
      ratings: [{ severity: "medium" }],
      affects: [{ ref: { value: "ref2" } }],
    };

    // @ts-expect-error - mock internal
    sbom.vulnerabilities.add(vuln1);
    // @ts-expect-error - mock internal
    sbom.vulnerabilities.add(vuln2);
    // @ts-expect-error - mock internal
    sbom.vulnerabilities.add(vuln3);

    const { result } = renderHook(() => useSbomStats(sbom));
    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });
    const s = result.current!;
    expect(s.totalComponents).toBe(3);

    // Vulnerability counts (Findings based, max severity per finding)
    expect(s.vulnerabilityCounts.critical).toBe(2); // vuln1 on ref1, vuln2 on ref1
    expect(s.vulnerabilityCounts.high).toBe(0); // vuln1's high rating is shadowed by its critical rating
    expect(s.vulnerabilityCounts.medium).toBe(1); // vuln3 on ref2
    expect(s.vulnerabilityCounts.low).toBe(0);
    expect(s.totalVulnerabilities).toBe(3);
    expect(s.uniqueVulnerabilityCount).toBe(3);

    // License counts
    expect(s.licenseCounts["MIT"]).toBe(2);
    expect(s.licenseCounts["Apache-2.0"]).toBe(1);
    expect(s.topLicenses[0].name).toBe("MIT");

    // License distribution
    expect(s.licenseDistribution.permissive).toBe(3); // MIT(2) + Apache-2.0(1)
    expect(s.licenseDistribution.copyleft).toBe(0);
    expect(s.licenseDistribution.unknown).toBe(0);

    // Vulnerable components
    expect(s.vulnerableComponents).toHaveLength(2);
    expect(s.vulnerableComponents[0].name).toBe("comp1");
    expect(s.vulnerableComponents[0].critical).toBe(2);
    expect(s.vulnerableComponents[1].name).toBe("plugin-a");
    expect(s.vulnerableComponents[1].medium).toBe(1);
  });
});
