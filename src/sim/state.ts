// Authoritative game state (lives in the worker) and its serialization.

import type { PlacedAsset } from './assets';
import { GENS, SUBS, type GenType, type SubType, type VegPolicy } from './catalog';
import { TERRAIN, ZONE, type CityMap } from './map/types';
import { buildDemandField, type DemandField } from './map/demand';
import { newWeather, type WeatherState } from './events/weather';
import { type Application, NAMES as APP_NAMES } from './events/applications';
import { newDevMood, nextRoundOpensMin, type Tender } from './events/developers';
import type { OrgState } from './events/directorates';
import type { Claim } from './events/litigation';
import type { SafetyLog } from './reliability/safety';
import { newTech, type Pitch, type TechState } from './events/innovation';
import type { CouncilState } from './customers/adoption';
import type { RepairJob, Van } from './fleet/fleet';
import type { LoadSite } from './service';
import type { ReliabilityTotals } from './regulation/kpis';
import {
  initialTargets,
  newPeriod,
  type PeriodState,
  type ReportCard,
} from './regulation/riio';
import {
  networkCapexOnRegisterK,
  newRav,
  reconcileVintages,
  type RavState,
  type RavVintage,
} from './regulation/rav';
import { NEW_ESTATES } from '../data/londonMap';
import { getScenario, profileOf } from '../data/cityRegistry';
import type { ResolvedProfile } from './powerProfile';
import { Rng } from './rng';
import type { SimSpeed } from './protocol';

export interface GameEvent {
  seq: number;
  /** Game time of the event, minutes. */
  tMin: number;
  sev: 'info' | 'warn' | 'bad';
  msg: string;
  x?: number | undefined;
  y?: number | undefined;
  /** A genuinely MAJOR incident — a severe storm, a major fault (grid
   *  transformer / storm-felled line), a flooded substation. Used to halt a
   *  +30d skip (which otherwise sails past routine `bad` noise like a single
   *  tree-contact fault) while still letting it skip that routine noise.
   *  Optional + additive: absent ⇒ not major, so old saves hydrate clean and
   *  no SAVE_VERSION bump is needed (events serialize by object spread). */
  major?: boolean | undefined;
}

