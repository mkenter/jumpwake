import { describe, expect, it } from 'vitest';
import { hasJumpChain } from './connectivity';

const systems = [
  { id: 'a', hex: { column: 1, row: 1 } },
  { id: 'b', hex: { column: 1, row: 3 } },
  { id: 'c', hex: { column: 1, row: 5 } },
  { id: 'isolated', hex: { column: 8, row: 10 } },
];

describe('geometric jump connectivity', () => {
  it('finds chains independently of fuel and rejects range gaps', () => {
    expect(hasJumpChain(systems, 'a', 'c', 2)).toBe(true);
    expect(hasJumpChain(systems, 'a', 'c', 1)).toBe(false);
    expect(hasJumpChain(systems, 'a', 'isolated', 2)).toBe(false);
    expect(hasJumpChain(systems, 'a', 'a', 1)).toBe(true);
    expect(() => hasJumpChain(systems, 'missing', 'a', 2)).toThrow('Unknown');
  });
});
