import type { License } from "@cyclonedx/cyclonedx-library/Models";
import type { ComponentRepository } from "@cyclonedx/cyclonedx-library/Models";

/**
 * Extract unique licenses from all components in the SBOM
 * @param components ComponentRepository containing all components
 * @returns Array of unique License objects
 */
export const uniqueLicenses = (components: ComponentRepository): License[] => {
  const licenseMap = new Map<string, License>();

  // Iterate through all components
  for (const component of components) {
    // Iterate through licenses in each component
    for (const license of component.licenses) {
      // Create a unique key for the license
      let key = "";

      // Handle different license types
      if ("id" in license && license.id) {
        key = `id:${license.id}`;
      } else if ("name" in license && license.name) {
        key = `name:${license.name}`;
      } else if ("expression" in license && license.expression) {
        key = `expr:${license.expression}`;
      }

      if (key && !licenseMap.has(key)) {
        licenseMap.set(key, license);
      }
    }
  }

  return Array.from(licenseMap.values());
};
