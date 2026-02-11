import { describe, it, expect } from "vitest";
import { Formatter } from "../src/renderer/Formatter/Formatter";
import { Bom, Component, Vulnerability, BomRef } from "@cyclonedx/cyclonedx-library/Models";

describe("Formatter Transitive Vulnerabilities", () => {
  it("should propagate vulnerabilities from dependencies to parents", async () => {
    const bom = new Bom();
    
    // Create components
    const parent = new Component("library", "parent", { bomRef: "pkg:parent" });
    const child = new Component("library", "child", { bomRef: "pkg:child" });
    
    // Set up dependencies
    parent.dependencies.add(new BomRef("pkg:child"));
    
    bom.components.add(parent);
    bom.components.add(child);
    
    // Add vulnerability to child
    const vuln = {
      id: "CVE-CHILD-001",
      description: "Child vulnerability",
      ratings: [{ severity: "high", score: 8.5 }],
      affects: [{ ref: "pkg:child" }]
    };
    bom.vulnerabilities.add(vuln as any);
    
    const formatted = await Formatter({
      rawSBOM: bom,
      setProgress: () => {},
    });
    
    const parentEnhanced = formatted.componentMap.get("pkg:parent");
    const childEnhanced = formatted.componentMap.get("pkg:child");
    
    expect(childEnhanced?.vulnerabilities.inherent.High.length).toBe(1);
    expect(childEnhanced?.vulnerabilities.transitive.High.length).toBe(0);
    
    expect(parentEnhanced?.vulnerabilities.inherent.High.length).toBe(0);
    expect(parentEnhanced?.vulnerabilities.transitive.High.length).toBe(1);
    expect(parentEnhanced?.vulnerabilities.transitive.High[0].id).toBe("CVE-CHILD-001");
  });

  it("should deduplicate transitive vulnerabilities from multiple paths", async () => {
    const bom = new Bom();
    
    const root = new Component("library", "root", { bomRef: "pkg:root" });
    const d1 = new Component("library", "d1", { bomRef: "pkg:d1" });
    const d2 = new Component("library", "d2", { bomRef: "pkg:d2" });
    const shared = new Component("library", "shared", { bomRef: "pkg:shared" });
    
    root.dependencies.add(new BomRef("pkg:d1"));
    root.dependencies.add(new BomRef("pkg:d2"));
    d1.dependencies.add(new BomRef("pkg:shared"));
    d2.dependencies.add(new BomRef("pkg:shared"));
    
    bom.components.add(root);
    bom.components.add(d1);
    bom.components.add(d2);
    bom.components.add(shared);
    
    const vuln = {
      id: "CVE-SHARED-001",
      ratings: [{ severity: "critical" }],
      affects: [{ ref: "pkg:shared" }]
    };
    bom.vulnerabilities.add(vuln as any);
    
    const formatted = await Formatter({
      rawSBOM: bom,
      setProgress: () => {},
    });
    
    const rootNodes = formatted.componentMap.get("pkg:root");
    expect(rootNodes?.vulnerabilities.transitive.Critical.length).toBe(1);
  });

  it("should handle circular dependencies without stack overflow", async () => {
    const bom = new Bom();
    
    const a = new Component("library" as any, "A", { bomRef: "pkg:A" });
    const b = new Component("library" as any, "B", { bomRef: "pkg:B" });
    
    a.dependencies.add(new BomRef("pkg:B"));
    b.dependencies.add(new BomRef("pkg:A"));
    
    bom.components.add(a);
    bom.components.add(b);
    
    const vuln = {
      id: "CVE-A-001",
      ratings: [{ severity: "high" }],
      affects: [{ ref: "pkg:A" }]
    };
    bom.vulnerabilities.add(vuln as any);
    
    const formatted = await Formatter({
      rawSBOM: bom,
      setProgress: () => {},
    });
    
    const bEnhanced = formatted.componentMap.get("pkg:B");
    expect(bEnhanced?.vulnerabilities.transitive.High.length).toBe(1);
    expect(bEnhanced?.vulnerabilities.transitive.High[0].id).toBe("CVE-A-001");
  });

  it("should count same CVE on different packages separately (npm audit parity)", async () => {
    // Why: npm audit counts each affected package as a separate finding.
    // If CVE-1 affects both B and C, npm audit reports 2 findings, not 1.
    const bom = new Bom();

    const root = new Component("library", "root", { bomRef: "pkg:root" });
    const b = new Component("library", "b", { bomRef: "pkg:b" });
    const c = new Component("library", "c", { bomRef: "pkg:c" });

    root.dependencies.add(new BomRef("pkg:b"));
    root.dependencies.add(new BomRef("pkg:c"));

    bom.components.add(root);
    bom.components.add(b);
    bom.components.add(c);

    // Same CVE affects BOTH b and c
    const vuln = {
      id: "CVE-SHARED-001",
      ratings: [{ severity: "high" }],
      affects: [{ ref: "pkg:b" }, { ref: "pkg:c" }]
    };
    bom.vulnerabilities.add(vuln as any);

    const formatted = await Formatter({
      rawSBOM: bom,
      setProgress: () => {},
    });

    const rootEnhanced = formatted.componentMap.get("pkg:root");
    // Should be 2 (one per affected package), NOT 1 (deduplicated by CVE ID)
    expect(rootEnhanced?.vulnerabilities.transitive.High.length).toBe(2);
  });

  it("should still dedup same CVE on same package via diamond paths", async () => {
    // Why: Diamond dependency pattern should NOT double-count.
    // Root -> A -> D(CVE-1), Root -> B -> D(CVE-1) => Root transitive = 1 (same package D)
    const bom = new Bom();

    const root = new Component("library", "root", { bomRef: "pkg:root" });
    const a = new Component("library", "a", { bomRef: "pkg:a" });
    const b = new Component("library", "b", { bomRef: "pkg:b" });
    const d = new Component("library", "d", { bomRef: "pkg:d" });

    root.dependencies.add(new BomRef("pkg:a"));
    root.dependencies.add(new BomRef("pkg:b"));
    a.dependencies.add(new BomRef("pkg:d"));
    b.dependencies.add(new BomRef("pkg:d"));

    bom.components.add(root);
    bom.components.add(a);
    bom.components.add(b);
    bom.components.add(d);

    const vuln = {
      id: "CVE-DIAMOND-001",
      ratings: [{ severity: "critical" }],
      affects: [{ ref: "pkg:d" }]
    };
    bom.vulnerabilities.add(vuln as any);

    const formatted = await Formatter({
      rawSBOM: bom,
      setProgress: () => {},
    });

    const rootEnhanced = formatted.componentMap.get("pkg:root");
    // Should be 1, not 2 — same package D reached via two paths
    expect(rootEnhanced?.vulnerabilities.transitive.Critical.length).toBe(1);
  });
});
