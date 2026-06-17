// Per-scenario power-system profile — the de-GB-ification seam.
//
// The London build hard-coded Great Britain in three deep places: the
// 50 Hz frequency droop (market/frequency.ts), the DUoS/£ bill model
// (regulation/bill.ts) and the temperate winter-peaking weather
// (events/weather.ts). This module lifts those literals into a single
// per-scenario config object so a future city becomes DATA, not an
// engine fork. NOTHING about London's numbers changes: the LONDON_*
// constants below are the exact values that used to live in those three
// files, and every consumer defaults to them, so omitting a profile (or
// running the london scenario) is bit-identical to the pre-seam engine.
//
// This wave wires the SEAM and ships London's defaults only — no new
// city is added here (that is the next wave). The throwaway test
// fixtures in tests/powerProfile.test.ts prove a non-London profile
// (60 Hz / summer-peak) flows through differently, but no such profile
// ships in cityRegistry.

import type { KpiKey } from './regulation/riio';

// ----------------------------------------------------------------------
// 1. Frequency — market/frequency.ts droop literals.

export interface PowerSystemProfile {
  /** System nominal frequency, Hz (50 GB/EU/most, 60 US/Brazil). */
  nominalHz: number;
  /** Under-frequency floor before total collapse / last-stage LFDD —
   *  ≈47.5 in GB (47.0 trips the last stage; we floor a touch above). A
   *  60 Hz system floors proportionally higher (≈57). */
  freqFloorHz: number;
  /** Hz of sag at a 100% supply deficit (the droop slope). GB feel is
   *  1.5 Hz at a full deficit — unchanged for London. */
  droopHz: number;
  /** Transmission kV tiers, EHV→HV (display + future voltageChooser). */
  transmissionKv: number[];
  /** Distribution kV tiers, HV→LV. */
  distributionKv: number[];
}

/** London / GB: the exact literals from the original frequency.ts. */
export const LONDON_POWER: PowerSystemProfile = {
  nominalHz: 50,
  freqFloorHz: 47.5,
  droopHz: 1.5,
  transmissionKv: [400, 275, 132],
  distributionKv: [33, 11, 0.4],
};

// ----------------------------------------------------------------------
// 2. Weather — events/weather.ts season / sun / regime literals.

export type WeatherRegimeId = 'windy-wet' | 'calm-cold' | 'mild' | 'heatwave' | 'storm';

/** Per-regime envelope — mirrors the RegimeSpec that used to be private
 *  to weather.ts. Centres + jitter half-widths for the per-tick walk. */
export interface RegimeSpec {
  wind: number;
  /** Extra wind in the cold half of the year (Atlantic lows run harder). */
  windWinterBoost: number;
  cloud: number;
  windBand: number;
  cloudBand: number;
}

export interface WeatherProfile {
  /** Which half-year peaks. London/Paris = 'winter'; the rest 'summer'. */
  peakSeason: 'winter' | 'summer';
  /** Day-of-year the season cycle peaks toward 1 (mid-Jan = 15 for GB;
   *  the seasonFactor cosine is anchored on this). For a summer-peak city
   *  this is the hottest day (mid-Aug ≈ 227). */
  peakDoy: number;
  /** Sun arc: max day length (h, midsummer) and min (h, midwinter). GB =
   *  16.5 / 8.0 (the 16.5 − 8.5·s arc). */
  dayLenMaxH: number;
  dayLenMinH: number;
  /** Noon-sun amplitude knock-down at the dark end of the year: amp =
   *  1 − ampWinterDrop·s. GB = 0.45 (a low weak winter sun). */
  ampWinterDrop: number;
  /** Regime envelopes; defaults reproduce the GB Atlantic set exactly. */
  regimes: Record<WeatherRegimeId, RegimeSpec>;
}

