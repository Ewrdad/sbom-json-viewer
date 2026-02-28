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

  it("should preserve vulnerabilities even if they don't have an affects array", () => {
    const sbom1 = {
      components: [{ name: "A", purl: "pkg:npm/A@1.0" }],
      vulnerabilities: [{ id: "CVE-NONE", description: "No affects" }]
    };
    const sbom2 = {
      components: [{ name: "B", purl: "pkg:npm/B@1.0" }],
      vulnerabilities: [{ id: "CVE-NONE-2", description: "Also no affects" }]
    };
    
    const merged = mergeSBOMs([sbom1, sbom2], ["S1", "S2"]);
    const vulnerabilities = merged?.vulnerabilities as any[];
    
    expect(vulnerabilities).toHaveLength(2);
    expect(vulnerabilities.find(v => v.id === "CVE-NONE")).toBeDefined();
    expect(vulnerabilities.find(v => v.id === "CVE-NONE-2")).toBeDefined();
  });

  it("should correctly merge when multiple components and vulnerabilities overlap", () => {
    const sbom1 = {
      components: [
        { name: "shared", version: "1.0", purl: "pkg:npm/shared@1.0", "bom-ref": "ref1" },
        { name: "only1", version: "1.0", purl: "pkg:npm/only1@1.0", "bom-ref": "ref2" }
      ],
      vulnerabilities: [
        { id: "CVE-SHARED", affects: [{ ref: "ref1" }] },
        { id: "CVE-ONLY1", affects: [{ ref: "ref2" }] }
      ]
    };
    const sbom2 = {
      components: [
        { name: "shared", version: "1.0", purl: "pkg:npm/shared@1.0", "bom-ref": "other-ref" },
        { name: "only2", version: "1.0", purl: "pkg:npm/only2@1.0", "bom-ref": "ref3" }
      ],
      vulnerabilities: [
        { id: "CVE-SHARED", affects: [{ ref: "other-ref" }] },
        { id: "CVE-ONLY2", affects: [{ ref: "ref3" }] }
      ]
    };

    const merged = mergeSBOMs([sbom1, sbom2], ["S1", "S2"]);
    
    expect(merged?.components).toHaveLength(3); // shared, only1, only2
    expect(merged?.vulnerabilities).toHaveLength(3); // CVE-SHARED (deduped), CVE-ONLY1, CVE-ONLY2
    
    const sharedVuln = (merged?.vulnerabilities as any[]).find(v => v.id === "CVE-SHARED");
    expect(sharedVuln._rawSources).toHaveLength(2);
    expect(sharedVuln.affects).toHaveLength(1);
    expect(sharedVuln.affects[0].ref).toBe("ref1");
  });

  it("should merge components without PURLs by using name and version", () => {
    const sbom1 = {
      components: [{ name: "A", version: "1.0", "bom-ref": "ref-A" }]
    };
    const sbom2 = {
      components: [
        { name: "A", version: "1.0", "bom-ref": "other-ref-A" },
        { name: "B", version: "2.0", "bom-ref": "ref-B" }
      ]
    };
    
    const merged = mergeSBOMs([sbom1, sbom2], ["S1", "S2"]);
    const components = merged?.components as any[];
    
    expect(components).toHaveLength(2); // Should deduplicate 'A' by name+version
    expect(components[0].name).toBe("A");
    expect(components[1].name).toBe("B");
    expect(components[0]._rawSources).toHaveLength(2);
  });

  it("should perform gap analysis identifying unique findings per source", () => {
    const sbom1 = {
      components: [
        { name: "shared", version: "1.0", purl: "pkg:npm/shared@1.0", "bom-ref": "r1" },
        { name: "unique1", version: "1.0", purl: "pkg:npm/u1@1.0", "bom-ref": "r2" }
      ],
      vulnerabilities: [
        { id: "V-SHARED", affects: [{ ref: "r1" }] },
        { id: "V-UNIQUE1", affects: [{ ref: "r2" }] }
      ]
    };
    const sbom2 = {
      components: [
        { name: "shared", version: "1.0", purl: "pkg:npm/shared@1.0", "bom-ref": "r-other" },
        { name: "unique2", version: "1.0", purl: "pkg:npm/u2@1.0", "bom-ref": "r3" }
      ],
      vulnerabilities: [
        { id: "V-SHARED", affects: [{ ref: "r-other" }] },
        { id: "V-UNIQUE2", affects: [{ ref: "r3" }] }
      ]
    };

    const merged = mergeSBOMs([sbom1, sbom2], ["Scanner1", "Scanner2"]);
    const stats = merged?.__multiSbomStats as any;

    expect(stats.gaps).toHaveLength(2);
    
    // Scanner 1 unique
    const gap1 = stats.gaps.find((g: any) => g.sourceName === "Scanner1");
    expect(gap1.uniqueComponents).toHaveLength(1);
    expect(gap1.uniqueComponents[0].name).toBe("unique1");
    expect(gap1.uniqueVulnerabilities).toHaveLength(1);
    expect(gap1.uniqueVulnerabilities[0].id).toBe("V-UNIQUE1");

    // Scanner 2 unique
    const gap2 = stats.gaps.find((g: any) => g.sourceName === "Scanner2");
    expect(gap2.uniqueComponents).toHaveLength(1);
    expect(gap2.uniqueComponents[0].name).toBe("unique2");
    expect(gap2.uniqueVulnerabilities).toHaveLength(1);
    expect(gap2.uniqueVulnerabilities[0].id).toBe("V-UNIQUE2");

    // Sources stats updated
    expect(stats.sources[0].uniqueComponents).toBe(1);
    expect(stats.sources[1].uniqueComponents).toBe(1);
  });

  it("should calculate crossSourceComponents with metadata tracking", () => {
    const sbom1 = {
      components: [
        { 
          name: "shared", version: "1.0", purl: "pkg:npm/shared@1.0", "bom-ref": "r1",
          licenses: [{ license: { id: "MIT" } }],
          hashes: [{ alg: "SHA-1", content: "abc" }]
        }
      ]
    };
    const sbom2 = {
      components: [
        { 
          name: "shared", version: "1.0", purl: "pkg:npm/shared@1.0", "bom-ref": "r2" 
          // Missing licenses and hashes in this source
        },
        { name: "only2", version: "1.0", purl: "pkg:npm/only2@1.0", "bom-ref": "r3" }
      ]
    };

    const merged = mergeSBOMs([sbom1, sbom2], ["S1", "S2"]);
    const stats = merged?.__multiSbomStats as any;

    expect(stats.crossSourceComponents).toBeDefined();
    expect(stats.crossSourceComponents).toHaveLength(2);

    const shared = stats.crossSourceComponents.find((c: any) => c.name === "shared");
    expect(shared.foundBy).toContain("S1");
    expect(shared.foundBy).toContain("S2");
    
    // Check metadata from S1
    expect(shared.metadataBySource["S1"].hasPurl).toBe(true);
    expect(shared.metadataBySource["S1"].hasLicenses).toBe(true);
    expect(shared.metadataBySource["S1"].hasHashes).toBe(true);

    // Check metadata from S2
    expect(shared.metadataBySource["S2"].hasPurl).toBe(true);
    expect(shared.metadataBySource["S2"].hasLicenses).toBe(false);
    expect(shared.metadataBySource["S2"].hasHashes).toBe(false);

    const only2 = stats.crossSourceComponents.find((c: any) => c.name === "only2");
    expect(only2.foundBy).toEqual(["S2"]);
    expect(only2.metadataBySource["S2"].hasPurl).toBe(true);
    expect(only2.metadataBySource["S1"]).toBeUndefined();
  });
});

