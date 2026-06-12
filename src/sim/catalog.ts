// Buildable asset catalog: capabilities, electrical parameters and costs.
// Money is in £k throughout the sim (avoids float noise on big numbers).
// Capex is annuitized into the customer bill; nothing is ever "unaffordable",
// it just lands on the DUoS charge.

import type { VoltageLevel } from './grid/types';

export type GenType =
  | 'gasCCGT'
  | 'gasPeaker'
  | 'coal'
  | 'nuclear'
  | 'solarFarm'
  | 'windOnshore'
  | 'windOffshore'
  | 'tidal'
  | 'biomass'
  | 'battery'
  | 'interconnector';
export type SubType = 'bulk' | 'grid' | 'dist' | 'pole' | 'vault' | 'tee';
export type LineBuild = 'overhead' | 'underground';

export interface GenSpec {
  name: string;
  capacityMW: number;
  /** Connection voltage. */
  level: VoltageLevel;
  capexK: number;
  /** Fixed O&M as fraction of capex per year. */
  opexFrac: number;
  /** Marginal cost £/MWh (fuel / PPA strike). Used by dispatch + bills. */
  marginalCostK: number;
  /** gCO2 per kWh. */
  carbonG: number;
  /** Where it may be sited ('edge' = on land within 2 tiles of the map
   *  boundary — interconnector landfalls). */
  siting: 'land' | 'solarSite' | 'windSite' | 'nuclearSite' | 'water' | 'edge';
  /** Planning consultation, game-days before construction starts. */
  planningDays: number;
  /** Construction, game-days until the plant is commissioned. */
  buildDays: number;
  /** Tile footprint [w, h]; omitted = a single tile. Big thermal plant
   *  spreads out — cooling towers and all sorts. */
  footprint?: [number, number];
  /** Storage capacity, MWh (batteries only). */
  energyMWh?: number;
}

export const GENS: Record<GenType, GenSpec> = {
  gasCCGT: {
    name: 'Gas CCGT',
    capacityMW: 600,
    level: 132,
    capexK: 450_000,
    opexFrac: 0.025,
    marginalCostK: 0.085, // £85/MWh
    carbonG: 390,
    siting: 'land',
    planningDays: 60,
    buildDays: 150,
  },
  gasPeaker: {
    name: 'Gas peaker (OCGT)',
    capacityMW: 120,
    level: 132,
    capexK: 55_000,
    opexFrac: 0.02,
    marginalCostK: 0.14, // expensive fuel, runs at the peaks
    carbonG: 520,
    siting: 'land',
    planningDays: 30,
    buildDays: 45,
  },
  coal: {
    name: 'Coal station',
    capacityMW: 1500,
    level: 400,
    capexK: 1_600_000,
    opexFrac: 0.03,
    marginalCostK: 0.06,
    carbonG: 820,
    siting: 'land',
    planningDays: 120,
    buildDays: 360,
    footprint: [3, 2],
  },
  nuclear: {
    name: 'Nuclear',
    capacityMW: 3200,
    level: 400,
    capexK: 9_000_000,
    opexFrac: 0.02,
    marginalCostK: 0.01,
    carbonG: 0,
    siting: 'nuclearSite',
    planningDays: 365,
    buildDays: 720,
    // a real station campus: reactor hall, turbine hall, switchyard
    footprint: [3, 2],
  },
  solarFarm: {
    name: 'Solar farm',
    capacityMW: 50,
    level: 33,
    capexK: 35_000,
    opexFrac: 0.015,
    marginalCostK: 0.045, // PPA strike
    carbonG: 0,
    siting: 'land', // any open land — pre-surveyed sites build faster
    planningDays: 14,
    buildDays: 30,
  },
  windOnshore: {
    name: 'Onshore wind',
    capacityMW: 100,
    level: 33,
    capexK: 110_000,
    opexFrac: 0.025,
    marginalCostK: 0.05,
    carbonG: 0,
    siting: 'land',
    planningDays: 30,
    buildDays: 45,
  },
  windOffshore: {
    name: 'Offshore wind',
    capacityMW: 800,
    level: 132,
    capexK: 2_000_000,
    opexFrac: 0.03,
    marginalCostK: 0.055,
    carbonG: 0,
    siting: 'windSite',
    planningDays: 90,
    buildDays: 180,
  },
  tidal: {
    name: 'Tidal stream',
    capacityMW: 30,
    level: 33,
    capexK: 95_000,
    opexFrac: 0.04,
    marginalCostK: 0,
    carbonG: 0,
    siting: 'water',
    planningDays: 60,
    buildDays: 90,
  },
  biomass: {
    name: 'Biomass CHP',
    capacityMW: 40,
    level: 33,
    capexK: 28_000,
    opexFrac: 0.03,
    marginalCostK: 0.095,
    carbonG: 120,
    siting: 'land',
    planningDays: 30,
    buildDays: 60,
  },
  interconnector: {
    name: 'Interconnector (HVDC)',
    capacityMW: 1000,
    level: 400,
    capexK: 500_000,
    opexFrac: 0.015,
    // display only — dispatch prices imports off the live national
    // series (nationalPriceK in market/dispatch.ts), never this figure
    marginalCostK: 0.09,
    carbonG: 150, // GB import mix: French nuclear blended with NL/BE gas
    siting: 'edge',
    planningDays: 90,
    buildDays: 180,
  },
  battery: {
    name: 'Battery storage',
    capacityMW: 100,
    level: 33,
    capexK: 60_000,
    opexFrac: 0.02,
    marginalCostK: 0.005,
    carbonG: 0,
    siting: 'land',
    planningDays: 7,
    buildDays: 21,
    energyMWh: 400,
  },
};

