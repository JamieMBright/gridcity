// RailPanelShell — the two-layer frosted-glass card that fixes the
// "square menu" (owner item #1, twice-flagged with red arrows).
//
// THE BUG (proven by a 7-variant truth table, scratchpad/repro-full.png): a
// Chromium bug clips a `backdrop-filter` element's blur to its SQUARE
// border-box — ignoring `border-radius` — the moment that SAME element also
// becomes a scroll container (`overflow` other than `visible`). Our rail
// panels spread `panelStyle` (backdrop-filter + 15px radius) AND the rail's
// `frame` (overflowY:auto), so the one element hit all three conditions and
// painted a hard 90° frosted corner on its inner, map-facing edge.
//
// THE FIX (truth-table variant G): split the card into TWO layers so the
// radius'd + backdrop-filtered box is NEVER the scroll container.
//   - OUTER (this shell's root) keeps panelStyle (blur + radius) and clips
//     with `overflow:hidden` — so its children are masked to the rounded
//     corners correctly, blur included.
//   - INNER (the scroll body) carries the scroll (`overflowY:auto`) and the
//     padding, and flexes to fill the outer so a long list scrolls in place.
//
// Every rail/sheet panel renders through this shell so there is ONE correct
// implementation instead of six divergent edits. The shell keeps the panel's
// own `data-*`/`aria-*` and chrome on the OUTER root (the hudfit gate + the
// e2e read those off the outermost positioned box).

import { panelStyle } from './theme';

/** CSS properties that belong to the INNER scroll body, not the rounded
 *  outer. Anything scroll- or overflow-related is moved inwards; everything
 *  else (position, size caps, colour, the panelStyle chrome) stays on the
 *  rounded outer so its corners clip correctly. */
const SCROLL_KEYS = [
  'overflow',
  'overflowX',
  'overflowY',
  'overscrollBehavior',
  'overscrollBehaviorX',
  'overscrollBehaviorY',
  'scrollbarWidth',
  'scrollbarColor',
  'scrollBehavior',
] as const;

/** Padding keys move onto the inner so the scrollbar sits INSIDE the rounded
 *  corner and the padded content scrolls (matching the proven variant-G DOM,
 *  scratchpad/repro.html). */
const PAD_KEYS = [
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'paddingBlock',
  'paddingInline',
  'paddingBlockStart',
  'paddingBlockEnd',
  'paddingInlineStart',
  'paddingInlineEnd',
] as const;

type Style = React.CSSProperties;

function pick(style: Style, keys: readonly (keyof Style)[]): Style {
  const out: Style = {};
  for (const k of keys) {
    if (style[k] !== undefined) (out as Record<string, unknown>)[k] = style[k];
  }
  return out;
}

function omit(style: Style, keys: readonly (keyof Style)[]): Style {
  const out: Style = { ...style };
  for (const k of keys) delete out[k];
  return out;
}

export interface RailPanelShellProps {
  /** The panel's own default chrome/position (absolute placement, width,
   *  height caps, padding) — used standalone when no `frame` overrides it. */
  base: Style;
  /** The rail/sheet override (railPanel + per-slot maxHeight/height): wins
   *  over `base`, exactly as the old single-div `{...base, ...frame}` did. */
  frame?: Style | undefined;
  /** Attributes to keep on the OUTER root (data-tour/data-spot/className/…)
   *  so the layout gate + e2e still find them on the outermost panel box. */
  rootProps?: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>;
  /** Content that must NOT scroll with the body — pinned to the rounded
   *  outer layer (e.g. a close ✕ that stays put while the card scrolls). It
   *  renders ABOVE the scroll body and positions against the outer root. */
  overlay?: React.ReactNode;
  children: React.ReactNode;
}

/** Render a rail/sheet panel as the rounded outer + scrolling inner. */
export function RailPanelShell({ base, frame, rootProps, overlay, children }: RailPanelShellProps) {
  // the merged intent, identical to the legacy `{...panelStyle, ...base, ...frame}`
  const merged: Style = { ...panelStyle, ...base, ...(frame ?? {}) };

  const scroll = pick(merged, SCROLL_KEYS);
  const pad = pick(merged, PAD_KEYS);
  // does the merged style actually ask to scroll? (rail frames set
  // overflowY:auto; a couple of standalone panels are pointer-transparent
  // hover cards that don't.) If nothing scrolls we still two-layer so the
  // radius clipping path is identical everywhere.
  const wantsScroll =
    scroll.overflow !== undefined ||
    scroll.overflowX !== undefined ||
    scroll.overflowY !== undefined;

  // OUTER: the rounded, blurred card. Drop scroll + padding (they move
  // inwards); force overflow:hidden so the rounded corners clip the inner —
  // blur included — instead of the buggy square backdrop clip. Become a
  // flex column so the inner can fill and scroll within the height cap.
  const outer: Style = {
    ...omit(merged, [...SCROLL_KEYS, ...PAD_KEYS]),
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  };

  // INNER: the scroll body. Take the requested scroll + padding, fill the
  // outer, and stay border-box so the padding lives inside the rounded clip.
  const inner: Style = {
    ...scroll,
    ...pad,
    boxSizing: 'border-box',
    flex: '1 1 auto',
    minHeight: 0,
    // when the panel asks to scroll, cap the inner to the outer so a long
    // list scrolls in place; otherwise let it size to content
    maxHeight: wantsScroll ? '100%' : undefined,
  };

  // a caller can fold extra outer-only style (e.g. the pinned card's tinted
  // borderLeft) in via rootProps.style — merge it so style={outer} doesn't
  // clobber it
  const { style: rootStyle, ...restRootProps } = rootProps ?? {};

  return (
    <div {...restRootProps} style={{ ...outer, ...rootStyle }}>
      <div style={inner}>{children}</div>
      {overlay}
    </div>
  );
}
