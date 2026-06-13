// The alerts feed (corner) + the full filterable event log (#30/#39).
//
// #39 acknowledge / snooze: each row in the corner feed can be ticked
// (acknowledged → gone for good) or snoozed (hidden for 60 game-min, then
// re-fires). Acked/snoozed state lives in the store, persisted, so a known
// issue you're already working stops shouting.
//
// #30 filterable log: the "log ▸" button opens a full panel with category
// chips (faults / planning / weather / market / finance), a search box and
// click-to-jump rows, so the player can find one event in the flow.

import { useMemo, useState } from 'react';
import {
  alertVisible,
  categorizeEvent,
  EVENT_CATEGORIES,
  useAppStore,
  type EventCategory,
} from '../app/store';
import { statusColors, headingStyle, panelStyle, theme } from './theme';

/** Minutes an alert stays snoozed before it re-fires. */
const SNOOZE_MIN = 60;

const CAT_LABEL: Record<EventCategory, string> = {
  faults: 'faults',
  planning: 'planning',
  weather: 'weather',
  market: 'market',
  finance: 'finance',
};

function fmtT(tMin: number): string {
  const day = Math.floor(tMin / 1440) + 1;
  const h = String(Math.floor((tMin % 1440) / 60)).padStart(2, '0');
  const m = String(Math.floor(tMin % 60)).padStart(2, '0');
  return `d${day} ${h}:${m}`;
}

export function AlertsFeed({ frame }: { frame?: React.CSSProperties } = {}) {
  const snapshot = useAppStore((s) => s.snapshot);
  const requestPan = useAppStore((s) => s.requestPan);
  const ackAlert = useAppStore((s) => s.ackAlert);
  const snoozeAlert = useAppStore((s) => s.snoozeAlert);
  const acked = useAppStore((s) => s.ackedAlerts);
  const snoozed = useAppStore((s) => s.snoozedAlerts);
  const cbMode = useAppStore((s) => s.cbMode);
  const setEventLogOpen = useAppStore((s) => s.setEventLogOpen);
  if (!snapshot || snapshot.events.length === 0) return null;

  const now = snapshot.simTimeMin;
  const sev = statusColors(cbMode);
  const sevColor = { info: theme.slate, warn: sev.warn, bad: sev.danger } as const;

  // newest-first, only what still needs attention (#39 filters the feed)
  const recent = snapshot.events
    .filter((e) => alertVisible(e, now, acked, snoozed))
    .slice(-6)
    .reverse();

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
        lineHeight: 1.4,
        maxHeight: 150,
        overflowY: 'auto',
        ...frame,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 4,
        }}
      >
        <span style={headingStyle}>alerts</span>
        <button
          aria-label="open event log"
          onClick={() => setEventLogOpen(true)}
          title="Open the full filterable event log"
          style={{
            border: 'none',
            background: 'transparent',
            color: theme.gold,
            cursor: 'pointer',
            fontSize: 10,
            fontFamily: theme.font,
            padding: 0,
          }}
        >
          log ▸
        </button>
      </div>
      {recent.length === 0 && (
        <div style={{ color: theme.slate, fontStyle: 'italic' }}>all clear — nothing pending</div>
      )}
      {recent.map((e) => (
        <div
          key={e.seq}
          style={{
            display: 'flex',
            gap: 5,
            alignItems: 'baseline',
            padding: '1px 0',
          }}
        >
          <span style={{ color: theme.slate, flexShrink: 0, fontSize: 10 }}>{fmtT(e.tMin)}</span>
          <span
            onClick={() => e.x !== undefined && e.y !== undefined && requestPan(e.x, e.y)}
            style={{
              color: sevColor[e.sev],
              cursor: e.x !== undefined ? 'pointer' : 'default',
              flex: 1,
            }}
          >
            {e.msg}
          </span>
          <button
            aria-label="snooze alert"
            title="Snooze 1 hour — it re-fires after"
            onClick={() => snoozeAlert(e.seq, now + SNOOZE_MIN)}
            style={feedBtn}
          >
            zzz
          </button>
          <button
            aria-label="acknowledge alert"
            title="Acknowledge — dismiss this alert"
            onClick={() => ackAlert(e.seq)}
            style={feedBtn}
          >
            ✓
          </button>
        </div>
      ))}
    </div>
  );
}

const feedBtn: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: theme.slate,
  cursor: 'pointer',
  fontSize: 10,
  fontFamily: theme.font,
  padding: '0 2px',
  flexShrink: 0,
  lineHeight: 1,
};

/** #30: the full filterable event log. Categories, search, click-to-jump,
 *  ack/snooze, sticky timestamps. Reads the snapshot's event ring. */
