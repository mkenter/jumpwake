/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, expect, it } from 'vitest';
import { createRouter as createEngineRouter } from './routing';
import {
  classicTraveller1981,
  createClassicTraveller1981Rules,
  SHIP,
  INITIAL_STATE,
} from '../rules/classicTraveller1981';
const createRouter = (systems: readonly StarSystem[]) =>
  createEngineRouter(systems, classicTraveller1981);
import type { RouteResult, RoutingPreference } from './routing';

const preferences: readonly RoutingPreference[] = [
  'lowest-fuel-cost',
  'fewest-jumps',
];
import type {
  StarSystem,
  Starport,
  ShipSpecifications,
  ShipOperatingState,
} from '../rules/classicTraveller1981';
import { displayDistance } from './geometry.test-support';
import { EMBER_REACH } from '../data/emberReach';

function system(
  id: string,
  row: number,
  starport: Starport = 'X',
  gasGiant = false,
  column = 1,
): StarSystem {
  return { id, name: id, hex: { column, row }, starport, gasGiant };
}
function reached(result: RouteResult) {
  if (result.status !== 'reachable')
    throw new Error('Expected reachable route');
  return result;
}
function stops(result: RouteResult) {
  return reached(result)
    .events.filter((e) => e.kind === 'jump')
    .map((e) => e.toId);
}

describe('fuel-aware routes', () => {
  it('handles same-system, range, unknown IDs, and fuel exhaustion', () => {
    const router = createRouter([
      system('a', 1),
      system('b', 4),
      system('c', 5),
    ]);
    expect(reached(router.findRoute('a', 'a'))).toMatchObject({
      events: [],
      totalCostCredits: 0,
      fuelRemainingTons: 60,
    });
    expect(reached(router.findRoute('a', 'b'))).toMatchObject({
      jumpCount: 1,
      totalDistance: 3,
      fuelRemainingTons: 0,
    });
    expect(router.findRoute('a', 'c').status).toBe('unreachable');
    expect(() => router.findRoute('missing', 'a')).toThrow('Unknown');
    expect(createRouter([])).toBeDefined();
  });
  it('buys only needed fuel and reports the ordered ledger', () => {
    const result = reached(
      createRouter([
        system('a', 1),
        system('b', 4, 'D'),
        system('c', 6),
      ]).findRoute('a', 'c'),
    );
    expect(result).toMatchObject({
      totalCostCredits: 4000,
      jumpCount: 2,
      totalDistance: 5,
      fuelRemainingTons: 0,
    });
    expect(result.events).toEqual([
      {
        kind: 'jump',
        fromId: 'a',
        toId: 'b',
        distance: 3,
        fuelConsumedTons: 60,
        fuelBeforeTons: 60,
        fuelAfterTons: 0,
      },
      {
        kind: 'refuel',
        systemId: 'b',
        source: 'starport',
        grade: 'unrefined',
        creditsPerTon: 100,
        tons: 40,
        costCredits: 4000,
        fuelBeforeTons: 0,
        fuelAfterTons: 40,
      },
      {
        kind: 'jump',
        fromId: 'b',
        toId: 'c',
        distance: 2,
        fuelConsumedTons: 40,
        fuelBeforeTons: 40,
        fuelAfterTons: 0,
      },
    ]);
  });
  it('retains partial tanks, skips unnecessary dry stops, and prefers scooping', () => {
    const result = reached(
      createRouter([
        system('a', 1),
        system('b', 4, 'A', true),
        system('c', 6),
        system('d', 7),
      ]).findRoute('a', 'd'),
    );
    expect(result.totalCostCredits).toBe(0);
    expect(result.events.find((e) => e.kind === 'refuel')).toMatchObject({
      source: 'gas-giant',
      tons: 60,
    });
    const dry = reached(
      createRouter([
        system('a', 1),
        system('b', 3, 'C'),
        system('c', 5),
        system('d', 6),
      ]).findRoute('a', 'd'),
    );
    expect(dry.totalCostCredits).toBe(4000);
    expect(stops(dry)).toEqual(['b', 'd']);
  });
  it('takes additional jumps to avoid fuel purchases', () => {
    const systems = [
      system('a', 1),
      system('b', 4, 'C'),
      system('c', 7),
      system('d', 2, 'X', true, 2),
      system('e', 5, 'X', true, 2),
    ];
    const result = reached(createRouter(systems).findRoute('a', 'c'));
    expect(result.totalCostCredits).toBe(0);
    expect(result.jumpCount).toBe(3);
    expect(stops(result)).toEqual(['d', 'e', 'c']);
    expect(
      reached(createRouter(systems.slice(0, 3)).findRoute('a', 'c')),
    ).toMatchObject({ totalCostCredits: 6000, jumpCount: 2 });
  });
  it('breaks ties by jumps, distance, then stable IDs and departure fuel', () => {
    expect(
      stops(
        createRouter([
          system('a', 1),
          system('b', 2),
          system('c', 3),
        ]).findRoute('a', 'c'),
      ),
    ).toEqual(['c']);
    const systems = [
      system('start', 1),
      system('z-short', 3, 'X', true),
      system('a-long', 3, 'X', true, 2),
      system('end', 5),
    ];
    expect(stops(createRouter(systems).findRoute('start', 'end'))).toEqual([
      'z-short',
      'end',
    ]);
    const tied = [
      system('s', 1),
      system('a', 3, 'X', true),
      system('b', 4, 'X', true),
      system('t', 6),
    ];
    expect(stops(createRouter(tied).findRoute('s', 't'))).toEqual(['a', 't']);
    expect(createRouter(tied.toReversed()).findRoute('s', 't')).toEqual(
      createRouter(tied).findRoute('s', 't'),
    );
  });
  it('validates inputs and snapshots them for independent repeated queries', () => {
    expect(() => createRouter([system('a', 1), system('a', 2)])).toThrow();
    expect(() => createRouter([system('a', 1), system('b', 1)])).toThrow();
    const input = [system('a', 1), system('b', 3)];
    const router = createRouter(input);
    const expected = router.findRoute('a', 'b');
    input.splice(0);
    for (let i = 0; i < 100; i++) {
      router.findRoute('b', 'a');
      expect(router.findRoute('a', 'b')).toEqual(expected);
    }
  });
  it('supports the authored fixture and an isolated destination', () => {
    const router = createRouter(EMBER_REACH);
    expect(reached(router.findRoute('aster', 'cinder'))).toMatchObject({
      totalCostCredits: 0,
      jumpCount: 3,
    });
    expect(router.findRoute('aster', 'last').status).toBe('unreachable');
  });
});