export interface GameState {
  tick: number;
  simTimeMin: number;
  speed: SimSpeed;
  /** Active scenario ('london', or a tutorial-mission id). Decides which
   *  map newContext builds and which mission rules the worker runs. */
  scenarioId: string;
  /** Tutorial missions: the win predicate has fired (sticky). */
  missionComplete?: boolean | undefined;
  /** Tutorial missions: bitmask of scripted beats already fired, so
   *  storms/faults trigger exactly once across saves and skips. */
  missionBeats?: number | undefined;
  nextAssetId: number;
  assets: Map<number, PlacedAsset>;
  /** bumped on any asset change → network re-derivation. */
  assetsVersion: number;
  rngState: number;
  /** rolling annualized energy cost, £k/yr (exponentially smoothed). */
  energyCostYrK: number;
  /** rolling PPA top-ups above wholesale, £k/yr (exponentially smoothed). */
  genCostYrK: number;
  weather: WeatherState;
  /** battery asset id → state of charge, MWh. */
  soc: Map<number, number>;
  /** branch id → accumulated overload heat, loading·minutes. */
  heat: Map<number, number>;
  /** branch id → repair game-minutes remaining (tripped/out of service). */
  outages: Map<number, number>;
  /** Transient (not saved): last tick's energization per service sub,
   *  for "why did my site go dark" transition events. */
  subLive: Map<number, boolean>;
  /** branch id -> why it's out (storm/tree/overload), for the inspector. */
  outageCause: Map<number, string>;
  /** rolling carbon intensity, g/kWh (exponentially smoothed). */
  carbonEMA: number;
  /** Paid-for crewed vans. */
  fleetSize: number;
  /** Vegetation management programme (index into VEG_POLICY). */
  vegPolicy: VegPolicy;
  /** line asset id → overgrowth 0..1. */
  lineVeg: Map<number, number>;
  vans: Van[];
  /** branch id → open repair job. */
  jobs: Map<number, RepairJob>;
  reliability: ReliabilityTotals;
  /** Tiles currently dark (for CI transition detection). */
  offTiles: Set<number>;
  events: GameEvent[];
  eventSeq: number;
  /** True while the current storm has already been announced. */
  stormAnnounced: boolean;
  /** council id → adoption + satisfaction. */
  councils: Map<number, CouncilState>;
  applications: Application[];
  loadSites: LoadSite[];
  /** bumped when loadSites change → service re-assignment. */
  sitesVersion: number;
  pitches: Pitch[];
  tech: TechState;
  innovationFundK: number;
  /** Innovation levy, % of the bill (0–3 in 0.5 steps). */
  levyPct: number;
  /** rolling flexibility-market spend, £k/yr. */
  flexYrK: number;
  /** rolling constraint compensation, £k/yr. */
  constraintYrK: number;
  /** rolling network I²R losses priced at the running marginal price,
   *  £k/yr — a DNO cost, recovered through the bill's losses line. */
  lossYrK: number;
  /** Bill drill-down (#52): per-asset itemised accumulators, EMA-decayed
   *  with the SAME tau as their headline lines so each list reconciles
   *  to its bill line. capex/opex detail is never stored — it's derived
   *  on demand from the asset register (tick.billDetailRows). */
  billDetail: BillDetailState;
  /** lifetime curtailed energy by connection type, MWh. */
  curtailedFirmMWh: number;
  curtailedFlexMWh: number;
  nextAppId: number;
  /** Generation tenders (planning signals) and their developer bids. */
  tenders: Tender[];
  /** CfD allocation rounds (#14): game-minute the next quarterly round
   *  opens… */
  roundOpensMin: number;
  /** …the latest round number (0 = none yet)… */
  roundId: number;
  /** …and the last round whose clearance (loser souring) has settled —
   *  persisted so a save/load mid-round can't sour the losers twice. */
  roundClearedId: number;
  /** developer id → mood 0..100 (starts at 70). */
  devMood: Map<number, number>;
  /** Town growth/infill mutations applied to the map (append-only;
   *  replayed onto a fresh map on load). */
  growth: GrowthRecord[];
  period: PeriodState;
  lastReport?: ReportCard | undefined;
  /** Regulatory Asset Value + allowed-revenue stock (regulation/rav.ts).
   *  Starts at zero and builds up as NETWORK capex is committed, then
   *  depreciates straight-line. Additive optional: a pre-feature save has
   *  no `rav`, and deserialize self-heals it from the asset register's
   *  committed network capex (so the RAV gross pool is never lost — only
   *  the accumulated depreciation history, which re-accrues). The whole
   *  revenue/incentive layer only ENGAGES once the network is up and
   *  running (rav.engaged), so day-0 stays uncluttered. */
  rav: RavState;
  /** Early-game goal ladder progress: index into scenario/goals GOALS
   *  (undefined = start of the ladder; past the end = done/dismissed). */
  goalIndex?: number | undefined;
  /** Storm prep (reliability/stormprep.ts): surge contractor crews ride
   *  the van roster until this game-minute… */
  surgeUntilMin?: number | undefined;
  /** …and this many of them (tick.ts adds them at the syncVans site). */
  surgeVans?: number | undefined;
  /** Rolling annualized storm-prep spend, £k/yr (one-off prep costs land
   *  here and decay with a 1-game-year tau; rides the bill's
   *  constraint/damages line via computeBill's penaltyYrK input). */
  stormPrepYrK?: number | undefined;
  /** Storm-prep SCOUTS (reliability/stormprep.ts): office staff drive the
   *  lines to find faults faster — restoration runs quicker until this
   *  game-minute (tick.ts scales the fleet step). Additive optional. */
  scoutsUntilMin?: number | undefined;
  /** Storm-prep WIDER CALL HANDLING: office staff drafted onto the phones
   *  until this game-minute… */
  callHandlersUntilMin?: number | undefined;
  /** …and this many of them (lifts the call-handling capacity so storm
   *  call answer time stays inside target → CSAT protected). Additive
   *  optional, both hydrate to undefined on pre-feature saves. */
  callHandlersExtra?: number | undefined;
  /** Planned maintenance windows (#16): queued/open outages applied by
   *  tick.ts at their 01:00–05:00 window (reliability/ageing.ts). */
  maintenance?: MaintenanceWindow[] | undefined;
  /** Rolling annualized maintenance/replacement spend, £k/yr —
   *  stormPrepYrK's exact sibling (decays in reliability/ageing.ts and
   *  rides the same penaltyYrK bill input). */
  maintYrK?: number | undefined;
  /** The network business (#53): directorate staffing + pay/benefits +
   *  safety-programme dials (events/directorates.ts). Lazily created on
   *  first dial touch — absent leaves every mechanic neutral. */
  org?: OrgState | undefined;
  /** H&S incident log (#55): RIDDOR-grounded LTI/VSI counters, the HSE
   *  improvement notice + fine rate (reliability/safety.ts). */
  safety?: SafetyLog | undefined;
  /** Litigation (#54): open + resolved claims (events/litigation.ts). */
  claims?: Claim[] | undefined;
  /** Rolling annualized claims/settlements spend, £k/yr — stormPrepYrK's
   *  sibling, rides the same penaltyYrK bill input. */
  claimsYrK?: number | undefined;
  /** Litigation (#54): customer-minutes lost in the CURRENT continuous
   *  mass-outage episode (resets when supply largely restores) — crosses
   *  a threshold to seed a group claim. Additive optional. */
  groupOutageCustMin?: number | undefined;
  /** High-water mark of customers ever simultaneously served (transient,
   *  not serialized — self-heals in one tick on load). A group action is
   *  a LOSS from a served grid, so this gates out the day-0 blank-grid
   *  rebuild and the seeded-but-unconnected iDNO estates: you aren't sued
   *  for the network that vanished, only for supply you actually lost. */
  everServedCustomers?: number | undefined;
  /** The bespoke Heathrow PV+BESS scheme (owner): the deterministic
   *  game-minute it raises its big combined solar + battery application,
   *  set once at seedScenario off a dedicated seed (so it never perturbs
   *  the main rng stream). `heathrowSchemeFired` flips when it spawns, so
   *  it fires exactly once per game. Additive optional. */
  heathrowSchemeMin?: number | undefined;
  heathrowSchemeFired?: boolean | undefined;
  /** DEV/TEST ONLY (the night-electrification design-gate): force tiles to read
   *  as POWERED in the coverage array, so a screenshot helper can show an
   *  ENERGISED city at night without wiring up its whole grid by hand.
   *    'all'  → every demand tile + every hero footprint (a fully-lit metropolis)
   *    number → only the powered HERO DISTRICTS: hero tiles + demand within that
   *      radius of one (lit pockets against a cosy dark countryside)
   *    false/undefined → off (normal coverage)
   *  Transient (NEVER serialized — like everServedCustomers), so it self-clears
   *  on load and has no SAVE_VERSION implication. Set via `__testServeAll`; only
   *  the dev test hook ever sends it (the UI cannot). */
  forceServeAll?: 'all' | number | boolean | undefined;
}

