// Bespoke ink-contour icon set (owner, 2026-06-13: "I don't like how we
// have used standard emojis for the icons. I want more bespoke signage,
// especially when collapsed on mobile mode").
//
// One pictographic language for the whole HUD, build palette and the
// collapsed mobile rail. Art-is-code: every glyph is a small inline SVG
// drawn in the lofi ink-contour style — a single 1.6px round-joined
// stroke on a 24×24 grid, `currentColor` so the button's colour (and the
// active-state flip to navy) carries straight through. No unicode, no
// emoji. Designed legible down to ~16px on a phone (game-ui-design
// readable-at-size): chunky silhouettes, generous interior space, at most
// one small accent fill.
//
// Doctrine for a new glyph: read the silhouette first (a substation must
// not be mistaken for a battery at 16px), keep strokes ≥1.4px at the
// target size, avoid detail below ~3px, and lean on one recognisable
// real-world referent (a pylon's splayed legs, scales' beam, an inbox
// tray's lip).

import type { CSSProperties } from 'react';

export interface IconProps {
  /** Square px size (defaults to 1em so it scales with font-size). */
  size?: number | string;
  /** Stroke colour; defaults to currentColor (inherits the button). */
  color?: string;
  /** Extra style (e.g. opacity on a disabled control). */
  style?: CSSProperties;
  title?: string;
}

/** Shared <svg> shell: 24-unit viewBox, round caps/joins, no fill unless a
 *  child opts in, colour from currentColor. */
function Svg({
  size = '1em',
  color,
  style,
  title,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={color ?? 'currentColor'}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      focusable="false"
      style={{ display: 'block', flex: 'none', ...style }}
    >
      {title && <title>{title}</title>}
      {children}
    </svg>
  );
}

// --- network kit -------------------------------------------------------------

/** Lightning bolt — energy / grid view / the GRID WIRE mark. */
export function IconBolt(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M13 2 5 13.5h5L11 22l8-11.5h-5z" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** Substation: a fenced transformer compound — twin tanks under a busbar,
 *  on a ground line. Reads as "the box where voltage changes". */
export function IconSubstation(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 20h18" />
      <path d="M5 20v-6h4v6M15 20v-6h4v6" />
      <path d="M7 14V9M17 14V9" />
      <path d="M4 9h16" />
      <circle cx="7" cy="6.5" r="1.6" />
      <circle cx="17" cy="6.5" r="1.6" />
    </Svg>
  );
}

/** Pylon / overhead line: the unmistakable splayed-leg lattice tower with
 *  cross-arms. The signage for "transmission line". */
export function IconPylon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7 21 12 3l5 18" />
      <path d="M9.3 12.5h5.4M8.4 16h7.2" />
      <path d="M5 8.5h14" />
      <path d="M9 21h6" />
    </Svg>
  );
}

/** Cable run / underground line: a wavy conductor between two terminals. */
export function IconCable(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="4" cy="12" r="1.6" />
      <circle cx="20" cy="12" r="1.6" />
      <path d="M5.6 12c2 0 2-4 4-4s2 8 4 8 2-4 4-4" />
    </Svg>
  );
}

// --- generation --------------------------------------------------------------

/** Thermal plant (gas/coal/biomass): a cooling-tower silhouette with a
 *  plume. Differentiated by accent elsewhere; the tower IS "power station". */
export function IconPlant(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 21V11l1.5-3h2L11 11v10" />
      <path d="M5 21h7" />
      <path d="M15 21V8h4v13" />
      <path d="M14 21h6" />
      <path d="M8 5.5c0-1.5 1.5-1.5 1.5-3" />
    </Svg>
  );
}

/** Gas peaker — a single stack with a hot flame tongue. */
export function IconFlame(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3c1.5 3 4 4.5 4 8a4 4 0 0 1-8 0c0-1.5.6-2.6 1.4-3.4C10 9 11 7 12 3z" />
      <path d="M12 19c1.4 0 2.3-.9 2.3-2.2 0-1-.9-1.8-1.4-2.8-.6 1-1.2 1.3-1.6 2C10.7 17.4 11 19 12 19z" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** Solar farm: a tilted PV panel on a post, catching a low sun. */
export function IconSolar(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 14 7 7h9l2 7z" />
      <path d="M8.2 14 9.5 7M12.5 14 13 7M5.8 10.5h11.4" />
      <path d="M11 14v4M8 18h6" />
      <path d="M19 5l1.5-1.5M20 9h2" />
    </Svg>
  );
}

