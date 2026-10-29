import { point, worldById, type Stop } from '../presentation';

export type ChartPoint = { x: number; y: number };
export type RouteLeg = {
  id: string;
  from: string;
  to: string;
  traversals: number;
  points: ChartPoint[];
  arrow: ChartPoint[];
};

const laneSpacing = 8;
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

// A shared tangent through a stop lets consecutive jumps read as one journey.
// At a reversal, retain the leg's own heading rather than making a zero tangent.
function tangent(a: ChartPoint, b: ChartPoint, heading: ChartPoint) {
  const aLength = Math.hypot(a.x, a.y);
  const bLength = Math.hypot(b.x, b.y);
  const x = a.x / aLength + b.x / bLength;
  const y = a.y / aLength + b.y / bLength;
  const length = Math.hypot(x, y);
  return length < 0.1
    ? {
        x: heading.x / Math.hypot(heading.x, heading.y),
        y: heading.y / Math.hypot(heading.x, heading.y),
      }
    : { x: x / length, y: y / length };
}

export function curvePoint(
  points: readonly ChartPoint[],
  t: number,
): ChartPoint {
  const [a, b, c, d] = points;
  const s = 1 - t;
  return {
    x:
      s ** 3 * a!.x +
      3 * s * s * t * b!.x +
      3 * s * t * t * c!.x +
      t ** 3 * d!.x,
    y:
      s ** 3 * a!.y +
      3 * s * s * t * b!.y +
      3 * s * t * t * c!.y +
      t ** 3 * d!.y,
  };
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
        index,
        edge: JSON.stringify([from.world, stop.world].sort()),
      },
    ];
  });
  const totals = new Map<string, number>();
  const used = new Map<string, number>();
  const sweeps = new Map<
    string,
    { from: string; first: ChartPoint; second: ChartPoint }
  >();
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
    const orientation = dx > 0 || (dx === 0 && dy < 0) ? -1 : 1;
    const nx = (-dy / length) * orientation;
    const ny = (dx / length) * orientation;
    let sweep = sweeps.get(leg.edge);
    if (!sweep) {
      const previous = visits[leg.index - 1];
      const next = visits[leg.index + 2];
      const prev = previous ? point(worldById(previous.world)) : start;
      const following = next ? point(worldById(next.world)) : end;
      const heading = { x: dx, y: dy };
      const departure =
        previous && previous.world !== leg.from
          ? tangent(
              { x: start.x - prev.x, y: start.y - prev.y },
              heading,
              heading,
            )
          : { x: dx / length, y: dy / length };
      const arrival =
        next && next.world !== leg.to
          ? tangent(
              heading,
              { x: following.x - end.x, y: following.y - end.y },
              heading,
            )
          : { x: dx / length, y: dy / length };
      const handle = Math.min(length / 3, 60);
      const first = {
        x: start.x + departure.x * handle,
        y: start.y + departure.y * handle,
      };
      const second = {
        x: end.x - arrival.x * handle,
        y: end.y - arrival.y * handle,
      };
      // A single or fully collinear journey still gets a quiet cartographic bow.
      if (
        Math.abs((first.x - start.x) * dy - (first.y - start.y) * dx) < 0.01 &&
        Math.abs((second.x - start.x) * dy - (second.y - start.y) * dx) < 0.01
      ) {
        const bow = Math.min(length * 0.12, 24);
        first.x += nx * bow;
        first.y += ny * bow;
        second.x += nx * bow;
        second.y += ny * bow;
      }
      sweep = { from: leg.from, first, second };
      sweeps.set(leg.edge, sweep);
    }
    // Retraced legs reuse the same sweep in reverse, with a separate lane.
    const first = sweep.from === leg.from ? sweep.first : sweep.second;
    const second = sweep.from === leg.from ? sweep.second : sweep.first;
    const points = trimArrival(
      start,
      { x: first.x + (nx * offset) / 0.75, y: first.y + (ny * offset) / 0.75 },
      {
        x: second.x + (nx * offset) / 0.75,
        y: second.y + (ny * offset) / 0.75,
      },
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
