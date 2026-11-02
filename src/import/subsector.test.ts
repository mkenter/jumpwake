import { describe, expect, it } from 'vitest';
import { MAX_FILE_BYTES, parseSubsectors } from './subsector';
const header = 'Hex\tName\tUWP\tPBG';
const row = (hex = '0101', name = 'Étoile Long Name', pbg = '503') =>
  `${hex}\t${name}\tA867A99-C\t${pbg}`;
describe('T5 tab import', () => {
  it('normalizes all sixteen aligned subsectors without density assumptions', () => {
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) {
        const hex = `${String(x * 8 + 8).padStart(2, '0')}${String(y * 10 + 10).padStart(2, '0')}`;
        const result = parseSubsectors(`${header}\n${row(hex)}`);
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.charts[0]!.position).toBe(
            String.fromCharCode(65 + y * 4 + x),
          );
          expect(result.charts[0]!.worlds[0]).toMatchObject({
            hex: { column: 8, row: 10 },
            sourceHex: hex,
            name: 'Étoile Long Name',
            gasGiant: true,
          });
        }
      }
  });
  it('supports BOM, CRLF, comments, reordered and extra optional columns', () => {
    const result = parseSubsectors(
      '\uFEFF# Credit: custom\r\n\r\nPBG\tName\tExtra\tHex\tUWP\tRemarks\r\n500\tSame Name\tvalue\t0901\tX000000-0\t\r\n',
    );
    expect(result.ok).toBe(true);
    if (result.ok)
      expect(result.charts[0]).toMatchObject({
        position: 'B',
        comments: ['Credit: custom'],
        worlds: [
          { gasGiant: false, metadata: { Extra: 'value', Remarks: '' } },
        ],
      });
  });
  it('allows duplicate names and eHex gas giants across sparse sector charts', () => {
    const result = parseSubsectors(
      `${header}\n${row('0101', 'Same', '50A')}\n${row('3240', 'Same')}`,
    );
    expect(result.ok && result.charts.map((c) => c.position)).toEqual([
      'A',
      'P',
    ]);
  });
  it.each([
    '',
    'garbage',
    `${header}\n`,
    `${header}\n${row()}\n${row()}`,
    `${header}\n${row('0001')}`,
    `${header}\n${row('3341')}`,
    `${header}\n0101\tName\t???????-?\t???`,
    `${header}\n0101\tName\tA867A99-C\t`,
    `${header}\n${row()}\tunexpected`,
    '\uFFFD',
    'a'.repeat(MAX_FILE_BYTES + 1),
    '\n'.repeat(10001),
  ])('rejects invalid input atomically', (text) => {
    const result = parseSubsectors(text);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.length).toBeGreaterThan(0);
  });
  it('reports source lines and does not return a partial chart', () => {
    expect(
      parseSubsectors(`${header}\n${row()}\n${row('9999')}`),
    ).toMatchObject({
      ok: false,
      errors: [expect.stringContaining('Line 3: Hex')],
    });
  });
});
