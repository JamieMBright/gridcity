import { create } from 'zustand';
import type { GenType, LineBuild, SubType } from '../sim/catalog';
import type { VoltageLevel } from '../sim/grid/types';
import type { SimSnapshot } from '../sim/protocol';
import type { TileHover } from '../render/MapRenderer';

export type WorkerStatus = 'connecting' | 'ready' | 'error';

export type Tool =
  | { t: 'inspect' }
  | { t: 'gen'; gen: GenType }
  | { t: 'sub'; sub: SubType }
  | { t: 'depot' }
  | { t: 'line'; level: VoltageLevel; build: LineBuild; fromAssetId?: number | undefined }
  | { t: 'demolish' };

export interface GhostInfo {
  label: string;
  /** Quoted capex, £k. */
  capexK: number;
  /** Estimated bill impact, £/customer/yr (undefined before anyone served). */
  billImpactYr: number | undefined;
  ok: boolean;
  error?: string | undefined;
}

interface AppState {
  workerStatus: WorkerStatus;
  workerError: string | undefined;
  snapshot: SimSnapshot | undefined;
  hoveredTile: TileHover | undefined;
  tool: Tool;
  gridView: boolean;
  ghostInfo: GhostInfo | undefined;
  toast: string | undefined;
  /** Camera jump request (alert click); seq forces re-trigger. */
  panTarget: { x: number; y: number; seq: number } | undefined;
  setWorkerStatus: (status: WorkerStatus, error?: string) => void;
  setSnapshot: (snapshot: SimSnapshot) => void;
  setHoveredTile: (tile: TileHover | undefined) => void;
  setTool: (tool: Tool) => void;
  setGridView: (on: boolean) => void;
  setGhostInfo: (info: GhostInfo | undefined) => void;
  setToast: (msg: string | undefined) => void;
  requestPan: (x: number, y: number) => void;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const useAppStore = create<AppState>((set) => ({
  workerStatus: 'connecting',
  workerError: undefined,
  snapshot: undefined,
  hoveredTile: undefined,
  tool: { t: 'inspect' },
  gridView: false,
  ghostInfo: undefined,
  toast: undefined,
  panTarget: undefined,
  setWorkerStatus: (workerStatus, workerError) => set({ workerStatus, workerError }),
  setSnapshot: (snapshot) => set({ snapshot }),
  setHoveredTile: (hoveredTile) => set({ hoveredTile }),
  setTool: (tool) => set({ tool }),
  setGridView: (gridView) => set({ gridView }),
  setGhostInfo: (ghostInfo) => set({ ghostInfo }),
  setToast: (toast) => {
    set({ toast });
    if (toastTimer) clearTimeout(toastTimer);
    if (toast) toastTimer = setTimeout(() => set({ toast: undefined }), 3500);
  },
  requestPan: (x, y) =>
    set((s) => ({ panTarget: { x, y, seq: (s.panTarget?.seq ?? 0) + 1 } })),
}));
