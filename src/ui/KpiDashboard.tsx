// The regulator's view: where this period's KPIs sit against targets,
// and the last report card. Toggled with the RIIO button or K.
//
// Every row teaches itself (#36): tap/hover any KPI for a tooltip that
// says what it is, what good looks like, and WHY it is red/amber/green
// right now (the threshold it is meeting or missing).

import { useState } from 'react';
import { useAppStore } from '../app/store';
import {
  HIGHER_BETTER,
  KPI_LABELS,
  PERIOD_YEARS,
  type KpiKey,
} from '../sim/regulation/riio';
import {
  bandedHelp,
  ltiHelp,
  STATUS_LABEL,
  targetHelp,
  type KpiHelp,
  type KpiStatus,
} from './kpiHelp';
import { currentRank } from './rank';
import { fmtMoneyK, panelStyle, theme } from './theme';
import type { RegulatoryView } from '../sim/tick';

const KEYS: KpiKey[] = ['bill', 'ci', 'cml', 'carbon', 'curtailedFirm', 'satisfaction'];

function fmt(key: KpiKey, v: number): string {
  return key === 'bill' || key === 'curtailedFirm' ? v.toFixed(0) : v.toFixed(1);
}

const STATUS_COLOR: Record<KpiStatus, string> = {
  good: theme.ok,
  warn: theme.warn,
  bad: theme.danger,
};

/** The country-specific framing strings the dashboard reads, mirrored from the
 *  snapshot's riio.regulator (protocol.ts). */
type RegFraming = {
  reliabilityMetric: string;
  ciLabel: string;
  cmlLabel: string;
  constraintLabel: string;
  returnHint: string;
  safetyBody: string;
};

/** What each KPI is, and what good looks like — the teach copy. The pieces
 *  that name a country-specific scheme/metric (the reliability metric, the
 *  currency, the curtailment-compensation term) are filled from the active
 *  regulator framing so the card reads in each country's regulatory language —
 *  GB keeps "CI/CML", "£" and "constraint payments"; elsewhere it localises. */
function kpiTeach(reg: RegFraming, sym: string): Record<
  KpiKey,
  { what: string; goal: string }
> {
  return {
    bill: {
      what: `The average household electricity bill, ${sym}/year — your headline score. Every ${sym} you spend lands here.`,
      goal: 'Below the regulator target. Lower is better, but not at the cost of the lights.',
    },
    ci: {
      what: `How OFTEN supply is lost, reported as ${reg.ciLabel} (${reg.reliabilityMetric}).`,
      goal: 'Below target. Redundancy (N-1 loops) and tree-cutting cut it.',
    },
    cml: {
      what: `How LONG outages last once they happen, reported as ${reg.cmlLabel} (${reg.reliabilityMetric}).`,
      goal: 'Below target. Faster fault response (fleet, depots) cuts it.',
    },
    carbon: {
      what: 'Carbon intensity of the power you dispatch, g CO₂/kWh.',
      goal: 'Below target. Award renewables; run gas/coal last.',
    },
    curtailedFirm: {
      what: `Firm-connection generation you had to turn down, MWh/year — paid ${reg.constraintLabel}.`,
      goal: 'Low. Reinforce the wires so you stop paying generators to switch off.',
    },
    satisfaction: {
      what: 'Customer-weighted council satisfaction, 0–100 — how the public rate you.',
      goal: 'Above target. Keep the lights on and bills sane; undergrounding helps.',
    },
  };
}

