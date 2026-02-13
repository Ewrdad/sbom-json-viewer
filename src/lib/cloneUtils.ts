/**
 * Iteratively converts class instances to plain objects.
 * This prevents stack overflow on deep structures and preserves shared references.
 */
export function deepToPlain(root: unknown): unknown {
  if (root === null || typeof root !== "object") {
    return root;
  }

  const seen = new Map<object, unknown>();
  
  function createCloneStub(obj: object): any {
    if (Array.isArray(obj) || obj instanceof Set) {
      return [];
    }
    if (obj instanceof Map) {
      return {};
    }
    // Special handling for BomRef and similar classes with a 'value' property
    const objWithVal = obj as { value?: unknown };
    if (objWithVal.value !== undefined && Object.keys(obj).length <= 2) {
      return { value: objWithVal.value };
    }
    return {};
  }

  const result = createCloneStub(root as object);
  seen.set(root as object, result);

  const stack: { obj: object; clone: Record<string | number, unknown> }[] = [{ obj: root as object, clone: result }];

  while (stack.length > 0) {
    const { obj, clone } = stack.pop()!;

    // If it was a simple BomRef stub, we don't need to process its properties further
    const objWithVal = obj as { value?: unknown };
    if (obj !== root && objWithVal.value !== undefined && Object.keys(obj).length <= 2) {
      continue;
    }

    let entries: [key: string | number, value: unknown][] = [];

    if (Array.isArray(obj)) {
      entries = obj.map((v, i) => [i, v]);
    } else if (obj instanceof Set) {
      entries = Array.from(obj).map((v, i) => [i, v]);
    } else if (obj instanceof Map) {
      entries = Array.from(obj.entries());
    } else {
      const record = obj as Record<string, unknown>;
      for (const key in record) {
        if (
          Object.prototype.hasOwnProperty.call(record, key) &&
          typeof record[key] !== "function"
        ) {
          entries.push([key, record[key]]);
        }
      }
    }

    for (const [key, val] of entries) {
      if (val === null || typeof val !== "object") {
        clone[key] = val;
      } else if (seen.has(val as object)) {
        clone[key] = seen.get(val as object);
      } else {
        const valClone = createCloneStub(val as object);
        seen.set(val as object, valClone);
        clone[key] = valClone;
        stack.push({ obj: val as object, clone: valClone });
      }
    }
  }


  return result;
}

