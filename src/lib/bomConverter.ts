/**
 * Utility to convert raw CycloneDX JSON to Bom-like structure
 *
 * Why: The Formatter expects a Bom object from the CycloneDX library,
 * but we need to work with raw JSON from files. This converter creates
 * a minimal structure that matches what the Formatter needs.
 */

import { Bom, Component, BomRef } from "@cyclonedx/cyclonedx-library/Models";

/**
 * Convert raw CycloneDX JSON to a Bom object
 * @param rawJson - Raw JSON object from a CycloneDX file
 * @returns Bom object suitable for use with Formatter
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const convertJsonToBom = (rawJson: Record<string, any>): Bom => {
  const bom = new Bom({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata: rawJson.metadata as any,
  });

  // Process components
  if (rawJson.components && Array.isArray(rawJson.components)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rawJson.components.forEach((compData: Record<string, any>) => {
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

      // Add licenses
      if (compData.licenses && Array.isArray(compData.licenses)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        compData.licenses.forEach((licenseData: Record<string, any>) => {
          if (licenseData.license) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            component.licenses.add(licenseData.license as any);
          }
        });
      }

      // We'll add dependencies after all components are added
      bom.components.add(component);
    });

    // Now add dependencies
    if (rawJson.dependencies && Array.isArray(rawJson.dependencies)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rawJson.dependencies.forEach((dep: Record<string, any>) => {
        // Find the component with this ref
        for (const component of bom.components) {
          if (component.bomRef?.value === dep.ref) {
            // Add each dependency reference
            if (dep.dependsOn && Array.isArray(dep.dependsOn)) {
              dep.dependsOn.forEach((depRef: string) => {
                component.dependencies.add(new BomRef(depRef));
              });
            }
            break;
          }
        }
      });
    }
  }

  // Process vulnerabilities
  if (rawJson.vulnerabilities && Array.isArray(rawJson.vulnerabilities)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rawJson.vulnerabilities.forEach((vulnData: Record<string, any>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

      // Add ratings
      if (vulnData.ratings && Array.isArray(vulnData.ratings)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vulnData.ratings.forEach((rating: Record<string, any>) => {
          vuln.ratings.add({
            severity: rating.severity?.toLowerCase(),
            score: rating.score || 0,
            method: rating.method,
          });
        });
      }

      // Add affects
      if (vulnData.affects && Array.isArray(vulnData.affects)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vulnData.affects.forEach((affect: Record<string, any>) => {
          vuln.affects.add({
            ref: new BomRef(affect.ref),
            versions: new Set(affect.versions || []),
          });
        });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      bom.vulnerabilities.add(vuln as any);
    });
  }

  return bom;
};
