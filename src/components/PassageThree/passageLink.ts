import { createRouter, type RoutingPreference } from '../../engine';
import { demoChart, type Subsector } from '../../import/subsector';
import {
  createClassicTraveller1981Rules,
  validateShip,
} from '../../rules/classicTraveller1981';
import type { Vessel } from './vessel';

export interface PassageLink {
  version: 1;
  chart:
    | { kind: 'demo' }
    | { kind: 'import'; digest: string; position: string; hint: string };
  origin: string;
  destination: string;
  preference: RoutingPreference;
  vessel: Vessel;
}

export async function chartDigest(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

export function encodePassage(link: PassageLink): string {
  const bytes = new TextEncoder().encode(JSON.stringify(link));
  return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function decodePassage(encoded: string): PassageLink | null {
  try {
    if (!encoded || encoded.length > 2048 || !/^[A-Za-z0-9_-]+$/.test(encoded))
      return null;
    const raw = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
    const value: PassageLink = JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(
        Uint8Array.from(raw, (c) => c.charCodeAt(0)),
      ),
    );
    if (
      value.version !== 1 ||
      !value.chart ||
      !(
        value.chart.kind === 'demo' ||
        (value.chart.kind === 'import' &&
          /^[a-f0-9]{64}$/.test(value.chart.digest) &&
          typeof value.chart.position === 'string' &&
          /^[A-P]$/.test(value.chart.position) &&
          typeof value.chart.hint === 'string' &&
          value.chart.hint.length <= 120)
      ) ||
      typeof value.origin !== 'string' ||
      !value.origin ||
      value.origin.length > 100 ||
      typeof value.destination !== 'string' ||
      !value.destination ||
      value.destination.length > 100 ||
      !['lowest-fuel-cost', 'fewest-jumps'].includes(value.preference) ||
      !value.vessel?.ship ||
      !value.vessel?.state
    )
      return null;
    validateShip(value.vessel.ship, value.vessel.state);
    return value;
  } catch {
    return null;
  }
}

export function passageMatchesChart(
  link: PassageLink,
  chart: Subsector,
): boolean {
  if (
    link.chart.kind === 'demo'
      ? chart !== demoChart
      : chart.position !== link.chart.position
  )
    return false;
  if (
    !chart.worlds.some((w) => w.id === link.origin) ||
    !chart.worlds.some((w) => w.id === link.destination)
  )
    return false;
  try {
    return (
      createRouter(
        chart.worlds,
        createClassicTraveller1981Rules(link.vessel.ship, link.vessel.state),
      ).findRoute(link.origin, link.destination, link.preference).status ===
      'reachable'
    );
  } catch {
    return false;
  }
}
