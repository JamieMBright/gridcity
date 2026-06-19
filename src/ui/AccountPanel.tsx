// Email + password sign-in is the primary flow (sign in / create account /
// forgot-password), with the one-time-code / magic-link path kept as a
// fallback. Plus the global leaderboard. Lives inside the start menu, and
// reflows to a single readable column on desktop and phone-landscape.

import { useEffect, useState } from 'react';
import { getAudioSettings, updateAudioSettings } from '../audio/audio';
import {
  CONFIRM_EMAIL,
  currentUser,
  ensureUsername,
  requestCode,
  resetPassword,
  signInWithPassword,
  signUpWithPassword,
  verifyCode,
  type OnlineUser,
} from '../online/auth';
import { fetchLeaderboard, pullSettings, pushSettings, syncRank, type LeaderboardRow } from '../online/cloud';
import { theme } from './theme';

// width:auto + maxWidth keeps the card readable on desktop yet able to
// shrink into a phone-landscape start menu instead of overflowing 320px.
const fieldWrap: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  maxWidth: 320,
  margin: '8px auto 0',
  padding: '8px 12px',
  borderRadius: 10,
  border: '1px solid rgba(125, 135, 180, 0.3)',
  background: 'rgba(8, 11, 26, 0.7)',
  boxSizing: 'border-box',
};

const field: React.CSSProperties = {
  flex: 1,
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: theme.offWhite,
  fontFamily: theme.font,
  fontSize: 13,
};

const smallBtn: React.CSSProperties = {
  display: 'block',
  width: '100%',
  maxWidth: 320,
  margin: '10px auto 0',
  padding: '9px 0',
  borderRadius: 10,
  border: `1px solid ${theme.orange}`,
  background: 'rgba(255, 138, 30, 0.06)',
  color: theme.orange,
  fontFamily: theme.font,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  boxSizing: 'border-box',
};

// The card constrains everything to a single tidy column; on phone-
// landscape it simply fills the start-menu width (maxWidth caps desktop).
const card: React.CSSProperties = {
  width: '100%',
  maxWidth: 320,
  margin: '0 auto',
};

// Sign in / Create account TAB filter — a segmented control, NOT a button
// (owner, 2026-06-15: the old tabs highlighted the SAME orange as the "sign
// in" ACTION button, which was confusing). The whole row is a recessed dark
// track; the ACTIVE tab is a solid PALE infill pill (slate-tinted, never
// orange) so it reads as a filter selector distinct from the orange gradient
// CTA below it.
const toggleRow: React.CSSProperties = {
  display: 'flex',
  gap: 4,
  width: '100%',
  maxWidth: 320,
  margin: '0 auto 8px',
  padding: 4,
  borderRadius: 10,
  background: 'rgba(8, 11, 26, 0.6)',
  border: '1px solid rgba(125, 135, 180, 0.22)',
  boxSizing: 'border-box',
};

const toggleBtn = (active: boolean): React.CSSProperties => ({
  flex: 1,
  padding: '7px 0',
  borderRadius: 7,
  border: 'none',
  // active = solid pale infill (raised pill); inactive = transparent on the track
  background: active ? 'rgba(210, 217, 236, 0.92)' : 'transparent',
  color: active ? theme.navy : theme.slate,
  boxShadow: active ? '0 1px 4px rgba(0,0,0,0.35)' : 'none',
  fontFamily: theme.font,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  transition: 'background 0.12s ease, color 0.12s ease',
});

// Subtle inline text link (forgot password, fallback toggle).
const linkBtn: React.CSSProperties = {
  display: 'inline',
  border: 'none',
  background: 'none',
  padding: 0,
  color: theme.slate,
  fontFamily: theme.font,
  fontSize: 11,
  textDecoration: 'underline',
  cursor: 'pointer',
};

