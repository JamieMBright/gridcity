// System Prepare (#D, owner 2026-06-22): the one-click storm-response mode.
//
// One button — triggerable ANY time — enacts the WHOLE storm plan at once
// (extra crew shifts + scouts + wider call handling, via the existing
// reliability/stormprep.ts levers behind the `systemPrepare` command). While
// any lever is live the sim reports snapshot.systemPreparing, and the WHOLE
// HUD takes a FULL hazard-yellow cast (owner's explicit choice) — the perimeter
// frame + mobile chrome are CSS-filtered toward amber, framed in hazard
// chevrons, under a persistent "SYSTEM PREPARE ACTIVE" banner. The map itself
// is untouched. "Stand down" releases the levers (the spend is already charged).

import { useAppStore } from '../app/store';
import { sendCommand } from '../app/workerBridge';
import { theme } from './theme';

const HAZARD = '#ffd21e';
const HAZARD_DEEP = '#caa400';
const HAZARD_INK = '#241c00';

/** The CSS that recolours the HUD roots toward hazard-yellow while active, plus
 *  the banner pulse + the chevron hazard-tape pattern. Injected only when on. */
const HAZARD_CSS = `
[data-hud-frame], [data-chrome-mobile] {
  filter: sepia(0.72) saturate(2.5) hue-rotate(-22deg) brightness(1.06) contrast(1.02);
  transition: filter 0.45s ease;
}
@keyframes ec-prep-pulse { 0%,100% { opacity: 0.92; } 50% { opacity: 0.62; } }
`;

export function SystemPrepare(): React.ReactElement | null {
  const snapshot = useAppStore((s) => s.snapshot);
  if (!snapshot) return null;
  const active = snapshot.systemPreparing === true;

  return (
    <>
      {active && <style>{HAZARD_CSS}</style>}

      {/* hazard edge-frame: a thin pulsing chevron-tape border so it's
          unmistakable you're in storm-response mode. Non-interactive. */}
      {active && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 8500,
            border: `4px solid ${HAZARD}`,
            boxShadow: `inset 0 0 0 2px ${HAZARD_INK}, inset 0 0 38px rgba(255,210,30,0.22)`,
            background:
              'repeating-linear-gradient(135deg, rgba(255,210,30,0.16) 0 14px, rgba(36,28,0,0.16) 14px 28px) border-box',
            // only the border shows the tape (the fill is clipped away)
            WebkitMaskImage:
              'linear-gradient(#000,#000), linear-gradient(#000,#000)',
            animation: 'ec-prep-pulse 2.4s ease-in-out infinite',
          }}
        />
      )}

      {/* persistent banner + the toggle. Rendered OUTSIDE the filtered roots so
          it stays crisp hazard-yellow. Always present in-game; the button text
          flips between engage / stand down. */}
      <div
        data-system-prepare
        style={{
          position: 'absolute',
          top: 'calc(var(--sai-t) + 6px)',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 8600,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          pointerEvents: 'none',
        }}
      >
        {active && (
          <span
            style={{
              pointerEvents: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '4px 12px',
              borderRadius: 7,
              background: HAZARD,
              color: HAZARD_INK,
              fontFamily: theme.font,
              fontWeight: 800,
              fontSize: 12,
              letterSpacing: '0.06em',
              border: `1px solid ${HAZARD_DEEP}`,
              boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
              animation: 'ec-prep-pulse 2.4s ease-in-out infinite',
            }}
          >
            ⚠ SYSTEM PREPARE ACTIVE
          </span>
        )}
        <button
          aria-label={active ? 'stand down system prepare' : 'engage system prepare'}
          onClick={() => sendCommand({ type: 'systemPrepare', on: !active })}
          style={{
            pointerEvents: 'auto',
            cursor: 'pointer',
            padding: '4px 12px',
            borderRadius: 7,
            fontFamily: theme.font,
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: '0.04em',
            border: `1px solid ${active ? HAZARD_INK : HAZARD_DEEP}`,
            background: active ? 'rgba(36,28,0,0.85)' : HAZARD,
            color: active ? HAZARD : HAZARD_INK,
            boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
          }}
        >
          {active ? 'Stand down' : '⚡ System Prepare'}
        </button>
      </div>
    </>
  );
}
