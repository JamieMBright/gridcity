// The grid balance: whole-area and per-council demand vs connected
// supply, with the typical-day profile chart and worst-hour shortfall —
// the "what does this town need" view. Rows ring-fence their council on
// the map when tapped, and shortfall rows can ask the reinforcement
// planner for costed work bundles ("plan works").

import { useEffect, useState } from 'react';
import { useAppStore } from '../app/store';
import { requestBalance, requestPlan, sendCommand } from '../app/workerBridge';
import type { ScopeBalance, ScopePoint } from '../sim/balance';
import type { ReinforcementOption, ReinforcementPlan } from '../sim/planner';
import { panelStyle, theme } from './theme';

function ProfileChart({ profile }: { profile: ScopePoint[] }) {
  const w = 470;
  const h = 130;
  const top = 12;
  const max = Math.max(...profile.map((p) => Math.max(p.demandMW, p.supplyMW)), 1);
  const X = (i: number): number => (i / (profile.length - 1)) * w;
  const Y = (v: number): number => h - (v / max) * (h - top);
  const dPts = profile.map((p, i) => `${X(i).toFixed(1)},${Y(p.demandMW).toFixed(1)}`).join(' ');
  const sPts = profile.map((p, i) => `${X(i).toFixed(1)},${Y(p.supplyMW).toFixed(1)}`).join(' ');
  const sArea = `0,${h} ${sPts} ${w},${h}`;
  // shade only the unserved gap, hour by hour
  const gaps: string[] = [];
  for (let i = 0; i + 1 < profile.length; i++) {
    const a = profile[i];
    const b = profile[i + 1];
    if (!a || !b) continue;
    if (a.demandMW > a.supplyMW || b.demandMW > b.supplyMW) {
      gaps.push(
        `${X(i)},${Y(Math.max(a.demandMW, a.supplyMW))} ${X(i + 1)},${Y(Math.max(b.demandMW, b.supplyMW))} ${X(i + 1)},${Y(b.supplyMW)} ${X(i)},${Y(a.supplyMW)}`,
      );
    }
  }
  return (
    <div>
      <svg width={w} height={h} style={{ display: 'block', background: 'rgba(0,0,0,0.25)', borderRadius: 6 }}>
        <polygon points={sArea} fill={theme.ok} opacity={0.18} />
        {gaps.map((g, i) => (
          <polygon key={i} points={g} fill={theme.danger} opacity={0.3} />
        ))}
        <polyline points={sPts} fill="none" stroke={theme.ok} strokeWidth={1.5} />
        <polyline points={dPts} fill="none" stroke={theme.gold} strokeWidth={1.8} />
        {[0, 6, 12, 18].map((hh) => (
          <text key={hh} x={X(hh) + 2} y={h - 3} fill={theme.slate} fontSize={9} fontFamily={theme.font}>
            {String(hh).padStart(2, '0')}:00
          </text>
        ))}
      </svg>
      <div style={{ fontSize: 10, color: theme.slate, marginTop: 2 }}>
        <span style={{ color: theme.gold }}>— demand</span>{' '}
        <span style={{ color: theme.ok }}>— connected supply</span>{' '}
        <span style={{ color: theme.danger }}>▮ unserved gap</span> · typical day
      </div>
    </div>
  );
}

function ScopeRow({
  sc,
  selected,
  onClick,
  onPlan,
}: {
  sc: ScopeBalance;
  selected: boolean;
  onClick: () => void;
  onPlan: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
        padding: '4px 8px',
        borderRadius: 6,
        cursor: 'pointer',
        background: selected ? 'rgba(255,138,30,0.14)' : 'transparent',
        outline: selected ? `1px solid ${theme.orange}` : 'none',
        fontSize: 12,
      }}
    >
      <span style={{ color: selected ? theme.orange : theme.offWhite, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {sc.name}
      </span>
      <span style={{ color: theme.slate, flex: 'none' }}>
        {sc.connectedCustomers.toLocaleString()}/{sc.customers.toLocaleString()}
      </span>
      <span style={{ flex: 'none', width: 150, textAlign: 'right' }}>
        {sc.shortfallMW > 0.5 ? (
          <span style={{ color: theme.danger }}>
            needs +{sc.shortfallMW.toFixed(0)} MW at {String(sc.shortfallHour).padStart(2, '0')}:00
          </span>
        ) : sc.connectedCustomers === 0 ? (
          <span style={{ color: theme.slate }}>not on the network</span>
        ) : (
          <span style={{ color: theme.ok }}>covered ✓</span>
        )}
      </span>
      {sc.shortfallMW > 0.5 && (
        <button
          aria-label={`plan works for ${sc.name}`}
          onClick={(e) => {
            e.stopPropagation();
            onPlan();
          }}
          style={{
            flex: 'none',
            padding: '1px 7px',
            borderRadius: 5,
            border: `1px solid ${theme.orange}`,
            background: 'transparent',
            color: theme.orange,
            fontFamily: theme.font,
            fontSize: 10,
            cursor: 'pointer',
          }}
        >
          plan works
        </button>
      )}
    </div>
  );
}

/** £k pretty-printer: 360 → £360k, 12_000 → £12.0m. */
function fmtCapex(capexK: number): string {
  return capexK >= 1000 ? `£${(capexK / 1000).toFixed(1)}m` : `£${Math.round(capexK)}k`;
}

