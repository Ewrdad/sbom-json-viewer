
import { describe, it, expect } from 'vitest';
import { Formatter } from '../src/renderer/Formatter/Formatter';
import { Bom, Component } from '@cyclonedx/cyclonedx-library/Models';
import type { ComponentType } from '@cyclonedx/cyclonedx-library/Enums';

describe('Formatter (Flat Structure)', () => {
  it('should format a simple SBOM into a flat component map and dependency graph', async () => {
    // Mock SBOM with: A -> B -> C
    const root = new Component('library' as ComponentType, 'Root', { bomRef: 'root', version: '1.0.0' });
    const compA = new Component('library' as ComponentType, 'CompA', { bomRef: 'a', version: '1.0.0' });
    const compB = new Component('library' as ComponentType, 'CompB', { bomRef: 'b', version: '1.0.0' });
    const compC = new Component('library' as ComponentType, 'CompC', { bomRef: 'c', version: '1.0.0' });

    root.dependencies.add({ value: 'a' } as any);
    compA.dependencies.add({ value: 'b' } as any);
    compB.dependencies.add({ value: 'c' } as any);

    // Add them to BOM
    const bom = new Bom();
    bom.components.add(root);
    bom.components.add(compA);
    bom.components.add(compB);
    bom.components.add(compC);
    bom.metadata.component = root;

    const result = await Formatter({
      rawSBOM: bom,
      setProgress: () => {},
    });

    // Verify it returns the new flat structure
    expect(result).toHaveProperty('componentMap');
    expect(result).toHaveProperty('dependencyGraph');
    expect(result).not.toHaveProperty('components'); // Should not have the old nested list

    // Check component map
    expect(result.componentMap.get('root')).toBeDefined();
    expect(result.componentMap.get('a')).toBeDefined();
    expect(result.componentMap.get('b')).toBeDefined();
    expect(result.componentMap.get('c')).toBeDefined();

    // Check dependency graph (adjacency list)
    expect(result.dependencyGraph.get('root')).toContain('a');
    expect(result.dependencyGraph.get('a')).toContain('b');
    expect(result.dependencyGraph.get('b')).toContain('c');
    expect(result.dependencyGraph.get('c')).toEqual([]); // Leaf node
  });

  it('should handle shared dependencies without duplication', async () => {
    // Diamond dependency: Root -> A, Root -> B, A -> C, B -> C
    const root = new Component('library' as ComponentType, 'Root', { bomRef: 'root' });
    const compA = new Component('library' as ComponentType, 'CompA', { bomRef: 'a' });
    const compB = new Component('library' as ComponentType, 'CompB', { bomRef: 'b' });
    const compC = new Component('library' as ComponentType, 'CompC', { bomRef: 'c' });

    root.dependencies.add({ value: 'a' } as any);
    root.dependencies.add({ value: 'b' } as any);
    compA.dependencies.add({ value: 'c' } as any);
    compB.dependencies.add({ value: 'c' } as any);

    const bom = new Bom();
    bom.components.add(root);
    bom.components.add(compA);
    bom.components.add(compB);
    bom.components.add(compC);
    bom.metadata.component = root;

    const result = await Formatter({ rawSBOM: bom, setProgress: () => {} });

    // In the old system, C would appear twice in the nested structure.
    // In the new system, C should appear ONCE in the map.
    expect(result.componentMap.size).toBe(4);
    expect(result.componentMap.get('c')).toBeDefined();

    // Check edges
    expect(result.dependencyGraph.get('root')).toEqual(expect.arrayContaining(['a', 'b']));
    expect(result.dependencyGraph.get('a')).toContain('c');
    expect(result.dependencyGraph.get('b')).toContain('c');
  });
});
