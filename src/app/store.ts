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
import type { BuildTemplate } from '../persistence/templateStore';
import type { RankTier } from '../ui/rank';

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
  /** Compare mode (#31): a SECOND pinned inspector slot shown beside the
   *  first, with the same rows. Armed from the first card's "compare"
   *  affordance — `comparePicking` makes the next inspect click fill the
   *  compare slot instead of replacing the primary selection. */
  compareAsset: number | undefined;
  compareLine: number | undefined;
  compareLineAt: { x: number; y: number } | undefined;
  comparePicking: boolean;
  /** Placing a substation auto-runs circuits to the nearest compatible
   *  bays (palette setting). */
  autoConnect: boolean;
  /** CAPACITY PICKER (owner playtest, 2026-06-13). The MW the player has
   *  dialled for the next FARM tender (onshore wind &c) — carried into the
   *  designate command so the tender's fitMW and reserved footprint use it.
   *  undefined = take the full land fit (the old behaviour). */
  genSizeMw: number | undefined;
  /** CONNECTION-VOLTAGE TIER (owner, 2026-06-26). The kV tier the player
   *  has chosen for the next generation build (catalog GenTier.kv) — carried
   *  into the build command so the plant connects at that voltage with its own
   *  MW band enforced. undefined = the technology's default tier. */
  genTierKv: string | undefined;
  /** The MVA chosen for the next SUBSTATION build (BuildPalette ± picker);
   *  undefined = leave the transformer on auto-reinforcement. */
  subSizeMva: number | undefined;
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
  /** The bill panel has been opened/shown at least once this session
   *  (mission 5's "open the bill" step gates on it; set by BillPanel). */
  billSeen: boolean;
  /** N-1 security rings toggle. */
  n1: boolean;
  /** 5-year demand-growth forecast overlay. */
  forecastOn: boolean;
  forecast: CatchmentForecast[] | undefined;
  /** Council ring-fence highlight on the map (balance row click). */
  highlightCouncil: number | undefined;
  menuOpen: boolean;
  /** The in-game pause MENU (Save / Quit to main menu). Opened by Escape
   *  when nothing else is being cancelled, or by clicking the wordmark.
   *  Distinct from `menuOpen` (the start menu). */
  gameMenuOpen: boolean;
  setGameMenuOpen: (open: boolean) => void;
  /** Current tutorial step index, or undefined when not in the tutorial.
   *  Drives the London step strip AND the active mission's steps. */
  tutorialStep: number | undefined;
  /** The mission id the player has explicitly FINISHED (clicked "finish
   *  tutorial" on the last step). Gates the mission-complete victory card,
   *  so it appears ONLY on finish — never the instant the objective is met
   *  (owner). Cleared on a scenario switch. */
  tutorialDone: string | undefined;
  setTutorialDone: (id: string | undefined) => void;
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
  /** The lessons page (tutorial curriculum + star ratings) is open. */
  lessonsOpen: boolean;
  setLessonsOpen: (open: boolean) => void;
  /** The Asset Guide (browsable build-option encyclopedia) is open. */
  guideOpen: boolean;
  /** A deep-link key (e.g. 'sub:capbank') to open the guide on; cleared
   *  when the panel closes. Opening with a focus auto-expands that entry. */
  guideFocus: string | undefined;
  setGuideOpen: (open: boolean, focus?: string | undefined) => void;
  /** Hotkey cheat-sheet overlay open (#29). */
  helpOpen: boolean;
  setHelpOpen: (open: boolean) => void;
  /** Build-template paste mode (#37): the template being stamped, or
   *  undefined when no paste is armed. While armed, a map click stamps
   *  the set at the hovered tile (handled by a paste overlay we own, so
   *  the render lane's click flow is untouched). */
  pasteTemplate: BuildTemplate | undefined;
  setPasteTemplate: (t: BuildTemplate | undefined) => void;
  /** Recently placed substations this session, oldest→newest, capped —
   *  the quick "save last N as a template" capture buffer (#37). Tracked
   *  off the snapshot as operator subs appear; lines among them are
   *  recovered from the snapshot at capture time. */
  recentSubPlacements: number[];
  clearRecentPlacements: () => void;
  setWorkerStatus: (status: WorkerStatus, error?: string) => void;
  setSnapshot: (snapshot: SimSnapshot) => void;
  setHoveredTile: (tile: TileHover | undefined) => void;
  setTool: (tool: Tool) => void;
  setSelected: (sel: {
    assetId?: number | undefined;
    lineId?: number | undefined;
    at?: { x: number; y: number } | undefined;
  }) => void;
  /** Arm/disarm the compare-pick (the next inspect click fills the second
   *  slot). Closing the compare slot also disarms. (#31) */
  setComparePicking: (on: boolean) => void;
  clearCompare: () => void;
  setAutoConnect: (on: boolean) => void;
  setGenSizeMw: (mw: number | undefined) => void;
  setGenTierKv: (kv: string | undefined) => void;
  setSubSizeMva: (mva: number | undefined) => void;
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
  setBillSeen: (seen: boolean) => void;
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
  /** Universal "close the topmost open thing" (ESC). Walks a fixed priority
   *  order — any open modal/panel/overlay first, then a pinned inspector
   *  selection, then an armed build tool's in-progress route, then the armed
   *  tool itself, then the map overlays — and closes exactly the highest one.
   *  Returns true if it closed something, false if nothing was open (so the
   *  caller can decide what a "bare" ESC does). Deterministic + unit-tested
   *  (tests/escClose.test.ts). The start menu (menuOpen) is deliberately NOT
   *  in scope — it's the shell, not an in-game overlay. */
  closeTopmost: () => boolean;
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
  /** Hide the WHOLE HUD for a clean map view (owner, 2026-06-18: a toggle
   *  key — Spacebar — that opens and closes the entire HUD). Distinct from
   *  hudCollapsed (the compact icon-rail) and photoMode (a screenshot
   *  capture mode): this is the player's own clean-look toggle, restored
   *  by a tiny always-visible affordance. Persisted to localStorage. */
  hudHidden: boolean;
  setHudHidden: (hidden: boolean) => void;
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
  // --- RENDER/POLISH lane (#38 camera bookmarks · #48 photo mode) ---
  /** Saved camera positions (#38): named slots {x,y,zoom}, persisted
   *  client-side; the CameraBookmarks panel lists them with jump/save/
   *  delete and calls the renderer's getCamera()/jumpToCamera(). */
  bookmarks: CameraBookmark[];
  addBookmark: (b: CameraBookmark) => void;
  removeBookmark: (id: number) => void;
  /** Photo mode (#48): when on, all HUD/chrome is hidden so the map frame
   *  is clean for a screenshot. PhotoMode.tsx itself stays mounted to drive
   *  the capture + exit. */
  photoMode: boolean;
  setPhotoMode: (on: boolean) => void;
  // --- OPERATOR RANK (career progression) ---
  /** Set when a closed report card just bumped the operator's rank tier —
   *  the UI shows a "PROMOTED" celebration card, then the player dismisses
   *  it. undefined when there is nothing to celebrate. */
  rankUp: RankTier | undefined;
  setRankUp: (tier: RankTier | undefined) => void;
  /** A GUEST (not signed in) just earned a promotion or closed a period —
   *  surface a gentle, dismissible "sign in to keep your rank" nudge. Never
   *  blocks play; cleared on dismiss or sign-in. Signed-in users never set it. */
  loginNudge: boolean;
  setLoginNudge: (on: boolean) => void;
}

