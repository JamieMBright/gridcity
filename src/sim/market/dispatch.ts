// Automated market dispatch. The player never balances the system by hand:
// per electrical island, firm PPA renewables run must-take, flexibly
// connected ones are curtailed first when there's surplus (that was the
// deal), then the merit order stacks nuclear → batteries → gas until the
// moment's load is met. Rooftop PV export offsets local demand and can
// flow back up the network. Batteries follow a player-set policy (peak
// shave / national-price arbitrage / emergency reserve); interconnectors
// import at the deterministic national price. Firm curtailment is
// compensated (constraint payments → bill); flexible curtailment is just
// logged. Hydrogen (#23): electrolysers are load-side soaks that absorb
// would-be curtailment into the H₂ store, and converted peakers burn that
// store first — both wired below, model + constants in market/hydrogen.ts.

import { BATTERY_EFFICIENCY, GENS, strikeMWh, SUBS } from '../catalog';
import { busId, subMva, type BatteryPolicy, type PlacedAsset } from '../assets';
import { devCurtailK } from '../events/developers';
import {
  drainH2,
  electrolyserIds,
  ELECTROLYSER_EFFICIENCY,
  H2_FUEL_COST_K,
  h2StoreMWh,
} from './hydrogen';
import { findIslands } from '../grid/topology';
import { islandFrequencyHz, type IslandFreqSample } from './frequency';
import type { Injection, Network } from '../grid/types';
import {
  coolingFactor,
  domesticProfile,
  evProfile,
  hpProfile,
  processProfile,
  seasonFactor,
  sunFactor,
  thermalDerate,
  tideFactor,
  windFactor,
  type WeatherState,
} from '../events/weather';
import {
  LONDON_MARKET,
  LONDON_PROFILE,
  LONDON_WEATHER,
  type GenerationModel,
  type MarketProfile,
  type PowerSystemProfile,
  type WeatherProfile,
} from '../powerProfile';
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

/** National wholesale price in the local currency/MWh — what the
 *  interconnector imports at and what battery arbitrage trades against.
 *  Deterministic, no RNG. The SHAPE is per-country profile data
 *  (MarketProfile): a cheap-night floor, an evening-peak adder over the
 *  diurnal demand shape, an optional midday solar trough (the duck curve,
 *  deep enough in Australia to go negative), a seasonal uplift whose sign
 *  the weather profile's peakSeason carries (winter heating GB/France;
 *  summer aircon AU/HK), an optional hydro-drought dry-season multiplier
 *  (Brazil's bandeira), and a scarcity kicker while the country's stress
 *  regime sits overhead. DEFAULTS to GB, and the GB profile reproduces the
 *  prior literals bit-for-bit (45 + 95·peak, ×(1+0.3·winterness), +60
 *  calm-cold). Accepts the sim's WeatherState or the snapshot's weather
 *  (the UI quotes "import price now" off the very same series). */
export function nationalPriceMWh(
  simTimeMin: number,
  weather: { regime?: string | undefined },
  market: MarketProfile = LONDON_MARKET,
  weatherProfile: WeatherProfile = LONDON_WEATHER,
): number {
  const h = (simTimeMin / 60) % 24;
  const evening = Math.exp(-(((h - 18.5) / 2.4) ** 2));
  const morning = 0.35 * Math.exp(-(((h - 8) / 1.8) ** 2));
  // midday duck-curve dip: a noon-centred bell subtracted from the price
  const solar = Math.exp(-(((h - 12.5) / 2.6) ** 2));
  let p =
    market.baseMWh + market.peakMWh * Math.min(1, evening + morning) - market.middayDipMWh * solar;
  const sf = seasonFactor(simTimeMin, weatherProfile);
  p *= 1 + market.seasonalUplift * sf;
  // hydro drought: the dry half-year (low season factor) backs the rivers
  // up with thermal and the price climbs (Brazil)
  if (market.droughtUplift !== undefined) p *= 1 + market.droughtUplift * (1 - sf);
  if (weather.regime === market.scarcityRegime) p += market.scarcityKickMWh;
  return p;
}