/** One scheduled maintenance night (#16): `branchId` goes out as a
 *  planned outage from startMin for durMin, then health is restored. */
export interface MaintenanceWindow {
  branchId: number;
  startMin: number;
  durMin: number;
}

/** Itemised bill accumulators (compact: pruned EMAs, not ledgers). */
export interface BillDetailState {
  /** gen asset id → constraint compensation {MWh/yr curtailed, £k/yr}. */
  constraints: Map<number, { mwhYr: number; kYr: number }>;
  /** gen asset id → PPA delivery {MWh/yr delivered, top-up £k/yr}. */
  ppa: Map<number, { mwhYr: number; topupKYr: number }>;
  /** owning asset id (line, or sub for its transformers) → I²R loss
   *  cost at the running marginal price, £k/yr. */
  losses: Map<number, number>;
}

export function newBillDetail(): BillDetailState {
  return { constraints: new Map(), ppa: new Map(), losses: new Map() };
}

/** One infill mutation: tile `i` became `zone` with `customers`. */
export interface GrowthRecord {
  i: number;
  zone: number;
  customers: number;
}

/** Replay recorded growth onto a (fresh) map copy. */
export function applyGrowth(map: CityMap, growth: GrowthRecord[]): void {
  for (const g of growth) {
    map.zone[g.i] = g.zone;
    map.customers[g.i] = g.customers;
  }
}

export interface SimContext {
  map: CityMap;
  demand: DemandField;
  /** The active scenario's resolved power-system / weather / economy /
   *  generation / regulator profile. Defaults to LONDON_PROFILE for the
   *  london scenario (and every mission), so the sim's behaviour is
   *  unchanged. Lives on the context (not GameState) because it is pure
   *  scenario DATA, derived from scenarioId — never serialized, so no
   *  SAVE_VERSION bump: a load rebuilds it from the save's scenarioId via
   *  newContext, exactly like the map. */
  profile: ResolvedProfile;
}

export function newGame(scenarioId = 'london'): GameState {
  return {
    tick: 0,
    simTimeMin: 0,
    speed: 1,
    scenarioId,
    nextAssetId: 1,
    assets: new Map(),
    assetsVersion: 0,
    rngState: 0xc0ffee,
    energyCostYrK: 0,
    genCostYrK: 0,
    weather: newWeather(),
    soc: new Map(),
    heat: new Map(),
    outages: new Map(),
    subLive: new Map(),
    outageCause: new Map(),
    carbonEMA: 0,
    fleetSize: 2,
    vegPolicy: 0,
    lineVeg: new Map(),
    vans: [],
    jobs: new Map(),
    reliability: { ciCustomers: 0, cmlCustomerMin: 0 },
    offTiles: new Set(),
    events: [],
    eventSeq: 0,
    stormAnnounced: false,
    councils: new Map(),
    applications: [],
    loadSites: [],
    sitesVersion: 0,
    pitches: [],
    tech: newTech(),
    innovationFundK: 0,
    levyPct: 0.5,
    flexYrK: 0,
    constraintYrK: 0,
    lossYrK: 0,
    billDetail: newBillDetail(),
    curtailedFirmMWh: 0,
    curtailedFlexMWh: 0,
    nextAppId: 1,
    tenders: [],
    roundOpensMin: nextRoundOpensMin(0),
    roundId: 0,
    roundClearedId: 0,
    devMood: newDevMood(),
    growth: [],
    period: newPeriod(1, 0, initialTargets()),
    lastReport: undefined,
    rav: newRav(),
  };
}

export function pushEvent(
  s: GameState,
  sev: GameEvent['sev'],
  msg: string,
  x?: number,
  y?: number,
  /** Mark a genuinely MAJOR incident (severe storm / major fault / flooded
   *  substation) so a +30d skip halts on it; routine `bad` events leave this
   *  unset and +30d skips past them. Only meaningful on `bad` events. */
  major?: boolean,
): void {
  s.events.push({ seq: ++s.eventSeq, tMin: s.simTimeMin, sev, msg, x, y, major });
  if (s.events.length > 40) s.events.splice(0, s.events.length - 40);
}

export function newContext(scenarioId = 'london'): SimContext {
  // a fresh map every time: town growth mutates the context's copy, so
  // a new game (or a load) must never inherit a previous run's infill
  const map = getScenario(scenarioId).build();
  return { map, demand: buildDemandField(map), profile: profileOf(scenarioId) };
}

