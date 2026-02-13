import { calculateDependents } from './dependencyUtils';
import { describe, it, expect } from 'vitest';

describe('calculateDependents', () => {
  it('should return an empty map for an empty graph', () => {
    const graph = new Map<string, string[]>();
    const dependents = calculateDependents(graph);
    expect(dependents.size).toBe(0);
  });

  it('should correctly invert a simple dependency graph', () => {
    const graph = new Map<string, string[]>([
      ['A', ['B', 'C']],
      ['B', ['C']],
      ['C', []],
    ]);

    const dependents = calculateDependents(graph);

    expect(dependents.get('B')).toEqual(expect.arrayContaining(['A']));
    expect(dependents.get('C')).toEqual(expect.arrayContaining(['A', 'B']));
    expect(dependents.get('A')).toEqual([]); // Nothing depends on A
  });

  it('should handle disconnected nodes', () => {
    const graph = new Map<string, string[]>([
      ['A', []],
      ['B', []],
    ]);

    const dependents = calculateDependents(graph);

    expect(dependents.get('A')).toEqual([]);
    expect(dependents.get('B')).toEqual([]);
  });

  it('should handle cycles gracefully', () => {
    // A -> B -> A
    const graph = new Map<string, string[]>([
      ['A', ['B']],
      ['B', ['A']],
    ]);

    const dependents = calculateDependents(graph);

    expect(dependents.get('B')).toEqual(expect.arrayContaining(['A']));
    expect(dependents.get('A')).toEqual(expect.arrayContaining(['B']));
  });

  it('should include all nodes from the input graph in the output map', () => {
       const graph = new Map<string, string[]>([
      ['A', ['B']],
      ['B', []],
      ['C', []] 
    ]);
    
    const dependents = calculateDependents(graph);
    
    expect(dependents.has('A')).toBe(true);
    expect(dependents.has('B')).toBe(true);
    expect(dependents.has('C')).toBe(true);
  });
});
