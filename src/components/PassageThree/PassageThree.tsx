import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import clsx from 'clsx';
import {
  address,
  credits,
  passages,
  worldById,
  worlds,
} from '../../data/passageScenario';
import { PassageChart } from './PassageChart';
import { WorldInspection, type Inspection } from './WorldInspection';
import styles from './PassageThree.module.css';

export function PassageThree() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [view, setView] = useState<'chart' | 'manifest'>('chart');
  const [compact, setCompact] = useState(
    () => window.matchMedia('(max-width: 700px)').matches,
  );
  const originRef = useRef<HTMLSelectElement>(null);
  const destinationRef = useRef<HTMLSelectElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const query = window.matchMedia('(max-width: 700px)');
    const update = () => setCompact(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  // Only select an authored example. No route finding or fuel calculation lives here.
  const passage = passages.find(
    (p) => p.origin === origin && p.destination === destination,
  );
  const stops = passage?.stops ?? [];
  const cost = stops.reduce((sum, stop) => sum + stop.cost, 0);
  const distance = stops.reduce((sum, stop) => sum + stop.jump, 0);
  const sameWorld = Boolean(origin && origin === destination);
  const status = passage
    ? `${worldById(origin).name} to ${worldById(destination).name}. ${stops.length - 1} jumps, ${distance} pc, ${credits(cost)} purchased fuel. Illustrative passage.`
    : !origin
      ? 'Choose an origin to begin.'
      : !destination
        ? `Departing ${worldById(origin).name}. Choose a destination.`
        : sameWorld
          ? `You’re already at ${worldById(origin).name}. Choose a different destination.`
          : 'No authored route for these endpoints. This does not mean the destination is unreachable.';

  function inspect(id: string, trigger: HTMLElement | SVGElement) {
    setHighlight(null);
    setInspection({ id, trigger });
  }

  function closeInspection() {
    const trigger = inspection?.trigger;
    setInspection(null);
    setHighlight(null);
    requestAnimationFrame(() => trigger?.focus({ preventScroll: true }));
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

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <a
          className={styles.brand}
          href="/explore"
          aria-label="Jumpwake design studies"
        >
          J / W
        </a>
        <span>
          JUMPWAKE<small>PASSENGER NAVIGATION SERVICE</small>
        </span>
        <span className={styles.issue}>
          LACUNA REACH
          <br />
          CHART Nº 001
        </span>
      </header>
      <main id="exploration-main" tabIndex={-1}>
        <div className={styles.title}>
          <h1>
            The stars, <em>within reach.</em>
          </h1>
        </div>
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
                  {stops.length - 1} jumps <span>·</span> {distance} pc
                </strong>
                <span className={styles.summaryCost}>
                  {credits(cost)} <span>purchased fuel</span>
                </span>
                <span className={styles.sr}>
                  {worldById(origin).name} to {worldById(destination).name}.
                  Illustrative passage.
                </span>
              </>
            ) : (
              status
            )}
          </p>
          {passage && (
            <span className={styles.fixtureLabel}>Illustrative passage</span>
          )}
          {!origin && !destination && (
            <button
              className={styles.sampleLink}
              onClick={() => sample('orison')}
            >
              Try a sample <span aria-hidden="true">↗</span>
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
            Manifest{passage ? ` · ${stops.length} stops` : ''}
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
              <h2>Lacuna Reach</h2>
              <span>1 hex = 1 parsec</span>
            </div>
            <PassageChart
              stops={stops}
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
              {passage ? (
                <motion.ol
                  key={`${origin}-${destination}`}
                  className={styles.stops}
                  initial={reduced ? false : { opacity: 0.4 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: reduced ? 0 : 0.18 }}
                >
                  {stops.map((stop, index) => (
                    <li key={stop.world}>
                      <button
                        className={clsx(
                          styles.stop,
                          inspection?.id === stop.world && styles.activeStop,
                          highlight === stop.world && styles.highlightStop,
                        )}
                        aria-label={`Inspect stop ${index + 1}, ${worldById(stop.world).name}`}
                        data-highlighted={highlight === stop.world}
                        aria-describedby={`stop-leg-${stop.world} stop-detail-${stop.world} stop-cost-${stop.world}`}
                        aria-pressed={inspection?.id === stop.world}
                        onClick={(event) =>
                          inspect(stop.world, event.currentTarget)
                        }
                        onMouseEnter={() => setHighlight(stop.world)}
                        onMouseLeave={() => setHighlight(null)}
                        onFocus={() => setHighlight(stop.world)}
                        onBlur={() => setHighlight(null)}
                      >
                        <span className={styles.ordinal}>0{index + 1}</span>
                        <span className={styles.stopBody}>
                          <span className={styles.stopTitle}>
                            {worldById(stop.world).name}
                            <small id={`stop-leg-${stop.world}`}>
                              {index === 0
                                ? 'Departure'
                                : `${stop.jump} pc${index === stops.length - 1 ? ' · Arrival' : ' from previous'}`}
                            </small>
                          </span>
                          <span
                            className={styles.stopDetails}
                            id={`stop-detail-${stop.world}`}
                          >
                            <span className={styles.stopAction}>
                              {stop.action}
                            </span>
                            <span className={styles.stopFuel}>{stop.fuel}</span>
                          </span>
                        </span>
                        <span
                          className={styles.price}
                          id={`stop-cost-${stop.world}`}
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
                    {sameWorld
                      ? 'Already at your destination.'
                      : origin && destination
                        ? 'A passage yet to be charted.'
                        : origin
                          ? 'Where shall we take you?'
                          : 'Every passage begins somewhere.'}
                  </h3>
                  <p>
                    {origin && destination
                      ? sameWorld
                        ? 'Choose another world to plan a passage.'
                        : 'This pair has no illustrative route. Routing will be available after engine integration.'
                      : 'Choose your worlds above, or inspect one on the chart and set it as an endpoint.'}
                  </p>
                  <div className={styles.examples}>
                    <span>Explore an authored passage</span>
                    <button onClick={() => sample('orison')}>
                      Aster → Orison <span aria-hidden="true">↗</span>
                    </button>
                    <button onClick={() => sample('vela')}>
                      Aster → Vela <span aria-hidden="true">↗</span>
                    </button>
                  </div>
                </div>
              )}
              {passage && (
                <p className={styles.manifestNote}>
                  Jump fuel at stops: arrival → departure
                </p>
              )}
            </section>
            {inspection ? (
              <WorldInspection
                inspection={inspection}
                compact={compact}
                origin={origin}
                destination={destination}
                routeIndex={stops.findIndex(
                  (stop) => stop.world === inspection.id,
                )}
                hasPassage={Boolean(passage)}
                onClose={closeInspection}
                onUseWorld={useWorld}
              />
            ) : (
              <div className={styles.inspectionHint} hidden={compact}>
                <span aria-hidden="true">◎</span>
                <p>
                  Look a little closer.
                  <br />
                  <span>
                    Select a world or manifest stop to inspect its port and fuel
                    sources. Your passage stays in place.
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
      <footer className={styles.footer}>
        <span>ILLUSTRATIVE ROUTES · NOT CALCULATED</span>
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
