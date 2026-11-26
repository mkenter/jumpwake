import {
  parseDriveCatalog,
  type PrivateDriveCatalog,
} from '../../rules/classicTraveller1981/driveCatalog';

export const KEY = 'jumpwake.private-drive-catalog.v1';
export function loadDriveCatalog(): PrivateDriveCatalog | null {
  try {
    const text = localStorage.getItem(KEY);
    return text ? parseDriveCatalog(text) : null;
  } catch {
    return null;
  }
}
