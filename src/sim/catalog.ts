// Buildable asset catalog: capabilities, electrical parameters and costs.
// Money is in £k throughout the sim (avoids float noise on big numbers).
// Capex is annuitized into the customer bill; nothing is ever "unaffordable",
// it just lands on the DUoS charge.

import type { VoltageLevel } from './grid/types';

export type GenType = 'gasCCGT' | 'nuclear' | 'solarFarm' | 'windOnshore' | 'windOffshore';
export type SubType = 'bulk' | 'grid' | 'dist';
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
  /** Where it may be sited. */
  siting: 'land' | 'solarSite' | 'windSite' | 'nuclearSite';
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
  },
  solarFarm: {
    name: 'Solar farm',
    capacityMW: 50,
    level: 33,
    capexK: 35_000,
    opexFrac: 0.015,
    marginalCostK: 0.045, // PPA strike
    carbonG: 0,
    siting: 'solarSite',
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
  },
};

export interface SubSpec {
  name: string;
  /** Buses present at the substation. */
  levels: VoltageLevel[];
  /** Transformer rating between the two levels (MW), if two levels. */
  txRatingMW: number;
  /** Transformer reactance pu on 100 MVA. */
  txX: number;
  capexK: number;
  opexFrac: number;
  /** Distribution subs serve customer tiles within this radius. */
  serviceRadius?: number;
}

export const SUBS: Record<SubType, SubSpec> = {
  bulk: {
    name: 'Bulk supply point (400/132 kV)',
    levels: [400, 132],
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
  },
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

/** Asset life and discounting for capex annuitization. */
export const ASSET_LIFE_YEARS = 40;
export const DISCOUNT_RATE = 0.05;

/** Annual charge per £1 of capex (standard annuity formula). */
export const ANNUITY_FACTOR =
  (DISCOUNT_RATE * Math.pow(1 + DISCOUNT_RATE, ASSET_LIFE_YEARS)) /
  (Math.pow(1 + DISCOUNT_RATE, ASSET_LIFE_YEARS) - 1);

/** Peak demand per customer (kW) — diversified after-diversity max demand. */
export const ADMD_KW = 1.4;
