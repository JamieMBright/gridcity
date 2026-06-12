import { useEffect } from 'react';
import { AlertsFeed } from '../ui/AlertsFeed';
import { BillPanel } from '../ui/BillPanel';
import { BuildPalette } from '../ui/BuildPalette';
import { FleetPanel } from '../ui/FleetPanel';
import { Hud } from '../ui/Hud';
import { InboxPanel } from '../ui/InboxPanel';
import { InfoPanel } from '../ui/InfoPanel';
import { KpiDashboard } from '../ui/KpiDashboard';
import { MapView } from '../ui/MapView';
import { MobileChrome } from '../ui/MobileChrome';
import { StartMenu } from '../ui/StartMenu';
import { Tutorial } from '../ui/Tutorial';
import { panelStyle, theme } from '../ui/theme';
import { playSfx } from '../audio/audio';
import { HOTKEYS } from './hotkeys';
import { useAppStore } from './store';
import { useIsMobile } from './useIsMobile';
import { initWorker, sendCommand, setSimSpeed } from './workerBridge';

function Wordmark() {
  return (
    <div
      style={{
        ...panelStyle,
        position: 'absolute',
        top: 28,
        left: 12,
        padding: '8px 14px',
        fontSize: 18,
        fontWeight: 800,
        letterSpacing: '0.05em',
        pointerEvents: 'none',
      }}
    >
      <img
        src="/logo.svg"
        alt=""
        width={26}
        height={26}
        style={{ verticalAlign: -6, marginRight: 8, borderRadius: 6 }}
      />
      <span style={{ color: theme.orange }}>ELECTRI</span>
      <span style={{ color: theme.slate }}>CITY</span>
    </div>
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
        bottom: 12,
        left: 12,
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
        if ((k === 'z' || k === 'y') && !typing && !s.menuOpen) {
          e.preventDefault();
          sendCommand({ type: k === 'y' || e.shiftKey ? 'redo' : 'undo' });
        }
        return;
      }
      if (e.altKey) return;
      if (typing) return;
      if (e.key === 'Escape') {
        if (s.selectedAsset !== undefined || s.selectedLine !== undefined) {
          s.setSelected({});
        } else if (s.tool.t === 'line' && s.tool.fromAssetId !== undefined) {
          s.setTool({ ...s.tool, fromAssetId: undefined });
        } else {
          s.setTool({ t: 'inspect' });
        }
        return;
      }
      if (s.menuOpen) return;
      const key = e.key.toLowerCase();
      if (key === 'g') {
        s.setGridView(!s.gridView);
      } else if (key === 'k') {
        s.setKpiOpen(!s.kpiOpen);
      } else if (key === 'u') {
        // flip overhead/underground on the armed line tool
        if (s.tool.t === 'line') {
          s.setTool({
            ...s.tool,
            build: s.tool.build === 'overhead' ? 'underground' : 'overhead',
            fromAssetId: undefined,
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
  const menuOpen = useAppStore((s) => s.menuOpen);

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <MapView />
      {/* lofi golden-hour grade over the whole scene */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'linear-gradient(160deg, rgba(255,178,102,0.12) 0%, rgba(224,105,122,0.08) 45%, rgba(16,22,48,0.18) 100%)',
        }}
      />
      {/* soft vignette pulls the eye to the lit city */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(ellipse at 50% 42%, transparent 52%, rgba(8, 6, 22, 0.42) 100%)',
        }}
      />
      {!menuOpen &&
        (isMobile ? (
          <MobileChrome />
        ) : (
          <>
            <Wordmark />
            <BuildPalette />
            <InfoPanel />
            <BillPanel />
            <FleetPanel />
            <InboxPanel />
            <AlertsFeed />
            <StatusBar />
          </>
        ))}
      {!menuOpen && <Hud compact={isMobile} />}
      <Toast />
      <Tutorial />
      <KpiDashboard />
      <StartMenu />
    </div>
  );
}
