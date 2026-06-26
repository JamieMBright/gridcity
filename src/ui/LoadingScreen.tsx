// The cosy boot loading screen (owner, 2026-06-18: "On entering the site it
// currently just shows nothing obvious — build a proper loading page: the
// title image centred + a progress bar + a fun randomized status label drawn
// from a BIG pool of electricity-flavoured lines").
//
// Wired to the existing boot/ready gate: the worker connects, seeds the
// scenario and posts a first snapshot, at which point workerStatus flips to
// 'ready'. We show the screen from first paint and fade it out once the sim
// is ready (a snapshot has landed), so the player never stares at a blank
// navy void. Pure dusk styling to match the brand — no new assets beyond the
// existing /logotype.png title image.

import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../app/store';
import { theme } from './theme';

// A big pool of electricity-flavoured status lines — one is picked at random
// on mount and they rotate every ~1s while the grid boots (owner, 2026-06-18:
// "a new message every second"). Cosy, on-brand, a little playful (the classic
// "reticulating splines" gag included).
const STATUS_LINES: string[] = [
  'Charging electrons…',
  'Plugging in the batteries…',
  'Spinning up the turbines…',
  'Balancing the grid…',
  'Warming the transformers…',
  'Energising the substations…',
  'Reticulating splines…',
  'Closing the circuit breakers…',
  'Tightening the busbars…',
  'Synchronising the system frequency…',
  'Stringing the overhead lines…',
  'Pouring the pylon footings…',
  'Tripping and resetting relays…',
  'Forecasting tomorrow’s demand…',
  'Negotiating with the regulator…',
  'Filing the planning applications…',
  'Dispatching the merit order…',
  'Topping up the pumped storage…',
  'Rolling out the smart meters…',
  'Reading the wholesale price…',
  'Insulating the cables…',
  'Greasing the tap-changers…',
  'Calling out the field crews…',
  'Trimming the trees off the lines…',
  'Catching the sunset on the panels…',
  'Letting the wind pick up…',
  'Counting the carbon…',
  'Routing power across the city…',
  'Lighting up the skyline…',
  'Waking the transmission system…',
  'Brewing the operator’s tea…',
];

function pick(): string {
  return STATUS_LINES[Math.floor(Math.random() * STATUS_LINES.length)] ?? STATUS_LINES[0]!;
}

