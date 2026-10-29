import { describe, expect, it } from 'vitest';
import { createRouter } from './routing';
import type { RouteResult } from './routing';
import type { StarSystem, Starport } from './fuelRules';
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
// refuel edges (not the production 20-ton combined refuel/jump transitions).
function reference(systems: readonly StarSystem[], start: number, end: number) {
  type Score = [number, number, number];
  const labels: (Score | undefined)[] = Array.from({
    length: systems.length * 61,
  });
  labels[start * 61 + 60] = [0, 0, 0];
  const less = (a: Score, b: Score) =>
    a[0] < b[0] ||
    (a[0] === b[0] && (a[1] < b[1] || (a[1] === b[1] && a[2] < b[2])));
  for (let pass = 0; pass < labels.length; pass++) {
    let changed = false;
    const relax = (to: number, candidate: Score) => {
      if (!labels[to] || less(candidate, labels[to]!)) {
        labels[to] = candidate;
        changed = true;
      }
    };
    for (let i = 0; i < systems.length; i++)
      for (let fuel = 0; fuel <= 60; fuel++) {
        const score = labels[i * 61 + fuel];
        if (!score) continue;
        if (i === end) continue;
        const s = systems[i]!;
        if (fuel < 60 && (s.gasGiant || 'ABCD'.includes(s.starport)))
          relax(i * 61 + fuel + 1, [
            score[0] + (s.gasGiant ? 0 : 100),
            score[1],
            score[2],
          ]);
        for (let j = 0; j < systems.length; j++) {
          const distance = displayDistance(s.hex, systems[j]!.hex);
          if (distance >= 1 && distance <= 3 && fuel >= distance * 20)
            relax(j * 61 + fuel - distance * 20, [
              score[0],
              score[1] + 1,
              score[2] + distance,
            ]);
        }
      }
    if (!changed) break;
  }
  return labels
    .slice(end * 61, end * 61 + 61)
    .filter((x): x is Score => !!x)
    .sort((a, b) => (less(a, b) ? -1 : less(b, a) ? 1 : 0))[0];
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

function expectBalanced(systems: readonly StarSystem[], result: RouteResult) {
  if (result.status !== 'reachable') return;
  const byId = new Map(systems.map((s) => [s.id, s]));
  let fuel = 60;
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
      expect(event.source).toBe(stop.gasGiant ? 'gas-giant' : 'starport');
      expect(stop.gasGiant || 'ABCD'.includes(stop.starport)).toBe(true);
      expect(event.creditsPerTon).toBe(stop.gasGiant ? 0 : 100);
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
      expect(event.distance).toBeLessThanOrEqual(3);
      expect(event.fuelConsumedTons).toBe(event.distance * 20);
      location = event.toId;
      fuel -= event.fuelConsumedTons;
      distance += event.distance;
      jumps++;
    }
    expect(event.fuelAfterTons).toBe(fuel);
    expect(fuel).toBeGreaterThanOrEqual(0);
    expect(fuel).toBeLessThanOrEqual(60);
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
