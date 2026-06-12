// Connection applications and innovation pitches. Applications can be
// offered a firm connection (full access, compensation when constrained)
// or a flexible one (curtailable, no comp — cheaper for everyone); pitches
// draw on the innovation fund the levy fills.

import { useState } from 'react';
import { useAppStore } from '../app/store';
import { sendCommand } from '../app/workerBridge';
import { GEN_OF_KIND } from '../sim/events/applications';
import { fmtMoneyK, panelStyle, theme } from './theme';

const btn = (color: string): React.CSSProperties => ({
  padding: '2px 8px',
  borderRadius: 5,
  border: `1px solid ${color}`,
  background: 'transparent',
  color,
  fontFamily: theme.font,
  fontSize: 11,
  cursor: 'pointer',
});

export function InboxPanel({ frame }: { frame?: React.CSSProperties } = {}) {
  const snapshot = useAppStore((s) => s.snapshot);
  const requestPan = useAppStore((s) => s.requestPan);
  const [open, setOpen] = useState(true);
  if (!snapshot) return null;

  const apps = snapshot.inbox.applications.filter((a) => a.status === 'open');
  const overdue = snapshot.inbox.applications.filter(
    (a) =>
      (a.status === 'firm' || a.status === 'flex') &&
      a.connectByMin !== undefined &&
      snapshot.simTimeMin > a.connectByMin,
  );
  const pitches = snapshot.inbox.pitches.filter((p) => p.status === 'open' || p.status === 'funded');
  const count = apps.length + pitches.filter((p) => p.status === 'open').length;
  if (count === 0 && overdue.length === 0 && !open) return null;

  return (
    <div
      style={{
        ...panelStyle,
        position: 'absolute',
        top: 240,
        right: 12,
        width: 270,
        maxHeight: 'max(120px, calc(100vh - 640px))',
        overflowY: 'auto',
        padding: '8px 12px',
        fontSize: 12,
        lineHeight: 1.5,
        ...frame,
      }}
    >
      <div
        onClick={() => setOpen(!open)}
        style={{
          color: theme.slate,
          fontSize: 10,
          letterSpacing: '0.12em',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>
          INBOX{count > 0 && <span style={{ color: theme.orange }}> ({count})</span>}
        </span>
        <span>{open ? '▾' : '▸'}</span>
      </div>
      {open && (
        <>
          {apps.length + pitches.length + overdue.length === 0 && (
            <div style={{ color: theme.slate, fontSize: 11 }}>nothing waiting</div>
          )}
          {apps.map((a) => {
            const daysLeft = Math.max(0, (a.decideByMin - snapshot.simTimeMin) / 1440);
            const isGen = GEN_OF_KIND[a.kind] !== undefined;
            return (
              <div key={a.id} style={{ marginTop: 8 }}>
                <div
                  style={{ color: theme.gold, cursor: 'pointer' }}
                  onClick={() => requestPan(a.x, a.y)}
                >
                  {a.name}
                </div>
                <div style={{ color: theme.slate, fontSize: 11 }}>
                  {a.mw} MW {isGen ? 'generation' : 'new demand'} · decide in{' '}
                  {daysLeft.toFixed(0)}d
                </div>
                <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                  <button
                    style={btn(theme.ok)}
                    title="Full access; you compensate them if constrained off"
                    onClick={() =>
                      sendCommand({ type: 'respondApplication', appId: a.id, response: 'firm' })
                    }
                  >
                    firm
                  </button>
                  {isGen && (
                    <button
                      style={btn(theme.gold)}
                      title="Curtailable connection — no compensation owed"
                      onClick={() =>
                        sendCommand({ type: 'respondApplication', appId: a.id, response: 'flex' })
                      }
                    >
                      flexible
                    </button>
                  )}
                  <button
                    style={btn(theme.slate)}
                    onClick={() =>
                      sendCommand({ type: 'respondApplication', appId: a.id, response: 'decline' })
                    }
                  >
                    decline
                  </button>
                </div>
              </div>
            );
          })}
          {overdue.map((a) => (
            <div key={`od${a.id}`} style={{ marginTop: 8 }}>
              <div
                style={{ color: theme.danger, cursor: 'pointer' }}
                onClick={() => requestPan(a.x, a.y)}
              >
                ⚠ {a.name} still dark — paying damages
              </div>
            </div>
          ))}
          {pitches.map((p) => (
            <div key={`p${p.id}`} style={{ marginTop: 8 }}>
              <div style={{ color: theme.orangeSoft }}>{p.title}</div>
              <div style={{ color: theme.slate, fontSize: 11 }}>{p.blurb}</div>
              {p.status === 'open' ? (
                <div style={{ display: 'flex', gap: 6, marginTop: 3, alignItems: 'center' }}>
                  <button
                    style={btn(theme.ok)}
                    onClick={() => sendCommand({ type: 'fundPitch', pitchId: p.id })}
                  >
                    fund {fmtMoneyK(p.costK)}
                  </button>
                  <span style={{ color: theme.slate, fontSize: 11 }}>
                    {p.successPct}% odds · {p.durationDays}d
                  </span>
                </div>
              ) : (
                <div style={{ color: theme.gold, fontSize: 11 }}>in progress…</div>
              )}
            </div>
          ))}
          <div style={{ color: theme.slate, fontSize: 11, marginTop: 8 }}>
            innovation fund {fmtMoneyK(snapshot.inbox.innovationFundK)}
          </div>
        </>
      )}
    </div>
  );
}
