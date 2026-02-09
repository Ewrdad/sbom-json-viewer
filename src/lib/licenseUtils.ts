export type LicenseCategory =
  | "permissive"
  | "copyleft"
  | "weak-copyleft"
  | "proprietary"
  | "unknown";

const LICENSE_MAPPING: Record<string, LicenseCategory> = {
  // Permissive
  "MIT": "permissive",
  "ISC": "permissive",
  "Apache-2.0": "permissive",
  "BSD-2-Clause": "permissive",
  "BSD-3-Clause": "permissive",
  "CC0-1.0": "permissive",
  "Unlicense": "permissive",
  "0BSD": "permissive",

  // Copyleft
  "GPL-1.0-only": "copyleft",
  "GPL-1.0-or-later": "copyleft",
  "GPL-2.0-only": "copyleft",
  "GPL-2.0-or-later": "copyleft",
  "GPL-3.0-only": "copyleft",
  "GPL-3.0-or-later": "copyleft",
  "AGPL-3.0-only": "copyleft",
  "AGPL-3.0-or-later": "copyleft",

  // Weak Copyleft
  "LGPL-2.0-only": "weak-copyleft",
  "LGPL-2.0-or-later": "weak-copyleft",
  "LGPL-2.1-only": "weak-copyleft",
  "LGPL-2.1-or-later": "weak-copyleft",
  "LGPL-3.0-only": "weak-copyleft",
  "LGPL-3.0-or-later": "weak-copyleft",
  "MPL-2.0": "weak-copyleft",
  "EPL-1.0": "weak-copyleft",
  "EPL-2.0": "weak-copyleft",
};

export function getLicenseCategory(licenseId: string | null | undefined): LicenseCategory {
  if (!licenseId) return "unknown";

  // Check exact mapping
  if (LICENSE_MAPPING[licenseId]) {
    return LICENSE_MAPPING[licenseId];
  }

  // Check prefix matches for versioned licenses (e.g., GPL-2.0)
  const id = licenseId.toUpperCase();
  if (id.startsWith("GPL") || id.startsWith("AGPL")) return "copyleft";
  if (id.startsWith("LGPL") || id.startsWith("MPL") || id.startsWith("EPL")) return "weak-copyleft";
  if (id.startsWith("MIT") || id.startsWith("APACHE") || id.startsWith("BSD") || id.startsWith("ISC")) return "permissive";

  return "unknown";
}
