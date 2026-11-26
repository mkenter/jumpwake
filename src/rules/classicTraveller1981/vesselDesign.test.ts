import { describe, expect, it } from 'vitest';
import { assessVesselDesign, type VesselDesign } from './vesselDesign';

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
      status: 'standard',
      jumpRating: 2,
      maneuverRating: 2,
      plantRating: 2,
      effectiveJump: 2,
      minimumTankageTons: 40,
    });
    expect(
      assessVesselDesign({ ...base, displacementTons: 200, tankageTons: 30 }),
    ).toMatchObject({
      status: 'standard',
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
      status: 'standard',
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
      () => 3,
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
