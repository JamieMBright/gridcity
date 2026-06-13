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
  // Brand
  navy: '#101630', // deep navy — primary chrome, panels
  navyLight: '#1d2547', // raised panels, hover
  orange: '#ff8a1e', // accents, CTAs, alerts, the vans
  orangeSoft: '#ffb066', // secondary accent, glows
  slate: '#8d97b4', // secondary UI, muted text (AA on navy)
  offWhite: '#f2efe8', // primary text, light surfaces

  // Lofi sunset ambience
  dusk: '#3a2b50', // sunset purple
  sunset: '#e0697a', // dusty pink
  gold: '#f5c469', // golden-hour light
  night: '#0a0e22', // deep cosy night

  // Semantics
  ok: '#7bc47f',
  warn: '#f5c469',
  danger: '#e0697a',

  font: "'Iosevka', 'JetBrains Mono', ui-monospace, 'Cascadia Code', Menlo, monospace",
} as const;

/** Standard floating panel chrome: dusk glass — a navy→purple gradient
 *  with a frosted blur and a warm hairline, so the HUD reads as part of
 *  the golden-hour world instead of flat slabs over it. */
export const panelStyle: React.CSSProperties = {
  background:
    'linear-gradient(168deg, rgba(18, 24, 52, 0.88) 0%, rgba(16, 22, 48, 0.92) 55%, rgba(34, 25, 58, 0.9) 100%)',
  backdropFilter: 'blur(9px)',
  WebkitBackdropFilter: 'blur(9px)',
  border: '1px solid rgba(245, 196, 105, 0.14)',
  borderRadius: 10,
  boxShadow: '0 10px 28px rgba(6, 8, 18, 0.5), inset 0 1px 0 rgba(242, 239, 232, 0.06)',
  color: theme.offWhite,
  fontFamily: theme.font,
  fontSize: 13,
  letterSpacing: 0.2,
};

/** Panel section heading: small caps rhythm shared across the HUD. */
export const headingStyle: React.CSSProperties = {
  color: theme.gold,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1.6,
  textTransform: 'uppercase',
};

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
