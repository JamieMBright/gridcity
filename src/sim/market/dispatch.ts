// Automated market dispatch. The player never balances the system by hand:
// per electrical island, firm PPA renewables run must-take, flexibly
// connected ones are curtailed first when there's surplus (that was the
// deal), then the merit order stacks nuclear → batteries → gas until the
// moment's load is met. Rooftop PV export offsets local demand and can
// flow back up the network. Batteries charge themselves on cheap surplus
// and discharge into the evening peak. Firm curtailment is compensated
// (constraint payments → bill); flexible curtailment is just logged.

import { BATTERY_EFFICIENCY, GENS, SUBS } from '../catalog';
import { busId, type PlacedAsset } from '../assets';
import { findIslands } from '../grid/topology';
import type { Injection, Network } from '../grid/types';
import {
  domesticProfile,
  evProfile,
  hpProfile,
  processProfile,
  sunFactor,
  tideFactor,
  windFactor,
  type WeatherState,
} from '../events/weather';
import type { SubLoad } from '../service';

/** Merit-order cost assigned to battery discharge (displaces gas only). */
const BATTERY_DISPATCH_COST_K = 0.06;
/** Compensation for constraining off a firm connection, £k/MWh. */
export const CONSTRAINT_COMP_K = 0.06;
/** Price paid to demand turning down in the flexibility market, £k/MWh. */
export const FLEX_PRICE_K = 0.15;
/** The flexibility market can shave at most this share of an area's load. */
export const FLEX_MAX_SHAVE = 0.2;

export interface TechFlags {
  smartEv: boolean;
  flexMarket: boolean;
}

export interface DispatchInputs {
  simTimeMin: number;
  weather: WeatherState;
  /** battery asset id → state of charge, MWh. Mutated when dtMin > 0. */
  soc: Map<number, number>;
  /** Game-minutes this tick advances (0 = paused re-solve, no SoC drift). */
  dtMin: number;
  tech: TechFlags;
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
  /** Flexibility-market payments this hour, £k. */
  flexCostKPerHour: number;
  /** Constraint compensation to firm connections this hour, £k. */
  constraintKPerHour: number;
  /** Marginal price of the most expensive running unit, £/MWh. */
  priceMWh: number;
  /** Dispatch-weighted carbon intensity, g/kWh. */
  carbonG: number;
  /** Renewable output available but not absorbed, MW, by connection type. */
  curtailedFirmMW: number;
  curtailedFlexMW: number;
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
  flex: boolean;
  isBattery: boolean;
}

