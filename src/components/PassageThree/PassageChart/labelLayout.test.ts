import { describe, expect, it } from 'vitest';
import {
  placeWorldLabels,
  revealWorldLabels,
  type WorldLabel,
} from './labelLayout';
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
      for (const other of result
        .slice(index + 1)
        .filter((other) => item.visible && other.visible)) {
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

describe('collision-aware visibility', () => {
  const dense = Array.from({ length: 80 }, (_, i) =>
    label(
      `w${i}`,
      38 + Math.floor(i / 10) * 66,
      (38 + (i % 10) * 66 + (Math.floor(i / 10) % 2 ? 33 : 0)) * 1.1,
    ),
  );
  it('packs useful labels at rest with deterministic positions independent of input order', () => {
    const result = placeWorldLabels(dense, [], 11);
    const visible = [...result.values()].filter((p) => p.visible);
    expect(visible.length).toBeGreaterThan(15);
    expect(visible.length).toBeLessThan(80);
    expect(placeWorldLabels([...dense].reverse(), [], 11)).toEqual(result);
    for (const [i, a] of visible.entries())
      for (const b of visible.slice(i + 1)) {
        expect(
          a.bounds.right <= b.bounds.left ||
            b.bounds.right <= a.bounds.left ||
            a.bounds.bottom <= b.bounds.top ||
            b.bounds.bottom <= a.bounds.top,
        ).toBe(true);
      }
  });
  it('gives endpoints precedence over route worlds, and route worlds over other labels', () => {
    const input = [
      label('other', 100, 200),
      label('route', 100, 200),
      label('endpoint', 100, 200),
    ];
    const result = placeWorldLabels(input, [{ ...line, from: 'route' }], 7, [
      'endpoint',
    ]);
    expect([...result.keys()]).toEqual(['endpoint', 'route', 'other']);
    expect(result.get('endpoint')!.visible).toBe(true);
  });
  it('reveals an omitted label without moving other labels and restores the resting layout', () => {
    const resting = placeWorldLabels(dense, [], 11);
    const id = [...resting].find(([, p]) => !p.visible)![0];
    const active = revealWorldLabels(resting, [id]);
    expect(active.get(id)!.visible).toBe(true);
    for (const [key, placement] of active)
      expect({ ...placement, visible: false }).toEqual({
        ...resting.get(key),
        visible: false,
      });
    expect(revealWorldLabels(resting, [])).toEqual(resting);
  });
});

it('fits more names using measured name-only bounds when two-line labels cannot fit', () => {
  const input = Array.from({ length: 80 }, (_, i) => ({
    ...label(
      `w${i}`,
      38 + Math.floor(i / 10) * 66,
      (38 + (i % 10) * 66 + (Math.floor(i / 10) % 2 ? 33 : 0)) * 1.1,
    ),
    markerRadius: 3.5,
  }));
  const full = placeWorldLabels(input, [], 11);
  const compact = placeWorldLabels(
    input.map((item) => ({ ...item, nameBottom: 4, nameWidth: 60 })),
    [],
    11,
  );
  expect([...compact.values()].filter((p) => p.visible).length).toBeGreaterThan(
    [...full.values()].filter((p) => p.visible).length,
  );
  expect([...compact.values()].some((p) => p.visible && p.compact)).toBe(true);
});
