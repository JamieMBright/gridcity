// Player commands: validation + application. checkBuild is pure and shared
// by the worker (authoritative) and the UI (ghost previews), so the cost a
// player is quoted is exactly the cost that lands on the bill.

import { assetLevels, type BatteryPolicy, type PlacedAsset } from './assets';
import {
  DEPOT,
  GENS,
  LINE_UPRATE_COST_FRAC,
  LINE_UPRATE_MUL,
  SUBS,
  type GenType,
  type LineBuild,
  type SubType,
  type VegPolicy,
} from './catalog';
import { CONNECT_DAYS, GEN_OF_KIND } from './events/applications';
import { FARM_MW_PER_TILE } from './catalog';
import { farmClaimTiles, farmFitMW, farmTileOrder, isFarmGen } from './farms';
import { applyConvertToH2 } from './market/hydrogen';
import {
  applySetDirectorate,
  applySetPay,
  applySetSafetyProgramme,
  type Directorate,
} from './events/directorates';
import { applyClaimResponse, type ClaimResponse } from './events/litigation';
import { applyReplaceAsset, applyScheduleMaintenance } from './reliability/ageing';
import { applyStormPrep } from './reliability/stormprep';
import { applySetSmartCharging } from './customers/smartCharging';
import {
  bumpMood,
  developerOf,
  reservedTiles,
  TENDER_OPEN_DAYS,
  type Tender,
} from './events/developers';
import { MAX_VANS } from './fleet/fleet';
import type { VoltageLevel } from './grid/types';
import { placePylons, priceLine, pylonSiteOk, routeTiles } from './cost';
import { BIG_BUILDING_ZONES, RC, TERRAIN, ZONE, type CityMap } from './map/types';
import { pushEvent, type GameState } from './state';
import type { SimSpeed } from './protocol';

export type Command =
  | { type: 'setSpeed'; speed: SimSpeed }
  | { type: 'build'; spec: BuildSpec }
  | { type: 'demolish'; assetId: number }
  | { type: 'setFleet'; vans: number }
  /** DEV/TEST ONLY: seed a repair job at a tile so the fleet dispatches a van
   *  (deterministic van-on-road screenshots — the UI never sends this). */
  | { type: '__testFault'; x: number; y: number; repairMin?: number; label?: string }
  | { type: 'setVegPolicy'; policy: VegPolicy }
  | { type: 'respondApplication'; appId: number; response: 'firm' | 'flex' | 'decline' }
  /** Award a generation tender to one of its bidders. */
  | { type: 'acceptBid'; tenderId: number; developerId: number }
  /** Withdraw a tender (every bidder takes it badly). */
  | { type: 'declineTender'; tenderId: number }
  | { type: 'fundPitch'; pitchId: number }
  | { type: 'setLevy'; pct: number }
  /** Refit a substation transformer (manual sizing switches auto off),
   *  or hand sizing back to auto-reinforcement. */
  | { type: 'setSubMva'; assetId: number; mva?: number; auto?: boolean }
  /** Set a battery's dispatch policy (ROADMAP #12): peak shave (the
   *  default), national-price arbitrage, or emergency reserve. */
  | { type: 'setBatteryPolicy'; assetId: number; policy: BatteryPolicy }
  /** Rebuild an overhead line as an underground cable (full UG price). */
  | { type: 'convertLine'; assetId: number }
  /** Bury only the span of an overhead line bracketing (x,y): the line
   *  splits at sealing-end towers and the middle leg becomes cable —
   *  amenity undergrounding through town. */
  | { type: 'undergroundSection'; lineId: number; x: number; y: number }
  /** Re-conductor a line: +30% thermal rating, one-shot, at a price. */
  | { type: 'uprateLine'; assetId: number }
  /** Rebuild a substation underground (indoor GIS: weatherproof, ×capex). */
  | { type: 'convertSub'; assetId: number }
  /** Tee into an existing circuit: split it at a junction near (x,y) and
   *  run a new leg of the same level from `fromAssetId` — a real
   *  three-ended circuit, in one command (= one undo step). */
  | { type: 'tee'; lineId: number; x: number; y: number; fromAssetId: number; build: LineBuild }
  /** A bent circuit: legs through junction towers at each waypoint, all
   *  built (and undone) as one step. */
  | {
      type: 'buildPath';
      level: VoltageLevel;
      build: LineBuild;
      fromAssetId: number;
      waypoints: Array<{ x: number; y: number }>;
      toX: number;
      toY: number;
    }
  /** Stamp a build template (ROADMAP #37): place a set of substations and
   *  the lines between them at an anchor, all-or-nothing, as ONE command
   *  (= one undo step). Line endpoints reference subs by their index in
   *  `subs`. Any failed piece rolls the whole stamp back. */
  | {
      type: 'placeTemplate';
      subs: Array<{ sub: SubType; x: number; y: number }>;
      lines: Array<{
        level: VoltageLevel;
        build: LineBuild;
        ax: number;
        ay: number;
        bx: number;
        by: number;
      }>;
    }
  /** Storm preparation (ROADMAP #9): the owner's SYSTEM-PREPARE levers —
   *  scale up crew SHIFTS (the surge engine; 'surge' kept as an alias),
   *  activate SCOUTS (office staff drive the lines → faster fault location
   *  → quicker restoration), draft WIDER CALL HANDLING (office staff onto
   *  the phones → answer time stays inside target → CSAT protected), or run
   *  an emergency vegetation cut. Logic lives in reliability/stormprep. */
  | {
      type: 'stormPrep';
      action: 'surge' | 'shifts' | 'scouts' | 'callHandling' | 'vegCut';
      lineId?: number;
      days?: number;
    }
  /** Fund (or wind down) a council's smart-charging programme (ROADMAP
   *  #18): that council's EV evening profile flattens, the £/yr cost
   *  rides the bill. Councils below satisfaction 50 refuse. Logic lives
   *  in customers/smartCharging.ts. */
  | { type: 'setSmartCharging'; councilId: number; on: boolean }
  /** Replace an aged line/substation like-for-like (ROADMAP #15): resets
   *  builtAtMin (derived health → 100) at 70% of current capex — the
   *  easements and civils are already paid for. reliability/ageing.ts. */
  | { type: 'replaceAsset'; assetId: number }
  /** Queue a planned-maintenance outage for the next 01:00–05:00 window
   *  (ROADMAP #16): ~+25 health on completion, 10% of capex, no fleet
   *  job. Logic lives in reliability/ageing.ts. */
  | { type: 'scheduleMaintenance'; assetId: number }
  /** Convert a gas peaker to hydrogen firing (ROADMAP #23): burns the
   *  electrolyser fleet's H₂ store first (carbon 0), falls back to gas
   *  when the tanks run dry. Logic lives in market/hydrogen.ts. */
  | { type: 'convertToH2'; assetId: number }
  /** Set a directorate's staffing dial (ROADMAP #53): 0–4 FTE level. The
   *  £/yr cost rides the bill; the buff feeds its real mechanic. Logic in
   *  events/directorates.ts. */
  | { type: 'setDirectorate'; directorate: Directorate; level: number }
  /** Set the pay & benefits / employee-engagement investment (#53). */
  | { type: 'setPay'; level: number }
  /** Set the H&S safety-programme investment (#55, the culture dial). */
  | { type: 'setSafetyProgramme'; level: number }
  /** Respond to a litigation claim (ROADMAP #54): settle, fight or
   *  remediate. Logic lives in events/litigation.ts. */
  | { type: 'claimResponse'; claimId: number; response: ClaimResponse }
  /** Handled by the worker via its snapshot stacks. */
  | { type: 'undo' }
  | { type: 'redo' };

