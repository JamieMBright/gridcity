import { useAppStore } from '../app/store';
import { setSimSpeed } from '../app/workerBridge';
import type { SimSpeed } from '../sim/protocol';
import { panelStyle, theme } from './theme';

function formatGameClock(simTimeMin: number): string {
  const day = Math.floor(simTimeMin / (24 * 60)) + 1;
  const minOfDay = simTimeMin % (24 * 60);
  const h = String(Math.floor(minOfDay / 60)).padStart(2, '0');
  const m = String(Math.floor(minOfDay % 60)).padStart(2, '0');
  return `day ${day} · ${h}:${m}`;
}

const SPEEDS: Array<{ speed: SimSpeed; label: string }> = [
  { speed: 0, label: '⏸' },
  { speed: 1, label: '▶' },
  { speed: 4, label: '▶▶' },
  { speed: 16, label: '▶▶▶' },
];

export function Hud() {
  const snapshot = useAppStore((s) => s.snapshot);
  const gridView = useAppStore((s) => s.gridView);
  const setGridView = useAppStore((s) => s.setGridView);

  return (
    <div
      style={{
        ...panelStyle,
        position: 'absolute',
        bottom: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '6px 12px',
      }}
    >
      <span style={{ minWidth: 110, color: theme.gold }}>
        {snapshot ? formatGameClock(snapshot.simTimeMin) : '—'}
      </span>
      <span style={{ display: 'flex', gap: 2 }}>
        {SPEEDS.map(({ speed, label }) => {
          const active = snapshot?.speed === speed;
          return (
            <button
              key={speed}
              onClick={() => setSimSpeed(speed)}
              style={{
                padding: '3px 9px',
                borderRadius: 5,
                border: 'none',
                background: active ? theme.orange : 'transparent',
                color: active ? theme.navy : theme.slate,
                fontFamily: theme.font,
                fontSize: 12,
                fontWeight: active ? 700 : 400,
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          );
        })}
      </span>
      <button
        onClick={() => setGridView(!gridView)}
        title="Grid view: dim the city, highlight the network (G)"
        style={{
          padding: '3px 10px',
          borderRadius: 5,
          border: `1px solid ${gridView ? theme.orange : theme.navyLight}`,
          background: gridView ? theme.orange : 'transparent',
          color: gridView ? theme.navy : theme.slate,
          fontFamily: theme.font,
          fontSize: 12,
          fontWeight: gridView ? 700 : 400,
          cursor: 'pointer',
        }}
      >
        ⚡ grid view
      </button>
    </div>
  );
}