/** A saved camera position (#38). `id` is a monotonic client key. */
export interface CameraBookmark {
  id: number;
  name: string;
  x: number;
  y: number;
  zoom: number;
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

const HIDDEN_KEY = 'ec.hudHidden';
function loadHidden(): boolean {
  try {
    return localStorage.getItem(HIDDEN_KEY) === '1';
  } catch {
    return false;
  }
}
function saveHidden(on: boolean): void {
  try {
    localStorage.setItem(HIDDEN_KEY, on ? '1' : '0');
  } catch {
    /* private mode / SSR — won't persist */
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

// Camera bookmark persistence (#38): client-only named camera slots.
const BOOKMARK_KEY = 'ec.bookmarks.v1';
function loadBookmarks(): CameraBookmark[] {
  try {
    const raw = localStorage.getItem(BOOKMARK_KEY);
    if (raw) {
      const j = JSON.parse(raw) as CameraBookmark[];
      if (Array.isArray(j)) {
        return j
          .filter(
            (b) =>
              b &&
              typeof b.x === 'number' &&
              typeof b.y === 'number' &&
              typeof b.zoom === 'number',
          )
          .slice(0, 6);
      }
    }
  } catch {
    /* ignore */
  }
  return [];
}
function saveBookmarks(bookmarks: CameraBookmark[]): void {
  try {
    localStorage.setItem(BOOKMARK_KEY, JSON.stringify(bookmarks.slice(0, 6)));
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

/** Sub asset ids seen in the previous snapshot — diffed against the next
 *  to fill the build-template capture buffer (#37). Module-level so it
 *  survives store re-renders; reset implicitly when a save loads (the new
 *  subs simply re-register). */
let seenSubIds = new Set<number>();

export const useAppStore = create<AppState>((set, get) => ({
  workerStatus: 'connecting',
  workerError: undefined,
  snapshot: undefined,
  hoveredTile: undefined,
  tool: { t: 'inspect' },
  selectedAsset: undefined,
  selectedLine: undefined,
  selectedLineAt: undefined,
  compareAsset: undefined,
  compareLine: undefined,
  compareLineAt: undefined,
  comparePicking: false,
  autoConnect: false,
  genSizeMw: undefined,
  genTierKv: undefined,
  subSizeMva: undefined,
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
  billSeen: false,
  n1: false,
  forecastOn: false,
  forecast: undefined,
  highlightCouncil: undefined,
  menuOpen: true,
  gameMenuOpen: false,
  setGameMenuOpen: (gameMenuOpen) => set({ gameMenuOpen }),
  tutorialStep: undefined,
  tutorialDone: undefined,
  setTutorialDone: (tutorialDone) => set({ tutorialDone }),
  scenarioId: 'london',
  kpiOpen: false,
  directoratesOpen: false,
  undoListOpen: false,
  savesOpen: false,
  tourActive: false,
  setTourActive: (tourActive) => set({ tourActive }),
  lessonsOpen: false,
  setLessonsOpen: (lessonsOpen) => set({ lessonsOpen }),
  guideOpen: false,
  guideFocus: undefined,
  setGuideOpen: (guideOpen, focus) =>
    set({ guideOpen, guideFocus: guideOpen ? focus : undefined }),
  helpOpen: false,
  setHelpOpen: (helpOpen) => set({ helpOpen }),
  pasteTemplate: undefined,
  setPasteTemplate: (pasteTemplate) => set({ pasteTemplate }),
  recentSubPlacements: [],
  clearRecentPlacements: () => set({ recentSubPlacements: [] }),
  setWorkerStatus: (workerStatus, workerError) => set({ workerStatus, workerError }),
  setSnapshot: (snapshot) =>
    set((s) => {
      for (const b of snapshot.branches) {
        if (b.kind !== 'line' || b.ratingMW <= 0) continue;
        const loading = Math.abs(b.flowMW) / b.ratingMW;
        if (loading > (linePeaks.get(b.assetId) ?? 0)) linePeaks.set(b.assetId, loading);
      }
      // capture buffer for build templates (#37): note operator-owned
      // substations as they appear, so "save my last build" knows which
      // kit to bundle. iDNO/tee subs are excluded (not player-buildable).
      let recent = s.recentSubPlacements;
      const prev = seenSubIds;
      const next = new Set<number>();
      let added = false;
      for (const a of snapshot.assets) {
        if (a.kind !== 'sub' || a.idno || a.sub === 'tee') continue;
        next.add(a.id);
        if (!prev.has(a.id) && !recent.includes(a.id)) {
          recent = [...recent, a.id].slice(-12);
          added = true;
        }
      }
      seenSubIds = next;
      return added ? { snapshot, recentSubPlacements: recent } : { snapshot };
    }),
  setHoveredTile: (hoveredTile) => set({ hoveredTile }),
  // arming a different tool drops the pinned inspector card (and the
  // compare slot / pick arming — they only make sense while inspecting)
  setTool: (tool) =>
    set((s) => {
      // arming a DIFFERENT generator clears the chosen voltage tier so a
      // stale tier from another technology can't leak into the next build
      // (each gen's picker re-defaults; specFor ignores an invalid tier too)
      const genChanged =
        tool.t === 'gen' && !(s.tool.t === 'gen' && s.tool.gen === tool.gen);
      return {
        tool,
        ...(genChanged ? { genTierKv: undefined } : {}),
        selectedAsset: tool.t === 'inspect' ? s.selectedAsset : undefined,
        selectedLine: tool.t === 'inspect' ? s.selectedLine : undefined,
        selectedLineAt: tool.t === 'inspect' ? s.selectedLineAt : undefined,
        compareAsset: tool.t === 'inspect' ? s.compareAsset : undefined,
        compareLine: tool.t === 'inspect' ? s.compareLine : undefined,
        compareLineAt: tool.t === 'inspect' ? s.compareLineAt : undefined,
        comparePicking: tool.t === 'inspect' ? s.comparePicking : false,
      };
    }),
  setSelected: ({ assetId, lineId, at }) =>
    set((s) => {
      // compare-pick armed: the next inspect click fills the SECOND slot,
      // leaving the primary pin intact. A click on empty ground (no asset
      // and no line) cancels the pick without disturbing the primary pin.
      if (s.comparePicking) {
        if (assetId === undefined && lineId === undefined) {
          return { comparePicking: false };
        }
        return {
          compareAsset: assetId,
          compareLine: lineId,
          compareLineAt: at,
          comparePicking: false,
        };
      }
      return { selectedAsset: assetId, selectedLine: lineId, selectedLineAt: at };
    }),
  setComparePicking: (comparePicking) => set({ comparePicking }),
  clearCompare: () =>
    set({
      compareAsset: undefined,
      compareLine: undefined,
      compareLineAt: undefined,
      comparePicking: false,
    }),
  setAutoConnect: (autoConnect) => set({ autoConnect }),
  setGenSizeMw: (genSizeMw) => set({ genSizeMw }),
  setGenTierKv: (genTierKv) => set({ genTierKv }),
  setSubSizeMva: (subSizeMva) => set({ subSizeMva }),
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
  setBillSeen: (billSeen) => set({ billSeen }),
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
            // reset the UI-only step gates so a replayed mission re-teaches
            // them (these never reach the sim; missions read them via the
            // MissionUiView in Tutorial.tsx)
            headroom: false,
            billSeen: false,
            tutorialDone: undefined,
            tool: { t: 'inspect' },
          },
    ),
  setKpiOpen: (kpiOpen) => set({ kpiOpen }),
  setDirectoratesOpen: (directoratesOpen) => set({ directoratesOpen }),
  setUndoListOpen: (undoListOpen) => set({ undoListOpen }),
  setSavesOpen: (savesOpen) => set({ savesOpen }),
  closeTopmost: () => {
    const s = get();
    // PRIORITY ORDER (highest first). The first matching rung closes and we
    // stop — one ESC press = close one thing. Modals/panels precede map
    // state because they sit visually on top. Order is mirrored in the
    // HotkeyHelp cheat-sheet copy + asserted in tests/escClose.test.ts.
    const close = (patch: Partial<AppState>): boolean => {
      set(patch);
      return true;
    };
    // 1) full-screen / pop-over MODALS & PANELS
    if (s.gameMenuOpen) return close({ gameMenuOpen: false });
    if (s.helpOpen) return close({ helpOpen: false });
    if (s.guideOpen) return close({ guideOpen: false, guideFocus: undefined });
    if (s.lessonsOpen) return close({ lessonsOpen: false });
    if (s.kpiOpen) return close({ kpiOpen: false });
    if (s.netZeroOpen) return close({ netZeroOpen: false });
    if (s.directoratesOpen) return close({ directoratesOpen: false });
    if (s.eventLogOpen) return close({ eventLogOpen: false });
    if (s.savesOpen) return close({ savesOpen: false });
    if (s.balanceOpen) return close({ balanceOpen: false, highlightCouncil: undefined });
    if (s.undoListOpen) return close({ undoListOpen: false });
    if (s.tourActive) return close({ tourActive: false });
    // 2) a build-template paste armed (a click would stamp it) — disarm it
    if (s.pasteTemplate !== undefined) return close({ pasteTemplate: undefined });
    // 3) the compare-pick arming (#31): cancel the pick, keep the primary pin
    if (s.comparePicking) return close({ comparePicking: false });
    // 4) a second pinned (compare) inspector card — drop it before the primary
    if (s.compareAsset !== undefined || s.compareLine !== undefined) {
      return close({ compareAsset: undefined, compareLine: undefined, compareLineAt: undefined });
    }
    // 5) the PINNED inspector selection (sticky card)
    if (s.selectedAsset !== undefined || s.selectedLine !== undefined) {
      return close({ selectedAsset: undefined, selectedLine: undefined, selectedLineAt: undefined });
    }
    // 6) an armed LINE tool mid-route: unwind one waypoint, then the anchor
    if (s.tool.t === 'line' && (s.tool.waypoints?.length ?? 0) > 0) {
      return close({ tool: { ...s.tool, waypoints: s.tool.waypoints?.slice(0, -1) } });
    }
    if (s.tool.t === 'line' && s.tool.fromAssetId !== undefined) {
      return close({ tool: { ...s.tool, fromAssetId: undefined } });
    }
    // 7) any armed build tool: return to the inspect tool
    if (s.tool.t !== 'inspect') return close({ tool: { t: 'inspect' } });
    // 8) map OVERLAYS toggled on — clear them last
    if (s.headroom || s.n1 || s.forecastOn || s.gridView) {
      return close({ headroom: false, n1: false, forecastOn: false, gridView: false });
    }
    return false;
  },
  skipping: false,
  setSkipping: (skipping) => set({ skipping }),
  hudCollapsed: loadCollapsed(),
  setHudCollapsed: (hudCollapsed) => {
    saveCollapsed(hudCollapsed);
    set({ hudCollapsed });
  },
  hudHidden: loadHidden(),
  setHudHidden: (hudHidden) => {
    saveHidden(hudHidden);
    set({ hudHidden });
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
  // --- RENDER/POLISH lane (#38 / #48) ---
  bookmarks: loadBookmarks(),
  addBookmark: (b) =>
    set((s) => {
      const bookmarks = [...s.bookmarks, b].slice(-6);
      saveBookmarks(bookmarks);
      return { bookmarks };
    }),
  removeBookmark: (id) =>
    set((s) => {
      const bookmarks = s.bookmarks.filter((b) => b.id !== id);
      saveBookmarks(bookmarks);
      return { bookmarks };
    }),
  photoMode: false,
  setPhotoMode: (photoMode) => set({ photoMode }),
  rankUp: undefined,
  setRankUp: (rankUp) => set({ rankUp }),
  loginNudge: false,
  setLoginNudge: (loginNudge) => set({ loginNudge }),
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
