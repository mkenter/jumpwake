import { createClassicTraveller1981Rules } from '../../rules/classicTraveller1981';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import clsx from 'clsx';
import {
  address,
  credits,
  preferenceNames,
  routeStops,
  presentWorlds,
} from './presentation';
import { PassageChart } from './PassageChart';
import { WorldInspection, type Inspection } from './WorldInspection';
import { createRouter, type RoutingPreference } from '../../engine';
import { PassageComparison } from './PassageComparison';
import { demoChart, type Subsector } from '../../import/subsector';
import { ChartArchive } from './ChartArchive';
import { Masthead } from './Masthead';
import styles from './PassageThree.module.css';
import { VesselParticulars } from './VesselParticulars';
import { restoreVessel, saveVessel, type Vessel } from './vessel';

export function PassageThree() {
  const [chart, setChart] = useState(demoChart);
  const worlds = useMemo(() => presentWorlds(chart.worlds), [chart]);
  const worldById = (id: string) => worlds.find((world) => world.id === id)!;
  const [vessel, setVessel] = useState(restoreVessel);
  const [saveUnavailable, setSaveUnavailable] = useState(false);
  const { ship, state } = vessel;
  const rules = useMemo(
    () => createClassicTraveller1981Rules(ship, state),
    [ship, state],
  );
  const router = useMemo(
    () => createRouter(chart.worlds, rules),
    [chart, rules],
  );

  const [preference, setPreference] =
    useState<RoutingPreference>('lowest-fuel-cost');
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

  const alternatives = useMemo(
    () =>
      origin && destination
        ? {
            'lowest-fuel-cost': router.findRoute(
              origin,
              destination,
              'lowest-fuel-cost',
            ),
            'fewest-jumps': router.findRoute(
              origin,
              destination,
              'fewest-jumps',
            ),
          }
        : null,
    [origin, destination, router],
  );
  const result = alternatives?.[preference] ?? null;
  const passage = result?.status === 'reachable' ? result : null;
  const stops = useMemo(
    () =>
      result
        ? routeStops(
            result,
            (id) => worlds.find((w) => w.id === id)!,
            ship,
            state,
          )
        : [],
    [result, ship, state, worlds],
  );
  const chartStops = useMemo(
    () => stops.filter((stop) => stop.kind !== 'refuel'),
    [stops],
  );
  const cost = passage?.totalCostCredits ?? 0;
  const distance = passage?.totalDistance ?? 0;
  const status = !origin
    ? 'Choose an origin to begin.'
    : !destination
      ? `Departing ${worldById(origin).name}. Choose a destination.`
      : 'Destination unreachable with this ship and available fuel sources.';

  function selectChart(next: Subsector) {
    setOrigin('');
    setDestination('');
    setInspection(null);
    setHighlight(null);
    setChart(next);
  }

  function selectPreference(next: RoutingPreference) {
    setPreference(next);
    setInspection(null);
    setHighlight(null);
  }

  function applyVessel(next: Vessel) {
    setVessel(next);
    setInspection(null);
    setHighlight(null);
    setSaveUnavailable(!saveVessel(next));
  }

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
    setHighlight(null);
    requestAnimationFrame(() =>
      destinationRef.current?.focus({ preventScroll: true }),
    );
  }

  function navigate(target: 'passage' | 'chart' | 'manifest') {
    if (target !== 'passage') setView(target);
    const navigationFocus = document.activeElement;
    requestAnimationFrame(() => {
      // A world or another control may receive focus before this frame runs.
      // Do not overwrite that newer intent with a stale navigation request.
      if (document.activeElement !== navigationFocus) return;
      const section = document.getElementById(
        target === 'passage' ? 'journey-controls' : `passage-${target}`,
      );
      if (target === 'passage')
        originRef.current?.focus({ preventScroll: true });
      else section?.focus({ preventScroll: true });
      section?.scrollIntoView({
        block: 'start',
        behavior: reduced ? 'instant' : 'smooth',
      });
    });
  }

  const inspectionPanel = inspection ? (
    <WorldInspection
      worlds={worlds}
      inspection={inspection}
      compact={compact}
      origin={origin}
      destination={destination}
      routeIndices={stops.flatMap((stop, index) =>
        stop.world === inspection.id ? [index + 1] : [],
      )}
      hasPassage={Boolean(passage)}
      rules={rules}
      onClose={closeInspection}
      onUseWorld={useWorld}
    />
  ) : null;

  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#main-content">
        Skip to planner
      </a>
      <Masthead
        title={chart.title}
        compact={compact}
        view={view}
        onNavigate={navigate}
      />
      <main id="main-content" tabIndex={-1}>
        <ChartArchive chart={chart} onSelect={selectChart} />
        <section
          id="journey-controls"
          className={styles.journeyControls}
          aria-label="Journey controls"
        >
          <div className={styles.controlHeading}>
            <span>Plot your passage</span>
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
                    {world.name} · {address(world)}
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
                    {world.name} · {address(world)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <VesselParticulars
            vessel={vessel}
            onApply={applyVessel}
            saveUnavailable={saveUnavailable}
          />
        </section>
        <div className={styles.journeySummary}>
          <p role="status" aria-atomic="true">
            {passage ? (
              <>
                <strong>
                  {passage.jumpCount}{' '}
                  {passage.jumpCount === 1 ? 'jump' : 'jumps'} <span>·</span>{' '}
                  {distance} pc
                </strong>
                <span className={styles.summaryCost}>
                  {credits(cost)} <span>purchased fuel</span>
                </span>
                <span className={styles.sr}>
                  {worldById(origin).name} to {worldById(destination).name}.{' '}
                  {preferenceNames[preference]}. Calculated passage.
                </span>
              </>
            ) : (
              status
            )}
          </p>
          {alternatives?.['lowest-fuel-cost'].status === 'reachable' &&
            alternatives['fewest-jumps'].status === 'reachable' && (
              <PassageComparison
                economical={alternatives['lowest-fuel-cost']}
                fewerJumps={alternatives['fewest-jumps']}
                preference={preference}
                onSelect={selectPreference}
              />
            )}
          {chart === demoChart && !origin && !destination && (
            <button
              className={styles.sampleLink}
              onClick={() => sample('cinder')}
            >
              Plan a journey <span aria-hidden="true">↗</span>
            </button>
          )}
        </div>
        <div className={styles.workspace}>
          <section
            id="passage-chart"
            tabIndex={-1}
            className={styles.mapPanel}
            aria-label="Subsector chart"
            hidden={compact && view !== 'chart'}
          >
            <div className={styles.mapHeading}>
              <h2>
                <svg
                  className={styles.compass}
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="7" />
                  <path d="M12 1L15 9L23 12L15 15L12 23L9 15L1 12L9 9Z" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
                {chart.title} <span>field chart</span>
              </h2>
              <span>8 × 10 hexes · 1 pc per hex</span>
            </div>
            <PassageChart
              worlds={worlds}
              title={chart.title}
              stops={chartStops}
              visible={!compact || view === 'chart'}
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
              className={styles.manifest}
              tabIndex={-1}
              aria-label="Passage manifest"
              hidden={compact && view !== 'manifest'}
            >
              <div className={styles.sectionHead}>
                <h2>Passage manifest</h2>
                <span>
                  Jump–{ship.jumpRating} · {ship.displacementTons} t
                  {ship.hasFuelScoops ? ' · scoops' : ''}
                </span>
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
                      ? 'No passage is possible with these vessel particulars and local fuel sources. Review jump range, fuel aboard and scooping equipment, or choose another destination.'
                      : 'Choose your worlds above, or inspect one on the chart and set it as an endpoint.'}
                  </p>
                  {chart === demoChart && (
                    <div className={styles.examples}>
                      <span>Plan a journey</span>
                      <button onClick={() => sample('cinder')}>
                        Aster Quay → Cinder Rest{' '}
                        <span aria-hidden="true">↗</span>
                      </button>
                      <button onClick={() => sample('orison')}>
                        Aster Quay → Orison <span aria-hidden="true">↗</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
              {passage && (
                <p className={styles.manifestNote}>
                  Jump fuel before → after each event. Arrival:{' '}
                  {passage.fuelRemainingTons} t. Initial {state.initialFuelTons}{' '}
                  t is a sunk cost.
                </p>
              )}
            </section>
            {compact && inspectionPanel}
          </div>
        </div>
      </main>
      <footer className={styles.footer}>
        <span>
          JUMP–{ship.jumpRating} · {ship.displacementTons} T ·{' '}
          {state.initialFuelTons} T INITIAL JUMP FUEL
        </span>
        <span>Fuel grades simplified · no arrival reserve</span>
        <a href="/legal.html">Legal &amp; attribution</a>
      </footer>
      <p className={styles.sr} aria-live="polite">
        {inspection
          ? `Inspecting ${worldById(inspection.id).name}, ${address(worldById(inspection.id))}. Passage unchanged.`
          : ''}
      </p>
    </div>
  );
}
