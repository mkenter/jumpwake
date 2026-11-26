/** Operational checks based on CT81 Book 2 pp. 12–16, 20, 22–23.
 * These checks do not establish complete construction legality.
 */
export type DriveLetter = string;
/** Other models can be named even when their performance is not available. */
export type Computer = string;
export interface VesselDesign {
  displacementTons?: number;
  jumpDrive?: DriveLetter;
  maneuverDrive?: DriveLetter | null;
  powerPlant?: DriveLetter;
  computer?: Computer;
  tankageTons?: number;
  streamlined?: boolean;
  /** Indicates referee-supplied or nonstandard particulars. */
  custom?: boolean;
}
export type DriveKind = 'jump' | 'maneuver' | 'plant';
export type DriveLookup =
  | { readonly status: 'known'; readonly rating: number }
  | { readonly status: 'invalid' }
  | { readonly status: 'unavailable' };
/**
 * The resolver must use the next larger published row for an intermediate
 * hull, and return undefined if it cannot establish that row. A sparse list
 * of known rows alone is not enough to establish adjacency.
 */
export interface DriveCatalog {
  readonly resolveHullRow: (displacementTons: number) => number | undefined;
  readonly lookup: (
    rowTons: number,
    letter: DriveLetter,
    kind: DriveKind,
  ) => DriveLookup;
}
/**
 * Build a resolver from a complete, ordered sequence of published rows over
 * [firstCoveredHull, last row]. Callers must establish that no row is omitted.
 * Outside that covered interval the correct row is unknown.
 */
