/** Axial hex coordinates; these are not display column/row addresses. */
export interface AxialHex {
  readonly q: number;
  readonly r: number;
}

/** Grid steps between two axial hexes, independent of map orientation. */
export function hexDistance(from: AxialHex, to: AxialHex): number {
  const dq = to.q - from.q;
  const dr = to.r - from.r;

  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}