// Independent Bellman–Ford oracle on tiny display-grid networks. Uses 1-ton
// refuel edges rather than the production combined refuel/jump transitions.
interface ReferenceLabel {
  score: [number, number, number];
  key: [string, number][];
}
function referenceDetailed(
  systems: readonly StarSystem[],
  start: number,
  end: number,
  ship: ShipSpecifications = SHIP,
  state: ShipOperatingState = INITIAL_STATE,
  preference: RoutingPreference = 'lowest-fuel-cost',
) {
  const capacity = ship.jumpFuelCapacityTons;
  const width = capacity + 1;
  const labels: (ReferenceLabel | undefined)[] = Array.from({
    length: systems.length * width,
  });
  labels[start * width + state.initialFuelTons] = { score: [0, 0, 0], key: [] };
  // Keep cost/jumps/distance as factual totals; rank them independently.
  const order = preference === 'fewest-jumps' ? [1, 0, 2] : [0, 1, 2];
  const distances = systems.map((a) =>
    systems.map((b) => displayDistance(a.hex, b.hex)),
  );
  const less = (a: ReferenceLabel, b: ReferenceLabel) => {
    for (const i of order) {
      if (a.score[i] !== b.score[i]) return a.score[i]! < b.score[i]!;
    }
    for (let i = 0; i < a.key.length; i++) {
      const [aid, afuel] = a.key[i]!;
      const [bid, bfuel] = b.key[i]!;
      if (aid !== bid) return aid < bid;
      if (afuel !== bfuel) return afuel < bfuel;
    }
    return false;
  };
  // Independent one-ton refueling edges, geometry, CT arithmetic, and string keys.
  // No production rules, critical levels, heap, or combined transitions are used.
  for (let pass = 0; pass < labels.length; pass++) {
    let changed = false;
    const relax = (to: number, candidate: ReferenceLabel) => {
      if (!labels[to] || less(candidate, labels[to]!)) {
        labels[to] = candidate;
        changed = true;
      }
    };
    for (let i = 0; i < systems.length; i++)
      for (let fuel = 0; fuel <= capacity; fuel++) {
        const label = labels[i * width + fuel];
        if (!label || i === end) continue;
        const s = systems[i]!;
        const free = s.gasGiant && ship.hasFuelScoops && ship.streamlined;
        if (fuel < capacity && (free || 'ABCD'.includes(s.starport)))
          relax(i * width + fuel + 1, {
            score: [
              label.score[0] + (free ? 0 : 100),
              label.score[1],
              label.score[2],
            ],
            key: label.key,
          });
        for (let j = 0; j < systems.length; j++) {
          const distance = distances[i]![j]!;
          const needed = (ship.displacementTons / 10) * distance;
          if (distance >= 1 && distance <= ship.jumpRating && fuel >= needed)
            relax(j * width + fuel - needed, {
              score: [
                label.score[0],
                label.score[1] + 1,
                label.score[2] + distance,
              ],
              key: [...label.key, [systems[j]!.id, fuel]],
            });
        }
      }
    if (!changed) break;
    if (pass === labels.length - 1) throw new Error('Oracle did not converge');
  }
  return labels
    .slice(end * width, (end + 1) * width)
    .filter((x): x is ReferenceLabel => !!x)
    .sort((a, b) => (less(a, b) ? -1 : less(b, a) ? 1 : 0))[0];
}
function reference(systems: readonly StarSystem[], start: number, end: number) {
  return referenceDetailed(systems, start, end)?.score;
}