export function AccountPanel({ showBoard = true }: { showBoard?: boolean } = {}) {
  const [user, setUser] = useState<OnlineUser | undefined>(undefined);
  const [checked, setChecked] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  // mode: which auth flow the signed-out card shows.
  const [mode, setMode] = useState<'signin' | 'signup' | 'otp'>('signin');
  // phase: 'idle' editing, 'busy' awaiting Supabase, 'codeSent' OTP step.
  const [phase, setPhase] = useState<'idle' | 'codeSent' | 'busy'>('idle');
  const [error, setError] = useState<string | undefined>(undefined);
  const [notice, setNotice] = useState<string | undefined>(undefined);
  const [board, setBoard] = useState<LeaderboardRow[]>([]);

  useEffect(() => {
    void currentUser().then((u) => {
      setUser(u);
      setChecked(true);
      if (u) {
        void pullSettings().then((s) => s && updateAudioSettings(s));
      }
    });
    void fetchLeaderboard(8).then(setBoard);
  }, []);

  // Race an auth call against a timeout so a hung/unreachable backend surfaces
  // feedback instead of leaving the form stuck on "busy" forever (owner,
  // 2026-06-18: "no negative feedback on an unrecognised sign-in attempt").
  const withTimeout = <T,>(p: Promise<T>, ms = 12000): Promise<T> =>
    Promise.race([
      p,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
    ]);

  // Shared: finish a successful auth — claim username if given, hydrate
  // the signed-in state, sync settings.
  const completeSignIn = async (claimName: boolean): Promise<void> => {
    if (claimName && username.trim().length >= 3) {
      const nameErr = await ensureUsername(username.trim());
      if (nameErr) setError(nameErr);
    }
    const u = await currentUser();
    setUser(u);
    setPhase('idle');
    if (u) {
      pushSettings(getAudioSettings());
      // reconcile this device's operator rank with the cloud on sign-in
      void syncRank();
    } else {
      // auth returned no error but no session materialised — never leave the
      // player staring at a form that did nothing
      setError((e) => e ?? 'that didn’t sign you in — check your details and try again');
    }
  };

  const doSignIn = async (): Promise<void> => {
    setPhase('busy');
    setError(undefined);
    setNotice(undefined);
    try {
      const err = await withTimeout(signInWithPassword(email, password));
      if (err) {
        setError(err);
        setPhase('idle');
        return;
      }
      await completeSignIn(false);
    } catch {
      setError('couldn’t reach the server — check your connection and try again');
      setPhase('idle');
    }
  };

  const doSignUp = async (): Promise<void> => {
    setPhase('busy');
    setError(undefined);
    setNotice(undefined);
    try {
      const err = await withTimeout(signUpWithPassword(email, password, username.trim()));
      if (err === CONFIRM_EMAIL) {
        setNotice(`account created — check ${email} to confirm, then sign in`);
        setMode('signin');
        setPhase('idle');
        return;
      }
      if (err) {
        setError(err);
        setPhase('idle');
        return;
      }
      await completeSignIn(true);
    } catch {
      setError('couldn’t reach the server — check your connection and try again');
      setPhase('idle');
    }
  };

  const doReset = async (): Promise<void> => {
    setError(undefined);
    setNotice(undefined);
    if (!email.includes('@')) {
      setError('enter your email first, then tap forgot password');
      return;
    }
    try {
      const err = await withTimeout(resetPassword(email));
      if (err) setError(err);
      else setNotice(`reset link sent — check ${email}`);
    } catch {
      setError('couldn’t reach the server — check your connection and try again');
    }
  };

  const sendCode = async (): Promise<void> => {
    setPhase('busy');
    setError(undefined);
    setNotice(undefined);
    try {
      const err = await withTimeout(requestCode(email));
      if (err) {
        setError(err);
        setPhase('idle');
      } else {
        setPhase('codeSent');
      }
    } catch {
      setError('couldn’t reach the server — check your connection and try again');
      setPhase('idle');
    }
  };

  const confirm = async (): Promise<void> => {
    setPhase('busy');
    setError(undefined);
    try {
      const err = await withTimeout(verifyCode(email, code));
      if (err) {
        setError(err);
        setPhase('codeSent');
        return;
      }
      await completeSignIn(true);
    } catch {
      setError('couldn’t reach the server — check your connection and try again');
      setPhase('codeSent');
    }
  };

  const switchMode = (m: 'signin' | 'signup' | 'otp'): void => {
    setMode(m);
    setPhase('idle');
    setError(undefined);
    setNotice(undefined);
  };

  // Enable gates — shared between the action button's `disabled` and the
  // Enter-to-submit handler, so Enter can never fire a submission the button
  // itself wouldn't accept (owner: "ENTER triggers the sign-in button").
  const canSignIn = phase !== 'busy' && email.includes('@') && password.length >= 1;
  const canSignUp =
    phase !== 'busy' && email.includes('@') && password.length >= 6 && username.trim().length >= 3;
  const canSendCode = phase !== 'busy' && email.includes('@');

  // Pressing Enter in any field submits the active flow (gated as the button).
  const onEnter = (e: React.KeyboardEvent): void => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (mode === 'signin') {
      if (canSignIn) void doSignIn();
    } else if (mode === 'signup') {
      if (canSignUp) void doSignUp();
    } else if (mode === 'otp') {
      if (phase === 'codeSent') void confirm();
      else if (canSendCode) void sendCode();
    }
  };

  return (
    <div style={{ marginTop: 6 }}>
      {!checked ? null : user ? (
        <div style={{ fontSize: 12, textAlign: 'center', lineHeight: 1.5 }}>
          <div style={{ color: theme.ok }}>
            ⚡ signed in as {user.username ?? user.email}
          </div>
          <div style={{ color: theme.slate, fontSize: 11 }}>
            saves sync to the cloud · sign out &amp; change password in ⚙ settings
          </div>
        </div>
      ) : mode === 'otp' && phase === 'codeSent' ? (
        <div style={card}>
          <div style={{ color: theme.slate, fontSize: 12 }}>
            check {email} — enter the 6-digit code (or click the link)
          </div>
          <div style={fieldWrap}>
            <span aria-hidden style={{ color: theme.slate }}>▦</span>
            <input
              style={field}
              placeholder="123456"
              value={code}
              inputMode="numeric"
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={onEnter}
              aria-label="one-time code"
            />
          </div>
          <button style={smallBtn} onClick={() => void confirm()}>
            verify
          </button>
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <button style={linkBtn} onClick={() => switchMode('signin')}>
              use email + password instead
            </button>
          </div>
        </div>
      ) : mode === 'otp' ? (
        <div style={card}>
          <div style={{ color: theme.slate, fontSize: 12 }}>
            we'll email you a one-time code (or magic link) — no password needed
          </div>
          <div style={fieldWrap}>
            <span aria-hidden style={{ color: theme.slate }}>✉</span>
            <input
              style={field}
              placeholder="email"
              value={email}
              type="email"
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={onEnter}
              aria-label="email"
            />
          </div>
          <div style={fieldWrap}>
            <span aria-hidden style={{ color: theme.slate }}>👤</span>
            <input
              style={field}
              placeholder="username (public)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={onEnter}
              aria-label="username"
            />
          </div>
          <button style={smallBtn} disabled={!canSendCode} onClick={() => void sendCode()}>
            {phase === 'busy' ? 'sending…' : 'email me a code'}
          </button>
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <button style={linkBtn} onClick={() => switchMode('signin')}>
              use email + password instead
            </button>
          </div>
        </div>
      ) : (
        <div style={card}>
          <div style={toggleRow}>
            <button style={toggleBtn(mode === 'signin')} onClick={() => switchMode('signin')}>
              sign in
            </button>
            <button style={toggleBtn(mode === 'signup')} onClick={() => switchMode('signup')}>
              create account
            </button>
          </div>
          <div style={{ color: theme.slate, fontSize: 12 }}>
            sign in to sync saves and join the leaderboard
          </div>
          <div style={fieldWrap}>
            <span aria-hidden style={{ color: theme.slate }}>✉</span>
            <input
              style={field}
              placeholder="email"
              value={email}
              type="email"
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={onEnter}
              aria-label="email"
            />
          </div>
          {mode === 'signup' && (
            <div style={fieldWrap}>
              <span aria-hidden style={{ color: theme.slate }}>👤</span>
              <input
                style={field}
                placeholder="username (public)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={onEnter}
                aria-label="username"
              />
            </div>
          )}
          <div style={fieldWrap}>
            <span aria-hidden style={{ color: theme.slate }}>🔒</span>
            <input
              style={field}
              placeholder="password"
              value={password}
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={onEnter}
              aria-label="password"
            />
          </div>
          {mode === 'signin' ? (
            <button
              style={smallBtn}
              aria-label="submit sign in"
              disabled={!canSignIn}
              onClick={() => void doSignIn()}
            >
              {phase === 'busy' ? 'signing in…' : 'sign in'}
            </button>
          ) : (
            <button
              style={smallBtn}
              aria-label="submit create account"
              disabled={!canSignUp}
              onClick={() => void doSignUp()}
            >
              {phase === 'busy' ? 'creating…' : 'create account'}
            </button>
          )}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 8,
              maxWidth: 320,
              margin: '8px auto 0',
            }}
          >
            {mode === 'signin' ? (
              <button style={linkBtn} onClick={() => void doReset()}>
                forgot password?
              </button>
            ) : (
              <span />
            )}
            <button style={linkBtn} onClick={() => switchMode('otp')}>
              use a one-time code instead
            </button>
          </div>
        </div>
      )}
      {notice && <div style={{ color: theme.ok, fontSize: 12, marginTop: 6, maxWidth: 320, marginInline: 'auto' }}>{notice}</div>}
      {error && <div style={{ color: theme.danger, fontSize: 12, marginTop: 6, maxWidth: 320, marginInline: 'auto' }}>{error}</div>}

      {showBoard && board.length > 0 && (
        <div style={{ marginTop: 14, fontSize: 12, textAlign: 'left' }}>
          <div style={{ color: theme.slate, fontSize: 10, letterSpacing: '0.12em' }}>
            BEST OPERATORS
          </div>
          {board.map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', lineHeight: 1.7 }}>
              <span>
                <span style={{ color: theme.slate }}>{i + 1}.</span> {r.username}
              </span>
              <span style={{ color: r.composite >= 55 ? theme.ok : theme.warn }}>
                {r.grade} · {r.composite}/100
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
