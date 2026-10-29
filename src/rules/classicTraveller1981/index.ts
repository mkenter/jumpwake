import type { SubsectorHex } from '../../engine/subsector';
import type { FuelSource, TravelRules } from '../types';

export const SHIP = Object.freeze({
  displacementTons: 200,
  jumpRating: 3,
  jumpFuelCapacityTons: 60,
  hasFuelScoops: true,
  streamlined: true,
});
export const INITIAL_STATE = Object.freeze({ initialFuelTons: 60 });
export const FUEL_UNIT_TONS = 20;
export type Starport = 'A' | 'B' | 'C' | 'D' | 'E' | 'X';
export interface StarSystem {
  readonly id: string;
  readonly name: string;
  readonly hex: SubsectorHex;
  readonly starport: Starport;
  readonly gasGiant: boolean;
}
export function jumpFuelTons(distance: number): number {
  if (
    !Number.isInteger(distance) ||
    distance < 1 ||
    distance > SHIP.jumpRating
  ) {
    throw new RangeError('Jump distance must be 1–3 parsecs');
  }
  return FUEL_UNIT_TONS * distance;
}

/** CT81 availability with provisional A/B unrefined sales; see docs/rules.md. */
export function fuelSources(system: StarSystem): FuelSource[] {
  const sources: FuelSource[] = [];
  if (system.gasGiant)
    sources.push({ source: 'gas-giant', grade: 'unrefined', creditsPerTon: 0 });
  if ('ABCD'.includes(system.starport))
    sources.push({
      source: 'starport',
      grade: 'unrefined',
      creditsPerTon: 100,
    });
  if ('AB'.includes(system.starport))
    sources.push({ source: 'starport', grade: 'refined', creditsPerTon: 500 });
  return sources;
}

export const classicTraveller1981: TravelRules<StarSystem> = Object.freeze({
  jumpFuelTons,
  fuelSources,
  validateSystem(system: StarSystem) {
    if (
      !['A', 'B', 'C', 'D', 'E', 'X'].includes(system.starport) ||
      typeof system.gasGiant !== 'boolean'
    )
      throw new Error('Invalid fuel facilities');
  },
});
