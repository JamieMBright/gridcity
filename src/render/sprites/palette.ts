// Colour system for the clean low-poly look: vivid colour-blocked
// buildings under lofi sunset light. All sprites pull from here so the
// whole world stays in one gamut.

import { hex, type RGBA } from './raster';

// COLORS is the single global gamut every sprite reads at BAKE time. Most
// tokens are stable London defaults; the TERRAIN and SKYLINE groups below are
// *mutable* so a generated city can wear its own land + sky before the atlas
// is baked (sunset-blue Sydney harbour, drab NYC concrete, dusty Cairo sand…).
// applyCityFabric() in buildingSprites.ts pushes a city's values in via
// setEnvPalette(); the un-set / London path keeps these exact literals, so the
// live game's atlas stays byte-identical. NOTE: this object is intentionally
// NOT `as const` — the env tokens are reassigned per city.
interface Palette {
  // nature / terrain (mutable per city)
  grass: RGBA; grassDark: RGBA; field: RGBA; fieldDark: RGBA;
  rape: RGBA; moor: RGBA; brownfield: RGBA;
  treeGreen: RGBA; treeDeep: RGBA; treeLime: RGBA; trunk: RGBA;
  sand: RGBA; soil: RGBA; marsh: RGBA; aridSand: RGBA; rock: RGBA;
  water: RGBA; waterDeep: RGBA; waterGlint: RGBA;
  // fabric / fixed
  road: RGBA; roadDark: RGBA; marking: RGBA; pavement: RGBA; concrete: RGBA;
  walls: RGBA[]; roofs: RGBA[];
  white: RGBA;
  // skyline / glass (mutable per city)
  glassDark: RGBA; glassLit: RGBA; glassHot: RGBA; glassSky: RGBA; glassSunset: RGBA;
  steel: RGBA; steelDark: RGBA;
  orange: RGBA; greenhouseGlass: RGBA; panel: RGBA; panelGlint: RGBA;
}
export const COLORS: Palette = {
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
  // bare earth: ploughed-field soil + estuary marsh, plus an arid sand/rock
  // pair for desert cities. London defaults match the values formerly
  // hard-coded inside groundPloughTile / groundMarshTile (byte-identical).
  soil: hex('#8a6242'),
  marsh: hex('#7d8a4e'),
  aridSand: hex('#d8b777'), // exposed desert ground (overridden per city)
  rock: hex('#9a8f82'), // dry rock / cliff (overridden per city)

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
};

export function wallColor(variant: number): RGBA {
  return activeWalls[variant % activeWalls.length] ?? activeWalls[0]!;
}

export function roofColor(variant: number): RGBA {
  return activeRoofs[variant % activeRoofs.length] ?? activeRoofs[0]!;
}

// --- per-city building colourway -------------------------------------------
// The wall/roof rotations are swappable so a generated city can wear its own
// architecture (London brick vs Paris cream limestone + grey zinc mansard,
// etc.) from the SAME sprite shapes. Defaults to London, so the live game's
// atlas is byte-identical unless a city explicitly opts in.

let activeWalls: RGBA[] = COLORS.walls;
let activeRoofs: RGBA[] = COLORS.roofs;

export function setWallRoofPalette(walls: RGBA[], roofs: RGBA[]): void {
  activeWalls = walls;
  activeRoofs = roofs;
}

// --- per-city TERRAIN + SKYLINE palette ------------------------------------
// Tile colour carries a city's feel more than its bricks do (owner: "TERRAIN
// is perhaps more important for tile colours"). These are the mutable tokens
// applyCityFabric() overwrites before the bake so each city's ground, water,
// vegetation and tower-glass read as ITSELF. Every field is optional — an
// omitted token keeps its London default, so a partial spec is safe and the
// un-set path stays byte-identical.
export interface EnvPalette {
  // terrain / ground
  grass?: RGBA; grassDark?: RGBA; field?: RGBA; fieldDark?: RGBA;
  rape?: RGBA; moor?: RGBA; brownfield?: RGBA;
  treeGreen?: RGBA; treeDeep?: RGBA; treeLime?: RGBA;
  sand?: RGBA; soil?: RGBA; marsh?: RGBA; aridSand?: RGBA; rock?: RGBA;
  water?: RGBA; waterDeep?: RGBA; waterGlint?: RGBA;
  pavement?: RGBA; concrete?: RGBA;
  // skyline / glass + metalwork
  glassDark?: RGBA; glassLit?: RGBA; glassHot?: RGBA; glassSky?: RGBA; glassSunset?: RGBA;
  steel?: RGBA; steelDark?: RGBA;
}

// The full set of mutable env tokens, captured from the London defaults at
// module load. setEnvPalette() restores from this snapshot first so switching
// cities in one process (e.g. a tool baking several maps) never leaks the
// previous city's terrain, and an empty/partial spec always lands on a clean
// London base.
const ENV_TOKENS = [
  'grass', 'grassDark', 'field', 'fieldDark', 'rape', 'moor', 'brownfield',
  'treeGreen', 'treeDeep', 'treeLime', 'sand', 'soil', 'marsh', 'aridSand', 'rock',
  'water', 'waterDeep', 'waterGlint', 'pavement', 'concrete',
  'glassDark', 'glassLit', 'glassHot', 'glassSky', 'glassSunset', 'steel', 'steelDark',
] as const;
const LONDON_ENV: Record<string, RGBA> = (() => {
  const src = COLORS as unknown as Record<string, RGBA>;
  const snap: Record<string, RGBA> = {};
  for (const k of ENV_TOKENS) snap[k] = [...src[k]!] as RGBA;
  return snap;
})();

/** Push a city's terrain + skyline tokens into the global gamut before bake.
 *  Restores the London baseline first (so partial specs and city-switching are
 *  clean), then overlays the tokens present in `env`. Mutates COLORS in place
 *  (every sprite reads COLORS at bake time). Called with `{}` for London/the
 *  default, which restores the exact literals → byte-identical atlas. */
export function setEnvPalette(env: EnvPalette): void {
  const dst = COLORS as unknown as Record<string, RGBA>;
  for (const k of ENV_TOKENS) dst[k] = [...LONDON_ENV[k]!] as RGBA;
  for (const k of Object.keys(env) as (keyof EnvPalette)[]) {
    const v = env[k];
    if (v) dst[k] = v;
  }
}


/** Parse '#rrggbb' to [r,g,b] (kept for theme interop). */
export function hexToRgb(h: string): [number, number, number] {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}
