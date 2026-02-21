import { describe, it, expect } from 'vitest';
import { calculateSbomStats } from './statsUtils';

describe('statsUtils Dependency Analysis', () => {
    it('should correctly count dependents from standard JSON top-level dependencies', () => {
        const bom = {
            components: [
                { "bom-ref": "pkg1", name: "Package 1", version: "1.0.0" },
                { "bom-ref": "pkg2", name: "Package 2", version: "1.0.0" },
                { "bom-ref": "pkg3", name: "Package 3", version: "1.0.0" }
            ],
            dependencies: [
                { ref: "pkg1", dependsOn: ["pkg2", "pkg3"] },
                { ref: "pkg2", dependsOn: ["pkg3"] }
            ],
            vulnerabilities: []
        };

        const stats = calculateSbomStats(bom);
        
        // Dependents counts:
        // pkg3 <- pkg1, pkg2 (2 dependents)
        // pkg2 <- pkg1 (1 dependent)
        // pkg1 <- (0 dependents)

        expect(stats.dependentsDistribution[0]).toBe(1); // pkg1
        expect(stats.dependentsDistribution[1]).toBe(1); // pkg2
        expect(stats.dependentsDistribution[2]).toBe(1); // pkg3
    });

    it('should correctly count dependents from legacy component-level dependencies (fallback)', () => {
        const bom = {
            components: [
                { 
                    "bom-ref": "pkg1", 
                    name: "Package 1", 
                    version: "1.0.0",
                    dependencies: ["pkg2"] 
                },
                { 
                    "bom-ref": "pkg2", 
                    name: "Package 2", 
                    version: "1.0.0",
                    dependencies: []
                }
            ],
            vulnerabilities: []
        };

        const stats = calculateSbomStats(bom);
        
        expect(stats.dependentsDistribution[0]).toBe(1); // pkg1
        expect(stats.dependentsDistribution[1]).toBe(1); // pkg2
    });

    it('should handle Sets/Iterables in component dependencies (Library Model)', () => {
        // Simulating the CycloneDX library behavior where dependencies are Sets of objects/refs
        const bom = {
            components: [
                { 
                    "bom-ref": "pkg1", 
                    name: "Package 1", 
                    version: "1.0.0",
                    dependencies: new Set([{ value: "pkg2" }, { value: "pkg3" }])
                },
                { 
                    "bom-ref": "pkg2", 
                    name: "Package 2", 
                    version: "1.0.0",
                    dependencies: new Set([{ value: "pkg3" }])
                },
                { 
                    "bom-ref": "pkg3", 
                    name: "Package 3", 
                    version: "1.0.0",
                    dependencies: new Set()
                }
            ],
            vulnerabilities: []
        };

        const stats = calculateSbomStats(bom);
        
        expect(stats.dependentsDistribution[0]).toBe(1); // pkg1
        expect(stats.dependentsDistribution[1]).toBe(1); // pkg2
        expect(stats.dependentsDistribution[2]).toBe(1); // pkg3
    });

    it('should correctly link root component to direct dependencies if metadata is present', () => {
        // This test verifies logic often handled in bomConverter but also implicit in graph traversal
        const bom = {
            metadata: {
                component: { "bom-ref": "root-app", name: "Root App", version: "1.0.0" }
            },
            components: [
                { "bom-ref": "pkg1", name: "Package 1", version: "1.0.0" }
            ],
            dependencies: [
                { ref: "root-app", dependsOn: ["pkg1"] }
            ],
            vulnerabilities: []
        };

        const stats = calculateSbomStats(bom);

        // pkg1 has 1 dependent (root-app)
        // root-app has 0 dependents (it's the root)
        
        expect(stats.dependentsDistribution[1]).toBe(1); // pkg1
        
        // Check if root is counted in distribution (stats logic iterates over `components` prop + metadata root is separate logic sometimes)
        // In statsUtils, we iterate over `components`. If root is not in `components`, it won't be in distribution counts unless added there.
        // `calculateSbomStats` iterates over `components`.
    });

    describe('Developer Insights - calculateDeveloperStats', () => {
        it('should correctly identify version conflicts', () => {
            const bom = {
                components: [
                    { "bom-ref": "pkg1-v1", name: "Lodash", version: "1.0.0" },
                    { "bom-ref": "pkg1-v2", name: "Lodash", version: "2.0.0" },
                    { "bom-ref": "pkg2", name: "React", version: "18.0.0" }
                ],
                vulnerabilities: []
            };

            const stats = calculateSbomStats(bom);
            expect(stats.developerStats).toBeDefined();
            const { versionConflicts } = stats.developerStats!;
            
            expect(versionConflicts).toHaveLength(1);
            expect(versionConflicts[0].name).toBe("Lodash");
            expect(versionConflicts[0].versions).toContain("1.0.0");
            expect(versionConflicts[0].versions).toContain("2.0.0");
            expect(versionConflicts[0].affectedRefs).toContain("pkg1-v1");
        });

        it('should correctly calculate metadata quality score and grade', () => {
            const bom = {
                components: [
                    { 
                        "bom-ref": "pkg1", 
                        name: "Package 1", 
                        version: "1.0.0",
                        purl: "pkg:npm/package1@1.0.0",
                        hashes: [{ alg: "SHA-256", content: "hash1" }],
                        licenses: [{ license: { id: "MIT" } }],
                        supplier: { name: "Supplier A" },
                        properties: [{ name: "prop1", value: "val1" }]
                    },
                    { 
                        "bom-ref": "pkg2", 
                        name: "Package 2", 
                        version: "1.0.0",
                        purl: "pkg:npm/package2@1.0.0" 
                        // Missing hashes, licenses, supplier, properties
                    }
                ],
                vulnerabilities: []
            };

            const stats = calculateSbomStats(bom);
            expect(stats.developerStats).toBeDefined();
            const { metadataQuality } = stats.developerStats!;
            
            // Expected bounds (> 50% threshold for standard, > 10% or > 0 for lenient) 
            // Here, exactly 1 out of 2 has the metadata.
            // purl is in 2/2 -> check is true.
            // licenses is standard (>1 required) -> false
            // hashes, supplier, properties use lenient (>0 required) -> true
            expect(metadataQuality.checks.purl).toBe(true);
            expect(metadataQuality.checks.hashes).toBe(true);
            expect(metadataQuality.checks.licenses).toBe(false);
            expect(metadataQuality.checks.supplier).toBe(true);
            expect(metadataQuality.checks.properties).toBe(true);

            // Grade should be B (Score: 20 purl + 15 hashes + 15 supplier + 10 properties = 60)
            expect(metadataQuality.score).toBe(60);
            expect(metadataQuality.grade).toBe("B");
        });

        it('should assign A grade if all metadata threshold checks pass', () => {
            const bom = {
                components: [
                    { 
                        "bom-ref": "pkg1", 
                        name: "Package 1", 
                        version: "1.0.0",
                        purl: "pkg...",
                        hashes: [{}],
                        licenses: [{}],
                        supplier: {},
                        properties: [{}]
                    }
                ],
                metadata: { tools: ["cdxgen"] },
                dependencies: [{ ref: "pkg1", dependsOn: [] }],
                vulnerabilities: []
            };
            const stats = calculateSbomStats(bom);
            const { metadataQuality } = stats.developerStats!;
            expect(metadataQuality.score).toBe(100);
            expect(metadataQuality.grade).toBe("A");
        });
    });
});
