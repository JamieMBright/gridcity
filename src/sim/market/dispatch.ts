// Automated market dispatch. The player never balances the system by hand:
// per electrical island, PPA renewables run must-take, then the merit
// order stacks nuclear → batteries → gas until the moment's load is met.
// Batteries charge themselves on cheap surplus and discharge into the
// evening peak; whatever ran, customers pay for. Surplus renewable output
// that nothing could absorb is logged as curtailment.

import { BATTERY_EFFICIENCY, GENS, SUBS } from '../catalog';
import { busId, type PlacedAsset } from '../assets';
import { findIslands } from '../grid/topology';
import type { Injection, Network } from '../grid/types';
import {
  domesticProfile,
  processProfile,
  sunFactor,
  windFactor,
  type WeatherState,
} from '../events/weather';
import type { SubLoad } from '../service';

/** Merit-order cost assigned to battery discharge (displaces gas only). */
const BATTERY_DISPATCH_COST_K = 0.06;

export interface DispatchInputs {
  simTimeMin: number;
  weather: WeatherState;
  /** battery asset id → state of charge, MWh. Mutated when dtMin > 0. */
  soc: Map<number, number>;
  /** Game-minutes this tick advances (0 = paused re-solve, no SoC drift). */
  dtMin: number;
}

export interface DispatchResult {
  injections: Injection[];
  /** gen asset id → MW (discharge for batteries; negative = charging). */
  genMW: Map<number, number>;
  /** dist-sub asset id → fraction of its current demand actually served. */
  servedFracOfSub: Map<number, number>;
  /** Preferred slack buses, biggest dispatched unit first. */
  slackPreference: number[];
  /** Wholesale cost of this operating point, £k per hour. */
  costKPerHour: number;
  /** Marginal price of the most expensive running unit, £/MWh. */
  priceMWh: number;
  /** Dispatch-weighted carbon intensity, g/kWh. */
  carbonG: number;
  /** Renewable output available but not absorbed, MW. */
  curtailedMW: number;
  /** Connected demand this moment (subs that reach any island), MW. */
  connectedMW: number;
  /** Demand actually supplied after ratings and generation limits, MW. */
  servedMW: number;
}

interface Unit {
  id: number;
  bus: number;
  availMW: number;
  costK: number;
  carbonG: number;
  mustRun: boolean;
  isBattery: boolean;
}

function availability(a: PlacedAsset & { kind: 'gen' }, inp: DispatchInputs): number {
  const spec = GENS[a.gen];
  switch (a.gen) {
    case 'solarFarm':
      return spec.capacityMW * sunFactor(inp.simTimeMin, inp.weather);
    case 'windOnshore':
      return spec.capacityMW * windFactor(inp.weather, false);
    case 'windOffshore':
      return spec.capacityMW * windFactor(inp.weather, true);
    default:
      return spec.capacityMW;
  }
}

