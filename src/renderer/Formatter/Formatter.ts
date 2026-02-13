import type { Bom, Component } from "@cyclonedx/cyclonedx-library/Models";
import type * as Models from "@cyclonedx/cyclonedx-library/Models";

type Vulnerability = Models.Vulnerability.Vulnerability;

import { uniqueLicenses } from "./Statistics/uniqueLicenses";
import { uniqueVulnerabilities } from "./Statistics/uniqueVulnerabilities";
import { batchProcess, tick } from "../../lib/asyncUtils";
import { getLicenseCategory } from "../../lib/licenseUtils";
import {
  type formattedSBOM,
  type EnhancedComponent,
  type LicenseDistribution,
} from "../../types/sbom";

type SetProgress = (update: { progress: number; message: string } | ((prev: { progress: number; message: string }) => { progress: number; message: string })) => void;

/**
 * Helper function to categorize vulnerabilities by severity
 */
const categorizeVulnerabilities = (
  vulnerabilities: Vulnerability[],
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

  for (const vuln of vulnerabilities) {
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

interface TransitiveVulnEntry {
  vuln: Vulnerability;
  sourceRef: string; // bomRef of the package where this vuln is inherent
}

interface TransitiveMetrics {
  vulns: {
    Critical: TransitiveVulnEntry[];
    High: TransitiveVulnEntry[];
    Medium: TransitiveVulnEntry[];
    Low: TransitiveVulnEntry[];
    Informational: TransitiveVulnEntry[];
  };
  licenses: LicenseDistribution;
}

const emptyTransitiveMetrics = (): TransitiveMetrics => ({
  vulns: { Critical: [], High: [], Medium: [], Low: [], Informational: [] },
  licenses: { permissive: 0, copyleft: 0, weakCopyleft: 0, proprietary: 0, unknown: 0 }
});

const addLicenseMetrics = (target: LicenseDistribution, source: LicenseDistribution) => {
  target.permissive += source.permissive;
  target.copyleft += source.copyleft;
  target.weakCopyleft += source.weakCopyleft;
  target.proprietary += source.proprietary;
  target.unknown += source.unknown;
};

/**
 * MARK: Formatter
 */
export const Formatter = async ({
  rawSBOM,
  setProgress,
  abortSignal,
}: {
  rawSBOM: Bom;
  setProgress: SetProgress;
  abortSignal?: AbortSignal;
}): Promise<formattedSBOM> => {
  setProgress(() => ({ progress: 0, message: "Initializing formatter..." }));
  await tick();
  if (abortSignal?.aborted) throw new Error("Formatting aborted");

  const formattedSBOM: formattedSBOM = {
    statistics: {
      licenses: uniqueLicenses(rawSBOM.components),
      vulnerabilities: uniqueVulnerabilities(rawSBOM),
    },
    metadata: rawSBOM.metadata,
    componentMap: new Map<string, EnhancedComponent>(),
    dependencyGraph: new Map<string, string[]>(),
    dependentsGraph: new Map<string, string[]>(),
    blastRadius: new Map<string, number>(),
    topLevelRefs: [],
  };

  // 1. Build basic maps and Index Vulnerabilities
  const rawComponentMap = new Map<string, Component>();
  const allChildRefs = new Set<string>();
  const vulnIndex = new Map<string, Vulnerability[]>();

  // Index vulns
  for (const vuln of rawSBOM.vulnerabilities) {
    for (const affect of vuln.affects) {
      const ref = (affect.ref && typeof affect.ref === "object" && 'value' in affect.ref) 
        ? (affect.ref as { value: string }).value 
        : (affect.ref as unknown as string);
      if (ref) {
        const list = vulnIndex.get(ref) || [];
        list.push(vuln);
        vulnIndex.set(ref, list);
      }
    }
  }

  await batchProcess(rawSBOM.components, (component) => {
    const bomRef = component.bomRef.value;
    if (!bomRef) return;
    rawComponentMap.set(bomRef, component);
    
    const deps: string[] = [];
    component.dependencies.forEach((dep) => {
      if (dep.value) {
        deps.push(dep.value);
        allChildRefs.add(dep.value);
      }
    });
    formattedSBOM.dependencyGraph.set(bomRef, deps);
  });

  // 2. Identify top-level refs
  rawComponentMap.forEach((_, ref) => {
    if (!allChildRefs.has(ref)) {
      formattedSBOM.topLevelRefs.push(ref);
    }
  });

  if (formattedSBOM.topLevelRefs.length === 0) {
    if (rawSBOM.metadata?.component?.bomRef?.value) {
      formattedSBOM.topLevelRefs.push(rawSBOM.metadata.component.bomRef.value);
    } else if (rawComponentMap.size > 0) {
      formattedSBOM.topLevelRefs.push(rawComponentMap.keys().next().value);
    }
  }

  // 3. Initialize Enhanced Map with Inherent Metrics (Phase 1)
  const enhancedMap = new Map<string, EnhancedComponent>();
  
  for (const [ref, comp] of rawComponentMap.entries()) {
    const inherentVulns = categorizeVulnerabilities(vulnIndex.get(ref) || []);
    const inherentLicenses: LicenseDistribution = {
      permissive: 0, copyleft: 0, weakCopyleft: 0, proprietary: 0, unknown: 0
    };

    const componentLicenses = Array.from(comp.licenses || []);
    if (componentLicenses.length === 0) {
      inherentLicenses.unknown++;
    } else {
      componentLicenses.forEach((l: any) => {
        const cat = getLicenseCategory(l.id || l.name);
        if (cat === "permissive") inherentLicenses.permissive++;
        else if (cat === "copyleft") inherentLicenses.copyleft++;
        else if (cat === "weak-copyleft") inherentLicenses.weakCopyleft++;
        else if (cat === "proprietary") inherentLicenses.proprietary++;
        else inherentLicenses.unknown++;
      });
    }

    const enhanced: EnhancedComponent = Object.assign(comp, {
      vulnerabilities: {
        inherent: inherentVulns,
        transitive: {
          Critical: [], High: [], Medium: [], Low: [], Informational: []
        }
      },
      licenseDistribution: inherentLicenses,
      transitiveLicenseDistribution: {
        permissive: 0, copyleft: 0, weakCopyleft: 0, proprietary: 0, unknown: 0
      }
    });

    // We must manually ensure bomRef is an 'own' enumerable property so deepToPlain picks it up.
    // comp.bomRef is a getter on the class, so Object.assign won't copy it.
    // And we can't simple assign it because there's no setter.
    Object.defineProperty(enhanced, "bomRef", {
      value: comp.bomRef as unknown,
      enumerable: true,
      configurable: true,
      writable: true
    });

    enhancedMap.set(ref, enhanced);
  }

  // 4. Compute Transitive Metrics (Phase 2 - Graph Traversal)
  // Why: We tag each vulnerability with its source package ref so that:
  //   - Same CVE on DIFFERENT packages counts separately (matches npm audit)
  //   - Same CVE on SAME package via diamond paths is deduplicated correctly
  const memo = new Map<string, TransitiveMetrics>();
  const visiting = new Set<string>();

  const getTransitiveMetrics = (ref: string): TransitiveMetrics => {
    if (memo.has(ref)) return memo.get(ref)!;
    
    // Cycle detection: return empty to break infinite recursion.
    if (visiting.has(ref)) return emptyTransitiveMetrics();

    visiting.add(ref);
    
    const children = formattedSBOM.dependencyGraph.get(ref) || [];
    const collected = emptyTransitiveMetrics();

    for (const childRef of children) {
      const childComp = enhancedMap.get(childRef);
      if (!childComp) continue;

      // Add child's INHERENT vulns, tagged with childRef as the source
      Object.keys(childComp.vulnerabilities.inherent).forEach(k => {
        const key = k as keyof typeof childComp.vulnerabilities.inherent;
        for (const v of childComp.vulnerabilities.inherent[key]) {
          collected.vulns[key].push({ vuln: v, sourceRef: childRef });
        }
      });

      // Add child's TRANSITIVE entries (already tagged with their original sourceRef)
      const childTransitive = getTransitiveMetrics(childRef);
      Object.keys(childTransitive.vulns).forEach(k => {
        const key = k as keyof typeof childTransitive.vulns;
        collected.vulns[key].push(...childTransitive.vulns[key]);
      });

      addLicenseMetrics(collected.licenses, childComp.licenseDistribution);
      addLicenseMetrics(collected.licenses, childTransitive.licenses);
    }

    visiting.delete(ref);
    
    // Dedup by composite key (vulnId::sourceRef) — same CVE on different
    // packages counts separately; same CVE on same package via different
    // paths is deduplicated.
    const result = emptyTransitiveMetrics();
    result.licenses = collected.licenses;
    
    Object.keys(collected.vulns).forEach(k => {
       const key = k as keyof typeof collected.vulns;
       const seen = new Set<string>();
       collected.vulns[key].forEach(entry => {
         const dedupKey = `${entry.vuln.id || ''}::${entry.sourceRef}`;
         if (!seen.has(dedupKey)) {
           seen.add(dedupKey);
           result.vulns[key].push(entry);
         }
       });
    });

    memo.set(ref, result);
    return result;
  }

  // Execute for all components — map tagged entries back to Vulnerability[]
  for (const ref of enhancedMap.keys()) {
    const trans = getTransitiveMetrics(ref);
    const comp = enhancedMap.get(ref)!;
    comp.vulnerabilities.transitive = {
      Critical: trans.vulns.Critical.map(e => e.vuln),
      High: trans.vulns.High.map(e => e.vuln),
      Medium: trans.vulns.Medium.map(e => e.vuln),
      Low: trans.vulns.Low.map(e => e.vuln),
      Informational: trans.vulns.Informational.map(e => e.vuln),
    };
    comp.transitiveLicenseDistribution = trans.licenses;
  }

  formattedSBOM.componentMap = enhancedMap;
  setProgress(() => ({ progress: 100, message: "Formatting complete" }));
  return formattedSBOM;
};
