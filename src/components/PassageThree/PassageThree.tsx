import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import clsx from 'clsx';
import {
  address,
  credits,
  routeStops,
  worldById,
  worlds,
} from './presentation';
import { PassageChart } from './PassageChart';
import { WorldInspection, type Inspection } from './WorldInspection';
import { createRouter } from '../../engine';
import { EMBER_REACH } from '../../data/emberReach';
import { JumpwakeLogo } from '../JumpwakeLogo';
import styles from './PassageThree.module.css';

const router = createRouter(EMBER_REACH);

export function PassageThree() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [view, setView] = useState<'chart' | 'manifest'>('chart');
  const [compact, setCompact] = useState(
    () => window.matchMedia('(max-width: 899px)').matches,
  );
  const originRef = useRef<HTMLSelectElement>(null);
  const destinationRef = useRef<HTMLSelectElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const query = window.matchMedia('(max-width: 899px)');
    const update = () => setCompact(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  const result = useMemo(
    () =>
      origin && destination ? router.findRoute(origin, destination) : null,
    [origin, destination],
  );
  const passage = result?.status === 'reachable' ? result : null;
  const stops = useMemo(() => (result ? routeStops(result) : []), [result]);
  const cost = passage?.totalCostCredits ?? 0;
  const distance = passage?.totalDistance ?? 0;
  const status = !origin
    ? 'Choose an origin to begin.'
    : !destination
      ? `Departing ${worldById(origin).name}. Choose a destination.`
      : 'Destination unreachable with this ship and available fuel sources.';

  function inspect(id: string, trigger: HTMLElement | SVGElement) {
    setHighlight(null);
    setInspection({ id, trigger });
  }

  function closeInspection() {
    const trigger = inspection?.trigger;
    if (compact && trigger) {
      setView(trigger.closest('#passage-manifest') ? 'manifest' : 'chart');
    }
    setInspection(null);
    setHighlight(null);
    requestAnimationFrame(() => trigger?.focus({ preventScroll: compact }));
  }

  function useWorld(endpoint: 'origin' | 'destination') {
    if (!inspection) return;
    if (endpoint === 'origin') setOrigin(inspection.id);
    else setDestination(inspection.id);
    setInspection(null);
    setHighlight(null);
    requestAnimationFrame(() =>
      (endpoint === 'origin' ? originRef : destinationRef).current?.focus(),
    );
  }

  function sample(target: string) {
    setOrigin('aster');
    setDestination(target);
    setInspection(null);
    requestAnimationFrame(() =>
      destinationRef.current?.focus({ preventScroll: true }),
    );
  }

  const inspectionPanel = inspection ? (
    <WorldInspection
      inspection={inspection}
      compact={compact}
      origin={origin}
      destination={destination}
      routeIndices={stops.flatMap((stop, index) =>
        stop.world === inspection.id ? [index + 1] : [],
      )}
      hasPassage={Boolean(passage)}
      onClose={closeInspection}
      onUseWorld={useWorld}
    />
  ) : null;

  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#main-content">
        Skip to planner
      </a>
      <header className={styles.header}>
        <div className={styles.brandLockup}>
          <a className={styles.brand} href="/" aria-label="Jumpwake home">
            <JumpwakeLogo variant="compact" decorative />
          </a>
          <span className={styles.wordmark}>
            JUMPWAKE<small>PASSENGER NAVIGATION SERVICE</small>
          </span>
        </div>
        <h1 className={styles.title}>
          The stars, <em>within reach.</em>
        </h1>
        <span className={styles.issue}>
          Ember Reach
          <span>Chart Nº 001</span>
        </span>
      </header>
      <main id="main-content" tabIndex={-1}>
        <div className={styles.endpoints}>
          <label>
            From
            <select
              ref={originRef}
              aria-label="Origin"
              value={origin}
              onChange={(event) => {
                setOrigin(event.target.value);
                setInspection(null);
                setHighlight(null);
              }}
            >
              <option value="">Choose origin</option>
              {worlds.map((world) => (
                <option key={world.id} value={world.id}>
                  {world.name}
                </option>
              ))}
            </select>
          </label>
          <span aria-hidden="true">⟶</span>
          <label>
            To
            <select
              ref={destinationRef}
              aria-label="Destination"
              value={destination}
              onChange={(event) => {
                setDestination(event.target.value);
                setInspection(null);
                setHighlight(null);
              }}
            >
              <option value="">Choose world</option>
              {worlds.map((world) => (
                <option key={world.id} value={world.id}>
                  {world.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className={styles.journeySummary}>
          <p role="status" aria-atomic="true">
            {passage ? (
              <>
                <strong>
                  {passage.jumpCount} jumps <span>·</span> {distance} pc
                </strong>
                <span className={styles.summaryCost}>
                  {credits(cost)} <span>purchased fuel</span>
                </span>
                <span className={styles.sr}>
                  {worldById(origin).name} to {worldById(destination).name}.
                  Calculated passage.
                </span>
              </>
            ) : (
              status
            )}
          </p>
          {passage && (
            <span className={styles.optimizationLabel}>
              Lowest purchased fuel cost
            </span>
          )}
          {!origin && !destination && (
            <button
              className={styles.sampleLink}
              onClick={() => sample('cinder')}
            >
              Plan a journey <span aria-hidden="true">↗</span>
            </button>
          )}
        </div>
        <div
          className={styles.mobileTabs}
          role="group"
          aria-label="Planner view"
        >
          <button
            aria-pressed={view === 'chart'}
            aria-controls="passage-chart"
            onClick={() => setView('chart')}
          >
            Chart
          </button>
          <button
            aria-pressed={view === 'manifest'}
            aria-controls="passage-manifest"
            onClick={() => setView('manifest')}
          >
            Manifest{passage ? ` · ${stops.length} events` : ''}
          </button>
        </div>
        <div className={styles.workspace}>
          <section
            id="passage-chart"
            className={styles.mapPanel}
            aria-label="Subsector chart"
            hidden={compact && view !== 'chart'}
          >
            <div className={styles.mapHeading}>
              <h2>
                Ember Reach <span>field chart</span>
              </h2>
              <span>8 × 10 hexes · 1 pc per hex</span>
            </div>
            <PassageChart
              stops={stops.filter((stop) => stop.kind !== 'refuel')}
              selected={inspection?.id ?? null}
              highlight={highlight}
              origin={origin}
              destination={destination}
              onInspect={inspect}
              onHighlight={setHighlight}
            />
            <div className={styles.mapCaption}>
              <span>
                <i /> Passage
              </span>
              <span>◎ Inspecting</span>
              <span>Select a world for details</span>
            </div>
          </section>
          <div className={styles.rightColumn}>
            <section
              id="passage-manifest"
              aria-label="Passage manifest"
              hidden={compact && view !== 'manifest'}
            >
              <div className={styles.sectionHead}>
                <h2>Passage manifest</h2>
                <span>Jump–3 · 200 t · scoops</span>
              </div>
              {!compact && inspectionPanel}
              {passage ? (
                <motion.ol
                  key={`${origin}-${destination}`}
                  className={styles.stops}
                  initial={reduced ? false : { opacity: 0.4 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: reduced ? 0 : 0.18 }}
                >
                  {stops.map((stop, index) => (
                    <li key={stop.id}>
                      <button
                        className={clsx(
                          styles.stop,
                          inspection?.id === stop.world && styles.activeStop,
                          highlight === stop.world && styles.highlightStop,
                        )}
                        aria-label={`Inspect event ${index + 1}, ${worldById(stop.world).name}`}
                        data-highlighted={highlight === stop.world}
                        aria-describedby={`stop-leg-${stop.id} stop-detail-${stop.id} stop-cost-${stop.id}`}
                        aria-pressed={inspection?.id === stop.world}
                        onClick={(event) =>
                          inspect(stop.world, event.currentTarget)
                        }
                        onMouseEnter={() => setHighlight(stop.world)}
                        onMouseLeave={() => setHighlight(null)}
                        onFocus={() => setHighlight(stop.world)}
                        onBlur={() => setHighlight(null)}
                      >
                        <span className={styles.ordinal}>
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span className={styles.stopBody}>
                          <span className={styles.stopTitle}>
                            {worldById(stop.world).name}
                            <small id={`stop-leg-${stop.id}`}>
                              {stop.kind === 'departure'
                                ? 'Departure'
                                : stop.kind === 'refuel'
                                  ? 'Refueling'
                                  : `${stop.jump} pc · Jump`}
                            </small>
                          </span>
                          <span
                            className={styles.stopDetails}
                            id={`stop-detail-${stop.id}`}
                          >
                            <span className={styles.stopAction}>
                              {stop.action}
                            </span>
                            <span className={styles.stopFuel}>{stop.fuel}</span>
                          </span>
                        </span>
                        <span
                          className={styles.price}
                          id={`stop-cost-${stop.id}`}
                        >
                          <span className={styles.sr}>Purchased fuel: </span>
                          {stop.cost ? (
                            credits(stop.cost)
                          ) : (
                            <>
                              <span aria-hidden="true">—</span>
                              <span className={styles.sr}>none</span>
                            </>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                </motion.ol>
              ) : (
                <div className={styles.empty}>
                  <h3>
                    {origin && destination
                      ? 'Destination unreachable.'
                      : origin
                        ? 'Where shall we take you?'
                        : 'Every passage begins somewhere.'}
                  </h3>
                  <p>
                    {origin && destination
                      ? 'No route satisfies the jump range and fuel constraints. Choose another destination.'
                      : 'Choose your worlds above, or inspect one on the chart and set it as an endpoint.'}
                  </p>
                  <div className={styles.examples}>
                    <span>Plan a journey</span>
                    <button onClick={() => sample('cinder')}>
                      Aster Quay → Cinder Rest <span aria-hidden="true">↗</span>
                    </button>
                    <button onClick={() => sample('orison')}>
                      Aster Quay → Orison <span aria-hidden="true">↗</span>
                    </button>
                  </div>
                </div>
              )}
              {passage && (
                <p className={styles.manifestNote}>
                  Jump fuel before → after each event. Arrival:{' '}
                  {passage.fuelRemainingTons} t. Initial 60 t is a sunk cost.
                </p>
              )}
            </section>
            {compact && inspectionPanel}
          </div>
        </div>
      </main>
      <footer className={styles.footer}>
        <span>JUMP–3 · 200 T · 60 T INITIAL JUMP FUEL</span>
        <span>Fuel grades simplified · no arrival reserve</span>
      </footer>
      <p className={styles.sr} aria-live="polite">
        {inspection
          ? `Inspecting ${worldById(inspection.id).name}, ${address(worldById(inspection.id))}. Passage unchanged.`
          : ''}
      </p>
    </div>
  );
}