export function runDispatch(
  net: Network,
  assets: Iterable<PlacedAsset>,
  loadOfSub: Map<number, SubLoad>,
  inp: DispatchInputs,
): DispatchResult {
  const { islandOf } = findIslands(net);
  const fDom = domesticProfile(inp.simTimeMin);
  const fProc = processProfile(inp.simTimeMin);

  interface IslandAgg {
    units: Unit[];
    batteries: Array<{ id: number; bus: number; rateMW: number; energyMWh: number }>;
    subs: Array<{ id: number; bus: number; loadNowMW: number; cappedNowMW: number }>;
  }
  const byIsland = new Map<number, IslandAgg>();
  const agg = (gi: number): IslandAgg => {
    let a = byIsland.get(gi);
    if (!a) {
      a = { units: [], batteries: [], subs: [] };
      byIsland.set(gi, a);
    }
    return a;
  };

  for (const a of assets) {
    if (a.kind === 'gen') {
      const spec = GENS[a.gen];
      const bus = busId(a.id, spec.level);
      const gi = islandOf.get(bus);
      if (gi === undefined) continue;
      if (a.gen === 'battery') {
        agg(gi).batteries.push({
          id: a.id,
          bus,
          rateMW: spec.capacityMW,
          energyMWh: spec.energyMWh ?? 0,
        });
      } else {
        const mustRun = a.gen === 'solarFarm' || a.gen === 'windOnshore' || a.gen === 'windOffshore';
        agg(gi).units.push({
          id: a.id,
          bus,
          availMW: availability(a, inp),
          costK: spec.marginalCostK,
          carbonG: spec.carbonG,
          mustRun,
          isBattery: false,
        });
      }
    } else if (a.kind === 'sub' && SUBS[a.sub].serviceRadius !== undefined) {
      const load = loadOfSub.get(a.id);
      if (!load) continue;
      const loadNowMW = load.domMW * fDom + load.procMW * fProc;
      if (loadNowMW <= 0) continue;
      const bus = busId(a.id, 33);
      const gi = islandOf.get(bus);
      if (gi === undefined) continue;
      const cappedNowMW = Math.min(loadNowMW, SUBS[a.sub].txRatingMW);
      agg(gi).subs.push({ id: a.id, bus, loadNowMW, cappedNowMW });
    }
  }

  const injections: Injection[] = [];
  const genMW = new Map<number, number>();
  const servedFracOfSub = new Map<number, number>();
  const slackCandidates: Array<{ bus: number; mw: number }> = [];
  let costKPerHour = 0;
  let priceMWh = 0;
  let carbonNum = 0;
  let carbonDen = 0;
  let curtailedMW = 0;
  let connectedMW = 0;
  let servedMW = 0;

  for (const island of byIsland.values()) {
    let demand = island.subs.reduce((s, x) => s + x.cappedNowMW, 0);
    for (const s of island.subs) connectedMW += s.loadNowMW;

    // battery self-management: charge on surplus cheap power, otherwise
    // offer discharge into the stack between nuclear and gas
    const cheapMW = island.units.reduce(
      (s, u) => s + (u.mustRun || u.costK <= 0.02 ? u.availMW : 0),
      0,
    );
    const charging = new Map<number, number>();
    const stack: Unit[] = [...island.units];
    if (cheapMW > demand) {
      let surplus = cheapMW - demand;
      for (const b of island.batteries) {
        const soc = inp.soc.get(b.id) ?? 0;
        const headroomMW =
          inp.dtMin > 0 ? ((b.energyMWh - soc) / BATTERY_EFFICIENCY) * (60 / inp.dtMin) : b.rateMW;
        const mw = Math.max(0, Math.min(b.rateMW, headroomMW, surplus));
        if (mw > 0) {
          charging.set(b.id, mw);
          surplus -= mw;
          demand += mw;
        }
      }
    } else {
      for (const b of island.batteries) {
        const soc = inp.soc.get(b.id) ?? 0;
        const socMW = inp.dtMin > 0 ? soc * (60 / inp.dtMin) : b.rateMW;
        const availMW = Math.max(0, Math.min(b.rateMW, socMW));
        stack.push({
          id: b.id,
          bus: b.bus,
          availMW,
          costK: BATTERY_DISPATCH_COST_K,
          carbonG: 0,
          mustRun: false,
          isBattery: true,
        });
      }
    }

    if (demand <= 0) {
      // record idle batteries/gens so the UI shows 0 rather than stale data
      for (const u of island.units) genMW.set(u.id, 0);
      curtailedMW += island.units.reduce((s, u) => s + (u.mustRun ? u.availMW : 0), 0);
      continue;
    }

    // must-run first, then by marginal cost
    stack.sort((a, b) => Number(b.mustRun) - Number(a.mustRun) || a.costK - b.costK);
    const capacity = stack.reduce((s, u) => s + u.availMW, 0);
    const frac = capacity > 0 ? Math.min(1, capacity / demand) : 0;
    const target = demand * frac;

    let remaining = target;
    for (const u of stack) {
      const mw = Math.min(u.availMW, remaining);
      remaining -= mw;
      genMW.set(u.id, mw);
      if (mw > 0) {
        injections.push({ bus: u.bus, pMW: mw });
        costKPerHour += mw * u.costK;
        priceMWh = Math.max(priceMWh, u.costK * 1000);
        carbonNum += mw * u.carbonG;
        carbonDen += mw;
        slackCandidates.push({ bus: u.bus, mw });
        if (inp.dtMin > 0 && u.isBattery) {
          inp.soc.set(u.id, Math.max(0, (inp.soc.get(u.id) ?? 0) - (mw * inp.dtMin) / 60));
        }
      }
      if (u.mustRun) curtailedMW += u.availMW - mw;
    }

    for (const [id, mw] of charging) {
      const b = island.batteries.find((x) => x.id === id);
      if (!b) continue;
      genMW.set(id, -mw);
      injections.push({ bus: b.bus, pMW: -mw });
      if (inp.dtMin > 0) {
        const cap = GENS.battery.energyMWh ?? 0;
        inp.soc.set(
          id,
          Math.min(cap, (inp.soc.get(id) ?? 0) + (mw * inp.dtMin * BATTERY_EFFICIENCY) / 60),
        );
      }
    }

    for (const s of island.subs) {
      const supplied = s.cappedNowMW * frac;
      injections.push({ bus: s.bus, pMW: -supplied });
      servedFracOfSub.set(s.id, s.loadNowMW > 0 ? supplied / s.loadNowMW : 0);
      servedMW += supplied;
    }
  }

  slackCandidates.sort((a, b) => b.mw - a.mw);
  return {
    injections,
    genMW,
    servedFracOfSub,
    slackPreference: slackCandidates.map((c) => c.bus),
    costKPerHour,
    priceMWh,
    carbonG: carbonDen > 0 ? carbonNum / carbonDen : 0,
    curtailedMW,
    connectedMW,
    servedMW,
  };
}
