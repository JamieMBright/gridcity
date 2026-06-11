import { create } from 'zustand';
import type { SimSnapshot } from '../sim/protocol';
import type { TileHover } from '../render/MapRenderer';

export type WorkerStatus = 'connecting' | 'ready' | 'error';

interface AppState {
  workerStatus: WorkerStatus;
  workerError: string | undefined;
  snapshot: SimSnapshot | undefined;
  hoveredTile: TileHover | undefined;
  setWorkerStatus: (status: WorkerStatus, error?: string) => void;
  setSnapshot: (snapshot: SimSnapshot) => void;
  setHoveredTile: (tile: TileHover | undefined) => void;
}

export const useAppStore = create<AppState>((set) => ({
  workerStatus: 'connecting',
  workerError: undefined,
  snapshot: undefined,
  hoveredTile: undefined,
  setWorkerStatus: (workerStatus, workerError) => set({ workerStatus, workerError }),
  setSnapshot: (snapshot) => set({ snapshot }),
  setHoveredTile: (hoveredTile) => set({ hoveredTile }),
}));
