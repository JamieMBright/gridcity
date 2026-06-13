// The HUD coach-mark tour (ROADMAP #40, pulled forward): a guided
// spotlight that steps through the controls — bill corner, clock/speed/
// skip, build palette, inbox, balance, KPIs, the map inspector. Each step
// dims the screen with a cutout highlight over its target and a callout
// explaining it; next/skip; once-flagged in localStorage so it never
// nags. Works at phone-landscape AND desktop (it measures live element
// rects, so it follows whichever layout is mounted). Launchable from the
// start menu ("tour the controls") and the HUD's ? affordance.

import { useEffect, useLayoutEffect, useState } from 'react';
import { useAppStore } from '../app/store';
import { theme } from './theme';

const TOUR_KEY = 'ec-hud-tour-v1';

export function tourSeen(): boolean {
  try {
    return localStorage.getItem(TOUR_KEY) === '1';
  } catch {
    return false;
  }
}
function markSeen(): void {
  try {
    localStorage.setItem(TOUR_KEY, '1');
  } catch {
    // private mode: just don't persist
  }
}

interface TourStep {
  /** data-tour attribute of the spotlighted element. */
  target: string;
  title: string;
  text: string;
}

const STEPS: TourStep[] = [
  {
    target: 'bill',
    title: 'The bill — your scoreboard',
    text: 'Every pound you spend lands here, split into the lines customers pay. Keep an eye on it: low bills win report cards.',
  },
  {
    target: 'clock',
    title: 'Clock, speed & skip',
    text: 'Play/pause and 1×–16× speed sit here. The ⇥ buttons fast-forward to the evening peak, the morning, or the next event.',
  },
  {
    target: 'palette',
    title: 'The build palette',
    text: 'Generation, substations, lines, depots. Arm a tool, then click the map — it shades green where the kit can go.',
  },
  {
    target: 'inbox',
    title: 'The inbox',
    text: 'Tenders, connection applications and innovation pitches arrive here. Award a tender and the plant appears, waiting for wires.',
  },
  {
    target: 'balance',
    title: 'Grid balance',
    text: 'Demand vs supply for the whole area and each council — your first stop when somewhere goes dark.',
  },
  {
    target: 'kpi',
    title: 'Regulatory KPIs',
    text: 'Reliability, carbon and satisfaction against Ofgem’s targets, graded every five years in a RIIO report card.',
  },
  {
    target: 'map',
    title: 'Inspect anything',
    text: 'With the Inspect tool, tap any substation, plant or line to pin its card — health, loading and the controls that fix it.',
  },
];

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function rectOf(target: string): Rect | undefined {
  const el = document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
  if (!el) return undefined;
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return undefined;
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}

