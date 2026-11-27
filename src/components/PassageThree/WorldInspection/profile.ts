const ehex = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/** Present source codes without treating unknown or invalid values as zero. */
export function decodeProfile(
  uwp: string | undefined,
  pbg: string | undefined,
) {
  if (!uwp || !/^[ABCDEX?][0-9A-HJ-NP-Z?]{6}-[0-9A-HJ-NP-Z?]$/.test(uwp))
    return null;
  const value = (code: string) => {
    const number = ehex.indexOf(code);
    return number < 0 ? 'Unknown' : String(number);
  };
  const field = (label: string, code: string, description = value(code)) => ({
    label,
    code,
    description,
  });
  const size = value(uwp[1]!);
  const hydro = value(uwp[3]!);
  const population = value(uwp[4]!);
  const fields = [
    field('Starport', uwp[0]!, uwp[0] === '?' ? 'Unknown' : `Class ${uwp[0]}`),
    field(
      'Size',
      uwp[1]!,
      size === 'Unknown'
        ? size
        : size === '0'
          ? 'Belt'
          : `${size},000 miles diameter`,
    ),
    field('Atmosphere', uwp[2]!),
    field(
      'Hydrographics',
      uwp[3]!,
      hydro === 'Unknown' || Number(hydro) > 10
        ? 'Unknown'
        : `${Number(hydro) * 10}% surface coverage`,
    ),
    field(
      'Population',
      uwp[4]!,
      population === 'Unknown'
        ? population
        : population === '0'
          ? 'Uninhabited'
          : `10^${population}`,
    ),
    field('Government', uwp[5]!),
    field('Law', uwp[6]!),
    field('Tech level', uwp[8]!),
  ];
  if (pbg && /^[0-9?][0-9A-HJ-NP-Z?]{2}$/.test(pbg)) {
    fields.push(
      field(
        'Population multiplier',
        pbg[0]!,
        pbg[0] === '?' ? 'Unknown' : `${pbg[0]} × population base`,
      ),
      field('Belts', pbg[1]!),
      field('Gas giants', pbg[2]!),
    );
  }
  return fields;
}
