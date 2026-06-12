// Automated market dispatch. The player never balances the system by hand:
// per electrical island, firm PPA renewables run must-take, flexibly
// connected ones are curtailed first when there's surplus (that was the
// deal), then the merit order stacks nuclear → batteries → gas until the
// moment's load is met. Rooftop PV export offsets local demand and can
// flow back up the network. Batteries follow a player-set policy (peak
// shave / national-price arbitrage / emergency reserve); interconnectors
// import at the deterministic national price. Firm curtailment is
// compensated (constraint payments → bill); flexible curtailment is just
// logged.

import { BATTERY_EFFICIENCY, GENS, strikeMWh, SUBS } from '../catalog';
import { busId, subMva, type BatteryPolicy, type PlacedAsset } from '../assets';
import { devCurtailK } from '../events/developers';
import { findIslands } from '../grid/topology';
import type { Injection, Network } from '../grid/types';
import {
  domesticProfile,
  evProfile,
  hpProfile,
  processProfile,
  seasonFactor,
  sunFactor,
  tideFactor,
  windFactor,
  type WeatherState,
} from '../events/weather';
import type { SubLoad } from '../service';

/** Merit-order cost assigned to battery discharge (displaces gas only). */
const BATTERY_DISPATCH_COST_K = 0.06;
/** Battery 'arbitrage' policy price bands, £k/MWh: charge below the
 *  floor, discharge above the ceiling — judged against the national
 *  price, local conditions be damned. */
export const ARBITRAGE_CHARGE_BELOW_K = 0.06;
export const ARBITRAGE_DISCHARGE_ABOVE_K = 0.11;
/** Arbitrage discharge is offered at the very front of the non-must-run
 *  stack: the player has decided the price is right, so it runs. */
const ARBITRAGE_DISCHARGE_COST_K = 0.005;
/** The 'reserve' policy holds this fraction of the store for the day
 *  its island would otherwise go dark. */
export const RESERVE_SOC_FRAC = 0.5;
/** Reserve refills from the grid at this fraction of its rate while
 *  below the floor: an emergency store mustn't cook the local network
 *  (or distort the merit order) getting back to standby. */
export const RESERVE_REFILL_FRAC = 0.2;

/** GB national wholesale price, £/MWh — what the interconnector imports
 *  at and what battery arbitrage trades against. Deterministic, no RNG:
 *  a daily shape (cheap nights ~£45/MWh, evening peaks ~£140/MWh plus a
 *  smaller morning shoulder), scaled +30% in deep winter via
 *  seasonFactor, with a £60/MWh scarcity kicker whenever a calm-cold
 *  regime sits over GB — the dunkelflaute: no wind anywhere and
 *  everyone's heating on. Accepts the sim's WeatherState or the
 *  snapshot's weather (the UI quotes "import price now" off the very
 *  same series the worker dispatches against). */
export function nationalPriceMWh(
  simTimeMin: number,
  weather: { regime?: string | undefined },
): number {
  const h = (simTimeMin / 60) % 24;
  const evening = Math.exp(-(((h - 18.5) / 2.4) ** 2));
  const morning = 0.35 * Math.exp(-(((h - 8) / 1.8) ** 2));
  let p = 45 + 95 * Math.min(1, evening + morning);
  p *= 1 + 0.3 * seasonFactor(simTimeMin);
  if (weather.regime === 'calm-cold') p += 60;
  return p;
}

