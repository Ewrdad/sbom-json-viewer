import { describe, it, expect } from "vitest";
import { getLicenseCategory } from "./licenseUtils";

describe("licenseUtils", () => {
  it("should categorize permissive licenses correctly", () => {
    expect(getLicenseCategory("MIT")).toBe("permissive");
    expect(getLicenseCategory("Apache-2.0")).toBe("permissive");
    expect(getLicenseCategory("ISC")).toBe("permissive");
    expect(getLicenseCategory("BSD-3-Clause")).toBe("permissive");
  });

  it("should categorize copyleft licenses correctly", () => {
    expect(getLicenseCategory("GPL-3.0")).toBe("copyleft");
    expect(getLicenseCategory("GPL-2.0-only")).toBe("copyleft");
    expect(getLicenseCategory("AGPL-3.0-or-later")).toBe("copyleft");
  });

  it("should categorize weak-copyleft licenses correctly", () => {
    expect(getLicenseCategory("LGPL-3.0")).toBe("weak-copyleft");
    expect(getLicenseCategory("MPL-2.0")).toBe("weak-copyleft");
    expect(getLicenseCategory("EPL-2.0")).toBe("weak-copyleft");
  });

  it("should handle unknown or null licenses", () => {
    expect(getLicenseCategory("Random-License")).toBe("unknown");
    expect(getLicenseCategory(null)).toBe("unknown");
    expect(getLicenseCategory(undefined)).toBe("unknown");
    expect(getLicenseCategory("")).toBe("unknown");
  });

  it("should handle prefix matching", () => {
    expect(getLicenseCategory("MIT-0")).toBe("permissive");
    expect(getLicenseCategory("GPL-2.1")).toBe("copyleft");
    expect(getLicenseCategory("LGPL-2.1")).toBe("weak-copyleft");
  });
});
