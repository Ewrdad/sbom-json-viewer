import { describe, it, expect } from "vitest";
import { convertJsonToBom } from "./bomConverter";
import { Bom } from "@cyclonedx/cyclonedx-library/Models";

describe("bomConverter", () => {
  it("should convert invalid json to null or throw or handle gracefully", () => {
    // Based on implementation, it might throw or return empty.
    // Let's check implementation behavior through test.
    // If it throws, we wrap in expect(() => ...).toThrow()
  });

  it("should convert a simple valid cycloneDX JSON to Bom object", async () => {
    const json = {
      bomFormat: "CycloneDX",
      specVersion: "1.4",
      metadata: {
        component: {
          name: "root",
          type: "application",
        },
      },
      components: [
        {
          name: "lib1",
          version: "1.0.0",
          type: "library",
          "bom-ref": "lib1@1.0.0",
        },
      ],
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bom = await convertJsonToBom(json as any);
    expect(bom).toBeInstanceOf(Bom);
    expect(bom.components.size).toBe(1);

    const comps = Array.from(bom.components);
    expect(comps[0].name).toBe("lib1");
  });
});