/** London / GB: the exact literals from the original weather.ts. */
export const LONDON_WEATHER: WeatherProfile = {
  peakSeason: 'winter',
  peakDoy: 15,
  dayLenMaxH: 16.5,
  dayLenMinH: 8.0,
  ampWinterDrop: 0.45,
  regimes: {
    'windy-wet': { wind: 0.66, windWinterBoost: 0.12, cloud: 0.85, windBand: 0.15, cloudBand: 0.12 },
    storm: { wind: 0.92, windWinterBoost: 0.06, cloud: 0.95, windBand: 0.06, cloudBand: 0.05 },
    'calm-cold': { wind: 0.1, windWinterBoost: 0, cloud: 0.55, windBand: 0.08, cloudBand: 0.2 },
    mild: { wind: 0.45, windWinterBoost: 0.05, cloud: 0.4, windBand: 0.15, cloudBand: 0.2 },
    heatwave: { wind: 0.18, windWinterBoost: 0, cloud: 0.06, windBand: 0.08, cloudBand: 0.06 },
  },
};

// ----------------------------------------------------------------------
// 3. Bill / economy + generation ownership — regulation/bill.ts literals.

export interface EconomyProfile {
  /** Currency symbol + ISO for the bill HUD ("£"/GBP). Cosmetic. */
  symbol: string;
  iso: string;
  /** FX to normalise a cross-city leaderboard (1 for GBP). */
  toGbp: number;
  /** Domestic share of the NETWORK pot (DUoS) — GB 0.32. */
  domesticNetworkShare: number;
  /** Domestic share of the ENERGY pot — GB 0.4. */
  domesticEnergyShare: number;
  /** Retail uplift on the wholesale energy line (policy/balancing/supplier
   *  slice) — GB 3.0. */
  retailUplift: number;
  /** Supplier standing charge, currency/household/yr — GB 150. */
  supplyFixedYr: number;
}

/** London / GB: the exact literals from the original bill.ts. */
export const LONDON_ECONOMY: EconomyProfile = {
  symbol: '£',
  iso: 'GBP',
  toGbp: 1,
  domesticNetworkShare: 0.32,
  domesticEnergyShare: 0.4,
  retailUplift: 3.0,
  supplyFixedYr: 150,
};

export interface GenerationModel {
  /** 'tender' = liberalised developer market (London et al.: gen capex
   *  rides a PPA strike on the energy line, never DUoS).
   *  'owned' = vertically integrated (HK/Shanghai/Cairo/Dubai): there is
   *  no PPA — the operator builds plant directly and its annuitized capex
   *  lands in the NETWORK pot with the wires. The single biggest fork; the
   *  bill seam leaves the documented hook, but only 'tender' (London's
   *  liberalised default) is wired this wave. */
  ownership: 'tender' | 'owned';
  /** Hydro-reservoir-driven dispatch (Rio) — future. */
  hydroDriven?: boolean;
  /** Must-run baseload fraction (Paris nuclear) — future. */
  baseloadFloor?: number;
}

/** London / GB: liberalised tender market — today's behaviour. */
export const LONDON_GENERATION: GenerationModel = { ownership: 'tender' };

// ----------------------------------------------------------------------
// 3b. National wholesale market — the price series the player's network
// imports at, benchmarks battery arbitrage against, and quotes on the live
// ticker (market/dispatch.ts nationalPriceMWh). Each country sits in a
// differently-shaped market: GB's evening-peak Atlantic system, France's
// flat nuclear floor, Australia's rooftop-PV duck curve (negative midday,
// extreme heatwave peaks), Brazil's hydro market under drought (the
// bandeira flags), Hong Kong's stable vertically-integrated gas cost. The
// shape is profile DATA so a city becomes data, not an engine fork.

