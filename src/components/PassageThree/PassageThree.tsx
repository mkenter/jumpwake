import {
  makeDriveCatalog,
  type PrivateDriveCatalog,
} from '../../rules/classicTraveller1981/driveCatalog';
import { exampleDriveCatalog } from '../../rules/classicTraveller1981/vesselDesign';
import { createClassicTraveller1981Rules } from '../../rules/classicTraveller1981';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import clsx from 'clsx';
import {
  address,
  credits,
  preferenceNames,
  routeStops,
  presentWorlds,
  passageMarkdown,
  presentVoyage,
  transactionText,
} from './presentation';
import { PassageChart } from './PassageChart';
import { WorldInspection, type Inspection } from './WorldInspection';
import {
  createRouter,
  hasJumpChain,
  hexDistance,
  toAxial,
  type RoutingPreference,
} from '../../engine';
import { PassageComparison } from './PassageComparison';
import { demoChart, type Subsector } from '../../import/subsector';
import { ChartArchive } from './ChartArchive';
import { Masthead } from './Masthead';
import styles from './PassageThree.module.css';
import { VesselParticulars } from './VesselParticulars';
import { restoreVessel, saveVessel, type Vessel } from './vessel';
import { restoreChart, type ImportedChart } from './chartStorage';
import {
  chartDigest,
  decodePassage,
  encodePassage,
  MAX_PASSAGE_LENGTH,
  passageMatchesChart,
  type PassageLink,
} from './passageLink';

