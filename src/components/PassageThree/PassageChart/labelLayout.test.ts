import { describe, expect, it } from 'vitest';
import { placeWorldLabels, type WorldLabel } from './labelLayout';
import type { RouteLeg } from './routeGeometry';

const label = (id: string, x: number, y: number): WorldLabel => ({
  id,
  x,
  y,
  width: 60,
  top: -16,
  bottom: 22,
});
const line: RouteLeg = {
  id: 'jump',
  from: 'left',
  to: 'right',
  traversals: 1,
  points: [
    { x: 20, y: 200 },
    { x: 150, y: 200 },
    { x: 250, y: 200 },
    { x: 400, y: 200 },
  ],
  arrow: [
    { x: 394, y: 197 },
    { x: 400, y: 200 },
    { x: 394, y: 203 },
  ],
};

describe('world label placement', () => {
  it('retains familiar placement when the label is already clear', () => {
    const result = placeWorldLabels([label('world', 100, 200)], [], 7).get(
      'world',
    )!;
    expect(result.x).toBe(114);
    expect(result.y).toBe(189);
  });

  it('moves text and its halo clear of a passing route', () => {
    const input = [label('world', 100, 200)];
    const result = placeWorldLabels(input, [line], 7).get('world')!;
    expect(result.bounds.bottom < 200 || result.bounds.top > 200).toBe(true);
    expect(result.bounds.right - result.bounds.left).toBeGreaterThan(60);
    expect(placeWorldLabels(input, [line], 7)).toEqual(
      placeWorldLabels(input, [line], 7),
    );
  });

  it('keeps neighboring labels separate and inside the chart', () => {
    const result = [
      ...placeWorldLabels(
        [
          label('one', 38, 42),
          label('two', 75, 42),
          label('edge', 600, 730),
          label('bottom', 400, 760),
        ],
        [],
        11,
      ).values(),
    ];
    for (const [index, item] of result.entries()) {
      expect(item.bounds.left).toBeGreaterThanOrEqual(-16);
      expect(item.bounds.right).toBeLessThanOrEqual(622);
      expect(item.bounds.top).toBeGreaterThanOrEqual(-12);
      expect(item.bounds.bottom).toBeLessThanOrEqual(776);
      for (const other of result.slice(index + 1)) {
        const width =
          Math.min(item.bounds.right, other.bounds.right) -
          Math.max(item.bounds.left, other.bounds.left);
        const height =
          Math.min(item.bounds.bottom, other.bounds.bottom) -
          Math.max(item.bounds.top, other.bounds.top);
        expect(width <= 0 || height <= 0).toBe(true);
      }
    }
  });
});
