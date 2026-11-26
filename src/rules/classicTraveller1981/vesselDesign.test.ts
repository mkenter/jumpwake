import { describe, expect, it } from 'vitest';
import {
  assessVesselDesign,
  createHullRowResolver,
  type VesselDesign,
} from './vesselDesign';

const base: VesselDesign = {
  displacementTons: 100,
  jumpDrive: 'A',
  maneuverDrive: 'A',
  powerPlant: 'A',
  computer: '1bis',
  tankageTons: 40,
  streamlined: true,
};

describe('CT81 operational design assessment', () => {
  it('assesses the supplied 100- and 200-ton examples', () => {
    expect(assessVesselDesign(base)).toMatchObject({
      status: 'assessed',
      jumpRating: 2,
      maneuverRating: 2,
      plantRating: 2,
      effectiveJump: 2,
      minimumTankageTons: 40,
    });
    expect(
      assessVesselDesign({ ...base, displacementTons: 200, tankageTons: 30 }),
    ).toMatchObject({
      status: 'assessed',
      jumpRating: 1,
      maneuverRating: 1,
      plantRating: 1,
      minimumTankageTons: 30,
    });
  });
  it('leaves unknown catalog combinations incomplete', () => {
    expect(
      assessVesselDesign({
        ...base,
        displacementTons: 800,
        jumpDrive: 'K',
        powerPlant: 'L',
        maneuverDrive: null,
      }),
    ).toMatchObject({ status: 'incomplete', jumpRating: 2 });
    expect(
      assessVesselDesign({ ...base, displacementTons: 110 }),
    ).toMatchObject({ status: 'incomplete' });
  });
  it('checks plant ordering and minimum tankage independently of aboard fuel', () => {
    expect(assessVesselDesign({ ...base, tankageTons: 39 })).toMatchObject({
      status: 'invalid',
      minimumTankageTons: 40,
    });
    expect(assessVesselDesign({ ...base, jumpDrive: 'K' })).toMatchObject({
      status: 'invalid',
    });
    expect(assessVesselDesign({ ...base, maneuverDrive: null })).toMatchObject({
      status: 'assessed',
      maneuverRating: 0,
    });
  });
  it('supports injected verified catalog data and custom designs', () => {
    const result = assessVesselDesign(
      {
        ...base,
        displacementTons: 300,
        custom: true,
        computer: '1bis',
        tankageTons: 130,
      },
      {
        resolveHullRow: (hull) => hull,
        lookup: () => ({ status: 'known', rating: 3 }),
      },
    );
    expect(result).toMatchObject({
      status: 'custom',
      effectiveJump: 2,
      minimumTankageTons: 120,
    });
  });
  it('rejects invalid hull and drive letters', () => {
    expect(assessVesselDesign({ ...base, displacementTons: 99 })).toMatchObject(
      { status: 'invalid' },
    );
    expect(assessVesselDesign({ ...base, jumpDrive: 'I' })).toMatchObject({
      status: 'invalid',
    });
  });
});

describe('catalog and assessment boundaries', () => {
  it('uses the next established row for an intermediate hull, but actual displacement for tankage', () => {
    const calls: number[] = [];
    const result = assessVesselDesign(
      { ...base, displacementTons: 150, tankageTons: 50 },
      {
        resolveHullRow: createHullRowResolver([100, 200], 100),
        lookup: (row) => {
          calls.push(row);
          return { status: 'known', rating: 2 };
        },
      },
    );
    expect(calls).toEqual([200, 200, 200]);
    expect(result).toMatchObject({
      status: 'assessed',
      minimumTankageTons: 50,
    });
  });
  it('does not guess adjacency from the sparse example catalog', () => {
    expect(
      assessVesselDesign({ ...base, displacementTons: 150 }),
    ).toMatchObject({
      status: 'incomplete',
      jumpRating: undefined,
      minimumTankageTons: undefined,
    });
  });
  it('distinguishes known invalid entries from absent or malformed catalog data', () => {
    const catalog = {
      resolveHullRow: (hull: number) => hull,
      lookup: () => ({ status: 'invalid' as const }),
    };
    expect(assessVesselDesign(base, catalog)).toMatchObject({
      status: 'invalid',
      jumpRating: undefined,
    });
    expect(
      assessVesselDesign(base, {
        ...catalog,
        lookup: () => ({ status: 'unavailable' }),
      }),
    ).toMatchObject({ status: 'incomplete' });
    expect(
      assessVesselDesign(base, {
        ...catalog,
        lookup: () => ({ status: 'known', rating: NaN }),
      }),
    ).toMatchObject({ status: 'incomplete' });
    expect(
      assessVesselDesign(base, { ...catalog, resolveHullRow: () => 99 }),
    ).toMatchObject({ status: 'incomplete' });
  });
  it('treats unknown computer models as missing reference data, including inherited property names', () => {
    for (const computer of ['3', 'toString', '__proto__']) {
      expect(assessVesselDesign({ ...base, computer })).toMatchObject({
        status: 'incomplete',
        effectiveJump: undefined,
      });
    }
    expect(assessVesselDesign({ ...base, computer: '2bis' })).toMatchObject({
      status: 'assessed',
      effectiveJump: 2,
    });
  });
  it('checks tankage boundaries without conflating it with current fuel', () => {
    expect(assessVesselDesign({ ...base, tankageTons: 40 })).toMatchObject({
      status: 'assessed',
    });
    expect(assessVesselDesign({ ...base, tankageTons: 100 })).toMatchObject({
      status: 'assessed',
    });
    for (const tankageTons of [39.9, 100.1, -1, NaN, Infinity]) {
      expect(assessVesselDesign({ ...base, tankageTons })).toMatchObject({
        status: 'invalid',
      });
    }
  });
  it('does not derive ratings for hulls outside the supported domain', () => {
    for (const displacementTons of [99, 5001, 100.5, NaN]) {
      expect(assessVesselDesign({ ...base, displacementTons })).toMatchObject({
        status: 'invalid',
        minimumTankageTons: undefined,
      });
    }
    expect(
      assessVesselDesign({ ...base, displacementTons: 5000 }),
    ).toMatchObject({ status: 'incomplete' });
  });
});

it('resolves intermediate hulls only within explicitly complete row coverage', () => {
  const rows = [100, 200, 400];
  const resolve = createHullRowResolver(rows, 100);
  rows.push(800);
  expect([99, 100, 101, 200, 201, 400, 401, 100.5].map(resolve)).toEqual([
    undefined,
    100,
    200,
    200,
    400,
    400,
    undefined,
    undefined,
  ]);
  expect(() => createHullRowResolver([200, 100], 100)).toThrow(RangeError);
  expect(() => createHullRowResolver([100, 100], 100)).toThrow(RangeError);
  expect(() => createHullRowResolver([], 100)).toThrow(RangeError);
});
