// Operator-rank surfaces — the dusk-styled badge + progress bar that lives
// in the start-menu NETWORK ACCESS block (guests see it too, stored
// locally), and the "PROMOTED" celebration card shown at a rank-up, with a
// friendly guest sign-in nudge that NEVER blocks play.
//
// Reflow: both pieces are a single readable column capped at the account
// card's 320px width, so they sit happily in a desktop start menu AND in a
// phone-landscape one. The celebration card centres in the viewport and
// caps to 94vw, so it never overflows a short landscape phone screen.

import { useEffect, useState } from 'react';
import { useAppStore } from '../app/store';
import { currentUser } from '../online/auth';
import { currentRank, readCareer, type RankProgress } from './rank';
import { theme } from './theme';

/** Compact career badge + progress bar for the start menu. Reads the local
 *  career record; re-reads whenever the menu re-renders (cheap, sync). */
export function RankBadge() {
  const [rank, setRank] = useState<RankProgress>(() => currentRank());
  const periods = readCareer().periods;
  // a promotion while the menu is mounted should refresh the bar: watch the
  // store's rankUp flag as the trigger to re-read the persisted record.
  const rankUp = useAppStore((s) => s.rankUp);
  useEffect(() => {
    setRank(currentRank());
  }, [rankUp]);

  const pct = Math.round(rank.progress * 100);
  return (
    <div
      style={{
        width: '100%',
        maxWidth: 320,
        margin: '12px auto 0',
        padding: '10px 12px',
        borderRadius: 10,
        border: '1px solid rgba(245, 196, 105, 0.22)',
        background: 'rgba(58, 43, 80, 0.35)',
        textAlign: 'left',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ color: theme.gold, fontSize: 13, fontWeight: 800, letterSpacing: '0.04em' }}>
          {rank.tier.title}
        </span>
        <span style={{ color: theme.slate, fontSize: 10, letterSpacing: '0.1em' }}>
          RANK {rank.tier.index + 1}/7
        </span>
      </div>
      <div style={{ color: theme.slate, fontSize: 11, marginTop: 2, lineHeight: 1.35 }}>
        {rank.tier.blurb}
      </div>
      {/* progress bar to the next rung */}
      <div
        style={{
          marginTop: 8,
          height: 6,
          borderRadius: 4,
          background: 'rgba(8, 11, 26, 0.7)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            borderRadius: 4,
            background: 'linear-gradient(90deg, #ffa238, #ff8a1e)',
            transition: 'width 0.4s ease',
          }}
        />
      </div>
      <div style={{ color: theme.slate, fontSize: 10.5, marginTop: 4 }}>
        {rank.next ? (
          <>
            {rank.pointsIntoTier}/{rank.tierSpan} to{' '}
            <span style={{ color: theme.orangeSoft }}>{rank.next.title}</span>
          </>
        ) : (
          <span style={{ color: theme.gold }}>top of the ladder — {periods} periods served</span>
        )}
      </div>
    </div>
  );
}

const dismissBtn: React.CSSProperties = {
  display: 'block',
  width: '100%',
  margin: '12px auto 0',
  padding: '9px 0',
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

const ghostBtn: React.CSSProperties = {
  display: 'block',
  width: '100%',
  margin: '8px auto 0',
  padding: '8px 0',
  borderRadius: 10,
  border: `1px solid ${theme.orange}`,
  background: 'rgba(255, 138, 30, 0.06)',
  color: theme.orange,
  fontFamily: theme.font,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  cursor: 'pointer',
};

/** The "PROMOTED" celebration card, shown over the game when a closed
 *  period bumps the operator's tier. For guests it carries the gentle
 *  sign-in nudge; for signed-in players it is pure celebration. Dismissible;
 *  never blocks play (it sits above the HUD but the player taps to clear). */
export function RankUpCard() {
  const rankUp = useAppStore((s) => s.rankUp);
  const setRankUp = useAppStore((s) => s.setRankUp);
  const loginNudge = useAppStore((s) => s.loginNudge);
  const setLoginNudge = useAppStore((s) => s.setLoginNudge);
  const setMenuOpen = useAppStore((s) => s.setMenuOpen);
  // confirm signed-in status (the worker only sets loginNudge for guests,
  // but double-check so a race never shows the nudge to a signed-in player)
  const [isGuest, setIsGuest] = useState(true);
  useEffect(() => {
    if (!rankUp) return;
    let live = true;
    void currentUser().then((u) => {
      if (live) setIsGuest(!u);
    });
    return () => {
      live = false;
    };
  }, [rankUp]);

  if (!rankUp) return null;
  const showNudge = loginNudge && isGuest;

  const dismiss = (): void => {
    setRankUp(undefined);
    setLoginNudge(false);
  };
  const toAccount = (): void => {
    dismiss();
    // surface the account panel: the sign-in card lives in the start menu's
    // NETWORK ACCESS block (never a hard wall — the player chose to come here)
    setMenuOpen(true);
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `${theme.night}cc`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 12,
      }}
      onClick={dismiss}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(360px, 94vw)',
          maxHeight: '92vh',
          overflowY: 'auto',
          borderRadius: 18,
          padding: '22px 22px 18px',
          textAlign: 'center',
          background:
            'linear-gradient(168deg, rgba(58,43,80,0.96) 0%, rgba(20,26,54,0.96) 60%, rgba(16,22,48,0.96) 100%)',
          border: '1px solid rgba(245, 196, 105, 0.4)',
          boxShadow: '0 24px 90px rgba(0,0,0,0.6), 0 0 60px rgba(255,138,30,0.18)',
          color: theme.offWhite,
          fontFamily: theme.font,
        }}
      >
        <div style={{ fontSize: 34, lineHeight: 1 }}>⚡</div>
        <div
          style={{
            color: theme.gold,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.24em',
            marginTop: 8,
          }}
        >
          PROMOTED
        </div>
        <div style={{ fontSize: 21, fontWeight: 800, marginTop: 6, color: theme.offWhite }}>
          {rankUp.title}
        </div>
        <div style={{ color: theme.slate, fontSize: 12.5, marginTop: 6, lineHeight: 1.4 }}>
          {rankUp.blurb}
        </div>

        {showNudge && (
          <div
            style={{
              marginTop: 14,
              padding: '10px 12px',
              borderRadius: 10,
              border: `1px solid ${theme.orange}`,
              background: 'rgba(255, 138, 30, 0.08)',
              fontSize: 12,
              lineHeight: 1.45,
              color: theme.offWhite,
            }}
          >
            Sign in to keep your rank &amp; unlock cities across devices — your
            career is stored on this device only until you do.
          </div>
        )}

        {showNudge && (
          <button style={ghostBtn} onClick={toAccount}>
            sign in to keep my rank
          </button>
        )}
        <button style={dismissBtn} onClick={dismiss}>
          {showNudge ? 'maybe later' : 'back to the grid'}
        </button>
      </div>
    </div>
  );
}
