// Settings — its OWN centred popup (owner, 2026-06-15: "settings menu:
// sign-out is off-centre; add CHANGE PASSWORD; consider making Settings its
// own popup (cleaner?)"). Holds the audio toggles, the colour-blind picker, a
// CENTRED signed-in row with sign-out, and — for signed-in players — an inline
// CHANGE PASSWORD form (current / new / confirm). Opened from the start-menu
// footer's ⚙ settings button. Same lofi dusk glass as the rest of the chrome;
// reflows to a single readable column on desktop AND phone-landscape.

import { useEffect, useState } from 'react';
import { getAudioSettings, updateAudioSettings } from '../audio/audio';
import { changePassword, currentUser, signOut, type OnlineUser } from '../online/auth';
import { pushSettings } from '../online/cloud';
import { ColourBlindSetting } from './ColourBlindSetting';
import { theme } from './theme';

const overlay: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 14,
  background: `${theme.night}cc`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflowY: 'auto',
  padding: 16,
  fontFamily: theme.font,
};

const card: React.CSSProperties = {
  width: 'min(380px, 94vw)',
  maxHeight: '92vh',
  overflowY: 'auto',
  margin: 'auto',
  borderRadius: 18,
  padding: '22px 22px 18px',
  textAlign: 'center',
  background:
    'linear-gradient(168deg, rgba(18,24,52,0.95) 0%, rgba(16,22,48,0.96) 55%, rgba(34,25,58,0.95) 100%)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(245, 196, 105, 0.22)',
  boxShadow: '0 24px 90px rgba(0,0,0,0.6)',
  color: theme.offWhite,
};

const heading: React.CSSProperties = {
  color: theme.gold,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
};

const toggle = (on: boolean): React.CSSProperties => ({
  padding: '6px 14px',
  borderRadius: 8,
  border: `1px solid ${on ? theme.orange : theme.navyLight}`,
  background: on ? 'rgba(255,138,30,0.12)' : 'transparent',
  color: on ? theme.gold : theme.slate,
  fontFamily: theme.font,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.04em',
  cursor: 'pointer',
});

const pwField: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  margin: '8px 0 0',
  padding: '9px 12px',
  borderRadius: 10,
  border: '1px solid rgba(125,135,180,0.3)',
  background: 'rgba(8,11,26,0.7)',
  color: theme.offWhite,
  fontFamily: theme.font,
  fontSize: 13,
  outline: 'none',
};

const primaryBtn: React.CSSProperties = {
  width: '100%',
  margin: '12px 0 0',
  padding: '10px 0',
  borderRadius: 10,
  border: 'none',
  background: 'linear-gradient(180deg, #ffa238 0%, #ff8a1e 55%, #ef7714 100%)',
  color: '#241c38',
  fontFamily: theme.font,
  fontSize: 13,
  fontWeight: 800,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  cursor: 'pointer',
};

// neutral outline button (sign out / change-password discloser / close)
const outlineBtn: React.CSSProperties = {
  margin: '10px auto 0',
  padding: '8px 18px',
  borderRadius: 10,
  border: `1px solid ${theme.navyLight}`,
  background: 'transparent',
  color: theme.slate,
  fontFamily: theme.font,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.04em',
  cursor: 'pointer',
};

