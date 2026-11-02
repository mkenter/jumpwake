import type { StarSystem } from '../rules/classicTraveller1981';
import { EMBER_REACH } from '../data/emberReach';
export type ChartWorld = StarSystem & {
  readonly note?: string;
  readonly sourceHex?: string;
  readonly metadata?: Readonly<Record<string, string>>;
};
export type Subsector = {
  readonly title: string;
  readonly source: string;
  readonly position?: string;
  readonly worlds: readonly ChartWorld[];
  readonly comments?: readonly string[];
};
export const demoChart: Subsector = {
  title: 'Ember Reach',
  source: 'Original fictional demonstration',
  worlds: EMBER_REACH,
};
export const MAX_FILE_BYTES = 2 * 1024 * 1024;
export type ImportResult =
  { ok: true; charts: Subsector[] } | { ok: false; errors: string[] };
const ehex = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
/** Strict, atomic T5 tab import. No browser or routing dependencies. */
export function parseSubsectors(
  text: string,
  source = 'Local file',
): ImportResult {
  const errors: string[] = [];
  if (new TextEncoder().encode(text).length > MAX_FILE_BYTES)
    return { ok: false, errors: ['File exceeds 2 MiB.'] };
  if (
    text.includes('\uFFFD') ||
    Array.from(text).some(
      (char) => char.charCodeAt(0) < 32 && !'\t\r\n'.includes(char),
    )
  )
    return { ok: false, errors: ['Invalid UTF-8 or control characters.'] };
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  if (lines.length > 10000)
    return { ok: false, errors: ['Input exceeds 10,000 lines.'] };
  let headers: string[] | undefined;
  const comments: string[] = [],
    seen = new Set<string>(),
    groups = new Map<number, ChartWorld[]>();
  let count = 0;
  lines.forEach((line, i) => {
    if (!line.trim()) return;
    if (line.startsWith('#')) {
      comments.push(line.slice(1).trim());
      return;
    }
    const fields = line.split('\t').map((x) => x.trim());
    const fail = (message: string) => errors.push(`Line ${i + 1}: ${message}`);
    if (!headers) {
      headers = fields;
      for (const key of ['Hex', 'Name', 'UWP', 'PBG'])
        if (!headers.includes(key))
          fail(`Missing required header ${key}; use T5 Tab Delimited data.`);
      if (new Set(headers).size !== headers.length)
        fail('Duplicate column headers.');
      return;
    }
    count++;
    if (count > 1280) {
      if (count === 1281) fail('More than 1,280 world records.');
      return;
    }
    const before = errors.length;
    if (fields.length !== headers.length)
      fail('Field count differs from header; retain tabs for empty fields.');
    const data = Object.fromEntries(
      headers.map((key, j) => [key, fields[j] ?? '']),
    );
    const hex = data.Hex ?? '',
      uwp = data.UWP ?? '',
      pbg = data.PBG ?? '';
    const column = Number(hex.slice(0, 2)),
      row = Number(hex.slice(2));
    if (
      !/^\d{4}$/.test(hex) ||
      column < 1 ||
      column > 32 ||
      row < 1 ||
      row > 40
    )
      fail('Hex must be 0101–3240 (columns 01–32, rows 01–40).');
    if (seen.has(hex)) fail(`Duplicate coordinates ${hex}.`);
    seen.add(hex);
    if (!/^[ABCDEX][0-9A-HJ-NP-Z]{6}-[0-9A-HJ-NP-Z]$/.test(uwp))
      fail(
        'UWP requires a known A–E/X starport and seven eHex values, e.g. A867A99-C; unknown fuel data cannot be routed.',
      );
    if (!/^[0-9][0-9A-HJ-NP-Z]{2}$/.test(pbg))
      fail(
        'PBG requires a population digit and belt/gas-giant eHex values, e.g. 503; unknown gas giants cannot be routed.',
      );
    if (!data.Name) fail('Name must be supplied.');
    if (errors.length !== before) return;
    const index = Math.floor((row - 1) / 10) * 4 + Math.floor((column - 1) / 8);
    const worlds = groups.get(index) ?? [];
    worlds.push({
      id: `hex-${hex}`,
      name: data.Name!,
      hex: { column: ((column - 1) % 8) + 1, row: ((row - 1) % 10) + 1 },
      starport: uwp[0] as StarSystem['starport'],
      gasGiant: ehex.indexOf(pbg[2]!) > 0,
      sourceHex: hex,
      metadata: data,
    });
    groups.set(index, worlds);
  });
  if (!count)
    errors.push('No world records found; select a T5 Tab Delimited file.');
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    charts: [...groups]
      .sort(([a], [b]) => a - b)
      .map(([index, worlds]) => ({
        title: `${source} · Subsector ${String.fromCharCode(65 + index)}`,
        position: String.fromCharCode(65 + index),
        source,
        comments,
        worlds,
      })),
  };
}
