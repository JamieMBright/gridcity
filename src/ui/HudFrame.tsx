// HudFrame — the UNIFIED PERIMETER HUD (owner mandate, 2026-06-15/16).
//
// One wraparound chrome that frames the screen perimeter with DEDICATED,
// non-overlapping zones. The whole frame is a CSS grid laid over the
// full-screen map:
//
//   ┌──────────── top bar (wordmark · ticker · regulator) ───────────┐
//   │ LEFT rail │            centre — the map shows                │ R │
//   │  build    │            through, untouched + clickable        │ I │
//   │  palette  │            (this cell is transparent +           │ G │
//   │   ……      │             pointer-transparent)                 │ H │
//   │  fleet    │                                                  │ T │
//   ├───────────┴──────── bottom bar (clock · speed · status) ──────┤
//   └────────────────────────────────────────────────────────────────┘
//
// Why this beats the old floating panels: every panel is a FLEX CHILD of
// its track (a real layout box), not an absolutely-positioned sibling
// fighting hard-coded top/bottom offsets. A panel can only grow WITHIN its
// track, and scrolls inside itself when it runs out of room (min-height:0
// + overflow:auto). Two panels in the same rail share the height via flex;
// a panel in one rail can never reach another rail or the map. Overlap is
// therefore structurally impossible — there is no z-order race left to
// lose. The map render is byte-identical (this is pure DOM/CSS over an
// untouched inset:0 canvas).

import { useEffect, useState } from 'react';
import { useAppStore } from '../app/store';
import { useUnlockGate } from './unlocks';
import { AlertsFeed } from './AlertsFeed';
import { BillPanel } from './BillPanel';
import { BuildPalette } from './BuildPalette';
import { CameraBookmarks } from './CameraBookmarks';
import { FleetPanel } from './FleetPanel';
import { HudBottomBar, HudTopBar } from './Hud';
import { InboxPanel } from './InboxPanel';
import { InfoPanel } from './InfoPanel';
import { Minimap } from './Minimap';
import { theme } from './theme';

// Rail width: roomy enough for the build palette's labelled rows + the
// bill/inbox detail, narrow enough to leave the map the lion's share at
// 1280 (234 + 300 = 534 of chrome, ~700 of clear map). On a tighter desktop
// window (a non-touch laptop between the mobile breakpoint and 1200) the
// rails step down so the map keeps a usable centre.
const LEFT_W_WIDE = 234;
const RIGHT_W_WIDE = 300;
const LEFT_W_TIGHT = 198;
const RIGHT_W_TIGHT = 250;
const GAP = 10;

/** Viewport width, live — drives the rail-width step-down on narrow desktop
 *  windows (the phone path is handled separately by MobileChrome). */
