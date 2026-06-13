import { useEffect } from 'react';
import { AlertsFeed, EventLog } from '../ui/AlertsFeed';
import { BalancePanel } from '../ui/BalancePanel';
import { BillPanel } from '../ui/BillPanel';
import { BuildLabelChip } from '../ui/BuildLabelChip';
import { BuildPalette } from '../ui/BuildPalette';
import { CameraBookmarks } from '../ui/CameraBookmarks';
import { FleetPanel } from '../ui/FleetPanel';
import { GameMenu } from '../ui/GameMenu';
import { HotkeyHelp } from '../ui/HotkeyHelp';
import { Hud } from '../ui/Hud';
import { HudTour } from '../ui/HudTour';
import { DirectoratesPanel } from '../ui/DirectoratesPanel';
import { InboxPanel } from '../ui/InboxPanel';
import { InfoPanel } from '../ui/InfoPanel';
import { KpiDashboard } from '../ui/KpiDashboard';
import { MapView } from '../ui/MapView';
import { Minimap } from '../ui/Minimap';
import { MobileChrome } from '../ui/MobileChrome';
import { NetZeroPanel } from '../ui/NetZeroPanel';
import { PhotoMode } from '../ui/PhotoMode';
import { RotatePrompt } from '../ui/RotatePrompt';
import { SavesPanel } from '../ui/SavesPanel';
import { SearchBox } from '../ui/SearchBox';
import { StartMenu } from '../ui/StartMenu';
import { StoryIntro } from '../ui/StoryIntro';
import { TemplatePaste } from '../ui/TemplatePaste';
import { Tutorial } from '../ui/Tutorial';
import { UndoHistory } from '../ui/UndoHistory';
import { panelStyle, theme } from '../ui/theme';
import { playSfx } from '../audio/audio';
import { HOTKEYS } from './hotkeys';
import { useAppStore } from './store';
import { useIsMobile } from './useIsMobile';
import { useUnlockGate } from '../ui/unlocks';
import { initWorker, sendCommand, setSimSpeed } from './workerBridge';

function Wordmark() {
  const setGameMenuOpen = useAppStore((s) => s.setGameMenuOpen);
  return (
    <button
      aria-label="game menu"
      title="Game menu — save or quit to the main menu (Esc)"
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
      }}
    >
      <img
        src="/icon-192.png"
        alt=""
        width={26}
        height={26}
        style={{ verticalAlign: -6, marginRight: 8, borderRadius: 6 }}
      />
      <span style={{ color: theme.orange }}>ELECTRI</span>
      <span style={{ color: theme.slate }}>CITY</span>
    </button>
  );
}

function StatusBar() {
  const workerStatus = useAppStore((s) => s.workerStatus);
  const workerError = useAppStore((s) => s.workerError);
  return (
    <div
      style={{
        ...panelStyle,
        position: 'absolute',
        // lifted clear of the bottom-left minimap (the map overlay moved
        // here, off the right-rail bill stack)
        bottom: 160,
        left: 12,
        maxWidth: 'min(420px, calc(100vw - 24px))',
        padding: '6px 12px',
        fontSize: 12,
        pointerEvents: 'none',
      }}
    >
      {workerStatus === 'connecting' && <span style={{ color: theme.gold }}>starting sim…</span>}
      {workerStatus === 'error' && (
        <span style={{ color: theme.danger }}>sim error: {workerError}</span>
      )}
      {workerStatus === 'ready' && (
        <span style={{ color: theme.slate }}>
          drag to pan · scroll to zoom · G grid view · 1–9/QWERT/ZXC build · U under/overhead
        </span>
      )}
    </div>
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
        // an open modal closes first (game menu, help) before any tool work
        if (s.gameMenuOpen) {
          s.setGameMenuOpen(false);
        } else if (s.selectedAsset !== undefined || s.selectedLine !== undefined) {
          s.setSelected({});
        } else if (s.tool.t === 'line' && (s.tool.waypoints?.length ?? 0) > 0) {
          // unwind the bent route one waypoint at a time
          s.setTool({ ...s.tool, waypoints: s.tool.waypoints?.slice(0, -1) });
        } else if (s.tool.t === 'line' && s.tool.fromAssetId !== undefined) {
          s.setTool({ ...s.tool, fromAssetId: undefined });
        } else if (s.tool.t !== 'inspect') {
          // a non-inspect tool is armed: disarm it (existing behaviour)
          s.setTool({ t: 'inspect' });
        } else if (!s.menuOpen) {
          // nothing to cancel and not already at the start menu: open the
          // in-game pause MENU (Save / Quit to main menu)
          s.setGameMenuOpen(true);
        }
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
      const key = e.key.toLowerCase();
      if (key === 'g') {
        s.setGridView(!s.gridView);
      } else if (key === 'b') {
        s.setBalanceOpen(!s.balanceOpen);
      } else if (key === 'h') {
        s.setHeadroom(!s.headroom);
      } else if (key === 'n') {
        s.setN1(!s.n1);
      } else if (key === 'f') {
        s.setForecastOn(!s.forecastOn);
      } else if (key === 'k') {
        s.setKpiOpen(!s.kpiOpen);
      } else if (key === 'c') {
        s.setDirectoratesOpen(!s.directoratesOpen);
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
      } else if (e.key === ' ') {
        e.preventDefault();
        setSimSpeed(s.snapshot?.speed === 0 ? 1 : 0);
      } else {
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
  const chrome = !menuOpen && !photoMode;
  // campaign missions hide the London-specific chrome (place search)
  const inMission = useAppStore((s) => s.scenarioId !== 'london');
  // progressive disclosure: a mission shows only the panels it teaches
  const gate = useUnlockGate();
  const showPanel = (key: string): boolean => !gate.active || gate.has(key);

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
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
          </>
        ) : (
          <>
            <Wordmark />
            {!inMission && <SearchBox />}
            <BuildPalette />
            <InfoPanel />
            {showPanel('hud:bill') && <BillPanel />}
            {showPanel('hud:fleet') && <FleetPanel />}
            {showPanel('hud:inbox') && <InboxPanel />}
            {showPanel('hud:alerts') && <AlertsFeed />}
            <StatusBar />
          </>
        ))}
      {chrome && <BuildLabelChip />}
      {chrome && <Hud compact={compact} />}
      {chrome && <Minimap />}
      {/* RENDER/POLISH lane (#38/#48): camera bookmarks + photo mode, both
          self-contained floating controls; bookmarks hide themselves in
          photo mode, PhotoMode owns the clean-frame bar. FLAGGED additive
          mount (App.tsx is shared with the UI lane). */}
      {chrome && <CameraBookmarks />}
      {!menuOpen && <PhotoMode />}
      {!photoMode && <Toast />}
      {!photoMode && <Tutorial />}
      {chrome && <BalancePanel />}
      {chrome && <UndoHistory />}
      <StoryIntro />
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
      {chrome && <TemplatePaste />}
    </div>
  );
}