it.each(preferences)(
  'matches independent fuel assignments and endpoint pairs (%s)',
  (preference) => {
    for (let mask = 0; mask < 81; mask++) {
      let value = mask;
      const systems = [1, 3, 5, 7].map((row, i) => {
        const facility = value % 3;
        value = Math.floor(value / 3);
        return system(
          String(i),
          row,
          facility === 1 ? 'C' : 'X',
          facility === 2,
        );
      });
      const router = createRouter(systems);
      for (let start = 0; start < 4; start++)
        for (let end = 0; end < 4; end++) {
          const expected = referenceDetailed(
            systems,
            start,
            end,
            SHIP,
            INITIAL_STATE,
            preference,
          );
          const result = router.findRoute(
            String(start),
            String(end),
            preference,
          );
          expect(result.status).toBe(expected ? 'reachable' : 'unreachable');
          if (result.status === 'reachable') {
            expect([
              result.totalCostCredits,
              result.jumpCount,
              result.totalDistance,
            ]).toEqual(expected!.score);
            expect(
              result.events
                .filter((e) => e.kind === 'jump')
                .map((e) => [e.toId, e.fuelBeforeTons]),
            ).toEqual(expected!.key);
            expectBalanced(systems, result);
          }
        }
    }
  },
);

function expectBalanced(
  systems: readonly StarSystem[],
  result: RouteResult,
  ship: ShipSpecifications = SHIP,
  state: ShipOperatingState = INITIAL_STATE,
) {
  if (result.status !== 'reachable') return;
  const byId = new Map(systems.map((s) => [s.id, s]));
  let fuel = state.initialFuelTons;
  let location = result.originId;
  let cost = 0;
  let distance = 0;
  let jumps = 0;
  for (const [i, event] of result.events.entries()) {
    assert.notEqual(location, result.destinationId);
    assert.equal(event.fuelBeforeTons, fuel);
    if (event.kind === 'refuel') {
      const stop = byId.get(location)!;
      assert.equal(event.systemId, location);
      assert.ok(event.tons > 0);
      assert.equal(event.grade, 'unrefined');
      const free = stop.gasGiant && ship.hasFuelScoops && ship.streamlined;
      assert.equal(event.source, free ? 'gas-giant' : 'starport');
      assert.equal(free || 'ABCD'.includes(stop.starport), true);
      assert.equal(event.creditsPerTon, free ? 0 : 100);
      assert.equal(event.costCredits, event.tons * event.creditsPerTon);
      assert.equal(result.events[i + 1]?.kind, 'jump');
      fuel += event.tons;
      cost += event.costCredits;
    } else {
      assert.equal(event.fromId, location);
      assert.equal(
        event.distance,
        displayDistance(byId.get(location)!.hex, byId.get(event.toId)!.hex),
      );
      assert.ok(event.distance >= 1);
      assert.ok(event.distance <= ship.jumpRating);
      assert.equal(
        event.fuelConsumedTons,
        event.distance * (ship.displacementTons / 10),
      );
      location = event.toId;
      fuel -= event.fuelConsumedTons;
      distance += event.distance;
      jumps++;
    }
    assert.equal(event.fuelAfterTons, fuel);
    assert.ok(fuel >= 0);
    assert.ok(fuel <= ship.jumpFuelCapacityTons);
  }
  assert.equal(location, result.destinationId);
  assert.deepEqual(
    [cost, jumps, distance, fuel],
    [
      result.totalCostCredits,
      result.jumpCount,
      result.totalDistance,
      result.fuelRemainingTons,
    ],
  );
}

it('keeps every fixture itinerary balanced without redundant refueling', () => {
  const router = createRouter(EMBER_REACH);
  for (const origin of EMBER_REACH)
    for (const destination of EMBER_REACH)
      expectBalanced(EMBER_REACH, router.findRoute(origin.id, destination.id));
});

it('handles repeated queries across a full 80-system subsector', () => {
  const systems = Array.from({ length: 80 }, (_, i) =>
    system(
      String(i).padStart(2, '0'),
      (i % 10) + 1,
      'C',
      i % 3 === 0,
      Math.floor(i / 10) + 1,
    ),
  );
  const router = createRouter(systems);
  for (let i = 0; i < 80; i++) {
    const id = systems[i]!.id;
    expect(router.findRoute('00', id).status).toBe('reachable');
  }
});

