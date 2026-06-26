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

import type { GenType } from './catalog';
import type { KpiKey, RegulatorFraming, RegulatorModel } from './regulation/riio';

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
  /** Hydro-reservoir-driven dispatch (Rio). W8 Part-2b: consumed by
   *  market/dispatch.ts — swings the must-run baseload's available share with
   *  a deterministic seasonal reservoir factor (dry season backs the rivers
   *  down). Only meaningful alongside a baseloadFloor. */
  hydroDriven?: boolean;
  /** Must-run baseload fraction (Paris nuclear). W8 Part-2b: consumed by
   *  market/dispatch.ts — a zero-marginal, near-zero-carbon baseload meets up
   *  to this share of each island's demand ahead of the merit order, lowering
   *  price + carbon and curtailing firm renewables in surplus. */
  baseloadFloor?: number;
  /** Per-technology BID-APPETITE multiplier for the developer/tender market
   *  (W8 Part-2b). Multiplied into each developer's appetite in
   *  events/developers.ts so a country's tender FLOW skews to its real mix:
   *  France's nuclear floor dampens the renewable rush, Australia skews
   *  solar+battery, Hong Kong (no real tender — the 'owned' fork is deferred)
   *  is biased right down. Absent / missing key ⇒ ×1 (GB is unbiased and
   *  byte-identical). */
  tenderBias?: Partial<Record<GenType, number>>;
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
   *  import carries (W8 Part-2b: now consumed by market/dispatch.ts, which
   *  stamps this on the interconnector unit instead of the flat catalog
   *  figure, so the import-carbon flows into the dispatch-weighted carbon
   *  KPI / RIIO carbon score). France's near-zero nuclear import reads ~20 g,
   *  Australia's coal grid ~445 g, Hong Kong's gas ~590 g; GB's mixed
   *  interconnector tie ~150 g (the value London's import already carried,
   *  so wiring it leaves London byte-identical). */
  gridCarbonG: number;
}

/** London / GB: reproduces the exact prior nationalPriceMWh literals
 *  (45 floor + 95 evening-peak adder, ×(1+0.3·winterness), +60 calm-cold
 *  dunkelflaute) — middayDip 0 and no drought, so the series is
 *  bit-identical to the pre-seam dispatch. gridCarbonG is 150 g — the exact
 *  figure GB's interconnector import already carried in the catalog (French
 *  nuclear blended with NL/BE gas), so wiring gridCarbonG into dispatch
 *  (W8 Part-2b) leaves London's import-carbon byte-identical. */
export const LONDON_MARKET: MarketProfile = {
  baseMWh: 45,
  peakMWh: 95,
  middayDipMWh: 0,
  seasonalUplift: 0.3,
  scarcityRegime: 'calm-cold',
  scarcityKickMWh: 60,
  gridCarbonG: 150,
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
  /** Display name for chrome — the body that actually governs the DISTRIBUTION
   *  operator a player runs ("Ofgem", "BNetzA", "NYPSC", "MERC"). */
  name: string;
  /** 'riio' liberalised incentive/revenue-cap | 'profit-cap' SoC/permitted-
   *  return | 'cost-of-service' rate-base/ARR. Selects the DEFAULT report-card
   *  framing family; `framing` below overrides any individual string so each
   *  country speaks its own regulatory language. The per-KPI scoring difference
   *  is carried separately by kpiWeights + resolveWeights. */
  model: RegulatorModel;
  /** Per-KPI weight overrides; absent ⇒ riio.ts WEIGHTS unchanged. */
  kpiWeights?: Partial<Record<KpiKey, number>>;
  /** Per-country framing overrides applied on top of the model's defaults
   *  (riio.ts resolveFraming). This is what stops GB terms (RIIO/Ofgem/DUoS/
   *  CI/CML) leaking into a non-GB city: each country names its own scheme,
   *  gloss, reliability metric, network charge, etc. Absent ⇒ the model's
   *  defaults (GB ships none, so London is byte-identical). */
  framing?: Partial<RegulatorFraming>;
}

/** GB / Ofgem — RIIO-ED2. The determinism anchor; ships no framing override,
 *  so it reads in the exact RIIO/Ofgem/DUoS/CI-CML language as before, now
 *  with the spelled-out RIIO gloss the model carries (owner req #4). */
