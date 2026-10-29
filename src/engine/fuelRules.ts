import type { SubsectorHex } from './subsector';

export const SHIP = Object.freeze({
  displacementTons: 200,
  jumpRating: 3,
  jumpFuelCapacityTons: 60,
  initialFuelTons: 60,
  hasFuelScoops: true,
  streamlined: true,
});
export const FUEL_UNIT_TONS = 20;
export type Starport = 'A' | 'B' | 'C' | 'D' | 'E' | 'X';
export interface StarSystem {
  readonly id: string;
  readonly name: string;
  readonly hex: SubsectorHex;
  readonly starport: Starport;
  readonly gasGiant: boolean;
}
export interface FuelSource {
  readonly source: 'starport' | 'gas-giant';
  readonly grade: 'refined' | 'unrefined';
  readonly creditsPerTon: number;
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

/** Prototype policy; see docs/rules.md for class D and fuel-grade decisions. */
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