// --- scenario seeding --------------------------------------------------------

/** Set up the opening scenario on a fresh game: the iDNO's estate
 *  substations and a few starter connection applications so the inbox
 *  has decisions from minute one. Called by the worker on 'newGame'
 *  only — unit fixtures stay clean.
 *
 *  This seeding is LONDON-SPECIFIC: NEW_ESTATES sit at London tile coords, the
 *  starter applications look for London's solar/wind site zones, and the
 *  bespoke Heathrow scheme is a London landmark. A non-London data city (Paris…)
 *  therefore opens on a TRULY BLANK grid — the player builds everything from
 *  scratch, which is fully playable and matches the blank-grid doctrine; its
 *  own bespoke seeding lands with its FR/etc mechanics in a later wave. */
/** Deterministic default seed for the starter-application draw — used by unit
 *  tests and any caller that omits a seed, so the suite stays reproducible. The
 *  worker passes a per-game RANDOM seed for production variety. */
const STARTER_SEED_DEFAULT = 0x57a27e7;

export function seedScenario(
  state: GameState,
  ctx: SimContext,
  opts?: { starterSeed?: number },
): void {
  if (state.scenarioId !== 'london') return;
  const { map } = ctx;

  // (a) new-build estates arrive with the iDNO's transformer already in.
  // These are CUSTOMER DEMAND sites awaiting connection (load, not
  // generation) — they stay (owner: keep the iDNO estates as demand).
  for (const e of NEW_ESTATES) {
    const id = state.nextAssetId++;
    state.assets.set(id, {
      id,
      kind: 'sub',
      sub: 'dist',
      x: e.x,
      y: e.y,
      mva: 10,
      mvaAuto: false,
      idno: true,
    });
  }
  // NOTHING PRE-EXISTING ON THE MAP (owner playtest, 2026-06-13: "forget all
  // about actual generation and the ECR. All of it vanished in the
  // vanishing."). The player starts with a TRULY BLANK grid — no seeded
  // estuary CCGTs / Lea peaker / Essex solar/wind. (Missions keep their own
  // scripted seeding in scenario/missions.ts — untouched.)
  state.assetsVersion++;

  // (b) starter generation applications through the normal machinery
  const used = new Set<number>();
  const findTile = (ok: (i: number, x: number, y: number) => boolean) => {
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const i = y * map.width + x;
        if (used.has(i)) continue;
        if (ok(i, x, y)) {
          used.add(i);
          return { x, y };
        }
      }
    }
    return undefined;
  };
  // Randomly SEEDED so each new game opens with a different mix (owner,
  // 2026-06-20: the same three every game — Estuary Sun / Marsh Ridge /
  // GridStore — because the whole game ran off a fixed seed). A DEDICATED rng
  // keeps it OFF the tick stream: the worker passes a per-game random starterSeed
  // for variety, while tests omit it and get the deterministic default. We
  // shuffle a flat (kind, name) pool and take 2–3 — so WHICH developers turn up,
  // how MANY, and how BIG all vary game to game.
  const sRng = new Rng(opts?.starterSeed ?? STARTER_SEED_DEFAULT);
  const STARTER_KINDS = ['solarFarm', 'windOnshore', 'battery'] as const;
  type StarterKind = (typeof STARTER_KINDS)[number];
  const placer: Record<
    StarterKind,
    { mwMin: number; mwMax: number; ok: (i: number, x: number, y: number) => boolean }
  > = {
    solarFarm: { mwMin: 30, mwMax: 80, ok: (i) => map.zone[i] === ZONE.solarSite },
    windOnshore: {
      mwMin: 60,
      mwMax: 150,
      ok: (i, x) => map.zone[i] === ZONE.none && map.terrain[i] === TERRAIN.land && x > 110,
    },
    battery: {
      mwMin: 50,
      mwMax: 150,
      ok: (i, x) => map.zone[i] === ZONE.none && map.terrain[i] === TERRAIN.land && x > 120,
    },
  };
  const pool: Array<{ kind: StarterKind; name: string }> = [];
  for (const kind of STARTER_KINDS) for (const name of APP_NAMES[kind]) pool.push({ kind, name });
  // Fisher–Yates on the seeded rng so both the picks AND their order vary
  for (let i = pool.length - 1; i > 0; i--) {
    const j = sRng.int(i + 1);
    const tmp = pool[i]!;
    pool[i] = pool[j]!;
    pool[j] = tmp;
  }
  const starterCount = 2 + sRng.int(2); // 2 or 3 developers at kickoff
  for (const cand of pool.slice(0, starterCount)) {
    const p = placer[cand.kind];
    const site = findTile((i, x, y) => p.ok(i, x, y));
    if (!site) continue;
    const mw = p.mwMin + sRng.int((p.mwMax - p.mwMin) / 10 + 1) * 10; // tidy 10 MW step
    state.applications.push({
      id: state.nextAppId++,
      kind: cand.kind,
      name: cand.name,
      x: site.x,
      y: site.y,
      mw,
      customers: 0,
      decideByMin: state.simTimeMin + 30 * 1440,
      status: 'open',
    });
    pushEvent(
      state,
      'warn',
      `connection application: ${cand.name} (${mw} MW generation)`,
      site.x,
      site.y,
    );
  }

  // (c) schedule the bespoke once-per-game Heathrow PV+BESS scheme at a
  // deterministic random point a few months to ~2 years in. A DEDICATED
  // seed keeps this off the main tick rng stream, so it never shifts the
  // weather/application cadence; the same game always raises it on the
  // same day.
  const hRng = new Rng(0x4ea7);
  state.heathrowSchemeMin = state.simTimeMin + (120 + hRng.int(620)) * 1440;
  state.heathrowSchemeFired = false;
}