it('revisits a port with more fuel after a scooping detour to reduce purchases', () => {
  const systems = [
    system('s', 5),
    system('b', 5, 'D', false, 4),
    system('g', 6, 'X', true, 5),
    system('t', 2, 'X', false, 4),
  ];
  const result = reached(createRouter(systems).findRoute('s', 't'));
  expect(stops(result)).toEqual(['b', 'g', 'b', 't']);
  expect(result).toMatchObject({
    totalCostCredits: 4000,
    jumpCount: 4,
    totalDistance: 8,
    fuelRemainingTons: 0,
  });
  expect(
    result.events
      .filter((e) => e.kind === 'refuel')
      .map((e) => [e.systemId, e.tons, e.fuelBeforeTons, e.costCredits]),
  ).toEqual([
    ['b', 20, 0, 2000],
    ['g', 60, 0, 0],
    ['b', 20, 40, 2000],
  ]);
  expectBalanced(systems, result);
  expect(reference(systems, 0, 3)).toEqual([4000, 4, 8]);
});

it.each([
  [
    [1, 1],
    [2, 3],
    [4, 2],
    [5, 5],
  ],
  [
    [5, 6],
    [6, 8],
    [8, 7],
    [8, 10],
  ],
])(
  'matches the ton-resolution oracle on multidimensional networks: %j',
  (a, b, c, d) => {
    const hexes = [a, b, c, d];
    for (const preference of preferences)
      for (let mask = 0; mask < 81; mask++) {
        let value = mask;
        const systems = hexes.map(([column, row], i) => {
          const facility = value % 3;
          value = Math.floor(value / 3);
          const starport =
            facility === 0
              ? i % 2
                ? 'E'
                : 'X'
              : (['A', 'B', 'C', 'D'] as const)[i]!;
          return system(String(i), row!, starport, facility === 2, column!);
        });
        const router = createRouter(systems);
        const reversed = createRouter(systems.toReversed());
        for (let start = 0; start < 4; start++)
          for (let end = 0; end < 4; end++) {
            const expected = referenceDetailed(
              systems,
              start,
              end,
              SHIP,
              INITIAL_STATE,
              preference,
            );
            const result = router.findRoute(
              String(start),
              String(end),
              preference,
            );
            expect(result.status).toBe(expected ? 'reachable' : 'unreachable');
            if (result.status === 'reachable') {
              expect([
                result.totalCostCredits,
                result.jumpCount,
                result.totalDistance,
              ]).toEqual(expected!.score);
              expect(
                result.events
                  .filter((e) => e.kind === 'jump')
                  .map((e) => [e.toId, e.fuelBeforeTons]),
              ).toEqual(expected!.key);
              expectBalanced(systems, result);
            }
            expect(
              reversed.findRoute(String(start), String(end), preference),
            ).toEqual(result);
          }
      }
  },
);

it('breaks equal-cost purchase allocations by the earliest departure fuel', () => {
  const systems = [
    system('s', 1),
    system('p', 4, 'B'),
    system('q', 5, 'C'),
    system('t', 8),
  ];
  const result = reached(createRouter(systems).findRoute('s', 't'));
  expect(stops(result)).toEqual(['p', 'q', 't']);
  // Buying 20, 40, or 60 tons at p has the same final cost; prefer 20.
  expect(
    result.events
      .filter((e) => e.kind === 'refuel')
      .map((e) => [e.systemId, e.tons]),
  ).toEqual([
    ['p', 20],
    ['q', 60],
  ]);
  expect(result.totalCostCredits).toBe(8000);
  expectBalanced(systems, result);
});

it('uses code-unit ID order and the smallest sufficient free departure tank', () => {
  const systems = [
    system('s', 1),
    system('Z', 3, 'E', true),
    system('a', 4, 'X', true),
    system('t', 5, 'A', true),
  ];
  for (const input of [
    systems,
    systems.toReversed(),
    [...systems.slice(2), ...systems.slice(0, 2)],
  ]) {
    const result = reached(createRouter(input).findRoute('s', 't'));
    expect(stops(result)).toEqual(['Z', 't']);
    expect(result.events.filter((e) => e.kind === 'refuel')).toMatchObject([
      {
        systemId: 'Z',
        tons: 20,
        fuelBeforeTons: 20,
        fuelAfterTons: 40,
        costCredits: 0,
      },
    ]);
    expect(result.fuelRemainingTons).toBe(0);
    expectBalanced(systems, result);
  }
});

it('exhausts reachable free-scooping cycles when the destination is isolated', () => {
  const systems = [
    system('s', 1, 'X', true),
    system('a', 2, 'X', true),
    system('b', 1, 'X', true, 2),
    system('t', 10, 'X', true, 8),
  ];
  expect(createRouter(systems).findRoute('s', 't')).toEqual({
    status: 'unreachable',
    originId: 's',
    destinationId: 't',
    failedLeg: 0,
  });
});

function configured(
  systems: readonly StarSystem[],
  ship: ShipSpecifications,
  initialFuelTons: number,
) {
  return createEngineRouter(
    systems,
    createClassicTraveller1981Rules(ship, { initialFuelTons }),
  );
}