export function PassageThree({
  catalog = null,
}: {
  catalog?: PrivateDriveCatalog | null;
}) {
  const visitDescriptionId = useId();
  const [restored] = useState(restoreChart);
  const [imported, setImported] = useState<ImportedChart | null>(restored);
  const [link] = useState(() => {
    const values = new URLSearchParams(window.location.search).getAll(
      'passage',
    );
    return values.length === 1 ? decodePassage(values[0]!) : null;
  });
  const [linkPending, setLinkPending] = useState(Boolean(link));
  const [linkMessage, setLinkMessage] = useState(() =>
    !link && new URLSearchParams(window.location.search).has('passage')
      ? 'This passage link is invalid or unsupported.'
      : '',
  );
  const [chart, setChart] = useState(
    () =>
      restored?.charts.find((item) => item.position === restored.selected) ??
      demoChart,
  );
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
  const [stopsRequired, setStopsRequired] = useState<string[]>([]);
  const [mode, setMode] = useState<'waypoints' | 'direct'>('waypoints');
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

  useEffect(() => {
    if (!linkPending || !link) return;
    let cancelled = false;
    async function restore() {
      let target = demoChart;
      if (link!.chart.kind === 'import') {
        const required = link!.chart;
        if (
          !imported ||
          (await chartDigest(imported.text)) !== required.digest
        ) {
          if (!cancelled)
            setLinkMessage(
              `Import the matching T5 file for ${required.hint}, subsector ${required.position}, to restore this passage.`,
            );
          return;
        }
        const match = imported.charts.find(
          (item) => item.position === required.position,
        );
        if (!match) {
          if (!cancelled)
            setLinkMessage(
              'The required subsector was not found in this chart.',
            );
          return;
        }
        target = match;
      }
      if (cancelled) return;
      if (!passageMatchesChart(link!, target)) {
        setLinkMessage(
          'The shared passage could not be verified on this chart.',
        );
        setLinkPending(false);
        return;
      }
      setChart(target);
      setVessel(link!.vessel);
      setOrigin(link!.origin);
      setDestination(link!.destination);
      setPreference(link!.preference);
      setStopsRequired(link!.stops ?? []);
      setMode(link!.mode ?? 'waypoints');
      setLinkMessage(
        'Shared passage restored. Your saved vessel settings were not changed.',
      );
      setLinkPending(false);
    }
    restore().catch(() => {
      if (!cancelled) {
        setLinkMessage('Unable to verify this passage link.');
        setLinkPending(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [link, linkPending, imported]);

  const alternatives = useMemo(
    () =>
      origin && destination
        ? {
            'lowest-fuel-cost': router.findRoute(
              origin,
              destination,
              'lowest-fuel-cost',
              stopsRequired,
              mode,
            ),
            'fewest-jumps': router.findRoute(
              origin,
              destination,
              'fewest-jumps',
              stopsRequired,
              mode,
            ),
          }
        : null,
    [origin, destination, router, stopsRequired, mode],
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
  const voyage = passage ? presentVoyage(passage, state.initialFuelTons) : null;
  const cost = passage?.totalCostCredits ?? 0;
  const distance = passage?.totalDistance ?? 0;
  const unreachableReason = useMemo(() => {
    const failedLeg = result?.status === 'unreachable' ? result.failedLeg : -1;
    const uncertainty = chart.worlds.some(
      (world) => world.starport === '?' || world.gasGiant === null,
    )
      ? ' Some fuel availability is unknown and is not assumed available.'
      : '';
    const reason =
      result?.status === 'unreachable'
        ? failedLeg >= 0 && (stopsRequired.length > 0 || mode === 'direct')
          ? (() => {
              const from =
                failedLeg === 0 ? origin : stopsRequired[failedLeg - 1]!;
              const to = [...stopsRequired, destination][failedLeg]!;
              const fromWorld = worlds.find((world) => world.id === from)!;
              const toWorld = worlds.find((world) => world.id === to)!;
              const distance = hexDistance(
                toAxial(fromWorld.hex),
                toAxial(toWorld.hex),
              );
              const geometryValid =
                mode === 'direct'
                  ? distance > 0 &&
                    distance <= ship.jumpRating &&
                    rules.jumpFuelTons(distance) <= ship.jumpFuelCapacityTons
                  : hasJumpChain(chart.worlds, from, to, ship.jumpRating);
              return `Leg ${failedLeg + 1}: ${fromWorld.name} to ${toWorld.name}. ${geometryValid ? 'Fuel, refueling, or travel restrictions may prevent this leg.' : 'No valid jump route is within the ship’s range.'} Edit the itinerary to repair it.`;
            })()
          : hasJumpChain(chart.worlds, origin, destination, ship.jumpRating)
            ? 'Jump range is sufficient, but fuel, refueling, or travel restrictions may prevent a passage.'
            : `No chain of jumps reaches the destination at Jump-${ship.jumpRating}.`
        : '';
    const restriction = chart.worlds.some(
      (world) => world.facts?.travelProhibited,
    )
      ? ' Referee travel prohibitions are enforced.'
      : '';
    return reason ? reason + uncertainty + restriction : reason;
  }, [
    result,
    stopsRequired,
    destination,
    origin,
    worlds,
    mode,
    ship,
    rules,
    chart,
  ]);
  const status = !origin
    ? 'Choose an origin to begin.'
    : !destination
      ? `Departing ${worldById(origin).name}. Choose a destination.`
      : `Destination unreachable. ${unreachableReason}`;

  function selectChart(next: Subsector) {
    setOrigin('');
    setDestination('');
    setStopsRequired([]);
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

  function closeInspection(fallback?: HTMLElement | null) {
    const trigger = inspection?.trigger;
    if (compact && trigger) {
      setView(trigger.closest('#passage-manifest') ? 'manifest' : 'chart');
    }
    setInspection(null);
    setHighlight(null);
    requestAnimationFrame(() =>
      (trigger?.isConnected ? trigger : fallback)?.focus({
        preventScroll: true,
      }),
    );
  }

  function useWorld(endpoint: 'origin' | 'destination' | 'waypoint') {
    if (!inspection) return;
    const trigger = inspection.trigger;
    const chartTrigger = trigger.closest('#passage-chart') ? trigger : null;
    const top = chartTrigger?.getBoundingClientRect().top;
    if (endpoint === 'origin') setOrigin(inspection.id);
    else if (endpoint === 'destination') setDestination(inspection.id);
    else
      setStopsRequired((previous) =>
        previous.length < 30 ? [...previous, inspection.id] : previous,
      );
    closeInspection(
      endpoint === 'origin' ? originRef.current : destinationRef.current,
    );
    requestAnimationFrame(() => {
      if (chartTrigger?.isConnected && top !== undefined) {
        window.scrollBy(0, chartTrigger.getBoundingClientRect().top - top);
      }
    });
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
      routeIndices={
        voyage?.visits.flatMap((visit, index) =>
          visit.world === inspection.id ? [index + 1] : [],
        ) ?? []
      }
      hasPassage={Boolean(passage)}
      rules={rules}
      onClose={() => closeInspection()}
      onUseWorld={useWorld}
      canAddWaypoint={stopsRequired.length < 30}
      mode={mode}
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
        <ChartArchive
          chart={chart}
          onSelect={selectChart}
          imported={imported}
          onImport={setImported}
          pending={linkPending && link?.chart.kind === 'import'}
        />
        {linkMessage && <p role="status">{linkMessage}</p>}
        {linkPending && link?.chart.kind === 'import' && (
          <button
            onClick={() => {
              setLinkPending(false);
              setLinkMessage('');
              const url = new URL(window.location.href);
              url.searchParams.delete('passage');
              window.history.replaceState(window.history.state, '', url);
            }}
          >
            Dismiss shared passage
          </button>
        )}
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
            <button
              type="button"
              className={styles.swapEndpoints}
              aria-label="Swap endpoints"
              title="Swap endpoints"
              disabled={!origin || !destination || origin === destination}
              onClick={() => {
                setOrigin(destination);
                setDestination(origin);
                setStopsRequired((stops) => [...stops].reverse());
                setInspection(null);
                setHighlight(null);
              }}
            >
              <span aria-hidden="true">⇄</span>
            </button>
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
          <div className={styles.itinerary}>
            {stopsRequired.length > 0 && (
              <div>
                <p>
                  {mode === 'direct'
                    ? 'Exact successive jumps'
                    : 'Required waypoints'}{' '}
                  · in travel order
                </p>
                <ol className={styles.requiredStops}>
                  {stopsRequired.map((stop, index) => (
                    <li key={index}>
                      <label>
                        <span className={styles.sr}>Stop {index + 1}</span>
                        <select
                          value={stop}
                          onChange={(event) =>
                            setStopsRequired((previous) =>
                              previous.map((id, i) =>
                                i === index ? event.target.value : id,
                              ),
                            )
                          }
                        >
                          {worlds.map((world) => (
                            <option key={world.id} value={world.id}>
                              {world.name} · {address(world)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        disabled={index === 0}
                        aria-label={`Move stop ${index + 1} earlier`}
                        onClick={() =>
                          setStopsRequired((previous) => {
                            const next = [...previous];
                            [next[index - 1], next[index]] = [
                              next[index]!,
                              next[index - 1]!,
                            ];
                            return next;
                          })
                        }
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={index === stopsRequired.length - 1}
                        aria-label={`Move stop ${index + 1} later`}
                        onClick={() =>
                          setStopsRequired((previous) => {
                            const next = [...previous];
                            [next[index], next[index + 1]] = [
                              next[index + 1]!,
                              next[index]!,
                            ];
                            return next;
                          })
                        }
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setStopsRequired((previous) =>
                            previous.filter((_, i) => i !== index),
                          )
                        }
                      >
                        Remove stop {index + 1}
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            <button
              type="button"
              disabled={stopsRequired.length >= 30 || worlds.length === 0}
              onClick={() =>
                setStopsRequired((previous) => [...previous, worlds[0]!.id])
              }
            >
              Add stop
            </button>
            <details>
              <summary>Advanced routing</summary>
              <label>
                Routing mode{' '}
                <select
                  value={mode}
                  onChange={(event) =>
                    setMode(event.target.value as 'waypoints' | 'direct')
                  }
                >
                  <option value="waypoints">
                    Required stops (automatic routes between)
                  </option>
                  <option value="direct">Specified successive jumps</option>
                </select>
              </label>
              <p>
                {mode === 'direct'
                  ? 'Each listed stop and the destination must be reached in one exact successive jump.'
                  : 'The planner may choose intermediate worlds between required waypoints.'}
              </p>
            </details>
          </div>
          <VesselParticulars
            vessel={vessel}
            catalog={catalog ? makeDriveCatalog(catalog) : exampleDriveCatalog}
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
                  {credits(cost)}{' '}
                  <span>
                    purchased fuel · arrival {passage.fuelRemainingTons} t
                  </span>
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
          {passage && (
            <CopyPassageLink
              key={JSON.stringify([
                chart,
                vessel,
                origin,
                destination,
                preference,
                stopsRequired,
                mode,
              ])}
              chart={chart}
              imported={imported}
              vessel={vessel}
              origin={origin}
              destination={destination}
              preference={preference}
              stopsRequired={stopsRequired}
              mode={mode}
            />
          )}
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
                {passage && (
                  <CopyPassage
                    key={JSON.stringify([
                      chart,
                      vessel,
                      origin,
                      destination,
                      preference,
                    ])}
                    markdown={passageMarkdown({
                      chart,
                      passage,
                      preference,
                      ship,
                      state,
                      worldById,
                    })}
                  />
                )}
              </div>
              {!compact && inspectionPanel}
              {passage && voyage ? (
                <motion.ol
                  key={`${origin}-${destination}`}
                  className={styles.stops}
                  initial={reduced ? false : { opacity: 0.4 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: reduced ? 0 : 0.18 }}
                >
                  {voyage.visits.map((visit, index) => {
                    const leg = voyage.legs[index];
                    return (
                      <li key={index}>
                        <button
                          className={clsx(
                            styles.stop,
                            inspection?.id === visit.world && styles.activeStop,
                            highlight === visit.world && styles.highlightStop,
                          )}
                          aria-label={`Inspect visit ${index + 1}, ${worldById(visit.world).name}`}
                          aria-describedby={[
                            `${visitDescriptionId}-${index}-fuel`,
                            ...visit.transactions.map(
                              (_, n) =>
                                `${visitDescriptionId}-${index}-transaction-${n}`,
                            ),
                            ...(passage.jumpCount === 0
                              ? [`${visitDescriptionId}-${index}-stationary`]
                              : []),
                          ].join(' ')}
                          data-highlighted={highlight === visit.world}
                          aria-pressed={inspection?.id === visit.world}
                          onClick={(event) =>
                            inspect(visit.world, event.currentTarget)
                          }
                          onMouseEnter={() => setHighlight(visit.world)}
                          onMouseLeave={() => setHighlight(null)}
                          onFocus={() => setHighlight(visit.world)}
                          onBlur={() => setHighlight(null)}
                        >
                          <span className={styles.ordinal}>
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <span className={styles.stopBody}>
                            <span className={styles.stopTitle}>
                              {worldById(visit.world).name}
                              <small>System visit</small>
                            </span>
                            <span
                              id={`${visitDescriptionId}-${index}-fuel`}
                              className={styles.stopDetails}
                            >
                              Arrival: {visit.arrival} t · Departure:{' '}
                              {visit.departure} t
                            </span>
                            {visit.transactions.map((event, n) => (
                              <span
                                id={`${visitDescriptionId}-${index}-transaction-${n}`}
                                className={clsx(
                                  styles.stopDetails,
                                  event.source === 'gas-giant'
                                    ? styles.scoopedFuel
                                    : styles.purchasedFuel,
                                )}
                                key={n}
                              >
                                {transactionText(event)} ·{' '}
                                {event.fuelBeforeTons} → {event.fuelAfterTons} t
                              </span>
                            ))}
                            {passage.jumpCount === 0 && (
                              <span
                                id={`${visitDescriptionId}-${index}-stationary`}
                              >
                                Already at your destination. No travel needed.
                              </span>
                            )}
                          </span>
                        </button>
                        {leg && (
                          <p className={styles.manifestNote}>
                            Jump {worldById(leg.fromId).name} →{' '}
                            {worldById(leg.toId).name} · {leg.distance} pc ·
                            consumed {leg.fuelConsumedTons} t · remaining{' '}
                            {leg.fuelAfterTons} t
                          </p>
                        )}
                      </li>
                    );
                  })}
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
                      ? unreachableReason
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
              {voyage && (
                <p className={styles.manifestNote}>
                  Jump fuel: start {state.initialFuelTons} t · consumed{' '}
                  {voyage.consumed} t · purchased {voyage.purchased} t · scooped{' '}
                  {voyage.scooped} t · remaining {voyage.remaining} t. Initial
                  fuel is a sunk cost.
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

function CopyPassageLink({
  chart,
  imported,
  vessel,
  origin,
  destination,
  preference,
  stopsRequired,
  mode,
}: {
  chart: Subsector;
  imported: ImportedChart | null;
  vessel: Vessel;
  origin: string;
  destination: string;
  preference: RoutingPreference;
  stopsRequired: string[];
  mode: 'waypoints' | 'direct';
}) {
  const [message, setMessage] = useState('');
  async function copy() {
    try {
      const identity: PassageLink['chart'] =
        chart === demoChart
          ? { kind: 'demo' }
          : {
              kind: 'import',
              digest: await chartDigest(imported!.text),
              position: chart.position!,
              hint: imported!.source.slice(0, 120),
            };
      const payload = encodePassage({
        version: 3,
        stops: stopsRequired,
        mode,
        chart: identity,
        vessel,
        origin,
        destination,
        preference,
      });
      if (payload.length > MAX_PASSAGE_LENGTH) {
        setMessage(
          'Passage link is too long to share. Shorten referee source notes or reduce stops and try again.',
        );
        return;
      }
      if (!navigator.clipboard?.writeText) throw new Error('Unavailable');
      const url = new URL(window.location.href);
      url.search = '';
      url.hash = '';
      url.searchParams.set('passage', payload);
      await navigator.clipboard.writeText(url.toString());
      setMessage(
        chart === demoChart
          ? 'Passage link copied.'
          : 'Passage link copied. Recipients need the same imported chart data on their device.',
      );
    } catch {
      setMessage(
        'Could not copy passage link. Clipboard access is unavailable.',
      );
    }
  }
  return (
    <div className={styles.copyControl}>
      <button type="button" className={styles.sampleLink} onClick={copy}>
        Copy passage link
      </button>
      <span aria-live="polite">{message}</span>
    </div>
  );
}

function CopyPassage({ markdown }: { markdown: string }) {
  const [message, setMessage] = useState('');
  async function copy() {
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(markdown);
      setMessage('Passage copied to clipboard.');
    } catch {
      setMessage('Could not copy passage. Clipboard access is unavailable.');
    }
  }
  return (
    <div className={styles.copyControl}>
      <button type="button" className={styles.sampleLink} onClick={copy}>
        Copy passage
      </button>
      <span aria-live="polite">{message}</span>
    </div>
  );
}
