import {
  INITIAL_STATE,
  SHIP,
  validateShip,
  type ShipOperatingState,
  type ShipSpecifications,
} from '../../rules/classicTraveller1981';

export interface Vessel {
  ship: ShipSpecifications;
  state: ShipOperatingState;
}

export const DEFAULT_VESSEL: Vessel = { ship: SHIP, state: INITIAL_STATE };
export const VESSEL_STORAGE_KEY = 'jumpwake.vessel';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export function decodeVessel(stored: string | null): Vessel {
  try {
    const value: unknown = JSON.parse(stored ?? 'null');
    if (!isRecord(value) || value.version !== 1) return DEFAULT_VESSEL;
    const { ship, state } = value;
    if (!isRecord(ship) || !isRecord(state)) return DEFAULT_VESSEL;
    if (
      typeof ship.displacementTons !== 'number' ||
      typeof ship.jumpRating !== 'number' ||
      typeof ship.jumpFuelCapacityTons !== 'number' ||
      typeof ship.hasFuelScoops !== 'boolean' ||
      typeof ship.streamlined !== 'boolean' ||
      typeof state.initialFuelTons !== 'number'
    )
      return DEFAULT_VESSEL;
    const vessel: Vessel = {
      ship: {
        displacementTons: ship.displacementTons,
        jumpRating: ship.jumpRating,
        jumpFuelCapacityTons: ship.jumpFuelCapacityTons,
        hasFuelScoops: ship.hasFuelScoops,
        streamlined: ship.streamlined,
      },
      state: { initialFuelTons: state.initialFuelTons },
    };
    validateShip(vessel.ship, vessel.state);
    return vessel;
  } catch {
    return DEFAULT_VESSEL;
  }
}

export function restoreVessel(): Vessel {
  try {
    return decodeVessel(window.localStorage.getItem(VESSEL_STORAGE_KEY));
  } catch {
    return DEFAULT_VESSEL;
  }
}

export function saveVessel(vessel: Vessel): boolean {
  try {
    window.localStorage.setItem(
      VESSEL_STORAGE_KEY,
      JSON.stringify({ version: 1, ...vessel }),
    );
    return true;
  } catch {
    return false;
  }
}
