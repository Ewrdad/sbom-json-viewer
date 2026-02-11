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

const LICENSE_DETAILS: Record<string, string> = {
  "MIT": "A short and simple permissive license with conditions only requiring preservation of copyright and license notices. Licensed works, modifications, and larger works may be distributed under different terms and without source code.",
  "Apache-2.0": "A permissive license whose main conditions require preservation of copyright and license notices. Licensed works, modifications, and larger works may be distributed under different terms and without source code.",
  "GPL-3.0-only": "The GNU General Public License is a free, copyleft license for software and other kinds of works. It requires that the full source code be made available and that any derivative works be licensed under the same terms.",
  "GPL-2.0-only": "A legacy version of the GPL license. It requires that the full source code be made available and that any derivative works be licensed under the same terms.",
  "LGPL-3.0-only": "The Lesser GPL allows the work to be used in proprietary software. If you modify the library, those modifications must be released under LGPL.",
  "BSD-3-Clause": "A permissive license that allows unlimited redistribution for any purpose as long as its copyright notices and the license's disclaimers of warranty are maintained.",
  "BSD-2-Clause": "Similar to the 3-clause BSD license but without the non-endorsement clause.",
  "ISC": "A permissive license functionally equivalent to the Simplified BSD and MIT licenses, but with language deemed unnecessary by the Berne Convention removed.",
  "MPL-2.0": "A weak copyleft license that allows the software to be used in proprietary products, but requires modifications to MPL-licensed files to be released under the MPL.",
  "EPL-2.0": "A weak copyleft license that allows the software to be used in proprietary products, but requires modifications to EPL-licensed files to be released under the EPL.",
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

export function getLicenseDescription(licenseId: string | null | undefined): string {
  if (!licenseId) return "No license information available.";
  
  // Try exact match
  if (LICENSE_DETAILS[licenseId]) return LICENSE_DETAILS[licenseId];
  
  // Try partial match/canonicalize
  const id = licenseId.toUpperCase();
  if (id.includes("MIT")) return LICENSE_DETAILS["MIT"];
  if (id.includes("APACHE")) return LICENSE_DETAILS["Apache-2.0"];
  if (id.includes("GPL-3")) return LICENSE_DETAILS["GPL-3.0-only"];
  if (id.includes("GPL-2")) return LICENSE_DETAILS["GPL-2.0-only"];
  if (id.includes("LGPL")) return LICENSE_DETAILS["LGPL-3.0-only"];
  if (id.includes("BSD-3")) return LICENSE_DETAILS["BSD-3-Clause"];
  if (id.includes("BSD-2")) return LICENSE_DETAILS["BSD-2-Clause"];
  if (id.includes("ISC")) return LICENSE_DETAILS["ISC"];
  if (id.includes("MPL")) return LICENSE_DETAILS["MPL-2.0"];
  if (id.includes("EPL")) return LICENSE_DETAILS["EPL-2.0"];
  
  return `No detailed summary available for ${licenseId}. It is categorized as ${getLicenseCategory(licenseId)}.`;
}
