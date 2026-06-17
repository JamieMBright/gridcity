// The tutorial curriculum overlay: every lesson in order, what it teaches,
// its lock state (sequential unlock — finish lesson n to open n+1), and a
// 0–3 star rating earned by how tidily it was completed. The campaign IS the
// tutorial, so this is the front door to learning the grid. Shares the glassy
// night-screen visual language of StartMenu / MissionVictory.

import { useState } from 'react';
import { useAppStore } from '../app/store';
import { completedMissions, startMission } from '../app/workerBridge';
import { startMusic } from '../audio/audio';
import { MISSIONS, type Mission } from '../sim/scenario/missions';
import { lessonStars } from './lessonProgress';
import { STORY_KEY } from './StoryIntro';
import { theme } from './theme';

/** The ordered, concrete objectives a lesson walks the player through —
 *  read straight off the mission steps so the curriculum can never drift
 *  from what the lesson actually gates on. */
function lessonObjectives(m: Mission): string[] {
  return m.steps.map((s) => s.objective).filter((o): o is string => !!o);
}

/** Three filled/empty stars for a 0–3 rating. */
function Stars({ n }: { n: 0 | 1 | 2 | 3 }): React.JSX.Element {
  return (
    <span style={{ letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ color: i < n ? theme.gold : 'rgba(141,151,180,0.4)' }}>
          {i < n ? '★' : '☆'}
        </span>
      ))}
    </span>
  );
}

