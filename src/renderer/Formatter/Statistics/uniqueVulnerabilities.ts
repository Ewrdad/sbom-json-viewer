import type { Bom } from "@cyclonedx/cyclonedx-library/Models";
import type * as Models from "@cyclonedx/cyclonedx-library/Models";

type Vulnerability = Models.Vulnerability.Vulnerability;

/**
 * Extract and categorize unique vulnerabilities from the SBOM
 * @param rawSBOM The SBOM containing vulnerabilities
 * @returns Object with vulnerabilities categorized by severity
 */
export const uniqueVulnerabilities = (
  rawSBOM: Bom,
): {
  Critical: Vulnerability[];
  High: Vulnerability[];
  Medium: Vulnerability[];
  Low: Vulnerability[];
  Informational: Vulnerability[];
} => {
  const categorized = {
    Critical: [] as Vulnerability[],
    High: [] as Vulnerability[],
    Medium: [] as Vulnerability[],
    Low: [] as Vulnerability[],
    Informational: [] as Vulnerability[],
  };

  const seenVulnIds = new Set<string>();

  // Iterate through vulnerabilities in the SBOM
  for (const vuln of rawSBOM.vulnerabilities) {
    // Skip if we've already seen this vulnerability ID
    if (vuln.id && seenVulnIds.has(vuln.id)) {
      continue;
    }

    if (vuln.id) {
      seenVulnIds.add(vuln.id);
    }

    // Extract severity from ratings
    let severity = "informational";
    for (const rating of vuln.ratings) {
      if (rating.severity) {
        severity = rating.severity.toString().toLowerCase();
        break;
      }
    }

    const severityKey =
      severity.charAt(0).toUpperCase() + severity.slice(1).toLowerCase();

    if (severityKey in categorized) {
      categorized[severityKey as keyof typeof categorized].push(vuln);
    } else {
      categorized.Informational.push(vuln);
    }
  }

  return categorized;
};