export type BuildSpec =
  /** `mw`: the player's chosen size for a CAPACITY-PICKED farm tender
   *  (BuildPalette). Caps the tender's fitMW and the reserved footprint, so
   *  a modest onshore-wind ask reserves a modest plot. Absent = the full
   *  land fit (the old behaviour), or fixed-plant catalog capacity. */
  | { kind: 'gen'; gen: GenType; x: number; y: number; mw?: number | undefined }
  /** `autoConnect`: after placing, run a circuit from each of the sub's
   *  bays to the nearest asset with a matching bay (palette setting).
   *  `mva`: chosen transformer rating at build time (BuildPalette ± picker;
   *  must be one of the sub's mvaSteps) — absent leaves it on auto. */
  | { kind: 'sub'; sub: SubType; x: number; y: number; autoConnect?: boolean | undefined; mva?: number | undefined }
  | { kind: 'depot'; x: number; y: number }
  | {
      kind: 'line';
      level: VoltageLevel;
      build: LineBuild;
      ax: number;
      ay: number;
      bx: number;
      by: number;
    };

export interface CommandResult {
  ok: boolean;
  error?: string | undefined;
  assetId?: number | undefined;
}

export interface BuildCheck {
  ok: boolean;
  error?: string;
  capexK: number;
  lengthTiles: number;
  /** Line endpoints resolved to asset ids (line specs only). */
  endA?: number;
  endB?: number;
  /** Support tiles along an overhead route (line specs only). */
  pylons?: number[];
}

function tileAt(map: CityMap, x: number, y: number): number | undefined {
  if (x < 0 || x >= map.width || y < 0 || y >= map.height) return undefined;
  return y * map.width + x;
}

/** Tile footprint of a placed asset (lines have none). */
export function assetFootprint(a: PlacedAsset): [number, number] {
  if (a.kind === 'gen') return GENS[a.gen].footprint ?? [1, 1];
  if (a.kind === 'sub') return SUBS[a.sub].footprint ?? [1, 1];
  return [1, 1];
}

export function assetAtTile(
  assets: Iterable<PlacedAsset>,
  x: number,
  y: number,
  map?: CityMap,
): PlacedAsset | undefined {
  for (const a of assets) {
    if (a.kind === 'line') continue;
    // capacity-scaled farms occupy their whole DERIVED claim, not just the
    // catalog rect — so a line endpoint / inspect / tee can land on ANY tile
    // the awarded farm sits on (owner: "I should be able to click the circuit
    // to any tile the farm occupies"). Needs the map to derive the claim;
    // callers without one fall back to the catalog footprint (back-compat).
    if (map && a.kind === 'gen' && a.mw !== undefined && isFarmGen(a.gen)) {
      const i = y * map.width + x;
      if (farmClaimTiles(map, a.gen, a.x, a.y, a.mw).includes(i)) return a;
      continue;
    }
    const [fw, fh] = assetFootprint(a);
    if (x >= a.x && x < a.x + fw && y >= a.y && y < a.y + fh) return a;
  }
  return undefined;
}

/** Every tile a multi-tile asset's footprint covers. Farm-type plant
 *  stamped with an awarded MW claims its capacity-proportional tile set
 *  (derived — see src/sim/farms.ts); everything else, its catalog rect. */
export function footprintTiles(map: CityMap, a: PlacedAsset): number[] {
  if (a.kind === 'line') return [];
  if (a.kind === 'gen' && a.mw !== undefined && isFarmGen(a.gen)) {
    // an awarded farm carries its EXACT reserved plot — use it verbatim so
    // the occupied tiles match what was reserved; older saves with no claim
    // fall back to the pure anchor+MW derivation (unchanged)
    if (a.claim && a.claim.length > 0) return a.claim;
    return farmClaimTiles(map, a.gen, a.x, a.y, a.mw);
  }
  const [fw, fh] = assetFootprint(a);
  const out: number[] = [];
  for (let dy = 0; dy < fh; dy++) {
    for (let dx = 0; dx < fw; dx++) out.push((a.y + dy) * map.width + a.x + dx);
  }
  return out;
}

/** The footprint a generation DESIGNATION reserves on the map: a farm
 *  reserves its full land-fit claim (the most it could ever award),
 *  fixed-footprint plant its catalog rect. Honours `taken` (other tenders'
 *  reservations + occupied ground) so a fresh designation can only hold
 *  ground nobody else does. Pure function of map + anchor + taken. */
export function reservationFootprint(
  map: CityMap,
  gen: GenType,
  x: number,
  y: number,
  fitMW: number | undefined,
  taken?: ReadonlySet<number>,
): number[] {
  if (isFarmGen(gen) && fitMW !== undefined) {
    return farmClaimTiles(map, gen, x, y, fitMW, taken);
  }
  const [fw, fh] = GENS[gen].footprint ?? [1, 1];
  const out: number[] = [];
  for (let dy = 0; dy < fh; dy++) {
    for (let dx = 0; dx < fw; dx++) out.push((y + dy) * map.width + x + dx);
  }
  return out;
}

/** Every tile carrying an overhead-line support (pylon or pole). */
export function pylonTilesOf(assets: Iterable<PlacedAsset>): Set<number> {
  const taken = new Set<number>();
  for (const a of assets) {
    if (a.kind !== 'line') continue;
    for (const i of a.pylons ?? []) taken.add(i);
  }
  return taken;
}

