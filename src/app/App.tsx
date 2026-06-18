import { useEffect } from 'react';
import { EventLog } from '../ui/AlertsFeed';
import { AssetGuide } from '../ui/AssetGuide';
import { AuthCallback } from '../ui/AuthCallback';
import { BalancePanel } from '../ui/BalancePanel';
import { BoltMark } from '../ui/BoltMark';
import { BuildLabelChip } from '../ui/BuildLabelChip';
import { CameraBookmarks } from '../ui/CameraBookmarks';
import { GameMenu } from '../ui/GameMenu';
import { HotkeyHelp } from '../ui/HotkeyHelp';
import { Hud } from '../ui/Hud';
import { HudFrame } from '../ui/HudFrame';
import { HudRevealTab } from '../ui/HudRevealTab';
import { LoadingScreen } from '../ui/LoadingScreen';
import { HudTour } from '../ui/HudTour';
import { DirectoratesPanel } from '../ui/DirectoratesPanel';
import { KpiDashboard } from '../ui/KpiDashboard';
import { MapView } from '../ui/MapView';
import { Minimap } from '../ui/Minimap';
import { MobileChrome } from '../ui/MobileChrome';
import { NetZeroPanel } from '../ui/NetZeroPanel';
import { PhotoMode } from '../ui/PhotoMode';
import { RankUpCard } from '../ui/RankPanel';
import { RotatePrompt } from '../ui/RotatePrompt';
import { SavesPanel } from '../ui/SavesPanel';
import { SearchBox } from '../ui/SearchBox';
import { SevereWeatherAlert } from '../ui/SevereWeatherAlert';
import { StartMenu } from '../ui/StartMenu';
import { StoryIntro } from '../ui/StoryIntro';
import { TemplatePaste } from '../ui/TemplatePaste';
import { Tutorial } from '../ui/Tutorial';
import { UndoHistory } from '../ui/UndoHistory';
import { CrashCanary } from '../ui/CrashCanary';
import { HUD_KEYFRAMES, panelStyle, theme } from '../ui/theme';
import { playSfx } from '../audio/audio';
import { SUBS } from '../sim/catalog';
import { subMva } from '../sim/assets';
import { isFarmGen } from '../sim/farms';
import { HOTKEYS } from './hotkeys';
import { useAppStore } from './store';
import { useIsMobile } from './useIsMobile';
import { initWorker, sendCommand, setSimSpeed } from './workerBridge';

