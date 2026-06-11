import type { MainToWorker, SimSpeed, WorkerToMain } from '../sim/protocol';
import { useAppStore } from './store';

let worker: Worker | undefined;

function send(msg: MainToWorker): void {
  worker?.postMessage(msg);
}

/** Spin up the sim worker, verify it responds, and start streaming snapshots. */
export function initWorker(): void {
  if (worker) return;
  worker = new Worker(new URL('../sim/worker.ts', import.meta.url), { type: 'module' });

  const store = useAppStore.getState();

  worker.onerror = (e) => {
    store.setWorkerStatus('error', e.message);
  };

  worker.onmessage = (e: MessageEvent<WorkerToMain>) => {
    const msg = e.data;
    switch (msg.type) {
      case 'pong':
        useAppStore.getState().setWorkerStatus('ready');
        send({ type: 'start' });
        break;
      case 'snapshot':
        useAppStore.getState().setSnapshot(msg.snapshot);
        break;
      case 'fatal':
        useAppStore.getState().setWorkerStatus('error', msg.message);
        break;
    }
  };

  send({ type: 'ping', t: performance.now() });
}

export function setSimSpeed(speed: SimSpeed): void {
  send({ type: 'setSpeed', speed });
}
