import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { motion, useReducedMotion } from 'motion/react';
import {
  address,
  hexes,
  point,
  type PresentedWorld,
  type Stop,
} from '../presentation';
import { routeLegs } from './routeGeometry';
import {
  placeWorldLabels,
  revealWorldLabels,
  type LabelMetrics,
} from './labelLayout';
import styles from './PassageChart.module.css';

type Props = {
  worlds: readonly PresentedWorld[];
  title: string;
  stops: Stop[];
  visible: boolean;
  selected: string | null;
  highlight: string | null;
  origin: string;
  destination: string;
  onInspect: (id: string, trigger: SVGElement) => void;
  onHighlight: (id: string | null) => void;
};

export function PassageChart({
  worlds,
  title,
  stops,
  visible,
  selected,
  highlight,
  origin,
  destination,
  onInspect,
  onHighlight,
}: Props) {
  const reduced = useReducedMotion();
  const [largeMarkers, setLargeMarkers] = useState(
    () => window.matchMedia('(max-width: 700px)').matches,
  );
  useEffect(() => {
    const query = window.matchMedia('(max-width: 700px)');
    const update = () => setLargeMarkers(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  const markerRadius = largeMarkers ? 11 : 7;
  const legs = useMemo(
    () =>
      routeLegs(stops, (id) => worlds.find((w) => w.id === id)!, markerRadius),
    [stops, markerRadius, worlds],
  );
  const svgRef = useRef<SVGSVGElement>(null);
  const [metrics, setMetrics] = useState<Record<string, LabelMetrics>>({});
  useLayoutEffect(() => {
    if (!visible) return;
    const measured: Record<string, LabelMetrics> = {};
    for (const world of worlds) {
      const group = svgRef.current?.querySelector(`[data-world="${world.id}"]`);
      const name = group?.querySelector<SVGTextElement>('[data-label-name]');
      const code = group?.querySelector<SVGTextElement>('[data-label-code]');
      if (!name?.getBBox || !code?.getBBox) continue;
      const a = name.getBBox();
      const b = code.getBBox();
      measured[world.id] = {
        width: Math.max(a.width, b.width),
        top: a.y,
        bottom: b.y + b.height,
        nameBottom: a.y + a.height,
        nameWidth: a.width,
      };
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Measure SVG glyphs before paint so label placement does not visibly jump.
    setMetrics(measured);
  }, [largeMarkers, origin, destination, visible, worlds]);
  const labels = useMemo(
    () =>
      placeWorldLabels(
        worlds.map((world) => ({
          id: world.id,
          markerRadius: stops.some((stop) => stop.world === world.id)
            ? markerRadius
            : 3.5,
          ...point(world),
          ...(metrics[world.id] ?? {
            width: Math.max(
              world.name.split(' ')[0]!.length * (largeMarkers ? 14 : 10),
              60,
            ),
            top: largeMarkers ? -24 : -18,
            bottom: largeMarkers ? 29 : 23,
          }),
        })),
        legs,
        markerRadius,
        [origin, destination],
      ),
    [
      metrics,
      legs,
      markerRadius,
      largeMarkers,
      worlds,
      origin,
      destination,
      stops,
    ],
  );
  const shownLabels = revealWorldLabels(
    labels,
    [highlight, selected].filter((id): id is string => Boolean(id)),
  );
  return (
    <svg
      ref={svgRef}
      className={styles.chart}
      viewBox="-22 -18 650 800"
      role="group"
      aria-label={`${title} subsector. Select a world to inspect; use its details to change endpoints.`}
    >
      <g className={styles.grid} aria-hidden="true">
        {hexes.map((hex) => (
          <polygon key={`${hex.col}-${hex.row}`} points={hex.points} />
        ))}
      </g>
      {[1, 2, 3, 4, 5, 6, 7, 8].map((col) => (
        <text
          aria-hidden="true"
          className={styles.coordinate}
          key={col}
          x={point({ col, row: 1 }).x}
          y={-3}
          textAnchor="middle"
        >
          0{col}
        </text>
      ))}
      {legs.length > 0 && (
        <motion.g
          key={stops.map((stop) => stop.world).join('-')}
          className={styles.route}
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduced ? 0 : 0.22 }}
          aria-hidden="true"
        >
          {legs.map((leg) => (
            <g key={leg.id}>
              <path
                data-route-leg={leg.id}
                data-from={leg.from}
                data-to={leg.to}
                data-traversals={leg.traversals}
                d={`M ${leg.points[0]!.x} ${leg.points[0]!.y} C ${leg.points
                  .slice(1)
                  .map((p) => `${p.x} ${p.y}`)
                  .join(' ')}`}
              />
              <polyline
                data-route-arrow={leg.id}
                className={styles.arrow}
                points={leg.arrow.map((p) => `${p.x},${p.y}`).join(' ')}
              />
            </g>
          ))}
        </motion.g>
      )}
      {worlds.map((world) => {
        const p = point(world);
        const label = shownLabels.get(world.id) ?? {
          x: p.x + 15,
          y: p.y - 11,
          visible: false,
          compact: false,
        };
        const index = stops.findIndex((stop) => stop.world === world.id);
        const endpoint =
          world.id === origin
            ? 'Origin'
            : world.id === destination
              ? 'Destination'
              : null;
        return (
          <g
            key={world.id}
            data-world={world.id}
            data-highlighted={highlight === world.id}
            className={clsx(
              styles.world,
              index >= 0 && styles.onRoute,
              selected === world.id && styles.selected,
              highlight === world.id && styles.highlighted,
            )}
            role="button"
            tabIndex={0}
            aria-label={`Inspect ${world.name}, ${address(world)}`}
            aria-pressed={selected === world.id}
            onClick={(event) => onInspect(world.id, event.currentTarget)}
            onMouseEnter={() => onHighlight(world.id)}
            onMouseLeave={() => onHighlight(null)}
            onFocus={() => onHighlight(world.id)}
            onBlur={() => onHighlight(null)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onInspect(world.id, event.currentTarget);
              }
            }}
          >
            <title>
              {world.name} · {address(world)} · Port {world.port}
              {endpoint ? ` · ${endpoint}` : ''}
            </title>
            <rect
              className={styles.hit}
              x={p.x - (worlds.length > 15 ? 24 : 42)}
              y={p.y - (worlds.length > 15 ? 24 : 42)}
              width={worlds.length > 15 ? 48 : 84}
              height={worlds.length > 15 ? 48 : 84}
              rx="22"
            />
            <circle className={styles.halo} cx={p.x} cy={p.y} r="22" />
            <circle
              className={styles.star}
              cx={p.x}
              cy={p.y}
              r={index >= 0 ? markerRadius : 3.5}
            />
            <g
              pointerEvents="none"
              visibility={label.visible ? 'visible' : 'hidden'}
              data-world-label={world.id}
              transform={`translate(${label.x} ${label.y})`}
            >
              <text data-label-name className={styles.name} x="0" y="0">
                {world.sourceHex
                  ? world.name.length > 12
                    ? `${world.name.slice(0, 11)}…`
                    : world.name
                  : world.name.split(' ')[0]}
              </text>
              <text
                visibility={label.compact ? 'hidden' : undefined}
                data-label-code
                className={styles.code}
                x="0"
                y={largeMarkers ? 24 : 19}
              >
                {endpoint ?? address(world)}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}
