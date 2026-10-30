import { expect, it } from 'vitest';
import {
  fuelSources,
  jumpFuelTons,
  INITIAL_STATE,
  SHIP,
  createClassicTraveller1981Rules,
} from './index';
import type { Starport, ShipSpecifications } from './index';

it('uses actual distance for the default ship', () => {
  expect(INITIAL_STATE.initialFuelTons).toBe(60);
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

it('validates supported ship specifications and operating state without coercion', () => {
  for (const [key, values] of [
    ['displacementTons', [0, 99, 101, 5001, 100.5, NaN, Infinity]],
    ['jumpRating', [0, 7, 1.5, NaN, Infinity]],
    ['jumpFuelCapacityTons', [0, -1, 201, 0.5, NaN, Infinity]],
    ['hasFuelScoops', [0, 1, 'true', undefined]],
    ['streamlined', [0, 1, 'false', undefined]],
  ] as const)
    for (const value of values)
      expect(() =>
        createClassicTraveller1981Rules(
          { ...SHIP, [key]: value } as ShipSpecifications,
          INITIAL_STATE,
        ),
      ).toThrow();
  for (const initialFuelTons of [-1, 61, 1.5, NaN, Infinity])
    expect(() =>
      createClassicTraveller1981Rules(SHIP, { initialFuelTons }),
    ).toThrow();
  for (const displacementTons of [100, 110, 400, 5000])
    for (const jumpRating of [1, 2, 4, 6]) {
      const rules = createClassicTraveller1981Rules(
        { ...SHIP, displacementTons, jumpRating },
        { initialFuelTons: 1 },
      );
      expect(rules.jumpFuelTons(jumpRating)).toBe(
        (displacementTons / 10) * jumpRating,
      );
      for (const distance of [0, jumpRating + 1, 1.5, NaN, Infinity])
        expect(() => rules.jumpFuelTons(distance)).toThrow();
    }
});
it('requires both streamlining and scoops for giant access, without implying risk protection', () => {
  const system = {
    id: 's',
    name: 'S',
    hex: { column: 1, row: 1 },
    starport: 'X',
    gasGiant: true,
  } as const;
  for (const hasFuelScoops of [false, true])
    for (const streamlined of [false, true]) {
      const rules = createClassicTraveller1981Rules(
        { ...SHIP, hasFuelScoops, streamlined },
        INITIAL_STATE,
      );
      expect(rules.fuelSources(system).length).toBe(
        hasFuelScoops && streamlined ? 1 : 0,
      );
      expect(
        rules.fuelSources({ ...system, starport: 'D' }).at(-1)?.creditsPerTon,
      ).toBe(100);
    }
});
it('snapshots specifications and state at creation', () => {
  const ship = { ...SHIP };
  const state = { initialFuelTons: 7 };
  const rules = createClassicTraveller1981Rules(ship, state);
  ship.displacementTons = 400;
  ship.jumpRating = 1;
  ship.hasFuelScoops = false;
  state.initialFuelTons = 0;
  expect(rules.initialFuelTons).toBe(7);
  expect(rules.jumpFuelTons(3)).toBe(60);
});
