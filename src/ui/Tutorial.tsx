// Scripted first steps — the London tutorial strip AND the campaign
// missions' guided steps (one component, two sources). Each step either
// auto-advances when the sim shows it's done, or waits for "next".
// Skippable at any point. Mission wins additionally raise the victory
// card (next mission / back to menu).

import { useState, useEffect } from 'react';
import { useAppStore } from '../app/store';
import { startMission } from '../app/workerBridge';
import type { SimSnapshot } from '../sim/protocol';
import {
  missionOf,
  nextMission,
  type MissionStep,
  type MissionUiView,
} from '../sim/scenario/missions';
import { panelStyle, theme } from './theme';

const STEPS: MissionStep[] = [
  {
    text: 'Welcome, operator. London is dark — every cold blue tile is a neighbourhood waiting for power. Drag to pan, scroll to zoom.',
  },
  {
    text: 'First, generation — but you are a network operator, not a power company. Pick GAS CCGT (hotkey 1) and designate a site on open land away from homes — the map shades green where it can go, red where it cannot. That opens a tender: developers bid in your INBOX, and the moment you award one their plant appears, online and waiting for your wires.',
    // seeded existing plants don't count: the player must open a tender
    done: (s) => s.inbox.tenders.length > 0,
  },
  {
    text: 'Now a GRID SUBSTATION (132/33 kV) near the area you want to serve.',
    done: (s) => s.assets.some((a) => a.kind === 'sub' && a.sub === 'grid' && !a.idno),
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

const btnStyle: React.CSSProperties = {
  padding: '3px 14px',
  borderRadius: 5,
  border: 'none',
  background: theme.orange,
  color: theme.navy,
  fontFamily: theme.font,
  fontWeight: 700,
  cursor: 'pointer',
};

const ghostBtnStyle: React.CSSProperties = {
  padding: '3px 10px',
  borderRadius: 5,
  border: `1px solid ${theme.navyLight}`,
  background: 'transparent',
  color: theme.slate,
  fontFamily: theme.font,
  cursor: 'pointer',
};

function StepStrip({
  steps,
  header,
  snapshot,
  ui,
}: {
  steps: MissionStep[];
  header: string;
  snapshot: SimSnapshot | undefined;
  ui: MissionUiView;
}) {
  const step = useAppStore((s) => s.tutorialStep);
  const setStep = useAppStore((s) => s.setTutorialStep);

  const current = step !== undefined ? steps[step] : undefined;

  useEffect(() => {
    if (step === undefined || !snapshot || !current?.done) return;
    if (current.done(snapshot, ui)) {
      setStep(step + 1 < steps.length ? step + 1 : undefined);
    }
  }, [snapshot, step, current, setStep, steps.length, ui]);

  if (step === undefined || !current) return null;
  const last = step === steps.length - 1;

  return (
    <div
      style={{
        ...panelStyle,
        position: 'absolute',
        top: 56,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(420px, 92vw)',
        maxHeight: '46vh',
        overflowY: 'auto',
        padding: '10px 14px',
        border: `1px solid ${theme.orange}`,
        zIndex: 5,
      }}
    >
      <div style={{ color: theme.orange, fontSize: 10, letterSpacing: '0.12em' }}>
        {header} {step + 1}/{steps.length}
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.5, marginTop: 4 }}>{current.text}</div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        {!current.done && (
          <button onClick={() => setStep(last ? undefined : step + 1)} style={btnStyle}>
            {last ? 'play' : 'next'}
          </button>
        )}
        <button onClick={() => setStep(undefined)} style={ghostBtnStyle}>
          skip tutorial
        </button>
      </div>
    </div>
  );
}

/** Mission accomplished: name, the win line, and where to next. */
function MissionVictory({ scenarioId }: { scenarioId: string }) {
  const snapshot = useAppStore((s) => s.snapshot);
  const setMenuOpen = useAppStore((s) => s.setMenuOpen);
  const setTutorialStep = useAppStore((s) => s.setTutorialStep);
  const [dismissedFor, setDismissedFor] = useState<string | undefined>(undefined);

  const mission = missionOf(scenarioId);
  if (!mission || !snapshot?.missionComplete || dismissedFor === scenarioId) return null;
  const next = nextMission(scenarioId);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(6, 8, 20, 0.55)',
        fontFamily: theme.font,
      }}
    >
      <div
        style={{
          width: 'min(440px, 92vw)',
          maxHeight: '88vh',
          overflowY: 'auto',
          borderRadius: 18,
          padding: '22px 24px',
          textAlign: 'center',
          background: 'rgba(13, 17, 36, 0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: `1px solid ${theme.gold}`,
          boxShadow: '0 18px 70px rgba(0, 0, 0, 0.6)',
          color: theme.offWhite,
        }}
      >
        <div style={{ fontSize: 30, lineHeight: 1 }}>🏆</div>
        <div
          style={{
            color: theme.gold,
            fontSize: 11,
            letterSpacing: '0.22em',
            marginTop: 8,
          }}
        >
          MISSION COMPLETE
        </div>
        <div style={{ fontSize: 19, fontWeight: 800, marginTop: 4 }}>{mission.name}</div>
        <div style={{ color: theme.slate, fontSize: 12.5, lineHeight: 1.55, marginTop: 10 }}>
          {mission.winText}
        </div>
        <div
          style={{
            display: 'flex',
            gap: 8,
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginTop: 16,
          }}
        >
          {next && (
            <button
              style={{ ...btnStyle, padding: '7px 18px' }}
              onClick={() => {
                startMission(next.id);
                setTutorialStep(0);
              }}
            >
              next mission ▸ {next.name.toLowerCase()}
            </button>
          )}
          <button
            style={{ ...ghostBtnStyle, padding: '7px 14px', color: theme.offWhite }}
            onClick={() => setMenuOpen(true)}
          >
            back to menu
          </button>
          <button
            style={{ ...ghostBtnStyle, padding: '7px 14px' }}
            onClick={() => setDismissedFor(scenarioId)}
          >
            keep playing
          </button>
        </div>
      </div>
    </div>
  );
}

export function Tutorial() {
  const snapshot = useAppStore((s) => s.snapshot);
  const menuOpen = useAppStore((s) => s.menuOpen);
  const scenarioId = useAppStore((s) => s.scenarioId);
  const studies = useAppStore((s) => Object.keys(s.studies).length);
  const headroom = useAppStore((s) => s.headroom);

  if (menuOpen) return null;
  const mission = missionOf(scenarioId);
  const missionIx = mission ? `MISSION · ${mission.name.toUpperCase()} · STEP` : 'TUTORIAL';

  return (
    <>
      <StepStrip
        steps={mission ? mission.steps : STEPS}
        header={missionIx}
        snapshot={snapshot}
        ui={{ studies, headroom }}
      />
      {mission && <MissionVictory scenarioId={scenarioId} />}
    </>
  );
}
