import { describe, expect, it } from 'vitest';
import { createRouter } from '../../engine';
import { EMBER_REACH } from '../../data/emberReach';
import { routeStops, worlds } from './presentation';
const router = createRouter(EMBER_REACH);
describe('calculated passage presentation', () => {
  it('keeps purchase, scoop and return visits in chronological order', () => {
    const result = router.findRoute('aster', 'orison');
    expect(result).toMatchObject({
      status: 'reachable',
      totalCostCredits: 4000,
      jumpCount: 7,
      totalDistance: 15,
    });
    const rows = routeStops(result);
    expect(rows.map((row) => [row.world, row.kind])).toEqual([
      ['aster', 'departure'],
      ['drift', 'jump'],
      ['drift', 'refuel'],
      ['echo', 'jump'],
      ['echo', 'refuel'],
      ['kestrel', 'jump'],
      ['kestrel', 'refuel'],
      ['serein', 'jump'],
      ['serein', 'refuel'],
      ['ilex', 'jump'],
      ['ilex', 'refuel'],
      ['serein', 'jump'],
      ['serein', 'refuel'],
      ['orison', 'jump'],
    ]);
    expect(new Set(rows.map((row) => row.id)).size).toBe(14);
    expect(rows[8]).toMatchObject({ cost: 2000, fuel: '0 → 20 t' });
    expect(rows[12]).toMatchObject({ cost: 2000, fuel: '40 → 60 t' });
    expect(rows[10]).toMatchObject({ cost: 0, fuel: '0 → 60 t' });
  });
  it('shows free scooping, unreachable and same-world results', () => {
    expect(router.findRoute('aster', 'cinder')).toMatchObject({
      totalCostCredits: 0,
      jumpCount: 3,
      totalDistance: 7,
    });
    const unreachable = router.findRoute('aster', 'last');
    expect(unreachable.status).toBe('unreachable');
    expect(routeStops(unreachable)).toEqual([]);
    const same = router.findRoute('aster', 'aster');
    expect(same).toMatchObject({
      jumpCount: 0,
      totalCostCredits: 0,
      fuelRemainingTons: 60,
    });
    expect(routeStops(same)).toHaveLength(1);
    expect(routeStops(same)[0]?.action).toContain(
      'Already at your destination',
    );
  });
  it('derives facilities from the authoritative data', () => {
    expect(worlds.find((w) => w.id === 'serein')?.fuel).toBe(
      'Unrefined · Cr100/t',
    );
    expect(worlds.find((w) => w.id === 'last')?.fuel).toBe('No local fuel');
    expect(worlds.find((w) => w.id === 'aster')?.fuel).toContain(
      'Refined · Cr500/t',
    );
    expect(worlds.every((w) => w.note)).toBe(true);
  });
});