function Wordmark() {
  const setGameMenuOpen = useAppStore((s) => s.setGameMenuOpen);
  return (
    <button
      aria-label="game menu"
      title="Game menu — save or quit to the main menu"
      onClick={() => setGameMenuOpen(true)}
      style={{
        ...panelStyle,
        position: 'absolute',
        top: 28,
        left: 12,
        padding: '8px 14px',
        fontSize: 18,
        fontWeight: 800,
        letterSpacing: '0.05em',
        cursor: 'pointer',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <BoltMark size={24} />
      <span>
        <span style={{ color: theme.orange }}>ELECTRI</span>
        <span style={{ color: theme.slate }}>CITY</span>
      </span>
    </button>
  );
}

function Toast() {
  const toast = useAppStore((s) => s.toast);
  if (!toast) return null;
  return (
    <div
      style={{
        ...panelStyle,
        position: 'absolute',
        top: 70,
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '8px 16px',
        border: `1px solid ${theme.danger}`,
        color: theme.danger,
        pointerEvents: 'none',
      }}
    >
      {toast}
    </div>
  );
}

/** Panel-scoped capacity step (owner, 2026-06-18): − / + on a PINNED
 *  inspector changes the selected asset's size. A substation steps its
 *  transformer through the catalog MVA ladder (and switches off auto-
 *  reinforcement, like the inspector ± buttons); a wind/solar/etc. FARM
 *  steps its awarded MW by one tile's worth (the worker re-derives the
 *  claimed footprint and caps it at the free land fit). Anything else (a
 *  line, a fixed plant, an iDNO sub) silently ignores the key. */
function stepSelectedCapacity(dir: -1 | 1): void {
  const s = useAppStore.getState();
  const id = s.selectedAsset;
  if (id === undefined) return; // a pinned LINE has no capacity to step
  const asset = s.snapshot?.assets.find((a) => a.id === id);
  if (!asset) return;
  if (asset.kind === 'sub') {
    if (asset.idno) return; // the iDNO owns that transformer, not the player
    const steps = SUBS[asset.sub].mvaSteps;
    if (!steps || steps.length === 0) return; // fixed-transformer sub
    const mva = subMva(asset);
    const ix = steps.indexOf(mva);
    const nextIx = Math.max(0, Math.min(steps.length - 1, (ix < 0 ? 0 : ix) + dir));
    const next = steps[nextIx];
    if (next !== undefined && next !== mva) sendCommand({ type: 'setSubMva', assetId: id, mva: next });
    return;
  }
  if (asset.kind === 'gen' && isFarmGen(asset.gen)) {
    sendCommand({ type: 'resizeFarm', assetId: id, dir });
  }
}

function useKeyboard(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const s = useAppStore.getState();
      const target = e.target as HTMLElement | null;
      const typing = target && /^(input|textarea|select)$/i.test(target.tagName);
      // undo/redo before the modifier guard: Ctrl/Cmd+Z, Ctrl+Y, Ctrl+Shift+Z
      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        const k = e.key.toLowerCase();
        if ((k === 'z' || k === 'y') && !typing && !s.menuOpen && !s.gameMenuOpen) {
          e.preventDefault();
          sendCommand({ type: k === 'y' || e.shiftKey ? 'redo' : 'undo' });
        }
        return;
      }
      if (e.altKey) return;
      if (typing) return;
      if (e.key === 'Escape') {
        // ESC is the UNIVERSAL close: shut the single topmost open thing in a
        // documented priority order (store.closeTopmost). A bare ESC with
        // nothing open does NOTHING — it no longer pops the pause menu open
        // (owner, 2026-06-18: ESC should only ever CLOSE). The pause menu is
        // reached from the wordmark button.
        s.closeTopmost();
        return;
      }
      // the hotkey cheat-sheet (#29): ? toggles it from anywhere in-game.
      // '?' is Shift+/ on most layouts — match the printed glyph, not the
      // physical key, so it works regardless of keyboard locale.
      if (e.key === '?') {
        if (!s.menuOpen) s.setHelpOpen(!s.helpOpen);
        return;
      }
      if (s.helpOpen) return; // the overlay swallows other keys while open
      if (s.menuOpen) return;
      if (s.gameMenuOpen) return; // the pause menu swallows build hotkeys

      // PANEL-SCOPED HOTKEYS (owner, 2026-06-18): while an inspector card is
      // PINNED (sticky), the panel "owns" the keyboard — − / + step that
      // asset's capacity (transformer MVA for a sub, farm MW for a wind/solar
      // farm) and the build-tool letters are SUPPRESSED so typing can't arm a
      // tool. ESC (handled above) unpins and hands the keyboard back. Numbers
      // (gen palette) and letters all defer to the pinned panel; only the
      // panel-scoped keys + the always-on toggles (clock/help) act.
      const pinned = s.selectedAsset !== undefined || s.selectedLine !== undefined;
      if (pinned && (e.key === '-' || e.key === '_' || e.key === '+' || e.key === '=')) {
        e.preventDefault();
        stepSelectedCapacity(e.key === '+' || e.key === '=' ? 1 : -1);
        return;
      }

      // overlay / panel toggles (camera, view, the cheat-sheet) stay live even
      // with a card pinned — they don't arm build tools.
      const key = e.key.toLowerCase();
      if (key === 'g') {
        s.setGridView(!s.gridView);
        return;
      } else if (key === 'h') {
        s.setHeadroom(!s.headroom);
        return;
      } else if (key === 'n') {
        s.setN1(!s.n1);
        return;
      } else if (key === 'f') {
        s.setForecastOn(!s.forecastOn);
        return;
      } else if (key === 'k') {
        s.setKpiOpen(!s.kpiOpen);
        return;
      } else if (key === 'l') {
        // grid baLance panel (moved off 'b' — 'b' is the demolish/bulldoze
        // build tool; see hotkeys.ts)
        s.setBalanceOpen(!s.balanceOpen);
        return;
      } else if (key === 'o') {
        // the network business / cOmpany (directorates) — moved off 'c', which
        // arms the 33 kV cable build tool (owner: C must arm 33 kV cable)
        s.setDirectoratesOpen(!s.directoratesOpen);
        return;
      } else if (key === 'a') {
        // toggle auto-connect-on-placement (the build-palette setting)
        s.setAutoConnect(!s.autoConnect);
        return;
      } else if (key === 'u') {
        // flip overhead/underground on the armed line tool
        if (s.tool.t === 'line') {
          s.setTool({
            ...s.tool,
            build: s.tool.build === 'overhead' ? 'underground' : 'overhead',
            fromAssetId: undefined,
            waypoints: undefined,
          });
        }
        return;
      } else if (e.key === ' ') {
        // Spacebar toggles the WHOLE HUD hidden/shown (owner, 2026-06-18:
        // "a toggle key that opens and closes the whole HUD — maybe
        // spacebar"). The keyboard pause moved to P (a sensible, common
        // pause key) since spacebar was previously pause — the play/pause
        // buttons in the bottom bar still pause too. Photo mode owns its
        // own clean-frame path, so leave it untouched.
        e.preventDefault();
        if (!s.photoMode) s.setHudHidden(!s.hudHidden);
        return;
      } else if (key === 'p') {
        // pause/resume the sim (moved here from Spacebar for the HUD toggle)
        setSimSpeed(s.snapshot?.speed === 0 ? 1 : 0);
        return;
      }

      // BUILD-TOOL letters/numbers: suppressed while a panel is pinned (the
      // panel owns the keyboard until ESC). This is what lets the player type
      // − / + on a sub without accidentally arming a tool.
      if (pinned) return;

      const hot = HOTKEYS.find((h) => h.key === key);
      if (!hot) return;
      // re-pressing the active tool's key disarms it
      const t = hot.tool;
      const active =
        s.tool.t === t.t &&
        (t.t !== 'gen' || (s.tool.t === 'gen' && s.tool.gen === t.gen)) &&
        (t.t !== 'sub' || (s.tool.t === 'sub' && s.tool.sub === t.sub)) &&
        (t.t !== 'line' || (s.tool.t === 'line' && s.tool.level === t.level));
      if (active) {
        s.setTool({ t: 'inspect' });
      } else if (t.t === 'line') {
        // keep the player's overhead/underground choice when switching kV
        const build = s.tool.t === 'line' ? s.tool.build : t.build;
        s.setTool({ t: 'line', level: t.level, build });
      } else {
        s.setTool(t);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // every button click gets the soft lofi tick
  useEffect(() => {
    const onClick = (e: MouseEvent): void => {
      if ((e.target as HTMLElement | null)?.closest?.('button')) playSfx('click');
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
}

export function App() {
  useEffect(() => {
    initWorker();
  }, []);
  useKeyboard();
  const isMobile = useIsMobile();
  const hudCollapsed = useAppStore((s) => s.hudCollapsed);
  // compact = the icon-rail look. Mobile is always compact; desktop opts
  // in via the collapse toggle (owner: cleaner look on desktop too).
  const compact = isMobile || hudCollapsed;
  const menuOpen = useAppStore((s) => s.menuOpen);
  // photo mode (#48, RENDER/POLISH lane): hide ALL chrome for a clean frame.
  // chrome = the normal in-world HUD condition with photo mode subtracted.
  const photoMode = useAppStore((s) => s.photoMode);
  // hudHidden (owner, 2026-06-18): Spacebar hides the whole HUD for a clean
  // map view. The reveal tab (HudRevealTab) stays so the player can bring it
  // back. Modals (KPI/net-zero/menus) are opened FROM the HUD, so hiding the
  // HUD already yields a clean map; anything already open stays usable.
  const hudHidden = useAppStore((s) => s.hudHidden);
  const chrome = !menuOpen && !photoMode && !hudHidden;
  // campaign missions hide the London-specific chrome (place search)
  const inMission = useAppStore((s) => s.scenarioId !== 'london');

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {/* one shared motion language for the whole HUD (slide-in, attention
          pulse) — mounted once at the root */}
      <style>{HUD_KEYFRAMES}</style>
      <MapView />
      {/* the golden-hour grade + vignette are drawn BY the renderer now
          (render/grade.ts, #41): they follow the sim clock and weather,
          so the old static CSS washes came out. */}
      {chrome &&
        (compact ? (
          <>
            {/* desktop collapse reuses the proven compact icon-rail +
                drawers; the wordmark/search stay on desktop for orientation */}
            {!isMobile && <Wordmark />}
            {!isMobile && !inMission && <SearchBox />}
            <MobileChrome />
            {/* the compact desktop path keeps the floating ticker + centred
                clock cluster (Hud) and the corner widgets. The minimap +
                camera bookmarks are hidden in a tutorial (owner: hide
                non-essential HUD; a one-screen lesson map needs neither) —
                matching the perimeter HUD's hud:minimap gate. */}
            <Hud compact={compact} />
            {!isMobile && !inMission && <Minimap />}
            {!isMobile && !inMission && <CameraBookmarks />}
          </>
        ) : (
          // DESKTOP: the unified perimeter HUD. One CSS-grid frame reserves a
          // left rail (build palette + fleet + minimap), a right rail (pinned
          // inspector + inbox + alerts + bill, each scroll-contained), a top
          // bar (wordmark + search + ticker + regulator) and a bottom bar
          // (status + clock/speed/toggles + goal). Nothing overlaps another
          // panel or the map — every panel is a flex child of its own track.
          <HudFrame />
        ))}
      {chrome && <BuildLabelChip />}
      {!menuOpen && !isMobile && <PhotoMode />}
      {!photoMode && <Toast />}
      {!photoMode && <Tutorial />}
      {chrome && <BalancePanel />}
      {chrome && <UndoHistory />}
      {chrome && <SevereWeatherAlert />}
      <StoryIntro />
      {!photoMode && <RankUpCard />}
      <KpiDashboard />
      <NetZeroPanel />
      <EventLog />
      <DirectoratesPanel />
      <StartMenu />
      <GameMenu />
      <SavesPanel />
      <RotatePrompt />
      <HudTour />
      <HotkeyHelp />
      <AssetGuide />
      {/* the email-link landing page (password reset / confirm / magic link)
          — renders over everything, including the start menu */}
      <AuthCallback />
      {chrome && <TemplatePaste />}
      {/* the always-visible affordance to bring the HUD back after Spacebar
          hid it (owner). Only in-game (not at the start menu / photo mode). */}
      {!menuOpen && !photoMode && hudHidden && <HudRevealTab />}
      {/* the cosy boot loading screen — title image + progress + a rotating
          electricity-flavoured status line. Dismisses itself when the sim is
          ready. Sits over everything during boot. */}
      <LoadingScreen />
      {/* test-only render-crash trigger (dev hook); renders nothing until armed */}
      <CrashCanary />
    </div>
  );
}
