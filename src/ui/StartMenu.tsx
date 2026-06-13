// The front door: continue a saved campaign, start fresh, or take the
// tutorial — styled as the glassy night-screen with the glowing CONTINUE.
// First click is also our user gesture for starting the audio.

import { useState } from 'react';
import { useAppStore } from '../app/store';
import { completedMissions, newGameCommand, startMission } from '../app/workerBridge';
import { getAudioSettings, startMusic, updateAudioSettings } from '../audio/audio';
import { pushSettings } from '../online/cloud';
import { localStorageStore } from '../persistence/localStorageStore';
import { listSlots } from '../persistence/slotStore';
import { MISSIONS } from '../sim/scenario/missions';
import { AccountPanel } from './AccountPanel';
import { LogoLockup } from './Logo';
import { STORY_KEY } from './StoryIntro';
import { theme } from './theme';

const bigBtn = (primary: boolean): React.CSSProperties => ({
  display: 'block',
  width: 320,
  margin: '12px auto 0',
  padding: '12px 0',
  borderRadius: 12,
  border: primary ? 'none' : '1px solid rgba(125, 135, 180, 0.35)',
  background: primary
    ? 'linear-gradient(180deg, #ffa238 0%, #ff8a1e 55%, #ef7714 100%)'
    : 'rgba(255, 255, 255, 0.04)',
  boxShadow: primary
    ? '0 4px 26px rgba(255, 138, 30, 0.45), inset 0 1px 0 rgba(255,255,255,0.35)'
    : 'none',
  color: primary ? '#241c38' : theme.offWhite,
  fontFamily: theme.font,
  fontSize: 15,
  fontWeight: primary ? 800 : 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  cursor: 'pointer',
});

const footBtn: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: theme.slate,
  fontFamily: theme.font,
  fontSize: 11,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  padding: '4px 6px',
};

