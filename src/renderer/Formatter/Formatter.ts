import { Bom, Component } from "@cyclonedx/cyclonedx-library/Models";
import type * as Models from "@cyclonedx/cyclonedx-library/Models";
import type { License, Metadata } from "@cyclonedx/cyclonedx-library/Models";
// import type { Dispatch, SetStateAction } from "react";
type SetProgress = (update: { progress: number; message: string } | ((prev: { progress: number; message: string }) => { progress: number; message: string })) => void;
import { uniqueLicenses } from "./Statistics/uniqueLicenses";
import { uniqueVulnerabilities } from "./Statistics/uniqueVulnerabilities";
import { batchProcess, tick } from "../../lib/asyncUtils";

type Vulnerability = Models.Vulnerability.Vulnerability;

export type formattedSBOM = {
  statistics: {
    licenses: License[]; // A list of unique licenses across all components
    vulnerabilities: {
      // aggregated unique vulnerabilities across all components
      Critical: Vulnerability[];
      High: Vulnerability[];
      Medium: Vulnerability[];
      Low: Vulnerability[];
      Informational: Vulnerability[];
    };
  };
  metadata: Metadata;
  components: NestedSBOMComponent[];
};

export interface NestedSBOMComponent extends Component {
  vulnerabilities: {
    inherent: {
      // vulnerabilities directly associated with the component
      Critical: Vulnerability[];
      High: Vulnerability[];
      Medium: Vulnerability[];
      Low: Vulnerability[];
      Informational: Vulnerability[];
    };
    transitive: {
      // vulnerabilities inherited from dependencies
      Critical: Vulnerability[];
      High: Vulnerability[];
      Medium: Vulnerability[];
      Low: Vulnerability[];
      Informational: Vulnerability[];
    };
  };
  formattedDependencies: NestedSBOMComponent[];
}

/**
 * Helper function to categorize vulnerabilities by severity
 * @description Groups vulnerabilities affecting a specific component by their severity level
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

/**
 * Create a safe clone of a Component
 * Why: Component uses private fields (e.g., #bomRef) that break when Object.assign is used.
 */
const cloneComponent = (component: Component): Component => {
  return new Component(component.type, component.name, {
    bomRef: component.bomRef.value,
    author: component.author,
    copyright: component.copyright,
    description: component.description,
    externalReferences: component.externalReferences,
    group: component.group,
    hashes: component.hashes,
    licenses: component.licenses,
    publisher: component.publisher,
    purl: component.purl,
    scope: component.scope,
    supplier: component.supplier,
    swid: component.swid,
    version: component.version,
    components: component.components,
    cpe: component.cpe,
    properties: component.properties,
    evidence: component.evidence,
    dependencies: component.dependencies,
  });
};

