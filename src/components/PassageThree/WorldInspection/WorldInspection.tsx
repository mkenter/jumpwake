import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { TravelRules } from '../../../rules/types';
import {
  describeWorldFacts,
  portFacilities,
  type StarSystem,
} from '../../../rules/classicTraveller1981';
import { address, describeFuel, type PresentedWorld } from '../presentation';
import styles from './WorldInspection.module.css';

export type Inspection = { id: string; trigger: HTMLElement | SVGElement };
type Props = {
  worlds: readonly PresentedWorld[];
  inspection: Inspection;
  compact: boolean;
  origin: string;
  destination: string;
  routeIndices: number[];
  hasPassage: boolean;
  rules: TravelRules<StarSystem>;
  onClose: () => void;
  onUseWorld: (endpoint: 'origin' | 'destination' | 'waypoint') => void;
  canAddWaypoint: boolean;
  mode: 'waypoints' | 'direct';
};

export function WorldInspection({
  worlds,
  inspection,
  compact,
  origin,
  destination,
  routeIndices,
  hasPassage,
  rules,
  onClose,
  onUseWorld,
  canAddWaypoint,
  mode,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const reduced = useReducedMotion();
  const world = worlds.find((w) => w.id === inspection.id)!;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (compact) dialog?.showModal();
    headingRef.current?.focus({ preventScroll: true });
    return () => {
      dialog?.close();
    };
  }, [inspection, compact]);

  const content = (
    <motion.div
      key={world.id}
      initial={reduced ? false : { opacity: 0.6, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.16 }}
    >
      <div className={styles.heading}>
        <h2 id="inspected-world" ref={headingRef} tabIndex={-1}>
          {world.name}{' '}
          <span>
            {address(world)} · Port {world.port}
          </span>
        </h2>
        <button
          className={styles.close}
          aria-label="Close world details"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <p className={styles.relationship}>
        {world.id === origin
          ? 'Your origin'
          : world.id === destination
            ? 'Your destination'
            : routeIndices.length > 0
              ? `Events ${routeIndices.join(', ')} on your passage`
              : hasPassage
                ? 'Outside your passage'
                : 'World details'}{' '}
        · inspecting only
      </p>
      {world.note && <p className={styles.note}>{world.note}</p>}
      {world.sourceHex && (
        <p>
          Local {address(world)} · Sector {world.sourceHex}
        </p>
      )}
      <p>Port facilities: {portFacilities(world.starport)}</p>
      {world.facts && (
        <div>
          <p>Main world size: {describeWorldFacts(world.facts).size}</p>
          <p>Hydrographics: {describeWorldFacts(world.facts).hydrographics}</p>
          <p>
            Gas giants: {world.facts.gasGiants ?? 'Unknown'} · Bases:{' '}
            {world.facts.bases === null
              ? 'Unknown'
              : world.facts.bases.length === 0
                ? 'None'
                : world.facts.bases.join(', ')}
          </p>
          <p>
            Travel zone: {world.facts.travelZone ?? 'Unknown'}
            {world.facts.travelZone === 'amber' ||
            world.facts.travelZone === 'red'
              ? ' (advisory)'
              : ''}
          </p>
          {world.facts.travelProhibited && <p>Travel prohibited by referee</p>}
          {!!world.facts.refereeOverrides?.length && (
            <p>Referee overrides: {world.facts.refereeOverrides.join(', ')}</p>
          )}
        </div>
      )}
      {world.metadata && (
        <dl>
          {Object.entries(world.metadata)
            .filter(([, value]) => value)
            .map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
        </dl>
      )}
      <p className={styles.fuel}>
        <span>Local fuel</span>
        {rules.fuelSources(world).length === 0 &&
        (world.starport === '?' || world.gasGiant === null)
          ? 'No confirmed local fuel'
          : describeFuel(rules.fuelSources(world))}
        {(world.starport === '?' || world.gasGiant === null) &&
          ' · Some fuel availability is unknown'}
      </p>
      <div className={styles.actions}>
        <button
          disabled={world.id === origin}
          onClick={() => onUseWorld('origin')}
        >
          {world.id === origin ? 'Current origin' : 'Set origin'}
        </button>
        <button
          disabled={world.id === destination}
          onClick={() => onUseWorld('destination')}
        >
          {world.id === destination ? 'Current destination' : 'Set destination'}
        </button>
        <button
          disabled={!canAddWaypoint}
          onClick={() => onUseWorld('waypoint')}
        >
          {mode === 'direct'
            ? 'Add successive jump stop'
            : 'Add required waypoint'}
        </button>
      </div>
    </motion.div>
  );

  return compact ? (
    <dialog
      ref={dialogRef}
      className={styles.sheet}
      aria-labelledby="inspected-world"
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>(
          'button:not(:disabled)',
        );
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === headingRef.current)
        ) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      {content}
    </dialog>
  ) : (
    <aside
      className={styles.inspector}
      aria-label="World inspection"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose();
        }
      }}
    >
      {content}
    </aside>
  );
}
