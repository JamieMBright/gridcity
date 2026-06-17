// The campaign missions' guided step strip + victory card. The campaign
// IS the tutorial now — the old standalone London step strip is retired
// (sandbox new game starts clean; the start menu's "tutorials" opens the
// lessons page). STEP-GATING: a step with a `done` predicate keeps its
// next/finish button DISABLED until the goal is met (with a live ○→✓
// objective row), so the player must actually do each thing before moving
// on; concept steps (no goal) advance freely with "continue". The victory
// card shows ONLY on "finish tutorial", never the instant the win latches.
// A refused siting click shows its reason loudly right under the strip.

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
  const setTutorialDone = useAppStore((s) => s.setTutorialDone);
  const scenarioId = useAppStore((s) => s.scenarioId);
  // loud refusals: a siting click the sim rejects sets this toast — we
  // surface the reason prominently right under the strip, not just as the
  // small corner toast that's easy to miss mid-lesson.
  const toast = useAppStore((s) => s.toast);
  // the notes can DOMINATE while you read, then tuck to a recallable pill
  // so they never block the build label / a teaching tile (owner T2).
  const [minimized, setMinimized] = useState(false);

  const current = step !== undefined ? steps[step] : undefined;

  // STEP GATING: a step with a `done` predicate is GATED — its goal must be
  // met before the player can move on. A step without one is a pure concept
  // step (freely advanceable). `goalMet` drives both the auto-advance and
  // whether the next/finish button is enabled.
  const goalMet =
    current?.done && snapshot ? current.done(snapshot, ui) : current ? !current.done : false;

  useEffect(() => {
    // auto-advance is now OPT-IN (step.auto): only a few steps skip the
    // "read the takeaway, then click on" beat (e.g. watching a bid land).
    // Every other gated step waits for the player to press next once its
    // goal is met — so the lesson copy is always read.
    if (step === undefined || !current?.auto) return;
    if (goalMet) setStep(step + 1 < steps.length ? step + 1 : undefined);
  }, [goalMet, step, current, setStep, steps.length]);

  // guided-play spotlight: ring the step's target control (measured live
  // so it follows whichever layout is mounted) with a bouncing arrow.
  // Pure-visual — clicks pass through, so the player can still act freely.
  // The spotlight drops the MOMENT the target is CLICKED (owner: don't let
  // it linger after the action) — and also once the goal latches or the
  // notes are minimized, whichever comes first; the eye then moves to the
  // next/finish button.
  const { rect: spotRect, clicked: spotClicked } = useSpotlightRect(
    minimized || goalMet ? undefined : current?.spot,
  );
  const showSpot = spotRect && !spotClicked;

  if (step === undefined || !current) return null;
  const last = step === steps.length - 1;
  const gated = current.done !== undefined;

  // finish the lesson: clear the step strip and RAISE the victory card
  // (gated on tutorialDone so the card appears ONLY here, never the instant
  // the objective is met — owner). The card itself offers next-mission /
  // lessons / keep-playing.
  const finish = (): void => {
    setStep(undefined);
    setTutorialDone(scenarioId);
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
          border: `1px solid ${goalMet && gated ? theme.ok : theme.orange}`,
          color: goalMet && gated ? theme.ok : theme.orange,
          fontFamily: theme.font,
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
          zIndex: 7,
        }}
      >
        {goalMet && gated ? '✓' : '📖'} lesson {step + 1}/{steps.length}
        {goalMet && gated ? ' — done, tap to continue' : ' — tap to show'}
      </button>
    );
  }

  return (
    <>
      {showSpot && <SpotlightOverlay hole={spotRect} zIndex={6} />}
      <div
        style={{
          ...panelStyle,
          position: 'absolute',
          top: 56,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(440px, 94vw)',
          // flex column: the LESSON TEXT scrolls, but the header at the top
          // and the objective + nav buttons at the bottom stay PINNED — so on
          // a short phone-landscape the gate (objective row + next button) is
          // always visible without scrolling (a real bug at 46vh before).
          maxHeight: '64vh',
          display: 'flex',
          flexDirection: 'column',
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
            flexShrink: 0,
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
        {/* progress dots: a quick read of where you are in the lesson, the
            done steps filled, the current one ringed */}
        <div style={{ display: 'flex', gap: 4, marginTop: 6, flexShrink: 0 }}>
          {steps.map((_, i) => (
            <span
              key={i}
              style={{
                width: i === step ? 14 : 7,
                height: 7,
                borderRadius: 4,
                background:
                  i < step ? theme.ok : i === step ? theme.orange : 'rgba(141,151,180,0.3)',
                transition: 'all 160ms ease',
              }}
            />
          ))}
        </div>
        {/* the lesson PROSE is the only part that scrolls; the gate below
            stays pinned so it's always reachable on a short screen */}
        <div
          style={{
            fontSize: 13.5,
            lineHeight: 1.55,
            marginTop: 8,
            overflowY: 'auto',
            minHeight: 0,
            flexShrink: 1,
          }}
        >
          {current.text}
        </div>
        {/* OBJECTIVE row: the concrete goal that gates this step. ○ while
            pending → ✓ when done, so the player always knows exactly what
            unlocks "next". Concept steps (no goal) show nothing here. */}
        {current.objective && (
          <div
            style={{
              marginTop: 9,
              padding: '6px 10px',
              borderRadius: 6,
              display: 'flex',
              gap: 8,
              alignItems: 'baseline',
              flexShrink: 0,
              background: goalMet ? 'rgba(123,196,127,0.14)' : 'rgba(255,162,56,0.10)',
              border: `1px solid ${goalMet ? theme.ok : theme.orange}`,
            }}
          >
            <span style={{ color: goalMet ? theme.ok : theme.orange, fontWeight: 800 }}>
              {goalMet ? '✓' : '○'}
            </span>
            <span
              style={{
                fontSize: 12.5,
                lineHeight: 1.4,
                color: goalMet ? theme.ok : theme.offWhite,
                textDecoration: goalMet ? 'line-through' : 'none',
                fontWeight: 600,
              }}
            >
              {current.objective}
              {goalMet ? ' — done!' : ''}
            </span>
          </div>
        )}
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
        {/* a gentle hint while a gated goal is still pending, so the
            disabled button never feels broken */}
        {gated && !goalMet && (
          <div style={{ marginTop: 8, fontSize: 11, color: theme.slate, fontStyle: 'italic' }}>
            do the step above to continue
          </div>
        )}
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginTop: 10,
            alignItems: 'center',
            pointerEvents: 'auto',
            flexShrink: 0,
          }}
        >
          {/* step navigation — back/forward only; there is NO "skip the
              whole tutorial" escape (owner: the tutorial IS the content).
              FORWARD is GATED: a step with a goal stays locked until the
              goal is met (owner: "don't allow next until the GOAL is
              achieved"). Concept steps (no goal) advance freely. */}
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            style={{ ...ghostBtnStyle, opacity: step === 0 ? 0.4 : 1 }}
            title="Previous step"
          >
            ◂ back
          </button>
          {last ? (
            <button
              onClick={finish}
              disabled={!goalMet}
              style={{ ...btnStyle, opacity: goalMet ? 1 : 0.45, cursor: goalMet ? 'pointer' : 'not-allowed' }}
              title={goalMet ? 'Finish the tutorial' : 'Complete the goal to finish'}
              data-spot="tutorial:finish"
            >
              finish tutorial ✓
            </button>
          ) : (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!goalMet}
              style={{ ...btnStyle, opacity: goalMet ? 1 : 0.45, cursor: goalMet ? 'pointer' : 'not-allowed' }}
              title={goalMet ? 'Next step' : 'Complete the goal to continue'}
            >
              {gated ? 'next ▸' : 'continue ▸'}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

/** Mission accomplished: name, the win line, and where to next. Shown ONLY
 *  once the player clicks "finish tutorial" on the last step (tutorialDone),
 *  never the instant the objective latches (owner). */
function MissionVictory({ scenarioId }: { scenarioId: string }) {
  const tutorialDone = useAppStore((s) => s.tutorialDone);
  const setTutorialDone = useAppStore((s) => s.setTutorialDone);
  const setMenuOpen = useAppStore((s) => s.setMenuOpen);
  const setLessonsOpen = useAppStore((s) => s.setLessonsOpen);
  const setTutorialStep = useAppStore((s) => s.setTutorialStep);

  const mission = missionOf(scenarioId);
  if (!mission || tutorialDone !== scenarioId) return null;
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
                setTutorialDone(undefined);
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
              setTutorialDone(undefined);
              setLessonsOpen(true);
              setMenuOpen(true);
            }}
          >
            lessons ★
          </button>
          <button
            style={{ ...ghostBtnStyle, padding: '7px 14px' }}
            onClick={() => setTutorialDone(undefined)}
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
  const billSeen = useAppStore((s) => s.billSeen);

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
        ui={{ studies, headroom, billSeen }}
      />
      <MissionVictory scenarioId={scenarioId} />
    </>
  );
}
