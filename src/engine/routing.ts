import type { FuelSource, RouteSystem, TravelRules } from '../rules/types';
import { hexDistance } from './hexDistance';
import { toAxial } from './subsector';

const FUEL_UNIT_TONS = 20;

export interface FuelTransaction extends FuelSource {
  readonly kind: 'refuel';
  readonly systemId: string;
  readonly tons: number;
  readonly costCredits: number;
  readonly fuelBeforeTons: number;
  readonly fuelAfterTons: number;
}
export interface Jump {
  readonly kind: 'jump';
  readonly fromId: string;
  readonly toId: string;
  readonly distance: number;
  readonly fuelConsumedTons: number;
  readonly fuelBeforeTons: number;
  readonly fuelAfterTons: number;
}
export type RouteEvent = FuelTransaction | Jump;
export type RouteResult =
  | {
      readonly status: 'reachable';
      readonly originId: string;
      readonly destinationId: string;
      readonly events: readonly RouteEvent[];
      readonly totalCostCredits: number;
      readonly jumpCount: number;
      readonly totalDistance: number;
      readonly fuelRemainingTons: number;
    }
  | {
      readonly status: 'unreachable';
      readonly originId: string;
      readonly destinationId: string;
    };
interface Label {
  cost: number;
  jumps: number;
  distance: number;
  key: number[];
  events: RouteEvent[];
}
function compare(a: Label, b: Label): number {
  const primary =
    a.cost - b.cost || a.jumps - b.jumps || a.distance - b.distance;
  if (primary) return primary;
  for (let i = 0; i < a.key.length; i++) {
    const delta = a.key[i]! - b.key[i]!;
    if (delta) return delta;
  }
  return 0;
}

/** Snapshot and validate a subsector once; each query owns all search state. */
export function createRouter<S extends RouteSystem>(
  input: readonly S[],
  rules: TravelRules<S>,
) {
  const systems = input
    .map((s) => ({ ...s, hex: { ...s.hex } }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const ids = new Map<string, number>();
  const addresses = new Set<string>();
  const positions = systems.map((s, i) => {
    const position = toAxial(s.hex);
    const address = `${s.hex.column}/${s.hex.row}`;
    if (!s.id.trim() || ids.has(s.id) || addresses.has(address)) {
      throw new Error(
        'Systems require unique nonempty IDs, unique hexes, and valid fuel facilities',
      );
    }
    rules.validateSystem(s);
    ids.set(s.id, i);
    addresses.add(address);
    return position;
  });
  // Reject rules incompatible with this constrained search, rather than silently
  // using distance as fuel consumption for an unsupported ship.
  for (const distance of [1, 2, 3]) {
    if (rules.jumpFuelTons(distance) !== distance * FUEL_UNIT_TONS)
      throw new Error('Router requires 20/40/60-ton jump consumption');
  }
  const neighbors = positions.map((p, i) =>
    positions.flatMap((q, j) => {
      const distance = hexDistance(p, q);
      return i !== j && distance <= 3 ? [{ target: j, distance }] : [];
    }),
  );
  // With risks and duration excluded, more expensive grades are dominated.
  const sources = systems.map((s) => {
    const available = [...rules.fuelSources(s)];
    if (
      available.some(
        (source) =>
          !Number.isFinite(source.creditsPerTon) || source.creditsPerTon < 0,
      )
    )
      throw new Error('Fuel prices must be finite and nonnegative');
    return available.sort((a, b) => a.creditsPerTon - b.creditsPerTon)[0];
  });

  return {
    findRoute(originId: string, destinationId: string): RouteResult {
      const origin = ids.get(originId);
      const destination = ids.get(destinationId);
      if (origin === undefined || destination === undefined)
        throw new Error('Unknown system ID');
      const labels: (Label | undefined)[] = Array.from({
        length: systems.length * 4,
      });
      const settled = new Set<number>();
      labels[origin * 4 + 3] = {
        cost: 0,
        jumps: 0,
        distance: 0,
        key: [],
        events: [],
      };
      while (true) {
        let state = -1;
        for (let i = 0; i < labels.length; i++) {
          if (
            !settled.has(i) &&
            labels[i] &&
            (state < 0 || compare(labels[i]!, labels[state]!) < 0)
          )
            state = i;
        }
        if (state < 0)
          return { status: 'unreachable', originId, destinationId };
        const label = labels[state]!;
        const current = Math.floor(state / 4);
        const fuel = state % 4;
        if (current === destination)
          return {
            status: 'reachable',
            originId,
            destinationId,
            events: label.events,
            totalCostCredits: label.cost,
            jumpCount: label.jumps,
            totalDistance: label.distance,
            fuelRemainingTons: fuel * FUEL_UNIT_TONS,
          };
        settled.add(state);
        const source = sources[current];
        for (const { target, distance } of neighbors[current]!) {
          for (
            let departure = Math.max(fuel, distance);
            departure <= 3;
            departure++
          ) {
            if (departure > fuel && !source) continue;
            const next = target * 4 + departure - distance;
            if (settled.has(next)) continue;
            const tons = (departure - fuel) * FUEL_UNIT_TONS;
            const cost = tons * (source?.creditsPerTon ?? 0);
            const events: RouteEvent[] = [];
            if (tons && source)
              events.push({
                kind: 'refuel',
                systemId: systems[current]!.id,
                ...source,
                tons,
                costCredits: cost,
                fuelBeforeTons: fuel * FUEL_UNIT_TONS,
                fuelAfterTons: departure * FUEL_UNIT_TONS,
              });
            events.push({
              kind: 'jump',
              fromId: systems[current]!.id,
              toId: systems[target]!.id,
              distance,
              fuelConsumedTons: rules.jumpFuelTons(distance),
              fuelBeforeTons: departure * FUEL_UNIT_TONS,
              fuelAfterTons: (departure - distance) * FUEL_UNIT_TONS,
            });
            const candidate: Label = {
              cost: label.cost + cost,
              jumps: label.jumps + 1,
              distance: label.distance + distance,
              key: [...label.key, target * 4 + departure],
              events: [...label.events, ...events],
            };
            if (!labels[next] || compare(candidate, labels[next]!) < 0)
              labels[next] = candidate;
          }
        }
      }
    },
  };
}
