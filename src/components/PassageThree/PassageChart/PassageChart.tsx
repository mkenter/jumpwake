import clsx from 'clsx';
import { motion, useReducedMotion } from 'motion/react';
import {
  address,
  hexes,
  point,
  worldById,
  worlds,
  type Stop,
} from '../../../data/passageScenario';
import styles from './PassageChart.module.css';

type Props = {
  stops: Stop[];
  selected: string | null;
  highlight: string | null;
  origin: string;
  destination: string;
  onInspect: (id: string, trigger: SVGElement) => void;
  onHighlight: (id: string | null) => void;
};

export function PassageChart({
  stops,
  selected,
  highlight,
  origin,
  destination,
  onInspect,
  onHighlight,
}: Props) {
  const reduced = useReducedMotion();
  return (
    <svg
      className={styles.chart}
      viewBox="-22 -16 650 716"
      role="group"
      aria-label="Lacuna subsector. Select a world to inspect; use its details to change endpoints."
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
      {stops.length > 0 && (
        <motion.polyline
          key={stops.at(-1)?.world}
          className={styles.route}
          points={stops
            .map((stop) => {
              const p = point(worldById(stop.world));
              return `${p.x},${p.y}`;
            })
            .join(' ')}
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduced ? 0 : 0.22 }}
          aria-hidden="true"
        />
      )}
      {worlds.map((world) => {
        const p = point(world);
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
              x={p.x - 42}
              y={p.y - 42}
              width="84"
              height="84"
              rx="22"
            />
            <circle className={styles.halo} cx={p.x} cy={p.y} r="22" />
            <circle
              className={styles.star}
              cx={p.x}
              cy={p.y}
              r={index >= 0 ? 12 : 4}
            />
            {index >= 0 && (
              <text
                className={styles.number}
                x={p.x}
                y={p.y + 5}
                textAnchor="middle"
              >
                {index + 1}
              </text>
            )}
            <text className={styles.name} x={p.x + 15} y={p.y - 11}>
              {world.name}
            </text>
            <text className={styles.code} x={p.x + 15} y={p.y + 8}>
              {endpoint ?? address(world)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
