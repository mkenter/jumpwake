import { useRef, useState, type ChangeEvent } from 'react';
import {
  assessVesselDesign,
  exampleDriveCatalog,
} from '../../rules/classicTraveller1981/vesselDesign';
import {
  MAX_DRIVE_CATALOG_BYTES,
  catalogCoverage,
  makeDriveCatalog,
  parseDriveCatalog,
  type PrivateDriveCatalog,
} from '../../rules/classicTraveller1981/driveCatalog';
import styles from './DriveCatalogPanel.module.css';

import { KEY, loadDriveCatalog } from './catalogStorage';
export function DriveCatalogPanel({
  onCatalogChange,
}: {
  onCatalogChange?: (catalog: PrivateDriveCatalog | null) => void;
}) {
  const importVersion = useRef(0);
  const [catalog, setCatalog] = useState(loadDriveCatalog);
  const [message, setMessage] = useState('');
  const [hull, setHull] = useState(100);
  const [letter, setLetter] = useState('A');
  const [computer, setComputer] = useState('1');
  const [manual, setManual] = useState('');
  const [source, setSource] = useState('');
  const assessment = assessVesselDesign(
    {
      displacementTons: hull,
      jumpDrive: letter,
      maneuverDrive: letter,
      powerPlant: letter,
      computer,
      tankageTons: hull,
      streamlined: true,
      ...(manual
        ? {
            manualPerformance: Object.fromEntries(
              ['jump', 'maneuver', 'plant'].map((kind) => [
                kind,
                { rating: Number(manual), provenance: source },
              ]),
            ),
          }
        : {}),
    },
    catalog ? makeDriveCatalog(catalog) : exampleDriveCatalog,
  );
  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const version = ++importVersion.current;
    try {
      if (file.size > MAX_DRIVE_CATALOG_BYTES)
        throw new Error('Catalog exceeds the 2 MiB limit');
      const text = await file.text();
      if (version !== importVersion.current) return;
      const next = parseDriveCatalog(text);
      localStorage.setItem(KEY, text);
      setCatalog(next);
      onCatalogChange?.(next);
      setMessage('Catalog imported locally.');
    } catch (error) {
      if (version !== importVersion.current) return;
      setMessage(
        `Import failed: ${error instanceof Error ? error.message : 'storage unavailable'}`,
      );
    }
  }
  function remove() {
    importVersion.current++;
    try {
      localStorage.removeItem(KEY);
      setCatalog(null);
      onCatalogChange?.(null);
      setMessage('Catalog removed.');
    } catch {
      setMessage('Could not remove the catalog from local storage.');
    }
  }
  const coverage = catalog && catalogCoverage(catalog);
  return (
    <details className={styles.panel}>
      <summary>Operational vessel reference</summary>
      <p>
        Assessment only; this does not certify construction legality. Catalogs
        stay on this device and are not shared in passage links.
      </p>
      <label>
        Import drive catalog JSON{' '}
        <input
          type="file"
          accept=".json,application/json"
          onChange={importFile}
        />
      </label>
      <p>
        {catalog && coverage
          ? `Source: ${catalog.provenance} — ${coverage.complete ? 'complete' : 'partial'} coverage (${coverage.count}/${coverage.total}).`
          : 'No private catalog loaded; supplied examples are in use.'}
      </p>
      {catalog && (
        <button type="button" onClick={remove}>
          Remove catalog
        </button>
      )}
      <p role="status">{message}</p>
      <h3>Assessment preview</h3>
      <p>
        Preview uses the same letter for all three drives, full hull tankage and
        a streamlined hull.
      </p>
      <div className={styles.fields}>
        <label>
          Hull tons{' '}
          <input
            type="number"
            min="100"
            max="5000"
            value={hull}
            onChange={(e) => setHull(Number(e.target.value))}
          />
        </label>
        <label>
          Drive letter{' '}
          <input
            value={letter}
            maxLength={1}
            onChange={(e) => setLetter(e.target.value.toUpperCase())}
          />
        </label>
        <label>
          Computer{' '}
          <input
            value={computer}
            onChange={(e) => setComputer(e.target.value)}
          />
        </label>
        <label>
          Referee rating if missing{' '}
          <input
            type="number"
            min="1"
            max="6"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
          />
        </label>
        <label>
          Referee source{' '}
          <input value={source} onChange={(e) => setSource(e.target.value)} />
        </label>
      </div>
      <p>
        Assessment: {assessment.status}; jump{' '}
        {assessment.jumpRating ?? 'unknown'}; maneuver{' '}
        {assessment.maneuverRating ?? 'unknown'}; plant{' '}
        {assessment.plantRating ?? 'unknown'}; effective jump{' '}
        {assessment.effectiveJump ?? 'unknown'}; minimum tankage{' '}
        {assessment.minimumTankageTons ?? 'unknown'} tons.
      </p>
      {assessment.issues.length > 0 && (
        <ul>
          {assessment.issues.map((issue, index) => (
            <li key={index}>{issue}</li>
          ))}
        </ul>
      )}
    </details>
  );
}
