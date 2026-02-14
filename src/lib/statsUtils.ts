import { type SbomStats } from "../types/sbom";
import { getLicenseCategory } from "./licenseUtils";

const severityOrder = ["critical", "high", "medium", "low"] as const;

export function calculateSbomStats(bom: any): SbomStats {
  const stats: SbomStats = {
    totalComponents: bom.components?.size || (Array.isArray(bom.components) ? bom.components.length : 0),
    vulnerabilityCounts: { critical: 0, high: 0, medium: 0, low: 0, none: 0 },
    licenseCounts: {},
    topLicenses: [],
    licenseDistribution: {
      permissive: 0,
      copyleft: 0,
      weakCopyleft: 0,
      proprietary: 0,
      unknown: 0,
    },
    vulnerableComponents: [],
    allVulnerableComponents: [],
    totalVulnerabilities: 0,
    allVulnerabilities: [],
    allLicenses: [],
    allLicenseComponents: [],
    uniqueVulnerabilityCount: 0,
    avgVulnerabilitiesPerComponent: 0,
    dependencyStats: { direct: 0, transitive: 0 },
    dependentsDistribution: {},
    vulnerabilityImpactDistribution: {},
  };

  const licenseSummaryMap = new Map<string, { id: string; name: string; category: string; affectedRefs: Set<string> }>();
  const componentLicenseMap = new Map<string, { id: string; name: string; category: string }[]>();

  const compVulnMap = new Map<string, { critical: number; high: number; medium: number; low: number; total: number }>();
  const vulnSummaryMap = new Map<string, { 
    id: string; 
    severity: string; 
    affectedRefs: Set<string>; 
    title?: string;
    description?: string;
    detail?: string;
    recommendation?: string;
    advisories?: { title?: string; url: string }[];
    cwes?: number[];
    source?: { name?: string; url?: string };
    references?: { url: string; comment?: string }[];
    ratings?: any[];
    analysis?: {
      state?: string;
      justification?: string;
      response?: string[];
      detail?: string;
      firstAppearance?: string;
      lastAppearance?: string;
    };
    created?: string;
    published?: string;
    updated?: string;
    rejected?: string;
    proofOfConcept?: {
      reproductionSteps?: string;
      environment?: string;
      screenshots?: { image: { attachment: string; contentType: string } }[];
    };
  }>();

  // Helper to normalize severity string
  const normalizeSeverity = (responseSeverity?: string) => {
    const s = responseSeverity?.toLowerCase() || "none";
    return (severityOrder as unknown as string[]).includes(s) ? s : "none";
  };

  const components = Array.isArray(bom.components) ? bom.components : Array.from(bom.components || []);
  const vulnerabilities = Array.isArray(bom.vulnerabilities) ? bom.vulnerabilities : Array.from(bom.vulnerabilities || []);

  // 1. Process vulnerabilities (Finding-based counting)
  for (const vuln of vulnerabilities) {
    let maxSeverity = "none";
    
    for (const rating of (vuln.ratings || [])) {
      const severity = normalizeSeverity(rating.severity?.toString());
      if (severity !== "none" && (maxSeverity === "none" || severityOrder.indexOf(severity as any) < severityOrder.indexOf(maxSeverity as any))) {
        maxSeverity = severity;
      }
    }

    const vulnId = vuln.id || "Unknown";
    const existingSummary = vulnSummaryMap.get(vulnId) || {
      id: vulnId,
      severity: maxSeverity,
      affectedRefs: new Set<string>(),
      title: vuln.description || vuln.detail, // Fallback for simple title
      description: vuln.description,
      detail: vuln.detail,
      recommendation: vuln.recommendation,
      advisories: vuln.advisories,
      cwes: vuln.cwes,
      source: vuln.source,
      references: vuln.references,
      ratings: vuln.ratings,
      analysis: vuln.analysis,
      created: vuln.created,
      published: vuln.published,
      updated: vuln.updated,
      rejected: vuln.rejected,
      proofOfConcept: vuln.proofOfConcept,
    };

    if (maxSeverity !== "none" && (existingSummary.severity === "none" || severityOrder.indexOf(maxSeverity as any) < severityOrder.indexOf(existingSummary.severity as any))) {
      existingSummary.severity = maxSeverity;
    }

    for (const affect of (vuln.affects || [])) {
      const ref = affect.ref?.value || affect.ref;
      if (!ref) continue;
      
      existingSummary.affectedRefs.add(ref);
      
      const current = compVulnMap.get(ref) || { critical: 0, high: 0, medium: 0, low: 0, total: 0 };
      
      if (maxSeverity === "critical") stats.vulnerabilityCounts.critical++;
      else if (maxSeverity === "high") stats.vulnerabilityCounts.high++;
      else if (maxSeverity === "medium") stats.vulnerabilityCounts.medium++;
      else if (maxSeverity === "low") stats.vulnerabilityCounts.low++;
      else stats.vulnerabilityCounts.none++;

      if (maxSeverity === "critical") current.critical++;
      else if (maxSeverity === "high") current.high++;
      else if (maxSeverity === "medium") current.medium++;
      else if (maxSeverity === "low") current.low++;
      
      current.total++;
      compVulnMap.set(ref, current);
    }
    
    vulnSummaryMap.set(vulnId, existingSummary);
  }

  // 2. Process licenses
  for (const component of components) {
    const licenses = Array.from(component.licenses || []);
    const ref = component.bomRef?.value || component.bomRef || component["bom-ref"];

    if (licenses.length === 0) {
      stats.licenseDistribution.unknown++;
    } else {
      for (const license of licenses) {
        const id = (license as any).id || (license as any).name;
        const name = (license as any).name || id || "Unknown";
        stats.licenseCounts[name] = (stats.licenseCounts[name] || 0) + 1;

        const category = getLicenseCategory(id);
        if (category === "permissive") stats.licenseDistribution.permissive++;
        else if (category === "copyleft") stats.licenseDistribution.copyleft++;
        else if (category === "weak-copyleft")
          stats.licenseDistribution.weakCopyleft++;
        else if (category === "proprietary") stats.licenseDistribution.proprietary++;
        else stats.licenseDistribution.unknown++;

        if (id) {
          const summary = licenseSummaryMap.get(id) || {
            id,
            name,
            category,
            affectedRefs: new Set<string>(),
          };
          if (ref) summary.affectedRefs.add(ref);
          licenseSummaryMap.set(id, summary);

          if (ref) {
            const compLicenses = componentLicenseMap.get(ref) || [];
            compLicenses.push({ id, name, category });
            componentLicenseMap.set(ref, compLicenses);
          }
        }
      }
    }
  }

  // 3. Finalize Lists and Aggregations
  stats.allLicenses = Array.from(licenseSummaryMap.values())
    .map((l) => ({
      id: l.id,
      name: l.name,
      category: l.category,
      affectedCount: l.affectedRefs.size,
    }))
    .sort((a, b) => b.affectedCount - a.affectedCount);

  stats.allLicenseComponents = Array.from(componentLicenseMap.entries()).map(
    ([ref, licenses]) => {
      let name = "Unknown";
      let version = "";
      for (const c of components) {
        if (c.bomRef?.value === ref || c.bomRef === ref || c["bom-ref"] === ref) {
          name = c.name;
          version = c.version;
          break;
        }
      }
      return { name, version, ref, licenses };
    },
  );

  stats.topLicenses = Object.entries(stats.licenseCounts)
    .map(([name, count]) => ({ name, count: count as number }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const allVulns = Array.from(compVulnMap.entries())
    .map(([ref, vulns]) => {
      let name = "Unknown";
      let version = "";
      for (const c of components) {
        if (c.bomRef?.value === ref || c.bomRef === ref || c["bom-ref"] === ref) {
          name = c.name;
          version = c.version;
          break;
        }
      }
      return { name, version, ref, ...vulns };
    })
    .sort((a, b) => {
      if (b.critical !== a.critical) return b.critical - a.critical;
      if (b.high !== a.high) return b.high - a.high;
      return b.total - a.total;
    });

  stats.allVulnerableComponents = allVulns;
  stats.vulnerableComponents = allVulns.slice(0, 5);
  stats.totalVulnerabilities = stats.vulnerabilityCounts.critical +
    stats.vulnerabilityCounts.high +
    stats.vulnerabilityCounts.medium +
    stats.vulnerabilityCounts.low;

  if (stats.totalComponents > 0) {
    stats.avgVulnerabilitiesPerComponent = parseFloat((stats.totalVulnerabilities / stats.totalComponents).toFixed(2));
  }

  // 4. Build universal adjacency list for graph analysis
  const adjList = new Map<string, string[]>();
  const depthMap = new Map<string, number>();
  
  // A) Process top-level dependencies (spec canonical)
  const topLevelDeps = bom.dependencies || [];
  const depEntries = Array.isArray(topLevelDeps) ? topLevelDeps : (typeof topLevelDeps.values === 'function' ? Array.from(topLevelDeps.values()) : []);
  
  for (const dep of depEntries as any[]) {
    const parentRef = dep.ref?.value || dep.ref;
    if (!parentRef) continue;
    const children = Array.isArray(dep.dependsOn) 
      ? dep.dependsOn.map((c: any) => c.value || c)
      : (dep.dependsOn && typeof dep.dependsOn.values === 'function' 
          ? Array.from(dep.dependsOn.values()).map((c: any) => c.value || c) 
          : (typeof dep.dependsOn?.forEach === 'function'
              ? (() => { const r: string[] = []; dep.dependsOn.forEach((c: any) => r.push(c.value || c)); return r; })()
              : []));
    
    if (children.length > 0) {
      const existing = adjList.get(parentRef) || [];
      adjList.set(parentRef, [...new Set([...existing, ...children])]);
    }
  }

  // B) Process per-component dependencies (fallback/redundancy)
  for (const component of components) {
    const parentRef = component.bomRef?.value || component.bomRef || component["bom-ref"];
    if (!parentRef) continue;
    
    const compDeps = component.dependencies;
    if (compDeps) {
      const children = Array.isArray(compDeps)
        ? compDeps.map((c: any) => c.value || c)
        : (typeof compDeps.values === 'function' 
            ? Array.from(compDeps.values()).map((c: any) => c.value || c)
            : (typeof compDeps.forEach === 'function'
                ? (() => { const r: string[] = []; compDeps.forEach((c: any) => r.push(c.value || c)); return r; })()
                : []));
      
      if (children.length > 0) {
        const existing = adjList.get(parentRef) || [];
        adjList.set(parentRef, [...new Set([...existing, ...children])]);
      }
    }
  }

  const metadataComponent = bom.metadata?.component?.bomRef?.value || 
                            bom.metadata?.component?.bomRef || 
                            bom.metadata?.component?.["bom-ref"];

  if (metadataComponent) {
    const queue: { ref: string; depth: number }[] = [{ ref: metadataComponent, depth: 0 }];
    const visited = new Set<string>();
    visited.add(metadataComponent);
    
    while (queue.length > 0) {
      const { ref, depth } = queue.shift()!;
      depthMap.set(ref, depth);
      
      const children = adjList.get(ref) || [];
      for (const childRef of children) {
        if (!visited.has(childRef)) {
          visited.add(childRef);
          queue.push({ ref: childRef, depth: depth + 1 });
        }
      }
    }
  }

  // 5. Calculate dependents (in-degree) for distribution
  const inDegreeMap = new Map<string, number>();
  // Initialize all components with 0 dependents
  for (const component of components) {
    const ref = component.bomRef?.value || component.bomRef || component["bom-ref"];
    if (ref) inDegreeMap.set(ref, 0);
  }

  // Count dependents
  for (const [, children] of adjList.entries()) {
    for (const childRef of children) {
      if (inDegreeMap.has(childRef)) {
        inDegreeMap.set(childRef, (inDegreeMap.get(childRef) || 0) + 1);
      }
    }
  }

  // Populate dependents distributions
  for (const [ref, count] of inDegreeMap.entries()) {
    // High-level "Direct" vs "Transitive" still uses depth 1 from BFS if matched
    // components not in depthMap are either root or disconnected
    
    stats.dependentsDistribution[count] = (stats.dependentsDistribution[count] || 0) + 1;
    
    const compVulns = compVulnMap.get(ref);
    if (compVulns) {
      stats.vulnerabilityImpactDistribution[count] = (stats.vulnerabilityImpactDistribution[count] || 0) + compVulns.total;
    }
  }

  // High-level summary (depth-based is more accurate for "direct" vs "transitive")
  const depth1Count = Array.from(depthMap.values()).filter(d => d === 1).length;
  stats.dependencyStats.direct = depth1Count;
  stats.dependencyStats.transitive = Math.max(0, stats.totalComponents - depth1Count);

  // Fallback for distributions if no graph
  if (Object.keys(stats.dependentsDistribution).length === 0) {
    stats.dependentsDistribution[0] = stats.totalComponents;
    stats.vulnerabilityImpactDistribution[0] = stats.totalVulnerabilities;
  }

  stats.allVulnerabilities = Array.from(vulnSummaryMap.values())
    .map(v => ({
      id: v.id,
      severity: v.severity,
      affectedCount: v.affectedRefs.size,
      affectedComponentRefs: Array.from(v.affectedRefs),
      title: v.title,
      description: v.description,
      detail: v.detail,
      recommendation: v.recommendation,
      advisories: v.advisories,
      cwes: v.cwes,
      source: v.source,
      references: v.references,
      ratings: v.ratings,
      analysis: v.analysis,
      created: v.created,
      published: v.published,
      updated: v.updated,
      rejected: v.rejected,
      proofOfConcept: v.proofOfConcept,
    }))
    .sort((a, b) => b.affectedCount - a.affectedCount || a.id.localeCompare(b.id));

  stats.uniqueVulnerabilityCount = vulnSummaryMap.size;

  return stats;
}
