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
/** Bounded, unlimited linear-price fuel model. */
export interface TravelRules<S extends RouteSystem> {
  /** Fuel accounting precision in units per ton (defaults to whole tons). */
  readonly fuelUnitsPerTon?: number;
  /** Additional fuel consumed per jump, independent of distance. */
  readonly operatingFuelTonsPerJump?: number;
  readonly jumpFuelLimitTons?: number;
  readonly maxJumpDistance: number;
  readonly jumpFuelCapacityTons: number;
  readonly initialFuelTons: number;
  validateSystem(system: S): void;
  canVisit?(system: S): boolean;
  jumpFuelTons(distance: number): number;
  fuelSources(system: S): readonly FuelSource[];
}
