import { useEffect } from 'react';
import { BillPanel } from '../ui/BillPanel';
import { BuildPalette } from '../ui/BuildPalette';
import { Hud } from '../ui/Hud';
import { InfoPanel } from '../ui/InfoPanel';
import { MapView } from '../ui/MapView';
import { panelStyle, theme } from '../ui/theme';
import { useAppStore } from './store';
import { initWorker, setSimSpeed } from './workerBridge';

function Wordmark() {
  return (
    <div
      style={{
        ...panelStyle,
        position: 'absolute',
        top: 12,
        left: 12,
        padding: '8px 14px',
        fontSize: 18,
        fontWeight: 800,
        letterSpacing: '0.05em',
        pointerEvents: 'none',
      }}
    >
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
        <span style={{ color: theme.slate }}>drag to pan · scroll to zoom · G for grid view</span>
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
      if (e.key === 'Escape') {
        if (s.tool.t === 'line' && s.tool.fromAssetId !== undefined) {
          s.setTool({ ...s.tool, fromAssetId: undefined });
        } else {
          s.setTool({ t: 'inspect' });
        }
      } else if (e.key === 'g' || e.key === 'G') {
        s.setGridView(!s.gridView);
      } else if (e.key === ' ') {
        e.preventDefault();
        setSimSpeed(s.snapshot?.speed === 0 ? 1 : 0);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

export function App() {
  useEffect(() => {
    initWorker();
  }, []);
  useKeyboard();

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
            'linear-gradient(160deg, rgba(255,178,102,0.10) 0%, rgba(224,105,122,0.07) 45%, rgba(16,22,48,0.16) 100%)',
        }}
      />
      <Wordmark />
      <BuildPalette />
      <InfoPanel />
      <BillPanel />
      <Hud />
      <StatusBar />
      <Toast />
    </div>
  );
}
