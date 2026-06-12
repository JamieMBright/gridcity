// Connection applications, generation tenders and innovation pitches.
// Applications can be offered a firm connection (full access, compensation
// when constrained) or a flexible one (curtailable, no comp — cheaper for
// everyone); tenders collect developer bids the player awards; pitches
// draw on the innovation fund the levy fills.

import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../app/store';
import { sendCommand } from '../app/workerBridge';
import { GENS } from '../sim/catalog';
import { GEN_OF_KIND } from '../sim/events/applications';
import { developerOf } from '../sim/events/developers';
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
  const inboxFocus = useAppStore((s) => s.inboxFocus);
  const [open, setOpen] = useState(true);
  // a clicked map pin snaps the inbox to its message: open, scroll, flash
  const [flashKey, setFlashKey] = useState<string | undefined>(undefined);
  const itemRefs = useRef(new Map<string, HTMLDivElement>());
  useEffect(() => {
    if (!inboxFocus) return;
    setOpen(true);
    const s = useAppStore.getState().snapshot;
    const t = s?.inbox.tenders.find(
      (x) => x.status === 'open' && x.x === inboxFocus.x && x.y === inboxFocus.y,
    );
    const a = s?.inbox.applications.find((x) => x.x === inboxFocus.x && x.y === inboxFocus.y);
    const key = t ? `t${t.id}` : a ? `a${a.id}` : undefined;
    if (!key) return;
    setFlashKey(key);
    const el = itemRefs.current.get(key);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    const timer = setTimeout(() => setFlashKey(undefined), 2200);
    return () => clearTimeout(timer);
  }, [inboxFocus]);
  if (!snapshot) return null;

  const flashStyle = (key: string): React.CSSProperties =>
    flashKey === key
      ? {
          background: 'rgba(255, 138, 30, 0.18)',
          outline: '1px solid rgba(255, 138, 30, 0.7)',
          borderRadius: 6,
          padding: '2px 4px',
          margin: '6px -4px 0',
        }
      : {};

  const apps = snapshot.inbox.applications.filter((a) => a.status === 'open');
  const overdue = snapshot.inbox.applications.filter(
    (a) =>
      (a.status === 'firm' || a.status === 'flex') &&
      a.connectByMin !== undefined &&
      snapshot.simTimeMin > a.connectByMin,
  );
  const pitches = snapshot.inbox.pitches.filter((p) => p.status === 'open' || p.status === 'funded');
  const tenders = snapshot.inbox.tenders.filter((t) => t.status === 'open');
  const count =
    apps.length + tenders.length + pitches.filter((p) => p.status === 'open').length;
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
          {apps.length + tenders.length + pitches.length + overdue.length === 0 && (
            <div style={{ color: theme.slate, fontSize: 11 }}>nothing waiting</div>
          )}
          {tenders.length > 0 && (
            <div
              style={{ color: theme.slate, fontSize: 10, letterSpacing: '0.12em', marginTop: 8 }}
            >
              TENDERS
            </div>
          )}
          {tenders.map((t) => {
            const g = GENS[t.gen];
            const closeDays = Math.max(0, (t.closesMin - snapshot.simTimeMin) / 1440);
            return (
              <div
                key={`t${t.id}`}
                ref={(el) => {
                  if (el) itemRefs.current.set(`t${t.id}`, el);
                  else itemRefs.current.delete(`t${t.id}`);
                }}
                style={{ marginTop: 6, ...flashStyle(`t${t.id}`) }}
              >
                <div
                  style={{ color: theme.gold, cursor: 'pointer' }}
                  onClick={() => requestPan(t.x, t.y)}
                >
                  {g.name} site
                </div>
                <div style={{ color: theme.slate, fontSize: 11 }}>
                  {t.bids.length === 0
                    ? `awaiting developer bids · closes in ${closeDays.toFixed(0)}d`
                    : `${t.bids.length} bid${t.bids.length > 1 ? 's' : ''} in`}
                </div>
                {t.bids.map((b) => (
                  <div
                    key={b.developerId}
                    style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 3 }}
                  >
                    <span style={{ flex: 1, fontSize: 11 }}>
                      {developerOf(b.developerId)?.name ?? 'developer'} · £{b.priceMWh}/MWh
                    </span>
                    <button
                      style={btn(theme.ok)}
                      title="Award the tender — the developer builds and owns the plant"
                      onClick={() =>
                        sendCommand({
                          type: 'acceptBid',
                          tenderId: t.id,
                          developerId: b.developerId,
                        })
                      }
                    >
                      award
                    </button>
                  </div>
                ))}
                <div style={{ marginTop: 3 }}>
                  <button
                    style={btn(theme.slate)}
                    title="Withdraw the tender (bidders will not be pleased)"
                    onClick={() => sendCommand({ type: 'declineTender', tenderId: t.id })}
                  >
                    withdraw
                  </button>
                </div>
              </div>
            );
          })}
          {apps.map((a) => {
            const daysLeft = Math.max(0, (a.decideByMin - snapshot.simTimeMin) / 1440);
            const isGen = GEN_OF_KIND[a.kind] !== undefined;
            return (
              <div
                key={a.id}
                ref={(el) => {
                  if (el) itemRefs.current.set(`a${a.id}`, el);
                  else itemRefs.current.delete(`a${a.id}`);
                }}
                style={{ marginTop: 8, ...flashStyle(`a${a.id}`) }}
              >
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