it('honors drive rating, displacement, and ship-specific reachability', () => {
  const systems = [1, 2, 3, 4, 5].map((row) => system(String(row), row, 'C'));
  for (const [displacementTons, jumpRating, jumpCount] of [
    [100, 1, 4],
    [100, 2, 2],
    [400, 4, 1],
  ]) {
    const ship = {
      ...SHIP,
      displacementTons: displacementTons!,
      jumpRating: jumpRating!,
      jumpFuelCapacityTons: (displacementTons! * jumpRating!) / 10,
    };
    const result = configured(
      systems,
      ship,
      ship.jumpFuelCapacityTons,
    ).findRoute('1', '5');
    expect(result).toMatchObject({
      status: 'reachable',
      jumpCount,
      totalDistance: 4,
    });
    expectBalanced(systems, result, ship, {
      initialFuelTons: ship.jumpFuelCapacityTons,
    });
  }
  const separated = [system('a', 1), system('b', 3)];
  const ship = {
    ...SHIP,
    displacementTons: 100,
    jumpRating: 1,
    jumpFuelCapacityTons: 20,
  };
  expect(configured(separated, ship, 20).findRoute('a', 'b').status).toBe(
    'unreachable',
  );
  expect(
    configured(separated, { ...ship, jumpRating: 2 }, 20).findRoute('a', 'b')
      .status,
  ).toBe('reachable');
});

it('requires fuel for the first jump, buying or scooping precisely the shortfall', () => {
  const ship = {
    ...SHIP,
    displacementTons: 100,
    jumpRating: 2,
    jumpFuelCapacityTons: 27,
  };
  for (const [port, gasGiant, hasFuelScoops, cost] of [
    ['X', false, true, undefined],
    ['C', false, true, 1700],
    ['X', true, true, 0],
    ['X', true, false, undefined],
    ['D', true, false, 1700],
  ] as const) {
    const systems = [system('a', 1, port, gasGiant), system('b', 3)];
    const particulars = { ...ship, hasFuelScoops };
    const result = configured(systems, particulars, 3).findRoute('a', 'b');
    if (cost === undefined) expect(result.status).toBe('unreachable');
    else {
      expect(reached(result)).toMatchObject({
        totalCostCredits: cost,
        fuelRemainingTons: 0,
      });
      expect(reached(result).events[0]).toMatchObject({
        kind: 'refuel',
        tons: 17,
        fuelBeforeTons: 3,
        fuelAfterTons: 20,
      });
      expectBalanced(systems, result, particulars, { initialFuelTons: 3 });
    }
  }
});

it('carries purchased fuel across a dry system when capacity permits', () => {
  const systems = [system('a', 1, 'C'), system('b', 3), system('c', 5)];
  const ship = {
    ...SHIP,
    displacementTons: 100,
    jumpRating: 2,
    jumpFuelCapacityTons: 40,
  };
  const result = configured(systems, ship, 0).findRoute('a', 'c');
  expect(stops(result)).toEqual(['b', 'c']);
  expect(reached(result)).toMatchObject({
    totalCostCredits: 4000,
    fuelRemainingTons: 0,
  });
  expect(reached(result).events[0]).toMatchObject({ kind: 'refuel', tons: 40 });
  expectBalanced(systems, result, ship, { initialFuelTons: 0 });
  expect(
    configured(systems, { ...ship, jumpFuelCapacityTons: 39 }, 0).findRoute(
      'a',
      'c',
    ).status,
  ).toBe('unreachable');
});

it('preserves residual initial fuel and full-tank residues without rounding', () => {
  const systems = [system('a', 1, 'X', true), system('b', 3), system('c', 5)];
  const ship = {
    ...SHIP,
    displacementTons: 100,
    jumpRating: 2,
    jumpFuelCapacityTons: 43,
  };
  const result = configured(systems, ship, 43).findRoute('a', 'c');
  expect(reached(result)).toMatchObject({
    totalCostCredits: 0,
    fuelRemainingTons: 3,
  });
  expect(reached(result).events.filter((e) => e.kind === 'refuel')).toEqual([]);
  expectBalanced(systems, result, ship, { initialFuelTons: 43 });
  expect(
    reached(configured(systems, ship, 7).findRoute('b', 'b')),
  ).toMatchObject({
    events: [],
    fuelRemainingTons: 7,
    totalCostCredits: 0,
  });
});

it('revisits systems to collect fuel with a different displacement and partial starting tank', () => {
  const systems = [
    system('s', 5, 'C'),
    system('b', 5, 'D', false, 4),
    system('g', 6, 'X', true, 5),
    system('t', 2, 'X', false, 4),
  ];
  const ship = { ...SHIP, displacementTons: 400, jumpFuelCapacityTons: 120 };
  const result = configured(systems, ship, 113).findRoute('s', 't');
  expect(stops(result)).toEqual(['b', 'g', 'b', 't']);
  expect(reached(result)).toMatchObject({
    totalCostCredits: 8700,
    jumpCount: 4,
    totalDistance: 8,
  });
  expect(
    referenceDetailed(systems, 0, 3, ship, { initialFuelTons: 113 })?.score,
  ).toEqual([8700, 4, 8]);
  expectBalanced(systems, result, ship, { initialFuelTons: 113 });
});

