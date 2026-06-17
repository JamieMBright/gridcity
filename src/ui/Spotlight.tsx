// A reusable guided-play SPOTLIGHT: darken the whole screen except a
// cutout around one target element, with an orange highlight ring AND a
// gently BOUNCING arrow that points at the target (owner: an arrow is a
// clearer affordance than a glow alone). The cutout is four dim panels
// around the hole (no SVG mask needed — the same trick the HUD tour uses).
// Driven by a `data-spot="<key>"` (or, as a fallback, `data-tour="<key>"`)
// attribute on the element to highlight, so the tutorial step just names a
// key and we measure whichever element is mounted (works across the
// desktop + phone-landscape layouts).
//
// Unlike the passive HUD tour, the tutorial spotlight is PURELY VISUAL:
// every dim panel is pointer-events:none, so it never blocks the player
// from clicking the highlighted control (or anything else). It draws the
// eye; it does not cage the UI.
//
// VANISH-ON-CLICK (owner): the spotlight must drop the MOMENT its target is
// actually clicked/armed — not linger until the step's goal latches (arming
// a tool happens a beat before the goal is met). useSpotlightRect watches
// the measured element for a pointerdown and reports `clicked`, so the
// caller can stop spotlighting as soon as the affordance has been used.

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { theme } from './theme';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SpotlightState {
  /** The measured target rect, or undefined while unmounted/zero-sized. */
  rect: Rect | undefined;
  /** True once the player has pressed the highlighted element since this
   *  `target` key was set (resets when the key changes). */
  clicked: boolean;
}

/** Measure the element carrying `data-spot="target"` (or `data-tour`),
 *  following layout settle + resizes, and report whether it has been
 *  clicked since this target was set. Rect is undefined while the element
 *  is unmounted or zero-sized so callers can fall back to no spotlight. */
export function useSpotlightRect(target: string | undefined): SpotlightState {
  const [rect, setRect] = useState<Rect | undefined>(undefined);
  const [clicked, setClicked] = useState(false);
  // the element we last attached the click listener to, so we can move the
  // listener when the layout swaps the element out (desktop ↔ mobile chrome)
  const boundEl = useRef<HTMLElement | null>(null);

  // reset the click latch whenever the spotlight target changes (new step)
  useEffect(() => {
    setClicked(false);
  }, [target]);

  useLayoutEffect(() => {
    const onDown = (): void => {
      // the affordance has been used — drop the spotlight immediately
      setClicked(true);
    };
    if (!target) {
      setRect(undefined);
      boundEl.current?.removeEventListener('pointerdown', onDown);
      boundEl.current = null;
      return;
    }
    const measure = (): void => {
      const el =
        document.querySelector<HTMLElement>(`[data-spot="${target}"]`) ??
        document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
      // (re)bind the click listener to whichever element is mounted now
      if (el !== boundEl.current) {
        boundEl.current?.removeEventListener('pointerdown', onDown);
        el?.addEventListener('pointerdown', onDown);
        boundEl.current = el;
      }
      if (!el) {
        setRect(undefined);
        return;
      }
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) {
        setRect(undefined);
        return;
      }
      setRect({ x: r.left, y: r.top, w: r.width, h: r.height });
    };
    measure();
    // the palette/inbox can scroll or re-layout as tools unlock: re-measure
    // on a short cadence while the spotlight is up, plus on resize/scroll
    const settle = window.setTimeout(measure, 60);
    const poll = window.setInterval(measure, 400);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.clearTimeout(settle);
      window.clearInterval(poll);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
      boundEl.current?.removeEventListener('pointerdown', onDown);
      boundEl.current = null;
    };
  }, [target]);
  return { rect, clicked };
}

function Dim({ x, y, w, h, interactive }: Rect & { interactive: boolean }) {
  return (
    <div
      onClick={interactive ? (e) => e.stopPropagation() : undefined}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: Math.max(0, w),
        height: Math.max(0, h),
        background: 'rgba(6, 8, 20, 0.6)',
        transition: 'background 160ms ease',
        pointerEvents: interactive ? 'auto' : 'none',
      }}
    />
  );
}

/** Keyframes for the gentle bob, injected once with the overlay. Each side
 *  bobs along the axis it points down, so the motion reads as "look here". */