/** The span of an overhead line bracketing a clicked point: endpoints +
 *  supports divide the route into spans; returns the bracketing support
 *  coordinates and whether each bracket is a line endpoint. Shared by
 *  the undergroundSection command and the inspector's price quote. */
export function spanAt(
  line: { pylons?: number[] | undefined },
  endA: { x: number; y: number },
  endB: { x: number; y: number },
  mapWidth: number,
  px: number,
  py: number,
):
  | { ax: number; ay: number; bx: number; by: number; fromEnd: boolean; toEnd: boolean }
  | undefined {
  const route = routeTiles(endA.x, endA.y, endB.x, endB.y);
  const supportIx: number[] = [0];
  for (const p of line.pylons ?? []) {
    const sx = p % mapWidth;
    const sy = Math.floor(p / mapWidth);
    const ix = route.findIndex(([x, y]) => x === sx && y === sy);
    if (ix > 0) supportIx.push(ix);
  }
  supportIx.push(route.length - 1);
  supportIx.sort((a, b) => a - b);
  // nearest route tile to the click
  let nearest = 0;
  let bestD = Number.POSITIVE_INFINITY;
  for (let k = 0; k < route.length; k++) {
    const [x, y] = route[k] ?? [0, 0];
    const d = Math.hypot(x - px, y - py);
    if (d < bestD) {
      bestD = d;
      nearest = k;
    }
  }
  for (let s = 0; s + 1 < supportIx.length; s++) {
    const i0 = supportIx[s];
    const i1 = supportIx[s + 1];
    if (i0 === undefined || i1 === undefined) continue;
    if (nearest >= i0 && nearest <= i1) {
      const [ax, ay] = route[i0] ?? [0, 0];
      const [bx, by] = route[i1] ?? [0, 0];
      return { ax, ay, bx, by, fromEnd: i0 === 0, toEnd: i1 === route.length - 1 };
    }
  }
  return undefined;
}

/** Any water within `r` tiles (Chebyshev) — the cooling-water test. */
function nearWater(map: CityMap, x: number, y: number, r: number): boolean {
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) continue;
      if (map.terrain[ny * map.width + nx] === TERRAIN.water) return true;
    }
  }
  return false;
}

/** Static siting rule for a tile build (terrain/zone/landmark only — no
 *  occupancy). Shared by checkBuild and the green/red suitability overlay.
 *  Returns undefined when the ground itself is suitable. */
export function siteErrorAt(
  map: CityMap,
  spec: { kind: 'gen'; gen: GenType } | { kind: 'sub'; sub: SubType } | { kind: 'depot' },
  x: number,
  y: number,
): string | undefined {
  const i = tileAt(map, x, y);
  if (i === undefined) return 'out of bounds';
  const t = map.terrain[i];
  const z = map.zone[i];
  if (map.landmark !== undefined && (map.landmark[i] ?? 0) !== 0)
    return 'that is a protected landmark';
  if (((map.flags?.[i] ?? 0) & 2) !== 0) return 'that is an active runway';
  if ((map.road[i] ?? 0) >= RC.arterial) {
    return (map.road[i] ?? 0) === RC.rail
      ? 'cannot build on the railway'
      : 'cannot build on the carriageway';
  }

  if (spec.kind === 'gen') {
    const siting = GENS[spec.gen].siting;
    if (siting === 'solarSite') {
      if (z !== ZONE.solarSite) return 'solar farms need a surveyed solar site';
      return undefined;
    }
    if (siting === 'nuclearSite') {
      // the licensed estuary site is always game on — but any shoreline
      // works: a reactor's real siting constraint is cooling water
      if (z === ZONE.nuclearSite) return undefined;
      if (t === TERRAIN.water) return 'nuclear sits on dry land beside its cooling water';
      if (z === ZONE.posh) return 'the conservation area will never allow that';
      if (z === ZONE.park) return 'not in a royal park';
      if (!nearWater(map, x, y, 3)) {
        return 'nuclear needs cooling water — site it beside the sea or a river';
      }
      return undefined;
    }
    if (siting === 'windSite') {
      if (z !== ZONE.windSite) return 'offshore wind belongs in the estuary wind zone';
      return undefined;
    }
    if (siting === 'water') {
      if (t !== TERRAIN.water) return 'tidal turbines sit in the water';
      return undefined;
    }
    if (siting === 'edge') {
      // interconnectors land where the licence area meets the wider
      // world: the converter hall stands on dry land hard against the
      // map boundary, its HVDC cable running off-map to the continent
      if (t === TERRAIN.water) return 'the converter hall sits on dry land at its landfall';
      const edgeDist = Math.min(x, y, map.width - 1 - x, map.height - 1 - y);
      if (edgeDist > 2) {
        return 'interconnectors come ashore at the map edge — build within 2 tiles of the boundary';
      }
      return undefined;
    }
    // land plant
    if (t === TERRAIN.water) return 'cannot build on water';
    if (z === ZONE.posh) return 'the conservation area will never allow that';
    if (z === ZONE.park) return 'not in a royal park';
    return undefined;
  }

  if (spec.kind === 'sub' && spec.sub === 'vault') {
    if (!BIG_BUILDING_ZONES.has(z ?? ZONE.none))
      return 'underground substations go beneath large buildings, not houses';
    return undefined;
  }
  if (t === TERRAIN.water) return 'cannot build on water';
  return undefined;
}

/** Validate and price a build without mutating anything. `reserved` are
 *  tiles held by open generation tenders (their pending footprints): a new
 *  build/designation can't land on them, so side-by-side designations can
 *  never collide on award. */