/** nationalPriceMWh in the sim's local-currency/MWh ÷1000 money unit. */
export function nationalPriceK(
  simTimeMin: number,
  weather: { regime?: string | undefined },
  market: MarketProfile = LONDON_MARKET,
  weatherProfile: WeatherProfile = LONDON_WEATHER,
): number {
  return nationalPriceMWh(simTimeMin, weather, market, weatherProfile) / 1000;
}
/** National must-run baseload (W8 Part-2b: GenerationModel.baseloadFloor —
 *  France's nuclear fleet, Brazil's hydro). It sits UNDER the merit order: a
 *  near-zero-marginal, near-zero-carbon block that meets up to `baseloadFloor`
 *  of each island's demand before any player/developer plant stacks, so it
 *  lowers both the marginal price and the carbon average, and — because it eats
 *  the cheap base — pushes firm renewables toward curtailment in surplus (the
 *  French "nuclear crowds out renewables" effect). Modelled as a synthetic
 *  must-run unit injected at a representative island bus; it carries a sentinel
 *  id so it never lands in the per-asset genMW/SoC maps. */
export const BASELOAD_COST_K = 0.01;
/** Baseload carbon, gCO₂/kWh — nuclear/hydro: not literally zero (lifecycle),
 *  but low enough to pull a country's carbon KPI right down. */
export const BASELOAD_CARBON_G = 5;
/** Sentinel asset id for the synthetic national-baseload unit (never a real
 *  asset; filtered out of genMW so the UI never sees a phantom generator). */
export const BASELOAD_UNIT_ID = -1;

/** Deterministic seasonal reservoir availability for a hydro-driven baseload
 *  (GenerationModel.hydroDriven). The rivers fill in the wet season and fall in
 *  the dry one, so the share of the baseload floor hydro can actually float
 *  swings with the season factor (1 = wettest/peak season, 0 = driest). A
 *  thermal/nuclear baseload (hydroDriven false) floats its full floor
 *  year-round ⇒ factor 1, no-op. No RNG — pure function of the clock + profile. */
export function reservoirFactor(
  simTimeMin: number,
  generation: GenerationModel,
  weatherProfile: WeatherProfile,
): number {
  if (generation.hydroDriven !== true) return 1;
  // wet season (high season factor) → full reservoirs; dry season → backed down
  // to 40% of the floor. Bounds keep some hydro always available (run-of-river).
  return 0.4 + 0.6 * seasonFactor(simTimeMin, weatherProfile);
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
  /** Active scenario weather profile (season/sun/regimes). Optional;
   *  defaults to GB so omitting it is bit-identical to the pre-seam
   *  dispatch. */
  weatherProfile?: WeatherProfile;
  /** Active scenario power profile (frequency droop). Optional; defaults
   *  to GB. */
  power?: PowerSystemProfile;
  /** Active scenario national-market shape (price series imports trade
   *  against). Optional; defaults to GB. */
  market?: MarketProfile;
  /** Active scenario generation model (baseloadFloor / hydroDriven). Optional;
   *  defaults to GB's liberalised tender (no baseload floor), so omitting it is
   *  bit-identical to the pre-W8 dispatch. */
  generation?: GenerationModel;
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
  /** Per-electrified-island [loadMW, local frequency Hz] — the HUD's
   *  load-weighted system frequency is the mean of these (market/
   *  frequency.ts). Islands carrying no load do not appear. */
  freqSamples: IslandFreqSample[];
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
  /** #23: this unit's output burns the H₂ store (the hydrogen half of a
   *  converted peaker) — the fill loop drains the tanks as it runs. */
  h2Store?: boolean | undefined;
}

/** Still in planning/construction: on the network, generating nothing. */
export function underConstruction(
  a: { liveAtMin?: number | undefined },
  simTimeMin: number,
): boolean {
  return a.liveAtMin !== undefined && a.liveAtMin > simTimeMin;
}