/** A tappable/hoverable info dot that surfaces the KPI's tooltip. */
function HelpDot({ help, label }: { help: KpiHelp; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <button
        aria-label={`why is ${label} ${STATUS_LABEL[help.status]}`}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        style={{
          width: 14,
          height: 14,
          marginLeft: 5,
          padding: 0,
          borderRadius: '50%',
          border: `1px solid ${STATUS_COLOR[help.status]}`,
          background: 'transparent',
          color: STATUS_COLOR[help.status],
          fontFamily: theme.font,
          fontSize: 9,
          lineHeight: '12px',
          cursor: 'pointer',
          verticalAlign: 'middle',
        }}
      >
        ?
      </button>
      {open && (
        <div
          role="tooltip"
          style={{
            position: 'absolute',
            left: 18,
            top: -4,
            zIndex: 20,
            width: 230,
            ...panelStyle,
            padding: '8px 10px',
            fontSize: 11,
            lineHeight: 1.45,
            textAlign: 'left',
            pointerEvents: 'none',
          }}
        >
          <div style={{ color: theme.offWhite }}>{help.what}</div>
          <div style={{ color: theme.slate, marginTop: 5 }}>
            <b style={{ color: theme.gold }}>Good:</b> {help.goal}
          </div>
          <div style={{ color: STATUS_COLOR[help.status], marginTop: 5 }}>{help.why}</div>
        </div>
      )}
    </span>
  );
}

function KpiRow({
  label,
  value,
  target,
  help,
}: {
  label: React.ReactNode;
  value: string;
  target: string;
  help: KpiHelp;
}) {
  return (
    <tr style={{ lineHeight: 1.8 }}>
      <td>
        {label}
        <HelpDot help={help} label={typeof label === 'string' ? label : 'this KPI'} />
      </td>
      <td style={{ textAlign: 'right', color: STATUS_COLOR[help.status] }}>{value}</td>
      <td style={{ textAlign: 'right', color: theme.slate }}>{target}</td>
    </tr>
  );
}

/** The operator's career rank, shown beneath the last report card — the
 *  progression signal the period close fed (src/ui/rank.ts). Re-reads the
 *  local career on each report so a freshly-closed period is reflected. */
function RankLine() {
  const reportIndex = useAppStore((s) => s.snapshot?.riio.lastReport?.index);
  const rank = currentRank();
  return (
    <div style={{ marginTop: 6, color: theme.slate, fontSize: 11.5 }} data-report={reportIndex}>
      operator rank · <span style={{ color: theme.gold, fontWeight: 700 }}>{rank.tier.title}</span>
      {rank.next ? (
        <span>
          {' '}
          — {rank.pointsIntoTier}/{rank.tierSpan} to {rank.next.title}
        </span>
      ) : (
        <span style={{ color: theme.gold }}> — top of the ladder</span>
      )}
    </div>
  );
}

/** A signed £k/yr, with an explicit + / − and a reward/penalty colour. */
function signedMoney(k: number): { text: string; color: string } {
  if (Math.abs(k) < 0.5) return { text: '£0/yr', color: theme.slate };
  const sign = k > 0 ? '+' : '−';
  return { text: `${sign}${fmtMoneyK(Math.abs(k))}/yr`, color: k > 0 ? theme.ok : theme.danger };
}

/** The price-control money block (RAV + allowed revenue + sharing +
 *  incentive). Surfaced only once the layer has phased in — plain English,
 *  reflows on desktop + phone-landscape (it's a simple two-column list). The
 *  `fr` framing localises the return hint + the reliability-incentive metric so
 *  the block reads in the active country's regulatory language. */
