import { expect, it } from 'vitest';
import { createRouter } from './routing';
import type { TravelRules, RouteSystem } from '../rules/types';

const systems = [1, 4, 5].map((row, i) => ({
  id: String(i),
  hex: { column: 1, row },
}));
const rules: TravelRules<RouteSystem> = {
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
it('rejects consumption incompatible with the four-state search', () => {
  expect(() =>
    createRouter(systems, { ...rules, jumpFuelTons: () => 60 }),
  ).toThrow('20/40/60');
});

it('rejects invalid prices that would invalidate shortest-path search', () => {
  for (const creditsPerTon of [-1, NaN, Infinity])
    expect(() =>
      createRouter(systems, {
        ...rules,
        fuelSources: () => [
          { source: 'fixture', grade: 'fixture', creditsPerTon },
        ],
      }),
    ).toThrow('Fuel prices');
});