function availability(a: PlacedAsset & { kind: 'gen' }, inp: DispatchInputs): number {
  // a.mw = awarded land-capped capacity (farm-scaled plant); else catalog
  const capMW = a.mw ?? GENS[a.gen].capacityMW;
  const wp = inp.weatherProfile ?? LONDON_PROFILE.weather;
  switch (a.gen) {
    case 'solarFarm':
      return capMW * sunFactor(inp.simTimeMin, inp.weather, wp);
    case 'windOnshore':
      return capMW * windFactor(inp.weather, false);
    case 'windOffshore':
      return capMW * windFactor(inp.weather, true);
    case 'tidal':
      return capMW * tideFactor(inp.simTimeMin);
    default:
      return capMW;
  }
}

export function runDispatch(
  net: Network,
  assets: Iterable<PlacedAsset>,
  loadOfSub: Map<number, SubLoad>,
  inp: DispatchInputs,
): DispatchResult {
  const assetArr = [...assets];
  const { islandOf } = findIslands(net);
  // H₂ pool (#23): the licence-wide store the converted fleet draws on —
  // per-electrolyser tank levels ride inp.soc like battery SoC. Hydrogen
  // moves by pipeline/tube trailer, not by wire, so the pool is global
  // across electrical islands. Allocated to converted peakers in asset
  // order as MW-for-this-tick; the fill loop drains what actually runs.
  const h2Ids = electrolyserIds(
    assetArr.filter((a) => a.kind === 'gen' && !underConstruction(a, inp.simTimeMin)),
  );
  const h2PoolMWh = h2StoreMWh(inp.soc, h2Ids);
  let h2PoolMW =
    inp.dtMin > 0
      ? (h2PoolMWh * 60) / inp.dtMin
      : h2PoolMWh > 1e-9
        ? Number.POSITIVE_INFINITY // paused re-solve: no drain, assume covered
        : 0;
  const wp = inp.weatherProfile ?? LONDON_PROFILE.weather;
  const pp = inp.power ?? LONDON_PROFILE.power;
  const mk = inp.market ?? LONDON_PROFILE.market;
  const gen = inp.generation ?? LONDON_PROFILE.generation;
  // W8 Part-2b: the must-run national-baseload share (France nuclear / Brazil
  // hydro). 0 for GB (no floor) ⇒ the block below is a no-op and London stays
  // byte-identical. For a hydro-driven fleet the floor is scaled by the
  // deterministic seasonal reservoir factor (dry season floats less).
  const baseloadShare =
    (gen.baseloadFloor ?? 0) > 0
      ? (gen.baseloadFloor ?? 0) * reservoirFactor(inp.simTimeMin, gen, wp)
      : 0;
  // heatwave cooling load lifts the domestic shape (AC/fridges/fans)
  const fDom =
    domesticProfile(inp.simTimeMin, wp) * (1 + coolingFactor(inp.simTimeMin, inp.weather, wp));
  const fProc = processProfile(inp.simTimeMin);
  const fEv = evProfile(inp.simTimeMin, inp.tech.smartEv);
  const fHp = hpProfile(inp.simTimeMin, inp.weather.cloud, wp);
  const fSun = sunFactor(inp.simTimeMin, inp.weather, wp);

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
    /** #23: connected electrolysers — load-side curtailment soaks. */
    electrolysers: Array<{ id: number; bus: number; rateMW: number; capMWh: number }>;
    subs: SubNow[];
  }
  const byIsland = new Map<number, IslandAgg>();
  const agg = (gi: number): IslandAgg => {
    let a = byIsland.get(gi);
    if (!a) {
      a = { units: [], batteries: [], electrolysers: [], subs: [] };
      byIsland.set(gi, a);
    }
    return a;
  };

  let flexCostKPerHour = 0;

  for (const a of assetArr) {
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
      } else if (a.gen === 'electrolyser') {
        // #23: a load, never a unit — it soaks would-be curtailment into
        // its tank (the island block below), and NOTHING when demand is
        // unserved. Its tank level rides inp.soc like a battery's SoC.
        if (!building) {
          agg(gi).electrolysers.push({
            id: a.id,
            bus,
            rateMW: spec.capacityMW,
            capMWh: spec.energyMWh ?? 0,
          });
        }
      } else if (a.gen === 'gasPeaker' && a.h2 === true) {
        // #23: converted peaker — split into an H₂-fired half capped by
        // the pool (carbon 0, fuel at the H₂ offtake price) and a gas
        // half for the remainder. Same asset id on both: the fill loop
        // accumulates genMW, and the H₂ half drains the tanks as it runs.
        const ppaK =
          a.ppaMWh !== undefined
            ? a.ppaMWh / 1000
            : a.developer !== undefined
              ? strikeMWh(a.gen) / 1000
              : undefined;
        const avail = building ? 0 : spec.capacityMW;
        const h2MW = Math.min(avail, h2PoolMW);
        if (Number.isFinite(h2PoolMW)) h2PoolMW -= h2MW;
        const flex = a.flex === true && !building;
        if (h2MW > 0) {
          agg(gi).units.push({
            id: a.id,
            bus,
            availMW: h2MW,
            costK: H2_FUEL_COST_K,
            carbonG: 0,
            mustRun: false,
            flex,
            isBattery: false,
            ppaK,
            h2Store: true,
          });
        }
        agg(gi).units.push({
          id: a.id,
          bus,
          availMW: avail - h2MW,
          costK: spec.marginalCostK,
          carbonG: spec.carbonG,
          mustRun: false,
          flex,
          isBattery: false,
          ppaK,
        });
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
          costK: interconnector
            ? nationalPriceK(inp.simTimeMin, inp.weather, mk, wp)
            : spec.marginalCostK,
          // W8 Part-2b: an interconnector import carries the ACTIVE country's
          // grid carbon (mk.gridCarbonG) — French nuclear ~20 g, AU coal ~445 g,
          // HK gas ~590 g — not the flat catalog figure. GB's gridCarbonG is the
          // same 150 the catalog used, so London stays byte-identical. This
          // feeds dispatch.carbonG → state.carbonEMA → the RIIO carbon KPI.
          carbonG: interconnector ? mk.gridCarbonG : spec.carbonG,
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
      // heatwave robs transformers of cooling margin → derated rating,
      // so a hot-day catchment overloads sooner (cappedNowMW bites earlier)
      const rating = subMva(a) * thermalDerate(inp.simTimeMin, inp.weather, wp);
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
  const freqSamples: IslandFreqSample[] = [];

  const constraintDetail: Array<[number, number, number]> = [];
  const ppaDetail: Array<[number, number, number]> = [];

  const recordCurtailed = (u: Unit, mw: number): void => {
    if (mw <= 0) return;
    // the synthetic national baseload (W8 Part-2b) is not a player/developer
    // asset: it never bills constraint comp and never counts as firm
    // curtailment. It sorts first (highest curtailK) so it is served, not
    // curtailed; this guard is belt-and-braces for the residual<=0 path.
    if (u.id === BASELOAD_UNIT_ID) return;
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

    // W8 Part-2b: the national must-run baseload (France nuclear / Brazil
    // hydro). A near-zero-marginal, near-zero-carbon block sized to
    // `baseloadShare` of this island's residual demand, added to the unit list
    // as a must-run unit so it stacks FIRST (cheapest) — lowering the marginal
    // price + carbon and crowding firm renewables toward curtailment in
    // surplus. Injected at a representative island bus (a sub, else the first
    // unit) so the DC power flow balances; the sentinel id keeps it out of the
    // per-asset genMW/SoC maps. 0 for GB ⇒ skipped, byte-identical.
    if (baseloadShare > 0) {
      const baseBus = island.subs[0]?.bus ?? island.units[0]?.bus;
      const residualDemand = Math.max(0, demand - exportMW);
      const baseMW = baseloadShare * residualDemand;
      if (baseBus !== undefined && baseMW > 0) {
        island.units.push({
          id: BASELOAD_UNIT_ID,
          bus: baseBus,
          availMW: baseMW,
          costK: BASELOAD_COST_K,
          carbonG: BASELOAD_CARBON_G,
          mustRun: true,
          flex: false,
          isBattery: false,
          // sort ahead of every real must-run (highest curtailK = served
          // first, curtailed last): the player's firm renewables are the ones
          // constrained off in a nuclear/hydro surplus, never the baseload.
          curtailK: 999,
        });
      }
    }

    // battery dispatch by policy (ROADMAP #12). 'shave' (the default,
    // and the original self-management): charge on cheap local surplus,
    // otherwise offer discharge into the stack between nuclear and gas.
    // 'arbitrage': trade the national price — charge cheap, discharge
    // dear, the local peak be damned. 'reserve': hold ≥50% SoC and
    // discharge only when the island would otherwise go unserved.
    const natK = nationalPriceK(inp.simTimeMin, inp.weather, mk, wp);
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

    // electrolysers (#23) soak LAST — only the cheap surplus still left
    // after the batteries have taken their fill, i.e. exactly the energy
    // the fill loop would otherwise curtail (or spill as rooftop excess:
    // the soak raises demand before the export-scale step below). Gated
    // on surplus > 0, which guarantees the island's stack fully covers
    // demand — an electrolyser NEVER consumes ahead of unserved load.
    const soaking = new Map<number, number>();
    for (const e of island.electrolysers) {
      const soc = inp.soc.get(e.id) ?? 0;
      const headroomMW =
        inp.dtMin > 0
          ? ((e.capMWh - soc) / ELECTROLYSER_EFFICIENCY) * (60 / inp.dtMin)
          : e.rateMW;
      const take = Math.max(0, Math.min(e.rateMW, headroomMW, surplus));
      if (take <= 0) continue;
      soaking.set(e.id, take);
      demand += take;
      surplus = Math.max(0, cheapMW - demand);
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
        // accumulate: a converted peaker is two units on one asset id (the
        // synthetic baseload is never sized when demand<=0, but skip it for
        // safety so no phantom -1 key leaks into genMW)
        if (u.id !== BASELOAD_UNIT_ID && !genMW.has(u.id)) genMW.set(u.id, 0);
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

    // this energized island's local frequency: a deficit (load it can't
    // meet) drags it below nominal; spare capacity nudges it a touch over.
    // It votes into the HUD's load-weighted system frequency (frequency.ts).
    if (demand > 0) {
      freqSamples.push({ loadMW: demand, hz: islandFrequencyHz(1 - consFrac, pp) });
    }

    let remaining = target;
    for (const u of stack) {
      const mw = Math.min(u.availMW, remaining);
      remaining -= mw;
      // accumulate, not overwrite: a converted peaker (#23) is two units
      // (H₂ half + gas half) carrying the same asset id. The synthetic
      // national baseload (W8 Part-2b) is NOT a real asset, so it never lands
      // in the per-asset genMW map (no phantom generator in the UI) — but it
      // still injects, costs and carbons below like any dispatched unit.
      if (u.id !== BASELOAD_UNIT_ID) genMW.set(u.id, (genMW.get(u.id) ?? 0) + mw);
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
        if (inp.dtMin > 0 && u.h2Store === true) {
          // the H₂ half burns the tanks down as it runs (ascending id)
          drainH2(inp.soc, h2Ids, (mw * inp.dtMin) / 60);
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

    // electrolysers (#23): soaked surplus leaves the wires here and
    // lands in the tanks at the net round-trip efficiency
    for (const [id, mw] of soaking) {
      const e = island.electrolysers.find((x) => x.id === id);
      if (!e) continue;
      genMW.set(id, -mw);
      injections.push({ bus: e.bus, pMW: -mw });
      if (inp.dtMin > 0) {
        inp.soc.set(
          id,
          Math.min(
            e.capMWh,
            (inp.soc.get(id) ?? 0) + (mw * inp.dtMin * ELECTROLYSER_EFFICIENCY) / 60,
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
    freqSamples,
  };
}
