// Message protocol between the main thread and the simulation worker.
// The worker owns authoritative game state; the main thread renders
// snapshots and sends player commands.

import type { PlacedAsset } from './assets';
import type { Command } from './commands';
import type { BillBreakdown } from './regulation/bill';
import type { SaveData } from './state';
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
  /** gen asset id → dispatched MW. */
  genMW: Array<[number, number]>;
  stats: {
    totalCustomers: number;
    servedCustomers: number;
    totalDemandMW: number;
    connectedMW: number;
    servedMW: number;
    /** Wholesale operating cost right now, £k/h. */
    costKPerHour: number;
  };
  bill: BillBreakdown;
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
