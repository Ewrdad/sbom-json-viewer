import { describe, it, expect } from "vitest";
import { deepToPlain } from "./cloneUtils";
import { BomRef } from "@cyclonedx/cyclonedx-library/Models";

describe("cloneUtils", () => {
  describe("deepToPlain", () => {
    it("clones simple objects", () => {
      const input = { a: 1, b: "test" };
      const output = deepToPlain(input);
      expect(output).toEqual(input);
      expect(output).not.toBe(input);
    });

    it("clones arrays", () => {
      const input = [1, 2, { a: 3 }];
      const output = deepToPlain(input) as any[];
      expect(output).toEqual(input);
      expect(output[2]).not.toBe(input[2]);
    });

    it("converts Sets to arrays (impl specific behavior)", () => {
      // deepToPlain converts Sets to arrays of [index, value] entries based on current implementation
      // Wait, looking at implementation:
      // else if (obj instanceof Set) { entries = Array.from(obj).map((v, i) => [i, v]); }
      // And then it sets clone[key]... wait. 
      // If obj is a Set, createCloneStub returns [], so it's treated as array-like?
      // Actually `createCloneStub` for Set returns `[]`.
      // And then it iterates entries [i, v].
      // So it converts Set<T> to T[].
      
      const input = new Set([1, 2]);
      const output = deepToPlain(input);
      expect(output).toEqual([1, 2]);
    });

    it("converts Maps to plain objects", () => {
      // Implementation: Map -> {} stub. entries = Array.from(obj.entries()).
      // So Map<K, V> -> Record<K, V>
      const input = new Map([["key", "value"]]);
      const output = deepToPlain(input);
      expect(output).toEqual({ key: "value" });
    });

    it("handles circular references", () => {
      const a: any = { name: "a" };
      const b: any = { name: "b" };
      a.child = b;
      b.parent = a;

      const output: any = deepToPlain(a);
      expect(output.name).toBe("a");
      expect(output.child.name).toBe("b");
      expect(output.child.parent).toBe(output); // Circular reference preserved
    });

    it("handles BomRef special case", () => {
      // Implementation has special handling for objects with 'value' property and <= 2 keys
      const ref = new BomRef("pkg:test");
      const output = deepToPlain(ref);
      expect(output).toEqual({ value: "pkg:test" });
    });
  });
});
