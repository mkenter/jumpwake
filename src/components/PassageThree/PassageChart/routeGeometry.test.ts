import { classicTraveller1981 } from '../../../rules/classicTraveller1981';
import { describe, expect, it } from 'vitest';
import { createRouter } from '../../../engine';
import { EMBER_REACH } from '../../../data/emberReach';
import {
  point,
  routeStops as formatStops,
  presentWorlds,
  type Stop,
} from '../presentation';
import { routeLegs as makeLegs } from './routeGeometry';

function visits(ids: string[]): Stop[] {
  return ids.map((world, index) => ({
    id: `visit-${index}`,
    world,
    kind: index === 0 ? 'departure' : 'jump',
    jump: 1,
    action: '',
    cost: 0,
    fuel: '',
  }));
}

describe('route chart lanes', () => {
  it('bows ordinary legs gently and aligns arrowheads with the arrival tangent', () => {
    const legs = routeLegs(visits(['aster', 'drift', 'echo']));
    expect(legs).toHaveLength(2);
    for (const leg of legs) {
      const start = point(worldById(leg.from));
      const end = point(worldById(leg.to));
      expect(leg.points).toHaveLength(4);
      expect(leg.points[0]).toEqual(start);
      expect(leg.points.at(-1)).toEqual(leg.arrow[1]);
      const [left, tip, right] = leg.arrow;
      const back = { x: (left!.x + right!.x) / 2, y: (left!.y + right!.y) / 2 };
      expect(Math.hypot(end.x - tip!.x, end.y - tip!.y)).toBeCloseTo(8);
      const dx = tip!.x - back.x;
      const dy = tip!.y - back.y;
      const approach = leg.points[2]!;
      expect(
        dx * (tip!.x - approach.x) + dy * (tip!.y - approach.y),
      ).toBeGreaterThan(0);
      expect(
        dx * (tip!.y - approach.y) - dy * (tip!.x - approach.x),
      ).toBeCloseTo(0);
      const departure = leg.points[1]!;
      const approachControl = leg.points[2]!;
      expect(
        Math.max(
          Math.abs(
            (departure.x - start.x) * (end.y - start.y) -
              (departure.y - start.y) * (end.x - start.x),
          ),
          Math.abs(
            (approachControl.x - start.x) * (end.y - start.y) -
              (approachControl.y - start.y) * (end.x - start.x),
          ),
        ),
      ).toBeGreaterThan(1);
    }
  });

  it('coordinates headings through successive stops without overshooting a reversal', () => {
    const flowing = routeLegs(visits(['aster', 'drift', 'echo', 'kestrel']));
    for (let i = 1; i < flowing.length; i++) {
      const previous = flowing[i - 1]!;
      const next = flowing[i]!;
      const tip = previous.points[3]!;
      const control = previous.points[2]!;
      const start = next.points[0]!;
      const departure = next.points[1]!;
      const ax = tip.x - control.x;
      const ay = tip.y - control.y;
      const bx = departure.x - start.x;
      const by = departure.y - start.y;
      expect(
        (ax * bx + ay * by) / (Math.hypot(ax, ay) * Math.hypot(bx, by)),
      ).toBeGreaterThan(0.98);
    }
    for (const leg of routeLegs(
      visits(['serein', 'ilex', 'serein', 'orison']),
    )) {
      const start = point(worldById(leg.from));
      const end = point(worldById(leg.to));
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.hypot(dx, dy);
      for (const control of leg.points) {
        const along =
          ((control.x - start.x) * dx + (control.y - start.y) * dy) / length;
        expect(along).toBeGreaterThanOrEqual(-1e-8);
        expect(along).toBeLessThanOrEqual(length + 1e-8);
      }
    }
  });

  it('separates opposing traversals while retaining their exact world endpoints', () => {
    const [out, back] = routeLegs(visits(['serein', 'ilex', 'serein']));
    expect(out!.traversals).toBe(2);
    expect(back!.traversals).toBe(2);
    expect(out!.points[0]).toEqual(point(worldById('serein')));
    expect(back!.points[0]).toEqual(point(worldById('ilex')));
    const middle = (points: { x: number; y: number }[]) => ({
      x:
        (points[0]!.x + 3 * points[1]!.x + 3 * points[2]!.x + points[3]!.x) / 8,
      y:
        (points[0]!.y + 3 * points[1]!.y + 3 * points[2]!.y + points[3]!.y) / 8,
    });
    const outward = middle(out!.points);
    const returning = middle(back!.points);
    const dx = back!.points[0]!.x - out!.points[0]!.x;
    const dy = back!.points[0]!.y - out!.points[0]!.y;
    const separation = Math.abs(
      (-(outward.x - returning.x) * dy + (outward.y - returning.y) * dx) /
        Math.hypot(dx, dy),
    );
    expect(separation).toBeGreaterThan(5);
    expect(separation).toBeLessThan(10);
    for (const leg of [out!, back!]) {
      const end = point(worldById(leg.to));
      expect(leg.points.at(-1)).toEqual(leg.arrow[1]);
      const approach = leg.points.at(-2)!;
      const tip = leg.arrow[1]!;
      expect(Math.hypot(end.x - tip.x, end.y - tip.y)).toBeCloseTo(8);
      const left = leg.arrow[0]!;
      const right = leg.arrow[2]!;
      const arrowX = tip.x - (left.x + right.x) / 2;
      const arrowY = tip.y - (left.y + right.y) / 2;
      expect(
        arrowX * (tip.y - approach.y) - arrowY * (tip.x - approach.x),
      ).toBeCloseTo(0);
    }
  });

  it('terminates every shaft at its open head for desktop and mobile markers', () => {
    for (const radius of [7, 11]) {
      const legs = routeLegs(
        visits(['serein', 'ilex', 'serein', 'orison']),
        radius,
      );
      for (const leg of legs) {
        const tip = leg.arrow[1]!;
        const center = point(worldById(leg.to));
        expect(leg.points.at(-1)).toEqual(tip);
        expect(Math.hypot(center.x - tip.x, center.y - tip.y)).toBeCloseTo(
          radius + 1,
        );
      }
    }
  });

  it('handles three traversals and repeated travel in the same direction', () => {
    const triple = routeLegs(visits(['serein', 'ilex', 'serein', 'ilex']));
    expect(triple.map((leg) => leg.traversals)).toEqual([3, 3, 3]);
    expect(triple.map((leg) => leg.points.length)).toEqual([4, 4, 4]);
    const sameDirection = routeLegs(
      visits(['serein', 'ilex', 'orison', 'serein', 'ilex']),
    );
    expect(sameDirection[0]!.points).not.toEqual(sameDirection[3]!.points);
    expect(new Set(sameDirection.map((leg) => leg.id)).size).toBe(4);
  });

  it('plots calculated jumps chronologically without counting refueling as travel', () => {
    const router = createRouter(EMBER_REACH, classicTraveller1981);
    const legs = routeLegs(routeStops(router.findRoute('aster', 'orison')));
    expect(legs.map((leg) => [leg.from, leg.to])).toEqual([
      ['aster', 'drift'],
      ['drift', 'echo'],
      ['echo', 'kestrel'],
      ['kestrel', 'serein'],
      ['serein', 'ilex'],
      ['ilex', 'serein'],
      ['serein', 'orison'],
    ]);
    expect(legs.map((leg) => leg.traversals)).toEqual([1, 1, 1, 1, 2, 2, 1]);
    expect(routeLegs([])).toEqual([]);
    expect(routeLegs(routeStops(router.findRoute('aster', 'aster')))).toEqual(
      [],
    );
    expect(routeLegs(routeStops(router.findRoute('aster', 'last')))).toEqual(
      [],
    );
    expect(routeLegs(visits(['aster', 'aster']))).toEqual([]);
  });
});

const worlds = presentWorlds(EMBER_REACH);
const worldById = (id: string) => worlds.find((w) => w.id === id)!;
const routeStops = (result: Parameters<typeof formatStops>[0]) =>
  formatStops(result, worldById);
const routeLegs = (stops: Parameters<typeof makeLegs>[0], radius = 7) =>
  makeLegs(stops, worldById, radius);
