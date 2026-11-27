import type { ChartWorld, Subsector } from '../../import/subsector';
import type {
  RouteResult,
  RoutingPreference,
  FuelTransaction,
  Jump,
} from '../../engine';
import type { FuelSource } from '../../rules/types';
import {
  fuelSources,
  INITIAL_STATE,
  SHIP,
  type ShipSpecifications,
  type ShipOperatingState,
} from '../../rules/classicTraveller1981';

export const preferenceNames: Record<RoutingPreference, string> = {
  'lowest-fuel-cost': 'Lowest fuel cost',
  'fewest-jumps': 'Fewest jumps',
};

export function describeFuel(sources: readonly FuelSource[]) {
  return (
    sources
      .map((source) =>
        source.source === 'gas-giant'
          ? 'Gas giant · free scooping (unrefined)'
          : `${source.grade === 'refined' ? 'Refined' : 'Unrefined'} · Cr${source.creditsPerTon}/t`,
      )
      .join('; ') || 'No local fuel'
  );
}

export const presentWorlds = (systems: readonly ChartWorld[]) =>
  systems.map((system) => ({
    ...system,
    col: system.hex.column,
    row: system.hex.row,
    port: system.starport,
    fuel: describeFuel(fuelSources(system)),
  }));
export type PresentedWorld = ReturnType<typeof presentWorlds>[number];
export const address = (world: { col: number; row: number }) =>
  `${String(world.col).padStart(2, '0')}${String(world.row).padStart(2, '0')}`;
export type Stop = {
  id: string;
  world: string;
  kind: 'departure' | 'jump' | 'refuel';
  jump: number;
  action: string;
  cost: number;
  fuel: string;
};
export function routeStops(
  result: RouteResult,
  worldById: (id: string) => ChartWorld,
  ship: ShipSpecifications = SHIP,
  state: ShipOperatingState = INITIAL_STATE,
): Stop[] {
  if (result.status === 'unreachable') return [];
  return [
    {
      id: 'departure',
      world: result.originId,
      kind: 'departure',
      jump: 0,
      action: result.jumpCount
        ? state.initialFuelTons === ship.jumpFuelCapacityTons
          ? 'Depart with full jump fuel'
          : 'Depart with available jump fuel'
        : 'Already at your destination. No travel needed.',
      cost: 0,
      fuel: `${state.initialFuelTons} t aboard`,
    },
    ...result.events.map((event, index): Stop => ({
      id: `event-${index}`,
      kind: event.kind,
      world: event.kind === 'jump' ? event.toId : event.systemId,
      jump: event.kind === 'jump' ? event.distance : 0,
      action:
        event.kind === 'jump'
          ? `Jump from ${worldById(event.fromId).name}${index === result.events.length - 1 ? ' · Arrive at destination' : ''}`
          : `${event.source === 'gas-giant' ? 'Scoop' : 'Buy'} ${event.tons} t ${event.grade} fuel${event.source === 'starport' ? ` at Cr${event.creditsPerTon}/t` : ''}`,
      cost: event.kind === 'refuel' ? event.costCredits : 0,
      fuel: `${event.fuelBeforeTons} → ${event.fuelAfterTons} t`,
    })),
  ];
}
export type VoyageVisit = {
  world: string;
  arrival: number;
  departure: number;
  transactions: FuelTransaction[];
};

export function presentVoyage(
  passage: Extract<RouteResult, { status: 'reachable' }>,
  initialFuel: number,
) {
  const visits: VoyageVisit[] = [
    {
      world: passage.originId,
      arrival: initialFuel,
      departure: initialFuel,
      transactions: [],
    },
  ];
  const legs: Jump[] = [];
  let consumed = 0,
    purchased = 0,
    scooped = 0;
  for (const event of passage.events) {
    const visit = visits[visits.length - 1]!;
    if (event.kind === 'refuel') {
      visit.transactions.push(event);
      visit.departure = event.fuelAfterTons;
      if (event.source === 'gas-giant') scooped += event.tons;
      else purchased += event.tons;
    } else {
      visit.departure = event.fuelBeforeTons;
      consumed += event.fuelConsumedTons;
      legs.push(event);
      visits.push({
        world: event.toId,
        arrival: event.fuelAfterTons,
        departure: event.fuelAfterTons,
        transactions: [],
      });
    }
  }
  return {
    visits,
    legs,
    consumed,
    purchased,
    scooped,
    remaining: passage.fuelRemainingTons,
  };
}