export function checkBuild(
  map: CityMap,
  assets: Iterable<PlacedAsset>,
  spec: BuildSpec,
  reserved?: ReadonlySet<number>,
): BuildCheck {
  const fail = (error: string): BuildCheck => ({ ok: false, error, capexK: 0, lengthTiles: 0 });

  if (spec.kind === 'sub' && spec.sub === 'tee') {
    return fail('tee junctions are made by teeing the line tool into a circuit');
  }
  if (spec.kind === 'gen' || spec.kind === 'sub' || spec.kind === 'depot') {
    const [fw, fh] =
      spec.kind === 'gen'
        ? (GENS[spec.gen].footprint ?? [1, 1])
        : spec.kind === 'sub'
          ? (SUBS[spec.sub].footprint ?? [1, 1])
          : [1, 1];
    const assetList = [...assets];
    const pylonTiles = pylonTilesOf(assetList);
    // occupancy covers full footprints — campuses AND the derived tile
    // claims of capacity-scaled farms (footprintTiles handles both)
    const occupied = new Set<number>();
    for (const a of assetList) {
      for (const i of footprintTiles(map, a)) occupied.add(i);
    }
    for (let dy = 0; dy < fh; dy++) {
      for (let dx = 0; dx < fw; dx++) {
        const i = (spec.y + dy) * map.width + spec.x + dx;
        const siteError = siteErrorAt(map, spec, spec.x + dx, spec.y + dy);
        if (siteError) return fail(siteError);
        if (occupied.has(i)) return fail('tile already occupied');
        if (pylonTiles.has(i)) return fail('an overhead-line support stands here');
        if (reserved?.has(i)) return fail('a designated generation site is reserved here');
      }
    }
    const capexK =
      spec.kind === 'gen'
        ? GENS[spec.gen].capexK
        : spec.kind === 'sub'
          ? SUBS[spec.sub].capexK
          : DEPOT.capexK;
    return { ok: true, capexK, lengthTiles: 0 };
  }

  // line: both endpoints must be assets carrying this voltage level — and
  // a multi-tile farm can be connected on ANY tile it occupies (map-aware)
  const assetList = [...assets];
  const endA = assetAtTile(assetList, spec.ax, spec.ay, map);
  const endB = assetAtTile(assetList, spec.bx, spec.by, map);
  if (!endA || !endB) return fail('lines must run between two assets');
  if (endA.id === endB.id) return fail('a line needs two distinct endpoints');
  if (!assetLevels(endA).includes(spec.level))
    return fail(`no ${spec.level} kV bay at the first endpoint`);
  if (!assetLevels(endB).includes(spec.level))
    return fail(`no ${spec.level} kV bay at the second endpoint`);
  const priced = priceLine(map, spec.level, spec.build, spec.ax, spec.ay, spec.bx, spec.by);
  if (!priced.ok) return fail(priced.error ?? 'route blocked');
  let pylons: number[] = [];
  if (spec.build === 'overhead') {
    const taken = pylonTilesOf(assetList);
    for (const a of assetList) {
      for (const i of footprintTiles(map, a)) taken.add(i);
    }
    pylons = placePylons(
      map,
      spec.level,
      routeTiles(spec.ax, spec.ay, spec.bx, spec.by),
      taken,
    );
  }
  return {
    ok: true,
    capexK: priced.capexK,
    lengthTiles: priced.lengthTiles,
    endA: endA.id,
    endB: endB.id,
    pylons,
  };
}

/** Reach of the auto-connect setting: it won't string absurd circuits
 *  across the licence area, just to genuinely nearby sites. */
const AUTO_CONNECT_RANGE = 40;

/** Auto-connect (palette setting): feed each bay of a fresh substation
 *  from the nearest asset carrying the same bay — overhead where the
 *  route allows, cable where it must (conservation areas). Runs inside
 *  the build command, so the sub and its circuits undo as one step. */
function autoConnectSub(state: GameState, map: CityMap, subId: number): void {
  const sub = state.assets.get(subId);
  if (!sub || sub.kind !== 'sub') return;
  const used = new Set<number>();
  let connected = 0;
  for (const level of SUBS[sub.sub].levels) {
    let best: { id: number; x: number; y: number } | undefined;
    let bestD = AUTO_CONNECT_RANGE;
    for (const a of state.assets.values()) {
      if (a.id === subId || a.kind === 'line' || a.kind === 'depot' || used.has(a.id)) continue;
      if (!assetLevels(a).includes(level)) continue;
      const d = Math.hypot(a.x - sub.x, a.y - sub.y);
      if (d < bestD) {
        bestD = d;
        best = { id: a.id, x: a.x, y: a.y };
      }
    }
    if (!best) continue;
    for (const build of ['overhead', 'underground'] as const) {
      const r = applyCommand(state, map, {
        type: 'build',
        spec: { kind: 'line', level, build, ax: best.x, ay: best.y, bx: sub.x, by: sub.y },
      });
      if (r.ok) {
        used.add(best.id);
        connected++;
        break;
      }
    }
  }
  if (connected === 0) {
    pushEvent(state, 'info', 'auto-connect: no compatible bay in reach', sub.x, sub.y);
  }
}

