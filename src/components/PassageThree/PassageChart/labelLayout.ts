import { curvePoint, type ChartPoint, type RouteLeg } from './routeGeometry';

type Rect = { left: number; top: number; right: number; bottom: number };
export type LabelMetrics = { width: number; top: number; bottom: number };
export type WorldLabel = LabelMetrics & ChartPoint & { id: string };
type Placement = ChartPoint & { bounds: Rect };
const chartBounds = { left: -16, top: -12, right: 622, bottom: 776 };

function overlap(a: Rect, b: Rect) {
  return (
    Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
    Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
  );
}

// Clip a segment against a rectangle. Sampling alone can miss a line that
// crosses a label between sample points, particularly at shallow angles.
function crosses(a: ChartPoint, b: ChartPoint, rect: Rect) {
  if (
    Math.max(a.x, b.x) < rect.left ||
    Math.min(a.x, b.x) > rect.right ||
    Math.max(a.y, b.y) < rect.top ||
    Math.min(a.y, b.y) > rect.bottom
  )
    return false;
  let low = 0;
  let high = 1;
  for (const [start, delta, min, max] of [
    [a.x, b.x - a.x, rect.left, rect.right],
    [a.y, b.y - a.y, rect.top, rect.bottom],
  ]) {
    if (Math.abs(delta!) < 1e-10) {
      if (start! < min! || start! > max!) return false;
    } else {
      const first = (min! - start!) / delta!;
      const second = (max! - start!) / delta!;
      low = Math.max(low, Math.min(first, second));
      high = Math.min(high, Math.max(first, second));
      if (low > high) return false;
    }
  }
  return true;
}

export function placeWorldLabels(
  labels: readonly WorldLabel[],
  legs: readonly RouteLeg[],
  markerRadius: number,
) {
  const segments: [ChartPoint, ChartPoint][] = [];
  const visits = new Map<string, number>();
  for (const leg of legs) {
    visits.set(leg.from, (visits.get(leg.from) ?? 0) + 1);
    visits.set(leg.to, (visits.get(leg.to) ?? 0) + 1);
    const sampled = Array.from({ length: 41 }, (_, i) =>
      curvePoint(leg.points, i / 40),
    );
    for (let i = 1; i < sampled.length; i++)
      segments.push([sampled[i - 1]!, sampled[i]!]);
    segments.push(
      [leg.arrow[0]!, leg.arrow[1]!],
      [leg.arrow[1]!, leg.arrow[2]!],
    );
  }
  const placements = new Map<string, Placement>();
  const ordered = [...labels].sort(
    (a, b) => (visits.get(b.id) ?? 0) - (visits.get(a.id) ?? 0),
  );
  const gap = markerRadius + 7;
  // A second pass lets early labels respond to the positions of later ones.
  for (let pass = 0; pass < 2; pass++) {
    for (const label of ordered) {
      const right = label.x + gap;
      const left = label.x - gap - label.width;
      const above = label.y - gap - label.bottom;
      const below = label.y + gap - label.top;
      const middle = label.y - (label.top + label.bottom) / 2;
      const candidates = [
        { x: right, y: label.y - 11 },
        { x: left, y: label.y - 11 },
        { x: right, y: below },
        { x: left, y: below },
        { x: label.x - label.width / 2, y: above },
        { x: label.x - label.width / 2, y: below },
        { x: right, y: above },
        { x: left, y: above },
        { x: right, y: middle },
        { x: left, y: middle },
      ];
      let best: Placement | undefined;
      let bestScore = Infinity;
      for (const [index, candidate] of candidates.entries()) {
        const bounds = {
          left: candidate.x - 4,
          right: candidate.x + label.width + 4,
          top: candidate.y + label.top - 4,
          bottom: candidate.y + label.bottom + 4,
        };
        if (
          bounds.left < chartBounds.left ||
          bounds.right > chartBounds.right ||
          bounds.top < chartBounds.top ||
          bounds.bottom > chartBounds.bottom
        )
          continue;
        let score = index * 4;
        for (const [a, b] of segments)
          if (crosses(a, b, bounds)) score += 10000;
        for (const [id, other] of placements)
          if (id !== label.id) {
            const area = overlap(bounds, other.bounds);
            if (area > 0) score += 100000 + area * 20;
          }
        for (const world of labels) {
          const distance = Math.hypot(
            world.x - Math.max(bounds.left, Math.min(world.x, bounds.right)),
            world.y - Math.max(bounds.top, Math.min(world.y, bounds.bottom)),
          );
          if (distance < markerRadius + 3) score += 1000000;
        }
        if (score < bestScore) {
          bestScore = score;
          best = { ...candidate, bounds };
        }
      }
      if (best) placements.set(label.id, best);
    }
  }
  return placements;
}
