// Hotkey cheat-sheet overlay (ROADMAP #29). The hotkey set has outgrown
// the status-bar one-liner; this is the styled, grouped reference summoned
// with ? (or the HUD help menu). Build-tool keys come straight from
// hotkeys.ts (the single source of truth the palette + App handler share);
// the overlay/camera/edit keys are a hand-kept list mirroring the App.tsx
// keyboard hook, so they can't silently drift from the wiring.
//
// Lofi dusk modal, legible at phone-landscape (two columns collapse to one
// on a narrow viewport). Dismissed by ✕, the backdrop, ? or Escape.

import { useEffect } from 'react';
import { HOTKEYS } from '../app/hotkeys';
import { useAppStore, type Tool } from '../app/store';
import { GENS, SUBS } from '../sim/catalog';
import { panelStyle, theme } from './theme';

/** A human label for a build-tool hotkey, read off the catalog so the
 *  names match the palette exactly. */
function toolLabel(tool: Tool): string {
  if (tool.t === 'gen') return GENS[tool.gen].name;
  if (tool.t === 'sub') return SUBS[tool.sub].name.split(' (')[0] ?? SUBS[tool.sub].name;
  if (tool.t === 'line') return `${tool.level} kV line / cable`;
  if (tool.t === 'depot') return 'Field depot';
  if (tool.t === 'demolish') return 'Demolish';
  return 'Inspect';
}

interface Row {
  keys: string[];
  label: string;
}
interface Group {
  title: string;
  rows: Row[];
}

/** The build-tool groups, derived from the shared HOTKEYS table. */
function buildGroups(): Group[] {
  const gen: Row[] = [];
  const sub: Row[] = [];
  const line: Row[] = [];
  const ops: Row[] = [];
  for (const h of HOTKEYS) {
    const row: Row = { keys: [h.key.toUpperCase()], label: toolLabel(h.tool) };
    if (h.tool.t === 'gen') gen.push(row);
    else if (h.tool.t === 'sub') sub.push(row);
    else if (h.tool.t === 'line') line.push(row);
    else ops.push(row);
  }
  return [
    { title: 'Generation', rows: gen },
    { title: 'Substations', rows: sub },
    { title: 'Lines', rows: line },
    { title: 'Operations', rows: ops },
  ];
}

// Hand-kept to mirror App.tsx's keyboard hook + MapView gestures. Reviewed
// alongside that handler when keys change (covered by an icons/keys test).
const OVERLAY_GROUP: Group = {
  title: 'Overlays & panels',
  rows: [
    { keys: ['G'], label: 'Grid view (dim city, light the network)' },
    { keys: ['L'], label: 'Grid balance (demand vs supply)' },
    { keys: ['H'], label: 'Headroom heatmap' },
    { keys: ['N'], label: 'N-1 security rings' },
    { keys: ['F'], label: '5-year demand forecast' },
    { keys: ['K'], label: 'Regulatory KPIs / report card' },
    { keys: ['O'], label: 'The network business (cOmpany / directorates)' },
  ],
};

const EDIT_GROUP: Group = {
  title: 'Camera, edit & speed',
  rows: [
    { keys: ['drag'], label: 'Pan the map' },
    { keys: ['scroll', 'pinch'], label: 'Zoom' },
    { keys: ['U'], label: 'Toggle overhead / underground (line tool)' },
    { keys: ['A'], label: 'Toggle auto-connect on placement' },
    { keys: ['Space'], label: 'Hide / show the whole HUD' },
    { keys: ['Shift'], label: 'Collapse / expand all the menus (tap)' },
    { keys: ['P'], label: 'Pause / resume the clock' },
    { keys: ['Ctrl', 'Z'], label: 'Undo' },
    { keys: ['Ctrl', 'Y'], label: 'Redo' },
    { keys: ['?'], label: 'This cheat sheet' },
  ],
};

// Panel-scoped keys: only live while an inspector card is pinned (clicking an
// asset). Mirrors the App.tsx keyboard hook's pinned-panel branch.
const PINNED_GROUP: Group = {
  title: 'Pinned inspector (after clicking an asset)',
  rows: [
    { keys: ['−'], label: 'Smaller — step capacity down (sub MVA / farm MW)' },
    { keys: ['+'], label: 'Larger — step capacity up (sub MVA / farm MW)' },
    { keys: ['Esc'], label: 'Unpin the card · hand the keyboard back to the map' },
  ],
};

// Esc is the universal close — its own row so the priority reads clearly.
const ESC_GROUP: Group = {
  title: 'Escape (closes the topmost open thing)',
  rows: [
    { keys: ['Esc'], label: 'Close a panel/modal → clear a pin → cancel a route → disarm a tool → clear overlays' },
  ],
};

function KeyCap({ k }: { k: string }) {
  const wide = k.length > 2;
  return (
    <kbd
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: wide ? undefined : 22,
        height: 22,
        padding: wide ? '0 7px' : '0 4px',
        borderRadius: 5,
        border: `1px solid ${theme.navyLight}`,
        borderBottom: `2px solid ${theme.navyLight}`,
        background: 'rgba(245, 196, 105, 0.08)',
        color: theme.gold,
        fontFamily: theme.font,
        fontSize: 11,
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      {k}
    </kbd>
  );
}

function GroupBlock({ group }: { group: Group }) {
  if (group.rows.length === 0) return null;
  return (
    <div style={{ breakInside: 'avoid', marginBottom: 12 }}>
      <div
        style={{
          color: theme.slate,
          fontSize: 10,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          marginBottom: 5,
        }}
      >
        {group.title}
      </div>
      {group.rows.map((r, i) => (
        <div
          key={`${group.title}-${i}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            padding: '2px 0',
            fontSize: 12,
          }}
        >
          <span style={{ color: theme.offWhite, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {r.label}
          </span>
          <span style={{ flex: 'none', display: 'flex', gap: 3 }}>
            {r.keys.map((k, j) => (
              <KeyCap key={j} k={k} />
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}

export function HotkeyHelp() {
  const open = useAppStore((s) => s.helpOpen);
  const setOpen = useAppStore((s) => s.setHelpOpen);

  // Escape closes the sheet (the App hook ignores ? while a field has
  // focus; here we just need the local close on Esc, harmless if doubled)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  if (!open) return null;
  const groups = [...buildGroups(), OVERLAY_GROUP, EDIT_GROUP, PINNED_GROUP, ESC_GROUP];

  return (
    <div
      onClick={() => setOpen(false)}
      style={{
        position: 'absolute',
        inset: 0,
        background: `${theme.night}cc`,
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9,
        padding: 12,
      }}
    >
      <div
        role="dialog"
        aria-label="keyboard shortcuts"
        onClick={(e) => e.stopPropagation()}
        style={{
          ...panelStyle,
          width: 'min(680px, 96vw)',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '16px 20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ color: theme.orange, fontWeight: 800, fontSize: 16 }}>
            Keyboard shortcuts
          </div>
          <button
            aria-label="close shortcuts"
            onClick={() => setOpen(false)}
            style={{
              border: 'none',
              background: 'transparent',
              color: theme.slate,
              fontFamily: theme.font,
              fontSize: 15,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ color: theme.slate, fontSize: 11, marginTop: 2, marginBottom: 12 }}>
          Press a key any time the map has focus. Re-press a build key to disarm.
        </div>
        <div
          style={{
            columnWidth: 260,
            columnGap: 28,
          }}
        >
          {groups.map((g) => (
            <GroupBlock key={g.title} group={g} />
          ))}
        </div>
      </div>
    </div>
  );
}