// --- save / load -----------------------------------------------------------

// v15 (W3 round 2): 41 more bespoke London heroes were placed in NAMED_PLACES
// (City office towers, West-End hotels, colleges/libraries, the South-Bank /
// Bankside set, the Regent's-Park terraces, the palaces and department stores).
// Their hero footprints now stamp protected London tiles, so map geometry —
// and thus the heroTable baked into saves — changed; bump so old saves rebuild.
// v16 (W3 round 3): 18 MORE bespoke London heroes placed (82 → 100, the
// doctrine target) — the listed City/West-End blocks, the council estates +
// stucco terraces, a college, a Crown Court, the Chelsea Flower Show marquees
// and the King's Cross Coal Drops. New hero footprints stamp more London
// tiles ⇒ map geometry + the baked heroTable changed again; bump so old saves
// rebuild their hero placement from the committed names.
// v17 (generation-palette overhaul, owner 2026-06-26): GenAsset gains three
// ADDITIVE optional fields — `level`/`tierKv` (a generator's chosen
// connection-voltage tier; absent ⇒ the catalog default level, byte-identical)
// and `damAxis` (a hydro dam's bank-to-bank orientation; absent ⇒ 'ew'). The
// dam also now spans an oriented 3×2/2×3 footprint instead of the old 2×2, so
// a pre-existing dam in an old save reads a touch wider — harmless (it only
// claims one more tile of its own riverbank). All fields hydrate to the prior
// behaviour, so v14–v16 saves still load; the bump records the new shape.
export const SAVE_VERSION = 17;

/** Guard for untrusted save payloads; lives beside SAVE_VERSION so the two
 *  can never drift apart again (a stale guard silently discarded saves). */
export function isSaveData(d: unknown): d is SaveData {
  if (typeof d !== 'object' || d === null) return false;
  const v = (d as { v?: unknown }).v;
  // v14: London PLACEMENT wiring — buildLondonMap now calls buildHeroTable, and
  // ~30 new NAMED_PLACES place London's 41 bespoke registry heroes (the rail
  // termini, the great museums, the palaces, the South-Bank set, the City
  // civics) into the `landmark` raster as multi-tile HERO_BASE footprints
  // (protected building-exclusion fabric). A v13 asset could sit on what is now
  // a protected hero precinct, so v13 saves are retired here.
  // v13: landmark RESIZE pass (owner playtest, 2026-06-13) — the hero venues
  // grew from 1×1 dots to dominant multi-tile footprints: the Olympic Stadium
  // (3×3) and Wembley (2×2) in/near Stratford, the O2/Millennium Dome (3×3) on
  // the Greenwich peninsula, and ExCeL stretched to a 3×1. Their reservations
  // now claim extra `landmark` tiles (protected building-exclusion fabric), so
  // a v12 asset could sit on what is now a protected venue precinct — v12
  // saves are retired here. (The Orbit/Westfield/VeloPark shifted a tile to
  // clear the bigger stadium, too.)
  // v12: Queen Elizabeth Olympic Park, Stratford — the four 2012 heroes
  // (VeloPark, Olympic Stadium, ArcelorMittal Orbit, Westfield Stratford
  // City) are stamped into the `landmark` raster on the east Lea bank and the
  // precinct is re-zoned to Olympic parkland (urbanCore tiles become ZONE.park
  // around the cluster). A v11 asset could sit on what is now protected
  // Olympic fabric / parkland, so v11 saves are retired here.
  // v11: Wave-9 landmark/Heathrow pass — the bespoke Heathrow terminal
  // island re-zones its tiles to open tarmac and clears their streets
  // (gameplay tile raster moves), and new append-only LANDMARK ids
  // (heroes + the bespoke Heathrow) are stamped into the `landmark`
  // raster. A v10 asset could sit on what is now protected Heathrow
  // fabric, so v10 saves are retired here.
  // v10: Wave-8 map-geometry overhaul — the Thames re-cut (deeper Isle of
  // Dogs loop, smoother Woolwich reach, wider estuary fan), the major-road
  // skeleton re-laid on a real-London spider's web, the local streets
  // narrowed onto a denser frontage lattice, and the urban density field
  // widened. Tile land/water/road/zone indices all move, so a v9 save's
  // network assets can sit on what is now water, carriageway or protected
  // fabric. (v9 re-laid streets on the tile-edge lattice; v8 moved the
  // whole geography; v7 the id scheme.)
  return typeof v === 'number' && v >= 14 && v <= SAVE_VERSION;
}

