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
import type { RouteResult } from './routing';
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
) {
  const capacity = ship.jumpFuelCapacityTons;
  const width = capacity + 1;
  const labels: (ReferenceLabel | undefined)[] = Array.from({
    length: systems.length * width,
  });
  labels[start * width + state.initialFuelTons] = { score: [0, 0, 0], key: [] };
  const less = (a: ReferenceLabel, b: ReferenceLabel) => {
    for (let i = 0; i < 3; i++) {
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
          const distance = displayDistance(s.hex, systems[j]!.hex);
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

it('matches an independent ton-resolution solver for all fuel assignments and endpoint pairs', () => {
  for (let mask = 0; mask < 81; mask++) {
    let value = mask;
    const systems = [1, 3, 5, 7].map((row, i) => {
      const facility = value % 3;
      value = Math.floor(value / 3);
      return system(String(i), row, facility === 1 ? 'C' : 'X', facility === 2);
    });
    const router = createRouter(systems);
    for (let start = 0; start < 4; start++)
      for (let end = 0; end < 4; end++) {
        const expected = reference(systems, start, end);
        const result = router.findRoute(String(start), String(end));
        expect(result.status).toBe(expected ? 'reachable' : 'unreachable');
        if (result.status === 'reachable')
          expect([
            result.totalCostCredits,
            result.jumpCount,
            result.totalDistance,
          ]).toEqual(expected);
      }
  }
});

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
    expect(location).not.toBe(result.destinationId);
    expect(event.fuelBeforeTons).toBe(fuel);
    if (event.kind === 'refuel') {
      const stop = byId.get(location)!;
      expect(event.systemId).toBe(location);
      expect(event.tons).toBeGreaterThan(0);
      expect(event.grade).toBe('unrefined');
      const free = stop.gasGiant && ship.hasFuelScoops && ship.streamlined;
      expect(event.source).toBe(free ? 'gas-giant' : 'starport');
      expect(free || 'ABCD'.includes(stop.starport)).toBe(true);
      expect(event.creditsPerTon).toBe(free ? 0 : 100);
      expect(event.costCredits).toBe(event.tons * event.creditsPerTon);
      expect(result.events[i + 1]?.kind).toBe('jump');
      fuel += event.tons;
      cost += event.costCredits;
    } else {
      expect(event.fromId).toBe(location);
      expect(event.distance).toBe(
        displayDistance(byId.get(location)!.hex, byId.get(event.toId)!.hex),
      );
      expect(event.distance).toBeGreaterThanOrEqual(1);
      expect(event.distance).toBeLessThanOrEqual(ship.jumpRating);
      expect(event.fuelConsumedTons).toBe(
        event.distance * (ship.displacementTons / 10),
      );
      location = event.toId;
      fuel -= event.fuelConsumedTons;
      distance += event.distance;
      jumps++;
    }
    expect(event.fuelAfterTons).toBe(fuel);
    expect(fuel).toBeGreaterThanOrEqual(0);
    expect(fuel).toBeLessThanOrEqual(ship.jumpFuelCapacityTons);
  }
  expect(location).toBe(result.destinationId);
  expect([cost, jumps, distance, fuel]).toEqual([
    result.totalCostCredits,
    result.jumpCount,
    result.totalDistance,
    result.fuelRemainingTons,
  ]);
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
          const expected = reference(systems, start, end);
          const result = router.findRoute(String(start), String(end));
          expect(result.status).toBe(expected ? 'reachable' : 'unreachable');
          if (result.status === 'reachable') {
            expect([
              result.totalCostCredits,
              result.jumpCount,
              result.totalDistance,
            ]).toEqual(expected);
            expectBalanced(systems, result);
          }
          expect(reversed.findRoute(String(start), String(end))).toEqual(
            result,
          );
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

it('matches independent one-ton optimal scores and full tie keys for variable ships', () => {
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
            );
            const result = router.findRoute(
              systems[start]!.id,
              systems[end]!.id,
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
              expectBalanced(systems, result, ship, state);
            }
            expect(
              reversed.findRoute(systems[start]!.id, systems[end]!.id),
            ).toEqual(result);
          }
      }
    }
  }
});

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
