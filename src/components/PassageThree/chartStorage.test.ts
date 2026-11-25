import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CHART_STORAGE_KEY,
  forgetChart,
  restoreChart,
  saveChart,
} from './chartStorage';
import { parseSubsectors } from '../../import/subsector';

const text =
  '# Attribution\nHex\tName\tUWP\tPBG\n0101\tFirst\tA000000-0\t000\n0901\tSecond\tA000000-0\t000\n';
const parsed = parseSubsectors(text, 'sector.tab');
if (!parsed.ok) throw new Error('Invalid fixture');
const imported = {
  text,
  source: 'sector.tab',
  selected: 'B',
  charts: parsed.charts,
};

describe('imported chart storage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });
  it('restores all subsectors, selected position and attribution by reparsing', () => {
    expect(saveChart(imported)).toBe(true);
    expect(restoreChart()).toEqual(imported);
    expect(restoreChart()?.charts[1]?.comments).toEqual(['Attribution']);
  });
  it('rejects corrupt, obsolete, invalid and mismatched data', () => {
    for (const value of [
      '{',
      JSON.stringify({ version: 2, ...imported }),
      JSON.stringify({ version: 1, ...imported, text: 'bad' }),
      JSON.stringify({ version: 1, ...imported, selected: 'P' }),
    ]) {
      localStorage.setItem(CHART_STORAGE_KEY, value);
      expect(restoreChart()).toBeNull();
    }
  });
  it('forgets only chart data', () => {
    localStorage.setItem('jumpwake.vessel', 'vessel');
    saveChart(imported);
    expect(forgetChart()).toBe(true);
    expect(restoreChart()).toBeNull();
    expect(localStorage.getItem('jumpwake.vessel')).toBe('vessel');
  });
  it('handles unavailable storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(restoreChart()).toBeNull();
    expect(saveChart(imported)).toBe(false);
    expect(forgetChart()).toBe(false);
  });
});