function RegulatoryBlock({ reg, fr }: { reg: RegulatoryView; fr: RegFraming }) {
  const rev = reg.revenue;
  const share = signedMoney(rev.sharingYrK);
  const inc = signedMoney(rev.incentiveYrK);
  const beatAllowance = rev.actualTotexYrK <= rev.totexAllowanceYrK;
  const Row = ({
    label,
    value,
    color,
    hint,
  }: {
    label: string;
    value: string;
    color?: string;
    hint?: string;
  }) => (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: 8,
        lineHeight: 1.7,
      }}
    >
      <span style={{ color: theme.slate, minWidth: 0 }}>
        {label}
        {hint && <span style={{ color: theme.slate, opacity: 0.7, fontSize: 10 }}> · {hint}</span>}
      </span>
      <span style={{ color: color ?? theme.offWhite, fontWeight: 600, flex: 'none' }}>{value}</span>
    </div>
  );
  return (
    <div
      style={{
        marginTop: 12,
        paddingTop: 10,
        borderTop: `1px solid ${theme.navyLight}`,
        fontSize: 12,
      }}
    >
      <div style={{ color: theme.gold, fontWeight: 800, marginBottom: 4 }}>regulatory finance</div>
      <div style={{ color: theme.slate, fontSize: 10.5, marginBottom: 6 }}>
        the regulated money you build up and earn as the network grows
      </div>
      <Row
        label="RAV (regulated asset value)"
        value={fmtMoneyK(reg.ravK)}
        color={theme.offWhite}
        hint="depreciated network you've built"
      />
      <Row label="return on RAV" value={`${fmtMoneyK(rev.returnYrK)}/yr`} hint={fr.returnHint} />
      <Row
        label="depreciation"
        value={`${fmtMoneyK(rev.depreciationYrK)}/yr`}
        hint="45-yr sum-of-digits — low while young, rising with age"
      />
      <Row label="opex allowance" value={`${fmtMoneyK(rev.opexAllowanceYrK)}/yr`} />
      <Row
        label="totex sharing"
        value={share.text}
        color={share.color}
        hint={beatAllowance ? 'under allowance — you keep half' : 'over allowance — you bear half'}
      />
      <Row
        label="reliability incentive"
        value={inc.text}
        color={inc.color}
        hint={`${rev.incentiveYrK >= 0 ? 'beating' : 'missing'} ${fr.reliabilityMetric}`}
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 4,
          paddingTop: 4,
          borderTop: `1px solid ${theme.navyLight}`,
        }}
      >
        <span style={{ color: theme.offWhite, fontWeight: 700 }}>allowed revenue</span>
        <span style={{ color: theme.gold, fontWeight: 800 }}>{fmtMoneyK(rev.totalYrK)}/yr</span>
      </div>
      <div style={{ color: theme.slate, fontSize: 10.5, marginTop: 4 }}>
        actual network totex {fmtMoneyK(rev.actualTotexYrK)}/yr vs allowance{' '}
        {fmtMoneyK(rev.totexAllowanceYrK)}/yr
      </div>
    </div>
  );
}

