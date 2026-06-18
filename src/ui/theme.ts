// ElectriCity design tokens — UK Power Networks-inspired palette with a
// lofi golden-hour cast. Single source of truth for all UI colour. The
// chrome belongs to the same dusk world as the map: deep navy glass,
// warm gold accents, dusty pink alerts.
//
// Contrast discipline (colour-theory pass, 2026-06): every text token is
// checked against the panel navy — offWhite 15.5:1 (AAA), slate 6.1:1
// (AA body), gold 11:1, danger 5.5:1. Hierarchy comes from size/weight,
// never from dropping below 4.5:1 (tests/grade.test.ts pins these).

export const theme = {
  // Brand — the deep blue is colour-matched to the brand assets (the favicon
  // grid-node globe sits on #041133; the title logo's dusk sky reads #040923 /
  // #0e0d27). The app used a lighter, greyer navy (#101630); these align the
  // chrome to the logo + favicon (owner, 2026-06-18).
  navy: '#081333', // deep brand navy — primary chrome, panels (favicon backdrop)
  navyLight: '#16224c', // raised panels, hover
  orange: '#ff8a1e', // accents, CTAs, alerts, the vans
  orangeSoft: '#ffb066', // secondary accent, glows
  slate: '#8d97b4', // secondary UI, muted text (AA on navy)
  offWhite: '#f2efe8', // primary text, light surfaces

  // Lofi sunset ambience
  dusk: '#3a2b50', // sunset purple
  sunset: '#e0697a', // dusty pink
  gold: '#f5c469', // golden-hour light
  night: '#04091e', // deep cosy night (brand logo sky/water)

  // Semantics
  ok: '#7bc47f',
  warn: '#f5c469',
  danger: '#e0697a',

  font: "'Iosevka', 'JetBrains Mono', ui-monospace, 'Cascadia Code', Menlo, monospace",
} as const;

// --- the cohesive rounded-card HUD system (HUD redesign, 2026-06-18) --------
// One designed language for every panel: a soft 15px corner, a faint slate
// hairline, a soft drop-shadow and a slightly more translucent dusk glass so
// the map reads THROUGH the chrome instead of being walled off by it. Bumping
// these tokens propagates the cohesion to every panel that builds on
// panelStyle — the HUD stops reading as a "collection of boxes".

/** Shared corner radius for the rounded-card system. */
export const PANEL_RADIUS = 15;
/** Shared pill radius (stat bar, button clusters) — fully rounded ends. */
export const PILL_RADIUS = 999;

/** Standard floating panel chrome: dusk glass — a navy→purple gradient
 *  with a frosted blur and a warm hairline, so the HUD reads as part of
 *  the golden-hour world instead of flat slabs over it. Softer + lighter
 *  than the old slab so the map breathes underneath (owner: "less
 *  dominating", "stop reading as boxes"). */
export const panelStyle: React.CSSProperties = {
  background:
    'linear-gradient(165deg, rgba(11, 20, 52, 0.80) 0%, rgba(8, 15, 46, 0.84) 58%, rgba(30, 24, 56, 0.82) 100%)',
  backdropFilter: 'blur(13px) saturate(1.05)',
  WebkitBackdropFilter: 'blur(13px) saturate(1.05)',
  border: '1px solid rgba(141, 151, 180, 0.18)',
  borderRadius: PANEL_RADIUS,
  boxShadow:
    '0 14px 34px rgba(5, 7, 16, 0.42), 0 2px 8px rgba(5, 7, 16, 0.28), inset 0 1px 0 rgba(242, 239, 232, 0.05)',
  color: theme.offWhite,
  fontFamily: theme.font,
  fontSize: 13,
  letterSpacing: 0.2,
};

/** A fully-rounded pill container (top stat bar, top-right cluster, the
 *  centred transport bar). Same dusk glass, pill ends. */
export const pillStyle: React.CSSProperties = {
  ...panelStyle,
  borderRadius: PILL_RADIUS,
};

/** A faint inset surface used INSIDE a card for sub-sections (a bill row
 *  group, a chart well, a collapsible body) — reads as recessed glass. */
export const insetStyle: React.CSSProperties = {
  background: 'rgba(6, 11, 30, 0.42)',
  border: '1px solid rgba(141, 151, 180, 0.10)',
  borderRadius: 11,
};

/** Panel section heading: small caps rhythm shared across the HUD. */
export const headingStyle: React.CSSProperties = {
  color: theme.gold,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1.6,
  textTransform: 'uppercase',
};

/** Keyframes for the cohesive HUD: a soft slide-in (collapsible panels +
 *  the inbox attention pulse) and a gentle attention glow. Mounted once
 *  near the HUD root so every panel speaks one motion language. Respects
 *  prefers-reduced-motion. */
export const HUD_KEYFRAMES = `
@keyframes ec-slide-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
@keyframes ec-attn { 0% { box-shadow: 0 0 0 0 rgba(255,138,30,0); } 25% { box-shadow: 0 0 0 3px rgba(255,138,30,0.5); } 100% { box-shadow: 0 0 0 0 rgba(255,138,30,0); } }
@keyframes ec-fade-in { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .ec-anim { animation-duration: 0.001ms !important; } }
`;

// --- colour-blind-aware status colours (#32) ---------------------------------
// theme.ok/warn/danger stay the golden-hour defaults; components that want
// to honour the player's colour-blind mode read them through statusColors()
// instead, which swaps in a deficiency-safe triplet. Re-exported from
// cbPalette so theme.ts stays the one import for chrome colour.
import { statusPalette, type CbMode } from './cbPalette';

export function statusColors(mode: CbMode): { ok: string; warn: string; danger: string } {
  return statusPalette(mode);
}

export function fmtMoneyK(k: number): string {
  if (k >= 1_000_000) return `£${(k / 1_000_000).toFixed(2)}bn`;
  if (k >= 1_000) return `£${(k / 1_000).toFixed(1)}m`;
  return `£${Math.round(k)}k`;
}
