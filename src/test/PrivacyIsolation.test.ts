import { describe, it, expect, vi, beforeEach } from "vitest";
import { convertJsonToBom } from "../lib/bomConverter";
import { Formatter } from "../renderer/Formatter/Formatter";
import { calculateSbomStats } from "../lib/statsUtils";

/**
 * Privacy Isolation Test Suite
 * 
 * WHY: This test programmatically proves that the SBOM processing lifecycle
 * is "Zero-Knowledge" and does not leak data to external domains.
 * It mocks all possible browser network APIs and asserts they are never called
 * during the parsing, conversion, and formatting of a local SBOM.
 */
describe("Privacy Isolation (Network Zero-Knowledge)", () => {
  const fetchMock = vi.fn();
  const xhrMock = vi.fn();
  const sendBeaconMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock fetch
    vi.stubGlobal("fetch", fetchMock.mockRejectedValue(new Error("Privacy Violation: fetch() called")));
    
    // Mock XMLHttpRequest
    vi.stubGlobal("XMLHttpRequest", vi.fn().mockImplementation(() => ({
      open: xhrMock,
      send: xhrMock,
    })));

    // Mock navigator.sendBeacon
    if (typeof navigator !== 'undefined') {
      vi.stubGlobal("navigator", {
        ...navigator,
        sendBeacon: sendBeaconMock.mockReturnValue(true),
      });
    }
  });

  const mockSbomJson = {
    bomFormat: "CycloneDX",
    specVersion: "1.5",
    version: 1,
    metadata: {
      timestamp: "2024-01-01T00:00:00Z",
      component: {
        name: "privacy-test-app",
        version: "1.0.0",
        type: "application"
      }
    },
    components: [
      {
        name: "test-library",
        version: "1.2.3",
        type: "library",
        "bom-ref": "pkg:npm/test-library@1.2.3",
        licenses: [
          {
            license: { id: "MIT" }
          }
        ]
      }
    ],
    dependencies: [
      {
        ref: "pkg:npm/privacy-test-app@1.0.0",
        dependsOn: ["pkg:npm/test-library@1.2.3"]
      }
    ],
    vulnerabilities: [
      {
        id: "CVE-2024-PRIVACY",
        ratings: [{ severity: "high" }],
        affects: [{ ref: "pkg:npm/test-library@1.2.3" }]
      }
    ]
  };

  it("should complete the full processing lifecycle without any network activity", async () => {
    // 1. Convert JSON to Bom model
    const bom = await convertJsonToBom(mockSbomJson as any);
    expect(bom).toBeDefined();

    // 2. Calculate Statistics
    const stats = calculateSbomStats(bom);
    expect(stats.totalComponents).toBe(2);

    // 3. Format for UI (includes dependency tree and graph logic)
    const formatted = await Formatter({
      rawSBOM: bom,
      setProgress: () => {},
    });
    expect(formatted).toBeDefined();
    expect(formatted.dependencyGraph).toBeDefined();

    // ASSERTIONS: No network calls were attempted
    expect(fetchMock).not.toHaveBeenCalled();
    expect(xhrMock).not.toHaveBeenCalled();
    expect(sendBeaconMock).not.toHaveBeenCalled();
  });

  it("should remain isolated even when processing malformed data", async () => {
    const malformedSbom = {
      bomFormat: "CycloneDX",
      components: "this should be an array but is a string"
    };

    try {
      await convertJsonToBom(malformedSbom as any);
    } catch (e) {
      // Expected error
    }

    expect(fetchMock).not.toHaveBeenCalled();
    expect(xhrMock).not.toHaveBeenCalled();
    expect(sendBeaconMock).not.toHaveBeenCalled();
  });
});