it.each(preferences)(
  'matches independent one-ton scores, keys and ledgers for variable ships (%s)',
  (preference) => {
    const configurations = [
      [100, 1, 17, 4, false, true],
      [100, 2, 27, 13, true, true],
      [110, 2, 31, 7, true, true],
      [100, 2, 40, 0, true, true],
      [200, 3, 63, 7, true, true],
      [400, 4, 173, 31, true, true],
      [400, 2, 87, 83, true, false],
      [400, 4, 40, 0, true, true],
      [200, 3, 60, 60, true, true],
    ] as const;
    for (const [
      displacementTons,
      jumpRating,
      jumpFuelCapacityTons,
      initialFuelTons,
      hasFuelScoops,
      streamlined,
    ] of configurations) {
      const ship = {
        displacementTons,
        jumpRating,
        jumpFuelCapacityTons,
        hasFuelScoops,
        streamlined,
      };
      const state = { initialFuelTons };
      for (const hexes of [
        [
          [1, 1],
          [1, 2],
          [1, 4],
          [1, 6],
        ],
        [
          [2, 2],
          [3, 3],
          [4, 2],
          [4, 5],
        ],
      ]) {
        for (let mask = 0; mask < 81; mask++) {
          let value = mask;
          const systems = hexes.map(([column, row], i) => {
            const facility = value % 3;
            value = Math.floor(value / 3);
            return system(
              ['s', 'Z', 'a', 't'][i]!,
              row!,
              facility === 1 ? (['A', 'B', 'C', 'D'] as const)[i]! : 'X',
              facility === 2,
              column!,
            );
          });
          const router = configured(systems, ship, initialFuelTons);
          const reversed = configured(
            systems.toReversed(),
            ship,
            initialFuelTons,
          );
          for (let start = 0; start < 4; start++)
            for (let end = 0; end < 4; end++) {
              const expected = referenceDetailed(
                systems,
                start,
                end,
                ship,
                state,
                preference,
              );
              const result = router.findRoute(
                systems[start]!.id,
                systems[end]!.id,
                preference,
              );
              expect(result.status).toBe(
                expected ? 'reachable' : 'unreachable',
              );
              if (result.status === 'reachable') {
                expect([
                  result.totalCostCredits,
                  result.jumpCount,
                  result.totalDistance,
                ]).toEqual(expected!.score);
                expect(
                  result.events
                    .filter((e) => e.kind === 'jump')
                    .map((e) => [e.toId, e.fuelBeforeTons]),
                ).toEqual(expected!.key);
                expectBalanced(systems, result, ship, state);
              }
              expect(
                reversed.findRoute(
                  systems[start]!.id,
                  systems[end]!.id,
                  preference,
                ),
              ).toEqual(result);
            }
        }
      }
    }
  },
  // This exhaustive case has previously exceeded Vitest’s default timeout in CI.
  15000,
);

it('handles large hulls and nonaligned fuel on a full 80-system subsector', () => {
  const systems = Array.from({ length: 80 }, (_, i) =>
    system(
      String(i).padStart(2, '0'),
      (i % 10) + 1,
      'C',
      i % 3 === 0,
      Math.floor(i / 10) + 1,
    ),
  );
  const ship = {
    ...SHIP,
    displacementTons: 5000,
    jumpRating: 6,
    jumpFuelCapacityTons: 4999,
  };
  const router = configured(systems, ship, 47);
  for (const destination of ['00', '09', '39', '79']) {
    const result = router.findRoute('00', destination);
    expect(result.status).toBe('reachable');
    expectBalanced(systems, result, ship, { initialFuelTons: 47 });
  }
});

it('preserves all 225 complete default Ember Reach results from main at 590c6c6', async () => {
  const router = createRouter(EMBER_REACH);
  const routes = EMBER_REACH.flatMap((a) =>
    EMBER_REACH.map((b) => {
      const route = router.findRoute(a.id, b.id);
      if (route.status === 'reachable') return route;
      const { status, originId, destinationId } = route;
      return { status, originId, destinationId };
    }),
  );
  // Fingerprint includes every chronological event, transaction and fuel balance.
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify(routes)),
  );
  expect(
    Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join(''),
  ).toBe('503412741f7ebd38e49f7e2a5966ba6a0eccf207bde3309d791b0e267bd93725');
});

