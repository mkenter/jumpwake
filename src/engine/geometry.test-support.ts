import type { SubsectorHex } from './subsector';

// Independent display-grid BFS: no axial conversion or hex-distance formula.
// Even numbered Traveller columns sit half a row below odd columns.
// https://travellermap.com/doc/api
export const addresses: SubsectorHex[] = Array.from({ length: 80 }, (_, i) => ({
  column: Math.floor(i / 10) + 1,
  row: (i % 10) + 1,
}));
const index = ({ column, row }: SubsectorHex) => (column - 1) * 10 + row - 1;
const distances = addresses.map((origin) => {
  const steps = Array<number>(80).fill(Infinity);
  steps[index(origin)] = 0;
  const queue = [origin];
  for (const current of queue) {
    const { column, row } = current;
    const offset = column % 2 === 0 ? 1 : -1;
    for (const next of [
      { column, row: row - 1 },
      { column, row: row + 1 },
      { column: column - 1, row },
      { column: column + 1, row },
      { column: column - 1, row: row + offset },
      { column: column + 1, row: row + offset },
    ]) {
      if (next.column < 1 || next.column > 8 || next.row < 1 || next.row > 10)
        continue;
      if (steps[index(next)] !== Infinity) continue;
      steps[index(next)] = steps[index(current)]! + 1;
      queue.push(next);
    }
  }
  return steps;
});

export function displayDistance(from: SubsectorHex, to: SubsectorHex): number {
  return distances[index(from)]![index(to)]!;
}
