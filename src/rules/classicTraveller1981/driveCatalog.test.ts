import { describe, expect, it } from 'vitest';
import {
  DRIVE_LETTERS,
  HULL_ROWS,
  MAX_DRIVE_CATALOG_BYTES,
  catalogCoverage,
  makeDriveCatalog,
  parseDriveCatalog,
} from './driveCatalog';
import { assessVesselDesign } from './vesselDesign';
const json = (rows: object) =>
  JSON.stringify({
    version: 1,
    edition: 'CT81',
    provenance: 'Synthetic test',
    rows,
  });
const design = {
  displacementTons: 110,
  jumpDrive: 'A',
  maneuverDrive: 'A',
  powerPlant: 'A',
  computer: '1',
  tankageTons: 31,
  streamlined: true,
};
describe('private drive catalogs', () => {
  it('supports partial and complete synthetic coverage with one matrix for all drives', () => {
    const partial = parseDriveCatalog(json({ 200: { A: 1, D: null } }));
    expect(catalogCoverage(partial)).toMatchObject({
      count: 2,
      complete: false,
    });
    expect(assessVesselDesign(design, makeDriveCatalog(partial))).toMatchObject(
      {
        status: 'assessed',
        jumpRating: 1,
        maneuverRating: 1,
        plantRating: 1,
        minimumTankageTons: 21,
      },
    );
    expect(makeDriveCatalog(partial).lookup(200, 'D', 'jump').status).toBe(
      'invalid',
    );
    expect(makeDriveCatalog(partial).lookup(200, 'B', 'plant').status).toBe(
      'unavailable',
    );
    const full = parseDriveCatalog(
      json(
        Object.fromEntries(
          HULL_ROWS.map((row) => [
            row,
            Object.fromEntries(
              [...DRIVE_LETTERS].map((letter) => [letter, null]),
            ),
          ]),
        ),
      ),
    );
    expect(catalogCoverage(full).complete).toBe(true);
    for (const row of HULL_ROWS)
      for (const letter of DRIVE_LETTERS)
        expect(
          makeDriveCatalog(full).lookup(row, letter, 'maneuver').status,
        ).toBe('invalid');
  });
  it('rejects malformed, duplicate and unsupported data', () => {
    for (const input of [
      '{"version":1,"version":1}',
      json({ 101: { A: 1 } }),
      json({ 100: { I: 1 } }),
      json({ 100: { A: 7 } }),
      json({ 100: { A: 0 } }),
      json({ 100: { A: 1.5 } }),
      json({ 100: { A: '1' } }),
      '{',
    ])
      expect(() => parseDriveCatalog(input)).toThrow();
  });
  it('bounds catalog text in UTF-8 bytes before parsing', () => {
    expect(() =>
      parseDriveCatalog('x'.repeat(MAX_DRIVE_CATALOG_BYTES + 1)),
    ).toThrow('2 MiB');
    expect(() =>
      parseDriveCatalog(json({}) + 'é'.repeat(MAX_DRIVE_CATALOG_BYTES / 2)),
    ).toThrow('2 MiB');
  });
  it('uses referee performance only for missing data, with provenance', () => {
    const manualPerformance = Object.fromEntries(
      ['jump', 'maneuver', 'plant'].map((kind) => [
        kind,
        { rating: 2, provenance: 'Referee notes' },
      ]),
    );
    const empty = makeDriveCatalog(parseDriveCatalog(json({})));
    expect(
      assessVesselDesign(
        { ...design, manualPerformance, tankageTons: 42 },
        empty,
      ),
    ).toMatchObject({ status: 'custom', minimumTankageTons: 42 });
    const impossible = makeDriveCatalog(
      parseDriveCatalog(json({ 200: { A: null } })),
    );
    expect(
      assessVesselDesign({ ...design, manualPerformance }, impossible).status,
    ).toBe('invalid');
  });
  it('resolves all hull boundaries and ordinary computers', () => {
    const catalog = makeDriveCatalog(
      parseDriveCatalog(json({ 100: { A: 2 }, 200: { A: 1 }, 800: { K: 2 } })),
    );
    for (const [i, row] of HULL_ROWS.entries()) {
      expect(catalog.resolveHullRow(row)).toBe(row);
      if (i) expect(catalog.resolveHullRow(HULL_ROWS[i - 1]! + 1)).toBe(row);
    }
    for (const [computer, limit] of [
      ['1', 1],
      ['2', 2],
      ['3', 3],
      ['4', 4],
      ['5', 5],
      ['6', 6],
      ['7', 7],
      ['1bis', 2],
      ['2bis', 3],
    ] as const)
      expect(
        assessVesselDesign(
          { ...design, displacementTons: 100, tankageTons: 40, computer },
          catalog,
        ).effectiveJump,
      ).toBe(Math.min(2, limit));
    expect(
      assessVesselDesign(
        {
          ...design,
          displacementTons: 800,
          jumpDrive: 'K',
          maneuverDrive: 'K',
          powerPlant: 'K',
          tankageTons: 200,
        },
        catalog,
      ),
    ).toMatchObject({ jumpRating: 2, maneuverRating: 2, plantRating: 2 });
  });
});