/** Onshore wind: a three-blade turbine on a slim tower. */
export function IconWind(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 13v8M9.5 21h5" />
      <circle cx="12" cy="11" r="1.3" />
      <path d="M12 9.7 12 3M13.1 11.8l5.6 3.2M10.9 11.8l-5.6 3.2" />
    </Svg>
  );
}

/** Offshore wind: a turbine standing in water (wave line at the base). */
export function IconWindSea(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="9" r="1.2" />
      <path d="M12 7.8 12 2.5M13 9.6l5 3M11 9.6l-5 3" />
      <path d="M12 10.2V18" />
      <path d="M3 19c1.5 0 1.5-1.2 3-1.2S7.5 19 9 19s1.5-1.2 3-1.2 1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2" />
    </Svg>
  );
}

/** Tidal stream — a submerged rotor under a wave crest. */
export function IconTidal(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 7c1.6 0 1.6-1.6 3.2-1.6S7.8 7 9.4 7 11 5.4 12.6 5.4" />
      <circle cx="12" cy="15" r="3.2" />
      <path d="M12 11.8V18.2M9 13.3l6 3.4M9 16.7l6-3.4" />
      <path d="M19 14h2M19 17h2" />
    </Svg>
  );
}

/** Nuclear — the trefoil hazard ring, simplified to read at size. */
export function IconNuclear(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <path d="M12 10.4V4.2M13.4 13.2l5.2 3M10.6 13.2l-5.2 3" strokeWidth="2.4" />
    </Svg>
  );
}

/** Battery storage: a cell with terminals and a charge bar. */
export function IconBattery(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="4" y="7" width="14" height="10" rx="1.6" />
      <path d="M18 10h2v4h-2" />
      <path d="M10.5 9.5 8 13h3l-1 3 3.5-4h-3z" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** Coal — a heaped pile of lumps. */
export function IconCoal(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 19h18" />
      <path d="M5 19c0-3 2-5 4-5s2 2 4 2 2-3 4-3 4 2 4 6z" />
      <path d="M9 14l1.5 2M14 14l1 2" />
    </Svg>
  );
}

/** Interconnector — a plug bridging two grids (a sea-cable link abroad). */
export function IconInterconnector(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 12h6M15 12h6" />
      <rect x="9" y="8.5" width="6" height="7" rx="1.4" />
      <path d="M11 6.5v2M13 6.5v2" />
      <path d="M11 7.5h2" />
    </Svg>
  );
}

/** Hydrogen electrolyser — an H₂ molecule (two bonded atoms). */
export function IconHydrogen(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="8" cy="12" r="3.2" />
      <circle cx="16" cy="12" r="3.2" />
      <path d="M11.2 12h1.6" />
    </Svg>
  );
}

/** Capacitor bank — two facing plates (the schematic capacitor). */
export function IconCapacitor(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3v6M12 15v6" />
      <path d="M5 9h14M5 15h14" />
    </Svg>
  );
}

// --- substation tiers (the small signage) -----------------------------------

/** Bulk supply point — a tall transformer stack (highest tier). */
export function IconBSP(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 21h16" />
      <rect x="7" y="7" width="10" height="14" rx="1.4" />
      <path d="M9.5 7V4h5v3" />
      <path d="M9.5 11h5M9.5 14.5h5M9.5 18h5" />
    </Svg>
  );
}

/** Grid substation — a transformer tank with bushings. */
export function IconGridSub(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="6" y="9" width="12" height="11" rx="1.4" />
      <path d="M9 9V6.5M12 9V5.5M15 9V6.5" />
      <path d="M9 13.5h6" />
    </Svg>
  );
}

/** Distribution substation — a kiosk box on the pavement. */
export function IconDistSub(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 20h16" />
      <rect x="7" y="8" width="10" height="12" rx="1" />
      <path d="M7 8l5-3 5 3" />
      <path d="M11 13h2v3h-2z" />
    </Svg>
  );
}

