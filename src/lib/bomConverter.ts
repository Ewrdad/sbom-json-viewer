import { Bom, BomRef, Component } from "@cyclonedx/cyclonedx-library/Models";
import { batchProcess, tick } from "./asyncUtils";


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const convertJsonToBom = async (
  rawJson: Record<string, any>,
): Promise<Bom> => {
  const bom = new Bom({
    metadata: rawJson.metadata as any,
  });

  // Extract signature if present
  if (rawJson.signature) {
    (bom as any).signature = rawJson.signature;
  }

  // Adding the root component from metadata if it exists
  if (rawJson.metadata?.component) {
    const metaComp = rawJson.metadata.component;
    const rootComponent = new Component(
      metaComp.type || "application",
      metaComp.name || "root",
      {
        bomRef: metaComp["bom-ref"],
        version: metaComp.version,
        group: metaComp.group,
        description: metaComp.description,
        purl: metaComp.purl,
      },
    );
    bom.metadata.component = rootComponent;
    bom.components.add(rootComponent);
  }

  const componentsArray = Array.isArray(rawJson.components)
    ? rawJson.components
    : [];
  await batchProcess(componentsArray, (compData) => {
    const component = new Component(
      compData.type || "library",
      compData.name || "unknown",
      {
        bomRef: compData["bom-ref"],
        version: compData.version,
        group: compData.group,
        description: compData.description,
        purl: compData.purl,
      },
    );

    if (Array.isArray(compData.licenses)) {
      compData.licenses.forEach((licenseData: Record<string, any>) => {
        if (licenseData.license) {
          component.licenses.add(licenseData.license as any);
        }
      });
    }

    bom.components.add(component);
  });

  // Create a lookup map for components to optimize dependency linking
  const componentLookup = new Map<string, Component>();
  for (const component of bom.components) {
    if (component.bomRef?.value) {
      componentLookup.set(component.bomRef.value, component);
    }
  }

  const dependenciesArray = Array.isArray(rawJson.dependencies)
    ? rawJson.dependencies
    : [];
  
  // Link metadata component if not in dependenciesArray
  const rootRef = rawJson.metadata?.component?.["bom-ref"] || rawJson.metadata?.component?.bomRef;
  const rootComponent = bom.metadata?.component;

  if (rootRef && rootComponent && !dependenciesArray.some(d => d.ref === rootRef)) {
    // If we have direct components, the root depends on them
    const directRefs = componentsArray.map((c: any) => c["bom-ref"] || c.bomRef).filter(Boolean);
    directRefs.forEach((r: string) => rootComponent.dependencies.add(new BomRef(r)));
  }

  await batchProcess(dependenciesArray, (dep: Record<string, any>) => {
    const childRefs = (dep.dependsOn || []).map((r: string) => new BomRef(r));
    
    // Link to component object
    const component = componentLookup.get(dep.ref);
    if (component) {
      childRefs.forEach(cr => component.dependencies.add(cr));
    }
  });

  const vulnerabilitiesArray = Array.isArray(rawJson.vulnerabilities)
    ? rawJson.vulnerabilities
    : [];
  await batchProcess(vulnerabilitiesArray, (vulnData: Record<string, any>) => {
    const vuln: Record<string, any> = {
      id: vulnData.id,
      description: vulnData.description,
      ratings: new Set(),
      affects: new Set(),
      references: new Set(),
      cwes: new Set(),
      advisories: new Set(),
      tools: { components: new Set(), services: new Set() },
      properties: new Set(),
    };

    if (Array.isArray(vulnData.ratings)) {
      vulnData.ratings.forEach((rating: Record<string, any>) => {
        vuln.ratings.add({
          severity: rating.severity?.toLowerCase(),
          score: rating.score || 0,
          method: rating.method,
        });
      });
    }

    if (Array.isArray(vulnData.affects)) {
      vulnData.affects.forEach((affect: Record<string, any>) => {
        vuln.affects.add({
          ref: new BomRef(affect.ref),
          versions: new Set(affect.versions || []),
        });
      });
    }

    bom.vulnerabilities.add(vuln as any);
  });

  await tick();
  return bom;
};
