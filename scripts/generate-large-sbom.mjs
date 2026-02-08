import fs from 'fs';

/**
 * Generates a large CycloneDX SBOM for testing performance.
 * 20,000 components with random dependencies and vulnerabilities.
 */

const COUNT = 20000;
const VULN_COUNT = 500;

const sbom = {
  bomFormat: "CycloneDX",
  specVersion: "1.5",
  metadata: {
    timestamp: new Date().toISOString(),
    component: {
      "bom-ref": "root",
      type: "application",
      name: "Huge-App",
      version: "1.0.0"
    }
  },
  components: [],
  dependencies: [],
  vulnerabilities: []
};

// Generate components
for (let i = 0; i < COUNT; i++) {
  const ref = `pkg:npm/comp-${i}@1.0.0`;
  sbom.components.push({
    "bom-ref": ref,
    type: "library",
    name: `component-${i}`,
    version: "1.0.0",
    description: `A large component for stress testing number ${i}`
  });
}

// Generate dependencies (A tree-ish structure with some random cross-deps)
const dependsOnRoot = [];
for (let i = 0; i < COUNT; i++) {
  const ref = `pkg:npm/comp-${i}@1.0.0`;
  
  // First 100 depend on root
  if (i < 100) {
    dependsOnRoot.push(ref);
  } else {
    // Each other component depends on a random previous component
    const parentIdx = Math.floor(i / 10);
    const parentRef = `pkg:npm/comp-${parentIdx}@1.0.0`;
    
    let depEntry = sbom.dependencies.find(d => d.ref === parentRef);
    if (!depEntry) {
      depEntry = { ref: parentRef, dependsOn: [] };
      sbom.dependencies.push(depEntry);
    }
    depEntry.dependsOn.push(ref);
  }
}

sbom.dependencies.push({ ref: "root", dependsOn: dependsOnRoot });

// Generate vulnerabilities
for (let i = 0; i < VULN_COUNT; i++) {
  const affectedRef = `pkg:npm/comp-${Math.floor(Math.random() * COUNT)}@1.0.0`;
  sbom.vulnerabilities.push({
    id: `CVE-STRESS-${i}`,
    description: `A stress test vulnerability number ${i}`,
    ratings: [{
      severity: i % 4 === 0 ? "critical" : i % 3 === 0 ? "high" : "medium",
      score: 9.0
    }],
    affects: [{ ref: affectedRef }]
  });
}

fs.writeFileSync('sbom-huge.cyclonedx.json', JSON.stringify(sbom, null, 2));
console.log(`Generated sbom-huge.cyclonedx.json with ${COUNT} components.`);
