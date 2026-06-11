import { useEffect } from 'react';
import { theme } from '../ui/theme';
import { useAppStore } from './store';
import { initWorker } from './workerBridge';

function formatGameClock(simTimeMin: number): string {
  const day = Math.floor(simTimeMin / (24 * 60)) + 1;
  const minOfDay = simTimeMin % (24 * 60);
  const h = String(Math.floor(minOfDay / 60)).padStart(2, '0');
  const m = String(Math.floor(minOfDay % 60)).padStart(2, '0');
  return `day ${day}, ${h}:${m}`;
}

export function App() {
  const workerStatus = useAppStore((s) => s.workerStatus);
  const workerError = useAppStore((s) => s.workerError);
  const snapshot = useAppStore((s) => s.snapshot);

  useEffect(() => {
    initWorker();
  }, []);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        background: `linear-gradient(180deg, ${theme.dusk} 0%, ${theme.navy} 55%, ${theme.night} 100%)`,
        color: theme.offWhite,
        fontFamily: theme.font,
      }}
    >
      <h1 style={{ margin: 0, fontSize: '2.5rem', letterSpacing: '0.04em' }}>
        <span style={{ color: theme.orange }}>ELECTRI</span>
        <span style={{ color: theme.slate }}>CITY</span>
      </h1>
      <div style={{ color: theme.slate }}>power the city</div>
      <div style={{ fontSize: '0.9rem' }}>
        {workerStatus === 'connecting' && <span style={{ color: theme.gold }}>starting sim…</span>}
        {workerStatus === 'error' && (
          <span style={{ color: theme.danger }}>sim error: {workerError}</span>
        )}
        {workerStatus === 'ready' && snapshot && (
          <span style={{ color: theme.ok }}>
            sim running — tick {snapshot.tick} · {formatGameClock(snapshot.simTimeMin)}
          </span>
        )}
      </div>
    </div>
  );
}
