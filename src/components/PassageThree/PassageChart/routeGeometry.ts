import { point, worldById, type Stop } from '../presentation';

type ChartPoint = { x: number; y: number };
type RouteLeg = {
  id: string;
  from: string;
  to: string;
  traversals: number;
  points: ChartPoint[];
  arrow: ChartPoint[];
};

const laneSpacing = 7;
const mix = (a: ChartPoint, b: ChartPoint, t: number): ChartPoint => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

// De Casteljau subdivision preserves the original curve exactly while trimming
// its arrival end to the marker's edge, rather than approximating a straight tip.
function trimArrival(
  start: ChartPoint,
  first: ChartPoint,
  second: ChartPoint,
  end: ChartPoint,
  inset: number,
): ChartPoint[] {
  function split(t: number) {
    const a = mix(start, first, t);
    const b = mix(first, second, t);
    const c = mix(second, end, t);
    const d = mix(a, b, t);
    const e = mix(b, c, t);
    return [start, a, d, mix(d, e, t)];
  }
  let low = 0;
  let high = 1;
  for (let i = 0; i < 32; i++) {
    const t = (low + high) / 2;
    const arrival = split(t)[3]!;
    if (Math.hypot(end.x - arrival.x, end.y - arrival.y) > inset) low = t;
    else high = t;
  }
  return split((low + high) / 2);
}

export function routeLegs(
  stops: readonly Stop[],
  markerRadius = 7,
): RouteLeg[] {
  const visits = stops.filter((stop) => stop.kind !== 'refuel');
  const legs = visits.slice(1).flatMap((stop, index) => {
    const from = visits[index]!;
    if (from.world === stop.world) return [];
    return [
      {
        id: stop.id,
        from: from.world,
        to: stop.world,
        edge: JSON.stringify([from.world, stop.world].sort()),
      },
    ];
  });
  const totals = new Map<string, number>();
  const used = new Map<string, number>();
  for (const leg of legs) totals.set(leg.edge, (totals.get(leg.edge) ?? 0) + 1);

  return legs.map((leg) => {
    const start = point(worldById(leg.from));
    const end = point(worldById(leg.to));
    const traversals = totals.get(leg.edge)!;
    const lane = used.get(leg.edge) ?? 0;
    used.set(leg.edge, lane + 1);
    const offset = (lane - (traversals - 1) / 2) * laneSpacing;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    const ux = dx / length;
    const uy = dy / length;
    // Lift horizontal/diagonal journeys upward and vertical ones leftward.
    // This normal is identical in both travel directions, keeping return lanes
    // on the same sweep rather than mirroring them into a different route.
    const orientation = dx > 0 || (dx === 0 && dy < 0) ? -1 : 1;
    const nx = -uy * orientation;
    const ny = ux * orientation;
    const bend = Math.min(length * 0.2, 44) + offset / 0.75;
    const points = trimArrival(
      start,
      { x: start.x + dx / 3 + nx * bend, y: start.y + dy / 3 + ny * bend },
      { x: end.x - dx / 3 + nx * bend, y: end.y - dy / 3 + ny * bend },
      end,
      markerRadius + 1,
    );
    const arrival = points[3]!;
    const control = points[2]!;
    const approachLength = Math.hypot(
      arrival.x - control.x,
      arrival.y - control.y,
    );
    const ax = (arrival.x - control.x) / approachLength;
    const ay = (arrival.y - control.y) / approachLength;
    return {
      id: leg.id,
      from: leg.from,
      to: leg.to,
      traversals,
      points,
      arrow: [
        { x: arrival.x - ax * 6 - ay * 3, y: arrival.y - ay * 6 + ax * 3 },
        arrival,
        { x: arrival.x - ax * 6 + ay * 3, y: arrival.y - ay * 6 - ax * 3 },
      ],
    };
  });
}
