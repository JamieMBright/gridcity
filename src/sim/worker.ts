// The simulation worker: owns authoritative game state, advances it on a
// fixed timer, applies player commands, and streams snapshots to the main
// thread. Any uncaught error pauses the sim and surfaces instead of
// crashing the tab.

import { subMva } from './assets';
import { applyCommand } from './commands';
import { GENS } from './catalog';
import { underConstruction } from './market/dispatch';
import { kpiRates } from './regulation/kpis';
import {
  MAX_SKIP_TICKS,
  skipAborts,
  skipTargetMin,
  skipTickSpeed,
  TICKS_PER_SECOND,
  type MainToWorker,
  type SimSnapshot,
  type SkipTarget,
  type WorkerToMain,
} from './protocol';
import { networkHealthPct } from './reliability/ageing';
import { callHandlingView, forecastStorms } from './reliability/stormprep';
import { safetyEngagement, safetyView } from './reliability/safety';
import { orgView } from './events/directorates';
import { openClaims } from './events/litigation';
import { advanceGoals, GOALS, goalStatus, type GoalView } from './scenario/goals';
import { advanceMission, missionOf, missionView } from './scenario/missions';
import { securityKey, securityOf } from './security';
import {
  applyGrowth,
  deserialize,
  isSaveData,
  newContext,
  newGame,
  seedScenario,
  serialize,
  type GameState,
  type SaveData,
} from './state';
import { loadScenarioData } from '../data/scenarioData';
import { BillHistory, bandsOf } from './billHistory';
import { describeCommand } from './describeCommand';
import { computeBalance } from './balance';
import { forecastCatchments } from './forecast';
import { planReinforcement, proposeLoop } from './planner';
import { connectionStudy } from './study';
import { buildDemandField } from './map/demand';
import {
  advanceTime,
  billDetailRows,
  currentPeriodActuals,
  derive,
  deriveKey,
  solveTick,
  weatherView,
  type Derived,
} from './tick';

const AUTOSAVE_TICKS = 120; // every 30 real seconds

let state: GameState = newGame();
let ctx = newContext();
let derived: Derived | undefined;
let running = false;

// undo/redo: full snapshots, taken before every mutating player command.
// `undoLabels` runs parallel to `undoStack` (same length, same order) —
// one human label per snapshot, for the undo history list (#27).
const UNDO_DEPTH = 20;
const undoStack: SaveData[] = [];
const undoLabels: string[] = [];
const redoStack: SaveData[] = [];
const redoLabels: string[] = [];

// bill-over-time history (#28): sampled per game-day, worker-local chart
// data (rebuilt after a load, like the inspector sparkline `history`).
const billHistory = new BillHistory();

function restore(data: SaveData): void {
  // a data-backed scenario's artifact is preloaded before any restore (the
  // undo/redo + load paths all await it first), so newContext's sync build()
  // finds its CityData. London/missions are code-drawn — no preload needed.
  state = deserialize(data);
  ctx = newContext(state.scenarioId);
  applyGrowth(ctx.map, state.growth);
  ctx.demand = buildDemandField(ctx.map);
  derived = undefined;
  postedSecurityKey = undefined; // deserialize resets assetsVersion: re-post
}

function post(msg: WorkerToMain): void {
  self.postMessage(msg);
}

function ensureDerived(): Derived {
  if (!derived || derived.version !== deriveKey(state)) {
    derived = derive(state, ctx);
  }
  return derived;
}