export function LoadingScreen(): React.ReactElement | null {
  const workerStatus = useAppStore((s) => s.workerStatus);
  const snapshot = useAppStore((s) => s.snapshot);
  // ready once the sim has connected AND a first snapshot has landed (the
  // renderer has something to draw). 'error' also dismisses — the app's own
  // error chrome takes over.
  const ready = workerStatus === 'error' || (workerStatus === 'ready' && snapshot !== undefined);

  const [progress, setProgress] = useState(8);
  const [line, setLine] = useState(pick);
  const [gone, setGone] = useState(false);
  const [fading, setFading] = useState(false);
  const startRef = useRef<number>(Date.now());

  // Rotate the status line once a second while booting (owner ask).
  useEffect(() => {
    if (ready) return;
    const id = setInterval(() => setLine(pick()), 1000);
    return () => clearInterval(id);
  }, [ready]);

  // Drive the bar off ELAPSED TIME on an asymptotic ease toward 96% — always
  // inching forward, so it never parks at a hard cap the way the old 90% clamp
  // did (which read as "stuck at half, then a jump to 100"). It settles to 100%
  // when ready. No true byte-count exists (boot is worker spin-up + scenario
  // seed, not a download), so a smooth, always-moving creep + the travelling
  // sheen on the fill sell "working" honestly without faking a number.
  useEffect(() => {
    if (ready) {
      setProgress(100);
      return;
    }
    const id = setInterval(() => {
      const t = (Date.now() - startRef.current) / 1000;
      const target = 96 * (1 - Math.exp(-t / 6));
      setProgress((p) => (target > p ? target : p));
    }, 80);
    return () => clearInterval(id);
  }, [ready]);

  // Fade out shortly after ready, then unmount. A floor of ~600ms keeps the
  // screen from flashing on a warm cache.
  useEffect(() => {
    if (!ready) return;
    const elapsed = Date.now() - startRef.current;
    const wait = Math.max(0, 600 - elapsed);
    const t1 = setTimeout(() => setFading(true), wait);
    const t2 = setTimeout(() => setGone(true), wait + 460);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [ready]);

  if (gone) return null;

  return (
    <div
      data-loading-screen
      aria-busy={!ready}
      role="status"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 9000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 26,
        // cosy dusk: a deep navy→night radial with a warm horizon glow, the
        // same golden-hour world as the map chrome
        background:
          'radial-gradient(125% 100% at 50% 42%, #0b1431 0%, #05091f 58%, #03071a 100%)',
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.42s ease',
        pointerEvents: ready ? 'none' : 'auto',
        fontFamily: theme.font,
        // sit clear of any notch
        paddingTop: 'var(--sai-t)',
        paddingBottom: 'var(--sai-b)',
      }}
    >
      <style>{`@keyframes ec-bar-sheen { 0% { transform: translateX(-120%); } 100% { transform: translateX(360%); } }`}</style>
      {/* a soft warm halo behind the wordmark — the "powering up" glow */}
      <div
        style={{
          position: 'absolute',
          top: '32%',
          width: 'min(640px, 80vw)',
          height: 220,
          background: 'radial-gradient(closest-side, rgba(255,138,30,0.18), rgba(255,138,30,0))',
          filter: 'blur(6px)',
          pointerEvents: 'none',
        }}
      />
      <img
        src="/logotype.png"
        alt="ElectriCity"
        style={{
          position: 'relative',
          width: 'min(560px, 78vw)',
          maxHeight: '34vh',
          objectFit: 'contain',
          // The logotype is a baked rectangular dusk scene; feather its edges
          // so it melts into the page instead of reading as a "box" (owner,
          // 2026-06-18: "you can still see the box because the blues don't
          // match"). Drop the hard rectangular drop-shadow that framed it.
          WebkitMaskImage:
            'linear-gradient(to right, transparent, #000 7%, #000 93%, transparent), linear-gradient(to bottom, transparent, #000 10%, #000 90%, transparent)',
          maskImage:
            'linear-gradient(to right, transparent, #000 7%, #000 93%, transparent), linear-gradient(to bottom, transparent, #000 10%, #000 90%, transparent)',
          WebkitMaskComposite: 'source-in',
          maskComposite: 'intersect',
          animation: 'ec-fade-in 0.6s ease both',
        }}
      />

      {/* progress bar — a rounded track with a warm orange→gold fill and a
          travelling sheen while it works */}
      <div
        style={{
          position: 'relative',
          width: 'min(420px, 74vw)',
          height: 9,
          borderRadius: 999,
          background: 'rgba(141, 151, 180, 0.18)',
          border: '1px solid rgba(141, 151, 180, 0.18)',
          overflow: 'hidden',
          boxShadow: 'inset 0 1px 3px rgba(5,7,16,0.5)',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: `${progress}%`,
            height: '100%',
            borderRadius: 999,
            background: `linear-gradient(90deg, ${theme.orange}, ${theme.gold})`,
            boxShadow: '0 0 12px rgba(255,138,30,0.6)',
            transition: 'width 0.3s ease',
            overflow: 'hidden',
          }}
        >
          {/* a highlight that travels along the fill so the bar always reads as
              actively working, even while the % is only inching up */}
          {!ready && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                width: '45%',
                background:
                  'linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)',
                animation: 'ec-bar-sheen 1.05s linear infinite',
              }}
            />
          )}
        </div>
      </div>

      {/* the rotating, electricity-flavoured status line */}
      <div
        key={line}
        style={{
          position: 'relative',
          minHeight: 18,
          color: theme.orangeSoft,
          fontSize: 13.5,
          letterSpacing: '0.04em',
          textShadow: '0 1px 8px rgba(5,7,16,0.6)',
          animation: 'ec-fade-in 0.5s ease both',
        }}
      >
        {ready ? 'Ready.' : line}
      </div>
    </div>
  );
}
