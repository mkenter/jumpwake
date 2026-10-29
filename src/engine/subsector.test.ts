import { describe, expect, it } from 'vitest';
import { fromAxial, toAxial } from './subsector';
import { hexDistance } from './hexDistance';

describe('Traveller subsector geometry', () => {
  it('places even display columns half a row below odd columns', () => {
    const center = toAxial({ column: 2, row: 2 });
    for (const [column, row] of [
      [1, 2],
      [1, 3],
      [2, 1],
      [2, 3],
      [3, 2],
      [3, 3],
    ]) {
      expect(hexDistance(center, toAxial({ column: column!, row: row! }))).toBe(
        1,
      );
    }
    expect(hexDistance(center, toAxial({ column: 1, row: 1 }))).toBe(2);
    expect(
      hexDistance(
        toAxial({ column: 3, row: 2 }),
        toAxial({ column: 4, row: 1 }),
      ),
    ).toBe(1);
    expect(
      hexDistance(
        toAxial({ column: 1, row: 1 }),
        toAxial({ column: 8, row: 10 }),
      ),
    ).toBe(13);
  });
  it('round trips every address', () => {
    for (let column = 1; column <= 8; column++)
      for (let row = 1; row <= 10; row++) {
        expect(fromAxial(toAxial({ column, row }))).toEqual({ column, row });
      }
  });
  it.each([
    [0, 1],
    [9, 1],
    [1, 0],
    [1, 11],
    [1.5, 2],
    [NaN, 1],
  ])('rejects invalid address %s/%s', (column, row) => {
    expect(() => toAxial({ column, row })).toThrow(RangeError);
  });
});
