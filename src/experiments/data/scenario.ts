export type World = {
  id: string;
  name: string;
  col: number;
  row: number;
  port: string;
  fuel: string;
  note: string;
};
export const worlds: World[] = [
  {
    id: 'aster',
    name: 'Aster',
    col: 2,
    row: 8,
    port: 'A',
    fuel: 'Refined · Cr500/t',
    note: 'A bright departure port on a temperate ocean world.',
  },
  {
    id: 'bell',
    name: 'Bellwether',
    col: 3,
    row: 7,
    port: 'C',
    fuel: 'Unrefined · Cr100/t',
    note: 'A quiet exchange port above the cloud sea.',
  },
  {
    id: 'ilex',
    name: 'Ilex',
    col: 5,
    row: 6,
    port: 'B',
    fuel: 'Gas giant · free scooping',
    note: 'Pale rings and deep hydrogen skies. A natural place to replenish.',
  },
  {
    id: 'orison',
    name: 'Orison',
    col: 7,
    row: 4,
    port: 'A',
    fuel: 'Refined · Cr500/t',
    note: 'The northern terminus. White terraces overlook an inland sea.',
  },
  {
    id: 'vela',
    name: 'Vela',
    col: 6,
    row: 7,
    port: 'B',
    fuel: 'Refined · Cr500/t',
    note: 'A garden world at the edge of the inhabited reach.',
  },
  {
    id: 'meridian',
    name: 'Meridian',
    col: 2,
    row: 3,
    port: 'B',
    fuel: 'Refined · Cr500/t',
    note: 'An old observatory and a patient, well-equipped port.',
  },
  {
    id: 'nereid',
    name: 'Nereid',
    col: 4,
    row: 2,
    port: 'C',
    fuel: 'Unrefined · Cr100/t',
    note: 'A chain of island cities beneath a small blue sun.',
  },
  {
    id: 'pale',
    name: 'Pale',
    col: 6,
    row: 1,
    port: 'E',
    fuel: 'No local fuel',
    note: 'A remote research station on a chalk-white moon.',
  },
  {
    id: 'serein',
    name: 'Serein',
    col: 8,
    row: 7,
    port: 'D',
    fuel: 'Availability unverified',
    note: 'A rain-washed outpost beyond the regular passenger service.',
  },
  {
    id: 'morrow',
    name: 'Morrow',
    col: 1,
    row: 6,
    port: 'C',
    fuel: 'Unrefined · Cr100/t',
    note: 'A young settlement in a wide belt of asteroids.',
  },
  {
    id: 'cairn',
    name: 'Cairn',
    col: 4,
    row: 10,
    port: 'E',
    fuel: 'No local fuel',
    note: 'A silent stone world, visited by survey crews.',
  },
  {
    id: 'solace',
    name: 'Solace',
    col: 8,
    row: 10,
    port: 'B',
    fuel: 'Refined · Cr500/t',
    note: 'A distant refuge on the southern chart boundary.',
  },
];
export type Stop = {
  world: string;
  jump: number;
  action: string;
  cost: number;
  fuel: string;
};
export type Passage = { origin: string; destination: string; stops: Stop[] };
// Authored examples, not calculated routes. Fuel is a simplified jump-only budget.
export const passages: Passage[] = [
  {
    origin: 'aster',
    destination: 'orison',
    stops: [
      {
        world: 'aster',
        jump: 0,
        action: 'Depart with full tanks',
        cost: 0,
        fuel: '60 t aboard',
      },
      {
        world: 'bell',
        jump: 2,
        action: 'Buy 20 t unrefined fuel',
        cost: 2000,
        fuel: '20 → 40 t',
      },
      {
        world: 'ilex',
        jump: 2,
        action: 'Scoop 60 t unrefined fuel',
        cost: 0,
        fuel: '0 → 60 t',
      },
      {
        world: 'orison',
        jump: 3,
        action: 'Arrive at destination',
        cost: 0,
        fuel: '0 t remaining',
      },
    ],
  },
  {
    origin: 'aster',
    destination: 'vela',
    stops: [
      {
        world: 'aster',
        jump: 0,
        action: 'Depart with full tanks',
        cost: 0,
        fuel: '60 t aboard',
      },
      {
        world: 'bell',
        jump: 2,
        action: 'Buy 20 t unrefined fuel',
        cost: 2000,
        fuel: '20 → 40 t',
      },
      {
        world: 'ilex',
        jump: 2,
        action: 'Scoop 40 t unrefined fuel',
        cost: 0,
        fuel: '0 → 40 t',
      },
      {
        world: 'vela',
        jump: 2,
        action: 'Arrive at destination',
        cost: 0,
        fuel: '0 t remaining',
      },
    ],
  },
];
export const worldById = (id: string): World =>
  worlds.find((w) => w.id === id)!;
export const address = (w: World) =>
  `${String(w.col).padStart(2, '0')}${String(w.row).padStart(2, '0')}`;
export const point = (w: Pick<World, 'col' | 'row'>) => ({
  x: 38 + (w.col - 1) * 66,
  y: 38 + (w.row - 1) * 66 + (w.col % 2 === 0 ? 33 : 0),
});
export const hexes = Array.from({ length: 80 }, (_, i) => {
  const col = Math.floor(i / 10) + 1;
  const row = (i % 10) + 1;
  const { x, y } = point({ col, row });
  return {
    col,
    row,
    points: Array.from({ length: 6 }, (_, n) => {
      const a = (Math.PI * n) / 3;
      return `${x + 44 * Math.cos(a)},${y + 38 * Math.sin(a)}`;
    }).join(' '),
  };
});
export const credits = (n: number) => `Cr${n.toLocaleString('en-GB')}`;
