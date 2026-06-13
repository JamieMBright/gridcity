// Colour system for the clean low-poly look: vivid colour-blocked
// buildings under lofi sunset light. All sprites pull from here so the
// whole world stays in one gamut.

import { hex, type RGBA } from './raster';

export const COLORS = {
  // nature — English green-belt gamut, desaturated to sit inside the lofi
  // dusk light (owner: "less luteous colours… lusher greens for surrey
  // hills… garden grass green… green belt brownfield vibes"). Crops read as
  // muted barley/pasture, never the garish American-farmland yellow.
  grass: hex('#86a958'),
  grassDark: hex('#6f9249'),
  field: hex('#c4b378'), // ripe barley, muted — was a luteous #e3b863
  fieldDark: hex('#ad9c64'),
  rape: hex('#ccc06a'), // oilseed flower, dusted down from neon yellow
  moor: hex('#8a9a6a'), // upland sward: lush green, not rock-brown
  brownfield: hex('#9a9484'), // scrubby concrete-grey green-belt fringe
  treeGreen: hex('#4f9446'),
  treeDeep: hex('#3c7a38'),
  treeLime: hex('#6fab52'),
  trunk: hex('#6f4a33'),
  sand: hex('#e8cf9e'),

  // water — dusty late-light blue, glints catch the sunset (warm, not
  // noon-cyan: the whole gamut stays on the golden-hour ramp)
  water: hex('#4878b8'),
  waterDeep: hex('#345492'),
  waterGlint: hex('#f0c391'),

  // fabric
  road: hex('#5d5a6e'),
  roadDark: hex('#4c4a5c'),
  marking: hex('#e8e2d2'),
  pavement: hex('#cfc7b8'),
  concrete: hex('#b8b2c4'),

  // building walls (vivid colour-block set, per-variant)
  walls: [
    hex('#e8694a'), // coral
    hex('#3f8f8a'), // teal
    hex('#e8a23f'), // mustard
    hex('#d6566e'), // pink-red
    hex('#7a6fae'), // lilac
    hex('#e0d6c2'), // cream
    hex('#c25b3f'), // brick
    hex('#5e8fc2'), // sky blue
  ] as RGBA[],

  // roofs
  roofs: [
    hex('#c9453a'), // red
    hex('#46518f'), // navy-blue
    hex('#7d7494'), // slate
    hex('#b8743f'), // tan
  ] as RGBA[],

  white: hex('#f4f1ea'),
  glassDark: hex('#27324d'),
  glassLit: hex('#ffd277'),
  glassHot: hex('#ffb347'),
  glassSky: hex('#b4b4d8'), // towers reflect the dusk, not a noon sky
  glassSunset: hex('#e8a0a8'),
  steel: hex('#9aa4b5'),
  steelDark: hex('#6e7888'),
  orange: hex('#ff8a1e'),
  greenhouseGlass: hex('#a9d2bb'),
  panel: hex('#3b5089'),
  panelGlint: hex('#7d9bd6'),
} as const;

export function wallColor(variant: number): RGBA {
  return COLORS.walls[variant % COLORS.walls.length] ?? COLORS.walls[0]!;
}

export function roofColor(variant: number): RGBA {
  return COLORS.roofs[variant % COLORS.roofs.length] ?? COLORS.roofs[0]!;
}

/** Parse '#rrggbb' to [r,g,b] (kept for theme interop). */
export function hexToRgb(h: string): [number, number, number] {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}