export function LessonsPage(): React.JSX.Element | null {
  const lessonsOpen = useAppStore((s) => s.lessonsOpen);
  const setLessonsOpen = useAppStore((s) => s.setLessonsOpen);
  // which lesson card is expanded to show its curriculum (one at a time)
  const [expanded, setExpanded] = useState<string | undefined>(undefined);
  if (!lessonsOpen) return null;

  const done = completedMissions();
  const doneCount = MISSIONS.filter((m) => done.has(m.id)).length;

  // Launch a lesson: same handoff StartMenu's beginMission does — missions
  // never letterbox, so drop the pending story; start the music gesture;
  // swap to the mission scenario and open at step 0.
  const begin = (id: string): void => {
    startMusic();
    sessionStorage.removeItem(STORY_KEY);
    startMission(id);
    useAppStore.getState().setTutorialStep(0);
    setLessonsOpen(false);
    useAppStore.getState().setMenuOpen(false);
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `${theme.night}d0`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 20,
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          width: 'min(520px, 94vw)',
          maxHeight: '88vh',
          overflowY: 'auto',
          borderRadius: 22,
          padding: '22px 22px 16px',
          background: 'rgba(13, 17, 36, 0.92)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: '1px solid rgba(125, 135, 180, 0.28)',
          boxShadow: '0 24px 90px rgba(0, 0, 0, 0.6)',
          color: theme.offWhite,
          fontFamily: theme.font,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div
            style={{
              color: theme.orange,
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            Tutorials — Learn the Grid
          </div>
          <button
            onClick={() => setLessonsOpen(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: theme.slate,
              fontFamily: theme.font,
              fontSize: 12,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            ← back
          </button>
        </div>
        <div style={{ color: theme.slate, fontSize: 11.5, margin: '6px 0 4px', lineHeight: 1.5 }}>
          Learn the core loop one tiny map at a time:{' '}
          <span style={{ color: theme.offWhite }}>
            designate a site → developers bid → award → build the plant + wires → it lands on the
            bill
          </span>
          . Finish a lesson to unlock the next, and earn up to ★★★ for a clean, lean build. Tap a
          lesson to see exactly what it teaches.
        </div>
        <div
          style={{
            color: theme.gold,
            fontSize: 11,
            margin: '2px 0 8px',
            letterSpacing: '0.04em',
          }}
        >
          progress · {doneCount}/{MISSIONS.length} lessons complete
        </div>

        {MISSIONS.map((m, ix) => {
          const completed = done.has(m.id);
          const prev = ix > 0 ? MISSIONS[ix - 1] : undefined;
          const locked = prev !== undefined && !done.has(prev.id);
          const stars = lessonStars(m.id);
          const teaches = LESSON_TEACHES[m.id];
          const open = expanded === m.id;
          const objectives = lessonObjectives(m);
          return (
            <div
              key={m.id}
              style={{
                margin: '8px 0 0',
                borderRadius: 12,
                border: `1px solid ${
                  completed ? 'rgba(123,196,127,0.4)' : 'rgba(125,135,180,0.3)'
                }`,
                background: locked ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)',
                opacity: locked ? 0.6 : 1,
                overflow: 'hidden',
              }}
            >
              {/* header row: expands the curriculum (locked rows stay shut) */}
              <button
                onClick={() => !locked && setExpanded(open ? undefined : m.id)}
                disabled={locked}
                aria-expanded={open}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '11px 13px',
                  background: 'transparent',
                  border: 'none',
                  color: locked ? theme.slate : theme.offWhite,
                  fontFamily: theme.font,
                  cursor: locked ? 'default' : 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      color: completed ? theme.ok : theme.orange,
                      fontWeight: 700,
                      fontSize: 13,
                      minWidth: 18,
                    }}
                  >
                    {completed ? '✓' : locked ? '🔒' : `${ix + 1}.`}
                  </span>
                  <b style={{ flex: 1, fontSize: 13.5 }}>{m.name}</b>
                  {!locked && <Stars n={stars} />}
                  {!locked && (
                    <span style={{ color: theme.slate, fontSize: 11, marginLeft: 2 }}>
                      {open ? '▾' : '▸'}
                    </span>
                  )}
                </div>
                <div style={{ color: theme.slate, fontSize: 11.5, marginTop: 4, paddingLeft: 26 }}>
                  {locked ? `complete “${prev?.name}” to unlock` : m.tagline}
                </div>
                {!locked && teaches && (
                  <div
                    style={{
                      color: theme.gold,
                      fontSize: 10.5,
                      marginTop: 3,
                      paddingLeft: 26,
                      letterSpacing: '0.04em',
                    }}
                  >
                    you'll learn: {teaches}
                  </div>
                )}
              </button>

              {/* expanded curriculum: the ordered objectives + how stars work,
                  then a clear "start lesson" button */}
              {open && !locked && (
                <div style={{ padding: '0 14px 12px', marginLeft: 12 }}>
                  <div
                    style={{
                      color: theme.slate,
                      fontSize: 10,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      margin: '2px 0 6px',
                    }}
                  >
                    What you'll do, step by step
                  </div>
                  <ol style={{ margin: 0, paddingLeft: 18 }}>
                    {objectives.map((o, i) => (
                      <li
                        key={i}
                        style={{
                          color: theme.offWhite,
                          fontSize: 12,
                          lineHeight: 1.5,
                          marginBottom: 2,
                        }}
                      >
                        {o}
                      </li>
                    ))}
                  </ol>
                  <div
                    style={{
                      color: theme.slate,
                      fontSize: 10.5,
                      lineHeight: 1.45,
                      marginTop: 8,
                    }}
                  >
                    ★ finish the lesson · ★★ nothing overloaded at the end · ★★★ also lean &amp;
                    affordable
                  </div>
                  <button
                    onClick={() => begin(m.id)}
                    style={{
                      marginTop: 10,
                      padding: '8px 18px',
                      borderRadius: 9,
                      border: 'none',
                      background: theme.orange,
                      color: theme.navy,
                      fontFamily: theme.font,
                      fontWeight: 800,
                      fontSize: 13,
                      letterSpacing: '0.04em',
                      cursor: 'pointer',
                    }}
                  >
                    {completed ? 'replay lesson ▸' : 'start lesson ▸'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** The mechanics each lesson actually teaches — a distinct "you'll learn"
 *  lede (the tagline is the flavour line above it). Keyed by mission id so
 *  it stays meaningful even as taglines change. */
const LESSON_TEACHES: Record<string, string> = {
  'm1-first-light': 'generation tenders · distribution substations · 33 kV lines',
  'm2-step-up': 'voltage levels · grid substations & bays · 132 kV transmission',
  'm3-storm': 'depots & vans · vegetation programmes · storms, CI & CML',
  'm4-inbox': 'connection applications · studies · firm vs flexible connections',
  'm5-bill': 'the bill breakdown · headroom · building lean to hit a DUoS target',
  'm6-sun-store': 'solar farms · battery storage · firming intermittent generation',
};
