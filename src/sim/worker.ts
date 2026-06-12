// The simulation worker: owns authoritative game state, advances it on a
// fixed timer, applies player commands, and streams snapshots to the main
// thread. Any uncaught error pauses the sim and surfaces instead of
// crashing the tab.

import { applyCommand } from './commands';
import { GENS } from './catalog';
import { underConstruction } from './market/dispatch';
import { kpiRates } from './regulation/kpis';
import {
  TICKS_PER_SECOND,
  type MainToWorker,
  type SimSnapshot,
  type WorkerToMain,
} from './protocol';
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
import { buildDemandField } from './map/demand';
import {
  advanceTime,
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

// undo/redo: full snapshots, taken before every mutating player command
const UNDO_DEPTH = 20;
const undoStack: SaveData[] = [];
const redoStack: SaveData[] = [];

function restore(data: SaveData): void {
  state = deserialize(data);
  ctx = newContext();
  applyGrowth(ctx.map, state.growth);
  ctx.demand = buildDemandField(ctx.map);
  derived = undefined;
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
    arr.push([state.simTimeMin, Math.abs(mw), GENS[a.gen].capacityMW]);
    if (arr.length > HIST_KEEP) arr.shift();
    history.set(id, arr);
  }
}

let watchedAsset: number | undefined;

function makeSnapshot(accumulate: boolean): SimSnapshot {
  const d = ensureDerived();
  const out = solveTick(state, ctx, d, accumulate);
  if (accumulate) sampleHistory(out);
  return {
    tick: state.tick,
    simTimeMin: state.simTimeMin,
    speed: state.speed,
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
    },
    weather: weatherView(state),
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
    riio: {
      index: state.period.index,
      elapsedMin: Math.max(0, state.simTimeMin - state.period.startMin),
      targets: { ...state.period.targets },
      current: currentPeriodActuals(state),
      lastReport: state.lastReport,
    },
  };
}

function step(): void {
  try {
    if (state.speed === 0) return;
    advanceTime(state);
    post({ type: 'snapshot', snapshot: makeSnapshot(true) });
    if (state.tick % AUTOSAVE_TICKS === 0) {
      post({ type: 'saveData', data: serialize(state) });
    }
  } catch (err) {
    state.speed = 0;
    post({ type: 'fatal', message: err instanceof Error ? err.message : String(err) });
  }
}

function start(save: unknown): void {
  if (isSaveData(save)) {
    try {
      state = deserialize(save);
      // town growth mutated the saved game's map: replay it onto a
      // fresh copy so demand and service areas match the save
      ctx = newContext();
      applyGrowth(ctx.map, state.growth);
      ctx.demand = buildDemandField(ctx.map);
      derived = undefined;
    } catch {
      state = newGame(); // corrupt save: start fresh rather than die
    }
  }
  post({ type: 'snapshot', snapshot: makeSnapshot(false) });
  if (running) return;
  running = true;
  setInterval(step, 1000 / TICKS_PER_SECOND);
}

self.onmessage = (e: MessageEvent<MainToWorker>) => {
  try {
    const msg = e.data;
    switch (msg.type) {
      case 'ping':
        post({ type: 'pong', t: msg.t });
        break;
      case 'start':
        start(msg.save);
        break;
      case 'newGame':
        state = newGame();
        ctx = newContext(); // shed any previous run's growth mutations
        seedScenario(state, ctx);
        derived = undefined;
        history.clear();
        lastHistMin = -1;
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
          const from = msg.cmd.type === 'undo' ? undoStack : redoStack;
          const to = msg.cmd.type === 'undo' ? redoStack : undoStack;
          const data = from.pop();
          if (!data) {
            post({ type: 'cmdResult', seq: msg.seq, ok: false, error: `nothing to ${msg.cmd.type}` });
            break;
          }
          to.push(serialize(state));
          restore(data);
          post({ type: 'cmdResult', seq: msg.seq, ok: true });
          post({ type: 'snapshot', snapshot: makeSnapshot(false) });
          post({ type: 'saveData', data: serialize(state) });
          break;
        }
        const mutating = msg.cmd.type !== 'setSpeed';
        if (mutating) {
          undoStack.push(serialize(state));
          if (undoStack.length > UNDO_DEPTH) undoStack.shift();
        }
        const result = applyCommand(state, ctx.map, msg.cmd);
        if (mutating) {
          if (result.ok) redoStack.length = 0;
          else undoStack.pop(); // nothing changed: don't burn an undo slot
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
    }
  } catch (err) {
    post({ type: 'fatal', message: err instanceof Error ? err.message : String(err) });
  }
};

export {};