export interface MarketProfile {
  /** Cheap-night wholesale floor, currency/MWh in the local money. */
  baseMWh: number;
  /** Evening-peak adder over the diurnal demand shape (0..1). */
  peakMWh: number;
  /** Midday solar trough subtracted at noon — the duck-curve depth. 0 for
   *  a system without heavy distributed PV; large enough in Australia to
   *  push the midday price negative. */
  middayDipMWh: number;
  /** Seasonal price uplift: price ×(1 + seasonalUplift·seasonFactor), so a
   *  winter-peak system (GB/France heating) dears in winter and a
   *  summer-peak one (Australia/HK aircon) dears in summer — the sign is
   *  carried by the weather profile's peakSeason. */
  seasonalUplift: number;
  /** Which weather regime triggers the scarcity kicker (GB dunkelflaute =
   *  calm-cold; a hot-grid system spikes in the heatwave). */
  scarcityRegime: WeatherRegimeId;
  /** Price adder, currency/MWh, while the scarcity regime sits overhead. */
  scarcityKickMWh: number;
  /** Hydro-drought uplift (Brazil): in the dry half-year the reservoirs
   *  fall and thermal must run, so price ×(1 + droughtUplift·dryness).
   *  Absent for non-hydro systems. */
  droughtUplift?: number;
  /** Grid / import carbon intensity, gCO₂/kWh — what an interconnector
   *  import and the national benchmark carry (consumed by a later carbon
   *  wave; shipped as data now so the four profiles are complete). */
  gridCarbonG: number;
}

/** London / GB: reproduces the exact prior nationalPriceMWh literals
 *  (45 floor + 95 evening-peak adder, ×(1+0.3·winterness), +60 calm-cold
 *  dunkelflaute) — middayDip 0 and no drought, so the series is
 *  bit-identical to the pre-seam dispatch. */
export const LONDON_MARKET: MarketProfile = {
  baseMWh: 45,
  peakMWh: 95,
  middayDipMWh: 0,
  seasonalUplift: 0.3,
  scarcityRegime: 'calm-cold',
  scarcityKickMWh: 60,
  gridCarbonG: 230,
};

/** France: a deep nuclear floor — low and flat, with a winter electric-
 *  heating spike (France's grid is famously thermosensitive). Near-zero
 *  carbon. */
export const FRANCE_MARKET: MarketProfile = {
  baseMWh: 38,
  peakMWh: 34,
  middayDipMWh: 6,
  seasonalUplift: 0.22,
  scarcityRegime: 'calm-cold',
  scarcityKickMWh: 55,
  gridCarbonG: 20,
};

/** Australia (NEM, Sydney): the rooftop-PV duck curve — a deep midday
 *  trough that runs the price negative when the sun floods the grid, and
 *  violent heatwave evening peaks. Coal-heavy grid, summer-peaking. */
export const AUSTRALIA_MARKET: MarketProfile = {
  baseMWh: 42,
  peakMWh: 120,
  middayDipMWh: 115,
  seasonalUplift: 0.35,
  scarcityRegime: 'heatwave',
  scarcityKickMWh: 160,
  gridCarbonG: 445,
};

/** Hong Kong: a vertically-integrated, regulated gas system — a stable,
 *  high price with a modest summer-aircon swing and little volatility.
 *  High carbon (≈69% gas). */
export const HONGKONG_MARKET: MarketProfile = {
  baseMWh: 72,
  peakMWh: 42,
  middayDipMWh: 8,
  seasonalUplift: 0.2,
  scarcityRegime: 'heatwave',
  scarcityKickMWh: 45,
  gridCarbonG: 590,
};

/** Brazil (Rio): a hydro-dominated market — cheap and clean when the
 *  reservoirs are full, but a sharp dry-season uplift as thermal backs up
 *  the rivers (the bandeira flags). Low carbon, 60 Hz system. */
export const BRAZIL_MARKET: MarketProfile = {
  baseMWh: 48,
  peakMWh: 66,
  middayDipMWh: 28,
  seasonalUplift: 0.12,
  scarcityRegime: 'heatwave',
  scarcityKickMWh: 40,
  droughtUplift: 0.6,
  gridCarbonG: 110,
};

// ----------------------------------------------------------------------
// 4. Regulator framing — riio.ts hook (display + KPI-weight overrides).