/** Map markers (angry bubbles) for the renderer, stable-ordered. */
function buildSites(s: GameState): SimSnapshot['sites'] {
  const sites: SimSnapshot['sites'] = [];
  for (const a of s.applications) {
    if (a.status === 'open') {
      sites.push({ x: a.x, y: a.y, icon: 'application', label: a.name });
    } else if (a.status === 'appeal') {
      // under council determination: still a pending site on the map
      sites.push({ x: a.x, y: a.y, icon: 'application', label: a.name });
    } else if (a.status === 'firm' || a.status === 'flex') {
      if (a.connectByMin !== undefined && s.simTimeMin > a.connectByMin) {
        sites.push({ x: a.x, y: a.y, icon: 'overdue', label: a.name });
      } else if (a.assetId === undefined) {
        // accepted load site waiting on wires
        sites.push({ x: a.x, y: a.y, icon: 'building', label: a.name });
      }
    }
  }
  for (const t of s.tenders) {
    if (t.status !== 'open') continue;
    sites.push({ x: t.x, y: t.y, icon: 'tender', label: `${GENS[t.gen].name} tender` });
  }
  for (const a of s.assets.values()) {
    if (a.kind === 'gen' && a.developer !== undefined && underConstruction(a, s.simTimeMin)) {
      sites.push({ x: a.x, y: a.y, icon: 'building', label: GENS[a.gen].name });
    }
  }
  return sites;
}

// performance history for the inspector's sparkline: per-asset samples on
// a 30-game-minute grid (worker-local; rebuilt after load — it's a chart,
// not game state)
const HIST_STEP_MIN = 30;
const HIST_KEEP = 96; // two game-days
const history = new Map<number, Array<[number, number, number]>>(); // [tMin, MW, capMW]
let lastHistMin = -1;

function sampleHistory(out: ReturnType<typeof solveTick>): void {
  const slot = Math.floor(state.simTimeMin / HIST_STEP_MIN);
  if (slot === lastHistMin) return;
  lastHistMin = slot;
  const seen = new Set<number>();
  for (const b of out.branches) {
    // a sub's first tx pair / a line's own branch is its headline series
    if (seen.has(b.assetId)) continue;
    seen.add(b.assetId);
    const arr = history.get(b.assetId) ?? [];
    arr.push([state.simTimeMin, Math.abs(b.flowMW), b.ratingMW]);
    if (arr.length > HIST_KEEP) arr.shift();
    history.set(b.assetId, arr);
  }
  for (const [id, mw] of out.dispatch.genMW) {
    const a = state.assets.get(id);
    if (!a || a.kind !== 'gen') continue;
    const arr = history.get(id) ?? [];
    arr.push([state.simTimeMin, Math.abs(mw), a.mw ?? GENS[a.gen].capacityMW]);
    if (arr.length > HIST_KEEP) arr.shift();
    history.set(id, arr);
  }
}

let watchedAsset: number | undefined;

// N-1 security rides the snapshot only when its inputs (assets/outages)
// changed; the heavy lifting is memoized inside securityOf anyway.
let postedSecurityKey: string | undefined;

function securityForSnapshot(): Array<[number, boolean]> | undefined {
  const key = securityKey(state);
  if (key === postedSecurityKey) return undefined;
  postedSecurityKey = key;
  return [...securityOf(state).entries()].map(([id, e]): [number, boolean] => [id, e.secure]);
}

// --- goal ladder -------------------------------------------------------------

/** A connection study ran this session (transient — feeds one goal). */
let studyRan = false;

/** Goal-predicate view straight off game state + this tick's outputs;
 *  built per tick (skip loop) without paying for a full snapshot. The
 *  ladder must see identical inputs whether a tick ran live (step →
 *  makeSnapshot) or inside a skip, or skipping would not be replayable. */
function goalViewOf(out: ReturnType<typeof solveTick>): GoalView {
  return {
    assets: [...state.assets.values()],
    events: state.events,
    councils: [...state.councils.entries()],
    stats: {
      servedCustomers: out.servedCustomers,
      connectedMW: out.dispatch.connectedMW,
    },
    inbox: { tenders: state.tenders },
    studyRan,
  };
}