function ArrowKeyframes() {
  return (
    <style>{`
      @keyframes ecArrowBobY {
        0%,100% { transform: rotate(0deg) translateY(-3px); }
        50%     { transform: rotate(0deg) translateY(4px); }
      }
      @keyframes ecArrowBobYUp {
        0%,100% { transform: rotate(180deg) translateY(-3px); }
        50%     { transform: rotate(180deg) translateY(4px); }
      }
      @keyframes ecArrowBobX {
        0%,100% { transform: rotate(-90deg) translateY(-3px); }
        50%     { transform: rotate(-90deg) translateY(4px); }
      }
      @keyframes ecArrowBobXLeft {
        0%,100% { transform: rotate(90deg) translateY(-3px); }
        50%     { transform: rotate(90deg) translateY(4px); }
      }
    `}</style>
  );
}

/** A bouncing arrow that points AT the highlighted box. We place it on
 *  whichever side has the most room (so it never points off-screen or sits
 *  under the lesson strip up top) and bob it gently along its pointing axis.
 *  The glyph ▼ points DOWN by default; rotation aims it at the target. */
function BounceArrow({ box }: { box: Rect }) {
  const vp = { w: window.innerWidth, h: window.innerHeight };
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const GAP = 6; // arrow tip sits just off the ring
  const SIZE = 30;

  const room = {
    top: box.y,
    bottom: vp.h - (box.y + box.h),
    left: box.x,
    right: vp.w - (box.x + box.w),
  };
  // prefer pointing DOWN (arrow ABOVE the target) — it rarely collides with
  // the left build rail or runs off the right; fall back by available room.
  let side: 'top' | 'bottom' | 'left' | 'right' = 'top';
  if (room.top >= SIZE + GAP + 8) side = 'top';
  else if (room.bottom >= SIZE + GAP + 8) side = 'bottom';
  else if (room.right >= SIZE + GAP + 8) side = 'right';
  else side = 'left';

  let left = cx;
  let top = cy;
  let anim = 'ecArrowBobY';
  if (side === 'top') {
    top = box.y - GAP - SIZE;
    anim = 'ecArrowBobY';
  } else if (side === 'bottom') {
    top = box.y + box.h + GAP + SIZE;
    anim = 'ecArrowBobYUp';
  } else if (side === 'left') {
    left = box.x - GAP - SIZE;
    anim = 'ecArrowBobX';
  } else {
    left = box.x + box.w + GAP + SIZE;
    anim = 'ecArrowBobXLeft';
  }

  return (
    <div
      data-testid="spotlight-arrow"
      aria-hidden
      style={{
        position: 'absolute',
        left,
        top,
        width: SIZE,
        height: SIZE,
        marginLeft: -SIZE / 2,
        marginTop: -SIZE / 2,
        animation: `${anim} 1s ease-in-out infinite`,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: theme.orange,
        fontSize: SIZE,
        lineHeight: 1,
        // a soft glow so the arrow reads over a busy panel/map
        filter: 'drop-shadow(0 2px 6px rgba(255,138,30,0.7))',
        fontWeight: 900,
      }}
    >
      ▼
    </div>
  );
}

/** The dim-with-cutout overlay. `hole` undefined dims the whole screen.
 *  `interactive=false` (the tutorial default) lets clicks pass through.
 *  `arrow` (default true) draws the bouncing pointer at the target. */
export function SpotlightOverlay({
  hole,
  zIndex = 6,
  interactive = false,
  pad = 7,
  arrow = true,
}: {
  hole: Rect | undefined;
  zIndex?: number;
  interactive?: boolean;
  pad?: number;
  arrow?: boolean;
}) {
  const vp = { w: window.innerWidth, h: window.innerHeight };
  const box = hole
    ? { x: hole.x - pad, y: hole.y - pad, w: hole.w + 2 * pad, h: hole.h + 2 * pad }
    : undefined;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex, pointerEvents: 'none' }}>
      {box ? (
        <>
          <Dim x={0} y={0} w={vp.w} h={box.y} interactive={interactive} />
          <Dim x={0} y={box.y + box.h} w={vp.w} h={vp.h - box.y - box.h} interactive={interactive} />
          <Dim x={0} y={box.y} w={box.x} h={box.h} interactive={interactive} />
          <Dim
            x={box.x + box.w}
            y={box.y}
            w={vp.w - box.x - box.w}
            h={box.h}
            interactive={interactive}
          />
          <div
            style={{
              position: 'absolute',
              left: box.x,
              top: box.y,
              width: box.w,
              height: box.h,
              borderRadius: 10,
              border: `2px solid ${theme.orange}`,
              boxShadow: '0 0 24px rgba(255,138,30,0.55)',
              pointerEvents: 'none',
            }}
          />
          {arrow && (
            <>
              <ArrowKeyframes />
              <BounceArrow box={box} />
            </>
          )}
        </>
      ) : (
        <Dim x={0} y={0} w={vp.w} h={vp.h} interactive={interactive} />
      )}
    </div>
  );
}