export const LONDON_REGULATOR: RegulatorProfile = { name: 'Ofgem', model: 'riio' };

/** France — CRE / TURPE cost-of-service. Carbon already sits near zero on
 *  the nuclear fleet, so the regulator's attention is on bills and service
 *  (carbon weight pared right back, redistributed to affordability +
 *  reliability). */
export const FRANCE_REGULATOR: RegulatorProfile = {
  name: 'CRE',
  model: 'cost-of-service',
  kpiWeights: { carbon: 0.05, bill: 0.3, satisfaction: 0.22, ci: 0.16, cml: 0.15 },
  framing: {
    scheme: 'TURPE',
    schemeGloss:
      "TURPE — the CRE's distribution tariff: prudently-incurred network costs are recovered over a multi-year period, with affordability and quality of supply at the fore.",
    review: 'tariff review',
    blurb:
      "The CRE's TURPE tariff: a cost-of-service network charge over a near-zero-carbon nuclear grid, judged on affordability and continuity of supply.",
    reliabilityMetric: 'critère B (SAIDI)',
    ciLabel: 'interruptions /100 cust/yr',
    cmlLabel: 'critère B min/cust/yr',
    networkChargeLabel: 'network tariff (TURPE)',
  },
};

/** Australia — AER revenue-cap building block. Affordability is the live
 *  political wire, and the rooftop-PV flood makes firm-curtailment / hosting
 *  headroom and the carbon transition matter more than raw interruptions. */
export const AUSTRALIA_REGULATOR: RegulatorProfile = {
  name: 'AER',
  model: 'riio',
  kpiWeights: { bill: 0.28, carbon: 0.18, curtailedFirm: 0.16, satisfaction: 0.18, ci: 0.1, cml: 0.1 },
  framing: {
    scheme: 'revenue cap',
    schemeGloss:
      "AER revenue cap — a building-block determination: allowed revenue = return on the RAB + depreciation + opex, with a Service Target Performance Incentive Scheme (STPIS) on reliability.",
    review: 'revenue determination',
    blurb:
      "The AER's revenue-cap determination: a building-block allowance over a rooftop-PV-flooded grid, leaning on affordability and hosting headroom.",
    reliabilityMetric: 'SAIDI / SAIFI',
    ciLabel: 'SAIFI /100 cust/yr',
    cmlLabel: 'SAIDI min/cust/yr',
    networkChargeLabel: 'distribution network charge',
    constraintLabel: 'curtailment compensation',
    returnHint: 'allowed return on the RAB',
    safetyBody: 'the work-safety regulator',
  },
};

/** Hong Kong — Scheme of Control, ~8% permitted return on net fixed assets,
 *  overseen by EMSD / the Environment Bureau. World-best reliability is the
 *  headline the SoC is judged on, so reliability dominates the card; carbon
 *  and curtailment matter least. */
export const HONGKONG_REGULATOR: RegulatorProfile = {
  name: 'EMSD',
  model: 'profit-cap',
  kpiWeights: { ci: 0.26, cml: 0.26, satisfaction: 0.2, bill: 0.14, carbon: 0.09, curtailedFirm: 0.05 },
  framing: {
    scheme: 'Scheme of Control',
    schemeGloss:
      "Scheme of Control — the government's agreement with the vertically-integrated utility: a permitted return on net fixed assets (~8%), in exchange for among the world's most reliable supply.",
    blurb:
      'A Scheme-of-Control settlement overseen by EMSD: a permitted return on net fixed assets, judged above all on world-class reliability (supply unavailability of minutes per year).',
  },
};

/** Brazil — ANEEL concession review. DEC/FEC reliability and affordability
 *  carry the card (carbon is already low on the hydro fleet). */
export const BRAZIL_REGULATOR: RegulatorProfile = {
  name: 'ANEEL',
  model: 'cost-of-service',
  kpiWeights: { ci: 0.23, cml: 0.23, bill: 0.22, satisfaction: 0.16, carbon: 0.08, curtailedFirm: 0.08 },
  framing: {
    scheme: 'revisão tarifária',
    schemeGloss:
      "ANEEL concession review — a periodic tariff revision (revisão tarifária periódica) on the regulatory asset base, with DEC/FEC continuity limits per concession.",
    review: 'tariff revision',
    blurb:
      "ANEEL's concession review: a tariff revision over a hydro-dominated grid, judged on DEC/FEC continuity and affordability.",
    reliabilityMetric: 'DEC / FEC',
    ciLabel: 'FEC /cust/yr',
    cmlLabel: 'DEC hours/cust/yr',
    networkChargeLabel: 'distribution tariff (TUSD)',
  },
};

