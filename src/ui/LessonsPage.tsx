// The tutorial curriculum overlay: every lesson in order, what it teaches,
// its lock state (sequential unlock — finish lesson n to open n+1), and a
// 0–3 star rating earned by how tidily it was completed. The campaign IS the
// tutorial, so this is the front door to learning the grid. Shares the glassy
// night-screen visual language of StartMenu / MissionVictory.

import { useAppStore } from '../app/store';
import { completedMissions, startMission } from '../app/workerBridge';
import { startMusic } from '../audio/audio';
import { MISSIONS } from '../sim/scenario/missions';
import { lessonStars } from './lessonProgress';
import { STORY_KEY } from './StoryIntro';
import { theme } from './theme';

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
  if (!lessonsOpen) return null;

  const done = completedMissions();

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
        <div style={{ color: theme.slate, fontSize: 11.5, margin: '6px 0 10px' }}>
          one tiny map per lesson · finish one to unlock the next · earn up to ★★★ for a clean,
          lean build
        </div>

        {MISSIONS.map((m, ix) => {
          const completed = done.has(m.id);
          const prev = ix > 0 ? MISSIONS[ix - 1] : undefined;
          const locked = prev !== undefined && !done.has(prev.id);
          const stars = lessonStars(m.id);
          const teaches = LESSON_TEACHES[m.id];
          return (
            <button
              key={m.id}
              disabled={locked}
              onClick={() => !locked && begin(m.id)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                margin: '8px 0 0',
                padding: '11px 13px',
                borderRadius: 12,
                border: `1px solid ${
                  completed ? 'rgba(123,196,127,0.4)' : 'rgba(125,135,180,0.3)'
                }`,
                background: locked ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)',
                color: locked ? theme.slate : theme.offWhite,
                opacity: locked ? 0.6 : 1,
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
};
