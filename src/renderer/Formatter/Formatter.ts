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
      licenses: [],
      vulnerabilities: {
        Critical: [], High: [], Medium: [], Low: [], Informational: []
      },
    },
    metadata: rawSBOM.metadata,
    componentMap: new Map<string, EnhancedComponent>(),
    dependencyGraph: new Map<string, string[]>(),
    dependentsGraph: new Map<string, string[]>(),
    blastRadius: new Map<string, number>(),
    topLevelRefs: [],
    _raw: (rawSBOM as any)._raw,
  };

  // 0. Initial statistics (can be slow on huge SBOMs)
  setProgress(() => ({ progress: 5, message: "Analyzing vulnerabilities..." }));
  await tick();
  formattedSBOM.statistics.vulnerabilities = uniqueVulnerabilities(rawSBOM);
  
  setProgress(() => ({ progress: 10, message: "Analyzing licenses..." }));
  await tick();
  formattedSBOM.statistics.licenses = uniqueLicenses(rawSBOM.components);

  // 1. Build basic maps and Index Vulnerabilities
  setProgress(() => ({ progress: 15, message: "Preparing component list..." }));
  await tick();
  const rawComponents = Array.from(rawSBOM.components);
  const totalRaw = rawComponents.length;
  
  setProgress(() => ({ progress: 18, message: "Indexing vulnerabilities..." }));
  await tick();
  const rawComponentMap = new Map<string, Component>();
  const allChildRefs = new Set<string>();
  const vulnIndex = new Map<string, Vulnerability[]>();

  // Index vulns
  let vulnProcessCount = 0;
  for (const vuln of rawSBOM.vulnerabilities) {
    vulnProcessCount++;
    if (vulnProcessCount % 1000 === 0) {
      await tick();
    }
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

  await batchProcess(rawComponents, (component, index) => {
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

    if (index % 500 === 0) {
      setProgress(() => ({ 
        progress: Math.min(25, Math.round((index / totalRaw) * 25)), 
        message: `Step 1/4: Indexing components (${index}/${totalRaw})...` 
      }));
    }
  });

  // 2. Identify top-level refs
  setProgress(() => ({ progress: 25, message: "Step 2/4: Identifying top-level deps..." }));
  await tick();

  rawComponentMap.forEach((_, ref) => {
    if (!allChildRefs.has(ref)) {
      formattedSBOM.topLevelRefs.push(ref);
    }
  });

  if (formattedSBOM.topLevelRefs.length === 0) {
    if (rawSBOM.metadata?.component?.bomRef?.value) {
      formattedSBOM.topLevelRefs.push(rawSBOM.metadata.component.bomRef.value);
    } else if (rawComponentMap.size > 0) {
      const key = rawComponentMap.keys().next().value;
      if (key) formattedSBOM.topLevelRefs.push(key);
    }
  }

  // 3. Initialize Enhanced Map with Inherent Metrics (Phase 1)
  const enhancedMap = new Map<string, EnhancedComponent>();
  const allEntries = Array.from(rawComponentMap.entries());
  
  await batchProcess(allEntries, ([ref, comp], index) => {
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

    Object.defineProperty(enhanced, "bomRef", {
      value: comp.bomRef as unknown,
      enumerable: true,
      configurable: true,
      writable: true
    });

    enhancedMap.set(ref, enhanced);

    if (index % 500 === 0) {
       setProgress(() => ({ 
        progress: 25 + Math.min(25, Math.round((index / allEntries.length) * 25)), 
        message: `Step 3/4: Component analysis (${index}/${allEntries.length})...` 
      }));
    }
  }, 500);

  // 4. Compute Transitive Metrics (Phase 2 - Graph Traversal)
  // We use an iterative approach with memoization to avoid stack overflow and allow progress reporting.
  const memo = new Map<string, TransitiveMetrics>();
  
  // Topological sort or just iterative post-order traversal would be ideal, 
  // but a simple memoized recursion with yielding is easier to refactor safely 
  // without changing the logic, provided we manage the stack. 
  // However, deep recursion is the issue. 
  // Let's use an iterative approach for the *main loop* and keep the recursion shallow if possible,
  // OR fully iterative. Given the complexity of the data aggregation, a full iterative refactor 
  // is risky for correctness without heavy testing. 
  //
  // ALTERNATIVE: We can keep the recursion but make it async and yield? 
  // No, async recursion is slow.
  //
  // BETTER: We iterate over all components. For each component, we calculate metrics.
  // If a dependency is not calculated, we calculate it dynamically.
  // To prevent blocking, we just batch the "roots" of our calculation.
  
  // Actually, `getTransitiveMetrics` does a full traversal.
  // Let's wrap the top-level loop in `batchProcess` and add `tick()`. 
  // The recursion itself `getTransitiveMetrics` is still sync, but if we call it 
  // node by node from the top loop, we can yield in between nodes. 
  // BUT: if one node has a huge tree, `getTransitiveMetrics` will still block for that whole tree.
  //
  // OPTIMIZATION: Memoization is already there! `memo.has(ref)`.
  // If we process leaf nodes first (post-order), we populate the memo cache 
  // cheaply, and then upper nodes just aggregate cheap results.
  //
  // Let's implement a "compute order" based on dependency depth or post-order traversal.
  
  // 4a. Sort components by "depth" or dependency count to encourage bottom-up processing?
  // Computing depth is also a traversal.
  //
  // Simplest fix for "Stuck UI": 
  // Just use `batchProcess` for the main loop (lines 283). 
  // And to avoid the "one huge tree blocks everything" issue, 
  // we really should try to populate leaves first.
  
  const allRefs = Array.from(enhancedMap.keys());
  
  // We'll proceed with the existing recursion but call it via batchProcess on the keys.
  // This ensures that at least between every X components we yield.
  // The memoization means subsequent calls for shared dependencies will be fast.
  
  const totalComponents = allRefs.length;

  const visiting = new Set<string>();

  const getTransitiveMetrics = (ref: string): TransitiveMetrics => {
    if (memo.has(ref)) return memo.get(ref)!;
    
    // Cycle detection
    if (visiting.has(ref)) return emptyTransitiveMetrics();

    visiting.add(ref);
    
    const children = formattedSBOM.dependencyGraph.get(ref) || [];
    const collected = emptyTransitiveMetrics();

    for (const childRef of children) {
      const childComp = enhancedMap.get(childRef);
      if (!childComp) continue;

      // Add child's INHERENT vulns
      Object.keys(childComp.vulnerabilities.inherent).forEach(k => {
        const key = k as keyof typeof childComp.vulnerabilities.inherent;
        for (const v of childComp.vulnerabilities.inherent[key]) {
          collected.vulns[key].push({ vuln: v, sourceRef: childRef });
        }
      });

      // Add child's TRANSITIVE entries
      const childTransitive = getTransitiveMetrics(childRef);
      Object.keys(childTransitive.vulns).forEach(k => {
        const key = k as keyof typeof childTransitive.vulns;
        collected.vulns[key].push(...childTransitive.vulns[key]);
      });

      addLicenseMetrics(collected.licenses, childComp.licenseDistribution);
      addLicenseMetrics(collected.licenses, childTransitive.licenses);
    }

    visiting.delete(ref);
    
    // Dedup
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

  // Use batchProcess to allow UI updates during the heavy calculation phase
  await batchProcess(allRefs, (ref, index) => {
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

    // Track which component introduced each transitive vulnerability
    const sources = new Map<string, string>();
    Object.values(trans.vulns).forEach(list => {
      list.forEach(entry => {
        if (entry.vuln.id) {
          sources.set(entry.vuln.id, entry.sourceRef);
        }
      });
    });
    comp._transitiveSources = sources;

    if (index % 100 === 0) {
      const percent = 50 + Math.round((index / totalComponents) * 50);
      setProgress(() => ({ 
        progress: Math.min(99, percent), 
        message: `Step 4/4: Transitive analysis (${index}/${totalComponents})...` 
      }));
    }
  }, 50); // Small chunk size to keep UI responsive

  formattedSBOM.componentMap = enhancedMap;
  setProgress(() => ({ progress: 100, message: "Ready" }));
  await tick(); // Allow final render
  return formattedSBOM;
};
