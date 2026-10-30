import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  decodeVessel,
  DEFAULT_VESSEL,
  restoreVessel,
  saveVessel,
  VESSEL_STORAGE_KEY,
} from './vessel';

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('vessel persistence', () => {
  const vessel = {
    ship: {
      ...DEFAULT_VESSEL.ship,
      displacementTons: 100,
      jumpRating: 2,
      jumpFuelCapacityTons: 27,
      hasFuelScoops: false,
    },
    state: { initialFuelTons: 13 },
  };
  it('round-trips a validated, versioned vessel', () => {
    expect(saveVessel(vessel)).toBe(true);
    expect(JSON.parse(localStorage.getItem(VESSEL_STORAGE_KEY)!)).toEqual({
      version: 1,
      ...vessel,
    });
    expect(restoreVessel()).toEqual(vessel);
  });
  it.each([
    null,
    '',
    '{oops',
    'null',
    '[]',
    '{}',
    JSON.stringify({ version: 2, ...vessel }),
    JSON.stringify({ version: 1, ship: null, state: vessel.state }),
    JSON.stringify({
      version: 1,
      ship: { ...vessel.ship, displacementTons: '100' },
      state: vessel.state,
    }),
    JSON.stringify({
      version: 1,
      ship: { ...vessel.ship, displacementTons: 105 },
      state: vessel.state,
    }),
    JSON.stringify({
      version: 1,
      ship: { ...vessel.ship, hasFuelScoops: 1 },
      state: vessel.state,
    }),
    JSON.stringify({ version: 1, ...vessel, state: { initialFuelTons: 28 } }),
    JSON.stringify({ version: 1, ...vessel, state: { initialFuelTons: 0.5 } }),
  ])('falls back for malformed, obsolete or invalid data: %s', (stored) => {
    expect(decodeVessel(stored)).toEqual(DEFAULT_VESSEL);
  });
  it('works without browser storage access', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(restoreVessel()).toEqual(DEFAULT_VESSEL);
    expect(saveVessel(vessel)).toBe(false);
  });
});
