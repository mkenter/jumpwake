import { createHullRowResolver, type DriveCatalog } from './vesselDesign';

export const HULL_ROWS = [
  100, 200, 400, 600, 800, 1000, 2000, 3000, 4000, 5000,
] as const;
export const MAX_DRIVE_CATALOG_BYTES = 2 * 1024 * 1024;
export const DRIVE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
export interface PrivateDriveCatalog {
  version: 1;
  edition: 'CT81';
  provenance: string;
  rows: Record<string, Record<string, number | null>>;
}

// JSON.parse normally discards duplicate members. Walk the JSON syntax first so
// duplicate spellings (including escaped keys) cannot hide a conflicting value.
function rejectDuplicateKeys(text: string) {
  let i = 0;
  const whitespace = () => {
    while (/\s/.test(text[i] ?? '') && i < text.length) i++;
  };
  const string = () => {
    const start = i++;
    while (i < text.length) {
      if (text[i] === '\\') {
        i += 2;
        continue;
      }
      if (text[i++] === '"') return JSON.parse(text.slice(start, i)) as string;
    }
    throw new Error('Unterminated string');
  };
  const value = (): void => {
    whitespace();
    if (text[i] === '{') {
      i++;
      whitespace();
      const keys = new Set<string>();
      while (text[i] !== '}') {
        if (text[i] !== '"') throw new Error('Expected key');
        const key = string();
        if (keys.has(key)) throw new Error(`Duplicate key: ${key}`);
        keys.add(key);
        whitespace();
        if (text[i++] !== ':') throw new Error('Expected colon');
        value();
        whitespace();
        if (text[i] !== ',') break;
        i++;
        whitespace();
      }
      if (text[i++] !== '}') throw new Error('Expected closing brace');
    } else if (text[i] === '[') {
      i++;
      whitespace();
      while (text[i] !== ']') {
        value();
        whitespace();
        if (text[i] !== ',') break;
        i++;
      }
      if (text[i++] !== ']') throw new Error('Expected closing bracket');
    } else if (text[i] === '"') string();
    else {
      while (i < text.length && !/[\s,}\]]/.test(text[i]!)) i++;
    }
  };
  value();
}
const object = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
export function parseDriveCatalog(text: string): PrivateDriveCatalog {
  if (
    text.length > MAX_DRIVE_CATALOG_BYTES ||
    new TextEncoder().encode(text).byteLength > MAX_DRIVE_CATALOG_BYTES
  )
    throw new Error('Catalog exceeds the 2 MiB limit');
  rejectDuplicateKeys(text);
  const data: unknown = JSON.parse(text);
  if (
    !object(data) ||
    Object.keys(data).sort().join(',') !== 'edition,provenance,rows,version' ||
    data.version !== 1 ||
    data.edition !== 'CT81' ||
    typeof data.provenance !== 'string' ||
    !data.provenance.trim() ||
    !object(data.rows)
  )
    throw new Error('Invalid catalog header');
  for (const [row, entries] of Object.entries(data.rows)) {
    if (!HULL_ROWS.some((n) => String(n) === row) || !object(entries))
      throw new Error(`Invalid hull row: ${row}`);
    for (const [letter, rating] of Object.entries(entries)) {
      if (
        letter.length !== 1 ||
        !DRIVE_LETTERS.includes(letter) ||
        (rating !== null &&
          (typeof rating !== 'number' ||
            !Number.isInteger(rating) ||
            rating < 1 ||
            rating > 6))
      )
        throw new Error(`Invalid drive entry: ${row}/${letter}`);
    }
  }
  return data as unknown as PrivateDriveCatalog;
}
export function catalogCoverage(data: PrivateDriveCatalog) {
  const count = HULL_ROWS.reduce(
    (sum, row) => sum + Object.keys(data.rows[String(row)] ?? {}).length,
    0,
  );
  return {
    count,
    total: HULL_ROWS.length * DRIVE_LETTERS.length,
    complete: count === HULL_ROWS.length * DRIVE_LETTERS.length,
  };
}
export function makeDriveCatalog(data: PrivateDriveCatalog): DriveCatalog {
  return {
    resolveHullRow: createHullRowResolver(HULL_ROWS, 100),
    lookup: (row, letter) => {
      const value = data.rows[String(row)]?.[letter];
      return value === undefined
        ? { status: 'unavailable' }
        : value === null
          ? { status: 'invalid' }
          : { status: 'known', rating: value };
    },
  };
}
