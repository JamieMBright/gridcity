// A reusable guided-play SPOTLIGHT: darken the whole screen except a
// cutout around one target element, with an orange highlight ring. The
// cutout is four dim panels around the hole (no SVG mask needed — the same
// trick the HUD tour uses). Driven by a `data-spot="<key>"` (or, as a
// fallback, `data-tour="<key>"`) attribute on the element to highlight, so
// the tutorial step just names a key and we measure whichever element is
// mounted (works across the desktop + phone-landscape layouts).
//
// Unlike the passive HUD tour, the tutorial spotlight is PURELY VISUAL:
// every dim panel is pointer-events:none, so it never blocks the player
// from clicking the highlighted control (or anything else). It draws the
// eye; it does not cage the UI.

import { useLayoutEffect, useState } from 'react';
import { theme } from './theme';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Measure the element carrying `data-spot="target"` (or `data-tour`),
 *  following layout settle + resizes. Returns undefined while unmounted or
 *  zero-sized so callers can fall back to no spotlight. */
export function useSpotlightRect(target: string | undefined): Rect | undefined {
  const [rect, setRect] = useState<Rect | undefined>(undefined);
  useLayoutEffect(() => {
    if (!target) {
      setRect(undefined);
      return;
    }
    const measure = (): void => {
      const el =
        document.querySelector<HTMLElement>(`[data-spot="${target}"]`) ??
        document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
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
    };
  }, [target]);
  return rect;
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

/** The dim-with-cutout overlay. `hole` undefined dims the whole screen.
 *  `interactive=false` (the tutorial default) lets clicks pass through. */
export function SpotlightOverlay({
  hole,
  zIndex = 6,
  interactive = false,
  pad = 7,
}: {
  hole: Rect | undefined;
  zIndex?: number;
  interactive?: boolean;
  pad?: number;
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
        </>
      ) : (
        <Dim x={0} y={0} w={vp.w} h={vp.h} interactive={interactive} />
      )}
    </div>
  );
}
