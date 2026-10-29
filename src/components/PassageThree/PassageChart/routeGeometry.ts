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

// SVG chart units, before responsive scaling. Repeated undirected legs get
// separate lanes, even when they are travelled in opposite directions.
const laneSpacing = 7;
const leadLength = 16;

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
    // A fixed normal prevents reversing travel from reversing the offset and
    // accidentally painting the outward and return legs onto the same lane.
    const orientation = leg.from < leg.to ? 1 : -1;
    const nx = -uy * orientation;
    const ny = ux * orientation;
    const lead = Math.min(leadLength, length / 4);
    // The route terminates at the arrow tip on the destination marker's
    // outer stroke, so no shaft extends past the head or disappears inside it.
    const approachX = ux * lead - nx * offset;
    const approachY = uy * lead - ny * offset;
    const approachLength = Math.hypot(approachX, approachY);
    const ax = approachX / approachLength;
    const ay = approachY / approachLength;
    const arrivalInset = markerRadius + 1; // Half of the marker's 2-unit stroke.
    const arrowX = end.x - ax * arrivalInset;
    const arrowY = end.y - ay * arrivalInset;
    const arrival = { x: arrowX, y: arrowY };
    return {
      id: leg.id,
      from: leg.from,
      to: leg.to,
      traversals,
      points:
        offset === 0
          ? [start, arrival]
          : [
              start,
              {
                x: start.x + ux * lead + nx * offset,
                y: start.y + uy * lead + ny * offset,
              },
              {
                x: end.x - ux * lead + nx * offset,
                y: end.y - uy * lead + ny * offset,
              },
              arrival,
            ],
      arrow: [
        { x: arrowX - ax * 6 - ay * 3, y: arrowY - ay * 6 + ax * 3 },
        { x: arrowX, y: arrowY },
        { x: arrowX - ax * 6 + ay * 3, y: arrowY - ay * 6 - ax * 3 },
      ],
    };
  });
}
