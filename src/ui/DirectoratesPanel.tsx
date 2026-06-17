// The network business (#53): a modal panel where the player runs the
// company. Six directorate staffing dials (each buffs its real mechanic),
// a PAY & BENEFITS investment (employee engagement → efficiency, with a
// complacency plateau) and the H&S SAFETY PROGRAMME (#55 safety culture).
// All spend rides the bill; the panel shows the live £/yr and the two
// engagement scores. Reads snapshot.org only; sends dial commands.

import { useAppStore } from '../app/store';
import { sendCommand } from '../app/workerBridge';
import {
  DIRECTORATES,
  DIRECTORATE_META,
  DIR_MAX,
  PAY_MAX,
  PAY_PEAK,
  type Directorate,
} from '../sim/events/directorates';
import { fmtMoneyK, panelStyle, theme } from './theme';

function engagementColor(v: number): string {
  return v >= 80 ? theme.ok : v >= 60 ? theme.gold : v >= 45 ? theme.warn : theme.danger;
}

/** A 0..max segmented dial. The peak marker shows where the inverted-U
 *  tops out (overspending past it inverts the benefit). */
function Dial({
  value,
  max,
  peak,
  onSet,
}: {
  value: number;
  max: number;
  peak?: number;
  onSet: (v: number) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
      {Array.from({ length: max + 1 }, (_, i) => {
        const filled = i <= value;
        const isPeak = peak !== undefined && i === peak;
        return (
          <button
            key={i}
            onClick={() => onSet(i)}
            title={isPeak ? 'the sweet spot — spending past here breeds complacency' : `level ${i}`}
            style={{
              width: 20,
              height: 22,
              borderRadius: 4,
              border: `1px solid ${isPeak ? theme.gold : theme.navyLight}`,
              background: filled ? theme.orange : 'transparent',
              color: filled ? theme.navy : theme.slate,
              fontFamily: theme.font,
              fontSize: 10,
              fontWeight: filled ? 700 : 400,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {i}
          </button>
        );
      })}
    </div>
  );
}

export function DirectoratesPanel() {
  const open = useAppStore((s) => s.directoratesOpen);
  const setOpen = useAppStore((s) => s.setDirectoratesOpen);
  const snapshot = useAppStore((s) => s.snapshot);
  if (!open || !snapshot) return null;
  const org = snapshot.org;

  const row = (
    label: string,
    blurb: string,
    dial: React.ReactNode,
    key?: React.Key,
  ): React.ReactElement => (
    <div
      key={key}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        padding: '6px 0',
        borderTop: `1px solid ${theme.navyLight}`,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: theme.offWhite, fontSize: 12 }}>{label}</div>
        <div style={{ color: theme.slate, fontSize: 10, lineHeight: 1.3 }}>{blurb}</div>
      </div>
      {dial}
    </div>
  );

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
          width: 'min(520px, 95vw)',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '14px 18px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: theme.orange, fontWeight: 800 }}>THE NETWORK BUSINESS</div>
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
        <div style={{ color: theme.slate, fontSize: 11, marginTop: 2 }}>
          Resource your directorates and your people. Every pound lands on the bill —{' '}
          <span style={{ color: theme.gold }}>{fmtMoneyK(org.costYrK)}/yr</span> committed.
        </div>

        {/* people: pay & safety engagement headline */}
        <div style={{ display: 'flex', gap: 14, marginTop: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ color: theme.slate, fontSize: 10, letterSpacing: '0.12em' }}>
              EMPLOYEE ENGAGEMENT
            </div>
            <div style={{ color: engagementColor(org.engagement), fontWeight: 800, fontSize: 22 }}>
              {org.engagement.toFixed(0)}%
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: theme.slate, fontSize: 10, letterSpacing: '0.12em' }}>
              SAFETY CULTURE
            </div>
            <div
              style={{ color: engagementColor(org.safetyEngagement), fontWeight: 800, fontSize: 22 }}
            >
              {org.safetyEngagement.toFixed(0)}%
            </div>
          </div>
        </div>

        {row(
          'Pay & benefits',
          'Health cover, real pensions, paid paternity. Engaged staff fix faster, connect quicker, innovate more — but overpaying breeds complacency.',
          <Dial
            value={org.pay}
            max={PAY_MAX}
            peak={PAY_PEAK}
            onSet={(level) => sendCommand({ type: 'setPay', level })}
          />,
        )}
        {row(
          'H&S safety programme',
          'Build a genuine safety culture — training, risk assessment, leadership visibility. Fewer injuries; same complacency plateau if you just throw money at it.',
          <Dial
            value={org.safety}
            max={PAY_MAX}
            peak={PAY_PEAK}
            onSet={(level) => sendCommand({ type: 'setSafetyProgramme', level })}
          />,
        )}

        <div
          style={{
            color: theme.slate,
            fontSize: 10,
            letterSpacing: '0.12em',
            marginTop: 12,
            marginBottom: 2,
          }}
        >
          DIRECTORATES (1 = as today)
        </div>
        {DIRECTORATES.map((d: Directorate) =>
          row(
            DIRECTORATE_META[d].name,
            DIRECTORATE_META[d].blurb,
            <Dial
              value={org.dirs[d]}
              max={DIR_MAX}
              onSet={(level) => sendCommand({ type: 'setDirectorate', directorate: d, level })}
            />,
            d,
          ),
        )}
      </div>
    </div>
  );
}