function PlanCard({
  plan,
  opt,
  onApprove,
}: {
  plan: ReinforcementPlan;
  opt: ReinforcementOption;
  onApprove: () => void;
}) {
  return (
    <div
      style={{
        border: `1px solid ${theme.navyLight}`,
        borderRadius: 6,
        padding: '6px 8px',
        marginTop: 6,
        fontSize: 11,
        display: 'flex',
        gap: 8,
        alignItems: 'center',
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ color: theme.offWhite }}>{opt.label}</div>
        <div style={{ color: theme.slate, marginTop: 2 }}>
          {fmtCapex(opt.capexK)} · +£{opt.billImpactYr.toFixed(2)}/home/yr ·{' '}
          <span
            style={{
              color: opt.residualShortfallMW < plan.shortfallMW ? theme.ok : theme.warn,
            }}
          >
            shortfall {plan.shortfallMW.toFixed(1)} → {opt.residualShortfallMW.toFixed(1)} MW
          </span>
        </div>
      </div>
      <button
        onClick={onApprove}
        style={{
          flex: 'none',
          padding: '3px 10px',
          borderRadius: 5,
          border: `1px solid ${theme.ok}`,
          background: 'transparent',
          color: theme.ok,
          fontFamily: theme.font,
          fontSize: 11,
          cursor: 'pointer',
        }}
      >
        approve
      </button>
    </div>
  );
}

export function BalancePanel() {
  const open = useAppStore((s) => s.balanceOpen);
  const setOpen = useAppStore((s) => s.setBalanceOpen);
  const report = useAppStore((s) => s.balance);
  const requestPan = useAppStore((s) => s.requestPan);
  const setHighlightCouncil = useAppStore((s) => s.setHighlightCouncil);
  const plan = useAppStore((s) => s.plan);
  const setPlan = useAppStore((s) => s.setPlan);
  const [scopeId, setScopeId] = useState(-1);
  /** Scope a plan was requested for (shows the "drawing up…" hint until
   *  the worker's plan lands). */
  const [planFor, setPlanFor] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (open) requestBalance();
  }, [open]);
  if (!open) return null;

  const scopes = report?.scopes ?? [];
  const sel = scopes.find((s) => s.id === scopeId) ?? scopes[0];
  const selPlan = plan && sel && plan.scopeId === sel.id ? plan : undefined;

  const approve = (opt: ReinforcementOption): void => {
    // each command in the bundle is its own undo step (the worker
    // snapshots per command) — acceptable for v1; a compound command
    // would make a bundle one step
    for (const cmd of opt.commands) sendCommand(cmd);
    setPlan(undefined);
    setPlanFor(undefined);
    requestBalance();
  };

  return (
    <div
      style={{
        ...panelStyle,
        position: 'absolute',
        top: 48,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(540px, 94vw)',
        maxHeight: 'calc(100vh - 120px)',
        overflowY: 'auto',
        padding: '12px 16px',
        zIndex: 6,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: theme.orange, fontWeight: 700, letterSpacing: '0.1em', fontSize: 12 }}>
          ⚖ GRID BALANCE
        </span>
        <span style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => requestBalance()}
            style={{ padding: '2px 8px', borderRadius: 5, border: `1px solid ${theme.navyLight}`, background: 'transparent', color: theme.slate, fontFamily: theme.font, fontSize: 11, cursor: 'pointer' }}
          >
            refresh
          </button>
          <button
            aria-label="close balance"
            onClick={() => setOpen(false)}
            style={{ padding: '2px 8px', borderRadius: 5, border: 'none', background: 'transparent', color: theme.slate, fontFamily: theme.font, fontSize: 13, cursor: 'pointer' }}
          >
            ×
          </button>
        </span>
      </div>

      {sel && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, color: theme.gold, marginBottom: 4 }}>
            {sel.name} · demand now {sel.demandNowMW.toFixed(1)} MW · connected supply{' '}
            {sel.connectedCapMW.toFixed(0)} MW
            {sel.id === -1 && sel.grossCapMW > sel.connectedCapMW && (
              <span style={{ color: theme.warn }}>
                {' '}
                ({(sel.grossCapMW - sel.connectedCapMW).toFixed(0)} MW procured but not wired in)
              </span>
            )}
          </div>
          <ProfileChart profile={sel.profile} />
          {selPlan && (
            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: 11, color: theme.orange, letterSpacing: '0.06em' }}>
                PLANNED WORKS · {selPlan.options.length} option
                {selPlan.options.length === 1 ? '' : 's'}
              </div>
              {selPlan.options.map((opt, i) => (
                <PlanCard key={i} plan={selPlan} opt={opt} onApprove={() => approve(opt)} />
              ))}
              {selPlan.options.length === 0 && (
                <div style={{ color: theme.slate, fontSize: 11, marginTop: 4 }}>
                  the planner found no workable options here — connect more generation by hand
                </div>
              )}
            </div>
          )}
          {planFor === sel.id && !selPlan && (
            <div style={{ color: theme.slate, fontSize: 11, marginTop: 6 }}>
              drawing up options…
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 10, borderTop: `1px solid ${theme.navyLight}`, paddingTop: 6 }}>
        {scopes.map((sc) => (
          <ScopeRow
            key={sc.id}
            sc={sc}
            selected={sel?.id === sc.id}
            onClick={() => {
              setScopeId(sc.id);
              if (sc.id >= 0) {
                setHighlightCouncil(sc.id);
                requestPan(sc.cx, sc.cy);
              } else {
                setHighlightCouncil(undefined);
              }
            }}
            onPlan={() => {
              setScopeId(sc.id);
              if (plan?.scopeId !== sc.id) setPlan(undefined);
              setPlanFor(sc.id);
              requestPlan(sc.id);
            }}
          />
        ))}
        {scopes.length === 0 && (
          <div style={{ color: theme.slate, fontSize: 12 }}>cutting the report…</div>
        )}
      </div>
    </div>
  );
}
