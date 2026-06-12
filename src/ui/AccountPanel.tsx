// Passwordless sign-in (email + username, code or magic link each time),
// and the global leaderboard. Lives inside the start menu.

import { useEffect, useState } from 'react';
import { getAudioSettings, updateAudioSettings } from '../audio/audio';
import { currentUser, ensureUsername, requestCode, signOut, verifyCode, type OnlineUser } from '../online/auth';
import { fetchLeaderboard, pullSettings, pushSettings, type LeaderboardRow } from '../online/cloud';
import { theme } from './theme';

const fieldWrap: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: 320,
  margin: '8px auto 0',
  padding: '8px 12px',
  borderRadius: 10,
  border: '1px solid rgba(125, 135, 180, 0.3)',
  background: 'rgba(8, 11, 26, 0.7)',
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
  width: 320,
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
};

export function AccountPanel({ showBoard = true }: { showBoard?: boolean } = {}) {
  const [user, setUser] = useState<OnlineUser | undefined>(undefined);
  const [checked, setChecked] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');
  const [phase, setPhase] = useState<'idle' | 'codeSent' | 'busy'>('idle');
  const [error, setError] = useState<string | undefined>(undefined);
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

  const sendCode = async (): Promise<void> => {
    setPhase('busy');
    setError(undefined);
    const err = await requestCode(email);
    if (err) {
      setError(err);
      setPhase('idle');
    } else {
      setPhase('codeSent');
    }
  };

  const confirm = async (): Promise<void> => {
    setPhase('busy');
    setError(undefined);
    const err = await verifyCode(email, code);
    if (err) {
      setError(err);
      setPhase('codeSent');
      return;
    }
    if (username.trim().length >= 3) {
      const nameErr = await ensureUsername(username.trim());
      if (nameErr) setError(nameErr);
    }
    const u = await currentUser();
    setUser(u);
    setPhase('idle');
    if (u) pushSettings(getAudioSettings());
  };

  return (
    <div style={{ marginTop: 6 }}>
      {!checked ? null : user ? (
        <div style={{ fontSize: 12 }}>
          <span style={{ color: theme.ok }}>
            ⚡ signed in as {user.username ?? user.email} — saves sync to the cloud
          </span>
          <button
            style={{ ...smallBtn, marginLeft: 10, padding: '2px 10px', color: theme.slate, borderColor: theme.navyLight }}
            onClick={() => {
              void signOut().then(() => setUser(undefined));
            }}
          >
            sign out
          </button>
        </div>
      ) : phase === 'codeSent' ? (
        <div>
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
              aria-label="one-time code"
            />
          </div>
          <button style={smallBtn} onClick={() => void confirm()}>
            verify
          </button>
        </div>
      ) : (
        <div>
          <div style={{ color: theme.slate, fontSize: 12 }}>
            sign in to sync saves and join the leaderboard — no password, just a code
          </div>
          <div style={fieldWrap}>
            <span aria-hidden style={{ color: theme.slate }}>✉</span>
            <input
              style={field}
              placeholder="email"
              value={email}
              type="email"
              onChange={(e) => setEmail(e.target.value)}
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
              aria-label="username"
            />
          </div>
          <button
            style={smallBtn}
            disabled={phase === 'busy' || !email.includes('@')}
            onClick={() => void sendCode()}
          >
            {phase === 'busy' ? 'sending…' : 'email me a code'}
          </button>
        </div>
      )}
      {error && <div style={{ color: theme.danger, fontSize: 12, marginTop: 6 }}>{error}</div>}

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
