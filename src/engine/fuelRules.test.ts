import { expect, it } from 'vitest';
import { fuelSources, jumpFuelTons, SHIP } from './fuelRules';
import type { Starport } from './fuelRules';

it('uses actual distance for the fixed ship', () => {
  expect(SHIP.initialFuelTons).toBe(60);
  expect([1, 2, 3].map(jumpFuelTons)).toEqual([20, 40, 60]);
  for (const value of [0, 4, 1.5, NaN])
    expect(() => jumpFuelTons(value)).toThrow();
});
it.each(['A', 'B', 'C', 'D', 'E', 'X'] as Starport[])(
  'models sources at class %s',
  (starport) => {
    const system = {
      id: 's',
      name: 'S',
      hex: { column: 1, row: 1 },
      starport,
      gasGiant: false,
    };
    const prices = fuelSources(system).map((s) => s.creditsPerTon);
    expect(prices).toEqual(
      'AB'.includes(starport)
        ? [100, 500]
        : 'CD'.includes(starport)
          ? [100]
          : [],
    );
    expect(fuelSources({ ...system, gasGiant: true })[0]).toEqual({
      source: 'gas-giant',
      grade: 'unrefined',
      creditsPerTon: 0,
    });
  },
);
