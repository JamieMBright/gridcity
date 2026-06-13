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
  /** The bespoke once-per-game Heathrow scheme: a BIG combined PV + BESS
   *  on the airport estate. Studies + connects as solar generation (its
   *  `kind`), but on acceptance ALSO spawns a co-located battery of
   *  `bessMw`. Surfaced distinctly on the news banner. */
  heathrow?: boolean | undefined;
  /** Battery capacity paired with the Heathrow PV scheme, MW. */
  bessMw?: number | undefined;
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
  /** Litigation (#54): a damages claim has been escalated for this overdue
   *  connection (so it escalates at most once). */
  claimed?: boolean | undefined;
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

/** Mean game-days between a GENERATION application: the developer pipeline
 *  is brisk from day one (a quiet inbox is a dead game) and quickens as
 *  the served base grows. A neutral org sees ~1/week at the baseline. */
function genIntervalDays(servedCustomers: number): number {
  return servedCustomers > 20_000 ? 5 : servedCustomers > 2_000 ? 6 : 7;
}

/** Mean game-days between a DEMAND application (data centre / EV hub).
 *  Demand connections seek out the grid that can feed them, so they
 *  quicken with the served base — but even a day-1 operator fields about
 *  one a week (developers want to BE the reason the grid grows). */
function demandIntervalDays(servedCustomers: number): number {
  return servedCustomers > 20_000 ? 5 : servedCustomers > 2_000 ? 6 : 7;
}

/** The generation mix gets richer the bigger the grid (more storage/wind
 *  interest); the demand mix tilts toward data centres on a fed grid. */
function genKindsFor(_servedCustomers: number): AppKind[] {
  return ['solarFarm', 'solarFarm', 'windOnshore', 'battery'];
}
function demandKindsFor(servedCustomers: number): AppKind[] {
  const kinds: AppKind[] = ['dataCentre', 'evHub', 'evHub'];
  // data centres smell a grid that can feed them: the bigger the served
  // base, the more often they come knocking
  if (servedCustomers > 10_000) kinds.push('dataCentre');
  if (servedCustomers > 30_000) kinds.push('dataCentre', 'dataCentre');
  return kinds;
}

function buildApplication(
  map: CityMap,
  rng: Rng,
  kind: AppKind,
  simTimeMin: number,
  nextId: number,
  taken: (x: number, y: number) => boolean,
): Application | undefined {
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

/** The Heathrow PV+BESS scheme's capacity (owner: "a BIG combined solar +
 *  battery installation"). Airport-scale: ~80 MW of canopy/field PV beside
 *  the runways, firmed by ~60 MW / 120 MWh of grid-forming battery. */
export const HEATHROW_PV_MW = 80;
export const HEATHROW_BESS_MW = 60;

/** Build the bespoke once-per-game Heathrow scheme as a SOLAR application
 *  (so it flows through the normal connection-study + firm/flex machinery),
 *  flagged `heathrow` with its paired battery size. Sited on the airport
 *  estate (just south-west of the terminal island, open apron-edge land).
 *  Deterministic: the caller gates it on a seeded fire-time. */
export function buildHeathrowScheme(
  map: CityMap,
  simTimeMin: number,
  nextId: number,
  taken: (x: number, y: number) => boolean,
): Application | undefined {
  // prefer open land on the airfield apron edge (around the terminal at
  // ~65,87), falling back to any open land nearby so the scheme always
  // sites even if the immediate tiles are occupied
  const candidates: Array<[number, number]> = [];
  for (let r = 1; r <= 8; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        candidates.push([65 + dx, 87 + dy]);
      }
    }
  }
  for (const [x, y] of candidates) {
    if (x < 0 || y < 0 || x >= map.width || y >= map.height) continue;
    const i = y * map.width + x;
    if (taken(x, y)) continue;
    if (map.terrain[i] !== TERRAIN.land) continue;
    if (map.zone[i] !== ZONE.none) continue;
    return {
      id: nextId,
      kind: 'solarFarm',
      name: 'Heathrow Airport Solar + Storage',
      x,
      y,
      mw: HEATHROW_PV_MW,
      customers: 0,
      decideByMin: simTimeMin + DECIDE_DAYS * 1440,
      status: 'open',
      heathrow: true,
      bessMw: HEATHROW_BESS_MW,
    };
  }
  return undefined;
}

/** Roll the connection pipeline this tick: an INDEPENDENT generation
 *  stream and demand stream, each arriving on its own ~weekly Poisson
 *  cadence (so a neutral org fields roughly one new generation AND one new
 *  demand application a game-week — not a single shared stream that the
 *  gen-heavy kind list starved demand out of). Both rolls come off the
 *  seeded `rng`, so saves replay identically; `nextId` is consumed in
 *  order (gen first, then demand) and the caller bumps state.nextAppId per
 *  returned app. Returns 0–2 applications. */
export function maybeSpawnApplications(
  map: CityMap,
  rng: Rng,
  dtMin: number,
  simTimeMin: number,
  servedCustomers: number,
  nextId: number,
  taken: (x: number, y: number) => boolean,
): Application[] {
  const out: Application[] = [];
  let id = nextId;
  // generation stream
  if (rng.chance(dtMin / (genIntervalDays(servedCustomers) * 1440))) {
    const pool = genKindsFor(servedCustomers);
    const kind = pool[rng.int(pool.length)] ?? 'solarFarm';
    const app = buildApplication(map, rng, kind, simTimeMin, id, taken);
    if (app) {
      out.push(app);
      id++;
    }
  }
  // demand stream
  if (rng.chance(dtMin / (demandIntervalDays(servedCustomers) * 1440))) {
    const pool = demandKindsFor(servedCustomers);
    const kind = pool[rng.int(pool.length)] ?? 'evHub';
    const app = buildApplication(map, rng, kind, simTimeMin, id, taken);
    if (app) out.push(app);
  }
  return out;
}
