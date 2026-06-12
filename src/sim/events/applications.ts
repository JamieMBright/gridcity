// Connection applications: developers and big customers ask to join the
// network. Generation can be offered a firm connection (full access,
// constraint compensation if curtailed) or a flexible one (the operator
// may curtail freely — that was the deal). Accepted applicants build
// their own kit; the player owes them wires by the deadline or pays for
// every day they sit dark.

import type { GenType } from '../catalog';
import type { Rng } from '../rng';
import { TERRAIN, ZONE, type CityMap } from '../map/types';

export type AppKind = 'solarFarm' | 'windOnshore' | 'battery' | 'dataCentre' | 'evHub';

export interface Application {
  id: number;
  kind: AppKind;
  name: string;
  x: number;
  y: number;
  /** Capacity (gen) or demand (load), MW. */
  mw: number;
  /** Bill-paying customers a load connection brings. */
  customers: number;
  /** Decide by this game-minute or it lapses. */
  decideByMin: number;
  /** Once accepted: energize by this game-minute or pay daily damages. */
  connectByMin?: number | undefined;
  status: 'open' | 'firm' | 'flex' | 'declined' | 'connected' | 'expired';
  /** Asset id of the customer's kit once accepted (gen only). */
  assetId?: number | undefined;
  /** Whether the late-connection event has been announced. */
  overdueNotified?: boolean | undefined;
}

export const GEN_OF_KIND: Partial<Record<AppKind, GenType>> = {
  solarFarm: 'solarFarm',
  windOnshore: 'windOnshore',
  battery: 'battery',
};

/** Liquidated damages while an accepted connection sits dark, £k/day. */
export const LATE_PENALTY_K_PER_DAY = 25;
/** Days allowed to energize an accepted connection. */
export const CONNECT_DAYS = 90;
/** Days an open application waits in the inbox. */
export const DECIDE_DAYS = 30;

const NAMES: Record<AppKind, string[]> = {
  solarFarm: ['Meadow Light Solar', 'Three Fields Energy', 'Estuary Sun Co-op'],
  windOnshore: ['Marsh Ridge Wind', 'Greenway Turbines'],
  battery: ['GridStore Ltd', 'Peak Shift Storage'],
  dataCentre: ['Thamesport Data Campus', 'Eastbox Compute'],
  evHub: ['ChargeYard EV Hub', 'Orbital Charging'],
};

const SPECS: Record<AppKind, { mw: number; customers: number }> = {
  solarFarm: { mw: 50, customers: 0 },
  windOnshore: { mw: 100, customers: 0 },
  battery: { mw: 100, customers: 0 },
  dataCentre: { mw: 60, customers: 50 }, // mw randomized 40–120 at spawn
  evHub: { mw: 8, customers: 25 },
};

/** Data-centre demand band, MW (uniform at spawn). */
export const DATACENTRE_MW_MIN = 40;
export const DATACENTRE_MW_MAX = 120;
/** Data centres want dense urban fabric: tiles at least this populous. */
export const DATACENTRE_MIN_CUSTOMERS = 60;

function findSite(
  map: CityMap,
  rng: Rng,
  kind: AppKind,
  taken: (x: number, y: number) => boolean,
): { x: number; y: number } | undefined {
  for (let tries = 0; tries < 200; tries++) {
    const x = rng.int(map.width);
    const y = rng.int(map.height);
    const i = y * map.width + x;
    if (taken(x, y)) continue;
    const zone = map.zone[i];
    const terrain = map.terrain[i];
    switch (kind) {
      case 'solarFarm':
        if (zone === ZONE.solarSite) return { x, y };
        break;
      case 'windOnshore':
        if (zone === ZONE.none && terrain === TERRAIN.land && x > 110) return { x, y };
        break;
      case 'battery':
        if (zone === ZONE.none && terrain === TERRAIN.land) return { x, y };
        break;
      case 'dataCentre':
        // hyperscalers want the dense urban grid: fibre, staff, latency
        if ((map.customers[i] ?? 0) >= DATACENTRE_MIN_CUSTOMERS) return { x, y };
        break;
      case 'evHub':
        if (zone === ZONE.none && terrain === TERRAIN.land) return { x, y };
        break;
    }
  }
  return undefined;
}

/** Mean game-days between applications (more arrive as the city grows). */
function meanIntervalDays(servedCustomers: number): number {
  // brisk from day one — a quiet inbox is a boring inbox
  return servedCustomers > 20_000 ? 5 : servedCustomers > 2_000 ? 8 : 14;
}

export function maybeSpawnApplication(
  map: CityMap,
  rng: Rng,
  dtMin: number,
  simTimeMin: number,
  servedCustomers: number,
  nextId: number,
  taken: (x: number, y: number) => boolean,
): Application | undefined {
  const p = dtMin / (meanIntervalDays(servedCustomers) * 1440);
  if (!rng.chance(p)) return undefined;
  const kinds: AppKind[] = ['solarFarm', 'solarFarm', 'windOnshore', 'battery', 'dataCentre', 'evHub'];
  // data centres smell a grid that can feed them: the bigger the served
  // base, the more often they come knocking
  if (servedCustomers > 10_000) kinds.push('dataCentre');
  if (servedCustomers > 30_000) kinds.push('dataCentre', 'dataCentre');
  const kind = kinds[rng.int(kinds.length)] ?? 'solarFarm';
  const site = findSite(map, rng, kind, taken);
  if (!site) return undefined;
  const names = NAMES[kind];
  const spec = SPECS[kind];
  const mw =
    kind === 'dataCentre'
      ? DATACENTRE_MW_MIN + rng.int(DATACENTRE_MW_MAX - DATACENTRE_MW_MIN + 1)
      : spec.mw;
  return {
    id: nextId,
    kind,
    name: names[rng.int(names.length)] ?? kind,
    x: site.x,
    y: site.y,
    mw,
    customers: spec.customers,
    decideByMin: simTimeMin + DECIDE_DAYS * 1440,
    status: 'open',
  };
}