export function applyCommand(state: GameState, map: CityMap, cmd: Command): CommandResult {
  switch (cmd.type) {
    case 'setSpeed':
      state.speed = cmd.speed;
      return { ok: true };

    case 'build': {
      const spec = cmd.spec;
      // open tenders hold their reserved footprints — a build can't land on
      // them (and the designation below adds its own to the set)
      const reserved = reservedTiles(state.tenders);
      const check = checkBuild(map, state.assets.values(), spec, reserved);
      if (!check.ok) return { ok: false, error: check.error };
      if (spec.kind === 'gen' && spec.gen === 'interconnector') {
        // interconnectors are PLAYER-OWNED network assets, not developer
        // plant: no tender and no PPA — the build lands the asset
        // directly and its capex is recovered through DUoS with the
        // wires (bill.ts carries the matching exception). The energy it
        // imports is bought at the national price through dispatch.
        const g = GENS[spec.gen];
        const id = state.nextAssetId++;
        state.assets.set(id, {
          id,
          kind: 'gen',
          gen: spec.gen,
          x: spec.x,
          y: spec.y,
          liveAtMin: state.simTimeMin + (g.planningDays + g.buildDays) * 1440,
        });
        state.assetsVersion++;
        pushEvent(
          state,
          'info',
          `${g.name} consented — converter hall under construction at the landfall`,
          spec.x,
          spec.y,
        );
        return { ok: true, assetId: id };
      }
      if (spec.kind === 'gen') {
        // the operator doesn't build power stations: designating a site
        // opens a tender that developers bid on (accepted via acceptBid)
        const g = GENS[spec.gen];
        // ground already spoken for: placed assets + their footprints,
        // overhead supports, and OTHER open tenders' reservations. The farm
        // survey walls off all of it so a new designation only ever holds
        // ground nobody else does.
        const taken = new Set<number>(reserved);
        for (const i of pylonTilesOf(state.assets.values())) taken.add(i);
        for (const a of state.assets.values()) {
          for (const i of footprintTiles(map, a)) taken.add(i);
        }
        // farm techs: developers bid what FITS — survey the contiguous open
        // land around the site now, capped by the player's CHOSEN size
        // (capacity picker) when given, then RESERVE that whole footprint so
        // a second side-by-side designation can't overlap and the award
        // lands exactly here (no "explosion").
        let fitMW: number | undefined;
        let footprint: number[];
        if (isFarmGen(spec.gen)) {
          const land = farmFitMW(map, spec.gen, spec.x, spec.y, taken);
          fitMW = spec.mw !== undefined ? Math.max(1, Math.min(spec.mw, land)) : land;
          footprint = reservationFootprint(map, spec.gen, spec.x, spec.y, fitMW, taken);
        } else {
          footprint = reservationFootprint(map, spec.gen, spec.x, spec.y, undefined, taken);
        }
        const tender: Tender = {
          id: state.nextAppId++,
          gen: spec.gen,
          x: spec.x,
          y: spec.y,
          openedMin: state.simTimeMin,
          closesMin: state.simTimeMin + TENDER_OPEN_DAYS * 1440,
          bids: [],
          status: 'open',
          reserved: footprint,
          ...(fitMW !== undefined ? { fitMW } : {}),
        };
        state.tenders.push(tender);
        pushEvent(
          state,
          'info',
          `site designated for ${g.name} — inviting developer bids${
            fitMW !== undefined && fitMW < g.capacityMW
              ? ` (${footprint.length}-tile plot, ~${fitMW} MW of the ${g.capacityMW} MW ask)`
              : ''
          }`,
          spec.x,
          spec.y,
        );
        return { ok: true };
      }
      const id = state.nextAssetId++;
      if (spec.kind === 'sub') {
        // builtAtMin: new kit is new — derived health starts at 100. A
        // chosen MVA (BuildPalette ± picker) fits that transformer at build
        // and switches auto-reinforcement off; an unlisted size is ignored
        // (stays on auto), so a bad value can never wedge the build.
        const steps = SUBS[spec.sub].mvaSteps;
        const sizeMva =
          spec.mva !== undefined && steps?.includes(spec.mva) ? spec.mva : undefined;
        state.assets.set(id, {
          id,
          kind: 'sub',
          sub: spec.sub,
          x: spec.x,
          y: spec.y,
          builtAtMin: state.simTimeMin,
          ...(sizeMva !== undefined ? { mva: sizeMva, mvaAuto: false } : {}),
        });
        if (spec.autoConnect) autoConnectSub(state, map, id);
      } else if (spec.kind === 'depot') {
        state.assets.set(id, { id, kind: 'depot', x: spec.x, y: spec.y });
      } else {
        state.assets.set(id, {
          id,
          kind: 'line',
          level: spec.level,
          build: spec.build,
          a: check.endA ?? -1,
          b: check.endB ?? -1,
          lengthTiles: check.lengthTiles,
          capexK: check.capexK,
          pylons: check.pylons ?? [],
          builtAtMin: state.simTimeMin,
        });
      }
      state.assetsVersion++;
      return { ok: true, assetId: id };
    }

    case 'convertLine': {
      const asset = state.assets.get(cmd.assetId);
      if (!asset || asset.kind !== 'line') return { ok: false, error: 'no such line' };
      if (asset.build === 'underground') return { ok: false, error: 'already underground' };
      const endA = state.assets.get(asset.a);
      const endB = state.assets.get(asset.b);
      if (!endA || endA.kind === 'line' || !endB || endB.kind === 'line') {
        return { ok: false, error: 'line endpoints missing' };
      }
      const priced = priceLine(map, asset.level, 'underground', endA.x, endA.y, endB.x, endB.y);
      if (!priced.ok) return { ok: false, error: priced.error ?? 'route blocked' };
      asset.build = 'underground';
      asset.capexK = priced.capexK;
      asset.pylons = [];
      state.lineVeg.delete(asset.id);
      state.assetsVersion++;
      pushEvent(state, 'info', `${asset.level} kV line undergrounded — storms can do their worst`);
      return { ok: true };
    }

    case 'buildPath': {
      const from = state.assets.get(cmd.fromAssetId);
      if (!from || from.kind === 'line') return { ok: false, error: 'start from an asset' };
      if (!assetLevels(from).includes(cmd.level)) {
        return { ok: false, error: `no ${cmd.level} kV bay at the start` };
      }
      const to = assetAtTile(state.assets.values(), cmd.toX, cmd.toY);
      if (!to || to.kind === 'line' || to.id === from.id) {
        return { ok: false, error: 'no destination bay there' };
      }
      if (!assetLevels(to).includes(cmd.level)) {
        return { ok: false, error: `no ${cmd.level} kV bay at the destination` };
      }
      // junction towers stand where pylons can; build all-or-nothing
      const made: number[] = [];
      const rollback = (error: string): CommandResult => {
        for (const id of made) state.assets.delete(id);
        state.assetsVersion++;
        return { ok: false, error };
      };
      const taken = pylonTilesOf(state.assets.values());
      for (const wp of cmd.waypoints) {
        if (!pylonSiteOk(map, wp.x, wp.y, taken) || assetAtTile(state.assets.values(), wp.x, wp.y)) {
          return rollback('a waypoint tower cannot stand there');
        }
        const id = state.nextAssetId++;
        state.assets.set(id, {
          id,
          kind: 'sub',
          sub: 'tee',
          x: wp.x,
          y: wp.y,
          teeLevel: cmd.level,
          builtAtMin: state.simTimeMin,
        });
        made.push(id);
      }
      const nodes = [{ x: from.x, y: from.y }, ...cmd.waypoints, { x: to.x, y: to.y }];
      for (let k = 0; k + 1 < nodes.length; k++) {
        const a = nodes[k];
        const b = nodes[k + 1];
        if (!a || !b) continue;
        const r = applyCommand(state, map, {
          type: 'build',
          spec: { kind: 'line', level: cmd.level, build: cmd.build, ax: a.x, ay: a.y, bx: b.x, by: b.y },
        });
        if (!r.ok) return rollback(r.error ?? 'a leg failed');
        if (r.assetId !== undefined) made.push(r.assetId);
      }
      state.assetsVersion++;
      if (cmd.waypoints.length > 0) {
        pushEvent(
          state,
          'info',
          `${cmd.level} kV circuit routed via ${cmd.waypoints.length} waypoint tower${cmd.waypoints.length > 1 ? 's' : ''}`,
          cmd.toX,
          cmd.toY,
        );
      }
      return { ok: true };
    }

    case 'placeTemplate': {
      // stamp a saved pattern: subs first (their fresh ids let the lines
      // resolve their endpoints by tile), then the lines between them. All
      // or nothing — any blocked piece rolls the whole set back, so the
      // template paste is a single, clean undo step.
      if (cmd.subs.length === 0) return { ok: false, error: 'empty template' };
      const made: number[] = [];
      const rollback = (error: string): CommandResult => {
        for (const id of made) state.assets.delete(id);
        state.assetsVersion++;
        return { ok: false, error };
      };
      for (const s of cmd.subs) {
        const r = applyCommand(state, map, {
          type: 'build',
          spec: { kind: 'sub', sub: s.sub, x: s.x, y: s.y },
        });
        if (!r.ok || r.assetId === undefined) return rollback(r.error ?? 'a substation is blocked');
        made.push(r.assetId);
      }
      for (const l of cmd.lines) {
        const r = applyCommand(state, map, {
          type: 'build',
          spec: { kind: 'line', level: l.level, build: l.build, ax: l.ax, ay: l.ay, bx: l.bx, by: l.by },
        });
        if (!r.ok || r.assetId === undefined) return rollback(r.error ?? 'a feeder is blocked');
        made.push(r.assetId);
      }
      state.assetsVersion++;
      pushEvent(
        state,
        'info',
        `template stamped — ${cmd.subs.length} substation${cmd.subs.length > 1 ? 's' : ''}${
          cmd.lines.length ? ` + ${cmd.lines.length} feeder${cmd.lines.length > 1 ? 's' : ''}` : ''
        }`,
        cmd.subs[0]?.x ?? 0,
        cmd.subs[0]?.y ?? 0,
      );
      return { ok: true, assetId: made[0] };
    }

    case 'tee': {
      const line = state.assets.get(cmd.lineId);
      if (!line || line.kind !== 'line') return { ok: false, error: 'no such line' };
      const from = state.assets.get(cmd.fromAssetId);
      if (!from || from.kind === 'line') return { ok: false, error: 'connect the tee to an asset' };
      if (!assetLevels(from).includes(line.level)) {
        return { ok: false, error: `no ${line.level} kV bay at the connecting asset` };
      }
      const endA = state.assets.get(line.a);
      const endB = state.assets.get(line.b);
      if (!endA || endA.kind === 'line' || !endB || endB.kind === 'line') {
        return { ok: false, error: 'line endpoints missing' };
      }
      // snap the junction to the nearest workable tile along the route
      const route = routeTiles(endA.x, endA.y, endB.x, endB.y);
      const assetList = [...state.assets.values()];
      const otherPylons = pylonTilesOf(assetList.filter((a) => a.id !== line.id));
      let site: [number, number] | undefined;
      let bestD = Number.POSITIVE_INFINITY;
      for (let k = 1; k + 1 < route.length; k++) {
        const [x, y] = route[k] ?? [-1, -1];
        const i = y * map.width + x;
        if (map.terrain[i] === TERRAIN.water) continue;
        if (map.landmark !== undefined && (map.landmark[i] ?? 0) !== 0) continue;
        if (otherPylons.has(i)) continue;
        if (assetAtTile(assetList, x, y)) continue;
        const d = Math.hypot(x - cmd.x, y - cmd.y);
        if (d < bestD) {
          bestD = d;
          site = [x, y];
        }
      }
      if (!site) return { ok: false, error: 'no room for a junction on that span' };
      // junction in, original circuit out, three legs rebuilt through it
      const [jx, jy] = site;
      const teeId = state.nextAssetId++;
      state.assets.set(teeId, {
        id: teeId,
        kind: 'sub',
        sub: 'tee',
        x: jx,
        y: jy,
        teeLevel: line.level,
        builtAtMin: state.simTimeMin,
      });
      state.assets.delete(line.id);
      state.lineVeg.delete(line.id);
      const leg = (ax: number, ay: number, bx: number, by: number, build: LineBuild) =>
        applyCommand(state, map, {
          type: 'build',
          spec: { kind: 'line', level: line.level, build, ax, ay, bx, by },
        });
      const r1 = leg(endA.x, endA.y, jx, jy, line.build);
      const r2 = leg(jx, jy, endB.x, endB.y, line.build);
      const r3 = leg(from.x, from.y, jx, jy, cmd.build);
      if (!r1.ok || !r2.ok || !r3.ok) {
        for (const id of [r1.assetId, r2.assetId, r3.assetId]) {
          if (id !== undefined) state.assets.delete(id);
        }
        state.assets.delete(teeId);
        state.assets.set(line.id, line);
        state.assetsVersion++;
        return { ok: false, error: r1.error ?? r2.error ?? r3.error ?? 'tee failed' };
      }
      state.assetsVersion++;
      pushEvent(state, 'info', `${line.level} kV circuit tee'd — three ends now`, jx, jy);
      return { ok: true, assetId: teeId };
    }

    case 'convertSub': {
      const asset = state.assets.get(cmd.assetId);
      if (!asset || asset.kind !== 'sub') return { ok: false, error: 'no such substation' };
      if (asset.idno) return { ok: false, error: "that's the iDNO's substation, not yours" };
      if (asset.underground) return { ok: false, error: 'already underground' };
      asset.underground = true;
      state.assetsVersion++;
      pushEvent(
        state,
        'info',
        `${SUBS[asset.sub].name.split(' (')[0]} rebuilt underground (GIS) — weatherproof, at a price`,
        asset.x,
        asset.y,
      );
      return { ok: true };
    }

    case 'undergroundSection': {
      const line = state.assets.get(cmd.lineId);
      if (!line || line.kind !== 'line') return { ok: false, error: 'no such line' };
      if (line.build === 'underground') return { ok: false, error: 'already underground' };
      const endA = state.assets.get(line.a);
      const endB = state.assets.get(line.b);
      if (!endA || endA.kind === 'line' || !endB || endB.kind === 'line') {
        return { ok: false, error: 'line endpoints missing' };
      }
      const span = spanAt(line, endA, endB, map.width, cmd.x, cmd.y);
      if (!span) return { ok: false, error: 'no span there' };
      // the whole line in one span: that's just a full conversion
      if (span.fromEnd && span.toEnd) {
        return applyCommand(state, map, { type: 'convertLine', assetId: line.id });
      }
      // sealing-end towers where the cable surfaces, then three legs —
      // one command, one undo step
      state.assets.delete(line.id);
      state.lineVeg.delete(line.id);
      const made: number[] = [];
      const sealingEnd = (x: number, y: number): number => {
        const id = state.nextAssetId++;
        state.assets.set(id, {
          id,
          kind: 'sub',
          sub: 'tee',
          x,
          y,
          teeLevel: line.level,
          builtAtMin: state.simTimeMin,
        });
        made.push(id);
        return id;
      };
      if (!span.fromEnd) sealingEnd(span.ax, span.ay);
      if (!span.toEnd) sealingEnd(span.bx, span.by);
      const leg = (
        ax: number,
        ay: number,
        bx: number,
        by: number,
        build: LineBuild,
      ): CommandResult => {
        const r = applyCommand(state, map, {
          type: 'build',
          spec: { kind: 'line', level: line.level, build, ax, ay, bx, by },
        });
        if (r.ok && r.assetId !== undefined) made.push(r.assetId);
        return r;
      };
      const results: CommandResult[] = [];
      if (!span.fromEnd) results.push(leg(endA.x, endA.y, span.ax, span.ay, 'overhead'));
      results.push(leg(span.ax, span.ay, span.bx, span.by, 'underground'));
      if (!span.toEnd) results.push(leg(span.bx, span.by, endB.x, endB.y, 'overhead'));
      const failed = results.find((r) => !r.ok);
      if (failed) {
        for (const id of made) state.assets.delete(id);
        state.assets.set(line.id, line);
        state.assetsVersion++;
        return { ok: false, error: failed.error ?? 'section undergrounding failed' };
      }
      state.assetsVersion++;
      pushEvent(
        state,
        'info',
        `amenity undergrounding: the ${line.level} kV line ducks below the rooftops`,
        Math.round((span.ax + span.bx) / 2),
        Math.round((span.ay + span.by) / 2),
      );
      return { ok: true };
    }

    case 'uprateLine': {
      const asset = state.assets.get(cmd.assetId);
      if (!asset || asset.kind !== 'line') return { ok: false, error: 'no such line' };
      if (asset.uprated) return { ok: false, error: 'already running hot conductors' };
      asset.uprated = true;
      asset.capexK = Math.round(asset.capexK * (1 + LINE_UPRATE_COST_FRAC));
      state.assetsVersion++;
      pushEvent(
        state,
        'info',
        `${asset.level} kV circuit re-conductored — thermal rating up ${Math.round((LINE_UPRATE_MUL - 1) * 100)}%`,
      );
      return { ok: true };
    }

    case 'stormPrep':
      return applyStormPrep(state, cmd);

    case 'setSmartCharging':
      return applySetSmartCharging(state, map, cmd);

    case 'replaceAsset':
      return applyReplaceAsset(state, cmd.assetId);

    case 'scheduleMaintenance':
      return applyScheduleMaintenance(state, cmd.assetId);

    case 'convertToH2':
      return applyConvertToH2(state, cmd.assetId);

    case 'setDirectorate':
      return applySetDirectorate(state, cmd.directorate, cmd.level);

    case 'setPay':
      return applySetPay(state, cmd.level);

    case 'setSafetyProgramme':
      return applySetSafetyProgramme(state, cmd.level);

    case 'claimResponse':
      return applyClaimResponse(state, cmd.claimId, cmd.response);

    case 'undo':
    case 'redo':
      return { ok: false, error: 'handled by the worker' };

    case 'setSubMva': {
      const asset = state.assets.get(cmd.assetId);
      if (!asset || asset.kind !== 'sub') return { ok: false, error: 'no such substation' };
      if (asset.idno) return { ok: false, error: "that's the iDNO's transformer, not yours" };
      const steps = SUBS[asset.sub].mvaSteps;
      if (!steps) return { ok: false, error: 'that substation has a fixed transformer' };
      if (cmd.mva !== undefined) {
        if (!steps.includes(cmd.mva)) {
          return { ok: false, error: `transformers come in ${steps.join('/')} MVA` };
        }
        asset.mva = cmd.mva;
        asset.mvaAuto = false;
      }
      if (cmd.auto !== undefined) asset.mvaAuto = cmd.auto;
      state.assetsVersion++;
      return { ok: true };
    }

    case 'setBatteryPolicy': {
      const asset = state.assets.get(cmd.assetId);
      if (!asset || asset.kind !== 'gen' || asset.gen !== 'battery') {
        return { ok: false, error: 'no such battery' };
      }
      asset.policy = cmd.policy;
      // no assetsVersion bump: policy steers dispatch, not topology —
      // the next solve reads it straight off the asset. Undo-safety
      // comes free: the worker snapshots state before any mutating
      // command, and policy rides PlacedAsset serialization.
      return { ok: true };
    }

    case 'acceptBid': {
      const tender = state.tenders.find((t) => t.id === cmd.tenderId);
      if (!tender) return { ok: false, error: 'no such tender' };
      if (tender.status !== 'open') return { ok: false, error: 'tender already settled' };
      const bid = tender.bids.find((b) => b.developerId === cmd.developerId);
      if (!bid) return { ok: false, error: 'no bid from that developer' };
      const g = GENS[tender.gen];
      // re-validate the anchor at award time: the site may have been built
      // over. OTHER open tenders' reservations still block, but NOT this
      // tender's own (it's awarding into the plot it has held all along).
      const otherReserved = reservedTiles(state.tenders.filter((t) => t.id !== tender.id));
      const check = checkBuild(
        map,
        state.assets.values(),
        { kind: 'gen', gen: tender.gen, x: tender.x, y: tender.y },
        otherReserved,
      );
      if (!check.ok) {
        pushEvent(
          state,
          'bad',
          `award failed: the ${g.name} site is blocked — ${check.error}`,
          tender.x,
          tender.y,
        );
        return { ok: false, error: check.error };
      }
      // farm awards land on the RESERVED plot the designation held: cap the
      // bid's MW to the largest free PREFIX of that reservation (assets and
      // OTHER tenders only — never this tender's own hold). The reservation
      // was claimed at designation so nothing should have taken it, but town
      // growth can re-zone, so we still walk the prefix for safety.
      let awardMW: number | undefined;
      let awardClaim: number[] | undefined;
      if (bid.mw !== undefined && isFarmGen(tender.gen)) {
        const per = FARM_MW_PER_TILE[tender.gen] ?? 1;
        const taken = new Set<number>(otherReserved);
        for (const i of pylonTilesOf(state.assets.values())) taken.add(i);
        for (const a of state.assets.values()) {
          for (const i of footprintTiles(map, a)) taken.add(i);
        }
        const plot = tender.reserved ?? farmTileOrder(map, tender.gen, tender.x, tender.y);
        let free = 0;
        for (const i of plot) {
          if (taken.has(i)) break;
          free++;
        }
        // the anchor re-validated above, so free >= 1 — at least one tile's
        // worth of plant always lands
        awardMW = Math.min(bid.mw, free * per);
        // land on exactly the reserved tiles (the held plot's free prefix)
        awardClaim = plot.slice(0, Math.max(1, Math.ceil(awardMW / per)));
      }
      const id = state.nextAssetId++;
      state.assets.set(id, {
        id,
        kind: 'gen',
        gen: tender.gen,
        x: tender.x,
        y: tender.y,
        developer: bid.developerId,
        ppaMWh: bid.priceMWh,
        liveAtMin: state.simTimeMin, // construction is instant: award → online
        ...(awardMW !== undefined ? { mw: awardMW } : {}),
        ...(awardClaim !== undefined ? { claim: awardClaim } : {}),
      });
      tender.status = 'awarded';
      for (const b of tender.bids) {
        bumpMood(state, b.developerId, b.developerId === bid.developerId ? 6 : -8);
      }
      pushEvent(
        state,
        'info',
        `${g.name}${awardMW !== undefined ? ` (${awardMW} MW)` : ''} awarded to ${developerOf(bid.developerId)?.name ?? 'a developer'} — online and ready for your wires`,
        tender.x,
        tender.y,
      );
      state.assetsVersion++;
      return { ok: true, assetId: id };
    }

    case 'declineTender': {
      const tender = state.tenders.find((t) => t.id === cmd.tenderId);
      if (!tender) return { ok: false, error: 'no such tender' };
      if (tender.status !== 'open') return { ok: false, error: 'tender already settled' };
      tender.status = 'lapsed';
      for (const b of tender.bids) bumpMood(state, b.developerId, -12);
      pushEvent(
        state,
        'info',
        `tender withdrawn for the ${GENS[tender.gen].name} site`,
        tender.x,
        tender.y,
      );
      return { ok: true };
    }

    case 'demolish': {
      const asset = state.assets.get(cmd.assetId);
      if (!asset) return { ok: false, error: 'no such asset' };
      if (asset.kind === 'gen' && asset.developer !== undefined) {
        return { ok: false, error: 'the developer owns the plant — you only own the wires' };
      }
      if (asset.kind === 'gen' && asset.customer) {
        return { ok: false, error: "that's customer-owned plant — you only own the wires" };
      }
      if (asset.kind === 'sub' && asset.idno) {
        return { ok: false, error: "the iDNO owns that substation — you just connect to it" };
      }
      state.assets.delete(cmd.assetId);
      if (asset.kind !== 'line' && asset.kind !== 'depot') {
        // cascade: remove lines that referenced this endpoint
        for (const a of [...state.assets.values()]) {
          if (a.kind === 'line' && (a.a === asset.id || a.b === asset.id)) {
            state.assets.delete(a.id);
          }
        }
      }
      state.assetsVersion++;
      return { ok: true };
    }

    case 'setFleet':
      if (!Number.isInteger(cmd.vans) || cmd.vans < 0 || cmd.vans > MAX_VANS) {
        return { ok: false, error: `fleet must be 0–${MAX_VANS} vans` };
      }
      state.fleetSize = cmd.vans;
      return { ok: true };

    case '__testFault': {
      // DEV/TEST: seed a repair job so a free van dispatches and drives the
      // roads to it. A negative synthetic branch id keeps it clear of real
      // branch ids; -1 in outages == AWAITING_CREW (tick.ts).
      const branchId = -(1000 + Math.floor(Math.abs(cmd.x) * 1000 + Math.abs(cmd.y)));
      const label = cmd.label ?? 'test fault';
      state.outages.set(branchId, -1);
      state.outageCause.set(branchId, label);
      state.jobs.set(branchId, {
        branchId,
        assetId: -1,
        x: cmd.x,
        y: cmd.y,
        repairMin: cmd.repairMin ?? 6000, // long, so the van stays on site for the shot
        waitedMin: 0,
        label,
      });
      return { ok: true };
    }

    case 'setVegPolicy':
      state.vegPolicy = cmd.policy;
      return { ok: true };

    case 'respondApplication': {
      const app = state.applications.find((a) => a.id === cmd.appId);
      if (!app) return { ok: false, error: 'no such application' };
      if (app.status !== 'open') return { ok: false, error: 'application already decided' };
      if (cmd.response === 'decline') {
        app.status = 'declined';
        return { ok: true };
      }
      const gen = GEN_OF_KIND[app.kind];
      if (gen) {
        if (assetAtTile(state.assets.values(), app.x, app.y)) {
          return { ok: false, error: 'the site has been built over' };
        }
        const id = state.nextAssetId++;
        state.assets.set(id, {
          id,
          kind: 'gen',
          gen,
          x: app.x,
          y: app.y,
          customer: true,
          flex: cmd.response === 'flex',
        });
        app.assetId = id;
        // the bespoke Heathrow scheme is PV + BESS: the application studies
        // and builds as solar, but acceptance ALSO drops a co-located
        // battery (the firm/flex deal applies to both halves of the scheme)
        if (app.heathrow && app.bessMw !== undefined) {
          let bx = app.x;
          let by = app.y + 1;
          // a free neighbour tile for the battery; fall back to the PV tile
          for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1]] as const) {
            if (!assetAtTile(state.assets.values(), app.x + dx, app.y + dy)) {
              bx = app.x + dx;
              by = app.y + dy;
              break;
            }
          }
          const bId = state.nextAssetId++;
          state.assets.set(bId, {
            id: bId,
            kind: 'gen',
            gen: 'battery',
            x: bx,
            y: by,
            customer: true,
            flex: cmd.response === 'flex',
          });
          state.soc.set(bId, 0);
        }
        state.assetsVersion++;
      } else {
        state.loadSites.push({
          id: app.id,
          x: app.x,
          y: app.y,
          mw: app.mw,
          customers: app.customers,
          name: app.name,
        });
        state.sitesVersion++;
      }
      app.status = cmd.response;
      app.connectByMin = state.simTimeMin + CONNECT_DAYS * 1440;
      return { ok: true };
    }

    case 'fundPitch': {
      const pitch = state.pitches.find((p) => p.id === cmd.pitchId);
      if (!pitch) return { ok: false, error: 'no such pitch' };
      if (pitch.status !== 'open') return { ok: false, error: 'pitch already decided' };
      if (state.innovationFundK < pitch.costK) {
        return { ok: false, error: 'innovation fund too small — raise the levy and wait' };
      }
      state.innovationFundK -= pitch.costK;
      pitch.status = 'funded';
      pitch.completesAtMin = state.simTimeMin + pitch.durationDays * 1440;
      return { ok: true };
    }

    case 'setLevy': {
      if (cmd.pct < 0 || cmd.pct > 3) return { ok: false, error: 'levy must be 0–3%' };
      state.levyPct = Math.round(cmd.pct * 2) / 2;
      return { ok: true };
    }
  }
}
