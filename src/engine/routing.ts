import type { FuelSource, RouteSystem, TravelRules } from '../rules/types';
import { hexDistance } from './hexDistance';
import { toAxial } from './subsector';

// Resource limits for the generic whole-ton contract (CT configurations use ≤31 levels).
const MAX_FUEL_LEVELS = 64;
const MAX_FUEL_TONS = 1_000_000;
function wholeNumber(value: number, min: number, max: number, name: string) {
  if (!Number.isSafeInteger(value) || value < min || value > max)
    throw new RangeError(`${name} must be an integer from ${min} to ${max}`);
}
function gcd(a: number, b: number): number {
  while (b) [a, b] = [b, a % b];
  return a;
}
/** Vertex fuel balances: residues anchored at empty, full, or initial fuel. */
function fuelLevels(
  capacity: number,
  initial: number,
  quantum: number,
): number[] {
  const levels = new Set<number>();
  for (const anchor of [0, capacity, initial])
    for (let fuel = anchor % quantum; fuel <= capacity; fuel += quantum) {
      levels.add(fuel);
      if (levels.size > MAX_FUEL_LEVELS)
        throw new RangeError(
          `Fuel model exceeds ${MAX_FUEL_LEVELS} critical levels`,
        );
    }
  return [...levels].sort((a, b) => a - b);
}

/** Lexicographic cost/jumps/distance or jumps/cost/distance, then itinerary key. */
export type RoutingPreference = 'lowest-fuel-cost' | 'fewest-jumps';

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
  parent?: Label;
  events: RouteEvent[];
}
function compare(a: Label, b: Label, preference: RoutingPreference): number {
  // Both orders are lexicographic sums of nonnegative edge costs. Every
  // combined edge adds one jump, making its score strictly positive in either order.
  const objectives =
    preference === 'fewest-jumps'
      ? a.jumps - b.jumps || a.cost - b.cost
      : a.cost - b.cost || a.jumps - b.jumps;
  const primary = objectives || a.distance - b.distance;
  if (primary) return primary;
  for (let i = 0; i < a.key.length; i++) {
    const delta = a.key[i]! - b.key[i]!;
    if (delta) return delta;
  }
  return 0;
}

/** Indexed min-heap: at most one queued entry per state. Labels only decrease. */
class Frontier {
  private readonly heap: number[] = [];
  private readonly positions = new Map<number, number>();
  constructor(
    private readonly labels: (Label | undefined)[],
    private readonly preference: RoutingPreference,
  ) {}
  private less(a: number, b: number) {
    return compare(this.labels[a]!, this.labels[b]!, this.preference) < 0;
  }
  private swap(a: number, b: number) {
    [this.heap[a], this.heap[b]] = [this.heap[b]!, this.heap[a]!];
    this.positions.set(this.heap[a]!, a);
    this.positions.set(this.heap[b]!, b);
  }
  update(state: number) {
    let i = this.positions.get(state);
    if (i === undefined) {
      i = this.heap.length;
      this.heap.push(state);
      this.positions.set(state, i);
    }
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (!this.less(this.heap[i]!, this.heap[parent]!)) break;
      this.swap(i, parent);
      i = parent;
    }
  }
  pop(): number | undefined {
    const first = this.heap[0];
    if (first === undefined) return undefined;
    const last = this.heap.pop()!;
    this.positions.delete(first);
    if (this.heap.length) {
      this.heap[0] = last;
      this.positions.set(last, 0);
      let i = 0;
      while (true) {
        let child = i * 2 + 1;
        if (child >= this.heap.length) break;
        if (
          child + 1 < this.heap.length &&
          this.less(this.heap[child + 1]!, this.heap[child]!)
        )
          child++;
        if (!this.less(this.heap[child]!, this.heap[i]!)) break;
        this.swap(i, child);
        i = child;
      }
    }
    return first;
  }
}

