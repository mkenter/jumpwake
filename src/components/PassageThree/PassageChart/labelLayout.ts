import { curvePoint, type ChartPoint, type RouteLeg } from './routeGeometry';

type Rect = { left: number; top: number; right: number; bottom: number };
export type LabelMetrics = {
  width: number;
  top: number;
  bottom: number;
  nameBottom?: number;
  nameWidth?: number;
};
export type WorldLabel = LabelMetrics &
  ChartPoint & { id: string; markerRadius?: number };
export type Placement = ChartPoint & {
  bounds: Rect;
  visible: boolean;
  compact?: boolean;
};
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
  endpoints: readonly string[] = [],
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
    (a, b) =>
      Number(endpoints.includes(b.id)) - Number(endpoints.includes(a.id)) ||
      Number(visits.has(b.id)) - Number(visits.has(a.id)) ||
      a.x - b.x ||
      a.y - b.y ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
  // Greedy packing in a stable priority order. Only accepted labels reserve space.
  // Keep a fallback position for interaction, but never accept a collision.
  for (const label of ordered) {
    let best: Placement | undefined;
    let bestScore = Infinity;
    for (const compact of label.nameBottom === undefined
      ? [false]
      : [false, true]) {
      const width = compact ? (label.nameWidth ?? label.width) : label.width;
      const bottom = compact ? label.nameBottom! : label.bottom;
      const gap = (label.markerRadius ?? markerRadius) + 7;
      const right = label.x + gap;
      const left = label.x - gap - width;
      const above = label.y - gap - bottom;
      const below = label.y + gap - label.top;
      const middle = label.y - (label.top + bottom) / 2;
      const candidates = [
        { x: right, y: label.y - 11 },
        { x: left, y: label.y - 11 },
        { x: right, y: below },
        { x: left, y: below },
        { x: label.x - width / 2, y: above },
        { x: label.x - width / 2, y: below },
        { x: right, y: above },
        { x: left, y: above },
        { x: right, y: middle },
        { x: left, y: middle },
        { x: right, y: label.y - bottom },
        { x: left, y: label.y - bottom },
        { x: right, y: label.y - label.top },
        { x: left, y: label.y - label.top },
      ];
      for (const [index, candidate] of candidates.entries()) {
        const bounds = {
          left: candidate.x - 4,
          right: candidate.x + width + 4,
          top: candidate.y + label.top - 4,
          bottom: candidate.y + bottom + 4,
        };
        if (
          bounds.left < chartBounds.left ||
          bounds.right > chartBounds.right ||
          bounds.top < chartBounds.top ||
          bounds.bottom > chartBounds.bottom
        )
          continue;
        let score = index * 4 + (compact ? 1000 : 0);
        for (const [a, b] of segments)
          if (crosses(a, b, bounds)) score += 10000;
        for (const [id, other] of placements)
          if (id !== label.id && other.visible) {
            const area = overlap(bounds, other.bounds);
            if (area > 0) score += 100000 + area * 20;
          }
        for (const world of labels) {
          const distance = Math.hypot(
            world.x - Math.max(bounds.left, Math.min(world.x, bounds.right)),
            world.y - Math.max(bounds.top, Math.min(world.y, bounds.bottom)),
          );
          if (distance < (world.markerRadius ?? markerRadius) + 3)
            score += 1000000;
        }
        if (score < bestScore) {
          bestScore = score;
          best = { ...candidate, bounds, compact, visible: score < 10000 };
        }
      }
    }
    if (best) placements.set(label.id, best);
  }
  return placements;
}

/** Reveal interacting labels without moving the resting layout. Temporarily hide
 * lower-priority neighbors under their fallback label, then restore on blur. */
export function revealWorldLabels(
  placements: ReadonlyMap<string, Placement>,
  active: readonly string[],
) {
  const result = new Map(placements);
  const revealed: Placement[] = [];
  for (const id of active) {
    const label = placements.get(id);
    if (!label) continue;
    // Two simultaneous interactions may conflict; the first wins.
    if (revealed.some((other) => overlap(label.bounds, other.bounds) > 0))
      continue;
    for (const [otherId, other] of result) {
      if (otherId !== id && overlap(label.bounds, other.bounds) > 0)
        result.set(otherId, { ...other, visible: false });
    }
    const shown = { ...label, visible: true };
    result.set(id, shown);
    revealed.push(shown);
  }
  return result;
}
