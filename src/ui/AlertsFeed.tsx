import { useAppStore } from '../app/store';
import { panelStyle, theme } from './theme';

const SEV_COLOR = { info: theme.slate, warn: theme.warn, bad: theme.danger } as const;

function fmtT(tMin: number): string {
  const day = Math.floor(tMin / 1440) + 1;
  const h = String(Math.floor((tMin % 1440) / 60)).padStart(2, '0');
  const m = String(Math.floor(tMin % 60)).padStart(2, '0');
  return `d${day} ${h}:${m}`;
}

export function AlertsFeed({ frame }: { frame?: React.CSSProperties } = {}) {
  const snapshot = useAppStore((s) => s.snapshot);
  const requestPan = useAppStore((s) => s.requestPan);
  if (!snapshot || snapshot.events.length === 0) return null;
  const recent = snapshot.events.slice(-6).reverse();

  return (
    <div
      style={{
        ...panelStyle,
        position: 'absolute',
        bottom: 320,
        right: 12,
        width: 250,
        padding: '6px 10px',
        fontSize: 11,
        lineHeight: 1.5,
        maxHeight: 120,
        overflowY: 'auto',
        ...frame,
      }}
    >
      {recent.map((e) => (
        <div
          key={e.seq}
          onClick={() => e.x !== undefined && e.y !== undefined && requestPan(e.x, e.y)}
          style={{
            cursor: e.x !== undefined ? 'pointer' : 'default',
            display: 'flex',
            gap: 6,
          }}
        >
          <span style={{ color: theme.slate, flexShrink: 0 }}>{fmtT(e.tMin)}</span>
          <span style={{ color: SEV_COLOR[e.sev] }}>{e.msg}</span>
        </div>
      ))}
    </div>
  );
}
