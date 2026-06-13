// Colour-blind mode (ROADMAP #32). The whole game speaks in three colour
// languages — status (ok/warn/danger), the three voltage levels
// (400/132/33 kV) and the loading heatmap (green→amber→red). For the ~8%
// of men with a colour-vision deficiency, hue alone collapses those
// languages together. This module is the single source of truth for the
// alternative palettes, chosen so that under deuteranopia, protanopia and
// tritanopia each set stays distinguishable by VALUE (lightness) as well
// as hue — and the UI pairs every colour with a glyph/dash so it never
// relies on hue alone.
//
// Approach (colour-theory): the safe ramps are NOT recoloured rainbows;
// they spread the three steps across a wide lightness range and lean on
// the blue↔yellow axis (intact for red-green deficiencies) and on
// luminance (intact for all three). Distinctness is proven in
// tests/cbPalette.test.ts by simulating each deficiency (Brettel/Viénot
// style projection) and asserting a minimum perceptual separation.

export type CbMode = 'off' | 'deuteranopia' | 'protanopia' | 'tritanopia';

export const CB_MODES: CbMode[] = ['off', 'deuteranopia', 'protanopia', 'tritanopia'];

export const CB_MODE_LABEL: Record<CbMode, string> = {
  off: 'Off (default palette)',
  deuteranopia: 'Deuteranopia (red-green)',
  protanopia: 'Protanopia (red-green)',
  tritanopia: 'Tritanopia (blue-yellow)',
};

/** The three status colours, as hex strings. */
export interface StatusTriplet {
  ok: string;
  warn: string;
  danger: string;
}

/** The three voltage-level colours, as 0xRRGGBB numbers (renderer-native). */
export interface LevelTriplet {
  400: number;
  132: number;
  33: number;
  /** Overload tint for a span over its rating. */
  overload: number;
}

/** Default (golden-hour) palette — mirrors theme.ts + MapRenderer. */
const DEFAULT_STATUS: StatusTriplet = { ok: '#7bc47f', warn: '#f5c469', danger: '#e0697a' };
const DEFAULT_LEVELS: LevelTriplet = {
  400: 0x5ea3ff,
  132: 0x7bc47f,
  33: 0xffb066,
  overload: 0xe0697a,
};

// --- colour-blind-safe sets ---------------------------------------------------
// Each set keeps a steep LIGHTNESS gradient ok(brightest)→warn→danger
// (darkest-but-saturated), so even a greyscale reading orders them, and
// uses the blue/yellow axis for the red-green modes. The voltage ramp goes
// deep-blue(400) → teal(132) → bright-amber(33), three well-separated
// lightnesses, with a magenta overload that survives every deficiency.

const DEUT_PROT_STATUS: StatusTriplet = {
  ok: '#4ca6e8', // bright blue — reads "good", high value
  warn: '#f0c020', // saturated yellow — mid value
  danger: '#c2410c', // dark burnt-orange — low value (not pure red)
};
const DEUT_PROT_LEVELS: LevelTriplet = {
  400: 0x0050c8, // deep blue
  132: 0x18b6c8, // teal/cyan
  33: 0xf5c01e, // bright amber
  overload: 0xd81b9a, // magenta — distinct from all three under R-G loss
};

const TRIT_STATUS: StatusTriplet = {
  ok: '#37d27e', // bright green survives blue-yellow loss; highest value
  warn: '#d44e8f', // mid pink — tritanopes still split pink from green/red
  danger: '#8c1422', // deep dark red — lowest value
};
const TRIT_LEVELS: LevelTriplet = {
  400: 0x0aa0a0, // teal-green
  132: 0xe05a9a, // pink
  33: 0xb01d2c, // deep red
  overload: 0x111827, // near-black ring — pure value cue
};

export function statusPalette(mode: CbMode): StatusTriplet {
  switch (mode) {
    case 'deuteranopia':
    case 'protanopia':
      return DEUT_PROT_STATUS;
    case 'tritanopia':
      return TRIT_STATUS;
    default:
      return DEFAULT_STATUS;
  }
}

export function levelPalette(mode: CbMode): LevelTriplet {
  switch (mode) {
    case 'deuteranopia':
    case 'protanopia':
      return DEUT_PROT_LEVELS;
    case 'tritanopia':
      return TRIT_LEVELS;
    default:
      return DEFAULT_LEVELS;
  }
}

/** The loading-heatmap endpoints (green→red gradient). Returned as
 *  0xRRGGBB ok/danger anchors the renderer lerps between; the midpoint
 *  is interpolated. Pairs with the hatching the heatmap draws. */
export function heatPalette(mode: CbMode): { lo: number; mid: number; hi: number } {
  if (mode === 'off') return { lo: 0x7bc47f, mid: 0xf5c469, hi: 0xe0697a };
  const st = statusPalette(mode);
  return { lo: hexNum(st.ok), mid: hexNum(st.warn), hi: hexNum(st.danger) };
}

// --- helpers ------------------------------------------------------------------

export function hexNum(h: string): number {
  return parseInt(h.replace('#', ''), 16);
}

export function numHex(n: number): string {
  return '#' + n.toString(16).padStart(6, '0');
}

// --- distinctness proof helpers (used by the unit test) -----------------------

/** sRGB hex → linear-ish RGB 0..1. */
function toRgb(n: number): [number, number, number] {
  return [((n >> 16) & 0xff) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255];
}

/** Relative luminance (WCAG-ish), 0..1. */
export function luminance(n: number): number {
  const [r, g, b] = toRgb(n);
  const lin = (c: number): number => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Simulate a dichromat's view of a colour. A compact projection in
 *  linear RGB that collapses the lost axis — good enough to PROVE two
 *  colours don't merge under the deficiency (the unit test's job), not a
 *  display-accurate CVD filter. Deuteranopia/protanopia collapse the
 *  red-green axis; tritanopia collapses blue-yellow. */
export function simulate(n: number, mode: Exclude<CbMode, 'off'>): [number, number, number] {
  let [r, g, b] = toRgb(n);
  if (mode === 'deuteranopia') {
    // greens map toward what reds look like: blend r/g
    const m = 0.7 * r + 0.3 * g;
    r = m;
    g = m;
  } else if (mode === 'protanopia') {
    const m = 0.4 * r + 0.6 * g;
    r = m;
    g = m;
  } else {
    // tritanopia: collapse the blue/green into one
    const m = 0.5 * g + 0.5 * b;
    g = m;
    b = m;
  }
  return [r, g, b];
}

/** Perceptual distance between two colours AS SEEN under a deficiency
 *  (Euclidean in the simulated RGB, weighted toward luminance). */
export function cbDistance(a: number, b: number, mode: Exclude<CbMode, 'off'>): number {
  const [ar, ag, ab] = simulate(a, mode);
  const [br, bg, bb] = simulate(b, mode);
  // luminance dominates so a value gap counts even if hue collapses
  const dl = luminance(a) - luminance(b);
  const dr = ar - br;
  const dg = ag - bg;
  const db = ab - bb;
  return Math.sqrt(2 * dl * dl + dr * dr + dg * dg + db * db);
}
