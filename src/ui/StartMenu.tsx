// The front door: continue a saved campaign, start fresh, or take the
// tutorial — styled as the glassy night-screen with the glowing CONTINUE.
// First click is also our user gesture for starting the audio.

import { useEffect, useState } from 'react';
import { useAppStore } from '../app/store';
import { newGameCommand } from '../app/workerBridge';
import { currentUser } from '../online/auth';
import { startMusic } from '../audio/audio';
import { localStorageStore } from '../persistence/localStorageStore';
import { listSlots } from '../persistence/slotStore';
import { AccountPanel } from './AccountPanel';
import { CityPicker } from './CityPicker';
import { LessonsPage } from './LessonsPage';
import { RankBadge } from './RankPanel';
import { SettingsPanel } from './SettingsPanel';
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
  const setLessonsOpen = useAppStore((s) => s.setLessonsOpen);
  const [foot, setFoot] = useState<'leaderboard' | 'credits' | undefined>(undefined);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pickingCity, setPickingCity] = useState(false);
  // guest vs signed-in: drives the gentle "sign in to keep your rank" nudge
  // under the rank badge (signed-in players don't see it). undefined while
  // the session check is in flight, so nothing flashes.
  const [signedIn, setSignedIn] = useState<boolean | undefined>(undefined);
  useEffect(() => {
    let live = true;
    void currentUser().then((u) => {
      if (live) setSignedIn(!!u);
    });
    return () => {
      live = false;
    };
  }, [menuOpen]);
  if (!menuOpen) return null;
  const hasSave = localStorageStore.load() !== undefined;
  const slotCount = listSlots().length;

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

  // a chosen city from the picker: start a fresh game on that scenario. The
  // worker rebuilds its map from the id and MapView re-inits the renderer on
  // it; the story letterbox plays as for any fresh start.
  const beginCity = (scenarioId: string): void => {
    startMusic();
    newGameCommand(scenarioId);
    sessionStorage.setItem('ec-story-pending', '1');
    setTutorialStep(undefined);
    setPickingCity(false);
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
        <img
          src="/logotype.png"
          alt="ElectriCity"
          style={{ display: 'block', width: 380, maxWidth: '100%', margin: '0 auto' }}
        />
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
            <button style={bigBtn(!hasSave)} onClick={() => setPickingCity(true)}>
              <span style={{ color: hasSave ? theme.orange : undefined }}>⚡ </span>new game
            </button>
            <button style={bigBtn(false)} onClick={() => setLessonsOpen(true)}>
              <span style={{ color: theme.orange }}>📖 </span>tutorials
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
        <RankBadge />
        {signedIn === false && (
          <div style={{ color: theme.orangeSoft, fontSize: 11, marginTop: 6, lineHeight: 1.4 }}>
            playing as a guest — sign in below to keep your rank &amp; unlock cities across devices
          </div>
        )}
        <AccountPanel showBoard={foot === 'leaderboard'} />

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
            style={{ ...footBtn, color: settingsOpen ? theme.gold : theme.slate }}
            onClick={() => setSettingsOpen(true)}
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
      <LessonsPage />
      {pickingCity && (
        <CityPicker onPick={beginCity} onClose={() => setPickingCity(false)} />
      )}
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