/** Round-trip efficiency applied on battery charge. */
export const BATTERY_EFFICIENCY = 0.9;

export interface SubSpec {
  name: string;
  /** Tile footprint [w, h]; omitted = a single tile. A GSP switchyard
   *  sprawls — gantries, busbars, banks of transformers. */
  footprint?: [number, number];
  /** Buses present at the substation. */
  levels: VoltageLevel[];
  /** Transformer rating between the two levels (MW), if two levels. */
  txRatingMW: number;
  /** Transformer reactance pu on 100 MVA. */
  txX: number;
  capexK: number;
  opexFrac: number;
  /** Distribution subs serve customer tiles within this radius (at the
   *  default txRatingMW; the radius scales with the fitted MVA). */
  serviceRadius?: number;
  /** Fixed transformer sizes this sub can be fitted with, MVA. The sub
   *  auto-upgrades through them as catchment demand grows; the player
   *  can also step them by hand. */
  mvaSteps?: number[];
}

export const SUBS: Record<SubType, SubSpec> = {
  bulk: {
    name: 'Bulk supply point (400/132/33 kV)',
    footprint: [2, 2],
    levels: [400, 132, 33],
    txRatingMW: 1000,
    txX: 0.013,
    capexK: 40_000,
    opexFrac: 0.015,
  },
  grid: {
    name: 'Grid substation (132/33 kV)',
    levels: [132, 33],
    txRatingMW: 240,
    txX: 0.06,
    capexK: 12_000,
    opexFrac: 0.015,
  },
  dist: {
    name: 'Distribution substation (33 kV/LV)',
    levels: [33],
    txRatingMW: 20,
    txX: 0,
    capexK: 1_200,
    opexFrac: 0.02,
    serviceRadius: 6,
    mvaSteps: [5, 10, 20, 40],
  },
  pole: {
    name: 'Pole-mounted transformer (33 kV/LV)',
    levels: [33],
    txRatingMW: 2,
    txX: 0,
    capexK: 120,
    opexFrac: 0.025,
    serviceRadius: 2,
    mvaSteps: [1, 2],
  },
  vault: {
    name: 'Underground substation (33 kV/LV)',
    levels: [33],
    txRatingMW: 25,
    txX: 0,
    capexK: 2_800,
    opexFrac: 0.02,
    serviceRadius: 5,
    mvaSteps: [10, 25, 50],
  },
  // not placed directly: created by teeing into an existing circuit.
  // Its single bay is the tee'd line's own level (SubAsset.teeLevel).
  tee: {
    name: 'Tee junction',
    levels: [],
    txRatingMW: 1,
    txX: 0.0001,
    capexK: 300,
    opexFrac: 0.01,
  },
};

/** Capex of a radius-sub fitted with a given transformer, £k — the base
 *  price buys the default size; bigger iron costs pro-rata on top. */
export function subCapexK(sub: SubType, mva: number): number {
  const spec = SUBS[sub];
  return Math.round(spec.capexK * (0.4 + 0.6 * (mva / spec.txRatingMW)));
}

/** Service radius for a fitted MVA: more iron reaches marginally further. */
export function subRadius(sub: SubType, mva: number): number {
  const spec = SUBS[sub];
  if (spec.serviceRadius === undefined) return 0;
  return spec.serviceRadius * Math.sqrt(mva / spec.txRatingMW);
}

/** Rebuilding a substation underground (indoor GIS kit, civils, vents)
 *  costs this multiple of the outdoor build — but storms can't touch it. */
export const SUB_UG_MUL = 3;

