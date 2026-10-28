import { motion, useReducedMotion } from 'motion/react';
import clsx from 'clsx';
import { usePassage } from '../usePassage';
import {
  worlds,
  worldById,
  address,
  point,
  hexes,
  credits,
} from '../data/scenario';
import styles from './PassageTwo.module.css';

export function PassageTwo() {
  const s = usePassage();
  const reduced = useReducedMotion();
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <a className={styles.brand} href="/explore">
          Jumpwake<span>THE NAVIGATOR’S ATLAS</span>
        </a>
        <span className={styles.ship}>
          J–3 <span>200 TONNES / SCOOPS EQUIPPED</span>
        </span>
      </header>
      <main id="exploration-main" tabIndex={-1}>
        <div className={styles.navigator}>
          <div>
            <div className={styles.eyebrow}>LACUNA / 01</div>
            <h1>
              Find your <br />
              faraway.
            </h1>
          </div>
          <div className={styles.endpoints}>
            <label>
              FROM
              <select
                aria-label="Origin"
                value={s.origin}
                onChange={(e) => s.setOrigin(e.target.value)}
              >
                {worlds.map((w) => (
                  <option value={w.id} key={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>
            <span aria-hidden="true">⟶</span>
            <label>
              TO
              <select
                aria-label="Destination"
                value={s.destination}
                onChange={(e) => s.setDestination(e.target.value)}
              >
                {worlds.map((w) => (
                  <option value={w.id} key={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className={styles.summary}>
            <strong>{s.passage ? '03' : '—'}</strong>
            <span>
              JUMPS
              <br />
              {s.passage ? credits(s.cost) : '—'} FUEL
            </span>
          </div>
        </div>
        <div
          className={styles.mobileTabs}
          role="group"
          aria-label="Planner view"
        >
          <button
            aria-pressed={s.view === 'chart'}
            onClick={() => s.setView('chart')}
          >
            Chart
          </button>
          <button
            aria-pressed={s.view === 'itinerary'}
            onClick={() => s.setView('itinerary')}
          >
            Itinerary
          </button>
        </div>
        <div className={styles.workspace}>
          <section
            className={clsx(
              styles.mapPanel,
              s.view !== 'chart' && styles.mobileHidden,
            )}
            aria-label="Subsector chart"
          >
            <div className={styles.mapLabel}>
              <span>N ↑</span>
              <span>THE LACUNA REACH / 8 × 10</span>
            </div>
            <svg
              className={styles.chart}
              viewBox="-20 -12 620 760"
              role="group"
              aria-label="Lacuna subsector, 8 columns by 10 rows. Select a world to inspect it."
            >
              <g className={styles.grid}>
                {hexes.map((h) => (
                  <polygon key={`${h.col}-${h.row}`} points={h.points} />
                ))}
              </g>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((c) => (
                <text
                  className={styles.coordinate}
                  key={c}
                  x={point({ col: c, row: 1 }).x}
                  y={-2}
                  textAnchor="middle"
                >
                  0{c}
                </text>
              ))}
              {s.stops.length > 0 && (
                <motion.polyline
                  className={styles.route}
                  points={s.stops
                    .map((stop) => {
                      const p = point(worldById(stop.world));
                      return `${p.x},${p.y}`;
                    })
                    .join(' ')}
                  initial={reduced ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                />
              )}
              {worlds.map((w) => {
                const p = point(w);
                const index = s.stops.findIndex((stop) => stop.world === w.id);
                return (
                  <g
                    key={w.id}
                    data-world={w.id}
                    className={clsx(
                      styles.world,
                      index >= 0 && styles.onRoute,
                      s.selected === w.id && styles.selected,
                    )}
                    role="button"
                    tabIndex={0}
                    aria-label={`Inspect ${w.name}, ${address(w)}`}
                    aria-pressed={s.selected === w.id}
                    onClick={() => s.select(w.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        s.select(w.id);
                      }
                    }}
                  >
                    <circle className={styles.hit} cx={p.x} cy={p.y} r="26" />
                    {s.selected === w.id && (
                      <circle
                        className={styles.halo}
                        cx={p.x}
                        cy={p.y}
                        r="20"
                      />
                    )}
                    <circle
                      className={styles.star}
                      cx={p.x}
                      cy={p.y}
                      r={index >= 0 ? 7 : 3.5}
                    />
                    {index >= 0 && (
                      <text
                        className={styles.stopNumber}
                        x={p.x}
                        y={p.y + 3}
                        textAnchor="middle"
                      >
                        {index + 1}
                      </text>
                    )}
                    <text className={styles.worldName} x={p.x + 13} y={p.y - 9}>
                      {w.name}
                    </text>
                    <text className={styles.worldCode} x={p.x + 13} y={p.y + 5}>
                      {address(w)} · {w.port}
                    </text>
                  </g>
                );
              })}
            </svg>
            <div className={styles.legend}>
              <span>
                <i /> Plotted passage
              </span>
              <span>◎ Selected world</span>
              <span>1 hex = 1 parsec</span>
            </div>
          </section>
          <aside className={styles.inspector} aria-label="World inspection">
            <span className={styles.instrument}>✳</span>
            <motion.div
              key={s.selected}
              initial={reduced ? false : { opacity: 0.7, x: 8 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: 0.16 }}
            >
              <div className={styles.eyebrow}>
                WORLD {address(s.world)} / PORT {s.world.port}
              </div>
              <h2>{s.world.name}</h2>
              <p>{s.world.note}</p>
              <div className={styles.fuel}>{s.world.fuel}</div>
              {s.stop && (
                <p className={styles.decision}>
                  {s.stop.action} · {s.stop.fuel}
                  {s.stop.cost > 0 ? ` · ${credits(s.stop.cost)}` : ''}
                </p>
              )}
              <div className={styles.actions}>
                <button
                  onClick={() => s.setOrigin(s.selected)}
                  disabled={s.origin === s.selected}
                >
                  Set origin
                </button>
                <button
                  onClick={() => s.setDestination(s.selected)}
                  disabled={s.destination === s.selected}
                >
                  Set destination
                </button>
              </div>
            </motion.div>
            <p className={styles.hint}>
              Touch a world on the chart.
              <br />
              Let the journey take shape.
            </p>
          </aside>
        </div>
        <section
          className={clsx(
            styles.itinerary,
            s.view !== 'itinerary' && styles.mobileHidden,
          )}
          aria-label="Itinerary"
        >
          <div className={styles.sectionHead}>
            <h2>The passage</h2>
            <span>SELECT A STOP TO INSPECT</span>
          </div>
          {s.passage ? (
            <ol className={styles.stops}>
              {s.stops.map((stop, i) => (
                <li key={stop.world}>
                  <button
                    className={clsx(
                      styles.stop,
                      s.selected === stop.world && styles.activeStop,
                    )}
                    aria-pressed={s.selected === stop.world}
                    onClick={(event) => {
                      const main = event.currentTarget.closest('main');
                      s.select(stop.world);
                      s.setView('chart');
                      requestAnimationFrame(() =>
                        main
                          ?.querySelector<SVGElement>(
                            `[data-world="${stop.world}"]`,
                          )
                          ?.focus(),
                      );
                    }}
                  >
                    <span className={styles.ordinal}>0{i + 1}</span>
                    <span>
                      <span className={styles.stopTitle}>
                        {worldById(stop.world).name}
                        <small>
                          {i === 0
                            ? 'DEPARTURE'
                            : `JUMP ${stop.jump} · ${stop.jump} PC`}
                        </small>
                      </span>
                      <span className={styles.stopAction}>{stop.action}</span>
                      <span className={styles.stopFuel}>{stop.fuel}</span>
                    </span>
                    <span className={styles.price}>
                      {stop.cost ? credits(stop.cost) : '—'}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <div className={styles.empty}>
              <h2>An uncharted passage.</h2>
              <p>
                No illustrative route is authored for these endpoints. Try Aster
                to Orison or Vela.
              </p>
              <button onClick={s.sample}>Restore sample journey</button>
            </div>
          )}
        </section>
      </main>
      <footer className={styles.footer}>
        <span>ILLUSTRATIVE ROUTE · NOT CALCULATED</span>
        <span>
          Fuel grades simplified · jump fuel only · no arrival reserve
        </span>
      </footer>
      <p className={styles.sr} role="status">
        {s.world.name} selected.{' '}
        {s.passage
          ? `${s.stops.length - 1} jumps, ${credits(s.cost)} purchased fuel.`
          : 'No authored route for these endpoints.'}
      </p>
    </div>
  );
}
