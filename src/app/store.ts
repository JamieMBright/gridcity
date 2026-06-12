import { create } from 'zustand';
import type { GenType, LineBuild, SubType } from '../sim/catalog';
import type { VoltageLevel } from '../sim/grid/types';
import type { SimSnapshot } from '../sim/protocol';
import type { ConnectionStudy } from '../sim/study';
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
  /** Inspect-click pins a card for an asset / a line span; cleared by
   *  ×, Escape, clicking empty ground, or arming another tool. */
  selectedAsset: number | undefined;
  selectedLine: number | undefined;
  /** Where on the line the inspect click landed (tile space) — picks
   *  the span for section undergrounding. */
  selectedLineAt: { x: number; y: number } | undefined;
  /** Placing a substation auto-runs circuits to the nearest compatible
   *  bays (palette setting). */
  autoConnect: boolean;
  gridView: boolean;
  ghostInfo: GhostInfo | undefined;
  toast: string | undefined;
  /** Camera jump request (alert click); seq forces re-trigger. */
  panTarget: { x: number; y: number; seq: number } | undefined;
  /** A contract pin was clicked: snap the inbox to its message. */
  inboxFocus: { x: number; y: number; seq: number } | undefined;
  /** Connection studies by application id (worker-computed). */
  studies: Record<number, ConnectionStudy>;
  menuOpen: boolean;
  /** Current tutorial step index, or undefined when not in the tutorial. */
  tutorialStep: number | undefined;
  kpiOpen: boolean;
  setWorkerStatus: (status: WorkerStatus, error?: string) => void;
  setSnapshot: (snapshot: SimSnapshot) => void;
  setHoveredTile: (tile: TileHover | undefined) => void;
  setTool: (tool: Tool) => void;
  setSelected: (sel: {
    assetId?: number | undefined;
    lineId?: number | undefined;
    at?: { x: number; y: number } | undefined;
  }) => void;
  setAutoConnect: (on: boolean) => void;
  setGridView: (on: boolean) => void;
  setGhostInfo: (info: GhostInfo | undefined) => void;
  setToast: (msg: string | undefined) => void;
  requestPan: (x: number, y: number) => void;
  requestInboxFocus: (x: number, y: number) => void;
  setStudy: (study: ConnectionStudy) => void;
  setMenuOpen: (open: boolean) => void;
  setTutorialStep: (step: number | undefined) => void;
  setKpiOpen: (open: boolean) => void;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

/** Peak observed loading per line asset id (|flow|/rating, 0..1+),
 *  tracked client-side since the session loaded — the inspector's
 *  "how loaded does it GET" number. */
export const linePeaks = new Map<number, number>();

export const useAppStore = create<AppState>((set) => ({
  workerStatus: 'connecting',
  workerError: undefined,
  snapshot: undefined,
  hoveredTile: undefined,
  tool: { t: 'inspect' },
  selectedAsset: undefined,
  selectedLine: undefined,
  selectedLineAt: undefined,
  autoConnect: false,
  gridView: false,
  ghostInfo: undefined,
  toast: undefined,
  panTarget: undefined,
  inboxFocus: undefined,
  studies: {},
  menuOpen: true,
  tutorialStep: undefined,
  kpiOpen: false,
  setWorkerStatus: (workerStatus, workerError) => set({ workerStatus, workerError }),
  setSnapshot: (snapshot) => {
    for (const b of snapshot.branches) {
      if (b.kind !== 'line' || b.ratingMW <= 0) continue;
      const loading = Math.abs(b.flowMW) / b.ratingMW;
      if (loading > (linePeaks.get(b.assetId) ?? 0)) linePeaks.set(b.assetId, loading);
    }
    set({ snapshot });
  },
  setHoveredTile: (hoveredTile) => set({ hoveredTile }),
  // arming a different tool drops the pinned inspector card
  setTool: (tool) =>
    set((s) => ({
      tool,
      selectedAsset: tool.t === 'inspect' ? s.selectedAsset : undefined,
      selectedLine: tool.t === 'inspect' ? s.selectedLine : undefined,
      selectedLineAt: tool.t === 'inspect' ? s.selectedLineAt : undefined,
    })),
  setSelected: ({ assetId, lineId, at }) =>
    set({ selectedAsset: assetId, selectedLine: lineId, selectedLineAt: at }),
  setAutoConnect: (autoConnect) => set({ autoConnect }),
  setGridView: (gridView) => set({ gridView }),
  setGhostInfo: (ghostInfo) => set({ ghostInfo }),
  setToast: (toast) => {
    set({ toast });
    if (toastTimer) clearTimeout(toastTimer);
    if (toast) toastTimer = setTimeout(() => set({ toast: undefined }), 3500);
  },
  requestPan: (x, y) =>
    set((s) => ({ panTarget: { x, y, seq: (s.panTarget?.seq ?? 0) + 1 } })),
  requestInboxFocus: (x, y) =>
    set((s) => ({ inboxFocus: { x, y, seq: (s.inboxFocus?.seq ?? 0) + 1 } })),
  setStudy: (study) => set((s) => ({ studies: { ...s.studies, [study.appId]: study } })),
  setMenuOpen: (menuOpen) => set({ menuOpen }),
  setTutorialStep: (tutorialStep) => set({ tutorialStep }),
  setKpiOpen: (kpiOpen) => set({ kpiOpen }),
}));
