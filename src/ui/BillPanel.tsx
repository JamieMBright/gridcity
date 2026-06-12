import { useState } from 'react';
import { useAppStore } from '../app/store';
import { requestBillDetail, sendCommand } from '../app/workerBridge';
import type { BillDetailLine, BillDetailRow } from '../sim/protocol';
import { fmtMoneyK, panelStyle, theme } from './theme';

export function BillPanel({ frame }: { frame?: React.CSSProperties } = {}) {
  const snapshot = useAppStore((s) => s.snapshot);
  const billDetail = useAppStore((s) => s.billDetail);
  const requestPan = useAppStore((s) => s.requestPan);
  const setSelected = useAppStore((s) => s.setSelected);
  const [open, setOpen] = useState<BillDetailLine | undefined>(undefined);
  if (!snapshot) return null;
  const b = snapshot.bill;
  const st = snapshot.stats;

  const toggle = (line: BillDetailLine): void => {
    if (open === line) {
      setOpen(undefined);
      return;
    }
    setOpen(line);
    requestBillDetail(line);
  };
  const jump = (r: BillDetailRow): void => {
    if (r.x !== undefined && r.y !== undefined) requestPan(r.x, r.y);
    if (r.assetId !== undefined) {
      const a = snapshot.assets.find((x) => x.id === r.assetId);
      if (a?.kind === 'line' && r.x !== undefined && r.y !== undefined) {
        setSelected({ lineId: r.assetId, at: { x: r.x, y: r.y } });
      } else {
        setSelected({ assetId: r.assetId });
      }
    }
  };
  const detail = (line: BillDetailLine) =>
    open === line ? (
      <DetailCard rows={billDetail?.line === line ? billDetail.rows : undefined} onJump={jump} />
    ) : null;

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
        £{b.perCustomerYr.toFixed(0)}
        <span style={{ fontSize: 12, fontWeight: 400, color: theme.slate }}> /home/yr</span>
      </div>
      <div style={{ fontSize: 11, color: theme.orangeSoft }}>
        of which your network (DUoS): £{b.perCustomerDuosYr.toFixed(2)}/yr
      </div>
      <div style={{ fontSize: 11, marginTop: 6 }}>
        <Row
          label="network (DUoS)"
          value={`${fmtMoneyK(b.capexYrK)}/yr`}
          line="capex"
          open={open}
          onToggle={toggle}
        />
        {detail('capex')}
        <Row
          label="operations"
          value={`${fmtMoneyK(b.opexYrK)}/yr`}
          line="opex"
          open={open}
          onToggle={toggle}
        />
        {detail('opex')}
        <Row label="field fleet" value={`${fmtMoneyK(b.fleetYrK)}/yr`} />
        {b.vegYrK > 0 && <Row label="tree cutting" value={`${fmtMoneyK(b.vegYrK)}/yr`} />}
        {b.genYrK > 0 && (
          <Row
            label="generation (PPA)"
            value={`${fmtMoneyK(b.genYrK)}/yr`}
            line="ppa"
            open={open}
            onToggle={toggle}
          />
        )}
        {b.genYrK > 0 && detail('ppa')}
        <Row label="wholesale energy" value={`${fmtMoneyK(b.energyYrK)}/yr`} />
        {b.flexYrK > 0.5 && <Row label="flexibility" value={`${fmtMoneyK(b.flexYrK)}/yr`} />}
        {b.constraintYrK > 0.5 && (
          <Row
            label="constraints"
            value={`${fmtMoneyK(b.constraintYrK)}/yr`}
            line="constraints"
            open={open}
            onToggle={toggle}
          />
        )}
        {b.constraintYrK > 0.5 && detail('constraints')}
        {b.lossYrK > 0.05 && (
          <Row
            label="losses (I²R)"
            value={`${fmtMoneyK(b.lossYrK)}/yr`}
            line="losses"
            open={open}
            onToggle={toggle}
            title="Heat in the wires and transformers, bought at the running wholesale price. Only shorter or lower-resistance routes cut losses — re-conductoring raises ratings, not resistance, and cable resistance matches overhead."
          />
        )}
        {b.lossYrK > 0.05 && detail('losses')}
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

function Row({
  label,
  value,
  line,
  open,
  onToggle,
  title,
}: {
  label: string;
  value: string;
  /** Present = the row drills down (tappable, ▸ affordance). */
  line?: BillDetailLine | undefined;
  open?: BillDetailLine | undefined;
  onToggle?: ((line: BillDetailLine) => void) | undefined;
  title?: string | undefined;
}) {
  const tappable = line !== undefined && onToggle !== undefined;
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        cursor: tappable ? 'pointer' : undefined,
      }}
      title={title}
      role={tappable ? 'button' : undefined}
      aria-label={tappable ? `itemise ${label}` : undefined}
      onClick={tappable ? () => onToggle(line) : undefined}
    >
      <span style={{ color: theme.slate }}>
        {tappable && (
          <span style={{ color: theme.orangeSoft, fontSize: 9 }}>
            {open === line ? '▾' : '▸'}{' '}
          </span>
        )}
        {label}
      </span>
      <span>{value}</span>
    </div>
  );
}

/** Inline drill-down card under a tapped bill row: the top contributors,
 *  £k/yr (+ MWh/yr where it means something) and a jump-to per row. */
function DetailCard({
  rows,
  onJump,
}: {
  rows: BillDetailRow[] | undefined;
  onJump: (r: BillDetailRow) => void;
}) {
  return (
    <div
      style={{
        margin: '2px 0 4px 8px',
        padding: '3px 6px',
        borderLeft: `2px solid ${theme.navyLight}`,
        background: 'rgba(0,0,0,0.22)',
        borderRadius: 4,
        fontSize: 10,
        lineHeight: 1.5,
      }}
    >
      {!rows && <div style={{ color: theme.slate }}>itemising…</div>}
      {rows && rows.length === 0 && (
        <div style={{ color: theme.slate }}>nothing on this line yet</div>
      )}
      {rows?.map((r, i) => (
        <div
          key={`${r.assetId ?? 'row'}-${i}`}
          style={{ display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <span
            title={r.label}
            style={{
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: theme.slate,
            }}
          >
            {r.label}
          </span>
          {r.mwhYr !== undefined && (
            <span style={{ color: theme.slate, flex: 'none' }}>
              {Math.round(r.mwhYr).toLocaleString()} MWh
            </span>
          )}
          <span style={{ flex: 'none' }}>{fmtMoneyK(r.kYr)}/yr</span>
          {r.x !== undefined && r.y !== undefined && (
            <button
              aria-label={`jump to ${r.label}`}
              title="jump to it on the map"
              onClick={() => onJump(r)}
              style={{
                flex: 'none',
                width: 16,
                height: 16,
                lineHeight: '12px',
                padding: 0,
                borderRadius: 4,
                border: `1px solid ${theme.navyLight}`,
                background: 'transparent',
                color: theme.orangeSoft,
                fontFamily: theme.font,
                fontSize: 10,
                cursor: 'pointer',
              }}
            >
              →
            </button>
          )}
        </div>
      ))}
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
