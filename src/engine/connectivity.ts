import type { RouteSystem } from '../rules/types';
import { hexDistance } from './hexDistance';
import { toAxial } from './subsector';

/** Whether a chain of jumps exists without considering fuel. */
export function hasJumpChain(
  systems: readonly RouteSystem[],
  originId: string,
  destinationId: string,
  maxJumpDistance: number,
): boolean {
  const origin = systems.find((system) => system.id === originId);
  if (!origin || !systems.some((system) => system.id === destinationId))
    throw new Error('Unknown system');
  const visited = new Set([originId]);
  const queue = [origin];
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i]!;
    if (current.id === destinationId) return true;
    for (const system of systems) {
      if (
        !visited.has(system.id) &&
        hexDistance(toAxial(current.hex), toAxial(system.hex)) <=
          maxJumpDistance
      ) {
        visited.add(system.id);
        queue.push(system);
      }
    }
  }
  return false;
}