/** Germany — Bundesnetzagentur (BNetzA), incentive regulation under the
 *  Anreizregulierungsverordnung (ARegV). A revenue cap with an efficiency
 *  benchmark and a quality element (Qualitätselement) tying SAIDI to revenue.
 *  The Energiewende — rooftop solar, heat pumps, EVs, grid expansion — drives
 *  the card: carbon + hosting headroom + affordability lead. */
export const GERMANY_REGULATOR: RegulatorProfile = {
  name: 'BNetzA',
  model: 'riio',
  kpiWeights: { carbon: 0.2, curtailedFirm: 0.15, bill: 0.22, satisfaction: 0.16, ci: 0.14, cml: 0.13 },
  framing: {
    scheme: 'Anreizregulierung',
    schemeGloss:
      "Anreizregulierung — BNetzA's incentive regulation (ARegV): a revenue cap with an efficiency benchmark — beat the frontier and keep the gain — and a quality element (Q-element) tying your SAIDI to your revenue.",
    review: 'efficiency review',
    blurb:
      "BNetzA's Anreizregulierung: a revenue cap with an efficiency benchmark and a quality element, over an Energiewende grid swelling with rooftop solar, heat pumps and EVs.",
    reliabilityMetric: 'SAIDI / SAIFI',
    ciLabel: 'SAIFI /100 cust/yr',
    cmlLabel: 'SAIDI min/cust/yr',
    networkChargeLabel: 'network charges (Netzentgelte)',
    constraintLabel: 'redispatch / curtailment cost',
    returnHint: 'efficiency revenue cap',
    safetyBody: 'the trade-safety authority',
  },
};

/** USA (New York) — the New York Public Service Commission (NYPSC) regulates
 *  Con Edison's distribution; FERC governs wholesale/transmission and NYISO
 *  runs the bulk grid. Cost-of-service rate-of-return: a rate case sets the
 *  rate base × allowed ROE, framed by NY's Reforming the Energy Vision (REV)
 *  performance-based regulation and the CLCPA 2050 net-zero mandate. */
export const USA_REGULATOR: RegulatorProfile = {
  name: 'NYPSC',
  model: 'cost-of-service',
  kpiWeights: { bill: 0.26, ci: 0.16, cml: 0.16, carbon: 0.16, satisfaction: 0.18, curtailedFirm: 0.08 },
  framing: {
    scheme: 'rate case',
    schemeGloss:
      "Rate case — the NYPSC sets your revenue as rate base × allowed return on equity plus costs, with performance metrics (Reforming the Energy Vision) and the CLCPA 2050 net-zero target overhead.",
    review: 'rate case',
    blurb:
      "A NYPSC rate case: cost-of-service revenue on your rate base, with storm-hardening, affordability and the CLCPA clean-energy mandate front of mind.",
    reliabilityMetric: 'SAIDI / SAIFI / CAIDI',
    ciLabel: 'SAIFI /100 cust/yr',
    cmlLabel: 'SAIDI min/cust/yr',
    networkChargeLabel: 'delivery charge',
    constraintLabel: 'curtailment compensation',
    returnHint: 'allowed return on rate base',
    safetyBody: 'OSHA',
  },
};

/** India (Pune, Maharashtra) — the Maharashtra Electricity Regulatory
 *  Commission (MERC) sets MSEDCL's tariffs under the Multi-Year Tariff (MYT)
 *  framework (CERC is the central regulator). A cost-plus Annual Revenue
 *  Requirement, with the defining Indian metric — AT&C losses (theft +
 *  technical) — and reliability/electrification driving the order. */