function makeSnapshot(accumulate: boolean): SimSnapshot {
  const d = ensureDerived();
  const out = solveTick(state, ctx, d, accumulate);
  if (accumulate) {
    sampleHistory(out);
    billHistory.sample(state.simTimeMin, bandsOf(out.bill));
  }
  // advance the goal ladder BEFORE assembling the snapshot so the
  // completion event and the next rung both ride this same post
  const view = goalViewOf(out);
  advanceGoals(state, view);
  // missions: scripted beats + the win check ride the same cadence
  if (missionOf(state.scenarioId)) {
    advanceMission(state, missionView(state, out, d.service.totalCustomers));
  }
  return {
    tick: state.tick,
    simTimeMin: state.simTimeMin,
    speed: state.speed,
    scenarioId: state.scenarioId,
    missionComplete: state.missionComplete,
    assets: [...state.assets.values()],
    branches: out.branches,
    volts: out.volts,
    coverage: out.coverage,
    genMW: [...out.dispatch.genMW.entries()],
    soc: [...state.soc.entries()],
    stats: {
      totalCustomers: d.service.totalCustomers,
      servedCustomers: out.servedCustomers,
      totalDemandMW: d.service.totalDemandMW,
      connectedMW: out.dispatch.connectedMW,
      servedMW: out.dispatch.servedMW,
      costKPerHour: out.dispatch.costKPerHour,
      priceMWh: out.dispatch.priceMWh,
      carbonG: state.carbonEMA,
      curtailedFirmMWh: state.curtailedFirmMWh,
      curtailedFlexMWh: state.curtailedFlexMWh,
      freqHz: out.freqHz,
      satisfactionAvg: out.satisfactionAvg,
      networkHealthPct: networkHealthPct(state),
    },
    weather: weatherView(state, ctx.profile.weather),
    bill: out.bill,
    fleet: {
      vans: state.vans.map((v) => ({
        id: v.id,
        x: v.x,
        y: v.y,
        busy: v.jobBranch !== undefined,
      })),
      fleetSize: state.fleetSize,
      vegPolicy: state.vegPolicy,
      jobs: [...state.jobs.values()].map((j) => ({
        x: j.x,
        y: j.y,
        label: j.label,
        assetId: j.assetId,
        staffed: state.vans.some((v) => v.jobBranch === j.branchId),
      })),
    },
    watch:
      watchedAsset !== undefined && history.has(watchedAsset)
        ? { assetId: watchedAsset, series: [...(history.get(watchedAsset) ?? [])] }
        : undefined,
    kpis: {
      ...kpiRates(state.reliability, d.service.totalCustomers, state.simTimeMin),
      worstVegPct: Math.max(0, ...[...state.lineVeg.values()]) * 100,
    },
    events: state.events,
    undoDepth: undoStack.length,
    redoDepth: redoStack.length,
    undoLabels: [...undoLabels],
    billHistory: billHistory.view(),
    sites: buildSites(state),
    growth: state.growth.map((g) => ({ ...g })),
    inbox: {
      applications: state.applications.map((a) => ({ ...a })),
      tenders: state.tenders.map((t) => ({ ...t, bids: t.bids.map((b) => ({ ...b })) })),
      pitches: state.pitches.map((p) => ({ ...p })),
      tech: { ...state.tech },
      innovationFundK: state.innovationFundK,
      levyPct: state.levyPct,
    },
    councils: [...state.councils.entries()].map(([k, c]) => [k, { ...c }]),
    security: securityForSnapshot(),
    catchments: [...d.service.peakOfSub.entries()].map(([id, peak]) => {
      const a = state.assets.get(id);
      return [id, peak, a && a.kind === 'sub' ? subMva(a) : 0] as [number, number, number];
    }),
    stormForecast: forecastStorms(state),
    callHandling: callHandlingView(
      state,
      Math.max(0, (state.everServedCustomers ?? 0) - out.servedCustomers),
    ),
    org: orgView(state.org, safetyEngagement(state.org?.safety ?? 0)),
    safety: safetyView(state),
    claims: openClaims(state),
    goal: goalStatus(state.goalIndex ?? 0, view),
    riio: {
      index: state.period.index,
      elapsedMin: Math.max(0, state.simTimeMin - state.period.startMin),
      targets: { ...state.period.targets },
      current: currentPeriodActuals(state),
      lastReport: state.lastReport,
      regulatory: out.regulatory,
    },
  };
}

