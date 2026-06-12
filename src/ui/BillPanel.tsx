import { useAppStore } from '../app/store';
import { sendCommand } from '../app/workerBridge';
import { fmtMoneyK, panelStyle, theme } from './theme';

export function BillPanel({ frame }: { frame?: React.CSSProperties } = {}) {
  const snapshot = useAppStore((s) => s.snapshot);
  if (!snapshot) return null;
  const b = snapshot.bill;
  const st = snapshot.stats;

  return (
    <div
      style={{
        ...panelStyle,
        position: 'absolute',
        bottom: 12,
        right: 12,
        width: 230,
        padding: '10px 14px',
        lineHeight: 1.55,
        ...frame,
      }}
    >
      <div style={{ color: theme.slate, fontSize: 10, letterSpacing: '0.12em' }}>
        AVG ANNUAL BILL · ALL {b.totalCustomers.toLocaleString()} HOMES
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: theme.gold }}>
        £{b.perCustomerYr.toFixed(2)}
        <span style={{ fontSize: 12, fontWeight: 400, color: theme.slate }}> /home/yr</span>
      </div>
      <div style={{ fontSize: 11, marginTop: 6 }}>
        <Row label="network capex" value={`${fmtMoneyK(b.capexYrK)}/yr`} />
        <Row label="operations" value={`${fmtMoneyK(b.opexYrK)}/yr`} />
        <Row label="field fleet" value={`${fmtMoneyK(b.fleetYrK)}/yr`} />
        {b.vegYrK > 0 && <Row label="tree cutting" value={`${fmtMoneyK(b.vegYrK)}/yr`} />}
        <Row label="wholesale energy" value={`${fmtMoneyK(b.energyYrK)}/yr`} />
        {b.flexYrK > 0.5 && <Row label="flexibility" value={`${fmtMoneyK(b.flexYrK)}/yr`} />}
        {b.constraintYrK > 0.5 && (
          <Row label="constraints" value={`${fmtMoneyK(b.constraintYrK)}/yr`} />
        )}
        <LevyRow innovationYrK={b.innovationYrK} levyPct={snapshot.inbox.levyPct} />
        <div style={{ borderTop: `1px solid ${theme.navyLight}`, margin: '4px 0' }} />
        <Row label="total cost" value={`${fmtMoneyK(b.totalYrK)}/yr`} />
        <Row
          label="on supply"
          value={`${st.servedCustomers.toLocaleString()} / ${st.totalCustomers.toLocaleString()}`}
        />
        <Row
          label="demand met"
          value={`${st.servedMW.toFixed(1)} / ${st.totalDemandMW.toFixed(1)} MW`}
        />
        <div style={{ borderTop: `1px solid ${theme.navyLight}`, margin: '4px 0' }} />
        <Row label="CI /100 cust/yr" value={snapshot.kpis.ciPer100PerYr.toFixed(1)} />
        <Row label="CML min/cust/yr" value={snapshot.kpis.cmlMinPerYr.toFixed(1)} />
        <Row
          label="curtailed firm/flex"
          value={`${st.curtailedFirmMWh.toFixed(0)} / ${st.curtailedFlexMWh.toFixed(0)} MWh`}
        />
        <Row label="satisfaction" value={`${st.satisfactionAvg.toFixed(0)} / 100`} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: theme.slate }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function LevyRow({ innovationYrK, levyPct }: { innovationYrK: number; levyPct: number }) {
  const btn: React.CSSProperties = {
    width: 16,
    height: 16,
    lineHeight: '12px',
    padding: 0,
    borderRadius: 4,
    border: `1px solid ${theme.navyLight}`,
    background: 'transparent',
    color: theme.offWhite,
    fontFamily: theme.font,
    fontSize: 11,
    cursor: 'pointer',
  };
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: theme.slate }}>
        innovation{' '}
        <button
          aria-label="levy down"
          style={btn}
          onClick={() => sendCommand({ type: 'setLevy', pct: Math.max(0, levyPct - 0.5) })}
        >
          −
        </button>{' '}
        {levyPct.toFixed(1)}%{' '}
        <button
          aria-label="levy up"
          style={btn}
          onClick={() => sendCommand({ type: 'setLevy', pct: Math.min(3, levyPct + 0.5) })}
        >
          +
        </button>
      </span>
      <span>{fmtMoneyK(innovationYrK)}/yr</span>
    </div>
  );
}
