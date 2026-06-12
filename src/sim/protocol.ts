// Message protocol between the main thread and the simulation worker.
// The worker owns authoritative game state; the main thread renders
// snapshots and sends player commands.

import type { PlacedAsset } from './assets';
import type { VegPolicy } from './catalog';
import type { Command } from './commands';
import type { Application } from './events/applications';
import type { Tender } from './events/developers';
import type { Pitch, TechState } from './events/innovation';
import type { CouncilState } from './customers/adoption';
import type { BillBreakdown } from './regulation/bill';
import type { KpiRates } from './regulation/kpis';
import type { PeriodActuals, PeriodTargets, ReportCard } from './regulation/riio';
import type { ConnectionStudy } from './study';
import type { GameEvent, GrowthRecord, SaveData } from './state';
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
    /** Lifetime curtailed energy by connection type, MWh. */
    curtailedFirmMWh: number;
    curtailedFlexMWh: number;
    /** Indicative system frequency, Hz. */
    freqHz: number;
    /** Customer-weighted council satisfaction, 0..100. */
    satisfactionAvg: number;
  };
  weather: { sun: number; wind: number; cloud: number };
  bill: BillBreakdown;
  fleet: {
    vans: Array<{ id: number; x: number; y: number; busy: boolean }>;
    fleetSize: number;
    vegPolicy: VegPolicy;
    /** Open repair jobs: site + whether a crew is on the way. */
    jobs: Array<{ x: number; y: number; label: string; assetId: number; staffed: boolean }>;
  };
  /** Performance history of the asset the UI is watching: samples of
   *  [game-min, MW through/out, capacity MW] on a 30-min grid. */
  watch?: { assetId: number; series: Array<[number, number, number]> } | undefined;
  kpis: KpiRates & { worstVegPct: number };
  /** Recent event log (ring buffer; dedupe by seq). */
  events: GameEvent[];
  /** Undo/redo stack depths (for button states). */
  undoDepth: number;
  redoDepth: number;
  /** Map markers the renderer draws bubbles for (stable-ordered). */
  sites: Array<{
    x: number;
    y: number;
    icon: 'application' | 'tender' | 'overdue' | 'building';
    label: string;
  }>;
  /** Cumulative town-growth mutations so the main thread can mirror
   *  them onto its own map copy (append-only). */
  growth: GrowthRecord[];
  inbox: {
    applications: Application[];
    tenders: Tender[];
    pitches: Pitch[];
    tech: TechState;
    innovationFundK: number;
    levyPct: number;
  };
  /** [council id, adoption + satisfaction]. */
  councils: Array<[number, CouncilState]>;
  riio: {
    index: number;
    /** Game-minutes into the 5-year period. */
    elapsedMin: number;
    targets: PeriodTargets;
    current: PeriodActuals;
    lastReport?: ReportCard | undefined;
  };
}

export type MainToWorker =
  | { type: 'ping'; t: number }
  | { type: 'start'; save?: unknown }
  | { type: 'newGame' }
  | { type: 'command'; seq: number; cmd: Command }
  /** Follow an asset's performance history (sparkline); undefined stops. */
  | { type: 'watch'; assetId?: number | undefined }
  /** Run a connection study for an open application. */
  | { type: 'study'; appId: number }
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
  | { type: 'study'; study: ConnectionStudy }
  | { type: 'fatal'; message: string };