export const INDIA_REGULATOR: RegulatorProfile = {
  name: 'MERC',
  model: 'cost-of-service',
  kpiWeights: { bill: 0.26, ci: 0.2, cml: 0.2, satisfaction: 0.16, carbon: 0.1, curtailedFirm: 0.08 },
  framing: {
    scheme: 'Multi-Year Tariff',
    schemeGloss:
      "Multi-Year Tariff (MYT) — MERC approves your Annual Revenue Requirement over a multi-year control period; affordability, reliability and cutting AT&C (aggregate technical & commercial) losses drive the order.",
    review: 'tariff order',
    blurb:
      "MERC's Multi-Year Tariff order: a cost-plus Annual Revenue Requirement over a fast-growing grid, judged on affordability, reliability and AT&C loss reduction.",
    reliabilityMetric: 'SAIDI / SAIFI · AT&C losses',
    ciLabel: 'SAIFI /100 cust/yr',
    cmlLabel: 'SAIDI min/cust/yr',
    networkChargeLabel: 'wheeling charge',
    constraintLabel: 'curtailment compensation',
    returnHint: 'regulated return on equity',
    safetyBody: 'the electrical inspectorate',
  },
};

/** China (Shanghai) — the National Energy Administration (NEA) / NDRC set the
 *  transmission-and-distribution price cap (输配电价 review); State Grid
 *  operates. A cost-of-service permitted-cost cap over an ultra-high-voltage
 *  system; reliability (SAIDI/SAIFI) and affordability lead. */
export const CHINA_REGULATOR: RegulatorProfile = {
  name: 'NEA / NDRC',
  model: 'cost-of-service',
  kpiWeights: { bill: 0.24, ci: 0.2, cml: 0.2, satisfaction: 0.16, carbon: 0.12, curtailedFirm: 0.08 },
  framing: {
    scheme: 'T&D price review',
    schemeGloss:
      'T&D price review — a transmission-and-distribution price review (输配电价): the NDRC/NEA set a permitted-cost price cap on the State Grid regulated asset base; reliability and affordability lead.',
    review: 'price review',
    blurb:
      'A NDRC/NEA transmission-and-distribution price review: a permitted-cost cap over an ultra-high-voltage State Grid system, judged on reliability and affordability.',
    reliabilityMetric: 'SAIDI / SAIFI',
    ciLabel: 'SAIFI /100 cust/yr',
    cmlLabel: 'SAIDI min/cust/yr',
    networkChargeLabel: 'T&D charge',
  },
};

/** South Africa (Cape Town) — the National Energy Regulator of South Africa
 *  (NERSA) sets tariffs via a Multi-Year Price Determination (MYPD); Eskom
 *  generates/transmits and the City distributes. Load-shedding is the live
 *  wire — reliability and affordability dominate. */
export const SOUTHAFRICA_REGULATOR: RegulatorProfile = {
  name: 'NERSA',
  model: 'cost-of-service',
  kpiWeights: { ci: 0.24, cml: 0.24, bill: 0.22, satisfaction: 0.16, carbon: 0.08, curtailedFirm: 0.06 },
  framing: {
    scheme: 'MYPD',
    schemeGloss:
      "Multi-Year Price Determination (MYPD) — NERSA approves allowed revenue on the regulated asset base; under chronic load-shedding, reliability and affordability dominate.",
    review: 'price determination',
    blurb:
      "A NERSA price determination: allowed revenue over a load-shedding-constrained grid, judged hard on keeping the lights on and on affordability.",
    reliabilityMetric: 'SAIDI / SAIFI',
    ciLabel: 'SAIFI /100 cust/yr',
    cmlLabel: 'SAIDI min/cust/yr',
    networkChargeLabel: 'use-of-system charge',
  },
};

/** Egypt (Cairo) — EgyptERA (the Egyptian Electric Utility & Consumer
 *  Protection Regulatory Agency) sets tariffs; subsidised, with rampant load
 *  growth. Affordability and reliability lead. */
export const EGYPT_REGULATOR: RegulatorProfile = {
  name: 'EgyptERA',
  model: 'cost-of-service',
  kpiWeights: { bill: 0.26, ci: 0.2, cml: 0.2, satisfaction: 0.16, carbon: 0.1, curtailedFirm: 0.08 },
  framing: {
    scheme: 'tariff schedule',
    schemeGloss:
      "EgyptERA tariff schedule — a regulated, historically subsidised tariff on the distribution company's costs, with affordability and reliability under fast load growth front of mind.",
    review: 'tariff review',
    blurb:
      "An EgyptERA tariff review: a subsidised cost-of-service tariff over a fast-growing Nile-valley grid, judged on affordability and reliability.",
    reliabilityMetric: 'SAIDI / SAIFI',
    ciLabel: 'SAIFI /100 cust/yr',
    cmlLabel: 'SAIDI min/cust/yr',
    networkChargeLabel: 'network charge',
  },
};

