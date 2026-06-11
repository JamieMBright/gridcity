// The simulation worker: owns authoritative game state, advances it on a
// fixed timer, applies player commands, and streams snapshots to the main
// thread. Any uncaught error pauses the sim and surfaces instead of
// crashing the tab.

import { applyCommand } from './commands';
import {
  TICKS_PER_SECOND,
  type MainToWorker,
  type SimSnapshot,
  type WorkerToMain,
} from './protocol';
import {
  deserialize,
  newContext,
  newGame,
  serialize,
  type GameState,
  type SaveData,
} from './state';
import { advanceTime, derive, solveTick, weatherView, type Derived } from './tick';

const AUTOSAVE_TICKS = 120; // every 30 real seconds

let state: GameState = newGame();
const ctx = newContext();
let derived: Derived | undefined;
let running = false;

function post(msg: WorkerToMain): void {
  self.postMessage(msg);
}

function ensureDerived(): Derived {
  if (!derived || derived.version !== state.assetsVersion) {
    derived = derive(state, ctx);
  }
  return derived;
}

function makeSnapshot(accumulate: boolean): SimSnapshot {
  const d = ensureDerived();
  const out = solveTick(state, ctx, d, accumulate);
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
      curtailedMWh: state.curtailedMWh,
      freqHz: out.freqHz,
    },
    weather: weatherView(state),
    bill: out.bill,
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

function isSaveData(d: unknown): d is SaveData {
  if (typeof d !== 'object' || d === null) return false;
  const v = (d as { v?: unknown }).v;
  return v === 1 || v === 2;
}

function start(save: unknown): void {
  if (isSaveData(save)) {
    try {
      state = deserialize(save);
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
      case 'command': {
        const result = applyCommand(state, ctx.map, msg.cmd);
        post({ type: 'cmdResult', seq: msg.seq, ...result });
        post({ type: 'snapshot', snapshot: makeSnapshot(false) });
        if (result.ok && msg.cmd.type !== 'setSpeed') {
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
