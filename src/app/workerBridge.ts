import { playSfx } from '../audio/audio';
import { currentUser } from '../online/auth';
import { pullCloudSave, pushCloudSave, pushRank, submitScore, syncRank } from '../online/cloud';
import { localStorageStore } from '../persistence/localStorageStore';
import { pickSave } from '../persistence/saveStore';
import type { Command } from '../sim/commands';
import type {
  BillDetailLine,
  MainToWorker,
  SimSpeed,
  SkipTarget,
  WorkerToMain,
} from '../sim/protocol';
import { isSaveData } from '../sim/state';
import { computeStars, recordLessonResult } from '../ui/lessonProgress';
import { addPeriodResult } from '../ui/rank';
import { allLessonsDone, markTutorialComplete } from '../ui/tutorialGate';
import { captureError } from './errorLog';
import { useAppStore } from './store';

let worker: Worker | undefined;
let seq = 0;
let lastEventSeq = 0;
let lastReportIndex = -1; // -1 = not yet initialized from the first snapshot

function send(msg: MainToWorker): void {
  worker?.postMessage(msg);
}

/** Pick between the local and cloud copies (most recently saved wins —
 *  see pickSave; "longest played wins" resurrected old networks after a
 *  new game). */
async function chooseSave(): Promise<unknown> {
  const local = localStorageStore.load();
  const cloud = await Promise.race([
    pullCloudSave().catch(() => undefined),
    new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 4000)),
  ]);
  return pickSave(isSaveData(local) ? local : undefined, cloud);
}

/** Set by newGameCommand: the next save the worker posts is the fresh
 *  game and must overwrite the old cloud copy IMMEDIATELY — the
 *  debounced push dies on refresh, leaving the stale save to win the
 *  next boot's arbitration. */
let freshGamePending = false;

/** Spin up the sim worker, restore the best save, stream snapshots. */
export function initWorker(): void {
  if (worker) return;
  worker = new Worker(new URL('../sim/worker.ts', import.meta.url), { type: 'module' });

  // pull-merge the operator rank from the cloud for an already-signed-in
  // player (no-op for guests); best-effort.
  void syncRank();

  const store = useAppStore.getState();

  worker.onerror = (e) => {
    // a hard worker crash (module load / uncaught top-level): surface it AND
    // capture the traceback. ErrorEvent.error carries the Error in modern
    // browsers; fall back to filename:line when it doesn't.
    const err = (e as ErrorEvent).error as unknown;
    const message = (err instanceof Error && err.message) || e.message || 'sim worker error';
    const stack =
      err instanceof Error
        ? err.stack
        : e.filename
          ? `at ${e.filename}:${e.lineno ?? 0}:${e.colno ?? 0}`
          : undefined;
    captureError({ message: String(message), stack, source: 'worker' });
    store.setWorkerStatus('error', String(message));
  };

  // a structured-clone failure on a posted message (rare, but otherwise
  // vanishes): capture it so a bad snapshot payload is debuggable.
  worker.onmessageerror = (e) => {
    captureError({
      message: 'worker message could not be deserialized (structured clone failed)',
      source: 'worker',
      extra: { type: (e as MessageEvent).type },
    });
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
        // sync the scenario BEFORE storing the snapshot: a changed id
        // clears stale state, so order matters (the new snapshot must
        // survive the clear). Also covers booting straight into a saved
        // mission via 'continue'.
        const sid = msg.snapshot.scenarioId ?? 'london';
        if (s.scenarioId !== sid) s.setScenarioId(sid);
        if (msg.snapshot.missionComplete && sid !== 'london') {
          recordMissionComplete(sid);
          // finishing the LAST outstanding lesson completes the tutorial
          // sequence → latch the sticky flag that unlocks free play (the
          // CityPicker / "new game" gate). Cheap + idempotent.
          if (allLessonsDone()) markTutorialComplete();
          // grade the lesson off the completion snapshot: per-home network
          // charge, total assets, and whether anything ever ran hot. Both
          // recorders are idempotent / max-keeping, so re-firing each
          // sticky-complete snapshot is harmless (stars never downgrade).
          const snap = msg.snapshot;
          const hadOverload = snap.branches.some(
            (b) => b.ratingMW > 0 && Math.abs(b.flowMW) > b.ratingMW + 1e-6,
          );
          recordLessonResult(
            sid,
            computeStars({
              perCustomerDuosYr: snap.bill.perCustomerDuosYr,
              assetCount: snap.assets.length,
              hadOverload,
            }),
          );
        }
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
          // a closed period also advances the operator's career rank: fold
          // its composite into the local record. A tier increase flags a
          // promotion the UI celebrates; guests additionally get a gentle
          // "sign in to keep your rank" nudge (never blocks play).
          const outcome = addPeriodResult(msg.snapshot.riio.lastReport.composite);
          // sync the new career to the cloud (no-op for guests)
          void pushRank();
          if (outcome.rankedUp) {
            s.setRankUp(outcome.after);
            playSfx('chime');
            // only nudge guests — signed-in players already keep their rank
            void currentUser().then((u) => {
              if (!u) useAppStore.getState().setLoginNudge(true);
            });
          }
        }
        break;
      }
      case 'cmdResult':
        if (!msg.ok && msg.error) {
          s.setToast(msg.error);
          playSfx('error');
        }
        break;
      case 'saveData': {
        // stamp here, not in the worker: the sim stays wall-clock-free
        const stamped = { ...msg.data, savedAt: Date.now() };
        if (msg.forSlot) {
          // a named-slot save (#34): hand the payload to the pending slot
          // writer rather than the autosave / cloud slot 0
          const cb = slotSaveCb;
          slotSaveCb = undefined;
          cb?.(stamped);
          break;
        }
        localStorageStore.store(stamped);
        pushCloudSave(stamped, freshGamePending);
        freshGamePending = false;
        break;
      }
      case 'study':
        s.setStudy(msg.study);
        break;
      case 'balance':
        s.setBalance(msg.report);
        break;
      case 'forecast':
        s.setForecast(msg.rows);
        break;
      case 'plan':
        s.setPlan(msg.plan);
        break;
      case 'billDetail':
        s.setBillDetail({ line: msg.line, rows: msg.rows });
        break;
      case 'skipHalted':
        // a skip cut short on news (the following snapshot carries the event
        // itself): tell the player WHY it stopped, and chime as for bad news
        s.setToast(
          msg.reason
            ? `Skip stopped: ${msg.reason}`
            : `Skip stopped — ${msg.to === 'month' ? 'a major incident' : 'something'} needs you`,
        );
        playSfx('chime');
        break;
      case 'fatal':
        // an uncaught sim exception (the worker paused itself): surface to the
        // HUD AND capture the traceback so we can self-heal.
        captureError({
          message: msg.message,
          stack: msg.stack,
          source: 'worker',
          extra: { kind: 'fatal' },
        });
        s.setWorkerStatus('error', msg.message);
        break;
      case 'error':
        // a non-fatal in-worker error report (top-level handler caught it but
        // the sim can keep running): capture only, don't flip worker status.
        captureError({
          message: msg.message,
          stack: msg.stack,
          source: 'worker',
          extra: { kind: msg.kind ?? 'error' },
        });
        break;
    }
  };

  send({ type: 'ping', t: performance.now() });
}

