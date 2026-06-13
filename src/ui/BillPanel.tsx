import { useState } from 'react';
import { useAppStore } from '../app/store';
import { requestBillDetail, sendCommand } from '../app/workerBridge';
import type { BillDetailLine, BillDetailRow } from '../sim/protocol';
import {
  BILL_BANDS,
  BILL_BAND_LABELS,
  type BillBand,
  type BillSample,
} from '../sim/billHistory';
import { fmtMoneyK, panelStyle, theme } from './theme';

/** One colour per stacked bill band (bottom → top), on the dusk ramp. */
const BAND_COLOR: Record<BillBand, string> = {
  network: theme.orange,
  energy: theme.gold,
  operations: '#7c6fb0', // muted purple
  other: theme.slate,
};

/** A small stacked-area chart of the £/household/yr bill over the sampled
 *  game-months (ROADMAP #28). Tap anywhere to read the value at that point;
 *  tap a legend chip to isolate a single band. */
function BillTrendChart({ history }: { history: BillSample[] }) {
  const [isolate, setIsolate] = useState<BillBand | undefined>(undefined);
  const [probe, setProbe] = useState<number | undefined>(undefined);
  const w = 202;
  const h = 88;
  const top = 6;
  if (history.length < 2) {
    return (
      <div style={{ fontSize: 10, color: theme.slate, marginTop: 4 }}>
        gathering the trend… (one point a day)
      </div>
    );
  }
  const max = Math.max(...history.map((p) => p.total), 1);
  const X = (i: number): number => (i / (history.length - 1)) * w;
  const Y = (v: number): number => top + (h - top) * (1 - v / max);

  // stacked areas: each band is the ribbon between its running cumulative
  // baseline and that baseline + the band value. Isolating a band drops
  // it to the axis so its own shape reads.
  const areas: Array<{ band: BillBand; pts: string }> = [];
  const base = history.map(() => 0);
  for (const band of BILL_BANDS) {
    const lo = base.slice();
    for (let i = 0; i < history.length; i++) base[i] = (base[i] ?? 0) + (history[i]?.[band] ?? 0);
    if (isolate && band !== isolate) continue;
    const loFor = (i: number): number => (isolate ? 0 : (lo[i] ?? 0));
    const hiFor = (i: number): number => (isolate ? history[i]?.[band] ?? 0 : (base[i] ?? 0));
    const hiPts = history.map((_, i) => `${X(i).toFixed(1)},${Y(hiFor(i)).toFixed(1)}`);
    const loPts = history.map((_, i) => `${X(i).toFixed(1)},${Y(loFor(i)).toFixed(1)}`).reverse();
    areas.push({ band, pts: [...hiPts, ...loPts].join(' ') });
  }
  const totalPts = history.map((p, i) => `${X(i).toFixed(1)},${Y(p.total).toFixed(1)}`).join(' ');

  const at = probe !== undefined ? history[probe] : undefined;
  const onProbe = (e: React.MouseEvent<SVGSVGElement>): void => {
    const r = e.currentTarget.getBoundingClientRect();
    const fx = (e.clientX - r.left) / r.width;
    setProbe(Math.max(0, Math.min(history.length - 1, Math.round(fx * (history.length - 1)))));
  };

  return (
    <div style={{ marginTop: 6 }}>
      <svg
        width="100%"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        onMouseMove={onProbe}
        onClick={onProbe}
        onMouseLeave={() => setProbe(undefined)}
        style={{ display: 'block', background: 'rgba(0,0,0,0.25)', borderRadius: 6, cursor: 'crosshair' }}
      >
        {areas.map((a) => (
          <polygon key={a.band} points={a.pts} fill={BAND_COLOR[a.band]} opacity={isolate ? 0.42 : 0.55} />
        ))}
        {!isolate && <polyline points={totalPts} fill="none" stroke={theme.offWhite} strokeWidth={1} opacity={0.7} />}
        {at && probe !== undefined && (
          <>
            <line x1={X(probe)} y1={top} x2={X(probe)} y2={h} stroke={theme.offWhite} strokeWidth={0.6} opacity={0.6} />
            <circle cx={X(probe)} cy={Y(at.total)} r={2.2} fill={theme.offWhite} />
          </>
        )}
      </svg>
      <div style={{ fontSize: 9.5, color: theme.slate, marginTop: 3, minHeight: 13 }}>
        {at ? (
          <span>
            day {Math.floor(at.tMin / 1440) + 1}: <b style={{ color: theme.gold }}>£{at.total.toFixed(0)}</b>
            {isolate ? ` · ${BILL_BAND_LABELS[isolate]} £${(at[isolate]).toFixed(0)}` : '/home/yr'}
          </span>
        ) : (
          <span>£/home/yr over {history.length} samples · tap to read a day</span>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 3 }}>
        {BILL_BANDS.map((band) => (
          <button
            key={band}
            onClick={() => setIsolate(isolate === band ? undefined : band)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              padding: '1px 5px',
              borderRadius: 4,
              border: `1px solid ${isolate === band ? BAND_COLOR[band] : 'transparent'}`,
              background: 'transparent',
              color: isolate && isolate !== band ? theme.slate : theme.offWhite,
              opacity: isolate && isolate !== band ? 0.5 : 1,
              fontFamily: theme.font,
              fontSize: 9,
              cursor: 'pointer',
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: 2, background: BAND_COLOR[band], flex: 'none' }} />
            {BILL_BAND_LABELS[band]}
          </button>
        ))}
      </div>
    </div>
  );
}

export function BillPanel({ frame }: { frame?: React.CSSProperties } = {}) {
  const snapshot = useAppStore((s) => s.snapshot);
  const billDetail = useAppStore((s) => s.billDetail);
  const requestPan = useAppStore((s) => s.requestPan);
  const setSelected = useAppStore((s) => s.setSelected);
  const [open, setOpen] = useState<BillDetailLine | undefined>(undefined);
  const [trendOpen, setTrendOpen] = useState(false);
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
      data-tour="bill"
      style={{
        ...panelStyle,
        position: 'absolute',
        bottom: 12,
        right: 12,
        width: 230,
        padding: '10px 14px',
        lineHeight: 1.55,
        // sit above the inbox so the expanded trend chart (which grows the
        // panel upward) is never occluded on short desktop viewports
        zIndex: trendOpen ? 5 : undefined,
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
      <button
        aria-label={trendOpen ? 'hide bill trend' : 'show bill trend'}
        onClick={() => setTrendOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          marginTop: 4,
          padding: 0,
          border: 'none',
          background: 'transparent',
          color: theme.orangeSoft,
          fontFamily: theme.font,
          fontSize: 10,
          letterSpacing: '0.06em',
          cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 9 }}>{trendOpen ? '▾' : '▸'}</span> bill over time
      </button>
      {trendOpen && <BillTrendChart history={snapshot.billHistory} />}
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