export interface SaveData {
  v: 17;
  tick: number;
  simTimeMin: number;
  speed: SimSpeed;
  /** Scenario the save belongs to (additive; absent hydrates to
   *  'london', so every pre-campaign save keeps its map). */
  scenarioId?: string;
  /** Wall-clock ms when this save was WRITTEN (additive; stamped by the
   *  persistence layer, never the sim — determinism stays intact). Boot
   *  arbitration prefers the most recently saved copy, so a fresh new
   *  game beats an old long-played cloud save. */
  savedAt?: number;
  /** Tutorial-mission progress (additive). */
  missionComplete?: boolean;
  missionBeats?: number;
  nextAssetId: number;
  assets: PlacedAsset[];
  rngState: number;
  energyCostYrK: number;
  genCostYrK?: number;
  weather?: WeatherState;
  soc?: Array<[number, number]>;
  heat?: Array<[number, number]>;
  outages?: Array<[number, number]>;
  outageCause?: Array<[number, string]>;
  carbonEMA?: number;
  fleetSize?: number;
  vegPolicy?: VegPolicy;
  lineVeg?: Array<[number, number]>;
  vans?: Van[];
  jobs?: Array<[number, RepairJob]>;
  reliability?: ReliabilityTotals;
  offTiles?: number[];
  events?: GameEvent[];
  eventSeq?: number;
  councils?: Array<[number, CouncilState]>;
  applications?: Application[];
  loadSites?: LoadSite[];
  pitches?: Pitch[];
  tech?: TechState;
  innovationFundK?: number;
  levyPct?: number;
  flexYrK?: number;
  constraintYrK?: number;
  lossYrK?: number;
  /** Bill drill-down maps, flattened: [assetId, mwhYr, kYr]. */
  billConstraints?: Array<[number, number, number]>;
  /** [assetId, mwhYr, topupKYr]. */
  billPpa?: Array<[number, number, number]>;
  /** [assetId, kYr]. */
  billLosses?: Array<[number, number]>;
  curtailedFirmMWh?: number;
  curtailedFlexMWh?: number;
  nextAppId?: number;
  tenders?: Tender[];
  /** CfD allocation round state (#14, additive). */
  roundOpensMin?: number;
  roundId?: number;
  roundClearedId?: number;
  devMood?: Array<[number, number]>;
  growth?: GrowthRecord[];
  period?: PeriodState;
  lastReport?: ReportCard;
  /** RAV stock (regulation/rav.ts, additive). Absent on a pre-feature save
   *  → deserialize self-heals it from the asset register. `vintages` is
   *  likewise absent on a pre-sum-of-digits save → reconcileVintages
   *  synthesizes one (no SAVE_VERSION bump: self-healing, non-geometry). */
  rav?: Omit<RavState, 'vintages'> & { vintages?: RavVintage[] };
  goalIndex?: number | undefined;
  surgeUntilMin?: number;
  surgeVans?: number;
  stormPrepYrK?: number;
  /** Storm-prep scouts + wider-call-handling windows (additive). */
  scoutsUntilMin?: number;
  callHandlersUntilMin?: number;
  callHandlersExtra?: number;
  /** Planned maintenance windows (#16, additive). */
  maintenance?: MaintenanceWindow[];
  /** Rolling maintenance/replacement spend, £k/yr (#15/#16, additive). */
  maintYrK?: number;
  /** The network business dials (#53, additive). */
  org?: OrgState;
  /** H&S incident log (#55, additive). */
  safety?: SafetyLog;
  /** Litigation claims (#54, additive). */
  claims?: Claim[];
  /** Rolling claims/settlements spend, £k/yr (#54, additive). */
  claimsYrK?: number;
  /** Current mass-outage episode customer-minutes (#54, additive). */
  groupOutageCustMin?: number;
  /** Heathrow PV+BESS scheme schedule (Wave 9, additive). */
  heathrowSchemeMin?: number;
  heathrowSchemeFired?: boolean;
}

