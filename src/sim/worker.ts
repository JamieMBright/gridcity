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
        staffed: state.vans.some((v) => v.jobBranch === j.branchId),
      })),
    },
    kpis: {
      ...kpiRates(state.reliability, d.service.totalCustomers, state.simTimeMin),
      worstVegPct: Math.max(0, ...[...state.lineVeg.values()]) * 100,
    },
    events: state.events,
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
        post({ type: 'snapshot', snapshot: makeSnapshot(false) });
        post({ type: 'saveData', data: serialize(state) });
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
