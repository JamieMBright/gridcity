// Scripted first steps. Each step either auto-advances when the sim
// shows it's done, or waits for "next". Skippable at any point.

import { useEffect } from 'react';
import { useAppStore } from '../app/store';
import type { SimSnapshot } from '../sim/protocol';
import { panelStyle, theme } from './theme';

interface Step {
  text: string;
  /** Auto-advance condition; omit for manual "next". */
  done?: (s: SimSnapshot) => boolean;
}

const STEPS: Step[] = [
  {
    text: 'Welcome, operator. London is dark — every cold blue tile is a neighbourhood waiting for power. Drag to pan, scroll to zoom.',
  },
  {
    text: 'First, generation — but you are a network operator, not a power company. Pick GAS CCGT (hotkey 1) and designate a site on open land away from homes — the map shades green where it can go, red where it cannot. That opens a tender: developers bid in your INBOX, and the moment you award one their plant appears, online and waiting for your wires.',
    done: (s) => s.assets.some((a) => a.kind === 'gen') || s.inbox.tenders.length > 0,
  },
  {
    text: 'Now a GRID SUBSTATION (132/33 kV) near the area you want to serve.',
    done: (s) => s.assets.some((a) => a.kind === 'sub' && a.sub === 'grid'),
  },
  {
    text: 'Wire them up: choose the 132 KV LINE, click the plant, then the substation.',
    done: (s) => s.assets.some((a) => a.kind === 'line' && a.level === 132),
  },
  {
    text: 'Last hop: place a DISTRIBUTION SUBSTATION among homes (watch its service ring), and run a 33 KV LINE to it — wooden poles march along the route. Homes light up the moment power reaches them — watch the chevrons ride your new line.',
    done: (s) => s.assets.some((a) => a.kind === 'line' && a.level === 33),
  },
  {
    text: "You're live — and the bill panel is now counting. Faults will come: build a FIELD DEPOT so your vans have somewhere to roll from.",
    done: (s) => s.assets.some((a) => a.kind === 'depot'),
  },
  {
    text: "That's the job: connect the city, watch the inbox for connection applications and innovation pitches, mind the trees, and keep the regulator smiling — your RIIO report card lands every 5 years. Good luck.",
  },
];

export function Tutorial() {
  const step = useAppStore((s) => s.tutorialStep);
  const setStep = useAppStore((s) => s.setTutorialStep);
  const snapshot = useAppStore((s) => s.snapshot);
  const menuOpen = useAppStore((s) => s.menuOpen);

  const current = step !== undefined ? STEPS[step] : undefined;

  useEffect(() => {
    if (step === undefined || !snapshot || !current?.done) return;
    if (current.done(snapshot)) {
      setStep(step + 1 < STEPS.length ? step + 1 : undefined);
    }
  }, [snapshot, step, current, setStep]);

  if (menuOpen || step === undefined || !current) return null;
  const last = step === STEPS.length - 1;

  return (
    <div
      style={{
        ...panelStyle,
        position: 'absolute',
        top: 56,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(420px, 92vw)',
        padding: '10px 14px',
        border: `1px solid ${theme.orange}`,
        zIndex: 5,
      }}
    >
      <div style={{ color: theme.orange, fontSize: 10, letterSpacing: '0.12em' }}>
        TUTORIAL {step + 1}/{STEPS.length}
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.5, marginTop: 4 }}>{current.text}</div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        {!current.done && (
          <button
            onClick={() => setStep(last ? undefined : step + 1)}
            style={{
              padding: '3px 14px',
              borderRadius: 5,
              border: 'none',
              background: theme.orange,
              color: theme.navy,
              fontFamily: theme.font,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {last ? 'play' : 'next'}
          </button>
        )}
        <button
          onClick={() => setStep(undefined)}
          style={{
            padding: '3px 10px',
            borderRadius: 5,
            border: `1px solid ${theme.navyLight}`,
            background: 'transparent',
            color: theme.slate,
            fontFamily: theme.font,
            cursor: 'pointer',
          }}
        >
          skip tutorial
        </button>
      </div>
    </div>
  );
}