export interface RegulatorProfile {
  /** Display name for chrome ("Ofgem"). */
  name: string;
  /** 'riio' liberalised price-control | 'profit-cap' SoC/DEWA |
   *  'cost-of-service' state grid. Selects report-card framing. Only
   *  'riio' (London) is wired this wave; the others are a documented hook. */
  model: 'riio' | 'profit-cap' | 'cost-of-service';
  /** Per-KPI weight overrides; absent ⇒ riio.ts WEIGHTS unchanged. */
  kpiWeights?: Partial<Record<KpiKey, number>>;
}

export const LONDON_REGULATOR: RegulatorProfile = { name: 'Ofgem', model: 'riio' };

/** France — CRE / TURPE cost-of-service. Carbon already sits near zero on
 *  the nuclear fleet, so the regulator's attention is on bills and service
 *  (carbon weight pared right back, redistributed to affordability +
 *  reliability). */
export const FRANCE_REGULATOR: RegulatorProfile = {
  name: 'CRE',
  model: 'cost-of-service',
  kpiWeights: { carbon: 0.05, bill: 0.3, satisfaction: 0.22, ci: 0.16, cml: 0.15 },
};

/** Australia — AER revenue-cap building block. Affordability is the live
 *  political wire, and the rooftop-PV flood makes firm-curtailment / hosting
 *  headroom and the carbon transition matter more than raw interruptions. */
export const AUSTRALIA_REGULATOR: RegulatorProfile = {
  name: 'AER',
  model: 'riio',
  kpiWeights: { bill: 0.28, carbon: 0.18, curtailedFirm: 0.16, satisfaction: 0.18, ci: 0.1, cml: 0.1 },
};

/** Hong Kong — Scheme of Control, 8% permitted return on net fixed assets.
 *  World-best reliability is the headline the SoC is judged on, so CI/CML
 *  dominate the card; carbon and curtailment matter least. */
export const HONGKONG_REGULATOR: RegulatorProfile = {
  name: 'Scheme of Control',
  model: 'profit-cap',
  kpiWeights: { ci: 0.26, cml: 0.26, satisfaction: 0.2, bill: 0.14, carbon: 0.09, curtailedFirm: 0.05 },
};

/** Brazil — ANEEL concession review. DEC/FEC reliability and affordability
 *  carry the card (carbon is already low on the hydro fleet). */
export const BRAZIL_REGULATOR: RegulatorProfile = {
  name: 'ANEEL',
  model: 'cost-of-service',
  kpiWeights: { ci: 0.23, cml: 0.23, bill: 0.22, satisfaction: 0.16, carbon: 0.08, curtailedFirm: 0.08 },
};

// ----------------------------------------------------------------------
// 4b. Per-country power / weather / economy / generation blocks.
//
// The MarketProfiles + RegulatorProfiles above were shipped (and tested) a
// wave earlier but never attached to a city. This block adds the remaining
// four sub-profiles so each near-term country has a COMPLETE ResolvedProfile,
// then COUNTRY_PROFILES (§4c) bundles them and cityRegistry's resolveProfile
// attaches a country to its city. Every figure is the baked research from the
// sibling docs/operating-models/<country>.md "Suggested profile values" block
// (no new egress). London is untouched — it keeps LONDON_* and stays the
// determinism anchor.

// --- France (Paris) — 50 Hz, near-zero-carbon nuclear, € cost-of-service. ---
/** RTE/Enedis voltages: 400/225/90 kV transmission, 20 kV HTA / 400 V BT. The
 *  frequency droop matches GB (both 50 Hz, similar synchronous feel). */
export const FRANCE_POWER: PowerSystemProfile = {
  nominalHz: 50,
  freqFloorHz: 47.5,
  droopHz: 1.5,
  transmissionKv: [400, 225, 90],
  distributionKv: [20, 0.4],
};
/** France is winter-peaking like GB, but more SHARPLY so — the country heats
 *  with resistive electric heating (~+2.4 GW/°C, RTE), so the cold half-year
 *  bites harder. Modelled as a deeper winter sun knock-down; the cold
 *  'calm-cold' regime stays the scarcity trigger (a cold snap, not a wind
 *  drought, is the French stress event — carried by FRANCE_MARKET).
 *  TODO(WP2 Phase-D): a dedicated cold-demand coefficient (thermosensitivity)
 *  belongs in events/weather demand shaping — for now the season model and the
 *  market scarcity kicker carry the winter weight. */