it('matches both independent orders for all 225 Ember Reach pairs with interleaved queries', () => {
  const router = createRouter(EMBER_REACH);
  const reversed = createRouter(EMBER_REACH.toReversed());
  for (const [start, origin] of EMBER_REACH.entries())
    for (const [end, destination] of EMBER_REACH.entries()) {
      const defaultResult = router.findRoute(origin.id, destination.id);
      for (const preference of preferences) {
        const expected = referenceDetailed(
          EMBER_REACH,
          start,
          end,
          SHIP,
          INITIAL_STATE,
          preference,
        );
        const result = router.findRoute(origin.id, destination.id, preference);
        expect(result.status).toBe(expected ? 'reachable' : 'unreachable');
        if (result.status === 'reachable') {
          expect([
            result.totalCostCredits,
            result.jumpCount,
            result.totalDistance,
          ]).toEqual(expected!.score);
          expect(
            result.events
              .filter((e) => e.kind === 'jump')
              .map((e) => [e.toId, e.fuelBeforeTons]),
          ).toEqual(expected!.key);
          expectBalanced(EMBER_REACH, result);
        }
        expect(
          reversed.findRoute(origin.id, destination.id, preference),
        ).toEqual(result);
      }
      expect(router.findRoute(origin.id, destination.id)).toEqual(
        defaultResult,
      );
    }
});

it('quotes the Aster Quay to Cinder Rest trade-off without changing travel rules', () => {
  const router = createRouter(EMBER_REACH);
  const economical = router.findRoute('aster', 'cinder', 'lowest-fuel-cost');
  const fewer = router.findRoute('aster', 'cinder', 'fewest-jumps');
  expect(economical).toMatchObject({
    totalCostCredits: 0,
    jumpCount: 3,
    totalDistance: 7,
  });
  expect(stops(economical)).toEqual(['drift', 'echo', 'cinder']);
  expect(fewer).toMatchObject({
    totalCostCredits: 6000,
    jumpCount: 2,
    totalDistance: 6,
  });
  expect(stops(fewer)).toEqual(['brass', 'cinder']);
  expectBalanced(EMBER_REACH, fewer);
  expect(router.findRoute('aster', 'cinder')).toEqual(economical);
  expect(router.findRoute('aster', 'drift', 'fewest-jumps')).toEqual(
    router.findRoute('aster', 'drift'),
  );
});

it.each(preferences)(
  'keeps distance, code-unit IDs and departure fuel as subsequent ties (%s)',
  (preference) => {
    const distanceTied = [
      system('start', 1),
      system('z-short', 3, 'X', true),
      system('a-long', 3, 'X', true, 2),
      system('end', 5),
    ];
    expect(
      stops(createRouter(distanceTied).findRoute('start', 'end', preference)),
    ).toEqual(['z-short', 'end']);
    const systems = [
      system('s', 1),
      system('Z', 3, 'E', true),
      system('a', 4, 'X', true),
      system('t', 5),
    ];
    const result = reached(
      createRouter(systems).findRoute('s', 't', preference),
    );
    expect(stops(result)).toEqual(['Z', 't']);
    expect(result.events.find((e) => e.kind === 'refuel')).toMatchObject({
      systemId: 'Z',
      fuelBeforeTons: 20,
      fuelAfterTons: 40,
      tons: 20,
    });
  },
);

it('breaks a fewest-jumps tie by purchased credits before distance and itinerary IDs', () => {
  const systems = [
    system('s', 1),
    system('a-paid', 4, 'C'),
    system('z-free', 3, 'X', true, 2),
    system('t', 6),
  ];
  const result = createRouter(systems).findRoute('s', 't', 'fewest-jumps');
  expect(stops(result)).toEqual(['z-free', 't']);
  expect(result).toMatchObject({
    totalCostCredits: 0,
    jumpCount: 2,
    totalDistance: 6,
  });
  expect(
    referenceDetailed(systems, 0, 3, SHIP, INITIAL_STATE, 'fewest-jumps')
      ?.score,
  ).toEqual([0, 2, 6]);
  expectBalanced(systems, result);
});

