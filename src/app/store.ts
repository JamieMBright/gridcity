import { create } from 'zustand';
import type { GenType, LineBuild, SubType } from '../sim/catalog';
import type { VoltageLevel } from '../sim/grid/types';
import type { BillDetailLine, BillDetailRow, SimSnapshot } from '../sim/protocol';
import type { BalanceReport } from '../sim/balance';
import type { ReinforcementPlan } from '../sim/planner';
import type { CatchmentForecast } from '../sim/forecast';
import type { ConnectionStudy } from '../sim/study';
import type { TileHover } from '../render/MapRenderer';
import type { CbMode } from '../ui/cbPalette';

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
  /** Colour-blind mode (#32): swaps the status/voltage/heatmap palettes
   *  for a deuteranopia/protanopia/tritanopia-safe set. Persisted. */
  cbMode: CbMode;
  setCbMode: (mode: CbMode) => void;
  /** Corner minimap open (#26). Persisted; defaults closed on mobile. */
  minimapOpen: boolean;
  setMinimapOpen: (open: boolean) => void;
  /** Net-zero dashboard panel open (#33). */
  netZeroOpen: boolean;
  setNetZeroOpen: (open: boolean) => void;
  /** Full filterable event-log panel open (#30). */
  eventLogOpen: boolean;
  setEventLogOpen: (open: boolean) => void;
  /** Alert acknowledge/snooze (#39), keyed by event seq. acked = dismissed
   *  for good; snoozed[seq] = the game-minute it re-fires at. Persisted so
   *  a reload keeps the feed quiet. */
  ackedAlerts: Set<number>;
  snoozedAlerts: Record<number, number>;
  ackAlert: (seq: number) => void;
  snoozeAlert: (seq: number, untilMin: number) => void;
  clearAlertState: () => void;
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

const CB_KEY = 'ec.cbMode';
function loadCbMode(): CbMode {
  try {
    const v = localStorage.getItem(CB_KEY);
    if (v === 'deuteranopia' || v === 'protanopia' || v === 'tritanopia') return v;
  } catch {
    /* ignore */
  }
  return 'off';
}
function saveCbMode(mode: CbMode): void {
  try {
    localStorage.setItem(CB_KEY, mode);
  } catch {
    /* ignore */
  }
}

const MINIMAP_KEY = 'ec.minimapOpen';
function loadMinimapOpen(): boolean {
  try {
    const v = localStorage.getItem(MINIMAP_KEY);
    if (v === '1') return true;
    if (v === '0') return false;
  } catch {
    /* ignore */
  }
  // default: open on desktop, closed on a narrow phone (#26 mobile default)
  return typeof window === 'undefined' || window.innerWidth > 720;
}
function saveMinimapOpen(on: boolean): void {
  try {
    localStorage.setItem(MINIMAP_KEY, on ? '1' : '0');
  } catch {
    /* ignore */
  }
}

// Alert ack/snooze persistence (#39): client-only, keyed by event seq.
const ALERT_KEY = 'ec.alertState.v1';
function loadAlertState(): { acked: Set<number>; snoozed: Record<number, number> } {
  try {
    const raw = localStorage.getItem(ALERT_KEY);
    if (raw) {
      const j = JSON.parse(raw) as { acked?: number[]; snoozed?: Record<number, number> };
      return { acked: new Set(j.acked ?? []), snoozed: j.snoozed ?? {} };
    }
  } catch {
    /* ignore */
  }
  return { acked: new Set(), snoozed: {} };
}
function saveAlertState(acked: Set<number>, snoozed: Record<number, number>): void {
  try {
    localStorage.setItem(
      ALERT_KEY,
      JSON.stringify({ acked: [...acked].slice(-400), snoozed }),
    );
  } catch {
    /* ignore */
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
  cbMode: loadCbMode(),
  setCbMode: (cbMode) => {
    saveCbMode(cbMode);
    set({ cbMode });
  },
  minimapOpen: loadMinimapOpen(),
  setMinimapOpen: (minimapOpen) => {
    saveMinimapOpen(minimapOpen);
    set({ minimapOpen });
  },
  netZeroOpen: false,
  setNetZeroOpen: (netZeroOpen) => set({ netZeroOpen }),
  eventLogOpen: false,
  setEventLogOpen: (eventLogOpen) => set({ eventLogOpen }),
  ackedAlerts: loadAlertState().acked,
  snoozedAlerts: loadAlertState().snoozed,
  ackAlert: (seq) =>
    set((s) => {
      const acked = new Set(s.ackedAlerts);
      acked.add(seq);
      saveAlertState(acked, s.snoozedAlerts);
      return { ackedAlerts: acked };
    }),
  snoozeAlert: (seq, untilMin) =>
    set((s) => {
      const snoozed = { ...s.snoozedAlerts, [seq]: untilMin };
      saveAlertState(s.ackedAlerts, snoozed);
      return { snoozedAlerts: snoozed };
    }),
  clearAlertState: () =>
    set(() => {
      saveAlertState(new Set(), {});
      return { ackedAlerts: new Set(), snoozedAlerts: {} };
    }),
}));

/** Pure event categoriser (#30): map an event's severity + message to a
 *  filter bucket. The sim's GameEvent carries no category field (sim lane
 *  owns it), so the client classifies from the copy — keyword-driven and
 *  unit-tested in tests/eventLog.test.ts. */
export type EventCategory = 'faults' | 'planning' | 'weather' | 'market' | 'finance';

export const EVENT_CATEGORIES: EventCategory[] = [
  'faults',
  'planning',
  'weather',
  'market',
  'finance',
];

// Word-boundaried where a short keyword could hide inside another word
// (e.g. "ice" in "pr-ice-"). Weather is matched first so storms win.
const CAT_RULES: Array<[EventCategory, RegExp]> = [
  ['weather', /storm|\bwind\b|gale|flood|lightning|heatwave|freeze|\bsnow\b|\bice\b|weather|surge crew/i],
  ['faults', /fault|outage|\btrip\b|\bfail|broke|broken|interrupt|blackout|unserved|overload|\bfire\b|dig-?in|damage/i],
  ['planning', /planning|consent|appeal|objection|consult|permission|council|tender|applicat|connect(ion)?|develop|award/i],
  ['market', /\bprice|wholesale|merit|curtail|frequenc|carbon|dispatch|market|export|import|\bgas\b|MWh/i],
  ['finance', /\bbill|\bcost|capex|allowance|penalt|reward|ofgem|riio|levy|constraint payment|invoice|£/i],
];

export function categorizeEvent(e: { sev: 'info' | 'warn' | 'bad'; msg: string }): EventCategory {
  for (const [cat, re] of CAT_RULES) {
    if (re.test(e.msg)) return cat;
  }
  // a 'bad' event with no keyword is most usefully a fault; else market chatter
  return e.sev === 'bad' ? 'faults' : 'market';
}

/** Is an event currently visible in the alerts feed? Acked → never;
 *  snoozed → hidden until its re-fire minute passes (#39). */
export function alertVisible(
  e: { seq: number },
  nowMin: number,
  acked: Set<number>,
  snoozed: Record<number, number>,
): boolean {
  if (acked.has(e.seq)) return false;
  const until = snoozed[e.seq];
  if (until !== undefined && nowMin < until) return false;
  return true;
}