export function serialize(s: GameState): SaveData {
  // structuredClone at the end makes this a true snapshot: the worker's
  // undo/redo stacks hold these, and shallow copies once let in-place
  // mutations (GIS converts, uprates, MVA resizes, tick updates) leak
  // backwards into the stack — undo "restored" an already-mutated state.
  const data: SaveData = {
    v: SAVE_VERSION,
    tick: s.tick,
    simTimeMin: s.simTimeMin,
    speed: s.speed,
    nextAssetId: s.nextAssetId,
    assets: [...s.assets.values()],
    rngState: s.rngState,
    energyCostYrK: s.energyCostYrK,
    genCostYrK: s.genCostYrK,
    weather: { ...s.weather },
    soc: [...s.soc.entries()],
    heat: [...s.heat.entries()],
    outages: [...s.outages.entries()],
    outageCause: [...s.outageCause.entries()],
    carbonEMA: s.carbonEMA,
    fleetSize: s.fleetSize,
    vegPolicy: s.vegPolicy,
    lineVeg: [...s.lineVeg.entries()],
    vans: s.vans.map((v) => ({ ...v })),
    jobs: [...s.jobs.entries()].map(([k, j]) => [k, { ...j }]),
    reliability: { ...s.reliability },
    offTiles: [...s.offTiles],
    events: s.events.map((e) => ({ ...e })),
    eventSeq: s.eventSeq,
    councils: [...s.councils.entries()].map(([k, c]) => [k, { ...c }]),
    applications: s.applications.map((a) => ({ ...a })),
    loadSites: s.loadSites.map((l) => ({ ...l })),
    pitches: s.pitches.map((p) => ({ ...p })),
    tech: { ...s.tech },
    innovationFundK: s.innovationFundK,
    levyPct: s.levyPct,
    flexYrK: s.flexYrK,
    constraintYrK: s.constraintYrK,
    lossYrK: s.lossYrK,
    billConstraints: [...s.billDetail.constraints.entries()].map(
      ([id, v]): [number, number, number] => [id, v.mwhYr, v.kYr],
    ),
    billPpa: [...s.billDetail.ppa.entries()].map(
      ([id, v]): [number, number, number] => [id, v.mwhYr, v.topupKYr],
    ),
    billLosses: [...s.billDetail.losses.entries()],
    curtailedFirmMWh: s.curtailedFirmMWh,
    curtailedFlexMWh: s.curtailedFlexMWh,
    nextAppId: s.nextAppId,
    tenders: s.tenders.map((t) => ({ ...t, bids: t.bids.map((b) => ({ ...b })) })),
    roundOpensMin: s.roundOpensMin,
    roundId: s.roundId,
    roundClearedId: s.roundClearedId,
    devMood: [...s.devMood.entries()],
    growth: s.growth.map((g) => ({ ...g })),
    period: { ...s.period, targets: { ...s.period.targets } },
    // deep-copy the per-vintage pool so the save can't alias the live array
    rav: { ...s.rav, vintages: s.rav.vintages.map((v) => ({ ...v })) },
    ...(s.lastReport ? { lastReport: { ...s.lastReport, scores: { ...s.lastReport.scores } } } : {}),
    ...(s.goalIndex !== undefined ? { goalIndex: s.goalIndex } : {}),
    ...(s.surgeUntilMin !== undefined ? { surgeUntilMin: s.surgeUntilMin } : {}),
    ...(s.surgeVans !== undefined ? { surgeVans: s.surgeVans } : {}),
    ...(s.stormPrepYrK !== undefined ? { stormPrepYrK: s.stormPrepYrK } : {}),
    ...(s.scoutsUntilMin !== undefined ? { scoutsUntilMin: s.scoutsUntilMin } : {}),
    ...(s.callHandlersUntilMin !== undefined
      ? { callHandlersUntilMin: s.callHandlersUntilMin }
      : {}),
    ...(s.callHandlersExtra !== undefined ? { callHandlersExtra: s.callHandlersExtra } : {}),
    ...(s.maintenance && s.maintenance.length > 0
      ? { maintenance: s.maintenance.map((m) => ({ ...m })) }
      : {}),
    ...(s.maintYrK !== undefined ? { maintYrK: s.maintYrK } : {}),
    // the network business / H&S / litigation (#53/#54/#55): serialized
    // only once the player engages them, so untouched saves stay
    // byte-identical to pre-feature ones
    ...(s.org ? { org: { dirs: { ...s.org.dirs }, pay: s.org.pay, safety: s.org.safety } } : {}),
    ...(s.safety
      ? {
          safety: {
            ...s.safety,
            entries: s.safety.entries.map((e) => ({ ...e })),
            ...(s.safety.notice ? { notice: { ...s.safety.notice } } : {}),
          },
        }
      : {}),
    ...(s.claims && s.claims.length > 0 ? { claims: s.claims.map((c) => ({ ...c })) } : {}),
    ...(s.claimsYrK !== undefined ? { claimsYrK: s.claimsYrK } : {}),
    ...(s.groupOutageCustMin !== undefined ? { groupOutageCustMin: s.groupOutageCustMin } : {}),
    ...(s.heathrowSchemeMin !== undefined ? { heathrowSchemeMin: s.heathrowSchemeMin } : {}),
    ...(s.heathrowSchemeFired !== undefined ? { heathrowSchemeFired: s.heathrowSchemeFired } : {}),
    // scenario tag only when off the default: london saves stay
    // byte-identical to pre-campaign ones
    ...(s.scenarioId !== 'london' ? { scenarioId: s.scenarioId } : {}),
    ...(s.missionComplete !== undefined ? { missionComplete: s.missionComplete } : {}),
    ...(s.missionBeats !== undefined ? { missionBeats: s.missionBeats } : {}),
  };
  return structuredClone(data);
}