export const FRANCE_WEATHER: WeatherProfile = {
  peakSeason: 'winter',
  peakDoy: 15,
  dayLenMaxH: 16.0,
  dayLenMinH: 8.5,
  ampWinterDrop: 0.5,
  regimes: LONDON_WEATHER.regimes,
};
/** € / EUR; cost-of-service TURPE network pot, low-carbon cheap-ish energy. */
export const FRANCE_ECONOMY: EconomyProfile = {
  symbol: '€',
  iso: 'EUR',
  toGbp: 0.85,
  domesticNetworkShare: 0.3,
  domesticEnergyShare: 0.42,
  retailUplift: 2.6,
  supplyFixedYr: 140,
};
/** Liberalised tender for renewables/gas/battery — but they bid into a system
 *  floored by must-run nuclear. `baseloadFloor` is shipped as DATA here;
 *  dispatch does not yet consume it, so France's flat/low feel currently comes
 *  from FRANCE_MARKET alone.
 *  TODO(WP2 Phase-D): wire `baseloadFloor` into market/dispatch.ts (a must-run,
 *  ~zero-marginal, ~zero-carbon baseload fraction that curtails firm renewables
 *  in surplus). */
export const FRANCE_GENERATION: GenerationModel = { ownership: 'tender', baseloadFloor: 0.6 };

// --- Australia (Sydney) — 50 Hz, summer-peaking rooftop-PV duck curve, A$. --
/** NEM voltages: 500/330/132 kV transmission, 66/11 kV distribution. */
export const AUSTRALIA_POWER: PowerSystemProfile = {
  nominalHz: 50,
  freqFloorHz: 47.5,
  droopHz: 1.5,
  transmissionKv: [500, 330, 132],
  distributionKv: [66, 11, 0.4],
};
/** Sydney is SUMMER-peaking (air-con + bushfire season, Dec–Feb) — the inverse
 *  of GB. Southern-hemisphere midsummer ≈ early January, so peakDoy ≈ 1 (the
 *  hottest part of the year); the long bright summer days deepen the duck curve
 *  AUSTRALIA_MARKET already carries. The hot-dry 'heatwave' regime is the
 *  stress event (it triggers AUSTRALIA_MARKET's scarcity kicker). */
export const AUSTRALIA_WEATHER: WeatherProfile = {
  peakSeason: 'summer',
  peakDoy: 1,
  dayLenMaxH: 14.5,
  dayLenMinH: 9.8,
  ampWinterDrop: 0.25,
  regimes: LONDON_WEATHER.regimes,
};
/** A$ / AUD; liberalised, unbundled (network pot + energy pot like GB). */
export const AUSTRALIA_ECONOMY: EconomyProfile = {
  symbol: 'A$',
  iso: 'AUD',
  toGbp: 0.52,
  domesticNetworkShare: 0.4,
  domesticEnergyShare: 0.4,
  retailUplift: 2.8,
  supplyFixedYr: 200,
};
/** Merchant tender market — bids skew solar/battery in reality.
 *  TODO(WP2 Phase-E): skew the developer roster/appetite (gentailers + solar/
 *  battery funds) in events/developers.ts. */
export const AUSTRALIA_GENERATION: GenerationModel = { ownership: 'tender' };

