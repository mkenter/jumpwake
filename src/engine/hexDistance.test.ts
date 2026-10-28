import { describe, expect, it } from 'vitest';
import { hexDistance } from './hexDistance';

describe('hexDistance', () => {
  it('measures zero distance to the same hex', () => {
    expect(hexDistance({ q: 3, r: -2 }, { q: 3, r: -2 })).toBe(0);
  });

  it.each([
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 },
  ])('counts each adjacent hex as one step: $q, $r', (neighbor) => {
    expect(hexDistance({ q: 0, r: 0 }, neighbor)).toBe(1);
  });

  it('counts diagonal steps and is symmetric across negative coordinates', () => {
    const from = { q: -2, r: 1 };
    const to = { q: 1, r: 3 };

    expect(hexDistance(from, to)).toBe(5);
    expect(hexDistance(to, from)).toBe(5);
  });
});
