import { expect, it } from 'vitest';
import { createRouter } from './routing';
import type { TravelRules, RouteSystem } from '../rules/types';

const systems = [1, 4, 5].map((row, i) => ({
  id: String(i),
  hex: { column: 1, row },
}));
const rules: TravelRules<RouteSystem> = {
  maxJumpDistance: 3,
  jumpFuelCapacityTons: 60,
  initialFuelTons: 60,
  validateSystem: () => {},
  jumpFuelTons: (distance) => distance * 20,
  fuelSources: () => [
    { source: 'fixture', grade: 'fixture', creditsPerTon: 7 },
  ],
};
it('uses injected facilities and prices with only ID/hex system data', () => {
  const result = createRouter(systems, rules).findRoute('0', '2');
  expect(result).toMatchObject({ status: 'reachable', totalCostCredits: 140 });
  if (result.status === 'reachable')
    expect(result.events[1]).toMatchObject({
      kind: 'refuel',
      source: 'fixture',
      tons: 20,
    });
  expect(
    createRouter(systems, { ...rules, fuelSources: () => [] }).findRoute(
      '0',
      '2',
    ).status,
  ).toBe('unreachable');
});
it('accepts independent variable consumption, capacity, range, and initial fuel', () => {
  const result = createRouter(systems, {
    ...rules,
    maxJumpDistance: 4,
    jumpFuelCapacityTons: 19,
    initialFuelTons: 1,
    jumpFuelTons: (distance) => distance * 3,
  }).findRoute('0', '2');
  expect(result).toMatchObject({
    status: 'reachable',
    totalCostCredits: 77,
    jumpCount: 1,
  });
});
it('rejects unsupported fuel quantities and excessive state spaces', () => {
  for (const jumpFuelTons of [
    () => 0,
    () => -1,
    () => 1.5,
    () => NaN,
    () => Infinity,
  ])
    expect(() => createRouter(systems, { ...rules, jumpFuelTons })).toThrow(
      'Jump consumption',
    );
  expect(() =>
    createRouter(systems, {
      ...rules,
      jumpFuelCapacityTons: 1000,
      jumpFuelTons: () => 1,
    }),
  ).toThrow('64 critical levels');
  for (const [key, values] of [
    ['maxJumpDistance', [0, 17, 1.5, NaN, Infinity]],
    ['jumpFuelCapacityTons', [0, 1.5, NaN, Infinity, 1_000_001]],
    ['initialFuelTons', [-1, 61, 1.5, NaN, Infinity]],
  ] as const)
    for (const value of values)
      expect(() => createRouter(systems, { ...rules, [key]: value })).toThrow();
});

it('rejects invalid prices that would invalidate shortest-path search', () => {
  for (const creditsPerTon of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER])
    expect(() =>
      createRouter(systems, {
        ...rules,
        fuelSources: () => [
          { source: 'fixture', grade: 'fixture', creditsPerTon },
        ],
      }),
    ).toThrow('Fuel prices');
});

it('snapshots rule capabilities, consumption, and source records', () => {
  const source = { source: 'fixture', grade: 'fixture', creditsPerTon: 7 };
  const mutable = { ...rules, fuelSources: () => [source] };
  const router = createRouter(systems, mutable);
  const expected = router.findRoute('0', '2');
  mutable.initialFuelTons = 0;
  mutable.maxJumpDistance = 1;
  mutable.jumpFuelTons = () => 999;
  source.creditsPerTon = 999;
  expect(router.findRoute('0', '2')).toEqual(expected);
});