export function KpiDashboard() {
  const open = useAppStore((s) => s.kpiOpen);
  const setOpen = useAppStore((s) => s.setKpiOpen);
  const snapshot = useAppStore((s) => s.snapshot);
  if (!open || !snapshot) return null;
  const r = snapshot.riio;
  const yearsIn = r.elapsedMin / 525_600;
  // per-country framing: the card reads in the active regulator's own language
  // (GB keeps CI/CML + £; Germany SAIDI/SAIFI + €; etc.) — never a leaked term.
  const reg = r.regulator;
  const sym = snapshot.currency.symbol;
  const teach = kpiTeach(reg, sym);
  // localised reliability-row labels; the other labels are country-agnostic
  const labelFor = (k: KpiKey): string =>
    k === 'ci' ? reg.ciLabel : k === 'cml' ? reg.cmlLabel : KPI_LABELS[k];

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
        style={{
          ...panelStyle,
          width: 'min(460px, 94vw)',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '16px 20px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ color: theme.orange, fontWeight: 800 }}>
            {r.regulator.scheme}-{r.index} · year{' '}
            {Math.min(PERIOD_YEARS, Math.floor(yearsIn) + 1)} of {PERIOD_YEARS}
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
        {/* Per-country regulator framing — the card speaks the country's own
            regulatory language (Ofgem RIIO / BNetzA Anreizregulierung / NYPSC
            rate case / MERC Multi-Year Tariff …), so no British term leaks. */}
        <div style={{ color: theme.gold, fontSize: 11, fontWeight: 700, marginTop: 3 }}>
          {reg.name} · {reg.review}
        </div>
        {/* the scheme spelled out so the player understands it (owner: "in GB,
            spell out RIIO") — bordered gloss the first thing under the title */}
        <div
          style={{
            marginTop: 5,
            padding: '5px 9px',
            borderLeft: `2px solid ${theme.orange}`,
            background: 'rgba(255,138,30,0.08)',
            borderRadius: 4,
            color: theme.offWhite,
            fontSize: 10.5,
            lineHeight: 1.45,
          }}
        >
          {reg.schemeGloss}
        </div>
        <div style={{ color: theme.slate, fontSize: 10.5, marginTop: 5, lineHeight: 1.4 }}>
          {reg.blurb}
        </div>
        <div style={{ color: theme.slate, fontSize: 10.5, marginTop: 4 }}>
          tap the <span style={{ color: theme.gold }}>?</span> on any row for why it's that colour
        </div>
        <table style={{ width: '100%', fontSize: 12, marginTop: 8, borderSpacing: 0 }}>
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
              const help = targetHelp(
                teach[k].what,
                teach[k].goal,
                cur,
                tgt,
                HIGHER_BETTER[k],
              );
              return (
                <KpiRow
                  key={k}
                  label={labelFor(k)}
                  value={fmt(k, cur)}
                  target={fmt(k, tgt)}
                  help={help}
                />
              );
            })}
            {/* asset ageing (#15): average derived condition — no RIIO target */}
            <KpiRow
              label="network health avg (%)"
              value={snapshot.stats.networkHealthPct.toFixed(0)}
              target="—"
              help={bandedHelp(
                'Average condition of your lines + substations, % (asset ageing). Kit decays over ~40 years, faster under heavy loading and storms.',
                'Above 70%. Replace or maintain aged assets before they fault.',
                snapshot.stats.networkHealthPct,
                70,
                40,
              )}
            />
            {/* H&S (#55): LTI / VSI rates + the safety culture score */}
            <KpiRow
              label="lost-time injuries /yr"
              value={snapshot.safety.ltiPerYear.toFixed(1)}
              target="0"
              help={ltiHelp(snapshot.safety.ltiPerYear)}
            />
            <KpiRow
              label="very serious incidents /yr"
              value={snapshot.safety.vsiPerYear.toFixed(1)}
              target="—"
              help={bandedHelp(
                'High-potential near-misses per year — nobody struck, but they could have been (RIDDOR dangerous occurrences).',
                'As low as possible. They predict the injuries you have not had yet.',
                10 - snapshot.safety.vsiPerYear, // invert: fewer is better → higher score
                7,
                3,
                '',
              )}
            />
            <KpiRow
              label="safety culture (%)"
              value={snapshot.safety.engagement.toFixed(0)}
              target="90"
              help={bandedHelp(
                'Safety culture, surfaced as an employee-engagement survey. A genuinely good culture surveys ~90%.',
                'Above 80%. Fund the safety programme — but over-spending plateaus.',
                snapshot.safety.engagement,
                80,
                60,
              )}
            />
            <KpiRow
              label="employee engagement (%)"
              value={snapshot.org.engagement.toFixed(0)}
              target="—"
              help={bandedHelp(
                'Workforce engagement from pay & benefits. Drives restoration speed, connection cadence and innovation.',
                'High, but not maxed — overpaying inverts the benefit (complacency).',
                snapshot.org.engagement,
                80,
                60,
              )}
            />
          </tbody>
        </table>
        {snapshot.safety.noticeDaysLeft !== undefined && (
          <div style={{ marginTop: 8, fontSize: 11, color: theme.danger }}>
            ⚠ {reg.safetyBody} improvement notice open — lift the safety programme within{' '}
            {snapshot.safety.noticeDaysLeft.toFixed(0)} days or face a fine
          </div>
        )}
        {r.regulatory && <RegulatoryBlock reg={r.regulatory} fr={reg} />}
        {r.lastReport && (
          <div
            style={{
              marginTop: 12,
              paddingTop: 10,
              borderTop: `1px solid ${theme.navyLight}`,
              fontSize: 12,
            }}
          >
            <span style={{ color: theme.slate }}>
              last report · {r.regulator.scheme}-{r.lastReport.index}:{' '}
            </span>
            <span
              style={{
                color: r.lastReport.composite >= 55 ? theme.ok : theme.danger,
                fontWeight: 800,
              }}
            >
              grade {r.lastReport.grade} ({r.lastReport.composite}/100)
            </span>
            <RankLine />
          </div>
        )}
      </div>
    </div>
  );
}
