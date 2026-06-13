// A side-by-side FIRM vs FLEXIBLE comparison for an open connection
// application, so the tradeoff reads at a glance instead of hiding in two
// button tooltips. The semantics mirror the sim (market/dispatch.ts,
// events/applications.ts):
//   FIRM     — full network access; must-take. If the operator has to
//              constrain them off, the operator PAYS constraint
//              compensation (→ customer bills). Slower/dearer to offer
//              because the network must actually host the worst case.
//   FLEXIBLE — cheaper and quicker to connect; the operator may curtail
//              the connection freely whenever the network is tight. That
//              curtailment is just logged — NO compensation owed. The
//              developer carries the lost-output risk.
// Load connections cannot be curtailed like generation, so the flexible
// card is only offered for generation (matches the inbox button gating).

import type { ConnectionStudy } from '../sim/study';
import { theme } from './theme';

/** One plain-language row inside a comparison card. */
function Row({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div style={{ marginTop: 4, lineHeight: 1.35 }}>
      <div style={{ color: theme.slate, fontSize: 9, letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ color: tone, fontSize: 11 }}>{value}</div>
    </div>
  );
}

/** One comparison card (FIRM or FLEXIBLE). The accept button lives in the
 *  card footer so the choice and its consequences sit together. */
function Card({
  title,
  edge,
  glow,
  rows,
  ctaLabel,
  ctaColor,
  onAccept,
}: {
  title: string;
  edge: string;
  glow: string;
  rows: React.ReactElement;
  ctaLabel: string;
  ctaColor: string;
  onAccept: () => void;
}) {
  return (
    <div
      style={{
        flex: '1 1 116px',
        minWidth: 116,
        display: 'flex',
        flexDirection: 'column',
        border: `1px solid ${edge}`,
        borderRadius: 7,
        padding: '5px 7px 7px',
        background: glow,
      }}
    >
      <div
        style={{
          color: edge,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.1em',
        }}
      >
        {title}
      </div>
      <div style={{ flex: 1 }}>{rows}</div>
      <button
        style={{
          marginTop: 7,
          padding: '3px 8px',
          borderRadius: 5,
          border: `1px solid ${ctaColor}`,
          background: 'transparent',
          color: ctaColor,
          fontFamily: theme.font,
          fontSize: 11,
          cursor: 'pointer',
          width: '100%',
        }}
        onClick={onAccept}
      >
        {ctaLabel}
      </button>
    </div>
  );
}

/** Turn a run study into a one-line plain-English verdict shown above the
 *  cards. No study yet ⇒ a prompt to run one. */
function studyLine(study: ConnectionStudy | undefined): { text: string; tone: string } {
  if (!study) {
    return {
      text: 'No connection study yet — run one to see whether the network can host this before you choose.',
      tone: theme.slate,
    };
  }
  if (!study.ok) {
    return { text: `Study: ${study.error ?? 'could not be wired'}.`, tone: theme.orangeSoft };
  }
  if (study.impacts.length === 0) {
    return {
      text: 'Study: clean — nothing on the network exceeds 90% at stress, so FIRM is safe.',
      tone: theme.ok,
    };
  }
  const worst = study.impacts[0]!;
  return {
    text: `Study: tight — ${worst.label} hits ${worst.afterPct}% at stress. FLEXIBLE avoids constraint payments; reinforce to go FIRM cleanly.`,
    tone: theme.orangeSoft,
  };
}

export function FirmFlexCompare({
  study,
  isGen,
  onFirm,
  onFlex,
}: {
  study: ConnectionStudy | undefined;
  /** Only generation can be offered FLEXIBLE (load can't be curtailed). */
  isGen: boolean;
  onFirm: () => void;
  onFlex: () => void;
}) {
  const line = studyLine(study);
  const reinforce =
    study?.ok && study.impacts.length > 0
      ? ` (study flags ${study.impacts.length} overload${study.impacts.length > 1 ? 's' : ''})`
      : '';

  return (
    <div style={{ marginTop: 5 }}>
      <div
        style={{
          fontSize: 10,
          lineHeight: 1.4,
          color: line.tone,
          marginBottom: 5,
        }}
      >
        {line.text}
      </div>
      {/* flex-wrap: two cards sit side-by-side in the 270px panel and stack
          cleanly when the panel/viewport is narrower (phone-landscape) */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <Card
          title="FIRM"
          edge={theme.ok}
          glow="rgba(123, 196, 127, 0.06)"
          ctaLabel="offer firm"
          ctaColor={theme.ok}
          onAccept={onFirm}
          rows={
            <>
              <Row label="ACCESS" value="Full, must-take output" tone={theme.offWhite} />
              <Row
                label="IF CONSTRAINED"
                value="You pay constraint comp"
                tone={theme.sunset}
              />
              <Row label="SPEED / COST" value="Slower, dearer to wire" tone={theme.slate} />
              <Row
                label="BILL IMPACT"
                value={`Compensation lands on bills${reinforce}`}
                tone={theme.slate}
              />
            </>
          }
        />
        {isGen ? (
          <Card
            title="FLEXIBLE"
            edge={theme.orange}
            glow="rgba(255, 138, 30, 0.07)"
            ctaLabel="offer flexible"
            ctaColor={theme.gold}
            onAccept={onFlex}
            rows={
              <>
                <Row label="ACCESS" value="Curtailable when tight" tone={theme.offWhite} />
                <Row label="IF CONSTRAINED" value="No comp — just logged" tone={theme.ok} />
                <Row
                  label="SPEED / COST"
                  value="Cheaper, faster to connect"
                  tone={theme.gold}
                />
                <Row
                  label="BILL IMPACT"
                  value="Lighter — dev carries the risk"
                  tone={theme.slate}
                />
              </>
            }
          />
        ) : (
          <div
            style={{
              flex: '1 1 116px',
              minWidth: 116,
              display: 'flex',
              alignItems: 'center',
              border: `1px dashed ${theme.slate}`,
              borderRadius: 7,
              padding: '5px 7px',
              color: theme.slate,
              fontSize: 10,
              lineHeight: 1.4,
            }}
          >
            Load can't be curtailed like generation, so there's no flexible
            offer — reinforce the network if the study is tight.
          </div>
        )}
      </div>
    </div>
  );
}
