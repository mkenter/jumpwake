import { EMBER_REACH } from '../../data/emberReach';
import type { RouteResult, RoutingPreference } from '../../engine';
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

export const worlds = EMBER_REACH.map((system) => ({
  ...system,
  col: system.hex.column,
  row: system.hex.row,
  port: system.starport,
  fuel: describeFuel(fuelSources(system)),
}));
export const worldById = (id: string) =>
  worlds.find((world) => world.id === id)!;
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
