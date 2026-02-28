import { describe, it, expect } from 'vitest';
import { cleanSbomMetadata } from './sbomUtils';

describe('cleanSbomMetadata', () => {
  it('should remove internal metadata properties', () => {
    const input = {
      name: 'test-component',
      version: '1.0.0',
      _raw: { some: 'raw-data' },
      _rawSources: [{ name: 'source1', json: {} }],
      __multiSbomStats: { count: 1 },
      sourceInfo: { file: 'test.json' },
      otherProp: 'value'
    };

    const expected = {
      name: 'test-component',
      version: '1.0.0',
      otherProp: 'value'
    };

    expect(cleanSbomMetadata(input)).toEqual(expected);
  });

  it('should recursively clean nested objects', () => {
    const input = {
      name: 'parent',
      components: [
        {
          name: 'child',
          _raw: 'internal',
          meta: {
            tags: ['a', 'b'],
            sourceInfo: 'internal'
          }
        }
      ]
    };

    const expected = {
      name: 'parent',
      components: [
        {
          name: 'child',
          meta: {
            tags: ['a', 'b']
          }
        }
      ]
    };

    expect(cleanSbomMetadata(input)).toEqual(expected);
  });

  it('should handle arrays correctly', () => {
    const input = [
      { name: 'c1', _raw: 'x' },
      { name: 'c2', sourceInfo: 'y' }
    ];

    const expected = [
      { name: 'c1' },
      { name: 'c2' }
    ];

    expect(cleanSbomMetadata(input)).toEqual(expected);
  });

  it('should return non-object types as-is', () => {
    expect(cleanSbomMetadata('string')).toBe('string');
    expect(cleanSbomMetadata(123)).toBe(123);
    expect(cleanSbomMetadata(null)).toBe(null);
    expect(cleanSbomMetadata(undefined)).toBe(undefined);
  });
});
