import { Bom, BomRef, Component } from "@cyclonedx/cyclonedx-library/Models";
import { batchProcess, tick } from "./asyncUtils";


 
export const convertJsonToBom = async (
  rawJson: Record<string, any>,
): Promise<Bom> => {
  const warnings: string[] = [];
  
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
    (rootComponent as any)._raw = metaComp;
    bom.metadata.component = rootComponent;
    bom.components.add(rootComponent);
  }

  if (rawJson.components && !Array.isArray(rawJson.components)) {
    warnings.push("The 'components' section is present but is not an array. Individual components could not be parsed.");
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

    (component as any)._raw = compData;
    if (compData._rawSources) {
      (component as any)._rawSources = compData._rawSources;
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

  if (rawJson.dependencies && !Array.isArray(rawJson.dependencies)) {
    warnings.push("The 'dependencies' section is present but is not an array. Dependency links were ignored.");
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
      childRefs.forEach((cr: BomRef) => component.dependencies.add(cr));
    }
  });

  if (rawJson.vulnerabilities && !Array.isArray(rawJson.vulnerabilities)) {
    warnings.push("The 'vulnerabilities' section is present but is not an array. Vulnerability data was ignored.");
  }

  const vulnerabilitiesArray = Array.isArray(rawJson.vulnerabilities)
    ? rawJson.vulnerabilities
    : [];
  await batchProcess(vulnerabilitiesArray, (vulnData: Record<string, any>) => {
    const vuln: Record<string, any> = {
      id: vulnData.id,
      source: vulnData.source,
      ratings: new Set(vulnData.ratings || []),
      cwes: new Set(vulnData.cwes || []),
      description: vulnData.description,
      detail: vulnData.detail,
      recommendation: vulnData.recommendation,
      advisories: new Set(vulnData.advisories || []),
      created: vulnData.created,
      published: vulnData.published,
      updated: vulnData.updated,
      rejected: vulnData.rejected,
      credits: vulnData.credits,
      tools: vulnData.tools,
      analysis: vulnData.analysis,
      workaround: vulnData.workaround,
      proofOfConcept: vulnData.proofOfConcept,
      references: new Set(vulnData.references || []),
      properties: new Set(vulnData.properties || []),
              affects: new Set((vulnData.affects || []).map((affect: any) => ({
                ref: new BomRef(affect.ref?.value || affect.ref),
                versions: new Set(affect.versions || []),
              }))),
              _rawSources: vulnData._rawSources,
              _raw: vulnData,
            };
      
            bom.vulnerabilities.add(vuln as any);  });

  (bom as any)._raw = rawJson;
  (bom as any)._parsingWarnings = warnings;

  await tick();
  return bom;
};
