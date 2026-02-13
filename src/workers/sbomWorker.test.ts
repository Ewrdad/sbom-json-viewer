import { describe, it, expect } from 'vitest';
import { deepToPlain } from '../lib/cloneUtils';

describe('deepToPlain', () => {
    it('should handle deep nesting without stack overflow', () => {
        let current: any = { val: 0 };
        const root = current;
        const depth = 20000;
        for (let i = 0; i < depth; i++) {
            current.next = { val: i + 1 };
            current = current.next;
        }

        const result = deepToPlain(root) as any;
        let probe = result;
        let count = 0;
        while(probe && probe.next) {
            probe = probe.next;
            count++;
        }
        expect(count).toBe(depth);
    });

    it('should preserve shared references', () => {
        const sub = { x: 1 };
        const input = { a: sub, b: sub };
        const output = deepToPlain(input) as any;
        expect(output.a).toBe(output.b);
        expect(output.a).toEqual({ x: 1 });
    });
});
