/**
 * Mock data utilities for testing SBOM formatting
 *
 * This file provides helper functions to create mock CycloneDX structures
 * for testing purposes. Why: These mocks allow us to test the Formatter
 * logic without depending on the full CycloneDX library implementation details.
 */

import {
  Bom,
  BomRef,
  Component,
  Metadata,
} from "@cyclonedx/cyclonedx-library/Models";
import { ComponentType } from "@cyclonedx/cyclonedx-library/Enums";

/**
 * Create a mock Component with minimal required fields
 * Why: Simplifies test setup by providing sensible defaults
 */
export const createMockComponent = (
  bomRef: string,
  name: string,
  options?: {
    type?: Component["type"];
    version?: string;
    licenses?: string[];
    dependencies?: string[];
  },
): Component => {
  const component = new Component(
    options?.type || ComponentType.Library,
    name,
    {
      bomRef,
      version: options?.version,
    },
  );

  // Add licenses if provided
  if (options?.licenses) {
    options.licenses.forEach((licenseId) => {
      const license = { id: licenseId } as any;
      component.licenses.add(license);
    });
  }

  // Add dependencies if provided
  if (options?.dependencies) {
    options.dependencies.forEach((depRef) => {
      component.dependencies.add(new BomRef(depRef));
    });
  }

  return component;
};

/**
 * Create a mock Vulnerability with severity
 * Why: Allows testing vulnerability categorization logic
 */
export const createMockVulnerability = (
  id: string,
  severity: "critical" | "high" | "medium" | "low" | "informational",
  affectsRefs: string[],
): any => {
  const vuln: any = {
    id,
    ratings: new Set([
      {
        severity: severity,
        score: 0,
      },
    ]),
    affects: new Set(
      affectsRefs.map((ref) => ({
        ref: new BomRef(ref),
        versions: new Set(),
      })),
    ),
    references: new Set(),
    cwes: new Set(),
    advisories: new Set(),
    tools: { components: new Set(), services: new Set() },
    properties: new Set(),
  };

  return vuln;
};

/**
 * Create a mock Bom with components and vulnerabilities
 * Why: Provides a complete test SBOM structure
 */
export const createMockBom = (options: {
  components?: Component[];
  vulnerabilities?: any[];
  metadata?: Partial<Metadata>;
}): Bom => {
  const bom = new Bom({
    metadata: options.metadata as any,
  });

  // Add components
  if (options.components) {
    options.components.forEach((component) => {
      bom.components.add(component);
    });
  }

  // Add vulnerabilities
  if (options.vulnerabilities) {
    options.vulnerabilities.forEach((vuln) => {
      bom.vulnerabilities.add(vuln);
    });
  }

  return bom;
};

/**
 * Create a simple SBOM with a linear dependency chain
 * Why: Tests basic dependency resolution
 *
 * Structure: A -> B -> C
 */
export const createLinearDependencyBom = (): Bom => {
  const componentA = createMockComponent("pkg:npm/a@1.0.0", "a", {
    version: "1.0.0",
    licenses: ["MIT"],
    dependencies: ["pkg:npm/b@1.0.0"],
  });

  const componentB = createMockComponent("pkg:npm/b@1.0.0", "b", {
    version: "1.0.0",
    licenses: ["Apache-2.0"],
    dependencies: ["pkg:npm/c@1.0.0"],
  });

  const componentC = createMockComponent("pkg:npm/c@1.0.0", "c", {
    version: "1.0.0",
    licenses: ["MIT"],
  });

  const vulnForC = createMockVulnerability("CVE-2024-0001", "high", [
    "pkg:npm/c@1.0.0",
  ]);

  return createMockBom({
    components: [componentA, componentB, componentC],
    vulnerabilities: [vulnForC],
  });
};

/**
 * Create a SBOM with shared dependencies (diamond pattern)
 * Why: Tests component replication when used multiple times
 *
 * Structure:
 *     A
 *    / \
 *   B   C
 *    \ /
 *     D
 */
export const createDiamondDependencyBom = (): Bom => {
  const componentA = createMockComponent("pkg:npm/a@1.0.0", "a", {
    version: "1.0.0",
    dependencies: ["pkg:npm/b@1.0.0", "pkg:npm/c@1.0.0"],
  });

  const componentB = createMockComponent("pkg:npm/b@1.0.0", "b", {
    version: "1.0.0",
    dependencies: ["pkg:npm/d@1.0.0"],
  });

  const componentC = createMockComponent("pkg:npm/c@1.0.0", "c", {
    version: "1.0.0",
    dependencies: ["pkg:npm/d@1.0.0"],
  });

  const componentD = createMockComponent("pkg:npm/d@1.0.0", "d", {
    version: "1.0.0",
    licenses: ["BSD-3-Clause"],
  });

  const vulnForD = createMockVulnerability("CVE-2024-0002", "critical", [
    "pkg:npm/d@1.0.0",
  ]);

  return createMockBom({
    components: [componentA, componentB, componentC, componentD],
    vulnerabilities: [vulnForD],
  });
};

