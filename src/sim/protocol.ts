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
import type { CatchmentForecast } from './forecast';
import type { BalanceReport, BalanceSeason } from './balance';
import type { ReinforcementPlan } from './planner';
import type { ConnectionStudy } from './study';
import type { GameEvent, GrowthRecord, SaveData } from './state';
import type { BranchView } from './tick';
import type { OrgView } from './events/directorates';
import type { SafetyView } from './reliability/safety';
import type { Claim } from './events/litigation';

export type SimSpeed = 0 | 1 | 4 | 16;

// --- bill drill-down ---------------------------------------------------------

/** Bill lines that itemise one layer deeper (#52). */
export type BillDetailLine = 'constraints' | 'ppa' | 'losses' | 'capex' | 'opex';

/** One itemised row: who, how much energy, how much money — with map
 *  coords (and the asset to pin) when there's somewhere to jump to. */
export interface BillDetailRow {
  assetId?: number | undefined;
  label: string;
  /** Annualized energy on this row (curtailed / delivered), MWh/yr. */
  mwhYr?: number | undefined;
  kYr: number;
  x?: number | undefined;
  y?: number | undefined;
}

/** Game-minutes advanced per sim tick at 1x speed. Sim runs at 4 ticks/sec. */
export const MINUTES_PER_TICK = 7.5;
export const TICKS_PER_SECOND = 4;

// --- time-skip ---------------------------------------------------------------

/** Skip destinations: next evening peak / next morning / next notable event. */
export type SkipTarget = 'peak' | 'morning' | 'event';

/** Hard wall-time safety cap on a single skip, ticks. */
export const MAX_SKIP_TICKS = 20_000;

/** Longest an event-skip fast-forwards before giving up, game-minutes. */
export const SKIP_EVENT_MAX_MIN = 7 * 1440;

/** The game-minute a skip aims for: the NEXT 18:00 ('peak') / 06:00
 *  ('morning'), or now + 7 game-days for an event-skip (which expects to
 *  stop early the moment something happens). */
export function skipTargetMin(nowMin: number, to: SkipTarget): number {
  if (to === 'event') return nowMin + SKIP_EVENT_MAX_MIN;
  const targetOfDay = to === 'peak' ? 18 * 60 : 6 * 60;
  const ahead = (targetOfDay - (nowMin % 1440) + 1440) % 1440;
  return nowMin + (ahead === 0 ? 1440 : ahead);
}

/** Speed for the next skip tick: as fast as possible without overshooting.
 *  Sim time always moves in MINUTES_PER_TICK·speed steps, so downshifting
 *  16→4→1 near the target lands exactly on any 7.5-minute-aligned target
 *  — and every tick stays identical to one the player could play live. */
export function skipTickSpeed(nowMin: number, targetMin: number): Exclude<SimSpeed, 0> {
  const remaining = targetMin - nowMin;
  for (const speed of [16, 4] as const) {
    if (MINUTES_PER_TICK * speed <= remaining) return speed;
  }
  return 1;
}

/** Should a skip stop after a tick that pushed events past `seqBefore`?
 *  'bad' news always interrupts; an event-skip also stops on 'warn'
 *  (that arrival IS the destination). */
export function skipAborts(
  events: ReadonlyArray<{ seq: number; sev: 'info' | 'warn' | 'bad' }>,
  seqBefore: number,
  to: SkipTarget,
): boolean {
  return events.some(
    (e) => e.seq > seqBefore && (e.sev === 'bad' || (to === 'event' && e.sev !== 'info')),
  );
}

export interface SimSnapshot {
  tick: number;
  /** Game time in minutes since scenario start. */
  simTimeMin: number;
  speed: SimSpeed;
  /** Active scenario ('london' or a tutorial-mission id; additive). */
  scenarioId?: string | undefined;
  /** Tutorial missions: the win predicate has fired (sticky). */
  missionComplete?: boolean | undefined;
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
    /** Load-weighted system frequency over electrified islands, Hz.
     *  Undefined when nothing is electrified (HUD reads N/A). */
    freqHz: number | undefined;
    /** Customer-weighted council satisfaction, 0..100. */
    satisfactionAvg: number;
    /** Average derived condition of the player's lines + substations,
     *  % (asset ageing, ROADMAP #15 — reliability/ageing.ts). */
    networkHealthPct: number;
  };
  weather: {
    sun: number;
    wind: number;
    cloud: number;
    /** Multi-day weather regime now in force, and the pre-rolled next
     *  one — the forecast strip reads ahead off these. */
    regime: string;
    nextRegime: string;
    /** Sim minute the current regime hands over. */
    regimeEndsMin: number;
  };
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
  /** N-1 security per service substation: [sub asset id, secure].
   *  Present only when it changed since the last snapshot (keyed off
   *  assets + outages); consumers keep the previous array otherwise. */
  security?: Array<[number, boolean]> | undefined;
  /** Service catchments for the headroom heatmap: [subId, peakMW, mvaMW]. */
  catchments?: Array<[number, number, number]> | undefined;
  /** Named-storm forecast read off the weather regime pre-roll
   *  (reliability/stormprep.ts; etaMin = game-minutes to landfall). */
  stormForecast?: Array<{ name: string; etaMin: number; severity: number }> | undefined;
  /** The network business (#53): directorate dials, pay/safety
   *  investment, engagement scores and the £/yr cost. */
  org: OrgView;
  /** H&S (#55): LTI/VSI per-year rates + safety-engagement, for the KPI
   *  dashboard's safety rows. */
  safety: SafetyView;
  /** Litigation (#54): open claims for the inbox. */
  claims: Claim[];
  /** Early-game goal ladder: the current goal, or undefined once the
   *  ladder is complete or dismissed. */
  goal?:
    | { index: number; total: number; label: string; progress?: string | undefined }
    | undefined;
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
  | { type: 'newGame'; scenarioId?: string }
  | { type: 'command'; seq: number; cmd: Command }
  /** Follow an asset's performance history (sparkline); undefined stops. */
  | { type: 'watch'; assetId?: number | undefined }
  /** Run a connection study for an open application. */
  | { type: 'study'; appId: number }
  /** Cut a grid-balance report (whole map + per council); profiles run
   *  on the chosen typical day (default 'today'). */
  | { type: 'balance'; season?: BalanceSeason | undefined }
  /** Project demand growth: per-catchment years-until-overload. */
  | { type: 'forecast' }
  /** Propose costed reinforcement bundles for a balance scope
   *  (council id, or -1 for the whole licence area). */
  | { type: 'plan'; scopeId: number }
  /** Ring-main assist: the cheapest line closing a service sub's radial
   *  into a loop (answered with a one-option 'plan'). */
  | { type: 'proposeLoop'; subId: number }
  /** Fast-forward to the next evening peak / morning / notable event. */
  | { type: 'skip'; to: SkipTarget }
  /** Dismiss the early-game goal ladder for good (veterans). */
  | { type: 'skipGoals' }
  /** Itemise one bill line (top contributors, computed on demand). */
  | { type: 'billDetail'; line: BillDetailLine }
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
  | { type: 'balance'; report: BalanceReport }
  | { type: 'forecast'; rows: CatchmentForecast[] }
  | { type: 'plan'; plan: ReinforcementPlan }
  | { type: 'billDetail'; line: BillDetailLine; rows: BillDetailRow[] }
  | { type: 'fatal'; message: string };
