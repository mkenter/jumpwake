/** Edition-neutral main-world and system observations. Null means unknown. */
export interface WorldFacts {
  readonly size: number | null;
  readonly atmosphere: number | null;
  readonly hydrographics: number | null;
  readonly population: number | null;
  readonly populationMultiplier: number | null;
  readonly government: number | null;
  readonly law: number | null;
  readonly techLevel: number | null;
  readonly gasGiants: number | null;
  readonly belts: number | null;
  readonly bases: readonly string[] | null;
  readonly travelZone: 'amber' | 'red' | 'none' | null;
  /** An explicit mechanical restriction, independent of an advisory zone. */
  readonly travelProhibited?: boolean;
  /** Fields supplied by a referee rather than the source profile. */
  readonly refereeOverrides?: readonly string[];
}

/** Fill missing observations with referee-supplied values, preserving provenance. */
export function withRefereeOverrides(
  facts: WorldFacts,
  overrides: Partial<Omit<WorldFacts, 'refereeOverrides'>>,
): WorldFacts {
  const result = { ...facts };
  const marked = new Set(facts.refereeOverrides ?? []);
  for (const key of Object.keys(overrides) as (keyof typeof overrides)[]) {
    const value = overrides[key];
    if (value === undefined || value === null) continue;
    if (key !== 'travelProhibited' && facts[key] !== null)
      throw new Error(`Cannot override known ${key}`);
    if (
      [
        'size',
        'atmosphere',
        'population',
        'government',
        'law',
        'techLevel',
        'gasGiants',
        'belts',
      ].includes(key) &&
      (!Number.isInteger(value) ||
        (value as number) < 0 ||
        (value as number) > 33)
    )
      throw new RangeError(`Invalid ${key}`);
    if (
      key === 'populationMultiplier' &&
      (!Number.isInteger(value) ||
        (value as number) < 0 ||
        (value as number) > 9)
    )
      throw new RangeError('Invalid population multiplier');
    if (
      key === 'hydrographics' &&
      (!Number.isInteger(value) ||
        (value as number) < 0 ||
        (value as number) > 10)
    )
      throw new RangeError('Invalid hydrographics');
    if (
      key === 'travelZone' &&
      !['amber', 'red', 'none'].includes(value as string)
    )
      throw new Error('Invalid travel zone');
    if (key === 'travelProhibited' && typeof value !== 'boolean')
      throw new Error('Invalid travel restriction');
    if (
      key === 'bases' &&
      (!Array.isArray(value) ||
        value.some((base) => typeof base !== 'string' || !base.trim()))
    )
      throw new Error('Invalid bases');
    Object.assign(result, { [key]: value });
    marked.add(key);
  }
  return { ...result, refereeOverrides: [...marked] };
}
