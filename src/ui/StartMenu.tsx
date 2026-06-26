// The front door: continue a saved campaign, start fresh, or take the
// tutorial — styled as the glassy night-screen with the glowing CONTINUE.
// First click is also our user gesture for starting the audio.
//
// Phone-landscape (short + wide) must fit with NO SCROLL (owner, 2026-06-18):
// the card switches to a compact 2-column layout — actions on the left,
// network access on the right — with a small logo + tight controls, so the
// whole front door sits inside a ~360px-tall landscape viewport.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAppStore } from '../app/store';
import { newGameCommand } from '../app/workerBridge';
import { currentUser, onAuthChange } from '../online/auth';
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

const bigBtn = (primary: boolean, compact = false): React.CSSProperties => ({
  display: 'block',
  width: compact ? '100%' : 320,
  margin: compact ? '7px 0 0' : '12px auto 0',
  padding: compact ? '8px 0' : '12px 0',
  borderRadius: compact ? 9 : 12,
  border: primary ? 'none' : '1px solid rgba(125, 135, 180, 0.35)',
  background: primary
    ? 'linear-gradient(180deg, #ffa238 0%, #ff8a1e 55%, #ef7714 100%)'
    : 'rgba(255, 255, 255, 0.04)',
  boxShadow: primary
    ? '0 4px 26px rgba(255, 138, 30, 0.45), inset 0 1px 0 rgba(255,255,255,0.35)'
    : 'none',
  color: primary ? '#241c38' : theme.offWhite,
  fontFamily: theme.font,
  fontSize: compact ? 13 : 15,
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

/** True on a short, wide viewport (phone held landscape): the front door must
 *  then fit with no scroll, so it goes 2-column + compact. */
function useShortLandscape(): boolean {
  const [v, setV] = useState(
    () => typeof window !== 'undefined' && window.innerWidth > window.innerHeight && window.innerHeight < 480,
  );
  useEffect(() => {
    const on = (): void =>
      setV(window.innerWidth > window.innerHeight && window.innerHeight < 480);
    window.addEventListener('resize', on);
    window.addEventListener('orientationchange', on);
    return () => {
      window.removeEventListener('resize', on);
      window.removeEventListener('orientationchange', on);
    };
  }, []);
  return v;
}

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
  const short = useShortLandscape();
  // Guarantee NO SCROLL on a short landscape: after the 2-column compaction,
  // measure the card's natural height and scale it down to fit the viewport if
  // it would still overflow (the sign-in form is the tall bit). The scale is
  // gentle in the common case (~0.85) so text stays readable.
  const cardRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(1);
  // guest vs signed-in: drives the gentle "sign in to keep your rank" nudge
  // under the rank badge (signed-in players don't see it). undefined while
  // the session check is in flight, so nothing flashes.
  const [signedIn, setSignedIn] = useState<boolean | undefined>(undefined);
  useEffect(() => {
    let live = true;
    const check = (): void => {
      void currentUser().then((u) => {
        if (live) setSignedIn(!!u);
      });
    };
    check();
    // also re-check when the Settings popup signs the user out, so the guest
    // nudge + rank badge flip immediately rather than after a menu remount.
    const off = onAuthChange(check);
    return () => {
      live = false;
      off();
    };
  }, [menuOpen]);
  // measure + scale-to-fit (short landscape only). Transform doesn't change
  // scrollHeight, so this settles in one extra render (no loop).
  const measureFit = useCallback(() => {
    if (!short) {
      setFit((f) => (f !== 1 ? 1 : f));
      return;
    }
    const el = cardRef.current;
    if (!el) return;
    const natural = el.scrollHeight;
    // Scale is the SOLE fit mechanism on short-landscape (the card drops its
    // maxHeight there), so target a margin'd viewport and scale whenever the
    // content — including a freshly-appeared sign-in error — exceeds it. The
    // 16px keeps the bottom-most line off the very edge; centring splits it.
    const avail = window.innerHeight - 16;
    const next = natural > avail ? Math.max(0.55, avail / natural) : 1;
    setFit((f) => (Math.abs(next - f) > 0.005 ? next : f));
  }, [short]);
  // re-run each render so it tracks the obvious content + viewport changes…
  useLayoutEffect(() => {
    measureFit();
  });
  // …AND on any LATE content-height change inside the card. A sign-in error
  // (or notice) appears AFTER the click — a child re-render that StartMenu never
  // sees — so without this the grown card spills past the no-scroll fold and the
  // error renders below the bottom edge, reading as "nothing happened" (owner,
  // 2026-06-18: "no negative feedback on an unrecognised sign-in"). A
  // ResizeObserver re-fits whenever the card's own (untransformed) box grows;
  // the scale transform doesn't alter the observed size, so there's no loop.
  useEffect(() => {
    const el = cardRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => measureFit());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measureFit, menuOpen]);
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

  // LEFT column (compact-landscape) / TOP (tall): brand + the action buttons.
  const actions = (
    <div style={{ flex: short ? '1 1 0' : undefined, minWidth: 0 }}>
      <img
        src="/logotype.png"
        alt="ElectriCity"
        style={{
          display: 'block',
          width: short ? 'auto' : 380,
          maxWidth: '100%',
          maxHeight: short ? 58 : undefined,
          margin: short ? '0 auto 2px' : '0 auto',
          // feather the baked rectangular edges so the logo melts into the card
          // instead of reading as a "box" (owner, 2026-06-18)
          WebkitMaskImage:
            'linear-gradient(to right, transparent, #000 7%, #000 93%, transparent), linear-gradient(to bottom, transparent, #000 10%, #000 90%, transparent)',
          maskImage:
            'linear-gradient(to right, transparent, #000 7%, #000 93%, transparent), linear-gradient(to bottom, transparent, #000 10%, #000 90%, transparent)',
          WebkitMaskComposite: 'source-in',
          maskComposite: 'intersect',
        }}
      />
      {!short && (
        <div style={{ color: theme.slate, marginTop: 8, fontSize: 12.5 }}>
          power the city — keep the lights on, the bills down, the carbon low
        </div>
      )}
      {!ready && <div style={{ color: theme.gold, marginTop: 18 }}>starting the grid…</div>}
      {ready && (
        <>
          {hasSave && (
            <button style={bigBtn(true, short)} onClick={() => begin(false)}>
              continue
            </button>
          )}
          <button style={bigBtn(!hasSave, short)} onClick={() => setPickingCity(true)}>
            <span style={{ color: hasSave ? theme.orange : undefined }}>⚡ </span>new game
          </button>
          <button style={bigBtn(false, short)} onClick={() => setLessonsOpen(true)}>
            <span style={{ color: theme.orange }}>📖 </span>tutorials
          </button>
          <button style={bigBtn(false, short)} onClick={() => setTour(true)}>
            <span style={{ color: theme.orange }}>🧭 </span>tour the controls
          </button>
          <button style={bigBtn(false, short)} onClick={() => setSavesOpen(true)}>
            <span style={{ color: theme.orange }}>💾 </span>save slots
            {slotCount > 0 && (
              <span style={{ color: theme.slate, fontWeight: 400 }}> · {slotCount}</span>
            )}
          </button>
        </>
      )}
    </div>
  );

  // RIGHT column (compact-landscape) / BOTTOM (tall): network access.
  const access = (
    <div style={{ flex: short ? '1 1 0' : undefined, minWidth: 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          margin: short ? '0 0 4px' : '22px 0 4px',
        }}
      >
        <div style={{ flex: 1, height: 1, background: 'rgba(125,135,180,0.25)' }} />
        <span style={{ color: theme.orange, fontSize: 10, letterSpacing: '0.22em' }}>
          NETWORK ACCESS
        </span>
        <div style={{ flex: 1, height: 1, background: 'rgba(125,135,180,0.25)' }} />
      </div>
      {!short && (
        <div style={{ color: theme.slate, fontSize: 11.5 }}>
          you are the network operator — generation, wires, vans and all
        </div>
      )}
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
    </div>
  );

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
        overflowY: short ? 'hidden' : 'auto',
        padding: short ? '6px' : 0,
      }}
    >
      <div
        ref={cardRef}
        style={{
          transform: fit < 1 ? `scale(${fit})` : undefined,
          transformOrigin: 'center center',
          width: short ? 'min(880px, 97vw)' : 'min(440px, 94vw)',
          // On short-landscape the scale-to-fit (measureFit) is the sole height
          // governor — a competing maxHeight created a dead zone where content
          // (e.g. a late sign-in error) overflowed the card and spilled past its
          // bottom border. Tall/desktop keeps the scroll-cap.
          maxHeight: short ? undefined : 'calc(100dvh - 12px)',
          borderRadius: short ? 16 : 22,
          padding: short ? '12px 18px' : '28px 28px 16px',
          textAlign: 'center',
          background: 'rgba(8, 16, 44, 0.9)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: '1px solid rgba(125, 135, 180, 0.28)',
          boxShadow: '0 24px 90px rgba(0, 0, 0, 0.6)',
          color: theme.offWhite,
          fontFamily: theme.font,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: short ? 'row' : 'column',
            gap: short ? 24 : 0,
            alignItems: short ? 'flex-start' : 'stretch',
            textAlign: short ? 'left' : 'center',
          }}
        >
          {actions}
          {access}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: short ? 8 : 16,
            paddingTop: short ? 8 : 12,
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
