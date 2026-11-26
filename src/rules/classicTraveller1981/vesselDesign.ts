/** Operational design assessment. CT81 Book 2 pp. 12–16, 20, 22–23.
 * Catalog entries are deliberately limited to the examples supplied for DEV-58.
 */
export type DriveLetter = string;
export type Computer = '1bis' | '2bis';
export interface VesselDesign {
  displacementTons?: number;
  jumpDrive?: DriveLetter;
  maneuverDrive?: DriveLetter | null;
  powerPlant?: DriveLetter;
  computer?: Computer;
  tankageTons?: number;
  streamlined?: boolean;
  /** Nonstandard particulars are referee decisions, not certified standard designs. */
  custom?: boolean;
}
export type DriveCatalog = (
  hullTons: number,
  letter: DriveLetter,
  kind: 'jump' | 'maneuver' | 'plant',
) => number | undefined;
export const exampleDriveCatalog: DriveCatalog = (hull, letter, kind) => {
  if (letter === 'A' && hull === 100) return 2;
  if (letter === 'A' && hull === 200) return 1;
  if (letter === 'K' && hull === 800 && kind === 'jump') return 2;
  return undefined;
};
export interface DesignAssessment {
  status: 'invalid' | 'incomplete' | 'custom' | 'standard';
  issues: string[];
  jumpRating: number | undefined;
  maneuverRating: number | undefined;
  plantRating: number | undefined;
  effectiveJump: number | undefined;
  minimumTankageTons: number | undefined;
}
const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const computerJump: Record<Computer, number> = { '1bis': 2, '2bis': 3 };
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
  if (hull === undefined) missing('Displacement is required.');
  else if (!Number.isInteger(hull) || hull < 100 || hull > 5000)
    bad('Displacement must be a whole number from 100 to 5000 tons.');
  const drive = (
    letter: string | undefined,
    name: string,
    kind: 'jump' | 'maneuver' | 'plant',
  ): number | undefined => {
    if (!letter) {
      missing(`${name} is required.`);
      return undefined;
    }
    if (letter.length !== 1 || !letters.includes(letter)) {
      bad(`${name} must be a drive letter A–Z excluding I and O.`);
      return undefined;
    }
    if (
      hull === undefined ||
      !Number.isInteger(hull) ||
      hull < 100 ||
      hull > 5000
    )
      return undefined;
    const rating = catalog(hull, letter, kind);
    if (rating === undefined)
      missing(
        `${name} performance is unavailable for this hull; reference data is incomplete.`,
      );
    else if (!Number.isInteger(rating) || rating < 1 || rating > 6) {
      bad(`${name} catalog rating is invalid.`);
      return undefined;
    }
    return rating;
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
    letters.includes(design.powerPlant) &&
    design.powerPlant.length === 1
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
  if (!design.computer)
    missing('Computer is required to calculate effective jump.');
  else if (!(design.computer in computerJump))
    bad('Computer model is invalid.');
  if (design.streamlined === undefined)
    missing('Streamlining must be specified.');
  else if (typeof design.streamlined !== 'boolean')
    bad('Streamlining must be a boolean.');
  const minimumTankageTons =
    hull !== undefined && jumpRating !== undefined && plantRating !== undefined
      ? 0.1 * hull * jumpRating + 10 * plantRating
      : undefined;
  if (design.tankageTons === undefined)
    missing('Installed tankage is required.');
  else if (
    !Number.isFinite(design.tankageTons) ||
    design.tankageTons < 0 ||
    (hull !== undefined && design.tankageTons > hull)
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
          : 'standard',
    issues,
    jumpRating,
    maneuverRating,
    plantRating,
    minimumTankageTons,
    effectiveJump:
      jumpRating !== undefined &&
      design.computer &&
      design.computer in computerJump
        ? Math.min(jumpRating, computerJump[design.computer])
        : undefined,
  };
}
