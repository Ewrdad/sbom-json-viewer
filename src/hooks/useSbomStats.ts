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
  };

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

    vuln.affects?.forEach((affect) => {
      const ref = affect.ref?.value;
      if (!ref) return;
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

  await batchProcess(componentsArray, (component) => {
    const licenses = Array.from(component.licenses || []);
    if (licenses.length === 0) {
      stats.licenseDistribution.unknown++;
    } else {
      licenses.forEach((license) => {
        const id = (license as any).id || (license as any).name;
        const name = id || "Unknown";
        stats.licenseCounts[name] = (stats.licenseCounts[name] || 0) + 1;

        const category = getLicenseCategory(id);
        if (category === "permissive") stats.licenseDistribution.permissive++;
        else if (category === "copyleft") stats.licenseDistribution.copyleft++;
        else if (category === "weak-copyleft") stats.licenseDistribution.weakCopyleft++;
        else if (category === "proprietary") stats.licenseDistribution.proprietary++;
        else stats.licenseDistribution.unknown++;
      });
    }
  });

  stats.topLicenses = Object.entries(stats.licenseCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  await tick();
  return stats;
}