export function sendCommand(cmd: Command): void {
  send({ type: 'command', seq: ++seq, cmd });
}

/** DEV/TEST ONLY: ask the worker to throw, exercising the crash-capture path
 *  (worker → 'fatal' → captureError(source:'worker')). The worker ignores
 *  this outside a dev build. Exposed via the window.__ec test hook. */
export function crashWorker(): void {
  send({ type: '__crashTest' });
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

/** Ask the worker for the 5-year demand-growth forecast. */
export function requestForecast(): void {
  send({ type: 'forecast' });
}

/** Ask the worker to cut a fresh grid-balance report. */
export function requestBalance(): void {
  send({ type: 'balance' });
}

/** Itemise one bill line (BillPanel tapped-row drill-down). */
export function requestBillDetail(line: BillDetailLine): void {
  send({ type: 'billDetail', line });
}

/** Undo back `depth` steps in one go (undo history list, #27). */
export function undoTo(depth: number): void {
  send({ type: 'undoTo', depth });
}

/** Trigger a manual autosave (the in-game menu's Save). The worker posts a
 *  normal `saveData` the bridge routes to localStorage + the cloud, exactly
 *  like the periodic autosave. */
export function requestSave(): void {
  send({ type: 'requestSave' });
}

/** Pending callback for the next named-slot save payload (#34). */
let slotSaveCb: ((data: unknown) => void) | undefined;

/** Capture the current SaveData for a named slot. The worker answers with a
 *  `forSlot`-tagged saveData, routed here instead of the autosave. */
export function captureSlotSave(cb: (data: unknown) => void): void {
  slotSaveCb = cb;
  send({ type: 'requestSlotSave' });
}

/** Load a named slot's SaveData into the running game (#34): the worker
 *  restores it like any save, then continues. */
export function loadSlotData(data: unknown): void {
  send({ type: 'start', save: data });
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

/** Wipe progress and start over (the worker posts a fresh save). Defaults to
 *  London; the city picker passes another scenario id (Paris…). Switching the
 *  store scenario tears down + rebuilds the renderer on the new map (MapView),
 *  and the worker rebuilds its authoritative map from the same id. */
export function newGameCommand(scenarioId = 'london'): void {
  useAppStore.getState().setScenarioId(scenarioId);
  freshGamePending = true;
  send(scenarioId === 'london' ? { type: 'newGame' } : { type: 'newGame', scenarioId });
}

// --- the tutorial campaign ---------------------------------------------------

/** Completed-mission ids (mission n+1 unlocks when n is in here). */
const CAMPAIGN_KEY = 'ec-campaign-v1';

export function completedMissions(): Set<string> {
  try {
    const raw = localStorage.getItem(CAMPAIGN_KEY);
    const arr: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

export function recordMissionComplete(id: string): void {
  try {
    const done = completedMissions();
    if (done.has(id)) return;
    done.add(id);
    localStorage.setItem(CAMPAIGN_KEY, JSON.stringify([...done]));
  } catch {
    // private mode: play on without campaign persistence
  }
}

/** Start (or restart) a campaign mission: swap the client map at once,
 *  then have the worker rebuild on the mission's scenario. */
export function startMission(scenarioId: string): void {
  useAppStore.getState().setScenarioId(scenarioId);
  freshGamePending = true;
  send({ type: 'newGame', scenarioId });
}