const divider: React.CSSProperties = {
  height: 1,
  background: 'rgba(125,135,180,0.18)',
  margin: '16px 0 12px',
};

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [user, setUser] = useState<OnlineUser | undefined>(undefined);
  const [checked, setChecked] = useState(false);
  const [, force] = useState(0);
  // change-password sub-form
  const [showPw, setShowPw] = useState(false);
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwErr, setPwErr] = useState<string | undefined>(undefined);
  const [pwOk, setPwOk] = useState(false);
  // sign-out state — so a failed sign-out shows feedback instead of silently
  // leaving the player signed in (owner bug: "sign out failed, kept me in").
  const [signOutBusy, setSignOutBusy] = useState(false);
  const [signOutErr, setSignOutErr] = useState<string | undefined>(undefined);

  useEffect(() => {
    void currentUser().then((u) => {
      setUser(u);
      setChecked(true);
    });
  }, []);

  const audio = getAudioSettings();

  // Sign out, then drop the signed-in view. signOut() now clears the LOCAL
  // session even if the server revoke fails, so we always return to the guest
  // state; an error message is surfaced only as a heads-up. Awaited (not a
  // bare .then) so a thrown rejection can't skip the state clear.
  const doSignOut = async (): Promise<void> => {
    setSignOutErr(undefined);
    setSignOutBusy(true);
    const err = await signOut();
    setSignOutBusy(false);
    setUser(undefined); // local session is gone regardless — show signed-out
    if (err) setSignOutErr(err);
  };

  const doChangePassword = async (): Promise<void> => {
    setPwErr(undefined);
    setPwOk(false);
    if (next.length < 6) {
      setPwErr('new password must be at least 6 characters');
      return;
    }
    if (next !== confirm) {
      setPwErr('the new passwords do not match');
      return;
    }
    setPwBusy(true);
    const err = await changePassword(cur, next);
    setPwBusy(false);
    if (err) {
      setPwErr(err);
      return;
    }
    setPwOk(true);
    setCur('');
    setNext('');
    setConfirm('');
    setShowPw(false);
  };

  return (
    <div style={overlay} onClick={onClose} role="dialog" aria-label="settings">
      <div style={card} onClick={(e) => e.stopPropagation()}>
        <div style={heading}>Settings</div>

        {/* audio */}
        <div style={{ marginTop: 14 }}>
          <div style={{ ...heading, fontSize: 10, color: theme.slate }}>Sound</div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8 }}>
            {(['musicOn', 'sfxOn'] as const).map((k) => (
              <button
                key={k}
                style={toggle(audio[k])}
                onClick={() => {
                  pushSettings(updateAudioSettings({ [k]: !audio[k] }));
                  force((n) => n + 1);
                }}
              >
                {k === 'musicOn' ? 'music' : 'sfx'} {audio[k] ? 'on' : 'off'}
              </button>
            ))}
          </div>
        </div>

        {/* accessibility */}
        <ColourBlindSetting />

        <div style={divider} />

        {/* account: centred signed-in row + sign-out, or a guest note */}
        {!checked ? (
          <div style={{ color: theme.slate, fontSize: 12 }}>…</div>
        ) : user ? (
          <>
            <div style={{ color: theme.ok, fontSize: 12.5, lineHeight: 1.4 }}>
              ⚡ signed in as {user.username ?? user.email}
            </div>
            {!showPw ? (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
                <button style={outlineBtn} onClick={() => setShowPw(true)}>
                  change password
                </button>
                <button
                  style={outlineBtn}
                  disabled={signOutBusy}
                  aria-label="sign out"
                  onClick={() => void doSignOut()}
                >
                  {signOutBusy ? 'signing out…' : 'sign out'}
                </button>
              </div>
            ) : (
              <div style={{ marginTop: 4, textAlign: 'left' }}>
                <div style={{ ...heading, fontSize: 10, textAlign: 'center', marginBottom: 2 }}>
                  Change password
                </div>
                <input
                  type="password"
                  style={pwField}
                  placeholder="current password"
                  value={cur}
                  autoComplete="current-password"
                  aria-label="current password"
                  onChange={(e) => setCur(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void doChangePassword()}
                />
                <input
                  type="password"
                  style={pwField}
                  placeholder="new password"
                  value={next}
                  autoComplete="new-password"
                  aria-label="new password"
                  onChange={(e) => setNext(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void doChangePassword()}
                />
                <input
                  type="password"
                  style={pwField}
                  placeholder="confirm new password"
                  value={confirm}
                  autoComplete="new-password"
                  aria-label="confirm new password"
                  onChange={(e) => setConfirm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void doChangePassword()}
                />
                {pwErr && (
                  <div style={{ color: theme.danger, fontSize: 12, marginTop: 8 }}>{pwErr}</div>
                )}
                <button
                  style={primaryBtn}
                  aria-label="submit change password"
                  disabled={pwBusy || cur.length < 1 || next.length < 6 || confirm.length < 1}
                  onClick={() => void doChangePassword()}
                >
                  {pwBusy ? 'updating…' : 'update password'}
                </button>
                <button
                  style={{ ...outlineBtn, display: 'block', width: '100%' }}
                  onClick={() => {
                    setShowPw(false);
                    setPwErr(undefined);
                  }}
                >
                  cancel
                </button>
              </div>
            )}
            {pwOk && (
              <div style={{ color: theme.ok, fontSize: 12, marginTop: 8 }}>password updated ✓</div>
            )}
          </>
        ) : (
          <div style={{ color: theme.slate, fontSize: 12, lineHeight: 1.4 }}>
            playing as a guest — sign in from the start menu to sync saves and
            change your password here.
          </div>
        )}

        {signOutErr && (
          <div style={{ color: theme.warn, fontSize: 12, marginTop: 8, lineHeight: 1.4 }}>
            signed out on this device, but the server couldn’t be reached ({signOutErr})
          </div>
        )}

        <button style={{ ...primaryBtn, marginTop: 18 }} onClick={onClose}>
          done
        </button>
      </div>
    </div>
  );
}
