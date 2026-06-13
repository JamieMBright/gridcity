// The Night the Grid Vanished: letterboxed opening shown once per new
// game (skippable), ending on the Ofgem letter that names the year-1
// allowance and the year-2 CML target — the player's first mandate.

import { useEffect, useState } from 'react';
import { useAppStore } from '../app/store';
import { ALLOWANCE_Y1_K, STORY_BEATS } from '../sim/scenario/story';
import { initialTargets } from '../sim/regulation/riio';
import { fmtMoneyK, theme } from './theme';

/** StartMenu sets this when a fresh (non-tutorial) campaign begins. */
export const STORY_KEY = 'ec-story-pending';

export function StoryIntro() {
  const menuOpen = useAppStore((s) => s.menuOpen);
  const scenarioId = useAppStore((s) => s.scenarioId);
  const [beat, setBeat] = useState(-1);

  // London-only fiction: campaign missions must never letterbox. The
  // pending flag is consumed (not deferred) so it can't leak into a
  // later mission → london transition.
  const isLondon = scenarioId === 'london';
  useEffect(() => {
    if (!menuOpen && sessionStorage.getItem(STORY_KEY) === '1') {
      sessionStorage.removeItem(STORY_KEY);
      if (isLondon) setBeat(0);
    }
  }, [menuOpen, isLondon]);

  if (menuOpen || beat < 0 || !isLondon) return null;
  const current = STORY_BEATS[beat];
  if (!current) return null;
  const last = beat === STORY_BEATS.length - 1;
  const targets = initialTargets();

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 20,
        background: 'rgba(6, 8, 20, 0.82)',
        display: 'flex',
        // top-aligned + scrollable so the action buttons are always
        // reachable on a short phone-landscape viewport (the centred
        // letter pushed "rebuild it" off-screen and blocked mobile play)
        alignItems: 'flex-start',
        justifyContent: 'center',
        overflowY: 'auto',
        padding: '24px 0',
        fontFamily: theme.font,
      }}
    >
      <div style={{ width: 'min(520px, 92vw)', margin: 'auto', color: theme.offWhite }}>
        <div style={{ color: theme.orange, fontSize: 12, letterSpacing: '0.18em' }}>
          {current.title.toUpperCase()}
        </div>
        <div style={{ fontSize: 16, lineHeight: 1.7, marginTop: 12 }}>{current.body}</div>
        {last && (
          <div
            style={{
              marginTop: 16,
              borderLeft: `2px solid ${theme.orange}`,
              paddingLeft: 14,
              fontSize: 13.5,
              lineHeight: 1.6,
              color: theme.slate,
            }}
          >
            Year-1 network allowance <b style={{ color: theme.offWhite }}>{fmtMoneyK(ALLOWANCE_Y1_K)}</b>
            {' · '}customer minutes lost below{' '}
            <b style={{ color: theme.offWhite }}>{targets.cml} CML</b> by year 2.
            <div style={{ marginTop: 6, color: theme.gold }}>
              Grace period: all performance metrics — reliability (CI/CML), constraint
              costs and the RIIO report card — are <b>frozen for your first 3 months</b>{' '}
              while you rebuild.
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'center' }}>
          <button
            onClick={() => setBeat(last ? -1 : beat + 1)}
            style={{
              padding: '6px 22px',
              borderRadius: 6,
              border: 'none',
              background: theme.orange,
              color: theme.navy,
              fontFamily: theme.font,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {last ? 'rebuild it' : 'continue'}
          </button>
          {!last && (
            <button
              onClick={() => setBeat(STORY_BEATS.length - 1)}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: `1px solid ${theme.navyLight}`,
                background: 'transparent',
                color: theme.slate,
                fontFamily: theme.font,
                cursor: 'pointer',
              }}
            >
              skip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
