import { useEffect, useState } from "react";
import { type Bom } from "@cyclonedx/cyclonedx-library/Models";
import { batchProcess, tick } from "../lib/asyncUtils";

import { type SbomStats } from "../types/sbom";
import { getLicenseCategory } from "../lib/licenseUtils";

export function useSbomStats(sbom: Bom | null): SbomStats | null {
  const [stats, setStats] = useState<SbomStats | null>(null);

  useEffect(() => {
    if (!sbom) {
      setStats(null);
      return;
    }

    let cancelled = false;
    const run = async () => {
      const computed = await computeStats(sbom);
      if (!cancelled) {
        setStats(computed);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [sbom]);

  return stats;
}

const severityOrder = ["critical", "high", "medium", "low"] as const;

async function computeStats(sbom: Bom): Promise<SbomStats> {
  const stats: SbomStats = {
    totalComponents: sbom.components.size,
    vulnerabilityCounts: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      none: 0,
    },
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
  };

  const licenseSummaryMap = new Map<string, { id: string; name: string; category: string; affectedRefs: Set<string> }>();
  const componentLicenseMap = new Map<string, { id: string; name: string; category: string }[]>();

  const vulnSummaryMap = new Map<string, { id: string; severity: string; affectedRefs: Set<string>; title?: string }>();

  const compVulnMap = new Map<
    string,
    {
      critical: number;
      high: number;
      medium: number;
      low: number;
      total: number;
    }
  >();
  const vulnerabilityArray = Array.from(sbom.vulnerabilities);

  await batchProcess(vulnerabilityArray, (vuln) => {
    let maxSeverity = "informational";
    vuln.ratings?.forEach((rating) => {
      const severity = rating.severity?.toString().toLowerCase();
      if (severity === "critical") stats.vulnerabilityCounts.critical++;
      else if (severity === "high") stats.vulnerabilityCounts.high++;
      else if (severity === "medium") stats.vulnerabilityCounts.medium++;
      else if (severity === "low") stats.vulnerabilityCounts.low++;

      if (severity && severityOrder.includes(severity as any)) {
        if (severity === "critical") maxSeverity = "critical";
        else if (severity === "high" && maxSeverity !== "critical")
          maxSeverity = "high";
        else if (
          severity === "medium" &&
          !["critical", "high"].includes(maxSeverity)
        ) {
          maxSeverity = "medium";
        } else if (
          severity === "low" &&
          !["critical", "high", "medium"].includes(maxSeverity)
        ) {
          maxSeverity = "low";
        }
      }
    });

    const vulnId = vuln.id || "Unknown";
    const existingSummary = vulnSummaryMap.get(vulnId) || {
      id: vulnId,
      severity: maxSeverity,
      affectedRefs: new Set<string>(),
      title: vuln.description || vuln.detail
    };

    if (severityOrder.indexOf(maxSeverity as any) < severityOrder.indexOf(existingSummary.severity as any)) {
      existingSummary.severity = maxSeverity;
    }

    vuln.affects?.forEach((affect) => {
      const ref = affect.ref?.value;
      if (!ref) return;

      existingSummary.affectedRefs.add(ref);

      const current = compVulnMap.get(ref) || {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        total: 0,
      };

      if (maxSeverity === "critical") current.critical++;
      else if (maxSeverity === "high") current.high++;
      else if (maxSeverity === "medium") current.medium++;
      else if (maxSeverity === "low") current.low++;

      current.total++;
      compVulnMap.set(ref, current);
    });

    vulnSummaryMap.set(vulnId, existingSummary);
  });

  const componentsArray = Array.from(sbom.components);
  const componentMap = new Map<string, { name: string; version: string }>();
  componentsArray.forEach((component) => {
    if (component.bomRef?.value) {
      componentMap.set(component.bomRef.value, {
        name: component.name,
        version: component.version,
      });
    }
  });

  const allVulnComps = Array.from(compVulnMap.entries())
    .map(([ref, vulns]) => {
      const info = componentMap.get(ref) || { name: "Unknown", version: "" };
      return {
        ...info,
        ref,
        ...vulns,
      };
    })
    .sort((a, b) => {
      if (b.critical !== a.critical) return b.critical - a.critical;
      if (b.high !== a.high) return b.high - a.high;
      return b.total - a.total;
    });

  stats.allVulnerableComponents = allVulnComps;
  stats.vulnerableComponents = allVulnComps.slice(0, 5);
  stats.totalVulnerabilities = stats.vulnerabilityCounts.critical +
    stats.vulnerabilityCounts.high +
    stats.vulnerabilityCounts.medium +
    stats.vulnerabilityCounts.low;

  stats.allVulnerabilities = Array.from(vulnSummaryMap.values())
    .map(v => ({
      id: v.id,
      severity: v.severity,
      affectedCount: v.affectedRefs.size,
      title: v.title
    }))
    .sort((a, b) => b.affectedCount - a.affectedCount || a.id.localeCompare(b.id));

  await batchProcess(componentsArray, (component) => {
    const licenses = Array.from(component.licenses || []);
    const ref = component.bomRef?.value;

    if (licenses.length === 0) {
      stats.licenseDistribution.unknown++;
    } else {
      for (const license of licenses as any[]) {
        const id = license.id || license.name;
        const name = license.name || id || "Unknown";
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
  });

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
      const info = componentMap.get(ref) || { name: "Unknown", version: "" };
      return {
        ...info,
        ref,
        licenses,
      };
    },
  );

  stats.topLicenses = Object.entries(stats.licenseCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  await tick();
  return stats;
}
