// Connection applications, generation tenders and innovation pitches.
// Applications can be offered a firm connection (full access, compensation
// when constrained) or a flexible one (curtailable, no comp — cheaper for
// everyone); tenders collect developer bids the player awards; pitches
// draw on the innovation fund the levy fills.

import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../app/store';
import { requestStudy, sendCommand } from '../app/workerBridge';
import { GENS } from '../sim/catalog';
import { GEN_OF_KIND } from '../sim/events/applications';
import {
  developerOf,
  FIRM_RENEWABLES,
  type Bid,
  type Tender,
} from '../sim/events/developers';
import { CONSTRAINT_COMP_K } from '../sim/market/dispatch';
import { FirmFlexCompare } from './FirmFlexCompare';
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
  const studies = useAppStore((s) => s.studies);
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

  const claims = snapshot.claims ?? [];
  const apps = snapshot.inbox.applications.filter((a) => a.status === 'open');
  // schemes on non-brownfield land sit under a council determination window
  const appeals = snapshot.inbox.applications.filter((a) => a.status === 'appeal');
  const overdue = snapshot.inbox.applications.filter(
    (a) =>
      (a.status === 'firm' || a.status === 'flex') &&
      a.connectByMin !== undefined &&
      snapshot.simTimeMin > a.connectByMin,
  );
  const pitches = snapshot.inbox.pitches.filter((p) => p.status === 'open' || p.status === 'funded');
  const tenders = snapshot.inbox.tenders.filter((t) => t.status === 'open');
  const count =
    apps.length +
    appeals.length +
    tenders.length +
    claims.length +
    pitches.filter((p) => p.status === 'open').length;
  if (count === 0 && overdue.length === 0 && !open) return null;

  // CfD allocation rounds (#14): tenders swept into a round (Tender.roundId,
  // stamped by the worker's quarterly sweep) group under one "ALLOCATION
  // ROUND n" banner with a one-click clear; sites designated between rounds
  // list as plain tenders exactly as before.
  const cheapestBid = (t: Tender): Bid | undefined =>
    [...t.bids].sort((a, b) => a.priceMWh - b.priceMWh)[0];
  const roundIds = [
    ...new Set(tenders.map((t) => t.roundId).filter((r): r is number => r !== undefined)),
  ].sort((a, b) => a - b);
  const soloTenders = tenders.filter((t) => t.roundId === undefined);

  const sectionHeader = (label: string, key?: string): React.ReactElement => (
    <div
      key={key}
      style={{ color: theme.slate, fontSize: 10, letterSpacing: '0.12em', marginTop: 8 }}
    >
      {label}
    </div>
  );

  const tenderCard = (t: Tender): React.ReactElement => {
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
              {developerOf(b.developerId)?.name ?? 'developer'}
              {b.mw !== undefined && (
                <span>
                  {' '}· {b.mw} MW
                  {b.mw < g.capacityMW && (
                    <span style={{ color: theme.slate }}> — what fits this site</span>
                  )}
                </span>
              )}{' '}
              · £{b.priceMWh}/MWh
              {FIRM_RENEWABLES.has(t.gen) && (
                <span style={{ color: theme.slate }}>
                  {' '}· curtails at £
                  {Math.round(
                    (developerOf(b.developerId)?.curtailPriceK ?? CONSTRAINT_COMP_K) * 1000,
                  )}
                  /MWh
                </span>
              )}
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
  };

  return (
    <div
      data-tour="inbox"
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
        // sit ABOVE the alerts feed (zIndex 4) — the inbox is interactive
        // (run study / offer firm·flex / decline) and its taller open-app
        // card with the firm/flex comparison overlaps the alerts band, so
        // it must win the stack (matches the pinned-inspector doctrine)
        zIndex: 5,
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
          {apps.length + tenders.length + pitches.length + overdue.length + claims.length === 0 && (
            <div style={{ color: theme.slate, fontSize: 11 }}>nothing waiting</div>
          )}
          {/* litigation (#54): each claim offers settle / fight / remediate */}
          {claims.length > 0 && sectionHeader('CLAIMS & SUITS', 'claims-h')}
          {claims.map((c) => (
            <div key={`c${c.id}`} style={{ marginTop: 6 }}>
              <div
                style={{ color: theme.danger, cursor: c.x !== undefined ? 'pointer' : 'default' }}
                onClick={() => c.x !== undefined && c.y !== undefined && requestPan(c.x, c.y)}
              >
                ⚖ {c.title}
              </div>
              <div style={{ color: theme.slate, fontSize: 11, lineHeight: 1.4 }}>{c.blurb}</div>
              <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
                <button
                  style={btn(theme.gold)}
                  title="Pay now — fast, certain, a small reputation hit"
                  onClick={() =>
                    sendCommand({ type: 'claimResponse', claimId: c.id, response: 'settle' })
                  }
                >
                  settle {fmtMoneyK(c.settleK)}
                </button>
                <button
                  style={btn(theme.orangeSoft)}
                  title="Defend it in court — legal spend, then an uncertain outcome (better odds with safety/legal funding)"
                  onClick={() =>
                    sendCommand({ type: 'claimResponse', claimId: c.id, response: 'fight' })
                  }
                >
                  fight {fmtMoneyK(c.fightK)}
                </button>
                <button
                  style={btn(theme.ok)}
                  title="Fix the underlying cause — addresses the grievance"
                  onClick={() =>
                    sendCommand({ type: 'claimResponse', claimId: c.id, response: 'remediate' })
                  }
                >
                  {c.remediateK > 0 ? `remediate ${fmtMoneyK(c.remediateK)}` : 'put it right'}
                </button>
              </div>
            </div>
          ))}
          {roundIds.map((r) => {
            // round members sorted cheapest-first by their best bid
            const members = tenders
              .filter((t) => t.roundId === r)
              .sort(
                (a, b) =>
                  (cheapestBid(a)?.priceMWh ?? Infinity) -
                  (cheapestBid(b)?.priceMWh ?? Infinity),
              );
            const awards = members
              .map((t) => ({ t, bid: cheapestBid(t) }))
              .filter((x): x is { t: Tender; bid: Bid } => x.bid !== undefined);
            const avg =
              awards.length > 0
                ? Math.round(awards.reduce((s, x) => s + x.bid.priceMWh, 0) / awards.length)
                : 0;
            return (
              <div key={`round${r}`}>
                {sectionHeader(`ALLOCATION ROUND ${r}`)}
                {awards.length > 0 && (
                  <div style={{ marginTop: 4 }}>
                    <button
                      style={btn(theme.gold)}
                      title="Award the cheapest bid on every site in this round"
                      onClick={() => {
                        // v1: the clear is sequential acceptBid commands, so a
                        // multi-site round lands as multiple undo steps
                        for (const { t, bid } of awards) {
                          sendCommand({
                            type: 'acceptBid',
                            tenderId: t.id,
                            developerId: bid.developerId,
                          });
                        }
                      }}
                    >
                      clear round at £{avg}/MWh avg
                    </button>
                  </div>
                )}
                {members.map(tenderCard)}
              </div>
            );
          })}
          {soloTenders.length > 0 && sectionHeader('TENDERS', 'tenders-h')}
          {soloTenders.map(tenderCard)}
          {apps.map((a) => {
            const daysLeft = Math.max(0, (a.decideByMin - snapshot.simTimeMin) / 1440);
            const isGen = GEN_OF_KIND[a.kind] !== undefined;
            const study = studies[a.id];
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
                {study && study.ok && study.bayName !== undefined && (
                  <div style={{ fontSize: 11, marginTop: 3, color: theme.slate }}>
                    study: {study.level} kV line to {study.bayName} ({study.distKm} km,{' '}
                    {fmtMoneyK(study.lineCapexK ?? 0)})
                  </div>
                )}
                {study && study.impacts.length > 0 && (
                  <div style={{ fontSize: 11, marginTop: 2, lineHeight: 1.45 }}>
                    {study.impacts.map((imp, i) => (
                      <div key={i} style={{ color: theme.danger }}>
                        ⚠ {imp.label}: {imp.beforePct}% → {imp.afterPct}%
                      </div>
                    ))}
                  </div>
                )}
                {/* side-by-side firm/flex tradeoff (T4) — cards carry the
                    accept buttons; the loose study + decline buttons stay */}
                <FirmFlexCompare
                  study={study}
                  isGen={isGen}
                  onFirm={() =>
                    sendCommand({ type: 'respondApplication', appId: a.id, response: 'firm' })
                  }
                  onFlex={() =>
                    sendCommand({ type: 'respondApplication', appId: a.id, response: 'flex' })
                  }
                />
                <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
                  {!study && (
                    <button
                      style={btn(theme.orangeSoft)}
                      title="Simulate this connection: wire it to the nearest bay and check what overloads at stress"
                      onClick={() => requestStudy(a.id)}
                    >
                      ⚖ study
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
          {appeals.length > 0 && sectionHeader('IN PLANNING', 'appeals-h')}
          {appeals.map((a) => {
            const daysLeft = a.appeal
              ? Math.max(0, (a.appeal.decideAtMin - snapshot.simTimeMin) / 1440)
              : 0;
            const odds = a.appeal ? Math.round(a.appeal.approveOdds * 100) : 0;
            const landLabel =
              a.landType === 'conservation'
                ? 'conservation area'
                : a.landType === 'greenbelt'
                  ? 'green belt'
                  : 'greenfield';
            return (
              <div key={`ap${a.id}`} style={{ marginTop: 8 }}>
                <div
                  style={{ color: theme.gold, cursor: 'pointer' }}
                  onClick={() => requestPan(a.x, a.y)}
                >
                  {a.name}
                </div>
                <div style={{ color: theme.slate, fontSize: 11 }}>
                  {a.mw} MW · {landLabel}
                </div>
                <div style={{ color: theme.orangeSoft, fontSize: 11, marginTop: 2 }}>
                  in planning — {a.appeal?.council ?? 'council'} to determine in{' '}
                  {daysLeft.toFixed(0)}d ({odds}% likely)
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
