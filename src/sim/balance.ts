// The grid balance: gross vs connected procured generation, demand vs
// available supply, and the 24-hour profile of both — for the whole
// licence area and ring-fenced per council. This is the owner's "what
// does this town need" view: residential solar shows its night-time
// hole, and every scope reports its worst-hour shortfall.

import { busId, deriveNetwork } from './assets';
import { GENS, SUBS } from './catalog';
import {
  domesticProfile,
  evProfile,
  hpProfile,
  MIDSUMMER_MIN,
  MIDWINTER_MIN,
  processProfile,
  sunFactor,
  windFactor,
} from './events/weather';
import { findIslands } from './grid/topology';
import { underConstruction } from './market/dispatch';
import { tileDemand } from './map/demand';
import { NO_COUNCIL } from './map/types';
import { assignServiceAreas } from './service';
import type { GameState, SimContext } from './state';

export interface ScopePoint {
  h: number;
  demandMW: number;
  supplyMW: number;
}

export interface ScopeBalance {
  /** Council id, or -1 for the whole licence area. */
  id: number;
  name: string;
  customers: number;
  /** Customers wired into a service catchment (energization shows live
   *  in the coverage layer; this is the network's reach). */
  connectedCustomers: number;
  /** Demand right now, MW. */
  demandNowMW: number;
  /** Procured generation, MW: everything on the map… */
  grossCapMW: number;
  /** …and the part electrically reachable from this scope's catchments. */
  connectedCapMW: number;
  /** Typical-day 24h profile: demand vs available connected supply. */
  profile: ScopePoint[];
  /** Worst-hour unserved gap (MW) and when it bites. */
  shortfallMW: number;
  shortfallHour: number;
  cx: number;
  cy: number;
}

/** Which typical day the 24h profiles run on: the current date's
 *  ('today', the default), or a canonical midwinter / midsummer day. */
export type BalanceSeason = 'winter' | 'summer' | 'today';

export interface BalanceReport {
  scopes: ScopeBalance[];
  /** Game-minute the report was cut. */
  atMin: number;
  /** Which typical day the profiles were run on. */
  season: BalanceSeason;
}

/** The forecast runs on a standard day so profiles read clean. */
const TYP_WEATHER = { cloud: 0.35, wind: 0.5 };

/** Availability of a connected plant at hour h on the typical day
 *  starting at sim-minute `dayMin` (0 = the scenario's opening day).
 *  Shared with the UI for per-generator profile charts. */
export function availAt(gen: keyof typeof GENS, h: number, dayMin = 0): number {
  const t = dayMin + h * 60;
  switch (gen) {
    case 'solarFarm':
      return sunFactor(t, TYP_WEATHER);
    case 'windOnshore':
      return windFactor(TYP_WEATHER, false);
    case 'windOffshore':
      return windFactor(TYP_WEATHER, true);
    case 'tidal':
      return 0.5; // the tide is always somewhere in its cycle
    case 'battery':
      return h >= 17 && h < 21 ? 1 : 0; // discharges into the evening peak
    case 'electrolyser':
      return 0; // demand-side soak: never supply in the balance view
    default:
      return 1; // firm plant
  }
}