/** Snapshot and validate a subsector once; each query owns all search state. */
export function createRouter<S extends RouteSystem>(
  input: readonly S[],
  rules: TravelRules<S>,
) {
  const {
    maxJumpDistance,
    jumpFuelCapacityTons: capacity,
    initialFuelTons: initial,
  } = rules;
  wholeNumber(maxJumpDistance, 1, 16, 'Maximum jump distance');
  wholeNumber(capacity, 1, MAX_FUEL_TONS, 'Jump-fuel capacity');
  wholeNumber(initial, 0, capacity, 'Initial jump fuel');
  const consumption = Array.from({ length: maxJumpDistance }, (_, i) => {
    const tons = rules.jumpFuelTons(i + 1);
    wholeNumber(tons, 1, MAX_FUEL_TONS, 'Jump consumption');
    return tons;
  });
  const levels = fuelLevels(capacity, initial, consumption.reduce(gcd));
  const width = levels.length;
  const levelIndices = new Map(levels.map((fuel, i) => [fuel, i]));
  const systems = input
    .map((s) => ({ ...s, hex: { ...s.hex } }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const ids = new Map<string, number>();
  const addresses = new Set<string>();
  const positions = systems.map((s, i) => {
    const position = toAxial(s.hex);
    const address = `${s.hex.column}/${s.hex.row}`;
    if (!s.id.trim() || ids.has(s.id) || addresses.has(address)) {
      throw new Error('Systems require unique nonempty IDs and unique hexes');
    }
    rules.validateSystem(s);
    ids.set(s.id, i);
    addresses.add(address);
    return position;
  });
  const neighbors = positions.map((p, i) =>
    positions.flatMap((q, j) => {
      const distance = hexDistance(p, q);
      const tons = consumption[distance - 1];
      return i !== j &&
        distance <= maxJumpDistance &&
        tons !== undefined &&
        tons <= capacity
        ? [{ target: j, distance, tons }]
        : [];
    }),
  );
  // Integer prices and a simple-state path bound keep every score exact in JS.
  const priceLimit = Math.floor(
    Number.MAX_SAFE_INTEGER / (Math.max(1, systems.length) * width * capacity),
  );
  const sources = systems.map((s) => {
    const available = rules.fuelSources(s).map((source) => ({ ...source }));
    if (
      available.some(
        (source) =>
          !Number.isSafeInteger(source.creditsPerTon) ||
          source.creditsPerTon < 0 ||
          source.creditsPerTon > priceLimit,
      )
    )
      throw new Error(
        `Fuel prices must be nonnegative whole credits ≤ ${priceLimit}`,
      );
    // Grades have no simulated risk or separate inventories; higher prices are dominated.
    return available.sort((a, b) => a.creditsPerTon - b.creditsPerTon)[0];
  });

  return {
    findRoute(
      originId: string,
      destinationId: string,
      preference: RoutingPreference = 'lowest-fuel-cost',
    ): RouteResult {
      if (preference !== 'lowest-fuel-cost' && preference !== 'fewest-jumps')
        throw new Error('Unknown routing preference');
      const origin = ids.get(originId);
      const destination = ids.get(destinationId);
      if (origin === undefined || destination === undefined)
        throw new Error('Unknown system ID');
      const labels: (Label | undefined)[] = Array.from({
        length: systems.length * width,
      });
      const settled = new Set<number>();
      const frontier = new Frontier(labels, preference);
      const start = origin * width + levelIndices.get(initial)!;
      labels[start] = { cost: 0, jumps: 0, distance: 0, key: [], events: [] };
      frontier.update(start);
      while (true) {
        const state = frontier.pop();
        if (state === undefined)
          return { status: 'unreachable', originId, destinationId };
        const label = labels[state]!;
        const current = Math.floor(state / width);
        const fuel = levels[state % width]!;
        if (current === destination) {
          const segments: RouteEvent[][] = [];
          for (let step: Label | undefined = label; step; step = step.parent)
            segments.push(step.events);
          return {
            status: 'reachable',
            originId,
            destinationId,
            events: segments.reverse().flat(),
            totalCostCredits: label.cost,
            jumpCount: label.jumps,
            totalDistance: label.distance,
            fuelRemainingTons: fuel,
          };
        }
        settled.add(state);
        const source = sources[current];
        for (const { target, distance, tons: consumed } of neighbors[
          current
        ]!) {
          for (const [departureIndex, departure] of levels.entries()) {
            if (departure < fuel || departure < consumed) continue;
            if (departure > fuel && !source) continue;
            const arrivalIndex = levelIndices.get(departure - consumed);
            if (arrivalIndex === undefined)
              throw new Error('Fuel-state closure violated');
            const next = target * width + arrivalIndex;
            if (settled.has(next)) continue;
            const tons = departure - fuel;
            const cost = tons * (source?.creditsPerTon ?? 0);
            const candidate: Label = {
              cost: label.cost + cost,
              jumps: label.jumps + 1,
              distance: label.distance + distance,
              key: [...label.key, target * width + departureIndex],
              parent: label,
              events: [],
            };
            if (
              labels[next] &&
              compare(candidate, labels[next]!, preference) >= 0
            )
              continue;
            if (tons && source)
              candidate.events.push({
                ...source,
                kind: 'refuel',
                systemId: systems[current]!.id,
                tons,
                costCredits: cost,
                fuelBeforeTons: fuel,
                fuelAfterTons: departure,
              });
            candidate.events.push({
              kind: 'jump',
              fromId: systems[current]!.id,
              toId: systems[target]!.id,
              distance,
              fuelConsumedTons: consumed,
              fuelBeforeTons: departure,
              fuelAfterTons: departure - consumed,
            });
            labels[next] = candidate;
            frontier.update(next);
          }
        }
      }
    },
  };
}
