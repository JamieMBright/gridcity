// The campaign missions' guided step strip + victory card. The campaign
// IS the tutorial now — the old standalone London step strip is retired
// (sandbox new game starts clean; the start menu's "tutorial" launches
// mission 1). Each step auto-advances when the sim shows it's done, or
// waits for "next"; skippable at any point. A refused siting click shows
// its reason loudly right under the strip.

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
import { SpotlightOverlay, useSpotlightRect } from './Spotlight';
import { panelStyle, theme } from './theme';

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
  const setLessonsOpen = useAppStore((s) => s.setLessonsOpen);
  const setMenuOpen = useAppStore((s) => s.setMenuOpen);
  // loud refusals: a siting click the sim rejects sets this toast — we
  // surface the reason prominently right under the strip, not just as the
  // small corner toast that's easy to miss mid-lesson.
  const toast = useAppStore((s) => s.toast);
  // the notes can DOMINATE while you read, then tuck to a recallable pill
  // so they never block the build label / a teaching tile (owner T2).
  const [minimized, setMinimized] = useState(false);

  const current = step !== undefined ? steps[step] : undefined;

  useEffect(() => {
    if (step === undefined || !snapshot || !current?.done) return;
    if (current.done(snapshot, ui)) {
      setStep(step + 1 < steps.length ? step + 1 : undefined);
    }
  }, [snapshot, step, current, setStep, steps.length, ui]);

  // guided-play spotlight: ring the step's target control (measured live
  // so it follows whichever layout is mounted). Pure-visual — clicks pass
  // through, so the player can still act freely.
  const spotRect = useSpotlightRect(minimized ? undefined : current?.spot);

  if (step === undefined || !current) return null;
  const last = step === steps.length - 1;

  // end the tutorial outright (the no-skip rule keeps this off mid-lesson;
  // it appears only as the explicit "finish" on the final tile).
  const finish = (): void => {
    setStep(undefined);
    setLessonsOpen(true);
    setMenuOpen(true);
  };

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        title="Show the tutorial notes"
        style={{
          ...panelStyle,
          position: 'absolute',
          top: 56,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '6px 14px',
          border: `1px solid ${theme.orange}`,
          color: theme.orange,
          fontFamily: theme.font,
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
          zIndex: 7,
        }}
      >
        📖 lesson {step + 1}/{steps.length} — tap to show
      </button>
    );
  }

  return (
    <>
      {spotRect && <SpotlightOverlay hole={spotRect} zIndex={6} />}
      <div
        style={{
          ...panelStyle,
          position: 'absolute',
          top: 56,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(440px, 94vw)',
          maxHeight: '46vh',
          overflowY: 'auto',
          padding: '12px 16px',
          border: `1px solid ${theme.orange}`,
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
          zIndex: 7,
          // taps PASS THROUGH the strip body to the map underneath (the
          // camera fit can put a teaching tile beneath the strip on a
          // phone) — only the buttons below re-arm pointer events
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            pointerEvents: 'auto',
          }}
        >
          <div style={{ color: theme.orange, fontSize: 10, letterSpacing: '0.12em' }}>
            {header} {step + 1}/{steps.length}
          </div>
          <button
            onClick={() => setMinimized(true)}
            title="Tuck the notes away (recall any time)"
            style={{
              background: 'transparent',
              border: 'none',
              color: theme.slate,
              cursor: 'pointer',
              fontSize: 14,
              lineHeight: 1,
              padding: 0,
            }}
          >
            ▁
          </button>
        </div>
        <div style={{ fontSize: 13.5, lineHeight: 1.55, marginTop: 5 }}>{current.text}</div>
        {toast && (
          <div
            role="alert"
            style={{
              marginTop: 8,
              padding: '6px 10px',
              borderRadius: 6,
              background: 'rgba(224, 105, 122, 0.16)',
              border: `1px solid ${theme.danger}`,
              color: theme.danger,
              fontSize: 12,
              lineHeight: 1.4,
              fontWeight: 600,
            }}
          >
            ⚠ can’t do that here — {toast}
          </div>
        )}
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginTop: 10,
            alignItems: 'center',
            pointerEvents: 'auto',
          }}
        >
          {/* step navigation — back/forward only; there is NO "skip the
              whole tutorial" escape (owner: the tutorial IS the content) */}
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            style={{ ...ghostBtnStyle, opacity: step === 0 ? 0.4 : 1 }}
            title="Previous step"
          >
            ◂ back
          </button>
          {last ? (
            <button onClick={finish} style={btnStyle}>
              finish tutorial ✓
            </button>
          ) : (
            <button onClick={() => setStep(step + 1)} style={btnStyle} title="Next step">
              next ▸
            </button>
          )}
        </div>
      </div>
    </>
  );
}

/** Mission accomplished: name, the win line, and where to next. */
function MissionVictory({ scenarioId }: { scenarioId: string }) {
  const snapshot = useAppStore((s) => s.snapshot);
  const setMenuOpen = useAppStore((s) => s.setMenuOpen);
  const setLessonsOpen = useAppStore((s) => s.setLessonsOpen);
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
            onClick={() => {
              setLessonsOpen(true);
              setMenuOpen(true);
            }}
          >
            lessons ★
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
  // the campaign IS the tutorial: the step strip only ever runs on a
  // mission scenario. Sandbox (london) gets no auto step strip.
  const mission = missionOf(scenarioId);
  if (!mission) return null;

  return (
    <>
      <StepStrip
        steps={mission.steps}
        header={`MISSION · ${mission.name.toUpperCase()} · STEP`}
        snapshot={snapshot}
        ui={{ studies, headroom }}
      />
      <MissionVictory scenarioId={scenarioId} />
    </>
  );
}
