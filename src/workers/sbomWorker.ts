import { convertJsonToBom } from "../lib/bomConverter";
import { Formatter } from "../renderer/Formatter/Formatter";
import { type SbomStats, type WorkerProgressUpdate } from "../types/sbom";
import { getLicenseCategory } from "../lib/licenseUtils";

/**
 * SBOM Worker
 * Handles heavy lifting: JSON parsing, SBOM conversion, formatting, and stats.
 */

self.onmessage = async (e: MessageEvent) => {
  const { jsonText, filename } = e.data;
  if (import.meta.env.DEV) {
    console.log(`[Worker] Started processing ${filename}`);
  }

  try {
    // 1. Parse JSON
    self.postMessage({ type: "progress", message: `Parsing ${filename}...`, progress: 0 });
    const json = JSON.parse(jsonText);
    if (import.meta.env.DEV) console.log(`[Worker] JSON parsed`);

    // 2. Convert to Bom
    self.postMessage({ type: "progress", message: "Converting to CycloneDX model...", progress: 5 });
    const bom = await convertJsonToBom(json);
    if (import.meta.env.DEV) console.log(`[Worker] Bom converted`);

    // 3. Compute Stats
    self.postMessage({ type: "progress", message: "Computing statistics...", progress: 10 });
    const stats = computeStatsSync(bom);
    if (import.meta.env.DEV) console.log(`[Worker] Stats computed`);

    // 4. Format
    const result_formatted = await Formatter({
      rawSBOM: bom,
      setProgress: (update: WorkerProgressUpdate | ((prev: WorkerProgressUpdate) => WorkerProgressUpdate)) => {
        const value = typeof update === 'function' ? update({ progress: 0, message: '' }) : update;
        const scaledProgress = 15 + (value.progress * 0.85);
        self.postMessage({ type: "progress", message: value.message, progress: scaledProgress });
      }
    });
    if (import.meta.env.DEV) console.log(`[Worker] Formatted`);

    // 5. Send result back
    try {
      // Deeply convert to plain objects to handle Sets/Maps/Classes correctly
      const result = deepToPlain({ 
        bom, 
        formatted: result_formatted,
        stats
      });
      if (import.meta.env.DEV) console.log(`[Worker] Sending result`);
      self.postMessage({ type: "complete", result });
    } catch (serializeError) {
      console.error("[Worker] Serialization failed:", serializeError);
      throw new Error(`Failed to serialize results for main thread: ${serializeError instanceof Error ? serializeError.message : String(serializeError)}`);
    }
  } catch (error) {
    console.error("[Worker] Error:", error);
    self.postMessage({ 
      type: "error", 
      message: error instanceof Error ? error.message : "An unknown error occurred during SBOM processing" 
    });
  }
};

/**
 * Deeply converts a value to a plain object/array.
 * Handles Sets, Maps, and common class patterns.
 */
function deepToPlain(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Handle Sets
  if (obj instanceof Set) {
    return Array.from(obj).map(deepToPlain);
  }

  // Handle Maps
  if (obj instanceof Map) {
    // Return as plain object for serialization
    const plainMap: any = {};
    for (const [key, value] of obj) {
      plainMap[key] = deepToPlain(value);
    }
    return plainMap;
  }

  // Handle Arrays
  if (Array.isArray(obj)) {
    return obj.map(deepToPlain);
  }

  // Handle objects and class instances
  const plain: any = {};
  
  // Special handling for BomRef and similar classes with a 'value' property
  if (obj.value !== undefined && Object.keys(obj).length <= 2) {
    return { value: obj.value };
  }

  for (const key in obj) {
    // Basic check for own properties (or simple class props)
    if (Object.prototype.hasOwnProperty.call(obj, key) || typeof obj[key] !== 'function') {
      plain[key] = deepToPlain(obj[key]);
    }
  }

  return plain;
}

function computeStatsSync(bom: any): SbomStats {
  const stats: SbomStats = {
    totalComponents: bom.components.size,
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
  };

  const licenseSummaryMap = new Map<string, { id: string; name: string; category: string; affectedRefs: Set<string> }>();
  const componentLicenseMap = new Map<string, { id: string; name: string; category: string }[]>();

  const severityOrder = ["critical", "high", "medium", "low"];
  const compVulnMap = new Map();
  const vulnSummaryMap = new Map<string, { id: string; severity: string; affectedRefs: Set<string>; title?: string }>();

  // Process vulnerabilities
  for (const vuln of bom.vulnerabilities) {
    let maxSeverity = "informational";
    for (const rating of (vuln.ratings || [])) {
      const severity = rating.severity?.toString().toLowerCase();
      if (severity === "critical") stats.vulnerabilityCounts.critical++;
      else if (severity === "high") stats.vulnerabilityCounts.high++;
      else if (severity === "medium") stats.vulnerabilityCounts.medium++;
      else if (severity === "low") stats.vulnerabilityCounts.low++;

      if (severity && severityOrder.includes(severity)) {
        if (severity === "critical") maxSeverity = "critical";
        else if (severity === "high" && maxSeverity !== "critical") maxSeverity = "high";
        else if (severity === "medium" && !["critical", "high"].includes(maxSeverity)) maxSeverity = "medium";
        else if (severity === "low" && !["critical", "high", "medium"].includes(maxSeverity)) maxSeverity = "low";
      }
    }

    const vulnId = vuln.id || "Unknown";
    const existingSummary = vulnSummaryMap.get(vulnId) || {
      id: vulnId,
      severity: maxSeverity,
      affectedRefs: new Set<string>(),
      title: vuln.description || vuln.detail
    };
    
    // Ensure we take the highest severity if the same ID appears multiple times
    if (severityOrder.indexOf(maxSeverity) < severityOrder.indexOf(existingSummary.severity)) {
      existingSummary.severity = maxSeverity;
    }

    for (const affect of (vuln.affects || [])) {
      const ref = affect.ref?.value || affect.ref;
      if (!ref) continue;
      
      existingSummary.affectedRefs.add(ref);
      
      const current = compVulnMap.get(ref) || { critical: 0, high: 0, medium: 0, low: 0, total: 0 };
      if (maxSeverity === "critical") current.critical++;
      else if (maxSeverity === "high") current.high++;
      else if (maxSeverity === "medium") current.medium++;
      else if (maxSeverity === "low") current.low++;
      current.total++;
      compVulnMap.set(ref, current);
    }
    
    vulnSummaryMap.set(vulnId, existingSummary);
  }

  // License unique list
  for (const component of bom.components) {
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
      for (const c of bom.components) {
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

  // All vulnerable components (full list with refs)
  const allVulnComps = Array.from(compVulnMap.entries())
    .map(([ref, vulns]) => {
      let name = "Unknown";
      let version = "";
      for (const c of bom.components) {
        if (c.bomRef?.value === ref) {
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

  return stats;
}