export function createHullRowResolver(
  rows: readonly number[],
  firstCoveredHull: number,
): (displacementTons: number) => number | undefined {
  if (
    rows.length === 0 ||
    !Number.isInteger(firstCoveredHull) ||
    firstCoveredHull < 100 ||
    firstCoveredHull > rows[0]! ||
    rows.some(
      (row, index) =>
        !Number.isInteger(row) ||
        row < 100 ||
        row > 5000 ||
        (index > 0 && row <= rows[index - 1]!),
    )
  )
    throw new RangeError(
      'Hull rows must be complete, increasing whole-ton rows within 100–5000.',
    );
  const establishedRows = [...rows];
  return (hull) =>
    Number.isInteger(hull) && hull >= firstCoveredHull
      ? establishedRows.find((row) => row >= hull)
      : undefined;
}
const unavailable: DriveLookup = { status: 'unavailable' };
/** Only the examples supplied with DEV-58 are included; row adjacency is unknown. */
export const exampleDriveCatalog: DriveCatalog = {
  resolveHullRow: (hull) => ([100, 200, 800].includes(hull) ? hull : undefined),
  lookup: (hull, letter, kind) => {
    if (letter === 'A' && hull === 100) return { status: 'known', rating: 2 };
    if (letter === 'A' && hull === 200) return { status: 'known', rating: 1 };
    if (letter === 'K' && hull === 800 && kind === 'jump')
      return { status: 'known', rating: 2 };
    return unavailable;
  },
};
export interface DesignAssessment {
  /** 'assessed' means only the modeled checks passed, not construction legality. */
  status: 'invalid' | 'incomplete' | 'custom' | 'assessed';
  issues: string[];
  jumpRating: number | undefined;
  maneuverRating: number | undefined;
  plantRating: number | undefined;
  /** Drive and computer limit only; software is not assessed. */
  effectiveJump: number | undefined;
  minimumTankageTons: number | undefined;
}
const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const computerJump: Readonly<Record<string, number | undefined>> = {
  '1bis': 2,
  '2bis': 3,
};
export function assessVesselDesign(
  design: VesselDesign,
  catalog: DriveCatalog = exampleDriveCatalog,
): DesignAssessment {
  const issues: string[] = [];
  let invalid = false;
  let incomplete = false;
  const bad = (message: string) => {
    invalid = true;
    issues.push(message);
  };
  const missing = (message: string) => {
    incomplete = true;
    issues.push(message);
  };
  const hull = design.displacementTons;
  const validHull =
    hull !== undefined && Number.isInteger(hull) && hull >= 100 && hull <= 5000;
  if (hull === undefined) missing('Displacement is required.');
  else if (!validHull)
    bad('Displacement must be a whole number from 100 to 5000 tons.');
  const row = validHull ? catalog.resolveHullRow(hull) : undefined;
  const validRow =
    row !== undefined && Number.isInteger(row) && row >= hull! && row <= 5000;
  if (validHull && row === undefined)
    missing('Drive-potential row is unavailable for this hull.');
  else if (validHull && !validRow)
    missing('Drive-potential row supplied by the catalog is invalid.');
  const drive = (
    letter: string | undefined,
    name: string,
    kind: DriveKind,
  ): number | undefined => {
    if (!letter) {
      missing(`${name} is required.`);
      return undefined;
    }
    if (letter.length !== 1 || !letters.includes(letter)) {
      bad(`${name} must be a drive letter A–Z excluding I and O.`);
      return undefined;
    }
    if (!validRow || row === undefined) return undefined;
    const result = catalog.lookup(row, letter, kind);
    if (result.status === 'invalid')
      bad(`${name} is not valid for the resolved hull row.`);
    else if (result.status === 'unavailable')
      missing(
        `${name} performance is unavailable for this hull; reference data is incomplete.`,
      );
    else if (!Number.isInteger(result.rating) || result.rating < 1)
      missing(`${name} catalog rating is invalid or unavailable.`);
    else return result.rating;
    return undefined;
  };
  const jumpRating = drive(design.jumpDrive, 'Jump drive', 'jump');
  const maneuverRating =
    design.maneuverDrive === null
      ? 0
      : drive(
          design.maneuverDrive,
          'Maneuver drive (or select none)',
          'maneuver',
        );
  const plantRating = drive(design.powerPlant, 'Power plant', 'plant');
  if (
    design.powerPlant &&
    design.powerPlant.length === 1 &&
    letters.includes(design.powerPlant)
  ) {
    for (const installed of [design.jumpDrive, design.maneuverDrive]) {
      if (
        installed &&
        installed.length === 1 &&
        letters.includes(installed) &&
        letters.indexOf(design.powerPlant) < letters.indexOf(installed)
      )
        bad(
          'Power plant letter must be at least as large as each installed drive.',
        );
    }
  }
  let computerLimit: number | undefined;
  if (!design.computer)
    missing('Computer is required to calculate effective jump.');
  else {
    computerLimit = Object.hasOwn(computerJump, design.computer)
      ? computerJump[design.computer]
      : undefined;
    if (computerLimit === undefined)
      missing(
        'Computer jump capability is unavailable in the supplied reference data.',
      );
  }
  if (design.streamlined === undefined)
    missing('Streamlining must be specified.');
  else if (typeof design.streamlined !== 'boolean')
    bad('Streamlining must be a boolean.');
  const minimumTankageTons =
    validHull && jumpRating !== undefined && plantRating !== undefined
      ? (hull * jumpRating) / 10 + 10 * plantRating
      : undefined;
  if (design.tankageTons === undefined)
    missing('Installed tankage is required.');
  else if (
    !Number.isFinite(design.tankageTons) ||
    design.tankageTons < 0 ||
    (validHull && design.tankageTons > hull)
  )
    bad('Installed tankage must be between zero and displacement.');
  else if (
    minimumTankageTons !== undefined &&
    design.tankageTons < minimumTankageTons
  )
    bad(`Installed tankage must be at least ${minimumTankageTons} tons.`);
  return {
    status: invalid
      ? 'invalid'
      : incomplete
        ? 'incomplete'
        : design.custom
          ? 'custom'
          : 'assessed',
    issues,
    jumpRating,
    maneuverRating,
    plantRating,
    minimumTankageTons,
    effectiveJump:
      jumpRating !== undefined && computerLimit !== undefined
        ? Math.min(jumpRating, computerLimit)
        : undefined,
  };
}