/** Re-conductoring an existing line (high-temperature conductors on the
 *  same supports): thermal rating multiplier and its cost as a fraction
 *  of the line's current capex. */
export const LINE_UPRATE_MUL = 1.3;
export const LINE_UPRATE_COST_FRAC = 0.6;

/** A substation auto-upgrades when sustained load passes this loading. */
export const SUB_UPGRADE_AT = 0.9;

/** Pylon/pole spacing along overhead routes, tiles between supports. */
export const PYLON_SPACING: Record<VoltageLevel, number> = { 400: 3, 132: 3, 33: 2 };

/** Transformer pairs inside multi-winding substations: rating + reactance
 *  per voltage step (a BSP chains 400/132 then 132/33 on site). */
export const TX_PAIR: Record<string, { ratingMW: number; x: number }> = {
  '400/132': { ratingMW: 1000, x: 0.013 },
  '132/33': { ratingMW: 240, x: 0.06 },
};

export interface LineSpec {
  ratingMW: number;
  /** Reactance pu per tile (≈1 km). */
  xPerTile: number;
  /** Resistance pu per tile (drives the voltage estimate). */
  rPerTile: number;
  /** £k per tile before terrain multipliers. */
  capexKPerTile: { overhead: number; underground: number };
  opexFrac: number;
}

export const LINES: Record<VoltageLevel, LineSpec> = {
  400: {
    ratingMW: 2000,
    xPerTile: 0.0003,
    rPerTile: 0.00003,
    capexKPerTile: { overhead: 2_500, underground: 15_000 },
    opexFrac: 0.01,
  },
  132: {
    ratingMW: 240,
    xPerTile: 0.0025,
    rPerTile: 0.0004,
    capexKPerTile: { overhead: 800, underground: 4_000 },
    opexFrac: 0.012,
  },
  33: {
    ratingMW: 30,
    xPerTile: 0.03,
    rPerTile: 0.008,
    capexKPerTile: { overhead: 150, underground: 600 },
    opexFrac: 0.015,
  },
};

/** Field operations depot: stations the orange vans. */
export const DEPOT = {
  name: 'Field depot',
  capexK: 1_500,
  opexFrac: 0.02,
} as const;

/** Annual cost of one crewed van, £k/yr. */
export const VAN_OPEX_K_YR = 150;

/** Vegetation management policies: cost £k/yr per km of overhead line,
 *  and the veg growth multiplier they leave in place. */
export const VEG_POLICY = [
  { name: 'none', costPerKmYrK: 0, growthMul: 1 },
  { name: 'reactive', costPerKmYrK: 1.2, growthMul: 0.45 },
  { name: 'proactive', costPerKmYrK: 2.5, growthMul: 0.12 },
] as const;
export type VegPolicy = 0 | 1 | 2;

/** Asset life and discounting for capex annuitization. */
export const ASSET_LIFE_YEARS = 40;
export const DISCOUNT_RATE = 0.05;

/** Annual charge per £1 of capex (standard annuity formula). */
export const ANNUITY_FACTOR =
  (DISCOUNT_RATE * Math.pow(1 + DISCOUNT_RATE, ASSET_LIFE_YEARS)) /
  (Math.pow(1 + DISCOUNT_RATE, ASSET_LIFE_YEARS) - 1);

/** Peak demand per customer (kW) — diversified after-diversity max demand. */
export const ADMD_KW = 1.4;

/** Typical GB capacity factors, for LCOE/strike estimation. */
export const CAPACITY_FACTOR: Record<GenType, number> = {
  gasCCGT: 0.55,
  gasPeaker: 0.1,
  coal: 0.5,
  nuclear: 0.9,
  solarFarm: 0.11,
  windOnshore: 0.3,
  windOffshore: 0.45,
  tidal: 0.35,
  biomass: 0.7,
  battery: 0.15,
  // imports run baseload-ish; never tendered, kept for Record totality
  interconnector: 0.5,
};

/** The PPA strike a developer needs to make a technology pay, £/MWh:
 *  annuitized capex + fixed O&M spread over expected annual output at the
 *  tech's capacity factor, plus fuel. Free fuel ≠ free electricity —
 *  tidal bids ~£100/MWh, not £0. */
export function strikeMWh(gen: GenType): number {
  const g = GENS[gen];
  const annualK = g.capexK * (ANNUITY_FACTOR + g.opexFrac);
  const outputMWh = g.capacityMW * 8760 * (CAPACITY_FACTOR[gen] ?? 0.4);
  return Math.max(1, Math.round((annualK * 1000) / outputMWh + g.marginalCostK * 1000));
}