function useViewportWidth(): number {
  const [w, setW] = useState(() => window.innerWidth);
  useEffect(() => {
    const onResize = (): void => setW(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return w;
}

/** A panel that lives inside a rail track: drop the floating-panel
 *  position/offsets, become a flex child that can shrink, and scroll its
 *  own overflow. The component keeps its OWN panelStyle chrome + all its
 *  internals (and its data-testid/text — the e2e is untouched). */
const railPanel: React.CSSProperties = {
  position: 'relative',
  top: 'auto',
  left: 'auto',
  right: 'auto',
  bottom: 'auto',
  width: '100%',
  // a rail panel never dictates the rail's width or its neighbours' height
  margin: 0,
  // shrink to share the track; cap growth so a long list scrolls in-place
  minHeight: 0,
  maxHeight: '100%',
  overflowY: 'auto',
  // the grid track owns the z-stack; reset any per-panel z so the rail
  // order (DOM order) is the only thing that matters
  zIndex: 'auto',
  flex: '0 1 auto',
};

/** A scroll-contained track down one side of the screen. Its children are
 *  the panels; `gap` keeps a guaranteed breathing space between them. */
function Rail({
  side,
  children,
}: {
  side: 'left' | 'right';
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        gridArea: side,
        // re-enable pointer events for the rail (the frame is transparent)
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: GAP,
        minHeight: 0,
        // panels align to the OUTER edge so the map keeps the inner space
        alignItems: side === 'left' ? 'flex-start' : 'flex-end',
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
}

/** A horizontal bar across the top/bottom. Children re-enable pointer
 *  events for themselves; the bar itself is a transparent flow box so the
 *  map shows through any gaps. */
function Bar({
  area,
  align,
  children,
}: {
  area: 'top' | 'bottom';
  align: 'start' | 'end';
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        gridArea: area,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: align === 'start' ? 'flex-start' : 'flex-end',
        minHeight: 0,
        overflow: 'visible',
      }}
    >
      {children}
    </div>
  );
}

/** Wrap each rail panel so pointer events work on it (the rail container is
 *  pointer-transparent so its gaps don't eat map drags) and it can flex.
 *
 *  mode:
 *   - 'flex'  the interactive surfaces (pinned inspector, inbox) — they
 *             SHARE the rail's flexible middle and scroll inside themselves.
 *   - 'fixed' compact reference panels (bill, alerts) — natural height,
 *             never grow, shrink only under real pressure (then scroll).
 */
function RailItem({
  children,
  mode = 'fixed',
}: {
  children: React.ReactNode;
  mode?: 'flex' | 'fixed';
}) {
  return (
    <div
      style={{
        pointerEvents: 'auto',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        flex: mode === 'flex' ? '1 1 0' : '0 1 auto',
      }}
    >
      {children}
    </div>
  );
}

export function HudFrame() {
  // progressive disclosure: a mission shows only the panels it teaches
  const gate = useUnlockGate();
  const showPanel = (key: string): boolean => !gate.active || gate.has(key);
  const vw = useViewportWidth();
  const wide = vw >= 1200;
  const leftW = wide ? LEFT_W_WIDE : LEFT_W_TIGHT;
  const rightW = wide ? RIGHT_W_WIDE : RIGHT_W_TIGHT;

  // is a card pinned in the inspector? It takes the TOP slot of the right
  // rail so its controls are always reachable (owner: "can't upgrade the
  // substation, messages in the way"). The inbox/bill flex below it.
  const selectedAsset = useAppStore((s) => s.selectedAsset);
  const selectedLine = useAppStore((s) => s.selectedLine);
  const pinned = selectedAsset !== undefined || selectedLine !== undefined;

  return (
    <div
      data-hud-frame
      style={{
        position: 'absolute',
        // inset the frame off the safe-area on every edge; the centre stays
        // clear for the map (top/bottom bars + rails reserve their own room)
        top: 'calc(var(--sai-t) + 8px)',
        left: 'calc(var(--sai-l) + 10px)',
        right: 'calc(var(--sai-r) + 10px)',
        bottom: 'calc(var(--sai-b) + 8px)',
        display: 'grid',
        gridTemplateColumns: `${leftW}px minmax(0, 1fr) ${rightW}px`,
        gridTemplateRows: 'auto minmax(0, 1fr) auto',
        gridTemplateAreas: `
          "top    top    top"
          "left   centre right"
          "bottom bottom bottom"
        `,
        columnGap: GAP,
        rowGap: GAP,
        // the frame is a transparent overlay — the map owns every gap and
        // the centre. Each track re-enables pointer events for itself.
        pointerEvents: 'none',
        // keep the whole HUD on one consistent layer over the map; the
        // tracks order their own children by DOM order, no z-war
        zIndex: 3,
      }}
    >
      {/* TOP — wordmark + search + ticker + regulator buttons */}
      <Bar area="top" align="start">
        <HudTopBar />
      </Bar>

      {/* LEFT — build palette (fills the rail, scrolls), the field fleet
          beneath it, and the locator widgets pinned to the foot. */}
      <Rail side="left">
        <RailItem mode="flex">
          <BuildPalette frame={railPanel} />
        </RailItem>
        {showPanel('hud:fleet') && (
          <RailItem>
            <FleetPanel frame={railPanel} />
          </RailItem>
        )}
        {/* the minimap + camera bookmarks dock at the BOTTOM of the left rail
            so they can never sit on the right-rail finance stack (owner
            playtest) and never cover the clock bar. Open or collapsed, they
            live in this slot. HIDDEN during tutorials (owner: hide
            non-essential HUD; a one-screen lesson map needs no minimap or
            saved camera viewpoints) — introduced in sandbox via hud:minimap. */}
        {showPanel('hud:minimap') && (
          <div
            style={{
              marginTop: 'auto',
              pointerEvents: 'auto',
              flex: 'none',
              display: 'flex',
              alignItems: 'flex-end',
              gap: GAP,
            }}
          >
            <Minimap frame={minimapFrame} />
            <CameraBookmarks frame={cornerWidgetFrame} />
          </div>
        )}
      </Rail>

      {/* RIGHT — pinned inspector (top slot), inbox (grows), bill (foot).
          Each is scroll-contained, so the tall open-application card or a
          long bill detail scrolls WITHIN its sub-zone instead of pushing
          onto a neighbour. */}
      <Rail side="right">
        {/* the pinned inspector wins the top of the rail when present — its
            controls stay reachable (owner: "can't upgrade the substation,
            messages in the way"); it shares the flexible space with the
            inbox and scrolls inside itself. */}
        {pinned && (
          <RailItem mode="flex">
            <InfoPanel frame={{ ...railPanel, width: '100%' }} />
          </RailItem>
        )}
        {showPanel('hud:inbox') && (
          <RailItem mode="flex">
            <InboxPanel frame={{ ...railPanel, height: '100%', maxHeight: '100%' }} />
          </RailItem>
        )}
        {/* compact reference panels at the foot — natural height, scroll
            inside themselves, never push onto a neighbour. The bill always
            shows; the alerts feed yields its slot to a pinned inspector
            (the live events still stream across the top ticker), so the rail
            never stacks more than three panels — each keeps real room. */}
        {showPanel('hud:bill') && (
          <RailItem>
            <BillPanel frame={{ ...railPanel, maxHeight: 360 }} />
          </RailItem>
        )}
        {!pinned && showPanel('hud:alerts') && (
          <RailItem>
            <AlertsFeed frame={{ ...railPanel, maxHeight: 150 }} />
          </RailItem>
        )}
      </Rail>

      {/* the hover-only tile card has no pin; it floats over the centre map
          (pointer-transparent, ephemeral) so it reserves no rail slot and
          never occludes the inbox/bill. When something IS pinned the right
          rail renders the pinned card instead. */}
      {!pinned && <HoverCard />}

      {/* BOTTOM — clock, speed, skip, undo, view toggles, status, goal */}
      <Bar area="bottom" align="end">
        <HudBottomBar />
      </Bar>
    </div>
  );
}

const minimapFrame: React.CSSProperties = {
  position: 'relative',
  top: 'auto',
  left: 'auto',
  right: 'auto',
  bottom: 'auto',
};

/** Null out the legacy absolute placement + transform so a corner widget
 *  (camera bookmarks) sits in the left-rail foot flow instead of floating
 *  over the right rail. */
const cornerWidgetFrame: React.CSSProperties = {
  position: 'relative',
  top: 'auto',
  right: 'auto',
  bottom: 'auto',
  left: 'auto',
  transform: 'none',
};

/** The hover tile card: ephemeral, pointer-transparent. It rides the TOP of
 *  the CENTRE column (over the map, near where the player is looking) so it
 *  never reserves rail space nor occludes the inbox/bill — and it only
 *  renders at all when nothing is pinned (the rail shows the pinned card
 *  instead). A right-aligned narrow card keeps it clear of the left rail. */
function HoverCard() {
  return (
    <div
      style={{
        gridArea: 'centre',
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      <InfoPanel
        frame={{
          ...railPanel,
          width: 240,
          flex: 'none',
          maxHeight: '70%',
          // a faint edge so the hover card reads as transient, not docked
          borderColor: 'rgba(245, 196, 105, 0.12)',
        }}
      />
    </div>
  );
}

/** Shared accent used by the rails' scrollbars (kept subtle, dusk). */
export const HUD_SCROLL_ACCENT = theme.navyLight;
