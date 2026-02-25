import { describe, it, expect } from "vitest";
import { mergeSBOMs } from "./sbomMerger";

describe("sbomMerger", () => {
  it("should return the original format when single SBOM is passed", () => {
    const sbom = { components: [{ name: "A", purl: "pkg:npm/A" }] };
    const merged = mergeSBOMs([sbom]);
    const components = merged?.components as any[];
    expect(components).toHaveLength(1);
    expect(components?.[0]?.name).toBe("A");
  });

  it("should combine components seamlessly by PURL", () => {
    const baseSbom = {
      components: [{ name: "A", purl: "pkg:npm/A@1.0", "bom-ref": "ref-A" }]
    };
    const secondSbom = {
      components: [
        { name: "A", purl: "pkg:npm/A@1.0", "bom-ref": "diff-ref-A" },
        { name: "B", purl: "pkg:npm/B@2.0", "bom-ref": "ref-B" }
      ]
    };
    
    const merged = mergeSBOMs([baseSbom, secondSbom]);
    
    const components = merged?.components as any[];
    expect(components).toHaveLength(2); // Should deduplicate 'A' and add 'B'
    expect(components?.[0]?.purl).toBe("pkg:npm/A@1.0");
    expect(components?.[1]?.purl).toBe("pkg:npm/B@2.0");
  });

  it("should merge vulnerabilities and correctly map bom-refs", () => {
    const baseSbom = {
      components: [{ name: "A", purl: "pkg:npm/A@1.0", "bom-ref": "base-ref-A" }],
      vulnerabilities: []
    };
    const secondSbom = {
      components: [{ name: "A", purl: "pkg:npm/A@1.0", "bom-ref": "trivy-ref-A" }],
      vulnerabilities: [
        {
          id: "CVE-1234",
          affects: [{ ref: "trivy-ref-A" }]
        }
      ]
    };

    const merged = mergeSBOMs([baseSbom, secondSbom]);
    const vulnerabilities = merged?.vulnerabilities as any[];
    expect(vulnerabilities).toHaveLength(1);
    expect(vulnerabilities?.[0]?.affects?.[0]?.ref).toBe("base-ref-A");
  });

  it("should deduplicate vulnerabilities for the same component", () => {
    const baseSbom = {
      components: [{ name: "A", purl: "pkg:npm/A@1.0", "bom-ref": "base-ref-A" }],
      vulnerabilities: [
        {
          id: "CVE-1234",
          affects: [{ ref: "base-ref-A" }]
        }
      ]
    };
    const trivySbom = {
      components: [{ name: "A", purl: "pkg:npm/A@1.0", "bom-ref": "trivy-ref-A" }],
      vulnerabilities: [
        {
          id: "CVE-1234",
          description: "Duplicate",
          affects: [{ ref: "trivy-ref-A" }]
        },
        {
          id: "CVE-5678",
          affects: [{ ref: "trivy-ref-A" }]
        }
      ]
    };

    const merged = mergeSBOMs([baseSbom, trivySbom]);
    
    const vulnerabilities = merged?.vulnerabilities as any[];
    expect(vulnerabilities).toHaveLength(2);
    // Base one should remain untouched
    expect(vulnerabilities?.[0]?.id).toBe("CVE-1234");
    expect(vulnerabilities?.[0]?.description).toBeUndefined();
    // New one added
    expect(vulnerabilities?.[1]?.id).toBe("CVE-5678");
    expect(vulnerabilities?.[1]?.affects?.[0]?.ref).toBe("base-ref-A");
  });

  it("should calculate multiSbomStats and track _rawSources", () => {
    const sbom1 = {
      components: [{ name: "A", purl: "pkg:npm/A@1.0", "bom-ref": "ref-A" }]
    };
    const sbom2 = {
      components: [
        { name: "A", purl: "pkg:npm/A@1.0", "bom-ref": "diff-ref-A" },
        { name: "B", purl: "pkg:npm/B@2.0", "bom-ref": "ref-B" }
      ],
      vulnerabilities: [
        { id: "CVE-1", affects: [{ ref: "diff-ref-A" }] }
      ]
    };
    const sourceNames = ["Source1", "Source2"];
    const merged = mergeSBOMs([sbom1, sbom2], sourceNames);

    // MultiSbomStats assertions
    expect(merged?.__multiSbomStats).toBeDefined();
    expect((merged?.__multiSbomStats as any)?.sources).toHaveLength(2);
    
    // overlap metrics
    const statsSource1 = (merged?.__multiSbomStats as any)?.sources?.find((s: any) => s.name === "Source1");
    const statsSource2 = (merged?.__multiSbomStats as any)?.sources?.find((s: any) => s.name === "Source2");
    
    expect(statsSource1.componentsFound).toBe(1);
    
    expect(statsSource2.componentsFound).toBe(2);
    expect(statsSource2.vulnerabilitiesFound).toBe(1);

    // _rawSources assertions
    const components = merged?.components as any[];
    const compA = components?.find((c: any) => c.name === "A");
    expect(compA?._rawSources).toHaveLength(2);
    expect(compA?._rawSources[0].name).toBe("Source1");
    expect(compA?._rawSources[1].name).toBe("Source2");

    const compB = components?.find((c: any) => c.name === "B");
    expect(compB?._rawSources).toHaveLength(1);
    expect(compB?._rawSources[0].name).toBe("Source2");

    const vulnerabilities = merged?.vulnerabilities as any[];
    const vuln1 = vulnerabilities?.find((v: any) => v.id === "CVE-1");
    expect(vuln1?._rawSources).toHaveLength(1);
    expect(vuln1?._rawSources[0].name).toBe("Source2");
  });
});