/** nationalPriceMWh in the sim's £k/MWh money unit. */
export function nationalPriceK(
  simTimeMin: number,
  weather: { regime?: string | undefined },
): number {
  return nationalPriceMWh(simTimeMin, weather) / 1000;
}
/** Compensation for constraining off a firm connection, £k/MWh — the
 *  flat fallback; developer plant prices its own curtailment (#17:
 *  GenAsset.curtailK / the developer's curtailPriceK personality). */
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
  /** PPA top-ups above wholesale on delivered energy this hour, £k. */
  ppaTopupKPerHour: number;
  /** Flexibility-market payments this hour, £k. */
  flexCostKPerHour: number;
  /** Constraint compensation to firm connections this hour, £k. */
  constraintKPerHour: number;
  /** Per-unit constraint rows: [gen asset id, curtailed MW, £k/h]. The
   *  bill drill-down's source — dispatch stays pure, tick folds these
   *  into the state's EMA maps. Sums to constraintKPerHour. */
  constraintDetail: Array<[number, number, number]>;
  /** Per-unit PPA rows: [gen asset id, delivered MW, top-up £k/h].
   *  Top-ups sum to ppaTopupKPerHour. */
  ppaDetail: Array<[number, number, number]>;
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
  /** PPA strike for billing, £k/MWh (developer plant). Customers pay the
   *  top-up above wholesale on DELIVERED energy only — idle plant is the
   *  developer's problem, like a real CfD. */
  ppaK?: number | undefined;
  /** Curtailment price, £k/MWh (#17): what a FIRM curtailment of this
   *  unit pays. Absent = the flat CONSTRAINT_COMP_K. */
  curtailK?: number | undefined;
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
    batteries: Array<{
      id: number;
      bus: number;
      rateMW: number;
      energyMWh: number;
      policy: BatteryPolicy;
    }>;
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
            policy: a.policy ?? 'shave',
          });
        }
      } else {
        const renewable =
          a.gen === 'solarFarm' ||
          a.gen === 'windOnshore' ||
          a.gen === 'windOffshore' ||
          a.gen === 'tidal';
        // the interconnector imports at the live national price (merit-
        // ordered like any unit) and never carries a PPA — it's the
        // player's own network asset buying energy from over the water
        const interconnector = a.gen === 'interconnector';
        agg(gi).units.push({
          id: a.id,
          bus,
          availMW: building ? 0 : availability(a, inp),
          costK: interconnector ? nationalPriceK(inp.simTimeMin, inp.weather) : spec.marginalCostK,
          carbonG: spec.carbonG,
          mustRun: renewable && !a.flex && !building,
          flex: a.flex === true && !building,
          isBattery: false,
          ppaK: interconnector
            ? undefined
            : a.ppaMWh !== undefined
              ? a.ppaMWh / 1000
              : a.developer !== undefined
                ? strikeMWh(a.gen) / 1000
                : undefined,
          // #17: the asset's stamped price, else its developer's
          // personality (identical figure — see inheritCurtailPrices)
          curtailK:
            a.curtailK ?? (a.developer !== undefined ? devCurtailK(a.developer) : undefined),
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
      const rating = subMva(a);
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
  let ppaTopupKPerHour = 0;
  let constraintKPerHour = 0;
  let priceMWh = 0;
  let carbonNum = 0;
  let carbonDen = 0;
  let curtailedFirmMW = 0;
  let curtailedFlexMW = 0;
  let connectedMW = 0;
  let servedMW = 0;

  const constraintDetail: Array<[number, number, number]> = [];
  const ppaDetail: Array<[number, number, number]> = [];

  const recordCurtailed = (u: Unit, mw: number): void => {
    if (mw <= 0) return;
    if (u.flex) {
      curtailedFlexMW += mw;
    } else {
      // firm curtailment pays the unit's own offer (#17), flat fallback
      const compK = u.curtailK ?? CONSTRAINT_COMP_K;
      curtailedFirmMW += mw;
      constraintKPerHour += mw * compK;
      constraintDetail.push([u.id, mw, mw * compK]);
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

    // battery dispatch by policy (ROADMAP #12). 'shave' (the default,
    // and the original self-management): charge on cheap local surplus,
    // otherwise offer discharge into the stack between nuclear and gas.
    // 'arbitrage': trade the national price — charge cheap, discharge
    // dear, the local peak be damned. 'reserve': hold ≥50% SoC and
    // discharge only when the island would otherwise go unserved.
    const natK = nationalPriceK(inp.simTimeMin, inp.weather);
    const unitCapMW = island.units.reduce((s, u) => s + u.availMW, 0);
    // would this island fall short without its batteries? (the supply-
    // shortfall condition the reserve policy is held against)
    const wouldFallShort = Math.max(0, demand - exportMW) > unitCapMW + 1e-9;
    const cheapMW =
      exportMW +
      island.units.reduce((s, u) => s + (u.mustRun || u.costK <= 0.02 ? u.availMW : 0), 0);
    // shave keeps the original gate: on a cheap-surplus moment every
    // shave battery charges (some may get 0 once the surplus is taken),
    // and none of them counter-discharges
    const cheapSurplus = cheapMW > demand;
    let surplus = Math.max(0, cheapMW - demand);
    const charging = new Map<number, number>();
    const stack: Unit[] = [...island.units];
    for (const b of island.batteries) {
      const soc = inp.soc.get(b.id) ?? 0;
      const headroomMW =
        inp.dtMin > 0 ? ((b.energyMWh - soc) / BATTERY_EFFICIENCY) * (60 / inp.dtMin) : b.rateMW;
      const charge = (mw: number): void => {
        const take = Math.max(0, Math.min(b.rateMW, headroomMW, mw));
        if (take <= 0) return;
        charging.set(b.id, take);
        demand += take;
        surplus = Math.max(0, cheapMW - demand);
      };
      const offer = (costK: number): void => {
        const socMW = inp.dtMin > 0 ? soc * (60 / inp.dtMin) : b.rateMW;
        stack.push({
          id: b.id,
          bus: b.bus,
          availMW: Math.max(0, Math.min(b.rateMW, socMW)),
          costK,
          carbonG: 0,
          mustRun: false,
          flex: false,
          isBattery: true,
        });
      };
      if (b.policy === 'arbitrage') {
        if (natK < ARBITRAGE_CHARGE_BELOW_K) {
          charge(b.rateMW); // cheap night: fill up off whatever is running
        } else if (natK > ARBITRAGE_DISCHARGE_ABOVE_K) {
          offer(ARBITRAGE_DISCHARGE_COST_K); // dear peak: sell everything
        }
      } else if (b.policy === 'reserve') {
        if (wouldFallShort && soc > 0) {
          // this is the event the reserve was held for: the whole store
          // is on the table until the island is whole again
          offer(BATTERY_DISPATCH_COST_K);
        } else {
          // hold ≥50% SoC: trickle-refill from the grid while below the
          // floor (gently — see RESERVE_REFILL_FRAC), and only soak up
          // genuine surplus above it
          const floor = b.energyMWh * RESERVE_SOC_FRAC;
          charge(soc < floor ? Math.max(surplus, b.rateMW * RESERVE_REFILL_FRAC) : surplus);
        }
      } else if (cheapSurplus) {
        charge(surplus); // 'shave': charge on cheap local surplus…
      } else {
        offer(BATTERY_DISPATCH_COST_K); // …else stand ready for the peak
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

    // firm must-run first, flexible renewables next, then by marginal
    // cost. THE CURTAILMENT ORDER (#17) lives in the must-run tiebreak:
    // the fill loop below serves the stack top-down and curtails from
    // the tail, so sorting the DEAREST curtailment offers first means
    // the CHEAPEST curtailers are the ones constrained off when the
    // island can't absorb every firm renewable.
    stack.sort(
      (a, b) =>
        Number(b.mustRun) - Number(a.mustRun) ||
        (a.mustRun && b.mustRun
          ? (b.curtailK ?? CONSTRAINT_COMP_K) - (a.curtailK ?? CONSTRAINT_COMP_K)
          : 0) ||
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
        if (u.ppaK !== undefined) {
          const topupK = mw * Math.max(0, u.ppaK - u.costK);
          ppaTopupKPerHour += topupK;
          ppaDetail.push([u.id, mw, topupK]);
        }
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
        inp.soc.set(
          id,
          Math.min(
            b.energyMWh,
            (inp.soc.get(id) ?? 0) + (mw * inp.dtMin * BATTERY_EFFICIENCY) / 60,
          ),
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
    ppaTopupKPerHour,
    flexCostKPerHour,
    constraintKPerHour,
    constraintDetail,
    ppaDetail,
    priceMWh,
    carbonG: carbonDen > 0 ? carbonNum / carbonDen : 0,
    curtailedFirmMW,
    curtailedFlexMW,
    connectedMW,
    servedMW,
  };
}
