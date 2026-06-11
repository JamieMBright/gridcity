import { useEffect } from 'react';
import { InfoPanel } from '../ui/InfoPanel';
import { MapView } from '../ui/MapView';
import { theme } from '../ui/theme';
import { useAppStore } from './store';
import { initWorker } from './workerBridge';

function formatGameClock(simTimeMin: number): string {
  const day = Math.floor(simTimeMin / (24 * 60)) + 1;
  const minOfDay = simTimeMin % (24 * 60);
  const h = String(Math.floor(minOfDay / 60)).padStart(2, '0');
  const m = String(Math.floor(minOfDay % 60)).padStart(2, '0');
  return `day ${day} · ${h}:${m}`;
}

function Wordmark() {
  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        left: 12,
        padding: '8px 14px',
        background: `${theme.navy}e6`,
        border: `1px solid ${theme.navyLight}`,
        borderRadius: 8,
        fontFamily: theme.font,
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
  const snapshot = useAppStore((s) => s.snapshot);
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 12,
        left: 12,
        padding: '6px 12px',
        background: `${theme.navy}e6`,
        border: `1px solid ${theme.navyLight}`,
        borderRadius: 8,
        color: theme.offWhite,
        fontFamily: theme.font,
        fontSize: 12,
        pointerEvents: 'none',
      }}
    >
      {workerStatus === 'connecting' && <span style={{ color: theme.gold }}>starting sim…</span>}
      {workerStatus === 'error' && (
        <span style={{ color: theme.danger }}>sim error: {workerError}</span>
      )}
      {workerStatus === 'ready' && snapshot && (
        <span>
          <span style={{ color: theme.ok }}>●</span> {formatGameClock(snapshot.simTimeMin)}
          <span style={{ color: theme.slate }}> · drag to pan · scroll to zoom</span>
        </span>
      )}
    </div>
  );
}

export function App() {
  useEffect(() => {
    initWorker();
  }, []);

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
      <InfoPanel />
      <StatusBar />
    </div>
  );
}
