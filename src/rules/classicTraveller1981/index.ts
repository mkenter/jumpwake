import type { SubsectorHex } from '../../engine/subsector';
import type { FuelSource, TravelRules } from '../types';

/** Routing particulars only; this does not validate a complete CT ship design. */
export interface ShipSpecifications {
  readonly displacementTons: number;
  readonly jumpRating: number;
  readonly jumpFuelCapacityTons: number;
  readonly hasFuelScoops: boolean;
  readonly streamlined: boolean;
}
export interface ShipOperatingState {
  readonly initialFuelTons: number;
}
export const SHIP: ShipSpecifications = Object.freeze({
  displacementTons: 200,
  jumpRating: 3,
  jumpFuelCapacityTons: 60,
  hasFuelScoops: true,
  streamlined: true,
});
export const INITIAL_STATE: ShipOperatingState = Object.freeze({
  initialFuelTons: 60,
});
export type Starport = 'A' | 'B' | 'C' | 'D' | 'E' | 'X';
export interface StarSystem {
  readonly id: string;
  readonly name: string;
  readonly hex: SubsectorHex;
  readonly starport: Starport;
  readonly gasGiant: boolean;
}

/** Supported input domain, not CT construction legality or minimum tankage. */
export function validateShip(
  ship: ShipSpecifications,
  state: ShipOperatingState,
): void {
  if (
    !Number.isInteger(ship.displacementTons) ||
    ship.displacementTons < 100 ||
    ship.displacementTons > 5000 ||
    ship.displacementTons % 10 !== 0
  )
    throw new RangeError(
      'Displacement must be 100–5000 tons in 10-ton increments',
    );
  if (
    !Number.isInteger(ship.jumpRating) ||
    ship.jumpRating < 1 ||
    ship.jumpRating > 6
  )
    throw new RangeError('Jump rating must be an integer from 1 to 6');
  if (
    !Number.isInteger(ship.jumpFuelCapacityTons) ||
    ship.jumpFuelCapacityTons < 1 ||
    ship.jumpFuelCapacityTons > ship.displacementTons
  )
    throw new RangeError(
      'Jump-fuel capacity must be whole tons from 1 to displacement',
    );
  if (
    !Number.isInteger(state.initialFuelTons) ||
    state.initialFuelTons < 0 ||
    state.initialFuelTons > ship.jumpFuelCapacityTons
  )
    throw new RangeError(
      'Initial jump fuel must be whole tons from 0 to capacity',
    );
  if (
    typeof ship.hasFuelScoops !== 'boolean' ||
    typeof ship.streamlined !== 'boolean'
  )
    throw new TypeError('Scoops and streamlining must be booleans');
}

/** CT81 availability with provisional A/B unrefined sales */
export function createClassicTraveller1981Rules(
  ship: ShipSpecifications,
  state: ShipOperatingState,
): TravelRules<StarSystem> {
  validateShip(ship, state);
  const {
    displacementTons,
    jumpRating,
    jumpFuelCapacityTons,
    hasFuelScoops,
    streamlined,
  } = ship;
  const { initialFuelTons } = state;
  return Object.freeze({
    maxJumpDistance: jumpRating,
    jumpFuelCapacityTons,
    initialFuelTons,
    jumpFuelTons(distance: number): number {
      if (!Number.isInteger(distance) || distance < 1 || distance > jumpRating)
        throw new RangeError(`Jump distance must be 1–${jumpRating} parsecs`);
      return (displacementTons / 10) * distance;
    },
    fuelSources(system: StarSystem): FuelSource[] {
      const sources: FuelSource[] = [];
      if (system.gasGiant && hasFuelScoops && streamlined)
        sources.push({
          source: 'gas-giant',
          grade: 'unrefined',
          creditsPerTon: 0,
        });
      if ('ABCD'.includes(system.starport))
        sources.push({
          source: 'starport',
          grade: 'unrefined',
          creditsPerTon: 100,
        });
      if ('AB'.includes(system.starport))
        sources.push({
          source: 'starport',
          grade: 'refined',
          creditsPerTon: 500,
        });
      return sources;
    },
    validateSystem(system: StarSystem) {
      if (
        !['A', 'B', 'C', 'D', 'E', 'X'].includes(system.starport) ||
        typeof system.gasGiant !== 'boolean'
      )
        throw new Error('Invalid fuel facilities');
    },
  });
}

export const classicTraveller1981 = createClassicTraveller1981Rules(
  SHIP,
  INITIAL_STATE,
);
// Default-vessel conveniences for the existing presentation layer.
export const { jumpFuelTons, fuelSources } = classicTraveller1981;