export function StartMenu() {
  const menuOpen = useAppStore((s) => s.menuOpen);
  const ready = useAppStore((s) => s.workerStatus === 'ready' && s.snapshot !== undefined);
  const setMenuOpen = useAppStore((s) => s.setMenuOpen);
  const setTutorialStep = useAppStore((s) => s.setTutorialStep);
  const setTourActive = useAppStore((s) => s.setTourActive);
  const setSavesOpen = useAppStore((s) => s.setSavesOpen);
  const [foot, setFoot] = useState<'settings' | 'leaderboard' | 'credits' | undefined>(undefined);
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [, force] = useState(0);
  if (!menuOpen) return null;
  const hasSave = localStorageStore.load() !== undefined;
  const slotCount = listSlots().length;
  const audio = getAudioSettings();
  const done = completedMissions();

  // sandbox: continue a save (fresh=false) or start a clean new game
  // (fresh=true). The London tutorial step strip is RETIRED — the campaign
  // IS the tutorial now, so a sandbox new game opens clean (story + goal
  // ladder only). 'tutorial' on the menu launches campaign mission 1.
  const begin = (fresh: boolean): void => {
    startMusic();
    if (fresh) {
      newGameCommand();
      sessionStorage.setItem('ec-story-pending', '1');
    }
    setTutorialStep(undefined);
    setMenuOpen(false);
  };

  const beginMission = (id: string): void => {
    startMusic();
    sessionStorage.removeItem(STORY_KEY); // missions never letterbox
    startMission(id);
    setTutorialStep(0);
    setMenuOpen(false);
  };

  // "tour the controls": open a sandbox (continue a save, else a fresh
  // game) so the full HUD is mounted, then run the coach-mark spotlight.
  const setTour = (_on: boolean): void => {
    sessionStorage.removeItem(STORY_KEY); // the tour wants the HUD, not the letterbox
    begin(!hasSave);
    setTourActive(true);
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `${theme.night}b8`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          width: 'min(440px, 94vw)',
          borderRadius: 22,
          padding: '28px 28px 16px',
          textAlign: 'center',
          background: 'rgba(13, 17, 36, 0.88)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: '1px solid rgba(125, 135, 180, 0.28)',
          boxShadow: '0 24px 90px rgba(0, 0, 0, 0.6)',
          color: theme.offWhite,
          fontFamily: theme.font,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <LogoLockup height={92} />
        </div>
        <div style={{ color: theme.slate, marginTop: 8, fontSize: 12.5 }}>
          power a stylized London — keep the lights on, the bills down, the carbon low
        </div>
        {!ready && <div style={{ color: theme.gold, marginTop: 18 }}>starting the grid…</div>}
        {ready && (
          <>
            {hasSave && (
              <button style={bigBtn(true)} onClick={() => begin(false)}>
                continue
              </button>
            )}
            <button style={bigBtn(!hasSave)} onClick={() => begin(true)}>
              <span style={{ color: hasSave ? theme.orange : undefined }}>⚡ </span>new game
            </button>
            <button style={bigBtn(false)} onClick={() => beginMission(MISSIONS[0]?.id ?? 'm1-first-light')}>
              <span style={{ color: theme.orange }}>📖 </span>tutorial
            </button>
            <button style={bigBtn(false)} onClick={() => setTour(true)}>
              <span style={{ color: theme.orange }}>🧭 </span>tour the controls
            </button>
            <button style={bigBtn(false)} onClick={() => setSavesOpen(true)}>
              <span style={{ color: theme.orange }}>💾 </span>save slots
              {slotCount > 0 && (
                <span style={{ color: theme.slate, fontWeight: 400 }}> · {slotCount}</span>
              )}
            </button>
            <button style={bigBtn(false)} onClick={() => setCampaignOpen(!campaignOpen)}>
              <span style={{ color: theme.orange }}>🎓 </span>campaign
              <span style={{ color: theme.slate, fontWeight: 400 }}>
                {' '}
                · {[...done].filter((id) => MISSIONS.some((m) => m.id === id)).length}/
                {MISSIONS.length}
              </span>
            </button>
            {campaignOpen && (
              <div style={{ width: 320, margin: '8px auto 0', textAlign: 'left' }}>
                <div
                  style={{
                    color: theme.slate,
                    fontSize: 10.5,
                    letterSpacing: '0.14em',
                    margin: '2px 0 6px',
                  }}
                >
                  LEARN THE GRID, ONE TINY MAP AT A TIME
                </div>
                {MISSIONS.map((m, ix) => {
                  const completed = done.has(m.id);
                  const prev = ix > 0 ? MISSIONS[ix - 1] : undefined;
                  const locked = prev !== undefined && !done.has(prev.id);
                  return (
                    <button
                      key={m.id}
                      disabled={locked}
                      onClick={() => beginMission(m.id)}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        margin: '4px 0',
                        padding: '8px 12px',
                        borderRadius: 10,
                        border: `1px solid ${completed ? 'rgba(123,196,127,0.4)' : 'rgba(125,135,180,0.3)'}`,
                        background: locked ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)',
                        color: locked ? theme.slate : theme.offWhite,
                        opacity: locked ? 0.55 : 1,
                        fontFamily: theme.font,
                        fontSize: 12.5,
                        cursor: locked ? 'default' : 'pointer',
                      }}
                    >
                      <span style={{ color: completed ? theme.ok : theme.orange }}>
                        {completed ? '✓' : locked ? '🔒' : `${ix + 1}.`}
                      </span>{' '}
                      <b>{m.name}</b>
                      <div style={{ color: theme.slate, fontSize: 11, marginTop: 2 }}>
                        {locked ? `complete “${prev?.name}” to unlock` : m.tagline}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0 4px' }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(125,135,180,0.25)' }} />
          <span style={{ color: theme.orange, fontSize: 10, letterSpacing: '0.22em' }}>
            NETWORK ACCESS
          </span>
          <div style={{ flex: 1, height: 1, background: 'rgba(125,135,180,0.25)' }} />
        </div>
        <div style={{ color: theme.slate, fontSize: 11.5 }}>
          you are the network operator — generation, wires, vans and all
        </div>
        <AccountPanel showBoard={foot === 'leaderboard'} />

        {foot === 'settings' && (
          <div style={{ marginTop: 10, fontSize: 12 }}>
            {(['musicOn', 'sfxOn'] as const).map((k) => (
              <button
                key={k}
                style={{
                  ...footBtn,
                  color: audio[k] ? theme.gold : theme.slate,
                  border: `1px solid ${theme.navyLight}`,
                  borderRadius: 6,
                  margin: '0 4px',
                }}
                onClick={() => {
                  pushSettings(updateAudioSettings({ [k]: !audio[k] }));
                  force((n) => n + 1);
                }}
              >
                {k === 'musicOn' ? 'music' : 'sfx'} {audio[k] ? 'on' : 'off'}
              </button>
            ))}
          </div>
        )}
        {foot === 'credits' && (
          <div style={{ marginTop: 10, fontSize: 11, color: theme.slate }}>
            built with care by Jamie + Claude · all art is code · no city was harmed
          </div>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 16,
            paddingTop: 12,
            borderTop: '1px solid rgba(125,135,180,0.18)',
          }}
        >
          <button
            style={{ ...footBtn, color: foot === 'settings' ? theme.gold : theme.slate }}
            onClick={() => setFoot(foot === 'settings' ? undefined : 'settings')}
          >
            ⚙ settings
          </button>
          <button
            style={{ ...footBtn, color: foot === 'leaderboard' ? theme.gold : theme.slate }}
            onClick={() => setFoot(foot === 'leaderboard' ? undefined : 'leaderboard')}
          >
            🏆 leaderboard
          </button>
          <button
            style={{ ...footBtn, color: foot === 'credits' ? theme.gold : theme.slate }}
            onClick={() => setFoot(foot === 'credits' ? undefined : 'credits')}
          >
            ⓘ credits
          </button>
        </div>
      </div>
    </div>
  );
}
