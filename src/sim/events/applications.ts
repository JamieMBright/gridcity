// Connection applications: developers and big customers ask to join the
// network. Generation can be offered a firm connection (full access,
// constraint compensation if curtailed) or a flexible one (the operator
// may curtail freely — that was the deal). Accepted applicants build
// their own kit; the player owes them wires by the deadline or pays for
// every day they sit dark.

import type { GenType } from '../catalog';
import type { Rng } from '../rng';
import { NO_COUNCIL, TERRAIN, ZONE, isBrownfield, type CityMap } from '../map/types';
import { planningApproveOdds } from '../customers/adoption';

export type AppKind = 'solarFarm' | 'windOnshore' | 'battery' | 'dataCentre' | 'evHub';

/** Planning land class for a candidate site. Brownfield is waved through;
 *  everything else opens a council determination (appeal) window, with
 *  green-belt and conservation land the hardest to win. */
export type LandType = 'brownfield' | 'greenfield' | 'greenbelt' | 'conservation';

/** Classify a tile for planning. Brownfield (previously-developed) wins;
 *  the conservation quarters (the posh river/heath blobs) reject hardest;
 *  pre-designated generation sites (solar/wind/nuclear) are ordinary
 *  greenfield; plain open countryside is protected green belt. */
export function landTypeAt(map: CityMap, x: number, y: number): LandType {
  if (isBrownfield(map, x, y)) return 'brownfield';
  const i = y * map.width + x;
  const zone = map.zone[i];
  if (zone === ZONE.posh) return 'conservation';
  if (zone === ZONE.solarSite || zone === ZONE.windSite || zone === ZONE.nuclearSite)
    return 'greenfield';
  // open land / fields / glasshouse country sit in the green belt
  return 'greenbelt';
}

/** A planning appeal opened on a non-brownfield application: the relevant
 *  council determines it over a ~30 game-day window. Deterministic — the
 *  outcome (approve/reject) is rolled at OPEN time off the seeded rng and
 *  realised when the window closes, so a save/load mid-appeal can't re-roll
 *  it. The odds are read out to the inbox so the player sees the gamble. */
export interface PlanningAppeal {
  councilId: number;
  /** Council name (snapshotted so the UI/news needn't carry the map). */
  council: string;
  landType: Exclude<LandType, 'brownfield'>;
  /** Game-minute the council hands down its determination. */
  decideAtMin: number;
  /** Probability the scheme is approved, 0..1 (for the inbox read-out). */
  approveOdds: number;
  /** The pre-rolled outcome, realised when the window closes. */
  willApprove: boolean;
}

/** Days a council takes to determine a contested (non-brownfield) scheme. */
export const APPEAL_DAYS = 30;

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
  /** Planning land class of the site (additive; absent ⇒ brownfield-equiv,
   *  i.e. the old wave-it-through behaviour for pre-feature saves). */
  landType?: LandType | undefined;
  /** Non-brownfield schemes sit in 'appeal' under a council determination
   *  window (additive). On approval the appeal clears and the application
   *  drops to 'open' (ready to connect); on refusal it lapses. */
  appeal?: PlanningAppeal | undefined;
  status: 'open' | 'appeal' | 'firm' | 'flex' | 'declined' | 'connected' | 'expired' | 'refused';
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

/** Deterministic default for the per-game app-naming seed — used by unit tests
 *  and any caller that omits an `appSeed`, so the suite (and seed paths) stay
 *  reproducible. The worker passes a per-game RANDOM seed for production variety
 *  (mirrors STARTER_SEED_DEFAULT in state.ts). */
export const APP_SEED_DEFAULT = 0xa9913e1;