// --- time-skip ---------------------------------------------------------------

let skipping = false;

/** Post a progress snapshot every 2 game-hours of a skip. */
const SKIP_POST_EVERY_MIN = 120;

/** Fast-forward to the skip target by running ordinary ticks back to
 *  back (advanceTime + accumulating solveTick at 16x-equivalent speed,
 *  downshifting to land exactly) — deterministically identical to
 *  playing the same ticks live. Any new 'bad' event aborts; an
 *  event-skip also stops on 'warn' (that arrival is the destination). */
function runSkip(to: SkipTarget): void {
  skipping = true;
  const prevSpeed = state.speed;
  try {
    const target = skipTargetMin(state.simTimeMin, to);
    let lastPostMin = state.simTimeMin;
    for (let ticks = 0; state.simTimeMin < target && ticks < MAX_SKIP_TICKS; ticks++) {
      state.speed = skipTickSpeed(state.simTimeMin, target);
      const seqBefore = state.eventSeq;
      advanceTime(state);
      const d = ensureDerived();
      const out = solveTick(state, ctx, d, true);
      sampleHistory(out);
      billHistory.sample(state.simTimeMin, bandsOf(out.bill));
      advanceGoals(state, goalViewOf(out));
      if (missionOf(state.scenarioId)) {
        advanceMission(state, missionView(state, out, d.service.totalCustomers));
      }
      if (skipAborts(state.events, seqBefore, to)) break;
      if (state.simTimeMin - lastPostMin >= SKIP_POST_EVERY_MIN && state.simTimeMin < target) {
        lastPostMin = state.simTimeMin;
        post({ type: 'snapshot', snapshot: makeSnapshot(false) });
      }
    }
  } finally {
    state.speed = prevSpeed;
    skipping = false;
  }
  post({ type: 'snapshot', snapshot: makeSnapshot(false) });
  post({ type: 'saveData', data: serialize(state) });
}

