import { describe, expect, it } from 'vitest';
import { parseSubsectors, demoChart } from '../../import/subsector';
import { createRouter } from '../../engine';
import { withRefereeOverrides } from '../worldFacts';
import {
  classicTraveller1981,
  describeWorldFacts,
  portFacilities,
  withFuelOverrides,
} from './index';

describe('CT81 world observations', () => {
  it('interprets size, ice, and unknown surface conservatively', () => {
    const result = parseSubsectors(
      'Hex\tName\tUWP\tPBG\n0101\tIce\tA805000-0\t000',
    );
    if (!result.ok) throw new Error(result.errors.join());
    const facts = result.charts[0]!.worlds[0]!.facts!;
    expect(describeWorldFacts(facts)).toEqual({
      size: '12800 km diameter',
      hydrographics: '50% — Ice caps',
    });
    expect(
      describeWorldFacts({ ...facts, size: 0, hydrographics: null }).size,
    ).toBe('Belt');
    expect(
      describeWorldFacts({ ...facts, atmosphere: null }).hydrographics,
    ).toContain('unknown');
    expect(
      describeWorldFacts({ ...facts, hydrographics: 0 }).hydrographics,
    ).toContain('No surface');
  });
  it('describes facilities and retains bundled fuel behavior', () => {
    expect(
      ['A', 'B', 'C', 'D', 'E', 'X'].map((port) => portFacilities(port as 'A')),
    ).toEqual([
      'Refined fuel and annual overhaul',
      'Refined fuel and annual overhaul',
      'Unrefined fuel and repairs',
      'Unrefined fuel; no repairs',
      'No facilities or fuel',
      'No starport',
    ]);
    expect(classicTraveller1981.fuelSources(demoChart.worlds[0]!).length).toBe(
      2,
    );
  });
  it('fills unknown fuel observations only with marked referee values', () => {
    const result = parseSubsectors(
      'Hex\tName\tUWP\tPBG\n0101\tUnknown\t?000000-0\t00?',
    );
    if (!result.ok) throw new Error(result.errors.join());
    const unknown = result.charts[0]!.worlds[0]!;
    expect(classicTraveller1981.fuelSources(unknown)).toHaveLength(0);
    const filled = withFuelOverrides(unknown, { starport: 'C', gasGiants: 1 });
    expect(filled.facts?.refereeOverrides).toEqual(['gasGiants', 'starport']);
    expect(classicTraveller1981.fuelSources(filled)).toHaveLength(2);
    expect(() => withFuelOverrides(filled, { gasGiants: 0 })).toThrow();
    expect(() => withFuelOverrides(unknown, { gasGiants: -1 })).toThrow();
  });
  it('keeps a red advisory traversable but honors a referee prohibition', () => {
    const result = parseSubsectors(
      'Hex\tName\tUWP\tPBG\tZone\n0101\tA\tA000000-0\t000\tR\n0102\tB\tA000000-0\t000\t',
    );
    if (!result.ok) throw new Error(result.errors.join());
    const [a, b] = result.charts[0]!.worlds;
    expect(
      createRouter([a!, b!], classicTraveller1981).findRoute(a!.id, b!.id)
        .status,
    ).toBe('reachable');
    const facts = withRefereeOverrides(a!.facts!, { travelProhibited: true });
    expect(facts.refereeOverrides).toContain('travelProhibited');
    expect(
      createRouter([{ ...a!, facts }, b!], classicTraveller1981).findRoute(
        a!.id,
        b!.id,
      ).status,
    ).toBe('unreachable');
    expect(() => withRefereeOverrides(a!.facts!, { size: 2 })).toThrow();
  });
});

it('snapshots visit permissions for origins and destinations despite later mutations', () => {
  const result = parseSubsectors(
    'Hex\tName\tUWP\tPBG\n0101\tA\tA000000-0\t000\n0102\tB\tA000000-0\t000',
  );
  if (!result.ok) throw new Error(result.errors.join());
  const [a, b] = result.charts[0]!.worlds;
  const facts = { ...a!.facts!, travelProhibited: false };
  const rules = { ...classicTraveller1981 };
  const router = createRouter([{ ...a!, facts }, b!], rules);
  facts.travelProhibited = true;
  rules.canVisit = () => false;
  expect(router.findRoute(a!.id, b!.id).status).toBe('reachable');
  expect(router.findRoute(b!.id, a!.id).status).toBe('reachable');
  const restricted = createRouter([{ ...a!, facts }, b!], classicTraveller1981);
  facts.travelProhibited = false;
  expect(restricted.findRoute(a!.id, b!.id).status).toBe('unreachable');
  expect(restricted.findRoute(b!.id, a!.id).status).toBe('unreachable');
});
