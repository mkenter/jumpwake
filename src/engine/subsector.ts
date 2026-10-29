import type { AxialHex } from './hexDistance';

/** One-based Traveller address: even numbered columns are shifted down. */
export interface SubsectorHex {
  readonly column: number;
  readonly row: number;
}

export function toAxial({ column, row }: SubsectorHex): AxialHex {
  if (
    !Number.isInteger(column) ||
    column < 1 ||
    column > 8 ||
    !Number.isInteger(row) ||
    row < 1 ||
    row > 10
  ) {
    throw new RangeError(
      'Subsector addresses require columns 1–8 and rows 1–10',
    );
  }
  const q = column - 1;
  return { q, r: row - 1 - Math.floor(q / 2) };
}

export function fromAxial({ q, r }: AxialHex): SubsectorHex {
  const hex = { column: q + 1, row: r + Math.floor(q / 2) + 1 };
  toAxial(hex);
  return hex;
}
