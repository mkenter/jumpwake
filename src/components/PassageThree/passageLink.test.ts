import { describe, expect, it } from 'vitest';
import { demoChart, parseSubsectors } from '../../import/subsector';
import { DEFAULT_VESSEL } from './vessel';
import {
  chartDigest,
  decodePassage,
  encodePassage,
  passageMatchesChart,
  type PassageLink,
} from './passageLink';

const link: PassageLink = {
  version: 1,
  chart: { kind: 'demo' },
  origin: 'aster',
  destination: 'cinder',
  preference: 'lowest-fuel-cost',
  vessel: DEFAULT_VESSEL,
};

describe('passage links', () => {
  it('round trips and verifies a reachable bundled passage', () => {
    const decoded = decodePassage(encodePassage(link));
    expect(decoded).toEqual(link);
    expect(passageMatchesChart(decoded!, demoChart)).toBe(true);
    expect(passageMatchesChart({ ...link, origin: 'missing' }, demoChart)).toBe(
      false,
    );
  });
  it('round trips ordered stops and the itinerary mode', () => {
    const itinerary: PassageLink = {
      ...link,
      version: 2,
      stops: ['brass'],
      mode: 'direct',
    };
    expect(decodePassage(encodePassage(itinerary))).toEqual(itinerary);
    expect(passageMatchesChart(itinerary, demoChart)).toBe(true);
    expect(
      passageMatchesChart({ ...itinerary, stops: ['missing'] }, demoChart),
    ).toBe(false);
  });
  it('rejects malformed, oversized, unsupported and invalid vessel payloads', () => {
    expect(decodePassage('!')).toBeNull();
    expect(decodePassage('a'.repeat(2049))).toBeNull();
    expect(
      decodePassage(
        encodePassage({ ...link, version: 2 } as unknown as PassageLink),
      ),
    ).toBeNull();
    expect(
      decodePassage(
        encodePassage({
          ...link,
          vessel: { ...link.vessel, state: { initialFuelTons: -1 } },
        }),
      ),
    ).toBeNull();
  });
  it('distinguishes data and subsectors independently of filenames', async () => {
    const text =
      'Hex\tName\tUWP\tPBG\n0101\tOne\tA867A99-C\t503\n0901\tTwo\tA867A99-C\t503';
    expect(await chartDigest(text)).not.toBe(await chartDigest(text + 'x'));
    const parsed = parseSubsectors(text, 'one');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const imported: PassageLink = {
      ...link,
      chart: {
        kind: 'import',
        digest: await chartDigest(text),
        position: 'B',
        hint: 'one',
      },
    };
    expect(passageMatchesChart(imported, parsed.charts[0]!)).toBe(false);
  });
});