function step(): void {
  try {
    // a running skip owns the clock: the interval must not double-advance
    if (skipping || state.speed === 0) return;
    advanceTime(state);
    post({ type: 'snapshot', snapshot: makeSnapshot(true) });
    if (state.tick % AUTOSAVE_TICKS === 0) {
      post({ type: 'saveData', data: serialize(state) });
    }
  } catch (err) {
    state.speed = 0;
    post({
      type: 'fatal',
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
  }
}

async function start(save: unknown): Promise<void> {
  if (isSaveData(save)) {
    try {
      // a Paris (or any data-backed) save rebuilds its map from scenarioId, so
      // its lazily-imported artifact must be loaded BEFORE newContext's sync
      // build(). Await it off the save's own scenario tag (absent ⇒ london ⇒
      // no-op). A failed import falls through to the catch → fresh game.
      await loadScenarioData(save.scenarioId ?? 'london');
      state = deserialize(save);
      // town growth mutated the saved game's map: replay it onto a
      // fresh copy so demand and service areas match the save
      ctx = newContext(state.scenarioId);
      applyGrowth(ctx.map, state.growth);
      ctx.demand = buildDemandField(ctx.map);
      derived = undefined;
    } catch {
      state = newGame(); // corrupt save / failed artifact: start fresh rather than die
    }
  }
  // a loaded game starts with empty chart/undo history (worker-local, not
  // serialized) — they rebuild as play continues
  billHistory.clear();
  undoStack.length = 0;
  undoLabels.length = 0;
  redoStack.length = 0;
  redoLabels.length = 0;
  post({ type: 'snapshot', snapshot: makeSnapshot(false) });
  if (running) return;
  running = true;
  setInterval(step, 1000 / TICKS_PER_SECOND);
}

// Messages are handled in strict arrival order even though some handlers
// (start/newGame) await a lazy artifact import: chain each onto the last so a
// 'command' can never overtake the 'newGame' that must build its map first.
// For London/missions every await is a no-op, so this just preserves the old
// sequential behaviour.
let msgChain: Promise<void> = Promise.resolve();
self.onmessage = (e: MessageEvent<MainToWorker>) => {
  const msg = e.data;
  msgChain = msgChain.then(() => handleMessage(msg));
};

async function handleMessage(msg: MainToWorker): Promise<void> {
  try {
    switch (msg.type) {
      case 'ping':
        post({ type: 'pong', t: msg.t });
        break;
      case 'start':
        await start(msg.save);
        break;
      case 'newGame': {
        const scenarioId = msg.scenarioId ?? 'london';
        // a data-backed city must have its artifact loaded before the sync
        // build() inside newGame/newContext (no-op for london/missions).
        await loadScenarioData(scenarioId);
        state = newGame(scenarioId);
        ctx = newContext(scenarioId); // shed any previous run's growth mutations
        const mission = missionOf(scenarioId);
        if (mission) {
          // missions run their own step strip + win predicate: park the
          // London goal ladder and skip the London-only seeding (iDNO
          // estates, existing plants, starter applications)
          state.goalIndex = GOALS.length;
          mission.seed?.(state, ctx);
        } else {
          seedScenario(state, ctx);
        }
        derived = undefined;
        history.clear();
        billHistory.clear();
        lastHistMin = -1;
        studyRan = false;
        postedSecurityKey = undefined;
        undoStack.length = 0; // a fresh scenario must not undo into the old one
        undoLabels.length = 0;
        redoStack.length = 0;
        post({ type: 'snapshot', snapshot: makeSnapshot(false) });
        post({ type: 'saveData', data: serialize(state) });
        break;
      }
      case 'forecast':
        post({ type: 'forecast', rows: forecastCatchments(state, ctx) });
        break;
      case 'balance':
        post({ type: 'balance', report: computeBalance(state, ctx, msg.season ?? 'today') });
        break;
      case 'plan':
        // planner works on clones only — the live state never moves
        post({ type: 'plan', plan: planReinforcement(state, ctx, msg.scopeId) });
        break;
      case 'proposeLoop':
        post({ type: 'plan', plan: proposeLoop(state, ctx, msg.subId) });
        break;
      case 'study': {
        const app = state.applications.find((x) => x.id === msg.appId);
        if (app) {
          studyRan = true; // the goal ladder counts any study as run
          post({ type: 'study', study: connectionStudy(state, ctx, app) });
        }
        break;
      }
      case 'skip':
        if (!skipping) runSkip(msg.to);
        break;
      case 'billDetail':
        // itemise on demand off the state's EMA maps / asset register —
        // read-only, so paused inspection changes nothing
        post({ type: 'billDetail', line: msg.line, rows: billDetailRows(state, msg.line) });
        break;
      case 'undoTo': {
        // step undo `depth` times in one message — byte-for-byte identical
        // to pressing the undo button `depth` times (each step pushes the
        // current state onto redo, then restores the popped snapshot), so
        // a later redo walks forward exactly as it would have.
        const depth = Math.min(Math.max(1, Math.floor(msg.depth)), undoStack.length);
        for (let i = 0; i < depth; i++) {
          const data = undoStack.pop();
          if (!data) break;
          const label = undoLabels.pop() ?? 'action';
          redoStack.push(serialize(state));
          redoLabels.push(label);
          restore(data);
        }
        post({ type: 'snapshot', snapshot: makeSnapshot(false) });
        post({ type: 'saveData', data: serialize(state) });
        break;
      }
      case 'requestSlotSave':
        // a named-slot save (#34): tag it so the bridge routes the payload
        // to the slot writer, not the autosave
        post({ type: 'saveData', data: serialize(state), forSlot: true });
        break;
      case 'skipGoals':
        // dismiss the ladder for good: park the index past the end
        state.goalIndex = GOALS.length;
        post({ type: 'snapshot', snapshot: makeSnapshot(false) });
        post({ type: 'saveData', data: serialize(state) });
        break;
      case 'watch':
        watchedAsset = msg.assetId;
        // answer immediately so the sparkline appears even while paused
        if (msg.assetId !== undefined) {
          post({ type: 'snapshot', snapshot: makeSnapshot(false) });
        }
        break;
      case 'command': {
        if (msg.cmd.type === 'undo' || msg.cmd.type === 'redo') {
          const isUndo = msg.cmd.type === 'undo';
          const from = isUndo ? undoStack : redoStack;
          const fromLabels = isUndo ? undoLabels : redoLabels;
          const to = isUndo ? redoStack : undoStack;
          const toLabels = isUndo ? redoLabels : undoLabels;
          const data = from.pop();
          if (!data) {
            post({ type: 'cmdResult', seq: msg.seq, ok: false, error: `nothing to ${msg.cmd.type}` });
            break;
          }
          // the popped action's label moves to the other stack with the
          // snapshot of where we're coming from
          const label = fromLabels.pop() ?? 'action';
          to.push(serialize(state));
          toLabels.push(label);
          restore(data);
          post({ type: 'cmdResult', seq: msg.seq, ok: true });
          post({ type: 'snapshot', snapshot: makeSnapshot(false) });
          post({ type: 'saveData', data: serialize(state) });
          break;
        }
        const mutating = msg.cmd.type !== 'setSpeed';
        let label = '';
        if (mutating) {
          label = describeCommand(msg.cmd, state);
          undoStack.push(serialize(state));
          undoLabels.push(label);
          if (undoStack.length > UNDO_DEPTH) {
            undoStack.shift();
            undoLabels.shift();
          }
        }
        const result = applyCommand(state, ctx.map, msg.cmd);
        if (mutating) {
          if (result.ok) {
            redoStack.length = 0;
            redoLabels.length = 0;
          } else {
            undoStack.pop(); // nothing changed: don't burn an undo slot
            undoLabels.pop();
          }
        }
        post({ type: 'cmdResult', seq: msg.seq, ...result });
        post({ type: 'snapshot', snapshot: makeSnapshot(false) });
        if (result.ok && mutating) {
          post({ type: 'saveData', data: serialize(state) });
        }
        break;
      }
      case 'requestSave':
        post({ type: 'saveData', data: serialize(state) });
        break;
      case '__crashTest':
        // DEV/TEST ONLY: prove the crash-capture path end-to-end. Guarded so
        // it can never fire in a production build. The throw is caught below
        // and posted as a 'fatal' the bridge captures (source:'worker').
        if (import.meta.env.DEV) {
          throw new Error('__crashTest: deliberate sim worker crash');
        }
        break;
    }
  } catch (err) {
    post({
      type: 'fatal',
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
  }
}

// Top-level safety net: an exception that escapes the message handler (e.g.
// inside the setInterval tick before step()'s own try, or an async reject)
// would otherwise vanish or only hit worker.onerror without a stack. Catch it
// here and post a structured report the bridge captures for self-heal.
self.addEventListener('error', (ev: ErrorEvent) => {
  const err = ev.error as unknown;
  post({
    type: 'error',
    message: (err instanceof Error && err.message) || ev.message || 'worker error',
    stack: err instanceof Error ? err.stack : undefined,
    kind: 'self.onerror',
  });
});
self.addEventListener('unhandledrejection', (ev: PromiseRejectionEvent) => {
  const reason = ev.reason as unknown;
  post({
    type: 'error',
    message:
      reason instanceof Error
        ? reason.message
        : typeof reason === 'string'
          ? reason
          : 'worker unhandled rejection',
    stack: reason instanceof Error ? reason.stack : undefined,
    kind: 'unhandledrejection',
  });
});

export {};