/** Pole transformer — a can hung on a wood pole. */
export function IconPole(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M11 21V4M8 6h8" />
      <rect x="12.5" y="9" width="5" height="6.5" rx="1.4" />
      <path d="M11 9h1.5M11 12.5h1.5" />
    </Svg>
  );
}

/** Underground vault substation — a manhole / chamber below the kerb. */
export function IconVault(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 9h18" />
      <path d="M6 9v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9" />
      <circle cx="12" cy="14" r="2.2" />
      <path d="M8 6.5h8" />
    </Svg>
  );
}

// --- operations --------------------------------------------------------------

/** Field van / fleet / depot — a panel van side profile. */
export function IconVan(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 16V8h11l4 3.5V16" />
      <path d="M14 8v3.5h4" />
      <circle cx="7" cy="17" r="1.7" />
      <circle cx="16" cy="17" r="1.7" />
      <path d="M3 16h2.3M8.7 16h5.6M17.7 16H21" />
    </Svg>
  );
}

/** Depot — a shed/garage with a roller door. */
export function IconDepot(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 20V10l8-4 8 4v10" />
      <path d="M3 20h18" />
      <rect x="9" y="13" width="6" height="7" rx="0.6" />
      <path d="M9 16h6" />
    </Svg>
  );
}

/** Demolish — a pickaxe striking ground. */
export function IconDemolish(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 7c4-2.5 12-2.5 16 0" />
      <path d="M12 6.5 6 19" />
      <path d="M4 7c1.5 1 2.5 2.5 3 4M20 7c-1.5 1-2.5 2.5-3 4" />
    </Svg>
  );
}

/** Inspect / search — a magnifier. */
export function IconInspect(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="M15 15l5 5" />
    </Svg>
  );
}

// --- HUD controls ------------------------------------------------------------

/** Balance scales — demand vs supply. */
export function IconScales(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 4v15M7 19h10" />
      <path d="M5 7h14M5 7l8-1.5M19 7l-6-1.5" />
      <path d="M5 7 3 12.5h4zM19 7l-2 5.5h4z" />
      <path d="M3 12.5a2 2 0 0 0 4 0M17 12.5a2 2 0 0 0 4 0" />
    </Svg>
  );
}

/** Headroom — stacked-bars heatmap (spare capacity). */
export function IconHeadroom(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2" />
      <path d="M9 3.5v17M15 3.5v17M3.5 9h17M3.5 15h17" />
      <rect x="3.5" y="15" width="5.5" height="5.5" fill="currentColor" stroke="none" opacity="0.45" />
    </Svg>
  );
}

/** N-1 security — a shield with a single break that still holds. */
export function IconShield(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3 5 6v6c0 4 3 6.5 7 9 4-2.5 7-5 7-9V6z" />
      <path d="M9.5 12.5 11.5 14.5 15 10" />
    </Svg>
  );
}

/** Forecast — an hourglass (years until a transformer runs out of road). */
export function IconHourglass(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 3h12M6 21h12" />
      <path d="M7 3c0 5 5 6.5 5 9s-5 4-5 9M17 3c0 5-5 6.5-5 9s5 4 5 9" />
      <path d="M9 18.5c0-1.5 3-2.5 3-2.5s3 1 3 2.5z" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** Report card / RIIO / KPIs — a clipboard with rows + a tick. */
export function IconReport(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3h6v1" />
      <path d="M8 9.5l1.5 1.5L12 8.5" />
      <path d="M14 10h2M8 14h8M8 17h6" />
    </Svg>
  );
}

/** Directorates / the company — an office building. */
export function IconBuilding(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 21V6l8-3 8 3v15" />
      <path d="M3 21h18" />
      <path d="M8 9h2M14 9h2M8 13h2M14 13h2M8 17h2M14 17h2" />
    </Svg>
  );
}

/** Bill / money — a banknote with a £. */
export function IconBill(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M9.5 15c1.8 0 1.5-1.5 1.5-3.2 0-1.6-.3-3.3 1.4-3.3 1 0 1.6.6 1.6.6" />
      <path d="M8.5 12.2h3.2M8.5 15h4.6" />
    </Svg>
  );
}