// Developer name pools, deliberately LARGE (≈12–16 per kind) so the same
// scheme name rarely recurs even within one long game — the owner kept seeing
// the identical "Marsh Ridge Wind" / "Peak Shift Storage" every London game,
// which was a 2-name pool drawn off a fixed seed. GB-flavoured and
// industry-plausible: PV co-ops and "Solar"/"Light" trade names; onshore-wind
// "Ridge"/"Marsh"/"Turbines" outfits; "Storage"/"BESS"/"Flex" battery firms;
// hyperscaler "Data"/"Compute"/"Cloud" campuses; "EV Hub"/"Charging" forecourts.
export const NAMES: Record<AppKind, string[]> = {
  solarFarm: [
    'Meadow Light Solar',
    'Three Fields Energy',
    'Estuary Sun Co-op',
    'Brightacre Solar',
    'Greenhill PV',
    'Lammas Field Solar',
    'Saxon Sun Power',
    'Wealden Solar Co-op',
    'Chalkdown Photovoltaics',
    'Tilbury Sun Farms',
    'Hartfield Solar',
    'Maypole Renewables',
    'Stour Valley Solar',
    'Beacon Light Energy',
    'Orchard Row Solar',
    'Fenland Sun Co-op',
  ],
  windOnshore: [
    'Marsh Ridge Wind',
    'Greenway Turbines',
    'Foulness Wind Co-op',
    'Blackwater Onshore Wind',
    'Crouch Valley Turbines',
    'Saltmarsh Wind',
    'Eastgate Wind Power',
    'Dengie Renewables',
    'Wallasea Wind Co-op',
    'Ridgeline Turbines',
    'Northbank Wind',
    'Tempest Energy',
    'Harwich Onshore Wind',
    'Galeforce Renewables',
  ],
  battery: [
    'GridStore Ltd',
    'Peak Shift Storage',
    'Voltbank Energy',
    'Flexion Storage',
    'Reserve Power Co',
    'Crossfell BESS',
    'Anchor Storage Ltd',
    'Drawdown Energy',
    'Capacitor Grid',
    'Synergy Storage',
    'Pylon Reserve',
    'Steady State Power',
    'Kestrel Storage',
    'Balancing Point Ltd',
    'Brimstone Battery',
  ],
  dataCentre: [
    'Thamesport Data Campus',
    'Eastbox Compute',
    'Meridian Cloud',
    'Docklands Data Works',
    'Hyperedge Compute',
    'Silverbyte Campus',
    'Estuary Hyperscale',
    'Northvault Data',
    'Cobalt Cloud Services',
    'Orbital Compute',
    'Greenwich Data Halls',
    'Quanta Cloud',
    'Tideway Data Centre',
    'Irongate Compute',
  ],
  evHub: [
    'ChargeYard EV Hub',
    'Orbital Charging',
    'Voltway EV Hub',
    'Junction 7 Charging',
    'Sparkpoint EV',
    'Forecourt Power',
    'Amp Stop Charging',
    'Greenmile EV Hub',
    'Ringway Charging',
    'Pitstop Power',
    'Watt Lane EV',
    'Transit Charge Co',
  ],
};

/** Pick a developer name from the kind's pool by a DETERMINISTIC hash of the
 *  per-game app-naming seed and the application id — NOT off the tick rng. So
 *  WHICH name appears varies game-to-game (different `appSeed`) while staying
 *  100% reproducible within a game (same save ⇒ same id ⇒ same name), and the
 *  tick rng stream is left byte-identical (cadence/count/site/kind unchanged).
 *  A small splitmix-style avalanche on (appSeed, id) so adjacent ids and
 *  adjacent seeds don't correlate into a visible pattern. */