/**
 * MARK: Formatter
 * @description Formats a raw SBOM into a nested structure suitable for tiered rendering. The priority is to find top level components and find their inherent vulns
 * @param {any} props
 * @param {Bom} props.rawSBOM A raw SBOM to format
 * @param {function} props.setProgress An async function to update progress during formatting
 * @example await setFormattedNestedSBOM(await Formatter({ rawSBOM: SBOM }));
 * @returns {Promise<formattedSBOM>} A formatted nested SBOM
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
        Critical: [],
        High: [],
        Medium: [],
        Low: [],
        Informational: [],
      },
    },
    metadata: rawSBOM.metadata,
    components: [],
  };

  setProgress(() => ({ progress: 1, message: "Extracting unique licenses" }));
  formattedSBOM.statistics.licenses = uniqueLicenses(rawSBOM.components);
  await tick();
  if (abortSignal?.aborted) throw new Error("Formatting aborted");
  setProgress(() => ({
    progress: 5,
    message: "Finished extracting unique licenses",
  }));
  await tick();
  setProgress(() => ({
    progress: 6,
    message: "Extracting unique vulnerabilities",
  }));
  formattedSBOM.statistics.vulnerabilities = uniqueVulnerabilities(rawSBOM);
  await tick();
  if (abortSignal?.aborted) throw new Error("Formatting aborted");
  setProgress(() => ({
    progress: 10,
    message: "Finished extracting unique vulnerabilities",
  }));
  await tick();

  setProgress(() => ({
    progress: 15,
    message: "Building component and dependency maps",
  }));
  await tick();

  const componentMap = new Map<string, Component>();
  const dependencyMap = new Map<string, string[]>();

  await batchProcess(rawSBOM.components, (component) => {
    if (abortSignal?.aborted) return;
    const bomRef = component.bomRef.value;
    if (!bomRef) return;

    componentMap.set(bomRef, component);
    const deps: string[] = [];
    component.dependencies.forEach((depRef) => {
      if (depRef.value) {
        deps.push(depRef.value);
      }
    });
    if (deps.length > 0) {
      dependencyMap.set(bomRef, deps);
    }
  });

  await tick();
  setProgress(() => ({
    progress: 20,
    message: "Finished building maps",
  }));
  await tick();

  setProgress(() => ({
    progress: 25,
    message: "Indexing vulnerabilities",
  }));
  await tick();

  const vulnIndex = new Map<string, Vulnerability[]>();
  for (const vuln of rawSBOM.vulnerabilities) {
    for (const affect of vuln.affects) {
      const ref =
        typeof affect.ref === "object" && "value" in affect.ref
          ? affect.ref.value
          : typeof affect.ref === "string"
            ? affect.ref
            : null;
      if (ref) {
        const list = vulnIndex.get(ref) || [];
        list.push(vuln);
        vulnIndex.set(ref, list);
      }
    }
  }

  setProgress(() => ({
    progress: 27,
    message: "Building nested component structure",
  }));
  await tick();

  let nestedWorkCounter = 0;
  const buildNestedComponent = async (
    componentRef: string,
    visitedInCurrentPath: Set<string> = new Set(),
  ): Promise<NestedSBOMComponent | null> => {
    const component = componentMap.get(componentRef);
    if (!component) return null;

    const nestedComponent = cloneComponent(component) as NestedSBOMComponent;
    nestedComponent.vulnerabilities = {
      inherent: {
        Critical: [],
        High: [],
        Medium: [],
        Low: [],
        Informational: [],
      },
      transitive: {
        Critical: [],
        High: [],
        Medium: [],
        Low: [],
        Informational: [],
      },
    };
    nestedComponent.formattedDependencies = [];

    const componentVulns = vulnIndex.get(componentRef) || [];
    nestedComponent.vulnerabilities.inherent =
      categorizeVulnerabilities(componentVulns);

    const dependencies = dependencyMap.get(componentRef) || [];
    const newVisitedPath = new Set(visitedInCurrentPath);
    newVisitedPath.add(componentRef);

    for (const depRef of dependencies) {
      if (visitedInCurrentPath.has(depRef)) continue;

      const nestedDep = await buildNestedComponent(depRef, newVisitedPath);
      if (!nestedDep) continue;

      nestedComponent.formattedDependencies.push(nestedDep);

      for (const severity of Object.keys(nestedDep.vulnerabilities.inherent)) {
        const severityKey =
          severity as keyof NestedSBOMComponent["vulnerabilities"]["inherent"];
        nestedComponent.vulnerabilities.transitive[severityKey].push(
          ...nestedDep.vulnerabilities.inherent[severityKey],
        );
      }

      for (const severity of Object.keys(
        nestedDep.vulnerabilities.transitive,
      )) {
        const severityKey =
          severity as keyof NestedSBOMComponent["vulnerabilities"]["transitive"];
        nestedComponent.vulnerabilities.transitive[severityKey].push(
          ...nestedDep.vulnerabilities.transitive[severityKey],
        );
      }

      nestedWorkCounter += 1;
       if (nestedWorkCounter % 60 === 0) {
         await tick();
         if (abortSignal?.aborted) return null;
       }
     }

    return nestedComponent;
  };

  setProgress(() => ({
    progress: 30,
    message: "Identifying top-level components",
  }));
  await tick();

  const allDependencies = new Set<string>();
  dependencyMap.forEach((deps) => {
    deps.forEach((dep) => allDependencies.add(dep));
  });

  const topLevelRefs: string[] = [];
  componentMap.forEach((_, ref) => {
    if (!allDependencies.has(ref)) {
      topLevelRefs.push(ref);
    }
  });

  if (topLevelRefs.length === 0) {
    if (rawSBOM.metadata?.component?.bomRef?.value) {
      topLevelRefs.push(rawSBOM.metadata.component.bomRef.value);
    } else {
      const componentsArray = Array.from(rawSBOM.components);
      if (componentsArray.length > 0 && componentsArray[0].bomRef?.value) {
        topLevelRefs.push(componentsArray[0].bomRef.value);
      }
    }
  }

  setProgress(() => ({
    progress: 35,
    message: `Found ${topLevelRefs.length} top-level component(s)`,
  }));
  await tick();

   for (let index = 0; index < topLevelRefs.length; index += 1) {
     if (abortSignal?.aborted) throw new Error("Formatting aborted");
     const ref = topLevelRefs[index];
     setProgress(() => ({
       progress: 35 + (index / topLevelRefs.length) * 55,
       message: `Processing top-level component ${index + 1}/${topLevelRefs.length}`,
     }));
     await tick();
     if (abortSignal?.aborted) throw new Error("Formatting aborted");

     const nestedComponent = await buildNestedComponent(ref);
     if (nestedComponent) {
       formattedSBOM.components.push(nestedComponent);
     }
   }

  setProgress(() => ({
    progress: 95,
    message: "Finalizing formatted SBOM",
  }));
  await tick();

  for (const component of formattedSBOM.components) {
    for (const severity of Object.keys(component.vulnerabilities.transitive)) {
      const severityKey =
        severity as keyof NestedSBOMComponent["vulnerabilities"]["transitive"];
      const uniqueVulns = new Map<string, Vulnerability>();
      component.vulnerabilities.transitive[severityKey].forEach((vuln) => {
        if (vuln.id) {
          uniqueVulns.set(vuln.id, vuln);
        }
      });
      component.vulnerabilities.transitive[severityKey] = Array.from(
        uniqueVulns.values(),
      );
    }
    await tick();
  }

  setProgress(() => ({
    progress: 100,
    message: "Formatting complete",
  }));
  await tick();

  return formattedSBOM;
};