/** Inbox / applications & tenders — a tray with an arrow dropping in. */
export function IconInbox(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 13l2.5-7h11L20 13" />
      <path d="M4 13v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4h-5a2 2 0 0 1-4 0z" />
      <path d="M12 3v5M9.7 6 12 8.3 14.3 6" />
    </Svg>
  );
}

/** Alerts / event log — a scroll/ledger. */
export function IconLedger(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 3h12v15a3 3 0 0 1-3 3H7a3 3 0 0 1-1-5.8" />
      <path d="M15 21a3 3 0 0 0 3-3" />
      <path d="M9 7h6M9 10.5h6M9 14h4" />
    </Svg>
  );
}

/** Save slot — a floppy disk (the universal save mark, drawn in line). */
export function IconSave(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 4h11l3 3v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
      <path d="M8 4v5h7V4" />
      <rect x="8" y="13" width="8" height="6" rx="0.5" />
    </Svg>
  );
}

/** Sound on — a speaker with two waves. */
export function IconSoundOn(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 9v6h3l5 4V5L7 9z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M17.8 6.2a8 8 0 0 1 0 11.6" />
    </Svg>
  );
}

/** Sound off — speaker with a cross. */
export function IconSoundOff(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 9v6h3l5 4V5L7 9z" />
      <path d="M16 9.5l5 5M21 9.5l-5 5" />
    </Svg>
  );
}

/** Help — a question disc. */
export function IconHelp(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.5 9.5c0-1.6 1.2-2.6 2.6-2.6s2.5 1 2.5 2.4c0 1.8-2.4 2-2.4 3.6" />
      <circle cx="12" cy="16.3" r="0.4" fill="currentColor" stroke="currentColor" strokeWidth="1.2" />
    </Svg>
  );
}

// --- time / skips ------------------------------------------------------------

/** Skip-by-duration — a fast-forward bar to a wall, with the duration
 *  label rendered beside it by the caller (we draw the ⏭ mark). */
export function IconSkip(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 5l7 7-7 7zM13 5l7 7-7 7z" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** Skip-to-event — fast-forward to a flag/bang. */
export function IconSkipEvent(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 5l6 7-6 7z" fill="currentColor" stroke="none" />
      <path d="M14 3v18" />
      <path d="M14 4h5l-1.5 3L19 10h-5" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** Undo — a curved back-arrow. */
export function IconUndo(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M8 7 4 11l4 4" />
      <path d="M4 11h9a5 5 0 0 1 0 10h-3" />
    </Svg>
  );
}

/** Redo — a curved forward-arrow. */
export function IconRedo(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M16 7l4 4-4 4" />
      <path d="M20 11h-9a5 5 0 0 0 0 10h3" />
    </Svg>
  );
}

/** Collapse the chrome to the icon rail — chevrons pulling inward. */
export function IconCollapse(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M11 8 7 12l4 4M19 8l-4 4 4 4" />
      <path d="M7 12h8" />
    </Svg>
  );
}

/** Expand the chrome back to the full bar — chevrons pushing outward. */
export function IconExpand(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9 8l-4 4 4 4M15 8l4 4-4 4" />
      <path d="M5 12h14" />
    </Svg>
  );
}

/** Open the full build palette (the » affordance). */
export function IconMenu(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 7h16M4 12h16M4 17h10" />
    </Svg>
  );
}

// --- shared registries: one icon per build tool ------------------------------

export type IconComponent = (p: IconProps) => JSX.Element;

/** The bespoke glyph for each generator type — shared by the build palette
 *  and the collapsed mobile rail so the signage never diverges. */
export const GEN_ICONS: Record<string, IconComponent> = {
  gasCCGT: IconPlant,
  gasPeaker: IconFlame,
  solarFarm: IconSolar,
  windOnshore: IconWind,
  windOffshore: IconWindSea,
  tidal: IconTidal,
  biomass: IconPlant,
  nuclear: IconNuclear,
  battery: IconBattery,
  coal: IconCoal,
  interconnector: IconInterconnector,
  electrolyser: IconHydrogen,
};

/** The bespoke glyph for each substation tier. */
export const SUB_ICONS: Record<string, IconComponent> = {
  bulk: IconBSP,
  grid: IconGridSub,
  dist: IconDistSub,
  pole: IconPole,
  vault: IconVault,
  capbank: IconCapacitor,
};
