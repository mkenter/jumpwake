import type { SubsectorHex } from '../engine/subsector';
export interface RouteSystem {
  readonly id: string;
  readonly hex: SubsectorHex;
}
export interface FuelSource {
  readonly source: string;
  readonly grade: string;
  readonly creditsPerTon: number;
}
/** Only the existing four-state, full-tank model is supported. */
export interface TravelRules<S extends RouteSystem> {
  validateSystem(system: S): void;
  jumpFuelTons(distance: number): number;
  fuelSources(system: S): readonly FuelSource[];
}