export function transactionText(event: FuelTransaction) {
  return event.source === 'gas-giant'
    ? `Scoop ${event.tons} t ${event.grade} fuel from gas giant · free`
    : `Buy ${event.tons} t ${event.grade} fuel from ${event.source} at Cr${event.creditsPerTon}/t · ${credits(event.costCredits)}`;
}
// Presentation-only projection shared by hexes, routes and interaction targets.
// Engine addresses and distances are unaffected; glyphs are not stretched.
const rowScale = 1.1;
export const point = (w: { col: number; row: number }) => ({
  x: 38 + (w.col - 1) * 66,
  y: (38 + (w.row - 1) * 66 + (w.col % 2 === 0 ? 33 : 0)) * rowScale,
});
export const hexes = Array.from({ length: 80 }, (_, i) => {
  const col = Math.floor(i / 10) + 1;
  const row = (i % 10) + 1;
  const { x, y } = point({ col, row });
  return {
    col,
    row,
    points: Array.from({ length: 6 }, (_, n) => {
      const a = (Math.PI * n) / 3;
      return `${x + 44 * Math.cos(a)},${y + 38 * Math.sin(a) * rowScale}`;
    }).join(' '),
  };
});
export const credits = (n: number) => `Cr${n.toLocaleString('en-GB')}`;

export function passageMarkdown({
  chart,
  passage,
  preference,
  ship,
  state,
  worldById,
}: {
  chart: Subsector;
  passage: Extract<RouteResult, { status: 'reachable' }>;
  preference: RoutingPreference;
  ship: ShipSpecifications;
  state: ShipOperatingState;
  worldById: (id: string) => PresentedWorld;
}): string {
  const escape = (value: string) =>
    value.replace(/[\\`*_{}[\]<>#+.!|~-]/g, '\\$&').replace(/[\r\n]+/g, ' ');
  const origin = worldById(passage.originId);
  const destination = worldById(passage.destinationId);
  const voyage = presentVoyage(passage, state.initialFuelTons);
  return [
    `# Passage: ${escape(origin.name)} to ${escape(destination.name)}`,
    '',
    `- Chart: ${escape(chart.title)}`,
    `- Source: ${escape(chart.source)}`,
    `- Origin: ${escape(origin.name)} (${address(origin)})`,
    `- Destination: ${escape(destination.name)} (${address(destination)})`,
    `- Routing: ${preferenceNames[preference]}`,
    `- Vessel: Jump–${ship.jumpRating}, ${ship.displacementTons} tons`,
    `- Starting jump fuel: ${state.initialFuelTons} t`,
    `- Jumps: ${passage.jumpCount}`,
    `- Distance: ${passage.totalDistance} pc`,
    `- Purchased fuel: ${credits(passage.totalCostCredits)}`,
    '',
    `- Arrival fuel: ${voyage.remaining} t`,
    `- Jump fuel: start ${state.initialFuelTons} t; consumed ${voyage.consumed} t; purchased ${voyage.purchased} t; scooped ${voyage.scooped} t; remaining ${voyage.remaining} t`,
    '',
    '## Voyage',
    ...voyage.visits.flatMap((visit, i) => [
      `${i + 1}. **${escape(worldById(visit.world).name)}** — arrival ${visit.arrival} t; departure ${visit.departure} t`,
      ...visit.transactions.map(
        (event) =>
          `   - ${escape(transactionText(event))}; fuel ${event.fuelBeforeTons} → ${event.fuelAfterTons} t`,
      ),
      ...(voyage.legs[i]
        ? [
            `   - Jump ${escape(worldById(voyage.legs[i]!.fromId).name)} → ${escape(worldById(voyage.legs[i]!.toId).name)}: ${voyage.legs[i]!.distance} pc; consumed ${voyage.legs[i]!.fuelConsumedTons} t; remaining ${voyage.legs[i]!.fuelAfterTons} t`,
          ]
        : []),
    ]),
  ].join('\n');
}