export function nameFor(kind: AppKind, appSeed: number, id: number): string {
  const pool = NAMES[kind];
  let h = (appSeed ^ Math.imul(id, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return pool[h % pool.length] ?? kind;
}

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

/** Brownfield-first steer: the fraction of new applications that aim
 *  specifically for previously-developed land. The rest search any eligible
 *  site (and may still happen to land on brownfield), so over many seeds the
 *  brownfield share dominates — the GB "brownfield first" planning bias. */
export const BROWNFIELD_BIAS = 0.72;

/** Whether a candidate tile can host this kind of scheme at all (ignores
 *  brownfield preference — that's a separate weighting). A brownfield tile
 *  is buildable for generation/demand even where its zone is industrial:
 *  developers reuse the cleared works. */
function siteEligible(map: CityMap, x: number, y: number, kind: AppKind): boolean {
  const i = y * map.width + x;
  const zone = map.zone[i];
  const terrain = map.terrain[i];
  const brown = isBrownfield(map, x, y);
  switch (kind) {
    case 'solarFarm':
      return zone === ZONE.solarSite || (brown && terrain === TERRAIN.land);
    case 'windOnshore':
      // onshore wind wants open eastern country, or a cleared coastal works
      return (
        (zone === ZONE.none && terrain === TERRAIN.land && x > 110) ||
        (brown && terrain === TERRAIN.land && x > 110)
      );
    case 'battery':
      return (zone === ZONE.none || brown) && terrain === TERRAIN.land;
    case 'dataCentre':
      // hyperscalers want the dense urban grid (fibre, staff, latency) OR a
      // big cleared brownfield campus
      return (map.customers[i] ?? 0) >= DATACENTRE_MIN_CUSTOMERS || (brown && terrain === TERRAIN.land);
    case 'evHub':
      return (zone === ZONE.none || brown) && terrain === TERRAIN.land;
  }
}

/** Pick a site for a new scheme. With probability BROWNFIELD_BIAS the search
 *  insists on brownfield (previously-developed) land; otherwise it takes any
 *  eligible tile. Deterministic: exactly one preference draw, then a fixed
 *  budget of seeded tile probes. */
function findSite(
  map: CityMap,
  rng: Rng,
  kind: AppKind,
  taken: (x: number, y: number) => boolean,
): { x: number; y: number } | undefined {
  const insistBrownfield = rng.chance(BROWNFIELD_BIAS);
  let fallback: { x: number; y: number } | undefined;
  for (let tries = 0; tries < 240; tries++) {
    const x = rng.int(map.width);
    const y = rng.int(map.height);
    if (taken(x, y)) continue;
    if (!siteEligible(map, x, y, kind)) continue;
    const brown = isBrownfield(map, x, y);
    if (brown) return { x, y }; // brownfield is always the best answer
    if (insistBrownfield) {
      // remember a greenfield fallback so we never starve, but keep probing
      // for the brownfield the steer wanted
      fallback ??= { x, y };
      continue;
    }
    return { x, y };
  }
  return fallback;
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

/** Live council satisfaction reader (0..100). tick.ts supplies one backed
 *  by state.councils; tests/seed paths default everyone to 50 (neutral). */
export type SatOf = (councilId: number) => number;

/** Open a planning appeal for a non-brownfield site: resolve the council,
 *  compute its approve odds and PRE-ROLL the outcome (so a save/load can't
 *  re-roll it), determining over a ~30-day window. Returns undefined for
 *  brownfield (or council-less, e.g. coastal water-edge) land — those proceed
 *  straight to 'open'. */
function openAppealFor(
  map: CityMap,
  rng: Rng,
  x: number,
  y: number,
  landType: LandType,
  simTimeMin: number,
  satOf: SatOf,
): PlanningAppeal | undefined {
  if (landType === 'brownfield') return undefined;
  const cid = map.council[y * map.width + x] ?? NO_COUNCIL;
  if (cid === NO_COUNCIL) return undefined; // no determining authority
  const profile = map.councils.find((c) => c.id === cid);
  if (!profile) return undefined;
  const approveOdds = planningApproveOdds(profile, landType, satOf(cid));
  return {
    councilId: cid,
    council: profile.name,
    landType,
    decideAtMin: simTimeMin + APPEAL_DAYS * 1440,
    approveOdds,
    willApprove: rng.chance(approveOdds),
  };
}

function buildApplication(
  map: CityMap,
  rng: Rng,
  kind: AppKind,
  simTimeMin: number,
  nextId: number,
  taken: (x: number, y: number) => boolean,
  satOf: SatOf,
  appSeed: number,
): Application | undefined {
  const site = findSite(map, rng, kind, taken);
  if (!site) return undefined;
  const spec = SPECS[kind];
  const mw =
    kind === 'dataCentre'
      ? DATACENTRE_MW_MIN + rng.int(DATACENTRE_MW_MAX - DATACENTRE_MW_MIN + 1)
      : spec.mw;
  const landType = landTypeAt(map, site.x, site.y);
  const appeal = openAppealFor(map, rng, site.x, site.y, landType, simTimeMin, satOf);
  // Keep advancing the tick rng exactly as before (one draw per name) so the
  // cadence/count/site/kind stream stays byte-identical across this change —
  // but DERIVE the actual name from the per-game appSeed + id, so WHICH
  // developer appears varies game-to-game while staying reproducible within a
  // game. (The old code used this draw directly, which never varied because the
  // tick rng is fixed-seeded.)
  rng.int(NAMES[kind].length);
  return {
    id: nextId,
    kind,
    name: nameFor(kind, appSeed, nextId),
    x: site.x,
    y: site.y,
    mw,
    customers: spec.customers,
    decideByMin: simTimeMin + DECIDE_DAYS * 1440,
    landType,
    // a contested (non-brownfield) scheme enters determination; brownfield
    // (and council-less) sites land 'open' and ready to connect at once
    ...(appeal ? { appeal, status: 'appeal' as const } : { status: 'open' as const }),
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
  satOf: SatOf = () => 50,
  /** Per-game app-naming seed: varies WHICH developer name each application
   *  draws, game-to-game, WITHOUT touching the tick rng stream (so cadence,
   *  count, site and kind are unchanged). Defaults to APP_SEED_DEFAULT for
   *  tests/seed paths (deterministic); the worker passes a per-game random one
   *  in production. */
  appSeed: number = APP_SEED_DEFAULT,
): Application[] {
  const out: Application[] = [];
  let id = nextId;
  // generation stream
  if (rng.chance(dtMin / (genIntervalDays(servedCustomers) * 1440))) {
    const pool = genKindsFor(servedCustomers);
    const kind = pool[rng.int(pool.length)] ?? 'solarFarm';
    const app = buildApplication(map, rng, kind, simTimeMin, id, taken, satOf, appSeed);
    if (app) {
      out.push(app);
      id++;
    }
  }
  // demand stream
  if (rng.chance(dtMin / (demandIntervalDays(servedCustomers) * 1440))) {
    const pool = demandKindsFor(servedCustomers);
    const kind = pool[rng.int(pool.length)] ?? 'evHub';
    const app = buildApplication(map, rng, kind, simTimeMin, id, taken, satOf, appSeed);
    if (app) out.push(app);
  }
  return out;
}

/** Step open planning appeals: when a council's determination window closes,
 *  realise the pre-rolled outcome. APPROVED schemes clear the appeal and drop
 *  to 'open' (now connectable); REFUSED schemes lapse to 'refused'. The
 *  caller (tick.ts) pushes the news headlines from the returned outcomes so
 *  this stays free of GameState. Pure: no rng draws (the outcome was rolled
 *  at open time). */
export interface AppealOutcome {
  app: Application;
  approved: boolean;
}
export function stepAppeals(apps: Application[], simTimeMin: number): AppealOutcome[] {
  const out: AppealOutcome[] = [];
  for (const a of apps) {
    if (a.status !== 'appeal' || !a.appeal) continue;
    if (simTimeMin < a.appeal.decideAtMin) continue;
    if (a.appeal.willApprove) {
      a.status = 'open';
      // give the player the full DECIDE window from the grant to respond
      a.decideByMin = simTimeMin + DECIDE_DAYS * 1440;
      out.push({ app: a, approved: true });
    } else {
      a.status = 'refused';
      out.push({ app: a, approved: false });
    }
  }
  return out;
}
