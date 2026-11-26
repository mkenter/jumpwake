import type { SubsectorHex } from '../../engine/subsector';
import type { FuelSource, TravelRules } from '../types';
import { withRefereeOverrides, type WorldFacts } from '../worldFacts';

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
  readonly starport: Starport | '?';
  readonly gasGiant: boolean | null;
  readonly facts?: WorldFacts;
  /** Referee override for the assumed availability of unrefined fuel at A/B ports. */
  readonly unrefinedFuelAvailable?: boolean;
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

/** CT81 Book 2 pp. 6–7, 14–15; Book 3 p. 10. A/B unrefined sales are a referee assumption. */
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
      if (
        'CD'.includes(system.starport) ||
        ('AB'.includes(system.starport) &&
          (system.unrefinedFuelAvailable ?? true))
      )
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
    canVisit(system: StarSystem) {
      return system.facts?.travelProhibited !== true;
    },
    validateSystem(system: StarSystem) {
      if (
        !['A', 'B', 'C', 'D', 'E', 'X', '?'].includes(system.starport) ||
        (system.gasGiant !== null && typeof system.gasGiant !== 'boolean') ||
        (system.unrefinedFuelAvailable !== undefined &&
          (typeof system.unrefinedFuelAvailable !== 'boolean' ||
            !'AB'.includes(system.starport)))
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

export {
  assessVesselDesign,
  createHullRowResolver,
  exampleDriveCatalog,
} from './vesselDesign';
export type {
  Computer,
  DesignAssessment,
  DriveCatalog,
  DriveKind,
  DriveLetter,
  DriveLookup,
  VesselDesign,
} from './vesselDesign';

/** Book 3 pp. 7, 10, 16. UWP describes the main world only. */
export function describeWorldFacts(facts: WorldFacts) {
  const surface =
    facts.hydrographics === null
      ? 'Unknown'
      : facts.hydrographics === 0
        ? 'No surface coverage'
        : facts.atmosphere === 0 || facts.atmosphere === 1
          ? 'Ice caps'
          : facts.atmosphere === null
            ? 'Surface state unknown'
            : 'Surface liquid; composition and open water unknown';
  return {
    size:
      facts.size === null
        ? 'Unknown'
        : facts.size === 0
          ? 'Belt'
          : `${facts.size * 1600} km diameter`,
    hydrographics:
      facts.hydrographics === null
        ? 'Unknown'
        : `${facts.hydrographics * 10}% — ${surface}`,
  };
}

/** Book 3 p. 10. */
export function portFacilities(port: Starport | '?'): string {
  switch (port) {
    case 'A':
    case 'B':
      return 'Refined fuel and annual overhaul';
    case 'C':
      return 'Unrefined fuel and repairs';
    case 'D':
      return 'Unrefined fuel; no repairs';
    case 'E':
      return 'No facilities or fuel';
    case 'X':
      return 'No starport';
    case '?':
      return 'Unknown';
  }
}

/** Apply a referee's missing fuel observations, recording their provenance. */
export function withFuelOverrides(
  system: StarSystem,
  overrides: { starport?: Starport; gasGiants?: number },
): StarSystem {
  if (
    overrides.starport !== undefined &&
    (system.starport !== '?' ||
      !['A', 'B', 'C', 'D', 'E', 'X'].includes(overrides.starport))
  )
    throw new Error('Invalid or already known starport');
  if (
    overrides.gasGiants !== undefined &&
    (system.gasGiant !== null ||
      !Number.isInteger(overrides.gasGiants) ||
      overrides.gasGiants < 0 ||
      overrides.gasGiants > 33)
  )
    throw new Error('Invalid or already known gas giant count');
  if (!system.facts) throw new Error('World observations required');
  const facts = withRefereeOverrides(system.facts, {
    ...(overrides.gasGiants === undefined
      ? {}
      : { gasGiants: overrides.gasGiants }),
  });
  return {
    ...system,
    starport: overrides.starport ?? system.starport,
    gasGiant:
      overrides.gasGiants === undefined
        ? system.gasGiant
        : overrides.gasGiants > 0,
    facts: {
      ...facts,
      refereeOverrides: [
        ...(facts.refereeOverrides ?? []),
        ...(overrides.starport === undefined ? [] : ['starport']),
      ],
    },
  };
}
