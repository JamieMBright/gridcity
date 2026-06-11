// Message protocol between the main thread and the simulation worker.
// The worker owns authoritative game state; the main thread renders
// snapshots and sends player commands.

import type { PlacedAsset } from './assets';
import type { VegPolicy } from './catalog';
import type { Command } from './commands';
import type { BillBreakdown } from './regulation/bill';
import type { KpiRates } from './regulation/kpis';
import type { GameEvent, SaveData } from './state';
import type { BranchView } from './tick';

export type SimSpeed = 0 | 1 | 4 | 16;

/** Game-minutes advanced per sim tick at 1x speed. Sim runs at 4 ticks/sec. */
export const MINUTES_PER_TICK = 7.5;
export const TICKS_PER_SECOND = 4;

export interface SimSnapshot {
  tick: number;
  /** Game time in minutes since scenario start. */
  simTimeMin: number;
  speed: SimSpeed;
  assets: PlacedAsset[];
  branches: BranchView[];
  /** [assetId, voltage level, voltage pu] per network bus. */
  volts: Array<[number, number, number]>;
  /** COV code per map tile (see tick.ts). */
  coverage: Uint8Array;
  /** gen asset id → dispatched MW (negative = battery charging). */
  genMW: Array<[number, number]>;
  /** battery asset id → state of charge, MWh. */
  soc: Array<[number, number]>;
  stats: {
    totalCustomers: number;
    servedCustomers: number;
    totalDemandMW: number;
    connectedMW: number;
    servedMW: number;
    /** Wholesale operating cost right now, £k/h. */
    costKPerHour: number;
    /** Marginal price of the most expensive running unit, £/MWh. */
    priceMWh: number;
    /** Rolling carbon intensity, g/kWh. */
    carbonG: number;
    /** Lifetime curtailed renewable energy, MWh. */
    curtailedMWh: number;
    /** Indicative system frequency, Hz. */
    freqHz: number;
  };
  weather: { sun: number; wind: number; cloud: number };
  bill: BillBreakdown;
  fleet: {
    vans: Array<{ id: number; x: number; y: number; busy: boolean }>;
    fleetSize: number;
    vegPolicy: VegPolicy;
    /** Open repair jobs: site + whether a crew is on the way. */
    jobs: Array<{ x: number; y: number; label: string; staffed: boolean }>;
  };
  kpis: KpiRates & { worstVegPct: number };
  /** Recent event log (ring buffer; dedupe by seq). */
  events: GameEvent[];
}

export type MainToWorker =
  | { type: 'ping'; t: number }
  | { type: 'start'; save?: unknown }
  | { type: 'command'; seq: number; cmd: Command }
  | { type: 'requestSave' };

export type WorkerToMain =
  | { type: 'pong'; t: number }
  | { type: 'snapshot'; snapshot: SimSnapshot }
  | {
      type: 'cmdResult';
      seq: number;
      ok: boolean;
      error?: string | undefined;
      assetId?: number | undefined;
    }
  | { type: 'saveData'; data: SaveData }
  | { type: 'fatal'; message: string };