export function HudTour() {
  const active = useAppStore((s) => s.tourActive);
  const setActive = useAppStore((s) => s.setTourActive);
  const menuOpen = useAppStore((s) => s.menuOpen);
  const [ix, setIx] = useState(0);
  const [rect, setRect] = useState<Rect | undefined>(undefined);
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });

  // reset to the first step each time the tour opens
  useEffect(() => {
    if (active) setIx(0);
  }, [active]);

  // the map is data-tour="map" and full-screen; for the inspector step we
  // want a small spotlight, not the whole screen — skip ahead past any
  // step whose target is missing, and clamp the map rect to a corner.
  const step = STEPS[ix];
  useLayoutEffect(() => {
    if (!active || !step) return;
    const measure = (): void => {
      let r = rectOf(step.target);
      if (r && step.target === 'map') {
        // spotlight the centre of the map, not the entire viewport
        const s = Math.min(220, r.w * 0.5, r.h * 0.6);
        r = { x: r.x + r.w / 2 - s / 2, y: r.y + r.h / 2 - s / 2, w: s, h: s };
      }
      setRect(r);
      setVp({ w: window.innerWidth, h: window.innerHeight });
    };
    measure();
    const id = window.setTimeout(measure, 60); // let layout settle
    window.addEventListener('resize', measure);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('resize', measure);
    };
  }, [active, ix, step, menuOpen]);

  if (!active || !step) return null;

  const finish = (): void => {
    markSeen();
    setActive(false);
  };
  const advance = (): void => {
    // skip forward over any steps whose target isn't currently mounted
    let next = ix + 1;
    while (next < STEPS.length && !rectOf(STEPS[next]?.target ?? '')) next++;
    if (next >= STEPS.length) finish();
    else setIx(next);
  };

  const pad = 6;
  const hole = rect
    ? { x: rect.x - pad, y: rect.y - pad, w: rect.w + 2 * pad, h: rect.h + 2 * pad }
    : undefined;

  // place the callout opposite the hole so it never covers it
  const calloutW = Math.min(320, vp.w - 24);
  let cx = vp.w / 2 - calloutW / 2;
  let cy = vp.h / 2 - 60;
  if (hole) {
    const below = hole.y + hole.h + 12;
    const above = hole.y - 12;
    const fitsBelow = below + 130 < vp.h;
    cy = fitsBelow ? below : Math.max(8, above - 130);
    cx = Math.min(Math.max(8, hole.x + hole.w / 2 - calloutW / 2), vp.w - calloutW - 8);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 40, fontFamily: theme.font }}>
      {/* four dim panels around the spotlight = a cutout without SVG */}
      {hole ? (
        <>
          <Dim x={0} y={0} w={vp.w} h={Math.max(0, hole.y)} />
          <Dim x={0} y={hole.y + hole.h} w={vp.w} h={Math.max(0, vp.h - hole.y - hole.h)} />
          <Dim x={0} y={hole.y} w={Math.max(0, hole.x)} h={hole.h} />
          <Dim
            x={hole.x + hole.w}
            y={hole.y}
            w={Math.max(0, vp.w - hole.x - hole.w)}
            h={hole.h}
          />
          <div
            style={{
              position: 'absolute',
              left: hole.x,
              top: hole.y,
              width: hole.w,
              height: hole.h,
              borderRadius: 10,
              border: `2px solid ${theme.orange}`,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.001), 0 0 24px rgba(255,138,30,0.55)',
              pointerEvents: 'none',
            }}
          />
        </>
      ) : (
        <Dim x={0} y={0} w={vp.w} h={vp.h} />
      )}

      <div
        style={{
          position: 'absolute',
          left: cx,
          top: cy,
          width: calloutW,
          borderRadius: 12,
          padding: '12px 14px',
          background: 'rgba(13, 17, 36, 0.95)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: `1px solid ${theme.gold}`,
          boxShadow: '0 12px 50px rgba(0,0,0,0.6)',
          color: theme.offWhite,
        }}
      >
        <div style={{ color: theme.orange, fontSize: 10, letterSpacing: '0.16em' }}>
          TOUR · {ix + 1}/{STEPS.length}
        </div>
        <div style={{ fontSize: 14, fontWeight: 800, marginTop: 3 }}>{step.title}</div>
        <div style={{ fontSize: 12.5, lineHeight: 1.5, color: theme.slate, marginTop: 5 }}>
          {step.text}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
          <button onClick={finish} style={ghost}>
            skip tour
          </button>
          <button onClick={advance} style={primary}>
            {ix + 1 >= STEPS.length ? 'done' : 'next'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Dim({ x, y, w, h }: Rect) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        background: 'rgba(6, 8, 20, 0.62)',
      }}
    />
  );
}

const primary: React.CSSProperties = {
  padding: '5px 16px',
  borderRadius: 6,
  border: 'none',
  background: theme.orange,
  color: theme.navy,
  fontFamily: theme.font,
  fontWeight: 700,
  cursor: 'pointer',
};
const ghost: React.CSSProperties = {
  padding: '5px 12px',
  borderRadius: 6,
  border: `1px solid ${theme.navyLight}`,
  background: 'transparent',
  color: theme.slate,
  fontFamily: theme.font,
  cursor: 'pointer',
};
