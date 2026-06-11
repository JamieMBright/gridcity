import { create } from 'zustand';
import type { SimSnapshot } from '../sim/protocol';

export type WorkerStatus = 'connecting' | 'ready' | 'error';

interface AppState {
  workerStatus: WorkerStatus;
  workerError: string | undefined;
  snapshot: SimSnapshot | undefined;
  setWorkerStatus: (status: WorkerStatus, error?: string) => void;
  setSnapshot: (snapshot: SimSnapshot) => void;
}

export const useAppStore = create<AppState>((set) => ({
  workerStatus: 'connecting',
  workerError: undefined,
  snapshot: undefined,
  setWorkerStatus: (workerStatus, workerError) => set({ workerStatus, workerError }),
  setSnapshot: (snapshot) => set({ snapshot }),
}));