// --- Hong Kong — 50 Hz, summer typhoon season, HK$, Scheme-of-Control. ------
/** HKE/CLP voltages: 400/132 kV transmission, 33/11 kV distribution. */
export const HONGKONG_POWER: PowerSystemProfile = {
  nominalHz: 50,
  freqFloorHz: 47.5,
  droopHz: 1.5,
  transmissionKv: [400, 132],
  distributionKv: [33, 11, 0.38],
};
/** Subtropical, summer-peaking (humid aircon heat), with the typhoon storm
 *  season over the warm half-year. Northern hemisphere near the Tropic of
 *  Cancer — midsummer ≈ late June (peakDoy ≈ 200, a normal NH summer peak);
 *  a short seasonal day-length swing. */
export const HONGKONG_WEATHER: WeatherProfile = {
  peakSeason: 'summer',
  peakDoy: 200,
  dayLenMaxH: 13.4,
  dayLenMinH: 10.6,
  ampWinterDrop: 0.2,
  regimes: LONDON_WEATHER.regimes,
};
/** HK$ / HKD; a single bundled regulated tariff (vertically integrated). The
 *  network/energy split is retained at GB-like shares for Phase-A so the bill
 *  still computes sensibly while `ownership` stays 'tender'; once the `owned`
 *  fork lands (Phase-C) gen capex moves into the network pot and the split
 *  collapses to one bundled tariff. */
export const HONGKONG_ECONOMY: EconomyProfile = {
  symbol: 'HK$',
  iso: 'HKD',
  toGbp: 0.1,
  domesticNetworkShare: 0.35,
  domesticEnergyShare: 0.4,
  retailUplift: 2.4,
  supplyFixedYr: 120,
};
/** ⚠ The big fork: Hong Kong is VERTICALLY INTEGRATED ('owned' — no tender, no
 *  PPA; the operator builds plant and earns the 8% SoC return on it). The bill
 *  engine already routes owned capex into the network pot, but the tender
 *  machinery (events/developers.ts) and a build-generation command path are not
 *  yet branched, so activating 'owned' now would leave HK with no way to add
 *  generation. Phase-A therefore ships HK on 'tender' (its market/regulator/
 *  weather/economy already make it play distinctly) and DEFERS the fork.
 *  TODO(WP2 Phase-C): flip to { ownership: 'owned' }, skip stepTenders, and add
 *  the build-a-power-station command (docs/operating-models/DESIGN.md §3.4). */
export const HONGKONG_GENERATION: GenerationModel = { ownership: 'tender' };

// --- Brazil (Rio) — 60 Hz, hydro + drought, R$. NO city wires this yet (no ---
// rio scenario in CITY_SCENARIOS); shipped for COUNTRY_PROFILES completeness so
// the table is whole and a future `rio` city is one tag away.
/** ONS voltages: 500/345/230 kV transmission, 34.5/13.8 kV distribution. 60 Hz. */
export const BRAZIL_POWER: PowerSystemProfile = {
  nominalHz: 60,
  freqFloorHz: 57,
  droopHz: 1.8,
  transmissionKv: [500, 345, 230],
  distributionKv: [34.5, 13.8, 0.38],
};
/** Rio is summer-peaking (SH; the wet summer is also flood/landslide season),
 *  with a dry austral-winter half-year that drives BRAZIL_MARKET's drought
 *  uplift. SH midsummer ≈ early January (peakDoy ≈ 1); a small tropical day
 *  swing. */
export const BRAZIL_WEATHER: WeatherProfile = {
  peakSeason: 'summer',
  peakDoy: 1,
  dayLenMaxH: 13.5,
  dayLenMinH: 10.5,
  ampWinterDrop: 0.2,
  regimes: LONDON_WEATHER.regimes,
};
/** R$ / BRL; liberalised distribution under ANEEL cost-of-service. */
export const BRAZIL_ECONOMY: EconomyProfile = {
  symbol: 'R$',
  iso: 'BRL',
  toGbp: 0.16,
  domesticNetworkShare: 0.35,
  domesticEnergyShare: 0.4,
  retailUplift: 3.0,
  supplyFixedYr: 90,
};
/** Tender market over a hydro fleet whose reservoir swings with the season.
 *  `hydroDriven` is shipped as DATA; dispatch does not yet consume it (the
 *  drought price effect comes from BRAZIL_MARKET.droughtUplift, already wired).
 *  TODO(WP2 Phase-D): a reservoir state in dispatch + the bandeira flag on the
 *  bill HUD. TODO(WP2 Phase-F): non-technical losses (theft). */