describe('ordered itineraries', () => {
  it('locates a final isolated destination after 30 waypoints on a 77-world chart', () => {
    const systems = Array.from({ length: 80 }, (_, i) =>
      system(`s${i}`, (i % 10) + 1, 'A', true, Math.floor(i / 10) + 1),
    ).filter(({ id }) => !['s68', 's69', 's78'].includes(id));
    const router = configured(
      systems,
      {
        ...SHIP,
        displacementTons: 100,
        jumpRating: 1,
        jumpFuelCapacityTons: 99,
      },
      99,
    );
    const waypoints = Array.from({ length: 30 }, (_, i) =>
      i % 2 ? 's1' : 's0',
    );
    for (const preference of preferences) {
      expect(
        router.findRoute('s0', 's79', preference, waypoints),
      ).toMatchObject({ status: 'unreachable', failedLeg: 30 });
    }
  });
  it('reports the furthest feasible stage for fuel, geometry and duplicate direct legs', () => {
    const router = createRouter([
      system('a', 1),
      system('b', 3),
      system('c', 5),
      system('d', 10, 'X', false, 8),
    ]);
    expect(
      router.findRoute('a', 'c', 'fewest-jumps', ['b'], 'direct'),
    ).toMatchObject({ status: 'unreachable', failedLeg: 1 });
    expect(router.findRoute('a', 'd', 'fewest-jumps', ['b'])).toMatchObject({
      status: 'unreachable',
      failedLeg: 1,
    });
    expect(
      router.findRoute('a', 'c', 'fewest-jumps', ['a'], 'direct'),
    ).toMatchObject({ status: 'unreachable', failedLeg: 0 });
    expect(
      router.findRoute('a', 'c', 'fewest-jumps', ['b', 'b'], 'direct'),
    ).toMatchObject({ status: 'unreachable', failedLeg: 1 });
  });
  it.each(preferences)(
    'satisfies consecutive occupied waypoints without extra jumps (%s)',
    (preference) => {
      const router = createRouter([system('a', 1), system('b', 2)]);
      const baseline = router.findRoute('a', 'b', preference);
      expect(
        router.findRoute('a', 'b', preference, ['a', 'a', 'b', 'b']),
      ).toEqual(baseline);
      expect(
        reached(router.findRoute('a', 'a', preference, ['a'])).jumpCount,
      ).toBe(0);
      expect(stops(router.findRoute('a', 'a', preference, ['b']))).toEqual([
        'b',
        'a',
      ]);
      expect(
        router.findRoute('a', 'b', preference, ['a'], 'direct').status,
      ).toBe('unreachable');
      expect(
        router.findRoute('a', 'b', preference, ['b'], 'direct').status,
      ).toBe('unreachable');
    },
  );
  it('buys fuel before a waypoint when a later leg needs it', () => {
    const rules = createClassicTraveller1981Rules(
      {
        displacementTons: 200,
        jumpRating: 1,
        jumpFuelCapacityTons: 40,
        hasFuelScoops: false,
        streamlined: true,
      },
      { initialFuelTons: 0 },
    );
    const router = createEngineRouter(
      [system('a', 1, 'D'), system('b', 2), system('c', 3)],
      rules,
    );
    const route = reached(
      router.findRoute('a', 'c', 'lowest-fuel-cost', ['b']),
    );
    expect(route.events[0]).toMatchObject({
      kind: 'refuel',
      systemId: 'a',
      tons: 40,
    });
    expect(route.fuelRemainingTons).toBe(0);
  });
  it('carries yacht fuel through successive jumps and supports revisits', () => {
    // CT81 Book 2 p.19: yacht tankage supports two J1 jumps.
    const rules = createClassicTraveller1981Rules(
      {
        displacementTons: 200,
        jumpRating: 1,
        jumpFuelCapacityTons: 40,
        hasFuelScoops: false,
        streamlined: true,
      },
      { initialFuelTons: 40 },
    );
    const router = createEngineRouter(
      [system('a', 1), system('b', 2), system('c', 3)],
      rules,
    );
    const route = reached(
      router.findRoute('a', 'c', 'fewest-jumps', ['b'], 'direct'),
    );
    expect(
      route.events.map(
        (event) =>
          event.kind === 'jump' && [event.fuelBeforeTons, event.fuelAfterTons],
      ),
    ).toEqual([
      [40, 20],
      [20, 0],
    ]);
    expect(
      router.findRoute('a', 'a', 'fewest-jumps', ['b'], 'direct'),
    ).toMatchObject({
      status: 'reachable',
      fuelRemainingTons: 0,
      jumpCount: 2,
    });
    expect(
      router.findRoute('a', 'c', 'fewest-jumps', ['b', 'a'], 'direct').status,
    ).toBe('unreachable');
    expect(
      router.findRoute('a', 'c', 'fewest-jumps', [], 'direct').status,
    ).toBe('unreachable');
    expect(router.findRoute('a', 'c', 'fewest-jumps', ['b'])).toEqual(
      router.findRoute('a', 'c', 'fewest-jumps', ['b']),
    );
  });
});

it('uses the port override to price fuel and preserves the jump ledger', () => {
  const rules = createClassicTraveller1981Rules(
    { ...SHIP, displacementTons: 100, jumpRating: 1, jumpFuelCapacityTons: 10 },
    { initialFuelTons: 0 },
  );
  const port = system('a', 1, 'A');
  const destination = system('b', 2);
  for (const [available, grade, cost] of [
    [true, 'unrefined', 1000],
    [false, 'refined', 5000],
  ] as const) {
    const result = reached(
      createEngineRouter(
        [{ ...port, unrefinedFuelAvailable: available }, destination],
        rules,
      ).findRoute('a', 'b'),
    );
    expect(result).toMatchObject({
      totalCostCredits: cost,
      fuelRemainingTons: 0,
      jumpCount: 1,
    });
    expect(result.events).toMatchObject([
      {
        kind: 'refuel',
        grade,
        tons: 10,
        costCredits: cost,
        fuelBeforeTons: 0,
        fuelAfterTons: 10,
      },
      {
        kind: 'jump',
        distance: 1,
        fuelConsumedTons: 10,
        fuelBeforeTons: 10,
        fuelAfterTons: 0,
      },
    ]);
  }
  expect(
    createEngineRouter([system('a', 1, 'E'), destination], rules).findRoute(
      'a',
      'b',
    ).status,
  ).toBe('unreachable');
});
