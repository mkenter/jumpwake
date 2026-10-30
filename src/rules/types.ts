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
/** Exact whole-ton, unlimited linear-price fuel model. See docs/rules.md. */
export interface TravelRules<S extends RouteSystem> {
  readonly maxJumpDistance: number;
  readonly jumpFuelCapacityTons: number;
  readonly initialFuelTons: number;
  validateSystem(system: S): void;
  jumpFuelTons(distance: number): number;
  fuelSources(system: S): readonly FuelSource[];
}
