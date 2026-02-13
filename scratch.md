# Developer Scratchpad - Reverse Dependency Tree

## Architecture Notes

- **Reverse Dependency Logic**: Located in `src/lib/dependencyUtils.ts`. It uses a Map-based adjacency list.
- **Worker Integration**: The `dependentsGraph` is calculated in `sbomWorker.ts`. Since we are sending data over the worker boundary, Maps are converted to plain objects and must be "revived" in `App.tsx` using `new Map(Object.entries(result.formatted.dependentsGraph))`.

## Critical Gotchas

1. **`bomRef` is a Getter**: In the `@cyclonedx/cyclonedx-library`, the `bomRef` property on a `Component` is a getter, not a simple value.
   - **Problem**: `Object.assign` and standard object spread `{...comp}` do NOT copy getters. This causes data loss when converting class instances to plain objects for worker transfer.
   - **Solution**: We use `Object.defineProperty` in `Formatter.ts` to explicitly define `bomRef` as an own, enumerable property on the `EnhancedComponent` object.
   - **Impact**: If you add new views or components, ensure `bomRef` is accessed as `comp.bomRef?.value` to handle both the original class instance and the revived plain object.

2. **Large SBOM Resilience**:
   - The Reverse Dependency Tree sidebar uses standard mapping. For extremely large SBOMs (>10k nodes), this might need virtualization (similar to `DependencyTree.tsx`).
   - Null checks are essential in `Formatter.ts` (especially in `uniqueVulnerabilities.ts` and the main loop) as some SBOMs have `affect.ref` as a string instead of a `BomRef` object, or even `null`.

## Future Work

- [ ] Implement transitive dependent counting (recursive reachability) for the "Most Used" ranking.
- [ ] Add a D3 or Mermaid-based interactive graph specifically for the selected node's dependents.
- [ ] Virtualize the sidebar in `ReverseDependencyTree.tsx` if performance degrades on 20k+ node SBOMs.
