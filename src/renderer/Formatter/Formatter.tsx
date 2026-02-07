import { Bom, Component } from "@cyclonedx/cyclonedx-library/Models";
import type * as Models from "@cyclonedx/cyclonedx-library/Models";
import type { License, Metadata } from "@cyclonedx/cyclonedx-library/Models";
import type { Dispatch, SetStateAction } from "react";
import { uniqueLicenses } from "./Statistics/uniqueLicenses";
import { uniqueVulnerabilities } from "./Statistics/uniqueVulnerabilities";

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
  vulnerabilities: Iterable<Vulnerability>,
  componentRef: string,
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
    // Check if this vulnerability affects the current component
    let affectsThisComponent = false;
    for (const affect of vuln.affects) {
      // Check if the ref matches the component's bom-ref
      if (
        typeof affect.ref === "object" &&
        "value" in affect.ref &&
        affect.ref.value === componentRef
      ) {
        affectsThisComponent = true;
        break;
      }
    }

    if (!affectsThisComponent) continue;

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
}: {
  rawSBOM: Bom;
  setProgress: Dispatch<SetStateAction<{ progress: number; message: string }>>;
}): Promise<formattedSBOM> => {
  // Step 1: Initialize progress
  setProgress(() => ({ progress: 0, message: "Initializing formatter..." }));

  // Setup globals
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

  // Step 2: Extract unique licenses and vulnerabilities
  setProgress(() => ({ progress: 1, message: "Extracting unique licenses" }));

  formattedSBOM.statistics.licenses = uniqueLicenses(rawSBOM.components);
  setProgress(() => ({
    progress: 5,
    message: "Finished extracting unique licenses",
  }));

  setProgress(() => ({
    progress: 6,
    message: "Extracting unique vulnerabilities",
  }));
  formattedSBOM.statistics.vulnerabilities = uniqueVulnerabilities(rawSBOM);

  setProgress(() => ({
    progress: 10,
    message: "Finished extracting unique vulnerabilities",
  }));

  // Step 3: Build component and dependency maps for efficient lookup
  setProgress(() => ({
    progress: 15,
    message: "Building component and dependency maps",
  }));

  const componentMap = new Map<string, Component>();
  const dependencyMap = new Map<string, string[]>();

  // Build component map - iterate through the ComponentRepository
  for (const component of rawSBOM.components) {
    const bomRef = component.bomRef.value;
    if (bomRef) {
      componentMap.set(bomRef, component);

      // Extract dependencies from the component itself
      const deps: string[] = [];
      for (const depRef of component.dependencies) {
        deps.push(depRef.value);
      }
      if (deps.length > 0) {
        dependencyMap.set(bomRef, deps);
      }
    }
  }

  setProgress(() => ({
    progress: 20,
    message: "Finished building maps",
  }));

  // Step 4: Build nested component structure with vulnerabilities
  setProgress(() => ({
    progress: 25,
    message: "Building nested component structure",
  }));

  /**
   * Recursive function to build nested component with its dependencies
   * @param componentRef The bom-ref of the component to process
   * @param visitedInCurrentPath Set of component refs visited in the current path to detect circular dependencies
   * @returns NestedSBOMComponent with all dependencies fully replicated
   */
  const buildNestedComponent = (
    componentRef: string,
    visitedInCurrentPath: Set<string> = new Set(),
  ): NestedSBOMComponent | null => {
    // Get the component from the map
    const component = componentMap.get(componentRef);
    if (!component) return null;

    // Initialize the nested component by cloning to preserve private fields (e.g., #bomRef)
    const nestedComponent = cloneComponent(component) as NestedSBOMComponent;

    // Add vulnerability tracking
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

    // Initialize formatted dependencies
    nestedComponent.formattedDependencies = [];

    // Extract inherent vulnerabilities for this component
    nestedComponent.vulnerabilities.inherent = categorizeVulnerabilities(
      rawSBOM.vulnerabilities,
      componentRef,
    );

    // Get dependencies for this component
    const dependencies = dependencyMap.get(componentRef) || [];

    // Add current component to visited path to detect circular dependencies
    const newVisitedPath = new Set(visitedInCurrentPath);
    newVisitedPath.add(componentRef);

    // Recursively build dependencies
    dependencies.forEach((depRef) => {
      // If we've already visited this component in the current path, skip to avoid infinite recursion
      if (visitedInCurrentPath.has(depRef)) {
        return;
      }

      const nestedDep = buildNestedComponent(depRef, newVisitedPath);
      if (nestedDep) {
        // Add the dependency (fully replicated)
        nestedComponent.formattedDependencies.push(nestedDep);

        // Aggregate transitive vulnerabilities from this dependency
        // Include both inherent and transitive vulnerabilities from the dependency
        Object.keys(nestedDep.vulnerabilities.inherent).forEach((severity) => {
          const severityKey =
            severity as keyof NestedSBOMComponent["vulnerabilities"]["inherent"];
          nestedComponent.vulnerabilities.transitive[severityKey].push(
            ...nestedDep.vulnerabilities.inherent[severityKey],
          );
        });

        Object.keys(nestedDep.vulnerabilities.transitive).forEach(
          (severity) => {
            const severityKey =
              severity as keyof NestedSBOMComponent["vulnerabilities"]["transitive"];
            nestedComponent.vulnerabilities.transitive[severityKey].push(
              ...nestedDep.vulnerabilities.transitive[severityKey],
            );
          },
        );
      }
    });

    return nestedComponent;
  };

  // Find top-level components (those that are not dependencies of others)
  setProgress(() => ({
    progress: 30,
    message: "Identifying top-level components",
  }));

  const allDependencies = new Set<string>();
  dependencyMap.forEach((deps) => {
    deps.forEach((dep) => allDependencies.add(dep));
  });

  // Top-level components are those in the dependency map but not as dependencies
  const topLevelRefs: string[] = [];
  dependencyMap.forEach((_, ref) => {
    if (!allDependencies.has(ref)) {
      topLevelRefs.push(ref);
    }
  });

  // If no top-level components found, use metadata component or first few components
  if (topLevelRefs.length === 0) {
    if (rawSBOM.metadata?.component?.bomRef?.value) {
      topLevelRefs.push(rawSBOM.metadata.component.bomRef.value);
    } else {
      // Use first component as fallback
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

  // Build nested structure for top-level components
  topLevelRefs.forEach((ref, index) => {
    setProgress(() => ({
      progress: 35 + (index / topLevelRefs.length) * 55,
      message: `Processing top-level component ${index + 1}/${topLevelRefs.length}`,
    }));

    const nestedComponent = buildNestedComponent(ref);
    if (nestedComponent) {
      formattedSBOM.components.push(nestedComponent);
    }
  });

  // Step 5: Finalize
  setProgress(() => ({
    progress: 95,
    message: "Finalizing formatted SBOM",
  }));

  // Deduplicate transitive vulnerabilities within each component
  formattedSBOM.components.forEach((component) => {
    Object.keys(component.vulnerabilities.transitive).forEach((severity) => {
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
    });
  });

  setProgress(() => ({
    progress: 100,
    message: "Formatting complete",
  }));

  return formattedSBOM;
};
