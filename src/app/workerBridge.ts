import { localStorageStore } from '../persistence/localStorageStore';
import type { Command } from '../sim/commands';
import type { MainToWorker, SimSpeed, WorkerToMain } from '../sim/protocol';
import { useAppStore } from './store';

let worker: Worker | undefined;
let seq = 0;

function send(msg: MainToWorker): void {
  worker?.postMessage(msg);
}

/** Spin up the sim worker, restore any save, and start streaming snapshots. */
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
        send({ type: 'start', save: localStorageStore.load() });
        break;
      case 'snapshot':
        s.setSnapshot(msg.snapshot);
        break;
      case 'cmdResult':
        if (!msg.ok && msg.error) s.setToast(msg.error);
        break;
      case 'saveData':
        localStorageStore.store(msg.data);
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