/** Still in planning/construction: on the network, generating nothing. */
export function underConstruction(
  a: { liveAtMin?: number | undefined },
  simTimeMin: number,
): boolean {
  return a.liveAtMin !== undefined && a.liveAtMin > simTimeMin;
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
    case 'tidal':
      return spec.capacityMW * tideFactor(inp.simTimeMin);
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
  const fEv = evProfile(inp.simTimeMin, inp.tech.smartEv);
  const fHp = hpProfile(inp.simTimeMin, inp.weather.cloud);
  const fSun = sunFactor(inp.simTimeMin, inp.weather);

  interface SubNow {
    id: number;
    bus: number;
    /** demand before flexibility/ratings (negative = exporting). */
    loadNowMW: number;
    /** after flex shaving and the transformer rating clamp. */
    cappedNowMW: number;
    shavedMW: number;
  }
  interface IslandAgg {
    units: Unit[];
    batteries: Array<{ id: number; bus: number; rateMW: number; energyMWh: number }>;
    subs: SubNow[];
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

  let flexCostKPerHour = 0;

  for (const a of assets) {
    if (a.kind === 'gen') {
      const spec = GENS[a.gen];
      const bus = busId(a.id, spec.level);
      const gi = islandOf.get(bus);
      if (gi === undefined) continue;
      const building = underConstruction(a, inp.simTimeMin);
      if (a.gen === 'battery') {
        if (!building) {
          agg(gi).batteries.push({
            id: a.id,
            bus,
            rateMW: spec.capacityMW,
            energyMWh: spec.energyMWh ?? 0,
          });
        }
      } else {
        const renewable =
          a.gen === 'solarFarm' ||
          a.gen === 'windOnshore' ||
          a.gen === 'windOffshore' ||
          a.gen === 'tidal';
        agg(gi).units.push({
          id: a.id,
          bus,
          availMW: building ? 0 : availability(a, inp),
          costK: spec.marginalCostK,
          carbonG: spec.carbonG,
          mustRun: renewable && !a.flex && !building,
          flex: a.flex === true && !building,
          isBattery: false,
        });
      }
    } else if (a.kind === 'sub' && SUBS[a.sub].serviceRadius !== undefined) {
      const load = loadOfSub.get(a.id);
      if (!load) continue;
      const loadNowMW =
        load.domMW * fDom +
        load.procMW * fProc +
        load.evMW * fEv +
        load.hpMW * fHp -
        load.pvMW * fSun;
      if (loadNowMW === 0) continue;
      const bus = busId(a.id, 33);
      const gi = islandOf.get(bus);
      if (gi === undefined) continue;
      const rating = SUBS[a.sub].txRatingMW;
      let shavedMW = 0;
      let effective = loadNowMW;
      if (inp.tech.flexMarket && loadNowMW > rating) {
        shavedMW = Math.min(loadNowMW - rating, loadNowMW * FLEX_MAX_SHAVE);
        effective = loadNowMW - shavedMW;
        flexCostKPerHour += shavedMW * FLEX_PRICE_K;
      }
      const cappedNowMW = Math.max(-rating, Math.min(rating, effective));
      agg(gi).subs.push({ id: a.id, bus, loadNowMW, cappedNowMW, shavedMW });
    }
  }

  const injections: Injection[] = [];
  const genMW = new Map<number, number>();
  const servedFracOfSub = new Map<number, number>();
  const slackCandidates: Array<{ bus: number; mw: number }> = [];
  let costKPerHour = 0;
  let constraintKPerHour = 0;
  let priceMWh = 0;
  let carbonNum = 0;
  let carbonDen = 0;
  let curtailedFirmMW = 0;
  let curtailedFlexMW = 0;
  let connectedMW = 0;
  let servedMW = 0;

  const recordCurtailed = (u: Unit, mw: number): void => {
    if (mw <= 0) return;
    if (u.flex) {
      curtailedFlexMW += mw;
    } else {
      curtailedFirmMW += mw;
      constraintKPerHour += mw * CONSTRAINT_COMP_K;
    }
  };

  for (const island of byIsland.values()) {
    let demand = 0;
    let exportMW = 0;
    for (const s of island.subs) {
      connectedMW += Math.max(0, s.loadNowMW);
      if (s.cappedNowMW >= 0) demand += s.cappedNowMW;
      else exportMW += -s.cappedNowMW;
    }

    // battery self-management: charge on surplus cheap power, otherwise
    // offer discharge into the stack between nuclear and gas
    const cheapMW =
      exportMW +
      island.units.reduce((s, u) => s + (u.mustRun || u.costK <= 0.02 ? u.availMW : 0), 0);
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
          flex: false,
          isBattery: true,
        });
      }
    }

    // rooftop export serves local demand first; spill beyond it is lost
    let exportScale = 1;
    if (exportMW > demand) {
      exportScale = demand > 0 ? demand / exportMW : 0;
      curtailedFlexMW += exportMW - demand;
      exportMW = demand;
    }
    const residual = Math.max(0, demand - exportMW);

    if (residual <= 0 && demand <= 0) {
      for (const u of island.units) {
        genMW.set(u.id, 0);
        if (u.mustRun || u.flex) recordCurtailed(u, u.availMW);
      }
      for (const s of island.subs) {
        if (s.cappedNowMW < 0) {
          injections.push({ bus: s.bus, pMW: -s.cappedNowMW * exportScale });
          servedFracOfSub.set(s.id, 1);
        }
      }
      continue;
    }

    // firm must-run first, flexible renewables next, then by marginal cost
    stack.sort(
      (a, b) =>
        Number(b.mustRun) - Number(a.mustRun) ||
        Number(b.flex && b.costK < 0.06) - Number(a.flex && a.costK < 0.06) ||
        a.costK - b.costK,
    );
    const capacity = stack.reduce((s, u) => s + u.availMW, 0);
    const frac = residual > 0 ? (capacity > 0 ? Math.min(1, capacity / residual) : 0) : 1;
    const target = residual * frac;
    // consumers are served by dispatched generation plus rooftop export
    const consFrac = demand > 0 ? Math.min(1, (target + exportMW) / demand) : 1;

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
      if (u.mustRun || u.flex) recordCurtailed(u, u.availMW - mw);
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
      if (s.cappedNowMW < 0) {
        injections.push({ bus: s.bus, pMW: -s.cappedNowMW * exportScale });
        servedFracOfSub.set(s.id, 1);
        continue;
      }
      const supplied = s.cappedNowMW * consFrac;
      injections.push({ bus: s.bus, pMW: -supplied });
      // shaved demand counts as served — the flexibility market paid for it
      servedFracOfSub.set(
        s.id,
        s.loadNowMW > 0 ? Math.min(1, (supplied + s.shavedMW) / s.loadNowMW) : 1,
      );
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
    flexCostKPerHour,
    constraintKPerHour,
    priceMWh,
    carbonG: carbonDen > 0 ? carbonNum / carbonDen : 0,
    curtailedFirmMW,
    curtailedFlexMW,
    connectedMW,
    servedMW,
  };
}