export function computeBalance(
  state: GameState,
  ctx: SimContext,
  season: BalanceSeason = 'today',
): BalanceReport {
  const { map } = ctx;
  // midnight of the day the profile loop runs over: season factors ride
  // along inside the profile functions via the date carried in t
  const dayMin =
    season === 'winter'
      ? MIDWINTER_MIN
      : season === 'summer'
        ? MIDSUMMER_MIN
        : Math.floor(state.simTimeMin / 1440) * 1440;
  const service = assignServiceAreas(map, state.assets.values(), state.loadSites, state.councils);
  // connectivity ignores transient outages: this is about the wiring
  const net = deriveNetwork(state.assets.values());
  const islands = findIslands(net);

  // per-council demand components + geometry
  interface Agg {
    customers: number;
    connectedCustomers: number;
    dom: number;
    proc: number;
    ev: number;
    hp: number;
    pv: number;
    sx: number;
    sy: number;
    n: number;
    islandSet: Set<number>;
  }
  const newAgg = (): Agg => ({
    customers: 0,
    connectedCustomers: 0,
    dom: 0,
    proc: 0,
    ev: 0,
    hp: 0,
    pv: 0,
    sx: 0,
    sy: 0,
    n: 0,
    islandSet: new Set(),
  });
  const byCouncil = new Map<number, Agg>();
  const whole = newAgg();

  for (let i = 0; i < map.width * map.height; i++) {
    const customers = map.customers[i] ?? 0;
    const cid = map.council[i] ?? NO_COUNCIL;
    if (customers === 0 && cid === NO_COUNCIL) continue;
    const d = tileDemand(map, i, state.councils);
    const connected = service.subOfTile.has(i);
    const targets: Agg[] = [whole];
    if (cid !== NO_COUNCIL) {
      let agg = byCouncil.get(cid);
      if (!agg) {
        agg = newAgg();
        byCouncil.set(cid, agg);
      }
      targets.push(agg);
    }
    for (const a of targets) {
      a.customers += customers;
      if (connected) a.connectedCustomers += customers;
      a.dom += d.domMW;
      a.proc += d.procMW;
      a.ev += d.evMW;
      a.hp += d.hpMW;
      a.pv += d.pvMW;
      a.sx += i % map.width;
      a.sy += Math.floor(i / map.width);
      a.n++;
    }
  }

  // which electrical islands reach each scope (via its serving subs)
  for (const a of state.assets.values()) {
    if (a.kind !== 'sub' || SUBS[a.sub].serviceRadius === undefined) continue;
    const tiles = service.tilesOfSub.get(a.id);
    if (!tiles || tiles.length === 0) continue;
    const gi = islands.islandOf.get(busId(a.id, 33));
    if (gi === undefined || gi < 0) continue;
    whole.islandSet.add(gi);
    const seen = new Set<number>();
    for (const t of tiles) {
      const cid = map.council[t] ?? NO_COUNCIL;
      if (cid === NO_COUNCIL || seen.has(cid)) continue;
      seen.add(cid);
      byCouncil.get(cid)?.islandSet.add(gi);
    }
  }

  // generation per island
  interface GenEntry {
    gen: keyof typeof GENS;
    capMW: number;
    island: number;
    building: boolean;
  }
  const gens: GenEntry[] = [];
  for (const a of state.assets.values()) {
    if (a.kind !== 'gen') continue;
    gens.push({
      gen: a.gen,
      capMW: a.mw ?? GENS[a.gen].capacityMW, // awarded land-capped MW when stamped
      island: islands.islandOf.get(busId(a.id, GENS[a.gen].level)) ?? -1,
      building: underConstruction(a, state.simTimeMin),
    });
  }
  const grossAll = gens.reduce((s, g) => s + g.capMW, 0);

  const fNowDom = domesticProfile(state.simTimeMin);
  const fNowProc = processProfile(state.simTimeMin);
  const fNowEv = evProfile(state.simTimeMin, state.tech.smartEv);
  const fNowHp = hpProfile(state.simTimeMin, state.weather.cloud);

  const scopeOf = (id: number, name: string, a: Agg, gross: number): ScopeBalance => {
    const connectedGens = gens.filter((g) => !g.building && a.islandSet.has(g.island));
    const connectedCapMW = connectedGens.reduce((s, g) => s + g.capMW, 0);
    const profile: ScopePoint[] = [];
    let shortfallMW = 0;
    let shortfallHour = 18;
    for (let h = 0; h < 24; h++) {
      const t = dayMin + h * 60;
      const demandMW =
        a.dom * domesticProfile(t) +
        a.proc * processProfile(t) +
        a.ev * evProfile(t, state.tech.smartEv) +
        a.hp * hpProfile(t, TYP_WEATHER.cloud);
      // rooftop PV is local supply riding the same sun arc
      const supplyMW =
        connectedGens.reduce((s, g) => s + g.capMW * availAt(g.gen, h, dayMin), 0) +
        a.pv * sunFactor(t, TYP_WEATHER);
      profile.push({
        h,
        demandMW: Math.round(demandMW * 10) / 10,
        supplyMW: Math.round(supplyMW * 10) / 10,
      });
      const gap = demandMW - supplyMW;
      if (gap > shortfallMW) {
        shortfallMW = gap;
        shortfallHour = h;
      }
    }
    return {
      id,
      name,
      customers: a.customers,
      connectedCustomers: a.connectedCustomers,
      demandNowMW:
        Math.round(
          (a.dom * fNowDom + a.proc * fNowProc + a.ev * fNowEv + a.hp * fNowHp) * 10,
        ) / 10,
      grossCapMW: gross,
      connectedCapMW,
      profile,
      shortfallMW: Math.round(shortfallMW * 10) / 10,
      shortfallHour,
      cx: a.n > 0 ? Math.round(a.sx / a.n) : 0,
      cy: a.n > 0 ? Math.round(a.sy / a.n) : 0,
    };
  };

  const scopes: ScopeBalance[] = [scopeOf(-1, 'Whole licence area', whole, grossAll)];
  for (const profile of map.councils) {
    const agg = byCouncil.get(profile.id);
    if (!agg || agg.customers === 0) continue;
    // a council's "gross" is what's connected to it: procurement is global
    const sc = scopeOf(profile.id, profile.name, agg, 0);
    sc.grossCapMW = sc.connectedCapMW;
    scopes.push(sc);
  }
  // worst-served first, after the whole-area headline
  const [head, ...rest] = scopes;
  rest.sort((x, y) => y.shortfallMW - x.shortfallMW);
  return { scopes: head ? [head, ...rest] : rest, atMin: state.simTimeMin, season };
}
