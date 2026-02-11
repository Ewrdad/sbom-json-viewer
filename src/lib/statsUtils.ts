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
    exposureRate: 0,
    avgVulnerabilitiesPerComponent: 0,
  };

  const licenseSummaryMap = new Map<string, { id: string; name: string; category: string; affectedRefs: Set<string> }>();
  const componentLicenseMap = new Map<string, { id: string; name: string; category: string }[]>();

  const compVulnMap = new Map<string, { critical: number; high: number; medium: number; low: number; total: number }>();
  const vulnSummaryMap = new Map<string, { id: string; severity: string; affectedRefs: Set<string>; title?: string }>();

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
      title: vuln.description || vuln.detail
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
    const ref = component.bomRef?.value || (component as any).bomRef;

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
        if (c.bomRef?.value === ref || (c as any).bomRef === ref) {
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
        if (c.bomRef?.value === ref || (c as any).bomRef === ref) {
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
    stats.exposureRate = Math.round((stats.allVulnerableComponents.length / stats.totalComponents) * 100);
    stats.avgVulnerabilitiesPerComponent = parseFloat((stats.totalVulnerabilities / stats.totalComponents).toFixed(2));
  }

  stats.allVulnerabilities = Array.from(vulnSummaryMap.values())
    .map(v => ({
      id: v.id,
      severity: v.severity,
      affectedCount: v.affectedRefs.size,
      title: v.title
    }))
    .sort((a, b) => b.affectedCount - a.affectedCount || a.id.localeCompare(b.id));

  stats.uniqueVulnerabilityCount = vulnSummaryMap.size;

  return stats;
}