export const BRAZIL_GENERATION: GenerationModel = { ownership: 'tender', hydroDriven: true };

// ----------------------------------------------------------------------
// 5. The resolved profile carried on SimContext.

/** The fully-resolved active profile threaded through the sim. Every sub
 *  block is non-optional here (defaults already applied) so the consumers
 *  never branch on undefined. */
export interface ResolvedProfile {
  power: PowerSystemProfile;
  weather: WeatherProfile;
  economy: EconomyProfile;
  generation: GenerationModel;
  regulator: RegulatorProfile;
  market: MarketProfile;
}

/** The default active profile — London/GB, the exact pre-seam engine. */
export const LONDON_PROFILE: ResolvedProfile = {
  power: LONDON_POWER,
  weather: LONDON_WEATHER,
  economy: LONDON_ECONOMY,
  generation: LONDON_GENERATION,
  regulator: LONDON_REGULATOR,
  market: LONDON_MARKET,
};

// ----------------------------------------------------------------------
// 4c. COUNTRY_PROFILES — the city → operating-model lookup (WP2).
//
// Many cities share a country (London + NE England are both GB), so the six
// sub-blocks are factored once per COUNTRY and a scenario references its country
// (cityRegistry.ts: CityScenario.country). resolveProfile takes the country
// profile as the base and lets a city still override any single block (e.g. a
// city localising its peakDoy). GB === LONDON_PROFILE, so a GB city (or no
// country tag at all) is bit-identical to the pre-WP2 engine — the determinism
// anchor. See docs/operating-models/DESIGN.md §2.

/** ISO-3166-ish country tag for the operating-model table. Only the countries
 *  with a COMPLETE, committed profile are listed; cities for other countries
 *  resolve to GB until their profile lands (a deliberate, documented default
 *  — they are still fully playable, just GB-flavoured). */
export type CountryId = 'GB' | 'FR' | 'AU' | 'HK' | 'BR';

/** Each country's fully-resolved operating model. GB is LONDON_PROFILE. The
 *  rest assemble the shipped market+regulator with the §4b power/weather/
 *  economy/generation blocks. Brazil is included for completeness (no `rio`
 *  scenario references it yet — see §4b). */
export const COUNTRY_PROFILES: Record<CountryId, ResolvedProfile> = {
  GB: LONDON_PROFILE,
  FR: {
    power: FRANCE_POWER,
    weather: FRANCE_WEATHER,
    economy: FRANCE_ECONOMY,
    generation: FRANCE_GENERATION,
    regulator: FRANCE_REGULATOR,
    market: FRANCE_MARKET,
  },
  AU: {
    power: AUSTRALIA_POWER,
    weather: AUSTRALIA_WEATHER,
    economy: AUSTRALIA_ECONOMY,
    generation: AUSTRALIA_GENERATION,
    regulator: AUSTRALIA_REGULATOR,
    market: AUSTRALIA_MARKET,
  },
  HK: {
    power: HONGKONG_POWER,
    weather: HONGKONG_WEATHER,
    economy: HONGKONG_ECONOMY,
    generation: HONGKONG_GENERATION,
    regulator: HONGKONG_REGULATOR,
    market: HONGKONG_MARKET,
  },
  BR: {
    power: BRAZIL_POWER,
    weather: BRAZIL_WEATHER,
    economy: BRAZIL_ECONOMY,
    generation: BRAZIL_GENERATION,
    regulator: BRAZIL_REGULATOR,
    market: BRAZIL_MARKET,
  },
};

/** The resolved operating model for a country tag (defaults to GB). */
export function countryProfile(country: CountryId | undefined): ResolvedProfile {
  return country ? COUNTRY_PROFILES[country] : LONDON_PROFILE;
}
