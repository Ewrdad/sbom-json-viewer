import { convertJsonToBom } from "../lib/bomConverter";
import { Formatter } from "../renderer/Formatter/Formatter";
import { type SbomStats } from "../hooks/useSbomStats";

interface WorkerProgressUpdate {
  progress: number;
  message: string;
}

/**
 * SBOM Worker
 * Handles heavy lifting: JSON parsing, SBOM conversion, formatting, and stats.
 */

self.onmessage = async (e: MessageEvent) => {
  const { jsonText, filename } = e.data;
  console.log(`[Worker] Started processing ${filename}`);

  try {
    // 1. Parse JSON
    self.postMessage({ type: "progress", message: `Parsing ${filename}...`, progress: 0 });
    const json = JSON.parse(jsonText);
    console.log(`[Worker] JSON parsed`);

    // 2. Convert to Bom
    self.postMessage({ type: "progress", message: "Converting to CycloneDX model...", progress: 5 });
    const bom = await convertJsonToBom(json);
    console.log(`[Worker] Bom converted`);

    // 3. Compute Stats
    self.postMessage({ type: "progress", message: "Computing statistics...", progress: 10 });
    const stats = computeStatsSync(bom);
    console.log(`[Worker] Stats computed`);

    const formatted = await Formatter({
      rawSBOM: bom,
      setProgress: (update: WorkerProgressUpdate | ((prev: WorkerProgressUpdate) => WorkerProgressUpdate)) => {
        const value = typeof update === 'function' ? update({ progress: 0, message: '' }) : update;
        const scaledProgress = 15 + (value.progress * 0.85);
        self.postMessage({ type: "progress", message: value.message, progress: scaledProgress });
      }
    });
    console.log(`[Worker] Formatted`);

    // 5. Send result back
    try {
      const result = JSON.parse(JSON.stringify({ 
        bom, 
        formatted,
        stats
      }));
      console.log(`[Worker] Sending result`);
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

function computeStatsSync(bom: any): SbomStats {
  const stats: SbomStats = {
    totalComponents: bom.components.size,
    vulnerabilityCounts: { critical: 0, high: 0, medium: 0, low: 0, none: 0 },
    licenseCounts: {},
    topLicenses: [],
    vulnerableComponents: [],
  };

  const severityOrder = ["critical", "high", "medium", "low"];
  const compVulnMap = new Map();

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

    for (const affect of (vuln.affects || [])) {
      const ref = affect.ref?.value || affect.ref;
      if (!ref) continue;
      const current = compVulnMap.get(ref) || { critical: 0, high: 0, medium: 0, low: 0, total: 0 };
      if (maxSeverity === "critical") current.critical++;
      else if (maxSeverity === "high") current.high++;
      else if (maxSeverity === "medium") current.medium++;
      else if (maxSeverity === "low") current.low++;
      current.total++;
      compVulnMap.set(ref, current);
    }
  }

  // License unique list
  for (const component of bom.components) {
    for (const license of (component.licenses || [])) {
      const name = license.id || license.name || "Unknown";
      stats.licenseCounts[name] = (stats.licenseCounts[name] || 0) + 1;
    }
  }

  stats.topLicenses = Object.entries(stats.licenseCounts)
    .map(([name, count]) => ({ name, count: count as number }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Most vulnerable
  stats.vulnerableComponents = Array.from(compVulnMap.entries())
    .map(([ref, vulns]) => {
      // Find component name/version from ref if possible
      let name = "Unknown";
      let version = "";
      for (const c of bom.components) {
        if (c.bomRef?.value === ref) {
          name = c.name;
          version = c.version;
          break;
        }
      }
      return { name, version, ...vulns };
    })
    .sort((a, b) => {
      if (b.critical !== a.critical) return b.critical - a.critical;
      if (b.high !== a.high) return b.high - a.high;
      return b.total - a.total;
    })
    .slice(0, 5);

  return stats;
}
