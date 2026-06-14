// The landing page for auth email links (password reset, email confirm,
// magic link). Supabase redirects the email link back to the app origin
// with the token in the URL hash (#…type=recovery / signup / magiclink) or
// an ?error=… — without this the link would just drop you on the game (or a
// 404 in dev), with no feedback. This catches that redirect and shows a
// styled page: a "set a new password" form for recovery, a success/welcome
// for a confirm/magic link, and a friendly "link expired" on error.

import { useEffect, useState } from 'react';
import { supabase } from '../online/supabase';
import { updatePassword } from '../online/auth';
import { theme } from './theme';

// Capture the redirect params at module load — Supabase's detectSessionInUrl
// strips the hash once it has processed it, so read it before that happens.
const HASH = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : '';
const SEARCH = typeof window !== 'undefined' ? window.location.search.replace(/^\?/, '') : '';

type Kind = 'recovery' | 'confirmed' | 'error' | 'none';

function parseKind(): { kind: Kind; errorText?: string } {
  const p = new URLSearchParams(HASH);
  const q = new URLSearchParams(SEARCH);
  const err = p.get('error_description') ?? q.get('error_description') ?? p.get('error') ?? q.get('error');
  if (err) return { kind: 'error', errorText: err.replace(/\+/g, ' ') };
  const type = p.get('type') ?? q.get('type');
  if (type === 'recovery') return { kind: 'recovery' };
  if (type === 'signup' || type === 'magiclink' || type === 'email_change') return { kind: 'confirmed' };
  // PKCE confirm / magic link arrive as ?code=… with no explicit type
  if ((q.get('code') || p.get('access_token')) && type === null) return { kind: 'confirmed' };
  return { kind: 'none' };
}

const overlay: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 60,
  background: `${theme.night}f2`,
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  overflowY: 'auto',
  padding: 16,
  fontFamily: theme.font,
};
const card: React.CSSProperties = {
  width: 'min(420px, 94vw)',
  margin: 'auto',
  borderRadius: 18,
  padding: '26px 26px 20px',
  textAlign: 'center',
  background: 'rgba(13, 17, 36, 0.94)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  border: `1px solid ${theme.orange}`,
  boxShadow: '0 24px 90px rgba(0,0,0,0.6)',
  color: theme.offWhite,
};
const input: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  margin: '8px 0 0',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid rgba(125,135,180,0.3)',
  background: 'rgba(8,11,26,0.7)',
  color: theme.offWhite,
  fontFamily: theme.font,
  fontSize: 14,
  outline: 'none',
};
const primaryBtn: React.CSSProperties = {
  width: '100%',
  margin: '12px 0 0',
  padding: '11px 0',
  borderRadius: 10,
  border: 'none',
  background: 'linear-gradient(180deg, #ffa238 0%, #ff8a1e 55%, #ef7714 100%)',
  color: '#241c38',
  fontFamily: theme.font,
  fontSize: 14,
  fontWeight: 800,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  cursor: 'pointer',
};
const ghostBtn: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: theme.slate,
  fontFamily: theme.font,
  fontSize: 12,
  letterSpacing: '0.08em',
  cursor: 'pointer',
  marginTop: 12,
};

export function AuthCallback() {
  const [{ kind, errorText }, setState] = useState(() => parseKind());
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | undefined>(undefined);
  const [dismissed, setDismissed] = useState(false);

  // belt + braces: Supabase fires PASSWORD_RECOVERY on the recovery link even
  // if the hash parse missed it (e.g. PKCE), so listen and switch to the form.
  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    const { data } = sb.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setState({ kind: 'recovery' });
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (dismissed || kind === 'none') return null;

  const submit = async (): Promise<void> => {
    if (password.length < 6) {
      setErr('use at least 6 characters');
      return;
    }
    setBusy(true);
    setErr(undefined);
    const e = await updatePassword(password);
    setBusy(false);
    if (e) setErr(e);
    else setDone(true);
  };

  return (
    <div style={overlay}>
      <div style={card}>
        <div style={{ fontSize: 26 }}>⚡</div>
        {kind === 'recovery' && !done && (
          <>
            <div style={{ fontSize: 18, fontWeight: 800, marginTop: 6 }}>Set a new password</div>
            <div style={{ color: theme.slate, fontSize: 12.5, marginTop: 6 }}>
              You followed a reset link — choose a new password to get back in.
            </div>
            <input
              type="password"
              placeholder="new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void submit()}
              style={input}
            />
            {err && <div style={{ color: theme.danger, fontSize: 12, marginTop: 8 }}>{err}</div>}
            <button style={primaryBtn} disabled={busy} onClick={() => void submit()}>
              {busy ? 'saving…' : 'save password'}
            </button>
          </>
        )}
        {kind === 'recovery' && done && (
          <>
            <div style={{ fontSize: 18, fontWeight: 800, marginTop: 6, color: theme.ok }}>
              Password updated
            </div>
            <div style={{ color: theme.slate, fontSize: 12.5, marginTop: 6 }}>
              You're signed in. Your rank and saves will sync.
            </div>
            <button style={primaryBtn} onClick={() => setDismissed(true)}>
              ⚡ to the grid
            </button>
          </>
        )}
        {kind === 'confirmed' && (
          <>
            <div style={{ fontSize: 18, fontWeight: 800, marginTop: 6, color: theme.ok }}>
              You're signed in
            </div>
            <div style={{ color: theme.slate, fontSize: 12.5, marginTop: 6 }}>
              Email confirmed — your rank, saves and the leaderboard now sync across devices.
            </div>
            <button style={primaryBtn} onClick={() => setDismissed(true)}>
              ⚡ to the grid
            </button>
          </>
        )}
        {kind === 'error' && (
          <>
            <div style={{ fontSize: 18, fontWeight: 800, marginTop: 6, color: theme.danger }}>
              This link has expired
            </div>
            <div style={{ color: theme.slate, fontSize: 12.5, marginTop: 6, lineHeight: 1.5 }}>
              {errorText ?? 'The email link is no longer valid.'} Head to the start menu and request
              a fresh one.
            </div>
            <button style={primaryBtn} onClick={() => setDismissed(true)}>
              back to the start menu
            </button>
          </>
        )}
        <button style={ghostBtn} onClick={() => setDismissed(true)}>
          dismiss
        </button>
      </div>
    </div>
  );
}
