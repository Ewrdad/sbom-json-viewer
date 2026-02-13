import { calculateDependents, calculateTransitiveDependents } from './dependencyUtils';
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

describe('calculateTransitiveDependents', () => {
  it('should return 0 for all nodes in an empty graph', () => {
    const graph = new Map<string, string[]>();
    const blastRadius = calculateTransitiveDependents(graph);
    expect(blastRadius.size).toBe(0);
  });

  it('should correctly calculate blast radius for a linear chain', () => {
    // A depends on B depends on C
    // Dependents graph: C -> [B], B -> [A], A -> []
    const dependentsGraph = new Map<string, string[]>([
      ['C', ['B']],
      ['B', ['A']],
      ['A', []],
    ]);

    const blastRadius = calculateTransitiveDependents(dependentsGraph);

    expect(blastRadius.get('C')).toBe(2); // B and A depend on C
    expect(blastRadius.get('B')).toBe(1); // A depends on B
    expect(blastRadius.get('A')).toBe(0); // Nothing depends on A
  });

  it('should correctly calculate blast radius for a tree structure', () => {
    //      C
    //    /   \
    //   B1   B2
    //   |    |
    //   A1   A2
    // Dependents: C -> [B1, B2], B1 -> [A1], B2 -> [A2]
    const dependentsGraph = new Map<string, string[]>([
      ['C', ['B1', 'B2']],
      ['B1', ['A1']],
      ['B2', ['A2']],
      ['A1', []],
      ['A2', []],
    ]);

    const blastRadius = calculateTransitiveDependents(dependentsGraph);

    expect(blastRadius.get('C')).toBe(4); // B1, B2, A1, A2
    expect(blastRadius.get('B1')).toBe(1); // A1
    expect(blastRadius.get('B2')).toBe(1); // A2
  });

  it('should handle cycles correctly and avoid infinite loops', () => {
    // A <-> B (Both depend on each other)
    // Dependents: A -> [B], B -> [A]
    const dependentsGraph = new Map<string, string[]>([
      ['A', ['B']],
      ['B', ['A']],
    ]);

    const blastRadius = calculateTransitiveDependents(dependentsGraph);

    // Blast radius should include the other node in the cycle
    expect(blastRadius.get('A')).toBe(1); // B depends on A
    expect(blastRadius.get('B')).toBe(1); // A depends on B
  });
});
