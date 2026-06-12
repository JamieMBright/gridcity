import { playSfx } from '../audio/audio';
import { pullCloudSave, pushCloudSave, submitScore } from '../online/cloud';
import { localStorageStore } from '../persistence/localStorageStore';
import type { Command } from '../sim/commands';
import type { MainToWorker, SimSpeed, SkipTarget, WorkerToMain } from '../sim/protocol';
import { isSaveData } from '../sim/state';
import { useAppStore } from './store';

let worker: Worker | undefined;
let seq = 0;
let lastEventSeq = 0;
let lastReportIndex = -1; // -1 = not yet initialized from the first snapshot

function send(msg: MainToWorker): void {
  worker?.postMessage(msg);
}

/** Pick whichever save has lived longer (cross-device source of truth). */
async function chooseSave(): Promise<unknown> {
  const local = localStorageStore.load();
  const cloud = await Promise.race([
    pullCloudSave().catch(() => undefined),
    new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 4000)),
  ]);
  if (!cloud) return local;
  if (!isSaveData(local)) return cloud;
  return cloud.tick >= local.tick ? cloud : local;
}

/** Spin up the sim worker, restore the best save, stream snapshots. */
export function initWorker(): void {
  if (worker) return;
  worker = new Worker(new URL('../sim/worker.ts', import.meta.url), { type: 'module' });

  const store = useAppStore.getState();

  worker.onerror = (e) => {
    store.setWorkerStatus('error', e.message);
  };

  worker.onmessage = (e: MessageEvent<WorkerToMain>) => {
    const msg = e.data;
    const s = useAppStore.getState();
    switch (msg.type) {
      case 'pong':
        s.setWorkerStatus('ready');
        void chooseSave().then((save) => send({ type: 'start', save }));
        break;
      case 'snapshot': {
        s.setSnapshot(msg.snapshot);
        // a snapshot arriving means any skip has finished (the worker
        // fast-forwards synchronously): re-enable the skip buttons
        if (s.skipping) s.setSkipping(false);
        // chime once per fresh bad-news event
        const fresh = msg.snapshot.events.filter(
          (ev) => ev.seq > lastEventSeq && ev.sev === 'bad',
        );
        if (lastEventSeq > 0 && fresh.length > 0) playSfx('chime');
        const lastEv = msg.snapshot.events[msg.snapshot.events.length - 1];
        if (lastEv) lastEventSeq = Math.max(lastEventSeq, lastEv.seq);
        // a freshly closed period goes to the leaderboard
        const reportIndex = msg.snapshot.riio.lastReport?.index ?? 0;
        if (lastReportIndex === -1) {
          lastReportIndex = reportIndex; // saves replay old reports: don't resubmit
        } else if (msg.snapshot.riio.lastReport && reportIndex > lastReportIndex) {
          lastReportIndex = reportIndex;
          submitScore(msg.snapshot.riio.lastReport);
        }
        break;
      }
      case 'cmdResult':
        if (!msg.ok && msg.error) {
          s.setToast(msg.error);
          playSfx('error');
        }
        break;
      case 'saveData':
        localStorageStore.store(msg.data);
        pushCloudSave(msg.data);
        break;
      case 'study':
        s.setStudy(msg.study);
        break;
      case 'balance':
        s.setBalance(msg.report);
        break;
      case 'plan':
        s.setPlan(msg.plan);
        break;
      case 'fatal':
        s.setWorkerStatus('error', msg.message);
        break;
    }
  };

  send({ type: 'ping', t: performance.now() });
}

export function sendCommand(cmd: Command): void {
  send({ type: 'command', seq: ++seq, cmd });
}

export function setSimSpeed(speed: SimSpeed): void {
  sendCommand({ type: 'setSpeed', speed });
}

/** Follow an asset's performance history (inspector sparkline). */
export function setWatch(assetId: number | undefined): void {
  send({ type: 'watch', assetId });
}

/** Ask the worker for a connection study of an open application. */
export function requestStudy(appId: number): void {
  send({ type: 'study', appId });
}

/** Fast-forward the sim to the next peak / morning / event. The store
 *  flag disables the HUD buttons until the worker's snapshot lands. */
export function requestSkip(to: SkipTarget): void {
  useAppStore.getState().setSkipping(true);
  send({ type: 'skip', to });
}

/** Dismiss the early-game goal ladder for good (chip click). */
export function skipGoalLadder(): void {
  send({ type: 'skipGoals' });
}

/** Ask the worker to cut a fresh grid-balance report. */
export function requestBalance(): void {
  send({ type: 'balance' });
}

/** Ask the worker for costed reinforcement options for a balance scope
 *  (council id, or -1 for the whole licence area). */
export function requestPlan(scopeId: number): void {
  send({ type: 'plan', scopeId });
}

/** Ring-main assist: ask the worker for the cheapest loop closing a
 *  service sub's radial (answered as a one-option plan). */
export function proposeLoop(subId: number): void {
  send({ type: 'proposeLoop', subId });
}

/** Wipe progress and start over (the worker posts a fresh save). */
export function newGameCommand(): void {
  send({ type: 'newGame' });
}
