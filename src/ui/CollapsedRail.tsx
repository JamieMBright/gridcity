// CollapsedRail — the slim ICON-ONLY perimeter rails for the COLLAPSED
// desktop HUD (owner, 2026-06-18, with concept art). When the player
// collapses the HUD (hudCollapsed), the wide labelled BuildPalette + the
// overlay buttons in the bottom bar give way to two slim vertical rounded
// pills hugging the screen edges:
//
//   LEFT  — the build tools (generation · substations · lines · ops),
//           icon-only, with the EXPAND chevron at the foot.
//   RIGHT — the map/overlay toggles (grid view · headroom · N-1 · forecast
//           · balance · RIIO …), icon-only, with the COLLAPSE chevron.
//
// THE CORE ASK (owner): each icon shows its HOTKEY beside it in a small
// OFF-WHITE font, unobtrusive but readable — so the collapsed rail teaches
// the keyboard while it declutters. The build-tool keys come straight from
// hotkeyLabel() (the same source the expanded palette's chips use, so they
// can never drift); the overlay keys are the single letters the App
// keyboard handler binds (G/H/N/F/B/K…).
//
// Art-is-code + cohesion: the rails reuse the bespoke ink-contour glyphs
// from icons.tsx and the dusk-glass pill chrome from theme.ts, so the
// collapsed HUD reads as the SAME golden-hour world as everything else —
// rounded pills, not boxes. Reused (not duplicated) from the full palette:
// the icon registries and the hotkey map; a tiny compact button is defined
// here so BuildPalette.tsx stays untouched.

import { hotkeyLabel } from '../app/hotkeys';
import { type GenType, type SubType } from '../sim/catalog';
import { useAppStore, type Tool } from '../app/store';
import { useUnlockGate } from './unlocks';
import { pillStyle, theme } from './theme';
import {
  GEN_ICONS,
  IconBolt,
  IconDemolish,
  IconDepot,
  IconExpand,
  IconHeadroom,
  IconHourglass,
  IconInspect,
  IconReport,
  IconScales,
  IconShield,
  SUB_ICONS,
  type IconComponent,
} from './icons';

// --- the slim-rail building blocks ------------------------------------------

/** Off-white, small, unobtrusive hotkey label sitting next to a glyph
 *  (owner: "the hotkey displayed next to each icon ... off white in small
 *  font"). On the active (orange) button it flips to navy so it stays
 *  legible against the fill. A fixed width keeps every key column aligned. */
function HotkeyTag({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      aria-hidden
      style={{
        flex: 'none',
        width: 9,
        textAlign: 'center',
        fontFamily: theme.font,
        fontSize: 9,
        lineHeight: 1,
        fontWeight: 600,
        letterSpacing: '0.02em',
        // off-white, gently dimmed so it reads as a hint not a label; navy
        // on the active fill so it never washes out
        color: active ? theme.navy : theme.offWhite,
        opacity: active ? 0.85 : 0.62,
      }}
    >
      {label}
    </span>
  );
}

/** One compact rail button: a centred glyph (or a kV text badge) with its
 *  hotkey tag tucked beside it. ~30px tall so a full build set still fits a
 *  laptop column; the whole row highlights orange when its tool is armed. */
function RailButton({
  Icon,
  text,
  textColor,
  hotkey,
  active,
  label,
  spot,
  onClick,
}: {
  Icon?: IconComponent | undefined;
  text?: string | undefined;
  textColor?: string | undefined;
  hotkey?: string | undefined;
  active: boolean;
  label: string;
  spot?: string | undefined;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      title={hotkey ? `${label} (${hotkey})` : label}
      data-spot={spot}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        width: '100%',
        padding: '4px 5px',
        borderRadius: 8,
        border: 'none',
        background: active ? theme.orange : 'transparent',
        color: active ? theme.navy : theme.offWhite,
        fontFamily: theme.font,
        cursor: 'pointer',
      }}
    >
      <span style={{ flex: 'none', display: 'flex', width: 20, justifyContent: 'center' }}>
        {Icon ? (
          <Icon size={19} />
        ) : (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.01em',
              color: active ? theme.navy : (textColor ?? theme.offWhite),
            }}
          >
            {text}
          </span>
        )}
      </span>
      {/* the hotkey column is always reserved (even when a tool has no key)
          so every glyph lines up in one tidy vertical rhythm */}
      <HotkeyTag label={hotkey ?? ''} active={active} />
    </button>
  );
}

/** The slim vertical pill shell shared by both rails — dusk-glass, fully
 *  rounded, scrolls inside itself if a long set overflows a short window. */
