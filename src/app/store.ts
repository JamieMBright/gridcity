import { create } from 'zustand';
import type { GenType, LineBuild, SubType } from '../sim/catalog';
import type { VoltageLevel } from '../sim/grid/types';
import type { BillDetailLine, BillDetailRow, SimSnapshot } from '../sim/protocol';
import type { BalanceReport } from '../sim/balance';
import type { ReinforcementPlan } from '../sim/planner';
import type { CatchmentForecast } from '../sim/forecast';
import type { ConnectionStudy } from '../sim/study';
import type { TileHover } from '../render/MapRenderer';

export type WorkerStatus = 'connecting' | 'ready' | 'error';

export type Tool =
  | { t: 'inspect' }
  | { t: 'gen'; gen: GenType }
  | { t: 'sub'; sub: SubType }
  | { t: 'depot' }
  | {
      t: 'line';
      level: VoltageLevel;
      build: LineBuild;
      fromAssetId?: number | undefined;
      /** Route vertices clicked between anchor and destination — each
       *  becomes a junction tower and the circuit bends through it. */
      waypoints?: Array<{ x: number; y: number }> | undefined;
    }
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
  /** The grid-balance report + panel state. */
  balance: BalanceReport | undefined;
  balanceOpen: boolean;
  /** Reinforcement options for one scope (worker-computed; the latest
   *  plan or loop proposal wins). */
  plan: ReinforcementPlan | undefined;
  /** Latest itemised bill-line breakdown (worker-computed on demand;
   *  BillPanel's tapped-row detail card). */
  billDetail: { line: BillDetailLine; rows: BillDetailRow[] } | undefined;
  /** Headroom heatmap toggle (corridors coloured by spare capacity). */
  headroom: boolean;
  /** N-1 security rings toggle. */
  n1: boolean;
  /** 5-year demand-growth forecast overlay. */
  forecastOn: boolean;
  forecast: CatchmentForecast[] | undefined;
  /** Council ring-fence highlight on the map (balance row click). */
  highlightCouncil: number | undefined;
  menuOpen: boolean;
  /** Current tutorial step index, or undefined when not in the tutorial.
   *  Drives the London step strip AND the active mission's steps. */
  tutorialStep: number | undefined;
  /** Active scenario id ('london' or a campaign mission); mirrors the
   *  worker's authoritative value via the snapshot. The renderer keys
   *  its map off this. */
  scenarioId: string;
  kpiOpen: boolean;
  /** The network-business panel (directorates + pay + safety, #53). */
  directoratesOpen: boolean;
  /** Undo history list panel (#27): the recent undo-able actions. */
  undoListOpen: boolean;
  /** Named save-slots panel (#34). */
  savesOpen: boolean;
  /** The HUD coach-mark tour is running (spotlight walkthrough). */
  tourActive: boolean;
  setTourActive: (on: boolean) => void;
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
  setBalance: (report: BalanceReport) => void;
  setBalanceOpen: (open: boolean) => void;
  setPlan: (plan: ReinforcementPlan | undefined) => void;
  setBillDetail: (d: { line: BillDetailLine; rows: BillDetailRow[] } | undefined) => void;
  setHeadroom: (on: boolean) => void;
  setN1: (on: boolean) => void;
  setForecastOn: (on: boolean) => void;
  setForecast: (rows: CatchmentForecast[]) => void;
  setHighlightCouncil: (id: number | undefined) => void;
  setMenuOpen: (open: boolean) => void;
  setTutorialStep: (step: number | undefined) => void;
  /** Switch scenario: a CHANGED id also drops the stale snapshot (the
   *  old map's assets must never draw over the new map). */
  setScenarioId: (id: string) => void;
  setKpiOpen: (open: boolean) => void;
  setDirectoratesOpen: (open: boolean) => void;
  setUndoListOpen: (open: boolean) => void;
  setSavesOpen: (open: boolean) => void;
  /** A time-skip is running on the worker (disables the HUD skip buttons
   *  until its final snapshot lands). */
  skipping: boolean;
  setSkipping: (skipping: boolean) => void;
  /** Collapse the desktop HUD/palette to the compact icon-rail look
   *  (owner: "allow collapses to happen on desktop mode too for a cleaner
   *  look"). Persisted to localStorage. Mobile is always compact and
   *  ignores this flag. */
  hudCollapsed: boolean;
  setHudCollapsed: (collapsed: boolean) => void;
}

const COLLAPSE_KEY = 'ec.hudCollapsed';
function loadCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
}
function saveCollapsed(on: boolean): void {
  try {
    localStorage.setItem(COLLAPSE_KEY, on ? '1' : '0');
  } catch {
    /* private mode / SSR — collapse just won't persist */
  }
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
  balance: undefined,
  balanceOpen: false,
  plan: undefined,
  billDetail: undefined,
  headroom: false,
  n1: false,
  forecastOn: false,
  forecast: undefined,
  highlightCouncil: undefined,
  menuOpen: true,
  tutorialStep: undefined,
  scenarioId: 'london',
  kpiOpen: false,
  directoratesOpen: false,
  undoListOpen: false,
  savesOpen: false,
  tourActive: false,
  setTourActive: (tourActive) => set({ tourActive }),
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
  setBalance: (balance) => set({ balance }),
  setBalanceOpen: (balanceOpen) =>
    set(balanceOpen ? { balanceOpen } : { balanceOpen, highlightCouncil: undefined }),
  setPlan: (plan) => set({ plan }),
  setBillDetail: (billDetail) => set({ billDetail }),
  setHeadroom: (headroom) => set({ headroom }),
  setN1: (n1) => set({ n1 }),
  setForecastOn: (forecastOn) => set({ forecastOn }),
  setForecast: (forecast) => set({ forecast }),
  setHighlightCouncil: (highlightCouncil) => set({ highlightCouncil }),
  setMenuOpen: (menuOpen) => set({ menuOpen }),
  setTutorialStep: (tutorialStep) => set({ tutorialStep }),
  setScenarioId: (scenarioId) =>
    set((s) =>
      s.scenarioId === scenarioId
        ? { scenarioId }
        : {
            scenarioId,
            snapshot: undefined,
            hoveredTile: undefined,
            selectedAsset: undefined,
            selectedLine: undefined,
            selectedLineAt: undefined,
            studies: {},
            tool: { t: 'inspect' },
          },
    ),
  setKpiOpen: (kpiOpen) => set({ kpiOpen }),
  setDirectoratesOpen: (directoratesOpen) => set({ directoratesOpen }),
  setUndoListOpen: (undoListOpen) => set({ undoListOpen }),
  setSavesOpen: (savesOpen) => set({ savesOpen }),
  skipping: false,
  setSkipping: (skipping) => set({ skipping }),
  hudCollapsed: loadCollapsed(),
  setHudCollapsed: (hudCollapsed) => {
    saveCollapsed(hudCollapsed);
    set({ hudCollapsed });
  },
}));