/** Greece (Athens) — RAE/RAAEY regulates; HEDNO (DEDDIE) is the DSO. A
 *  required-revenue methodology on the regulated asset base; fierce summer
 *  air-conditioning peaks and a fast solar climb. */
export const GREECE_REGULATOR: RegulatorProfile = {
  name: 'RAE',
  model: 'cost-of-service',
  kpiWeights: { carbon: 0.12, curtailedFirm: 0.12, bill: 0.24, satisfaction: 0.18, ci: 0.12, cml: 0.22 },
  framing: {
    scheme: 'required revenue',
    schemeGloss:
      "Required revenue — the RAE methodology setting HEDNO's allowed distribution revenue on the regulated asset base (WACC × RAB + opex + depreciation), with a fast solar build to host.",
    review: 'tariff review',
    blurb:
      "A RAE required-revenue review: allowed distribution revenue over a sun-baked island-linked grid, judged on affordability, supply quality and solar hosting.",
    reliabilityMetric: 'SAIDI / SAIFI',
    ciLabel: 'SAIFI /100 cust/yr',
    cmlLabel: 'SAIDI min/cust/yr',
    networkChargeLabel: 'network use charge',
  },
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
 *  floored by must-run nuclear. W8 Part-2b WIRES `baseloadFloor` into
 *  market/dispatch.ts (a must-run, ~zero-marginal, ~zero-carbon baseload that
 *  curtails firm renewables in surplus), so France now reads flat/low + clean
 *  through dispatch itself, not just FRANCE_MARKET. `tenderBias` skews the
 *  developer flow to match: renewables still bid (appels d'offres) but against
 *  the nuclear floor (dampened), and new thermal is suppressed. Nuclear is
 *  state baseload, not a developer auction, so it is NOT lifted here. */
export const FRANCE_GENERATION: GenerationModel = {
  ownership: 'tender',
  baseloadFloor: 0.6,
  tenderBias: {
    solarFarm: 0.7,
    windOnshore: 0.7,
    windOffshore: 0.7,
    battery: 0.8,
    gasCCGT: 0.5,
    gasPeaker: 0.5,
    coal: 0.2,
  },
};

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
/** Merchant tender market — bids skew solar/battery in reality (the NEM's
 *  rooftop-PV flood + grid-scale storage build, coal exiting). W8 Part-2b
 *  wires that skew via `tenderBias`: solar + battery rush in, wind follows,
 *  new gas/coal are damped (coal is retiring). */
export const AUSTRALIA_GENERATION: GenerationModel = {
  ownership: 'tender',
  tenderBias: {
    solarFarm: 1.6,
    battery: 1.6,
    windOnshore: 1.2,
    windOffshore: 0.8,
    gasCCGT: 0.6,
    gasPeaker: 0.7,
    coal: 0.2,
  },
};

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
export const HONGKONG_GENERATION: GenerationModel = {
  ownership: 'tender',
  // No real developer tender exists (the 'owned' fork is deferred — see above),
  // so bias the appetite right down across the board: bids trickle in only
  // rarely, approximating "the operator builds plant, developers don't". When
  // Phase-C lands the 'owned' branch, stepTenders is skipped entirely and this
  // bias becomes moot.
  tenderBias: {
    gasCCGT: 0.15,
    gasPeaker: 0.15,
    coal: 0.1,
    nuclear: 0.1,
    biomass: 0.1,
    solarFarm: 0.1,
    windOnshore: 0.1,
    windOffshore: 0.1,
    tidal: 0.1,
    hydro: 0.1,
    battery: 0.1,
    electrolyser: 0.1,
  },
};

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
 *  W8 Part-2b WIRES `hydroDriven` into market/dispatch.ts: the must-run hydro
 *  baseload's available share follows a deterministic seasonal reservoir factor
 *  (dry austral-winter backs the rivers down), on top of the price effect from
 *  BRAZIL_MARKET.droughtUplift (already wired). `tenderBias` reflects the ANEEL
 *  auction IPP mix (hydro/wind/solar/biomass led). No `rio` city wires this yet.
 *  TODO(WP2 Phase-D): a persistent reservoir STATE + the bandeira flag on the
 *  bill HUD. TODO(WP2 Phase-F): non-technical losses (theft). */
export const BRAZIL_GENERATION: GenerationModel = {
  ownership: 'tender',
  hydroDriven: true,
  baseloadFloor: 0.5,
  tenderBias: {
    hydro: 1.4, // Brazil's defining technology — the rivers lead the fleet
    solarFarm: 1.2,
    windOnshore: 1.3,
    windOffshore: 0.8,
    biomass: 1.1,
    gasCCGT: 0.8,
    coal: 0.4,
  },
};

// --- Germany (Berlin) — 50 Hz, Energiewende, € incentive regulation. --------
/** 50Hertz/Stromnetz Berlin voltages: 380/220/110 kV transmission, 10/0.4 kV. */
export const GERMANY_POWER: PowerSystemProfile = {
  nominalHz: 50,
  freqFloorHz: 47.5,
  droopHz: 1.5,
  transmissionKv: [380, 220, 110],
  distributionKv: [10, 0.4],
};
/** Berlin is mildly winter-peaking (heating, increasingly electric via heat
 *  pumps), but with a heavy rooftop-PV midday flood the duck curve bites; the
 *  cold 'calm-cold' regime (a Dunkelflaute — windless overcast spell) is the
 *  stress event, as in GB. */
export const GERMANY_WEATHER: WeatherProfile = {
  peakSeason: 'winter',
  peakDoy: 20,
  dayLenMaxH: 16.5,
  dayLenMinH: 7.8,
  ampWinterDrop: 0.5,
  regimes: LONDON_WEATHER.regimes,
};
/** € / EUR; liberalised, unbundled — Netzentgelte network pot + energy pot,
 *  GB-like shares but a higher standing charge and retail uplift (Germany's
 *  levies/taxes are famously heavy). */
export const GERMANY_ECONOMY: EconomyProfile = {
  symbol: '€',
  iso: 'EUR',
  toGbp: 0.85,
  domesticNetworkShare: 0.34,
  domesticEnergyShare: 0.42,
  retailUplift: 3.2,
  supplyFixedYr: 170,
};
/** Merchant tender market — the Energiewende skews it hard to solar + wind +
 *  battery, with coal/lignite retiring and gas as the flex backstop. */
export const GERMANY_GENERATION: GenerationModel = {
  ownership: 'tender',
  tenderBias: {
    solarFarm: 1.6,
    windOnshore: 1.5,
    windOffshore: 1.3,
    battery: 1.4,
    gasCCGT: 0.8,
    gasPeaker: 0.8,
    coal: 0.2,
    nuclear: 0.1, // phased out (2023)
  },
};
/** Germany: a renewables-heavy market with deep PV middays (occasionally
 *  negative) and a Dunkelflaute scarcity spike; mid carbon (~350 g, falling as
 *  coal exits), winter-peaking. */
export const GERMANY_MARKET: MarketProfile = {
  baseMWh: 44,
  peakMWh: 90,
  middayDipMWh: 70,
  seasonalUplift: 0.28,
  scarcityRegime: 'calm-cold',
  scarcityKickMWh: 110,
  gridCarbonG: 350,
};

// --- USA (New York) — 60 Hz, summer AC peak, $ cost-of-service rate case. ----
/** Con Edison / NYISO voltages: 345/138/69 kV transmission, 13.8/0.12 kV
 *  distribution (US LV is 120/240 V; the network model carries the kV tiers). */
export const USA_POWER: PowerSystemProfile = {
  nominalHz: 60,
  freqFloorHz: 57,
  droopHz: 1.8,
  transmissionKv: [345, 138, 69],
  distributionKv: [13.8, 0.48, 0.12],
};
/** New York is SUMMER-peaking (air-conditioning), with humid-heat 'heatwave'
 *  stress events and nor'easter storms. NH summer peak ≈ late July (peakDoy
 *  ≈ 205). */
export const USA_WEATHER: WeatherProfile = {
  peakSeason: 'summer',
  peakDoy: 205,
  dayLenMaxH: 15.0,
  dayLenMinH: 9.3,
  ampWinterDrop: 0.35,
  regimes: LONDON_WEATHER.regimes,
};
/** $ / USD; a regulated delivery charge (rate base) + a competitive energy
 *  supply — NYC delivery is among the priciest in the US, hence a heavy
 *  standing charge. */
export const USA_ECONOMY: EconomyProfile = {
  symbol: '$',
  iso: 'USD',
  toGbp: 0.79,
  domesticNetworkShare: 0.42,
  domesticEnergyShare: 0.4,
  retailUplift: 2.6,
  supplyFixedYr: 220,
};
/** Merchant tender into a wholesale market (NYISO) — gas + nuclear today, with
 *  the CLCPA driving a fast offshore-wind + solar + storage build. */
export const USA_GENERATION: GenerationModel = {
  ownership: 'tender',
  tenderBias: {
    solarFarm: 1.2,
    windOffshore: 1.4,
    windOnshore: 0.9,
    battery: 1.3,
    nuclear: 0.9,
    gasCCGT: 0.9,
    gasPeaker: 1.0,
    coal: 0.1,
  },
};
/** New York: a gas-and-nuclear market with a strong summer-aircon peak, modest
 *  PV midday dip, and humid-heat scarcity spikes; mid carbon (~270 g), 60 Hz. */
export const USA_MARKET: MarketProfile = {
  baseMWh: 40,
  peakMWh: 105,
  middayDipMWh: 12,
  seasonalUplift: 0.3,
  scarcityRegime: 'heatwave',
  scarcityKickMWh: 130,
  gridCarbonG: 270,
};

// --- India (Pune, Maharashtra) — 50 Hz, pre-monsoon summer peak, ₹ MYT. ------
/** MSEDCL / POWERGRID voltages: 400/220/132 kV transmission, 33/11/0.4 kV. */
export const INDIA_POWER: PowerSystemProfile = {
  nominalHz: 50,
  freqFloorHz: 47.5,
  droopHz: 1.5,
  transmissionKv: [400, 220, 132],
  distributionKv: [33, 11, 0.4],
};
/** Pune is SUMMER-peaking — the brutal pre-monsoon heat (Apr–May, peakDoy ≈
 *  130) drives the aircon/irrigation peak; the wet monsoon storms are the
 *  reliability stress (carried as the 'storm' regime intensity). */
export const INDIA_WEATHER: WeatherProfile = {
  peakSeason: 'summer',
  peakDoy: 130,
  dayLenMaxH: 13.2,
  dayLenMinH: 10.8,
  ampWinterDrop: 0.18,
  regimes: LONDON_WEATHER.regimes,
};
/** ₹ / INR; a regulated wheeling charge under MYT, low absolute bills with a
 *  small standing charge but heavy cross-subsidy and AT&C losses baked into the
 *  energy line. */
export const INDIA_ECONOMY: EconomyProfile = {
  symbol: '₹',
  iso: 'INR',
  toGbp: 0.0095,
  domesticNetworkShare: 0.3,
  domesticEnergyShare: 0.45,
  retailUplift: 2.4,
  supplyFixedYr: 1200,
};
/** Tender/auction market — India's renewable push skews solar hard (the
 *  cheapest power), with wind and storage following and new coal damped (still
 *  the baseload incumbent). */
export const INDIA_GENERATION: GenerationModel = {
  ownership: 'tender',
  tenderBias: {
    solarFarm: 1.7,
    windOnshore: 1.2,
    battery: 1.2,
    coal: 0.6, // still the baseload incumbent, but new build damped
    gasCCGT: 0.6,
    biomass: 1.0,
  },
};
/** India: a coal-heavy market (high carbon ~650 g, falling), a strong summer
 *  pre-monsoon peak and a fast solar midday dip; 50 Hz. */
export const INDIA_MARKET: MarketProfile = {
  baseMWh: 36,
  peakMWh: 78,
  middayDipMWh: 30,
  seasonalUplift: 0.26,
  scarcityRegime: 'heatwave',
  scarcityKickMWh: 70,
  gridCarbonG: 650,
};

// --- Lightweight economies for the remaining mapped cities (CN/ZA/EG/GR). ----
// These four cities (Shanghai, Cape Town, Cairo, Athens) get a faithful
// REGULATOR (above) + their own CURRENCY so NO British term leaks and the bill
// reads in local money; their power/weather/market default to GB for now (a
// documented, fully-playable approximation — the regulator is the owner's hard
// requirement, and the deeper grid seams are a later wave). LONDON_* defaults
// are reused for the un-overridden blocks via COUNTRY_PROFILES below.
/** ¥ / CNY (Shanghai). */
export const CHINA_ECONOMY: EconomyProfile = {
  symbol: '¥',
  iso: 'CNY',
  toGbp: 0.11,
  domesticNetworkShare: 0.32,
  domesticEnergyShare: 0.4,
  retailUplift: 2.4,
  supplyFixedYr: 60,
};
/** R / ZAR (Cape Town). */
export const SOUTHAFRICA_ECONOMY: EconomyProfile = {
  symbol: 'R',
  iso: 'ZAR',
  toGbp: 0.043,
  domesticNetworkShare: 0.34,
  domesticEnergyShare: 0.4,
  retailUplift: 2.6,
  supplyFixedYr: 300,
};
/** E£ / EGP (Cairo). */
export const EGYPT_ECONOMY: EconomyProfile = {
  symbol: 'E£',
  iso: 'EGP',
  toGbp: 0.016,
  domesticNetworkShare: 0.3,
  domesticEnergyShare: 0.45,
  retailUplift: 2.2,
  supplyFixedYr: 200,
};
/** € / EUR (Athens). */
export const GREECE_ECONOMY: EconomyProfile = {
  symbol: '€',
  iso: 'EUR',
  toGbp: 0.85,
  domesticNetworkShare: 0.33,
  domesticEnergyShare: 0.42,
  retailUplift: 3.0,
  supplyFixedYr: 150,
};

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
export type CountryId =
  | 'GB'
  | 'FR'
  | 'AU'
  | 'HK'
  | 'BR'
  | 'DE'
  | 'US'
  | 'IN'
  | 'CN'
  | 'ZA'
  | 'EG'
  | 'GR';

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
  DE: {
    power: GERMANY_POWER,
    weather: GERMANY_WEATHER,
    economy: GERMANY_ECONOMY,
    generation: GERMANY_GENERATION,
    regulator: GERMANY_REGULATOR,
    market: GERMANY_MARKET,
  },
  US: {
    power: USA_POWER,
    weather: USA_WEATHER,
    economy: USA_ECONOMY,
    generation: USA_GENERATION,
    regulator: USA_REGULATOR,
    market: USA_MARKET,
  },
  IN: {
    power: INDIA_POWER,
    weather: INDIA_WEATHER,
    economy: INDIA_ECONOMY,
    generation: INDIA_GENERATION,
    regulator: INDIA_REGULATOR,
    market: INDIA_MARKET,
  },
  // CN/ZA/EG/GR: a faithful per-country REGULATOR + local CURRENCY, with the
  // power/weather/generation/market defaulting to GB for now (documented
  // approximation — the regulator localisation is the hard requirement; deeper
  // grid seams for these four are a later wave). No British term leaks: each
  // names its own regulator, scheme, metric and money.
  CN: {
    power: LONDON_POWER,
    weather: LONDON_WEATHER,
    economy: CHINA_ECONOMY,
    generation: LONDON_GENERATION,
    regulator: CHINA_REGULATOR,
    market: LONDON_MARKET,
  },
  ZA: {
    power: LONDON_POWER,
    weather: LONDON_WEATHER,
    economy: SOUTHAFRICA_ECONOMY,
    generation: LONDON_GENERATION,
    regulator: SOUTHAFRICA_REGULATOR,
    market: LONDON_MARKET,
  },
  EG: {
    power: LONDON_POWER,
    weather: LONDON_WEATHER,
    economy: EGYPT_ECONOMY,
    generation: LONDON_GENERATION,
    regulator: EGYPT_REGULATOR,
    market: LONDON_MARKET,
  },
  GR: {
    power: LONDON_POWER,
    weather: LONDON_WEATHER,
    economy: GREECE_ECONOMY,
    generation: LONDON_GENERATION,
    regulator: GREECE_REGULATOR,
    market: LONDON_MARKET,
  },
};

/** The resolved operating model for a country tag (defaults to GB). */
export function countryProfile(country: CountryId | undefined): ResolvedProfile {
  return country ? COUNTRY_PROFILES[country] : LONDON_PROFILE;
}