function RailShell({
  side,
  children,
}: {
  side: 'left' | 'right';
  children: React.ReactNode;
}) {
  return (
    <div
      data-tour={side === 'left' ? 'palette' : undefined}
      style={{
        ...pillStyle,
        pointerEvents: 'auto',
        // the pill hugs its own edge; the grid track already aligns it
        alignSelf: side === 'left' ? 'flex-start' : 'flex-end',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 1,
        padding: '6px 4px',
        // a comfortable slim width: a 19px glyph + a 9px key + gaps/padding
        width: 52,
        maxHeight: '100%',
        overflowY: 'auto',
        overscrollBehavior: 'contain',
      }}
    >
      {children}
    </div>
  );
}

/** A faint hairline divider between tool families inside a rail. */
function RailDivider() {
  return (
    <span
      aria-hidden
      style={{
        height: 1,
        margin: '3px 6px',
        background: 'rgba(141, 151, 180, 0.18)',
        flex: 'none',
      }}
    />
  );
}

// --- LEFT rail: the build tools ---------------------------------------------

const GEN_ORDER: Array<{ gen: GenType; label: string }> = [
  { gen: 'gasCCGT', label: 'Gas CCGT' },
  { gen: 'gasPeaker', label: 'Gas peaker' },
  { gen: 'solarFarm', label: 'Solar farm' },
  { gen: 'windOnshore', label: 'Onshore wind' },
  { gen: 'windOffshore', label: 'Offshore wind' },
  { gen: 'tidal', label: 'Tidal stream' },
  { gen: 'biomass', label: 'Biomass CHP' },
  { gen: 'nuclear', label: 'Nuclear' },
  { gen: 'battery', label: 'Battery' },
  { gen: 'coal', label: 'Coal station' },
  { gen: 'interconnector', label: 'Interconnector' },
  { gen: 'electrolyser', label: 'Hydrogen electrolyser' },
];

const SUB_ORDER: Array<{ sub: SubType; label: string }> = [
  { sub: 'bulk', label: 'Bulk supply point' },
  { sub: 'grid', label: 'Grid substation' },
  { sub: 'dist', label: 'Distribution sub' },
  { sub: 'pole', label: 'Pole transformer' },
  { sub: 'vault', label: 'Underground sub' },
  { sub: 'capbank', label: 'Capacitor bank' },
];

// kV line levels keep the voltage colour as their badge (matches the map
// legend); the numeric badge IS the signage, so no separate glyph.
const LINE_LEVELS: Array<{ level: 400 | 132 | 33; color: string }> = [
  { level: 400, color: theme.sunset },
  { level: 132, color: theme.orange },
  { level: 33, color: theme.gold },
];

function sameTool(a: Tool, b: Tool): boolean {
  if (a.t !== b.t) return false;
  if (a.t === 'gen' && b.t === 'gen') return a.gen === b.gen;
  if (a.t === 'sub' && b.t === 'sub') return a.sub === b.sub;
  if (a.t === 'line' && b.t === 'line') return a.level === b.level;
  return true;
}

function spotKey(t: Tool): string {
  if (t.t === 'gen') return `gen:${t.gen}`;
  if (t.t === 'sub') return `sub:${t.sub}`;
  if (t.t === 'line') return `line:${t.level}`;
  return t.t;
}

/** The collapsed LEFT rail: every build tool as a slim icon row with its
 *  hotkey beside it, plus the expand-back chevron at the foot. */
export function CollapsedBuildRail() {
  const tool = useAppStore((s) => s.tool);
  const setTool = useAppStore((s) => s.setTool);
  const setCollapsed = useAppStore((s) => s.setHudCollapsed);
  const gate = useUnlockGate();
  const build = tool.t === 'line' ? tool.build : 'overhead';

  const arm = (t: Tool): void => setTool(sameTool(tool, t) ? { t: 'inspect' } : t);

  const gens = GEN_ORDER.filter((g) => gate.tool({ t: 'gen', gen: g.gen }));
  const subs = SUB_ORDER.filter((s) => gate.tool({ t: 'sub', sub: s.sub }));
  const levels = LINE_LEVELS.filter((l) => gate.tool({ t: 'line', level: l.level, build }));
  const showDepot = gate.tool({ t: 'depot' });

  const Tool = (
    t: Tool,
    label: string,
    Icon?: IconComponent,
    badge?: { text: string; color: string },
  ): React.ReactNode => (
    <RailButton
      key={spotKey(t)}
      Icon={Icon}
      text={badge?.text}
      textColor={badge?.color}
      hotkey={hotkeyLabel(t)}
      active={sameTool(tool, t)}
      label={label}
      spot={spotKey(t)}
      onClick={() => {
        if (t.t === 'line') {
          // keep the player's overhead/underground choice when switching kV
          arm(sameTool(tool, t) ? { t: 'inspect' } : { t: 'line', level: t.level, build });
        } else {
          arm(t);
        }
      }}
    />
  );

  return (
    <RailShell side="left">
      {/* inspect always available */}
      {Tool({ t: 'inspect' }, 'Inspect', IconInspect)}
      {gens.length > 0 && <RailDivider />}
      {gens.map((g) => Tool({ t: 'gen', gen: g.gen }, g.label, GEN_ICONS[g.gen]))}
      {subs.length > 0 && <RailDivider />}
      {subs.map((s) => Tool({ t: 'sub', sub: s.sub }, s.label, SUB_ICONS[s.sub]))}
      {levels.length > 0 && <RailDivider />}
      {levels.map((l) =>
        Tool({ t: 'line', level: l.level, build }, `${l.level} kV line`, undefined, {
          text: String(l.level),
          color: l.color,
        }),
      )}
      <RailDivider />
      {showDepot && Tool({ t: 'depot' }, 'Field depot', IconDepot)}
      {Tool({ t: 'demolish' }, 'Demolish', IconDemolish)}
      <RailDivider />
      {/* expand back to the full labelled HUD */}
      <RailButton
        Icon={IconExpand}
        active={false}
        label="Expand the HUD to the full desktop layout"
        onClick={() => setCollapsed(false)}
      />
    </RailShell>
  );
}