/**
 * Create a SBOM with circular dependencies
 * Why: Tests circular dependency detection
 *
 * Structure: A -> B -> C -> B (circular)
 */
export const createCircularDependencyBom = (): Bom => {
  const componentA = createMockComponent("pkg:npm/a@1.0.0", "a", {
    version: "1.0.0",
    dependencies: ["pkg:npm/b@1.0.0"],
  });

  const componentB = createMockComponent("pkg:npm/b@1.0.0", "b", {
    version: "1.0.0",
    dependencies: ["pkg:npm/c@1.0.0"],
  });

  const componentC = createMockComponent("pkg:npm/c@1.0.0", "c", {
    version: "1.0.0",
    dependencies: ["pkg:npm/b@1.0.0"], // Circular!
  });

  return createMockBom({
    components: [componentA, componentB, componentC],
  });
};

/**
 * Create a SBOM with multiple vulnerabilities at different severity levels
 * Why: Tests vulnerability categorization
 */
export const createMultiVulnerabilityBom = (): Bom => {
  const component = createMockComponent("pkg:npm/vuln-lib@1.0.0", "vuln-lib", {
    version: "1.0.0",
  });

  const criticalVuln = createMockVulnerability("CVE-2024-0001", "critical", [
    "pkg:npm/vuln-lib@1.0.0",
  ]);

  const highVuln = createMockVulnerability("CVE-2024-0002", "high", [
    "pkg:npm/vuln-lib@1.0.0",
  ]);

  const mediumVuln = createMockVulnerability("CVE-2024-0003", "medium", [
    "pkg:npm/vuln-lib@1.0.0",
  ]);

  const lowVuln = createMockVulnerability("CVE-2024-0004", "low", [
    "pkg:npm/vuln-lib@1.0.0",
  ]);

  return createMockBom({
    components: [component],
    vulnerabilities: [criticalVuln, highVuln, mediumVuln, lowVuln],
  });
};

/**
 * Create a larger SBOM for performance benchmarks
 * Why: Ensures Formatter benchmarks reflect realistic nested dependency graphs
 */
export const createLargeBom = (options: {
  depth: number;
  fanout: number;
  vulnerabilitiesPerLeaf?: number;
  licensePool?: string[];
}): Bom => {
  const {
    depth,
    fanout,
    vulnerabilitiesPerLeaf = 1,
    licensePool = ["MIT", "Apache-2.0", "BSD-3-Clause"],
  } = options;

  if (depth <= 0 || fanout <= 0) {
    return createMockBom({ components: [], vulnerabilities: [] });
  }

  const componentsByLevel: Component[][] = [];
  let componentIndex = 0;

  for (let level = 0; level < depth; level += 1) {
    const levelCount = Math.max(1, Math.pow(fanout, level));
    const levelComponents: Component[] = [];

    for (let i = 0; i < levelCount; i += 1) {
      const name = `comp-${componentIndex}`;
      const bomRef = `pkg:npm/comp-${componentIndex}@1.0.0`;

      levelComponents.push(
        createMockComponent(bomRef, name, {
          version: "1.0.0",
          licenses: [licensePool[componentIndex % licensePool.length]],
        }),
      );

      componentIndex += 1;
    }

    componentsByLevel.push(levelComponents);
  }

  for (let level = 0; level < depth - 1; level += 1) {
    const parents = componentsByLevel[level];
    const children = componentsByLevel[level + 1];

    parents.forEach((parent, parentIndex) => {
      for (let offset = 0; offset < fanout; offset += 1) {
        const childIndex = parentIndex * fanout + offset;
        const child = children[childIndex];

        if (child) {
          parent.dependencies.add(new BomRef(child.bomRef.value));
        }
      }
    });
  }

  const leafComponents = componentsByLevel[componentsByLevel.length - 1] || [];
  const vulnerabilities: any[] = [];

  leafComponents.forEach((leaf, leafIndex) => {
    for (let i = 0; i < vulnerabilitiesPerLeaf; i += 1) {
      vulnerabilities.push(
        createMockVulnerability(`CVE-PERF-${leafIndex}-${i}`, "low", [
          leaf.bomRef.value,
        ]),
      );
    }
  });

  return createMockBom({
    components: componentsByLevel.flat(),
    vulnerabilities,
  });
};

/**
 * Create an empty SBOM
 * Why: Tests edge case handling
 */
export const createEmptyBom = (): Bom => {
  return createMockBom({
    components: [],
    vulnerabilities: [],
  });
};
