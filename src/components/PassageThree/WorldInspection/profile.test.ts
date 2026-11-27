import { describe, expect, it } from 'vitest';
import { decodeProfile } from './profile';

describe('source profile presentation', () => {
  it('decodes fields and preserves extended codes and counts', () => {
    const fields = decodeProfile('A867A99-C', '50J');
    expect(fields).toContainEqual({
      label: 'Size',
      code: '8',
      description: '8,000 miles diameter',
    });
    expect(fields).toContainEqual({
      label: 'Population',
      code: 'A',
      description: '10^10',
    });
    expect(fields).toContainEqual({
      label: 'Tech level',
      code: 'C',
      description: '12',
    });
    expect(fields).toContainEqual({
      label: 'Gas giants',
      code: 'J',
      description: '18',
    });
  });
  it('keeps unknowns, zero, and unsupported hydrographics distinct', () => {
    const fields = decodeProfile('?0?Z0??-?', '?0?');
    expect(fields).toContainEqual({
      label: 'Size',
      code: '0',
      description: 'Belt',
    });
    expect(fields).toContainEqual({
      label: 'Hydrographics',
      code: 'Z',
      description: 'Unknown',
    });
    expect(fields).toContainEqual({
      label: 'Population',
      code: '0',
      description: 'Uninhabited',
    });
    expect(fields).toContainEqual({
      label: 'Gas giants',
      code: '?',
      description: 'Unknown',
    });
    expect(decodeProfile(undefined, undefined)).toBeNull();
    expect(decodeProfile('invalid', '000')).toBeNull();
    expect(decodeProfile('A000000-0', undefined)).toHaveLength(8);
  });
});