// --- RIGHT rail: the map / overlay toggles ----------------------------------

/** One overlay toggle's wiring: store flag + setter + the single letter the
 *  keyboard handler binds (App.useKeyboard). */
interface OverlayDef {
  key: string;
  Icon: IconComponent;
  label: string;
  active: (s: ReturnType<typeof useAppStore.getState>) => boolean;
  toggle: (s: ReturnType<typeof useAppStore.getState>) => void;
  unlock?: string;
}

const OVERLAYS: OverlayDef[] = [
  {
    key: 'G',
    Icon: IconBolt,
    label: 'Grid view: dim the city, highlight the network',
    active: (s) => s.gridView,
    toggle: (s) => s.setGridView(!s.gridView),
  },
  {
    key: 'H',
    Icon: IconHeadroom,
    label: 'Headroom heatmap: corridors by spare capacity',
    active: (s) => s.headroom,
    toggle: (s) => s.setHeadroom(!s.headroom),
    unlock: 'hud:headroom',
  },
  {
    key: 'N',
    Icon: IconShield,
    label: 'N-1 security: green survives any single failure',
    active: (s) => s.n1,
    toggle: (s) => s.setN1(!s.n1),
    unlock: 'hud:n1',
  },
  {
    key: 'F',
    Icon: IconHourglass,
    label: '5-year demand forecast: years until each transformer overloads',
    active: (s) => s.forecastOn,
    toggle: (s) => s.setForecastOn(!s.forecastOn),
    unlock: 'hud:forecast',
  },
  {
    // grid balance moved off B (now the demolish build tool) to L in the
    // Wave-I keymap fix; the rail shows the live key.
    key: 'L',
    Icon: IconScales,
    label: 'Grid balance: demand vs supply, whole map + per council',
    active: (s) => s.balanceOpen,
    toggle: (s) => s.setBalanceOpen(!s.balanceOpen),
    unlock: 'hud:balance',
  },
  {
    key: 'K',
    Icon: IconReport,
    label: 'Regulatory KPIs and report card',
    active: (s) => s.kpiOpen,
    toggle: (s) => s.setKpiOpen(!s.kpiOpen),
    unlock: 'hud:kpi',
  },
];

/** The collapsed RIGHT rail: the map overlays + report dashboards as slim
 *  icon rows, each with its keyboard letter beside it. */
export function CollapsedOverlayRail() {
  // subscribe to the toggles this rail reflects so the active state stays live
  const gridView = useAppStore((s) => s.gridView);
  const headroom = useAppStore((s) => s.headroom);
  const n1 = useAppStore((s) => s.n1);
  const forecastOn = useAppStore((s) => s.forecastOn);
  const balanceOpen = useAppStore((s) => s.balanceOpen);
  const kpiOpen = useAppStore((s) => s.kpiOpen);
  const setCollapsed = useAppStore((s) => s.setHudCollapsed);
  const gate = useUnlockGate();
  // a stable lookup so the def.active(state) calls below read live values
  const live: Record<string, boolean> = {
    G: gridView,
    H: headroom,
    N: n1,
    F: forecastOn,
    L: balanceOpen,
    K: kpiOpen,
  };
  const shown = OVERLAYS.filter((o) => !o.unlock || !gate.active || gate.has(o.unlock));
  if (shown.length === 0) return null;

  return (
    <RailShell side="right">
      {shown.map((o) => (
        <RailButton
          key={o.key}
          Icon={o.Icon}
          hotkey={o.key}
          active={live[o.key] ?? false}
          label={o.label}
          onClick={() => o.toggle(useAppStore.getState())}
        />
      ))}
      <RailDivider />
      {/* collapse chevron mirrors the concept's « at the right-rail foot;
          it expands the HUD back (the left rail carries the same affordance) */}
      <RailButton
        Icon={IconExpand}
        active={false}
        label="Expand the HUD to the full desktop layout"
        onClick={() => setCollapsed(false)}
      />
    </RailShell>
  );
}
