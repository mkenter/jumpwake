import {
  createClassicTraveller1981Rules,
  INITIAL_STATE,
  SHIP,
  validateShip,
  type ShipOperatingState,
  type ShipSpecifications,
} from '../../rules/classicTraveller1981';

import { createRouter } from '../../engine';

import type { VesselDesign } from '../../rules/classicTraveller1981/vesselDesign';

export interface Vessel {
  design?: VesselDesign;
  ship: ShipSpecifications;
  state: ShipOperatingState;
}

export const DEFAULT_VESSEL: Vessel = { ship: SHIP, state: INITIAL_STATE };
export const VESSEL_STORAGE_KEY = 'jumpwake.vessel';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function parseVessel(
  value: unknown,
  includeDesign: boolean,
): Vessel | null {
  try {
    if (!isRecord(value)) return null;
    const { ship, state, design } = value;
    if (!isRecord(ship) || !isRecord(state)) return null;
    if (
      typeof ship.displacementTons !== 'number' ||
      typeof ship.jumpRating !== 'number' ||
      typeof ship.jumpFuelCapacityTons !== 'number' ||
      typeof ship.hasFuelScoops !== 'boolean' ||
      typeof ship.streamlined !== 'boolean' ||
      typeof state.initialFuelTons !== 'number'
    )
      return null;
    if (
      ship.powerPlan !== undefined &&
      (!isRecord(ship.powerPlan) ||
        typeof ship.powerPlan.plantRating !== 'number' ||
        typeof ship.powerPlan.tankageTons !== 'number' ||
        typeof ship.powerPlan.weeksPerJump !== 'number')
    )
      return null;
    const vessel: Vessel = {
      ship: {
        displacementTons: ship.displacementTons,
        jumpRating: ship.jumpRating,
        jumpFuelCapacityTons: ship.jumpFuelCapacityTons,
        hasFuelScoops: ship.hasFuelScoops,
        streamlined: ship.streamlined,
        ...(isRecord(ship.powerPlan)
          ? {
              powerPlan: {
                plantRating: ship.powerPlan.plantRating as number,
                tankageTons: ship.powerPlan.tankageTons as number,
                weeksPerJump: ship.powerPlan.weeksPerJump as number,
              },
            }
          : {}),
      },
      state: { initialFuelTons: state.initialFuelTons },
    };
    validateShip(vessel.ship, vessel.state);
    createRouter(
      [],
      createClassicTraveller1981Rules(vessel.ship, vessel.state),
    );
    if (includeDesign && design !== undefined) {
      if (!isRecord(design)) return null;
      const allowed = [
        'displacementTons',
        'jumpDrive',
        'maneuverDrive',
        'powerPlant',
        'computer',
        'tankageTons',
        'streamlined',
        'custom',
        'manualPerformance',
      ];
      if (Object.keys(design).some((key) => !allowed.includes(key)))
        return null;
      for (const key of ['displacementTons', 'tankageTons']) {
        if (
          design[key] !== undefined &&
          (typeof design[key] !== 'number' || !Number.isFinite(design[key]))
        )
          return null;
      }
      for (const key of [
        'jumpDrive',
        'powerPlant',
        'computer',
        'maneuverDrive',
      ]) {
        const field = design[key];
        if (
          field !== undefined &&
          !(key === 'maneuverDrive' && field === null) &&
          typeof field !== 'string'
        )
          return null;
      }
      for (const key of ['streamlined', 'custom']) {
        if (design[key] !== undefined && typeof design[key] !== 'boolean')
          return null;
      }
      if (design.manualPerformance !== undefined) {
        if (
          !isRecord(design.manualPerformance) ||
          Object.keys(design.manualPerformance).some(
            (key) => !['jump', 'maneuver', 'plant'].includes(key),
          )
        )
          return null;
        for (const entry of Object.values(design.manualPerformance)) {
          if (
            !isRecord(entry) ||
            Object.keys(entry).some(
              (key) => !['rating', 'provenance'].includes(key),
            ) ||
            !Number.isInteger(entry.rating) ||
            (entry.rating as number) < 1 ||
            (entry.rating as number) > 6 ||
            typeof entry.provenance !== 'string' ||
            !entry.provenance.trim()
          )
            return null;
        }
      }
      vessel.design = design as VesselDesign;
    }
    return vessel;
  } catch {
    return null;
  }
}

export function decodeVessel(stored: string | null): Vessel {
  try {
    const value: unknown = JSON.parse(stored ?? 'null');
    if (!isRecord(value) || (value.version !== 1 && value.version !== 2))
      return DEFAULT_VESSEL;
    return parseVessel(value, value.version === 2) ?? DEFAULT_VESSEL;
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
    if (!parseVessel(vessel, true)) return false;
    window.localStorage.setItem(
      VESSEL_STORAGE_KEY,
      JSON.stringify({ version: 2, ...vessel }),
    );
    return true;
  } catch {
    return false;
  }
}