export function EventLog() {
  const snapshot = useAppStore((s) => s.snapshot);
  const open = useAppStore((s) => s.eventLogOpen);
  const setOpen = useAppStore((s) => s.setEventLogOpen);
  const requestPan = useAppStore((s) => s.requestPan);
  const ackAlert = useAppStore((s) => s.ackAlert);
  const snoozeAlert = useAppStore((s) => s.snoozeAlert);
  const acked = useAppStore((s) => s.ackedAlerts);
  const snoozed = useAppStore((s) => s.snoozedAlerts);
  const cbMode = useAppStore((s) => s.cbMode);

  const [active, setActive] = useState<Set<EventCategory>>(new Set());
  const [query, setQuery] = useState('');

  const sev = statusColors(cbMode);
  const sevColor = { info: theme.slate, warn: sev.warn, bad: sev.danger } as const;

  const events = snapshot?.events ?? [];
  const now = snapshot?.simTimeMin ?? 0;

  // tag + filter (newest first). useMemo so typing stays smooth on long rings.
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events
      .map((e) => ({ e, cat: categorizeEvent(e) }))
      .filter(({ e, cat }) => {
        if (active.size > 0 && !active.has(cat)) return false;
        if (q && !e.msg.toLowerCase().includes(q)) return false;
        return true;
      })
      .reverse();
  }, [events, active, query]);

  if (!open) return null;

  const toggle = (c: EventCategory): void => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  };

  const chip = (c: EventCategory): React.CSSProperties => {
    const on = active.has(c);
    return {
      padding: '3px 9px',
      borderRadius: 12,
      border: `1px solid ${on ? theme.orange : theme.navyLight}`,
      background: on ? theme.orange : 'transparent',
      color: on ? theme.navy : theme.slate,
      fontFamily: theme.font,
      fontSize: 11,
      cursor: 'pointer',
    };
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `${theme.night}99`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 6,
      }}
      onClick={() => setOpen(false)}
    >
      <div
        data-tour="eventlog"
        style={{
          ...panelStyle,
          width: 'min(520px, 95vw)',
          maxHeight: '82vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '14px 18px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ color: theme.orange, fontWeight: 800, letterSpacing: '0.04em' }}>
            EVENT LOG
          </div>
          <button
            aria-label="close event log"
            onClick={() => setOpen(false)}
            style={{
              border: 'none',
              background: 'transparent',
              color: theme.slate,
              fontFamily: theme.font,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* filter chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {EVENT_CATEGORIES.map((c) => (
            <button key={c} onClick={() => toggle(c)} style={chip(c)}>
              {CAT_LABEL[c]}
            </button>
          ))}
          {active.size > 0 && (
            <button
              onClick={() => setActive(new Set())}
              style={{ ...chip('faults'), border: 'none', background: 'transparent', color: theme.slate }}
            >
              clear
            </button>
          )}
        </div>

        {/* search */}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="search events…"
          aria-label="search events"
          style={{
            marginTop: 10,
            padding: '6px 10px',
            borderRadius: 6,
            border: `1px solid ${theme.navyLight}`,
            background: 'rgba(10,14,34,0.5)',
            color: theme.offWhite,
            fontFamily: theme.font,
            fontSize: 12,
            outline: 'none',
          }}
        />

        <div style={{ color: theme.slate, fontSize: 10.5, margin: '8px 0 4px' }}>
          {rows.length} event{rows.length === 1 ? '' : 's'}
          {active.size > 0 || query ? ' (filtered)' : ''}
        </div>

        {/* rows */}
        <div style={{ overflowY: 'auto', flex: 1, fontSize: 12 }}>
          {rows.length === 0 && (
            <div style={{ color: theme.slate, fontStyle: 'italic', padding: '8px 0' }}>
              nothing matches.
            </div>
          )}
          {rows.map(({ e, cat }) => {
            const hidden = !alertVisible(e, now, acked, snoozed);
            return (
              <div
                key={e.seq}
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'baseline',
                  padding: '4px 0',
                  borderBottom: '1px solid rgba(141,151,180,0.1)',
                  opacity: hidden ? 0.4 : 1,
                }}
              >
                <span style={{ color: theme.slate, fontSize: 10, flexShrink: 0, width: 58 }}>
                  {fmtT(e.tMin)}
                </span>
                <span style={{ color: theme.gold, fontSize: 10, flexShrink: 0, width: 56 }}>
                  {CAT_LABEL[cat]}
                </span>
                <span
                  onClick={() => e.x !== undefined && e.y !== undefined && requestPan(e.x, e.y)}
                  style={{
                    color: sevColor[e.sev],
                    cursor: e.x !== undefined ? 'pointer' : 'default',
                    flex: 1,
                    textDecoration: hidden ? 'line-through' : undefined,
                  }}
                >
                  {e.msg}
                </span>
                {!hidden && (
                  <>
                    <button
                      aria-label="snooze"
                      title="Snooze 1 hour"
                      onClick={() => snoozeAlert(e.seq, now + SNOOZE_MIN)}
                      style={feedBtn}
                    >
                      zzz
                    </button>
                    <button
                      aria-label="acknowledge"
                      title="Acknowledge"
                      onClick={() => ackAlert(e.seq)}
                      style={feedBtn}
                    >
                      ✓
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
