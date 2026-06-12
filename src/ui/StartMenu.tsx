// The front door: continue a saved campaign, start fresh, or take the
// tutorial — styled as the glassy night-screen with the glowing CONTINUE.
// First click is also our user gesture for starting the audio.

import { useState } from 'react';
import { useAppStore } from '../app/store';
import { newGameCommand } from '../app/workerBridge';
import { getAudioSettings, startMusic, updateAudioSettings } from '../audio/audio';
import { pushSettings } from '../online/cloud';
import { localStorageStore } from '../persistence/localStorageStore';
import { AccountPanel } from './AccountPanel';
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
  const [foot, setFoot] = useState<'settings' | 'leaderboard' | 'credits' | undefined>(undefined);
  const [, force] = useState(0);
  if (!menuOpen) return null;
  const hasSave = localStorageStore.load() !== undefined;
  const audio = getAudioSettings();

  const begin = (tutorial: boolean, fresh: boolean): void => {
    startMusic();
    if (fresh) newGameCommand();
    setTutorialStep(tutorial ? 0 : undefined);
    setMenuOpen(false);
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
        <img src="/logo.svg" alt="" width={56} height={56} style={{ borderRadius: 13 }} />
        <img
          src="/logotype.svg"
          alt="ElectriCity"
          style={{ display: 'block', width: 360, maxWidth: '100%', margin: '6px auto 0' }}
        />
        <div style={{ color: theme.slate, marginTop: 8, fontSize: 12.5 }}>
          power a stylized London — keep the lights on, the bills down, the carbon low
        </div>
        {!ready && <div style={{ color: theme.gold, marginTop: 18 }}>starting the grid…</div>}
        {ready && (
          <>
            {hasSave && (
              <button style={bigBtn(true)} onClick={() => begin(false, false)}>
                continue
              </button>
            )}
            <button style={bigBtn(!hasSave)} onClick={() => begin(false, true)}>
              <span style={{ color: hasSave ? theme.orange : undefined }}>⚡ </span>new game
            </button>
            <button style={bigBtn(false)} onClick={() => begin(true, true)}>
              <span style={{ color: theme.orange }}>📖 </span>tutorial
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