export function deserialize(d: SaveData): GameState {
  const assets = new Map<number, PlacedAsset>();
  for (const a of d.assets) assets.set(a.id, a);
  return {
    tick: d.tick,
    simTimeMin: d.simTimeMin,
    speed: d.speed,
    scenarioId: d.scenarioId ?? 'london',
    missionComplete: d.missionComplete,
    missionBeats: d.missionBeats,
    nextAssetId: d.nextAssetId,
    assets,
    assetsVersion: 1,
    rngState: d.rngState,
    energyCostYrK: d.energyCostYrK,
    genCostYrK: d.genCostYrK ?? 0,
    weather: d.weather ? { ...d.weather } : newWeather(),
    soc: new Map(d.soc ?? []),
    heat: new Map(d.heat ?? []),
    outages: new Map(d.outages ?? []),
    subLive: new Map(),
    outageCause: new Map(d.outageCause ?? []),
    carbonEMA: d.carbonEMA ?? 0,
    fleetSize: d.fleetSize ?? 2,
    vegPolicy: d.vegPolicy ?? 0,
    lineVeg: new Map(d.lineVeg ?? []),
    vans: (d.vans ?? []).map((v) => ({ ...v })),
    jobs: new Map((d.jobs ?? []).map(([k, j]) => [k, { ...j }])),
    reliability: d.reliability ? { ...d.reliability } : { ciCustomers: 0, cmlCustomerMin: 0 },
    offTiles: new Set(d.offTiles ?? []),
    events: (d.events ?? []).map((e) => ({ ...e })),
    eventSeq: d.eventSeq ?? 0,
    stormAnnounced: false,
    councils: new Map((d.councils ?? []).map(([k, c]) => [k, { ...c }])),
    applications: (d.applications ?? []).map((a) => ({ ...a })),
    loadSites: (d.loadSites ?? []).map((l) => ({ ...l })),
    sitesVersion: 1,
    pitches: (d.pitches ?? []).map((p) => ({ ...p })),
    tech: d.tech ? { ...d.tech } : newTech(),
    innovationFundK: d.innovationFundK ?? 0,
    levyPct: d.levyPct ?? 0.5,
    flexYrK: d.flexYrK ?? 0,
    constraintYrK: d.constraintYrK ?? 0,
    lossYrK: d.lossYrK ?? 0,
    billDetail: {
      constraints: new Map(
        (d.billConstraints ?? []).map(([id, mwhYr, kYr]) => [id, { mwhYr, kYr }]),
      ),
      ppa: new Map((d.billPpa ?? []).map(([id, mwhYr, topupKYr]) => [id, { mwhYr, topupKYr }])),
      losses: new Map(d.billLosses ?? []),
    },
    curtailedFirmMWh: d.curtailedFirmMWh ?? 0,
    curtailedFlexMWh: d.curtailedFlexMWh ?? 0,
    nextAppId: d.nextAppId ?? 1,
    tenders: (d.tenders ?? []).map((t) => ({ ...t, bids: t.bids.map((b) => ({ ...b })) })),
    // pre-round saves join the quarterly schedule at the next boundary
    roundOpensMin: d.roundOpensMin ?? nextRoundOpensMin(d.simTimeMin),
    roundId: d.roundId ?? 0,
    roundClearedId: d.roundClearedId ?? d.roundId ?? 0,
    devMood: d.devMood ? new Map(d.devMood) : newDevMood(),
    growth: (d.growth ?? []).map((g) => ({ ...g })),
    period: d.period
      ? { ...d.period, complaints: d.period.complaints ?? 0, targets: { ...d.period.targets } }
      : newPeriod(1, d.simTimeMin, initialTargets()),
    lastReport: d.lastReport ? { ...d.lastReport, scores: { ...d.lastReport.scores } } : undefined,
    // RAV (additive): restore the saved stock, or self-heal a pre-feature
    // save by rebuilding the gross+net pool from the committed network
    // capex on the register (the depreciation history is lost, so net
    // resets to gross and re-accrues — the RAV is never lost, only its
    // wear). A save from BEFORE the sum-of-digits vintage pool carries only
    // grossK/netK; reconcileVintages synthesizes a single vintage at the age
    // its remaining fraction implies, so it keeps depreciating on the curve
    // rather than restarting its holiday. engaged stays false until the live
    // gate fires again.
    rav: (() => {
      const rav: RavState = d.rav
        ? { ...d.rav, vintages: (d.rav.vintages ?? []).map((v) => ({ ...v })) }
        : {
            ...newRav(),
            grossK: networkCapexOnRegisterK(assets.values()),
            netK: networkCapexOnRegisterK(assets.values()),
          };
      reconcileVintages(rav);
      return rav;
    })(),
    goalIndex: d.goalIndex,
    surgeUntilMin: d.surgeUntilMin,
    surgeVans: d.surgeVans,
    stormPrepYrK: d.stormPrepYrK,
    scoutsUntilMin: d.scoutsUntilMin,
    callHandlersUntilMin: d.callHandlersUntilMin,
    callHandlersExtra: d.callHandlersExtra,
    maintenance: d.maintenance?.map((m) => ({ ...m })),
    maintYrK: d.maintYrK,
    // #53/#54/#55 — additive: absent fields hydrate to neutral (no org,
    // no incidents, no claims), so pre-feature saves load unchanged
    org: d.org
      ? { dirs: { ...d.org.dirs }, pay: d.org.pay, safety: d.org.safety }
      : undefined,
    safety: d.safety
      ? {
          ...d.safety,
          entries: (d.safety.entries ?? []).map((e) => ({ ...e })),
          notice: d.safety.notice ? { ...d.safety.notice } : undefined,
        }
      : undefined,
    claims: d.claims?.map((c) => ({ ...c })),
    claimsYrK: d.claimsYrK,
    groupOutageCustMin: d.groupOutageCustMin,
    heathrowSchemeMin: d.heathrowSchemeMin,
    heathrowSchemeFired: d.heathrowSchemeFired,
  };
}

export function isGenType(s: string): s is GenType {
  return s in GENS;
}
export function isSubType(s: string): s is SubType {
  return s in SUBS;
}
