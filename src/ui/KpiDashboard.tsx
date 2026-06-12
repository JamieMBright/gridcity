// The regulator's view: where this period's KPIs sit against targets,
// and the last report card. Toggled with the RIIO button or K.

import { useAppStore } from '../app/store';
import {
  HIGHER_BETTER,
  KPI_LABELS,
  PERIOD_YEARS,
  type KpiKey,
} from '../sim/regulation/riio';
import { panelStyle, theme } from './theme';

const KEYS: KpiKey[] = ['bill', 'ci', 'cml', 'carbon', 'curtailedFirm', 'satisfaction'];

function fmt(key: KpiKey, v: number): string {
  return key === 'bill' || key === 'curtailedFirm' ? v.toFixed(0) : v.toFixed(1);
}

export function KpiDashboard() {
  const open = useAppStore((s) => s.kpiOpen);
  const setOpen = useAppStore((s) => s.setKpiOpen);
  const snapshot = useAppStore((s) => s.snapshot);
  if (!open || !snapshot) return null;
  const r = snapshot.riio;
  const yearsIn = r.elapsedMin / 525_600;

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
        style={{ ...panelStyle, width: 'min(460px, 94vw)', padding: '16px 20px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ color: theme.orange, fontWeight: 800 }}>
            RIIO-{r.index} · year {Math.min(PERIOD_YEARS, Math.floor(yearsIn) + 1)} of{' '}
            {PERIOD_YEARS}
          </div>
          <button
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
        <table style={{ width: '100%', fontSize: 12, marginTop: 10, borderSpacing: 0 }}>
          <thead>
            <tr style={{ color: theme.slate, textAlign: 'right' }}>
              <th style={{ textAlign: 'left', fontWeight: 400 }}>KPI</th>
              <th style={{ fontWeight: 400 }}>now</th>
              <th style={{ fontWeight: 400 }}>target</th>
            </tr>
          </thead>
          <tbody>
            {KEYS.map((k) => {
              const cur = r.current[k];
              const tgt = r.targets[k];
              const good = HIGHER_BETTER[k] ? cur >= tgt : cur <= tgt;
              return (
                <tr key={k} style={{ lineHeight: 1.8 }}>
                  <td>{KPI_LABELS[k]}</td>
                  <td style={{ textAlign: 'right', color: good ? theme.ok : theme.danger }}>
                    {fmt(k, cur)}
                  </td>
                  <td style={{ textAlign: 'right', color: theme.slate }}>{fmt(k, tgt)}</td>
                </tr>
              );
            })}
            {/* asset ageing (#15): average derived condition of the
                player's lines + substations — no RIIO target yet */}
            <tr style={{ lineHeight: 1.8 }}>
              <td>network health avg (%)</td>
              <td
                style={{
                  textAlign: 'right',
                  color:
                    snapshot.stats.networkHealthPct >= 70
                      ? theme.ok
                      : snapshot.stats.networkHealthPct >= 40
                        ? theme.warn
                        : theme.danger,
                }}
              >
                {snapshot.stats.networkHealthPct.toFixed(0)}
              </td>
              <td style={{ textAlign: 'right', color: theme.slate }}>—</td>
            </tr>
          </tbody>
        </table>
        {r.lastReport && (
          <div
            style={{
              marginTop: 12,
              paddingTop: 10,
              borderTop: `1px solid ${theme.navyLight}`,
              fontSize: 12,
            }}
          >
            <span style={{ color: theme.slate }}>last report · RIIO-{r.lastReport.index}: </span>
            <span
              style={{
                color: r.lastReport.composite >= 55 ? theme.ok : theme.danger,
                fontWeight: 800,
              }}
            >
              grade {r.lastReport.grade} ({r.lastReport.composite}/100)
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
