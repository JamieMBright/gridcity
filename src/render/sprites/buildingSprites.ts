// Building tiles in the clean low-poly style: colour-blocked walls, white
// frames and floor bands, gable/hip roofs, faceted garden trees, soft cast
// shadows, and warm windows that glow against the dusk. Variants rotate
// wall/roof colours so streets feel hand-placed, never tiled. Floors are
// TRANSPARENT — the ground pass supplies grass/pavement beneath, with the
// road ribbons drawn between the two passes.

import { Rng } from '../../sim/rng';
import { INK, INK_W, Iso, lit, P, shaded, top } from './iso';
import { COLORS, type EnvPalette, roofColor, setEnvPalette, setWallRoofPalette, wallColor } from './palette';
import { alpha, darken, hex, lighten, type RGBA } from './raster';

function glass(rng: Rng, litP: number): RGBA {
  // the city glows at dusk: most windows have somebody home
  const p = Math.min(0.92, litP + 0.24);
  return rng.chance(p) ? (rng.chance(0.4) ? COLORS.glassHot : COLORS.glassLit) : COLORS.glassDark;
}

// Building fabric: London's Victorian default (brick reds/browns, render and
// pebbledash, slate roofs). These are `let` so a generated city can swap the
// whole colourway (e.g. Paris: cream limestone + grey zinc mansard) via
// applyCityFabric() before the atlas is baked — London stays the default, so
// the live game's atlas is unchanged unless a city opts in.
let BRICK_RED = hex('#a64b37');
let BRICK_BROWN = hex('#8a5240');
let BRICK_ORANGE = hex('#b5664a');
let RENDER_CREAM = hex('#ddd2bc');
let PEBBLEDASH = hex('#c2b89f');
let SLATE = hex('#6e6884');
let SLATE_DARK = hex('#575d78');
let TILE_RED = hex('#8f4438');
let POT_CLAY = hex('#9c5a3a');
let BUFF_BRICK = hex('#c8a878');
/** Roof FORM, not just colour: London/Paris/Sydney/Berlin pitch their domestic
 *  roofs; New York/Cairo/Athens/Shanghai/Hong Kong are flat-roofed (parapets,
 *  water tanks). This is what stops every city reading as "London in a recolour
 *  — a flat skyline vs a pitched one is the strongest style tell. */
let FLAT_ROOF = false;

/** Built-in city colourways. Each city wears its own building stock so a
 *  generated map never reads as "London in a different shape": London's
 *  Victorian brick, Paris's Haussmann limestone+zinc, New York brownstone+
 *  glass, Sydney sandstone+terracotta, Berlin grey render+ochre, Shanghai/
 *  Hong Kong concrete+glass, Cape Town's Bo-Kaap pastels, Cairo's sand+red
 *  brick, Athens's whitewash+terracotta. `walls`/`roofs` feed the tower/office
 *  rotations; the rest recolour the low domestic fabric. London is the default
 *  so the live game's atlas is unchanged unless a city opts in. */
export type CityFabric =
  | 'london' | 'paris' | 'newyork' | 'sydney' | 'berlin'
  | 'shanghai' | 'hongkong' | 'capetown' | 'cairo' | 'athens'
  | 'pune' | 'northeast';

interface FabricSpec {
  brickRed: RGBA; brickBrown: RGBA; brickOrange: RGBA;
  renderCream: RGBA; pebbledash: RGBA;
  slate: RGBA; slateDark: RGBA;
  tileRed: RGBA; potClay: RGBA; buffBrick: RGBA;
  walls: RGBA[]; roofs: RGBA[];
  /** flat parapet roofs instead of pitched gables (default false = pitched) */
  flatRoof?: boolean;
  /** the city's TERRAIN + SKYLINE gamut (water/ground/veg/glass). Omitted for
   *  London so the live game's atlas stays byte-identical. This is the biggest
   *  lever on a city's feel — Sydney's rich harbour-blue, NYC's drab grey,
   *  Cairo's dusty ochre — so each non-London city sets it. */
  env?: EnvPalette;
}

const H = hex;
const FABRICS: Record<CityFabric, FabricSpec> = {
  // London — Victorian brick, render, slate (the default)
  london: {
    brickRed: H('#a64b37'), brickBrown: H('#8a5240'), brickOrange: H('#b5664a'),
    renderCream: H('#ddd2bc'), pebbledash: H('#c2b89f'),
    slate: H('#6e6884'), slateDark: H('#575d78'), tileRed: H('#8f4438'),
    potClay: H('#9c5a3a'), buffBrick: H('#c8a878'),
    walls: COLORS.walls, roofs: COLORS.roofs,
  },
  // Paris — Haussmann cream limestone + grey zinc mansard (pale, uniform)
  paris: {
    brickRed: H('#ded3ba'), brickBrown: H('#cfc3a4'), brickOrange: H('#e7dec9'),
    renderCream: H('#ebe3d2'), pebbledash: H('#d6caac'),
    slate: H('#6b7079'), slateDark: H('#585e68'), tileRed: H('#6b7079'),
    potClay: H('#8a8f99'), buffBrick: H('#e2d8c1'),
    walls: [H('#e7dec9'), H('#ded3ba'), H('#ebe3d2'), H('#d6caac'), H('#e2d8c1'), H('#cfc3a4'), H('#e9e1cd'), H('#d9ceb2')],
    roofs: [H('#6b7079'), H('#585e68'), H('#777d86'), H('#4f545d')],
    // the Seine's calm grey-green, soft Parisian plane-tree green and a zinc-
    // grey skyline glass to match the cream-and-zinc Haussmann fabric.
    env: {
      water: H('#6a7e7e'), waterDeep: H('#52645f'), waterGlint: H('#cdbf96'),
      grass: H('#7e9054'), grassDark: H('#687a44'),
      treeGreen: H('#6e8a4a'), treeDeep: H('#547038'), treeLime: H('#8a9c58'),
      glassSky: H('#aeb8c0'), glassSunset: H('#a0aab2'), glassDark: H('#343a44'),
      steel: H('#9aa2a8'), steelDark: H('#6c7278'),
    },
  },
  // New York — brownstone + limestone + grey concrete + blue-grey glass, flat
  // tar roofs (dark). Brick tones pulled brown/grey so it doesn't read London.
  newyork: {
    brickRed: H('#8a5a44'), brickBrown: H('#6e4d3c'), brickOrange: H('#9a6a4e'),
    renderCream: H('#cfc4ad'), pebbledash: H('#b6b1a6'),
    slate: H('#45454d'), slateDark: H('#36363d'), tileRed: H('#52525a'),
    potClay: H('#7a7a7e'), buffBrick: H('#c9b49a'),
    walls: [H('#7a5a48'), H('#9c5440'), H('#c9b49a'), H('#8a8a8e'), H('#6e4d3c'), H('#b6b1a6'), H('#5c6b78'), H('#aeb6bd')],
    roofs: [H('#44444c'), H('#3a3a42'), H('#52525a'), H('#3e3e46')],
    flatRoof: true,
    // DRAB: cool grey concrete, sooty ground, cold blue-green curtain glass,
    // muted/overcast park greens, steel-grey Hudson/East River. Low chroma —
    // the city reads grey-on-grey, not London's warm green-belt.
    env: {
      water: H('#41697a'), waterDeep: H('#2f4f5e'), waterGlint: H('#cdb78a'),
      grass: H('#5e7a4e'), grassDark: H('#4e6740'), // Central Park, dusty
      field: H('#8e9a6a'), fieldDark: H('#79855a'),
      treeGreen: H('#5e7a4e'), treeDeep: H('#46603c'), treeLime: H('#76905a'),
      moor: H('#6e7866'), brownfield: H('#8a857c'),
      soil: H('#7c6b57'), marsh: H('#6e7656'), aridSand: H('#9a8d74'), rock: H('#7c7a78'),
      sand: H('#cdbfa2'), pavement: H('#9a938c'), concrete: H('#a8a6aa'),
      glassDark: H('#2a2d33'), glassSky: H('#9fb4bd'), glassSunset: H('#9db6bf'),
      glassLit: H('#e8b66a'), glassHot: H('#d89a4e'),
      steel: H('#8e969c'), steelDark: H('#60666c'),
    },
  },
  // Sydney — honey sandstone + cream + terracotta-tile suburbs
  sydney: {
    brickRed: H('#b5673f'), brickBrown: H('#9c6a45'), brickOrange: H('#c47a4a'),
    renderCream: H('#e6dcc4'), pebbledash: H('#d8c9a8'),
    slate: H('#7a7d80'), slateDark: H('#62656a'), tileRed: H('#b5673f'),
    potClay: H('#a85e38'), buffBrick: H('#d8b889'),
    walls: [H('#d8b889'), H('#e6dcc4'), H('#c9a878'), H('#efe8d6'), H('#c8b59a'), H('#b89a72'), H('#d2c4a4'), H('#e0d2b4')],
    roofs: [H('#b5673f'), H('#a85a38'), H('#7a7d80'), H('#8a5a44')],
    // RICH harbour blue is the signature: a saturated high-UV Pacific water
    // with a bright sparkle band. Honey sandstone ground, silvery-but-bright
    // eucalypt greens, cool harbour-blue tower glass. Hard, sunny contrast.
    env: {
      water: H('#1f7fb0'), waterDeep: H('#15608c'), waterGlint: H('#7fd0ec'),
      grass: H('#7e9469'), grassDark: H('#687d56'),
      field: H('#c2b07a'), fieldDark: H('#a89866'),
      treeGreen: H('#7e9469'), treeDeep: H('#5e7550'), treeLime: H('#9cae6a'),
      moor: H('#8a9470'), brownfield: H('#a89c84'),
      soil: H('#b5895a'), marsh: H('#8a9460'), aridSand: H('#d6b483'), rock: H('#b09a72'),
      sand: H('#e7d2a8'), pavement: H('#bfb6a6'),
      glassSky: H('#9fc4d8'), glassSunset: H('#7fa9c4'), glassDark: H('#243a4a'),
      glassLit: H('#e7b270'), glassHot: H('#e89a4e'),
      steel: H('#8a99a2'), steelDark: H('#5e6b72'),
    },
  },
  // Berlin — grey-beige render + ochre Altbau + grey zinc/copper roofs
  berlin: {
    brickRed: H('#9a4d3a'), brickBrown: H('#7c5340'), brickOrange: H('#b08a5a'),
    renderCream: H('#d2cdbf'), pebbledash: H('#c0bbac'),
    slate: H('#6a6e72'), slateDark: H('#565a5e'), tileRed: H('#8a4a38'),
    potClay: H('#7a7570'), buffBrick: H('#c8b48c'),
    walls: [H('#d2cdbf'), H('#c2b58e'), H('#b9a578'), H('#d8d3c5'), H('#aeb0a6'), H('#c8bfa8'), H('#9a4d3a'), H('#cfc9bb')],
    roofs: [H('#6a6e72'), H('#565a5e'), H('#6e7a70'), H('#4f5358')],
    // COOL + MUTED northern light: flat slate-blue-green Spree, desaturated
    // linden/plane greens, grey granite-sett pavement. Verdigris-copper lives
    // in the roofs; glass is cool blue-grey under an overcast sky.
    env: {
      water: H('#5e7480'), waterDeep: H('#485a64'), waterGlint: H('#c4b48e'),
      grass: H('#7e8466'), grassDark: H('#686e52'),
      field: H('#b6ab7a'), fieldDark: H('#9e9468'),
      treeGreen: H('#6e7e54'), treeDeep: H('#566742'), treeLime: H('#869268'),
      moor: H('#7e8466'), brownfield: H('#9a948a'),
      soil: H('#7a6e52'), marsh: H('#76805a'), aridSand: H('#b0a884'), rock: H('#8e8c84'),
      sand: H('#ddceac'), pavement: H('#a8a29a'), concrete: H('#aeafb0'),
      glassSky: H('#9fb8c4'), glassSunset: H('#9bb2bc'), glassDark: H('#2e3340'),
      glassLit: H('#e9c079'), glassHot: H('#d6a85a'),
      steel: H('#b0b8bc'), steelDark: H('#7a8084'),
    },
  },
  // Shanghai — grey concrete + shikumen + blue/teal glass towers, jade accents
  shanghai: {
    brickRed: H('#9a8678'), brickBrown: H('#7e6e60'), brickOrange: H('#a89684'),
    renderCream: H('#cfcabb'), pebbledash: H('#b4b0a6'),
    slate: H('#5a5e62'), slateDark: H('#46494d'), tileRed: H('#4a6a55'),
    potClay: H('#6a6e6a'), buffBrick: H('#c2b8a2'),
    walls: [H('#b4b0a6'), H('#c8c2b4'), H('#9a9690'), H('#5c6e74'), H('#cfcabb'), H('#a6a299'), H('#8a8682'), H('#6d8088')],
    roofs: [H('#5a5e62'), H('#46494d'), H('#4a6a55'), H('#565a5a')],
    flatRoof: true,
    // HUMID two-tone: low-chroma greys/creams under a hazy sky, the Huangpu's
    // silty BROWN-GREY water (never blue), muted humid plane-tree green — set
    // against JADE + bronze curtain glass on the supertowers.
    env: {
      water: H('#8a7e6e'), waterDeep: H('#6e6356'), waterGlint: H('#cbb98e'),
      grass: H('#5e7a4e'), grassDark: H('#4e6740'),
      field: H('#a89c72'), fieldDark: H('#92875e'),
      treeGreen: H('#5e7a4e'), treeDeep: H('#46603c'), treeLime: H('#7c8e5a'),
      moor: H('#7c7c64'), brownfield: H('#9c968a'),
      soil: H('#9c8a64'), marsh: H('#7e8258'), aridSand: H('#c2b49c'), rock: H('#9a948a'),
      sand: H('#d9cbb2'), pavement: H('#a8a29a'), concrete: H('#aaa8a2'),
      glassSky: H('#9fc4be'), glassSunset: H('#7fa8a2'), glassDark: H('#283a38'),
      glassLit: H('#e8c87a'), glassHot: H('#c8a25a'),
      steel: H('#94a09c'), steelDark: H('#62706c'),
    },
  },
  // Hong Kong — dense weathered pastel + grey concrete towers + teal glass
  hongkong: {
    brickRed: H('#b08a76'), brickBrown: H('#8a7464'), brickOrange: H('#c0a088'),
    renderCream: H('#d4cdba'), pebbledash: H('#b0aaa0'),
    slate: H('#565a5e'), slateDark: H('#44474b'), tileRed: H('#5e6266'),
    potClay: H('#6e7072'), buffBrick: H('#c6bca6'),
    walls: [H('#c8b8a0'), H('#a8b4a0'), H('#c4a8a8'), H('#cfcab8'), H('#9aa4ac'), H('#b8b0a4'), H('#6d8890'), H('#b0aaa0')],
    roofs: [H('#565a5e'), H('#44474b'), H('#5e6266'), H('#4a4d51')],
    flatRoof: true,
    // TEAL mirror-glass rising from dark teal-brown Victoria Harbour, backed by
    // a LUSH deep-subtropical-green Peak — the strongest tell is wall-of-towers
    // teal against jungle green. Reclaimed-land grey ground, grey podium paving.
    env: {
      water: H('#3e6b72'), waterDeep: H('#2e5258'), waterGlint: H('#bcd2c8'),
      grass: H('#4e7141'), grassDark: H('#3c5a33'),
      field: H('#7e9a5a'), fieldDark: H('#6a854a'),
      treeGreen: H('#4e7141'), treeDeep: H('#345229'), treeLime: H('#6e9050'),
      moor: H('#5e7250'), brownfield: H('#94948c'),
      soil: H('#8a7c64'), marsh: H('#6e8050'), aridSand: H('#b4ac98'), rock: H('#8c8a82'),
      sand: H('#cfc6b2'), pavement: H('#b7b2ab'), concrete: H('#aeaca6'),
      glassSky: H('#9fc4cf'), glassSunset: H('#7fa9b8'), glassDark: H('#243c40'),
      glassLit: H('#f2c879'), glassHot: H('#d8aa5a'),
      steel: H('#92a0a4'), steelDark: H('#607074'),
    },
  },
  // Cape Town — Bo-Kaap bright pastels + Cape Dutch white + sandstone
  capetown: {
    brickRed: H('#c25a4a'), brickBrown: H('#a86a4a'), brickOrange: H('#d07a4a'),
    renderCream: H('#e8e0cf'), pebbledash: H('#d2c4a4'),
    slate: H('#6e7276'), slateDark: H('#585c60'), tileRed: H('#b5563c'),
    potClay: H('#b5563c'), buffBrick: H('#d8b889'),
    walls: [H('#e8e0cf'), H('#5fa3a0'), H('#d98a4a'), H('#c75d6e'), H('#6f9a5a'), H('#e0d2b4'), H('#5a8fb0'), H('#d8c060')],
    roofs: [H('#6e7276'), H('#585c60'), H('#b5563c'), H('#62666a')],
    // BRIGHT high-key coast: deep cold Atlantic/Table Bay blue with turquoise
    // shallows, dry tawny Cape earth, olive fynbos on grey Table Mountain rock.
    // Whitewash glows; the candy Bo-Kaap hues live in the walls above.
    env: {
      water: H('#1f5c8c'), waterDeep: H('#164566'), waterGlint: H('#5ab0d0'),
      grass: H('#6e8b3d'), grassDark: H('#577030'),
      field: H('#bca968'), fieldDark: H('#a49254'),
      treeGreen: H('#6e8b3d'), treeDeep: H('#3c5a2e'), treeLime: H('#8ca24e'),
      moor: H('#7e8456'), brownfield: H('#a89c84'),
      soil: H('#b08c5a'), marsh: H('#7e8a4e'), aridSand: H('#d0ad74'), rock: H('#9a8f82'),
      sand: H('#e2cfa6'), pavement: H('#bdb4a6'),
      glassSky: H('#9fbccf'), glassSunset: H('#5e7e92'), glassDark: H('#2a3e4a'),
      glassLit: H('#e6a765'), glassHot: H('#d68e4e'),
      steel: H('#8a969e'), steelDark: H('#5c666c'),
    },
  },
  // Cairo — sand + ochre dust; the famous red-brick is muted to warm brown so
  // the city reads SANDY, not London-red. Flat dusty roofs.
  cairo: {
    brickRed: H('#b08458'), brickBrown: H('#956c44'), brickOrange: H('#c29a64'),
    renderCream: H('#d8c49a'), pebbledash: H('#c9b485'),
    slate: H('#9c8862'), slateDark: H('#7a6a4e'), tileRed: H('#a8895c'),
    potClay: H('#8a6a48'), buffBrick: H('#cdb485'),
    walls: [H('#cdb485'), H('#c2a06a'), H('#b07a4a'), H('#d8c49a'), H('#b89868'), H('#9c7a4e'), H('#caa878'), H('#a06a44')],
    roofs: [H('#9c8862'), H('#7a6a4e'), H('#b09a72'), H('#8a7a5e')],
    flatRoof: true,
    // DUSTY desert monochrome: sandy ochre ground EVERYWHERE (grass/field/moor
    // all dry to sand), one ribbon of muddy blue-green Nile with sparse but
    // VIVID irrigated palm-green along it. Dusty blue-grey glass, sandy paving.
    env: {
      water: H('#5e8ba0'), waterDeep: H('#496e80'), waterGlint: H('#d8c08a'),
      grass: H('#a89464'), grassDark: H('#8e7c52'), // dry, not green
      field: H('#cdb079'), fieldDark: H('#b39a64'),
      treeGreen: H('#5c7a3e'), treeDeep: H('#496630'), treeLime: H('#7e8a52'), // Nile palms — vivid against the sand
      moor: H('#b09a6e'), brownfield: H('#bca884'),
      soil: H('#c2a06a'), marsh: H('#8a8a52'), aridSand: H('#d8b777'), rock: H('#cdb586'),
      sand: H('#e0c992'), pavement: H('#c2b292'), concrete: H('#c0ad84'),
      glassSky: H('#a6c0c4'), glassSunset: H('#86a2a8'), glassDark: H('#3a4a4e'),
      glassLit: H('#e3b36a'), glassHot: H('#cf9a4e'),
      steel: H('#a89e8a'), steelDark: H('#766c58'),
    },
  },
  // Athens — whitewashed + cream polykatoikia; brick tones are pale so the
  // fabric reads WHITE, with only a terracotta roof/cornice accent. Flat roofs.
  athens: {
    brickRed: H('#ddd0b2'), brickBrown: H('#cfc3a4'), brickOrange: H('#e4dcc8'),
    renderCream: H('#ece6d6'), pebbledash: H('#ddd3bd'),
    // pale grey-white flat-roof concrete is the DOMINANT Athens roofscape; the
    // terracotta is a softened, low-saturation MINORITY accent (Plaka/older
    // pitched roofs) so the city reads white-on-blue from above, not red.
    slate: H('#b4aea4'), slateDark: H('#9c968c'), tileRed: H('#cf9c74'),
    potClay: H('#c28a5e'), buffBrick: H('#e0d6c0'),
    walls: [H('#ece6d6'), H('#e4dcc8'), H('#d8cdb4'), H('#efe9da'), H('#d0c3a4'), H('#e8dcc0'), H('#c9b890'), H('#ddd0b2')],
    roofs: [H('#bcb6ac'), H('#aaa49a'), H('#cf9c74'), H('#c4bdb2')],
    flatRoof: true,
    // WHITE city against a deep Aegean blue: dry tawny earth, muted grey-green
    // pine/olive/cypress on the hills, pale marble paving. Saronic-Gulf blue is
    // saturated like Sydney's but a touch deeper/greener; whitewash glows.
    env: {
      water: H('#2e7fa6'), waterDeep: H('#216080'), waterGlint: H('#6ec4e0'),
      grass: H('#8a936a'), grassDark: H('#727a54'), // dry Attic scrub
      field: H('#c2b078'), fieldDark: H('#a89863'),
      treeGreen: H('#6e7e4c'), treeDeep: H('#54663a'), treeLime: H('#8a945e'),
      moor: H('#9a9a72'), brownfield: H('#b4a888'),
      soil: H('#b79c6e'), marsh: H('#8a8e56'), aridSand: H('#cdb178'), rock: H('#c2b48e'),
      sand: H('#e4d8be'), pavement: H('#c8bfa8'),
      glassSky: H('#a6c0cc'), glassSunset: H('#9bb6c2'), glassDark: H('#33454e'),
      glassLit: H('#e9c277'), glassHot: H('#d4a85a'),
      steel: H('#a4aaa0'), steelDark: H('#727870'),
    },
  },
  // Pune — warm cream/ochre cement render + black Deccan basalt + saffron/
  // vermilion temples + red Mangalore-tile roofs. Flat RCC roofscape dominates
  // (water tanks, dishes) so the city reads flat-topped and dusty-ochre, not
  // London-red; the red tile lives in the tileRed accent. Brick tones pulled
  // to warm ochre render so a street reads cream-buff, studded with basalt.
  pune: {
    brickRed: H('#c9a86a'), brickBrown: H('#a8895a'), brickOrange: H('#d4b378'),
    renderCream: H('#d9c39a'), pebbledash: H('#c9b88e'),
    slate: H('#807468'), slateDark: H('#665e54'), tileRed: H('#a4452e'),
    potClay: H('#8a6a48'), buffBrick: H('#d9c39a'),
    walls: [H('#d9c39a'), H('#c9a86a'), H('#e7e0ce'), H('#d4b378'), H('#b29464'), H('#e8821e'), H('#b23a2e'), H('#cabb92')],
    roofs: [H('#807468'), H('#a4452e'), H('#665e54'), H('#8a7c6a')],
    flatRoof: true,
    // DUSTY HAZY plateau: tawny dry soil, the muddy olive-brown Mula-Mutha
    // (silty, low — never blue), dusty monsoon-green banyan/garden green that
    // dries khaki, hazy blue-grey IT-tower glass. Warm grey-beige paving.
    env: {
      water: H('#7e7a5a'), waterDeep: H('#64613f'), waterGlint: H('#cbb98a'),
      grass: H('#5f7a39'), grassDark: H('#4e652f'),
      field: H('#a8a052'), fieldDark: H('#8e8744'),
      treeGreen: H('#5f7a39'), treeDeep: H('#475c2c'), treeLime: H('#7e8c46'),
      moor: H('#8a8c4e'), brownfield: H('#b0a484'),
      soil: H('#c9ab73'), marsh: H('#8a8c4e'), aridSand: H('#d2b67e'), rock: H('#4a4640'),
      sand: H('#dcc593'), pavement: H('#bdae96'), concrete: H('#c0b496'),
      glassSky: H('#8fa9b0'), glassSunset: H('#a8b0b2'), glassDark: H('#3a4548'),
      glassLit: H('#e6b65c'), glassHot: H('#cf9a4e'),
      steel: H('#9aa4a0'), steelDark: H('#6c726c'),
    },
  },
  // North-East England — honey/buff Grainger-Town sandstone + red Tyneside
  // brick under dark Welsh-slate PITCHED roofs, damped by a cold grey-green
  // North Sea and moorland green. The rust-orange Angel + silver-grey bridges
  // are bespoke heroes; the everyday fabric is sandstone-and-brick under slate.
  northeast: {
    brickRed: H('#a8492e'), brickBrown: H('#8a4434'), brickOrange: H('#b9603f'),
    renderCream: H('#d9c39a'), pebbledash: H('#c2a877'),
    slate: H('#4a4e55'), slateDark: H('#3a3e44'), tileRed: H('#7a4632'),
    potClay: H('#7a4632'), buffBrick: H('#d9c39a'),
    walls: [H('#d9c39a'), H('#c2a877'), H('#a8492e'), H('#cab896'), H('#b9603f'), H('#b9ae96'), H('#8a4434'), H('#d2c2a0')],
    roofs: [H('#4a4e55'), H('#3a3e44'), H('#7a4632'), H('#52565d')],
    // COLD NORTHERN coast: slate-teal grey-green North Sea (flat, low-reflectance),
    // desaturated moorland/pasture green (heather-dulled, never tropical), cool
    // soil, grey granite-sett paving, cool blue-grey Quayside curtain glass.
    env: {
      water: H('#566e70'), waterDeep: H('#41585a'), waterGlint: H('#b8c2b0'),
      grass: H('#5e7048'), grassDark: H('#4c5c3a'),
      field: H('#a89e6a'), fieldDark: H('#928858'),
      treeGreen: H('#5e7048'), treeDeep: H('#445436'), treeLime: H('#788a54'),
      moor: H('#6e7858'), brownfield: H('#9b9488'),
      soil: H('#7c7a5e'), marsh: H('#6e7650'), aridSand: H('#b0a884'), rock: H('#b9ae96'),
      sand: H('#dccfae'), pavement: H('#9b948b'), concrete: H('#a8a6a4'),
      glassSky: H('#9fb6be'), glassSunset: H('#9bb0b6'), glassDark: H('#2c313d'),
      glassLit: H('#e7be74'), glassHot: H('#d4a85a'),
      steel: H('#9aa4a8'), steelDark: H('#6c7478'),
    },
  },
};

/** The fabric currently applied to the global palette. The atlas cache folds
 *  this into its fingerprint so London and Paris bake (and cache) as distinct
 *  sheets — the env/brick tokens a city sets are NOT all in COLORS, so the
 *  fingerprint can't otherwise tell two fabrics apart. */
let ACTIVE_FABRIC: CityFabric = 'london';
export function activeFabric(): CityFabric {
  return ACTIVE_FABRIC;
}

export function applyCityFabric(city: CityFabric): void {
  ACTIVE_FABRIC = FABRICS[city] ? city : 'london';
  const f = FABRICS[city] ?? FABRICS.london;
  BRICK_RED = f.brickRed;
  BRICK_BROWN = f.brickBrown;
  BRICK_ORANGE = f.brickOrange;
  RENDER_CREAM = f.renderCream;
  PEBBLEDASH = f.pebbledash;
  SLATE = f.slate;
  SLATE_DARK = f.slateDark;
  TILE_RED = f.tileRed;
  POT_CLAY = f.potClay;
  BUFF_BRICK = f.buffBrick;
  FLAT_ROOF = f.flatRoof ?? false;
  setWallRoofPalette(f.walls, f.roofs);
  // terrain + skyline: '{}' restores the clean London baseline (byte-identical
  // for the live game); a city's env overlays its bespoke land + sky.
  setEnvPalette(f.env ?? {});
}

/** Domestic roof: a pitched gable (London/Paris/Sydney/Berlin/Cape Town) OR,
 *  for flat-roof cities (NYC/Cairo/Athens/Shanghai/HK), a flat deck with a low
 *  parapet and an occasional rooftop water tank / stair bulkhead. The roof FORM
 *  is the strongest per-city tell, so the dense domestic sprites route through
 *  here instead of calling iso.gable() directly. */
function domesticRoof(
  iso: Iso, u0: number, v0: number, u1: number, v1: number,
  H: number, rise: number, axis: 'u' | 'v', roofC: RGBA, wallC: RGBA, rng?: Rng,
): void {
  if (!FLAT_ROOF) {
    iso.gable(u0, v0, u1, v1, H, rise, axis, roofC, wallC);
    return;
  }
  // flat deck + parapet rim (a short slab, flat top in the roof tone)
  iso.box(u0, v0, u1, v1, H, H + 2.6, lighten(wallC, 0.04), { topC: top(roofC, 0.12) });
  // rooftop clutter toward the back: a water tank or stair bulkhead
  if (!rng || rng.chance(0.7)) {
    const cu = u0 + (u1 - u0) * (rng ? rng.range(0.3, 0.7) : 0.42);
    const cv = v0 + (v1 - v0) * 0.34;
    const s = (u1 - u0) * 0.16;
    iso.box(cu - s, cv - s, cu + s, cv + s, H + 2.6, H + 2.6 + rise * 0.5, shaded(wallC, 0.08), { ink: false });
  }
}

/** Row of three attached townhouses (urban terraces / high street). */
export function terraceTile(seed: number, shops: boolean): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 7919 + 13);
  const v0 = 0.12;
  const v1 = 0.78;
  const H = 40;
  iso.shadow(0, v0, 1, v1, 0.2, 0.22);
  for (let i = 0; i < 3; i++) {
    const u0 = i / 3;
    const u1 = (i + 1) / 3;
    const wall = wallColor(seed + i);
    iso.box(u0, v0, u1, v1, 0, H, wall);
    // windows on the left (street-facing) wall
    if (shops) {
      // shopfront: big window + striped awning, flat with sign band
      iso.windowsLeft(v1, u0 + 0.04, u1 - 0.04, 6, 16, 1, glass(rng, 0.7), COLORS.white);
      const awn: RGBA = rng.chance(0.5) ? COLORS.orange : (COLORS.walls[1] ?? COLORS.orange);
      iso.r.poly(
        [P(u0 + 0.02, v1, 22), P(u1 - 0.02, v1, 22), P(u1 - 0.02, v1 + 0.09, 17), P(u0 + 0.02, v1 + 0.09, 17)],
        awn,
      );
      iso.r.poly(
        [P(u0 + 0.02, v1, 27), P(u1 - 0.02, v1, 27), P(u1 - 0.02, v1, 22), P(u0 + 0.02, v1, 22)],
        COLORS.white,
      );
      iso.windowsLeft(v1, u0 + 0.06, u1 - 0.06, 30, 37, 2, glass(rng, 0.4), COLORS.white);
    } else {
      iso.windowsLeft(v1, u0 + 0.05, u1 - 0.05, 24, 34, 2, glass(rng, 0.4), COLORS.white);
      iso.windowsLeft(v1, u0 + 0.05, u1 - 0.16, 6, 17, 1, glass(rng, 0.35), COLORS.white);
      // front door
      iso.r.poly(
        [P(u1 - 0.13, v1, 14), P(u1 - 0.05, v1, 14), P(u1 - 0.05, v1, 0), P(u1 - 0.13, v1, 0)],
        darken(wall, 0.35),
      );
    }
  }
  // windows on the right gable-end wall of the last house
  iso.windowsRight(1, v0 + 0.08, v1 - 0.08, 22, 34, 2, glass(rng, 0.3), COLORS.white);
  // continuous roof with chimneys
  const roof = roofColor(seed);
  domesticRoof(iso, 0, v0, 1, v1, H, 16, 'u', roof, wallColor(seed + 2), rng);
  if (!FLAT_ROOF) for (const cu of [0.18, 0.5, 0.82]) {
    iso.box(cu, (v0 + v1) / 2 - 0.05, cu + 0.05, (v0 + v1) / 2 + 0.05, H + 12, H + 24, COLORS.concrete);
  }
  return iso.build();
}

/** Victorian terrace row: bay windows, slate roof, chimney pots in rows.
 *  Wall treatments and frames vary per variant; variant 3 has dormer loft
 *  conversions and variant 1 carries retrofit rooftop solar. */
export function victerraceTile(seed: number, variant: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 8839 + variant * 101 + 21);
  const v0 = 0.14;
  const v1 = 0.76;
  const vm = (v0 + v1) / 2;
  const H = 38;
  const rise = 15;
  const roof = ([SLATE, SLATE_DARK, TILE_RED, SLATE] as RGBA[])[variant % 4] ?? SLATE;
  const frame = variant % 2 === 0 ? COLORS.white : hex('#ece2cc');
  const wallSets: RGBA[][] = [
    [BRICK_RED, BRICK_RED, BRICK_BROWN],
    [BRICK_BROWN, BRICK_ORANGE, BRICK_BROWN],
    [RENDER_CREAM, BRICK_RED, PEBBLEDASH],
    [BRICK_RED, BRICK_BROWN, BRICK_RED],
  ];
  const walls = wallSets[variant % 4] ?? wallSets[0]!;
  iso.shadow(0, v0, 1, v1, 0.2, 0.22);
  // z on the near roof slope at a given v (between ridge vm and eave v1)
  const slopeZ = (v: number): number => H + rise * ((v1 - v) / (v1 - vm));
  for (let i = 0; i < 3; i++) {
    const u0 = i / 3;
    const u1 = (i + 1) / 3;
    const wall = walls[i] ?? BRICK_RED;
    iso.box(u0, v0, u1, v1, 0, H, wall);
    // upper sash windows
    iso.windowsLeft(v1, u0 + 0.05, u1 - 0.05, 25, 34, 2, glass(rng, 0.4), frame);
    // two-storey bay window with its own little cap
    const b0 = u0 + 0.035;
    const b1 = u0 + 0.165;
    iso.box(b0, v1 - 0.001, b1, v1 + 0.05, 0, 18, lighten(wall, 0.1));
    iso.windowsLeft(v1 + 0.05, b0 + 0.012, b1 - 0.012, 4, 14, 1, glass(rng, 0.5), frame);
    iso.quad(b0 - 0.012, v1 - 0.001, b1 + 0.012, v1 + 0.062, 18, frame);
    iso.edge(P(b0 - 0.012, v1 + 0.062, 18), P(b1 + 0.012, v1 + 0.062, 18), INK_W * 0.8);
    // front door beside the bay, with a stone lintel
    iso.r.poly(
      [P(u1 - 0.12, v1, 13), P(u1 - 0.045, v1, 13), P(u1 - 0.045, v1, 0), P(u1 - 0.12, v1, 0)],
      darken(([hex('#3f6048'), hex('#5d3a52'), hex('#46518f'), hex('#7a3328')] as RGBA[])[(variant + i) % 4] ?? INK, 0.05),
    );
    iso.r.poly(
      [P(u1 - 0.13, v1, 15), P(u1 - 0.035, v1, 15), P(u1 - 0.035, v1, 13), P(u1 - 0.13, v1, 13)],
      frame,
    );
  }
  // gable-end windows on the right wall
  iso.windowsRight(1, v0 + 0.1, v1 - 0.1, 23, 33, 2, glass(rng, 0.3), frame);
  // slate roof + party-wall chimney stacks with clay pot rows
  domesticRoof(iso, 0, v0, 1, v1, H, rise, 'u', roof, walls[2] ?? BRICK_RED, rng);
  for (const cu of [0.05, 0.345, 0.655, 0.95]) {
    iso.box(cu - 0.028, vm - 0.05, cu + 0.028, vm + 0.05, H + 11, H + 22, darken(walls[0] ?? BRICK_RED, 0.08));
    for (const dv of [-0.028, 0.022]) {
      iso.box(cu - 0.011, vm + dv, cu + 0.011, vm + dv + 0.024, H + 22, H + 27, POT_CLAY, { ink: false });
    }
  }
  if (variant === 3) {
    // dormer loft conversions on the near slope
    for (const du of [0.135, 0.468, 0.8]) {
      const dv0 = vm + 0.1;
      const z0 = slopeZ(dv0 + 0.1);
      iso.box(du, dv0, du + 0.09, dv0 + 0.1, z0, z0 + 9, lighten(walls[0] ?? BRICK_RED, 0.12));
      iso.windowsLeft(dv0 + 0.1, du + 0.012, du + 0.078, z0 + 2, z0 + 7, 1, glass(rng, 0.5), frame);
      iso.quad(du - 0.008, dv0 - 0.008, du + 0.098, dv0 + 0.108, z0 + 9, shaded(roof, 0.05));
    }
  }
  if (variant === 1) {
    // retrofit solar on the middle house's near slope
    const pv0 = vm + 0.08;
    const pv1 = v1 - 0.06;
    iso.r.poly(
      [P(0.37, pv0, slopeZ(pv0) + 1), P(0.63, pv0, slopeZ(pv0) + 1), P(0.63, pv1, slopeZ(pv1) + 1), P(0.37, pv1, slopeZ(pv1) + 1)],
      COLORS.panel,
    );
    iso.r.line(P(0.37, pv0, slopeZ(pv0) + 1.5), P(0.63, pv0, slopeZ(pv0) + 1.5), INK_W * 0.7, COLORS.panelGlint);
  }
  return iso.build();
}

/** Victorian high-street parade: shops below (awnings, big glazing, a
 *  hanging sign), flats above, parapet roof. */
export function vicshopTile(seed: number, variant: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 6661 + variant * 71 + 17);
  const v0 = 0.14;
  const v1 = 0.76;
  const H = 42;
  const walls: RGBA[] =
    variant === 0 ? [BRICK_RED, RENDER_CREAM, BRICK_BROWN] : [BRICK_BROWN, BRICK_ORANGE, RENDER_CREAM];
  const awnings: RGBA[] =
    variant === 0
      ? [COLORS.orange, hex('#3f8f8a'), hex('#d6566e')]
      : [hex('#46518f'), COLORS.orange, hex('#5d7a45')];
  const frame = COLORS.white;
  iso.shadow(0, v0, 1, v1, 0.2, 0.22);
  for (let i = 0; i < 3; i++) {
    const u0 = i / 3;
    const u1 = (i + 1) / 3;
    const wall = walls[i] ?? BRICK_RED;
    iso.box(u0, v0, u1, v1, 0, H, wall);
    // big shopfront glazing + stallriser
    iso.r.poly(
      [P(u0 + 0.03, v1, 16), P(u1 - 0.03, v1, 16), P(u1 - 0.03, v1, 3), P(u0 + 0.03, v1, 3)],
      glass(rng, 0.75),
    );
    iso.r.poly(
      [P(u0 + 0.03, v1, 3), P(u1 - 0.03, v1, 3), P(u1 - 0.03, v1, 0), P(u0 + 0.03, v1, 0)],
      darken(wall, 0.3),
    );
    // fascia sign band + striped awning
    const awn = awnings[i] ?? COLORS.orange;
    iso.r.poly([P(u0 + 0.02, v1, 24), P(u1 - 0.02, v1, 24), P(u1 - 0.02, v1, 19), P(u0 + 0.02, v1, 19)], frame);
    iso.r.poly(
      [P(u0 + 0.03, v1, 19), P(u1 - 0.03, v1, 19), P(u1 - 0.04, v1 + 0.085, 14), P(u0 + 0.04, v1 + 0.085, 14)],
      awn,
    );
    for (let t = 0; t < 4; t++) {
      const a0 = u0 + 0.055 + t * 0.072;
      iso.r.poly(
        [P(a0, v1, 19), P(a0 + 0.03, v1, 19), P(a0 + 0.02, v1 + 0.085, 14), P(a0 - 0.01, v1 + 0.085, 14)],
        alpha(COLORS.white, 0.85),
      );
    }
    iso.edge(P(u0 + 0.04, v1 + 0.085, 14), P(u1 - 0.04, v1 + 0.085, 14), INK_W * 0.8);
    // flat-above sash windows
    iso.windowsLeft(v1, u0 + 0.05, u1 - 0.05, 28, 37, 2, glass(rng, 0.45), frame);
  }
  // hanging sign on a bracket at the middle shop
  iso.r.line(P(0.36, v1, 30), P(0.36, v1 + 0.05, 30), INK_W * 0.8, INK);
  iso.r.poly(
    [P(0.36, v1 + 0.05, 30), P(0.36, v1 + 0.05, 24), P(0.36, v1 + 0.012, 24), P(0.36, v1 + 0.012, 30)],
    variant === 0 ? hex('#46518f') : hex('#7a3328'),
  );
  // gable-end windows + parapet roof with chimneys at the back
  iso.windowsRight(1, v0 + 0.1, v1 - 0.1, 26, 36, 2, glass(rng, 0.3), frame);
  iso.box(0, v0, 1, v1, H, H + 4, walls[0] ?? BRICK_RED, { topC: shaded(SLATE, 0.05) });
  iso.r.poly([P(0, v1, H + 5.5), P(1, v1, H + 5.5), P(1, v1, H + 4), P(0, v1, H + 4)], frame);
  for (const cu of [0.2, 0.52, 0.84]) {
    iso.box(cu, v0 + 0.08, cu + 0.05, v0 + 0.17, H + 4, H + 18, darken(walls[0] ?? BRICK_RED, 0.1));
    iso.box(cu + 0.008, v0 + 0.095, cu + 0.026, v0 + 0.115, H + 18, H + 22, POT_CLAY, { ink: false });
  }
  return iso.build();
}

/** Post-war council slab block: 4–5 storeys of deck-access balconies with
 *  pastel infill panels and a stair tower. */
export function councilflatTile(seed: number, variant: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 5443 + variant * 37 + 29);
  const u0 = 0.08;
  const u1 = 0.84;
  const v0 = 0.26;
  const v1 = 0.62;
  const storeys = variant === 0 ? 4 : 5;
  const fh = 13;
  const H = storeys * fh + 4;
  const body = variant === 0 ? hex('#c9c2b2') : hex('#bdb8ad');
  const pastels: RGBA[] =
    variant === 0
      ? [hex('#e8b9a8'), hex('#a8c8d8'), hex('#d8c8a0')]
      : [hex('#b9d0b4'), hex('#d8b4c0'), hex('#c0c4dd')];
  iso.shadow(u0, v0, u1, v1, 0.26, 0.24);
  iso.box(u0, v0, u1, v1, 0, H, body);
  for (let s = 0; s < storeys; s++) {
    const z = 4 + s * fh;
    // deck-access balcony slab protruding from the street face
    iso.r.poly(
      [P(u0, v1 + 0.035, z + 1.6), P(u1, v1 + 0.035, z + 1.6), P(u1, v1, z + 1.6), P(u0, v1, z + 1.6)],
      lit(body, 0.12),
    );
    iso.r.poly(
      [P(u0, v1 + 0.035, z + 1.6), P(u1, v1 + 0.035, z + 1.6), P(u1, v1 + 0.035, z - 0.4), P(u0, v1 + 0.035, z - 0.4)],
      shaded(body, 0.12),
    );
    // balcony rail
    iso.r.line(P(u0, v1 + 0.035, z + 5), P(u1, v1 + 0.035, z + 5), INK_W * 0.7, alpha(COLORS.white, 0.9));
    iso.edge(P(u0, v1 + 0.035, z + 1.6), P(u1, v1 + 0.035, z + 1.6), INK_W * 0.7, alpha(INK, 0.6));
    // pastel infill panels + doors/windows along the deck
    for (let k = 0; k < 5; k++) {
      const a = u0 + 0.03 + k * 0.145;
      iso.r.poly(
        [P(a, v1, z + fh - 2.5), P(a + 0.06, v1, z + fh - 2.5), P(a + 0.06, v1, z + 2), P(a, v1, z + 2)],
        pastels[(k + s) % 3] ?? body,
      );
      iso.r.poly(
        [P(a + 0.07, v1, z + fh - 3.5), P(a + 0.115, v1, z + fh - 3.5), P(a + 0.115, v1, z + 2), P(a + 0.07, v1, z + 2)],
        glass(rng, 0.4),
      );
    }
    // gable-end windows
    iso.windowsRight(u1, v0 + 0.05, v1 - 0.05, z + 3, z + fh - 2.5, 2, glass(rng, 0.3), COLORS.white);
  }
  // stair tower at the left end, slightly proud and taller
  iso.box(u0 - 0.035, v0 + 0.04, u0 + 0.07, v1 - 0.04, 0, H + 7, shaded(body, 0.06));
  iso.windowsLeft(v1 - 0.04, u0 - 0.02, u0 + 0.055, 6, H - 4, 1, alpha(COLORS.glassSky, 0.85), COLORS.white);
  // flat roof: parapet + plant box + TV aerials
  iso.box(u0, v0, u1, v1, H, H + 3, body, { ink: false, topC: shaded(body, 0.18) });
  iso.box(0.6, 0.36, 0.72, 0.5, H + 3, H + 10, COLORS.concrete);
  for (const au of [0.2, 0.42]) {
    iso.r.line(P(au, 0.44, H + 3), P(au, 0.44, H + 14), INK_W * 0.6, alpha(INK, 0.7));
    iso.r.line(P(au - 0.025, 0.44, H + 12), P(au + 0.025, 0.44, H + 12), INK_W * 0.6, alpha(INK, 0.7));
  }
  return iso.build();
}

/** Boxy new-build estate home: integral garage, tight paved drive, small
 *  windows. Variants 1–2 carry rooftop solar from day one. */
export function newbuildTile(seed: number, variant: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 4129 + variant * 53 + 31);
  const wall = ([BUFF_BRICK, BRICK_RED, hex('#bf9a6a')] as RGBA[])[variant % 3] ?? BUFF_BRICK;
  const roof = variant === 0 ? hex('#6a6276') : hex('#5c5468');
  const u0 = 0.14;
  const u1 = 0.58;
  const v0 = 0.2;
  const v1 = 0.62;
  const H = 24;
  iso.shadow(u0, v0, u1 + 0.22, v1, 0.16, 0.2);
  // house body + concrete-tile gable roof
  iso.box(u0, v0, u1, v1, 0, H, wall);
  domesticRoof(iso, u0 - 0.012, v0 - 0.012, u1 + 0.012, v1 + 0.012, H, 11, 'u', roof, wall, rng);
  // small uPVC windows
  iso.windowsLeft(v1, u0 + 0.04, u1 - 0.05, 15, 21, 2, glass(rng, 0.45), COLORS.white);
  iso.windowsLeft(v1, u0 + 0.04, u0 + 0.16, 5, 11, 1, glass(rng, 0.4), COLORS.white);
  // front door with a little canopy
  iso.r.poly([P(u1 - 0.14, v1, 11), P(u1 - 0.06, v1, 11), P(u1 - 0.06, v1, 0), P(u1 - 0.14, v1, 0)], darken(wall, 0.4));
  iso.r.poly(
    [P(u1 - 0.16, v1, 13), P(u1 - 0.04, v1, 13), P(u1 - 0.05, v1 + 0.035, 11), P(u1 - 0.15, v1 + 0.035, 11)],
    COLORS.white,
  );
  // integral garage wing with a white roller door
  const g0 = u1;
  const g1 = u1 + 0.2;
  iso.box(g0, v0 + 0.1, g1, v1, 0, 13, wall, { topC: top(roof, 0.1) });
  iso.r.poly(
    [P(g0 + 0.025, v1, 10), P(g1 - 0.025, v1, 10), P(g1 - 0.025, v1, 0), P(g0 + 0.025, v1, 0)],
    lighten(COLORS.white, 0.02),
  );
  for (let z = 2; z < 10; z += 2.4) {
    iso.r.line(P(g0 + 0.03, v1, z), P(g1 - 0.03, v1, z), INK_W * 0.5, alpha(INK, 0.35));
  }
  // tight paved drive to the plot edge + slab path to the door
  iso.quad(g0 + 0.01, v1 + 0.005, g1 + 0.01, 0.98, 0, alpha(COLORS.pavement, 0.92), alpha(darken(COLORS.pavement, 0.08), 0.92));
  iso.quad(u1 - 0.14, v1 + 0.005, u1 - 0.06, 0.86, 0, alpha(COLORS.pavement, 0.85));
  if (variant >= 1) {
    // rooftop solar on the near slope, fitted at build time
    const vm = (v0 + v1) / 2;
    const rise = 11;
    const sz = (v: number): number => H + rise * ((v1 - v) / (v1 - vm));
    const pv0 = vm + 0.05;
    const pv1 = v1 - 0.045;
    const pu0 = variant === 1 ? u0 + 0.05 : u0 + 0.03;
    const pu1 = variant === 1 ? u1 - 0.12 : u1 - 0.05;
    iso.r.poly(
      [P(pu0, pv0, sz(pv0) + 1), P(pu1, pv0, sz(pv0) + 1), P(pu1, pv1, sz(pv1) + 1), P(pu0, pv1, sz(pv1) + 1)],
      COLORS.panel,
    );
    iso.r.line(P(pu0, pv0, sz(pv0) + 1.5), P(pu1, pv0, sz(pv0) + 1.5), INK_W * 0.7, COLORS.panelGlint);
  }
  // a sapling in the handkerchief garden
  if (rng.chance(0.6)) iso.ball(0.12, 0.82, 0.055, 13, COLORS.treeLime);
  return iso.build();
}

/** Two suburban semis with gardens and hedges. */
export function semiTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 104729 + 7);
  for (const [u0, u1] of [
    [0.06, 0.45],
    [0.55, 0.94],
  ] as const) {
    const wall = wallColor(seed + (u0 < 0.5 ? 0 : 3));
    const roof = roofColor(seed + (u0 < 0.5 ? 1 : 2));
    const v0 = 0.18;
    const v1 = 0.62;
    const H = 26;
    iso.shadow(u0, v0, u1, v1, 0.16, 0.2);
    iso.box(u0, v0, u1, v1, 0, H, wall);
    domesticRoof(iso, u0 - 0.015, v0 - 0.015, u1 + 0.015, v1 + 0.015, H, 13, 'u', roof, wall, rng);
    iso.windowsLeft(v1, u0 + 0.04, u1 - 0.12, 15, 23, 2, glass(rng, 0.4), COLORS.white);
    // bay window + door
    iso.box(u0 + 0.04, v1, u0 + 0.16, v1 + 0.05, 0, 12, COLORS.white);
    iso.r.poly(
      [P(u1 - 0.1, v1, 12), P(u1 - 0.03, v1, 12), P(u1 - 0.03, v1, 0), P(u1 - 0.1, v1, 0)],
      darken(wall, 0.4),
    );
    // garden path
    iso.quad(u1 - 0.1, v1 + 0.05, u1 - 0.03, 1, 0, alpha(COLORS.pavement, 0.9));
  }
  // street hedge
  iso.box(0.02, 0.93, 0.98, 0.99, 0, 6, COLORS.treeDeep);
  if (rng.chance(0.6)) iso.ball(0.5, 0.8, 0.07, 16, COLORS.treeLime);
  return iso.build();
}

/** Detached villa in a hedged garden — posh districts. */
/** Georgian stucco terrace — Mayfair/Belgravia: flat white fronts, tall
 *  sash windows in strict rhythm, parapet roofline, black doors and
 *  railings. The West End in one tile. */
export function georgianTile(seed: number, variantIx: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 88811 + variantIx * 31 + 7);
  const stucco = lighten(COLORS.white, 0.03);
  const ink = hex('#1c1a22');
  const v0 = 0.14;
  const v1 = 0.74;
  const H = 46;
  iso.shadow(0.02, v0, 0.98, v1, 0.18, 0.2);
  iso.box(0.02, v0, 0.98, v1, 0, H, stucco, { topC: darken(stucco, 0.12) });
  // parapet line + rusticated ground-floor band
  iso.r.poly([iso.P(0.02, v1, H), iso.P(0.98, v1, H), iso.P(0.98, v1, H - 2.5), iso.P(0.02, v1, H - 2.5)], COLORS.white);
  iso.r.poly([iso.P(0.02, v1, 13), iso.P(0.98, v1, 13), iso.P(0.98, v1, 12), iso.P(0.02, v1, 12)], darken(stucco, 0.18));
  // storeys of tall sashes, diminishing upward — the Georgian tell
  iso.windowsLeft(v1, 0.06, 0.94, 26, 40, 5, glass(rng, 0.35), darken(stucco, 0.25));
  iso.windowsLeft(v1, 0.06, 0.94, 15, 24, 5, glass(rng, 0.3), darken(stucco, 0.25));
  // black doors with fanlights, every other bay
  for (const u of [0.12, 0.5, 0.88]) {
    iso.r.poly([iso.P(u - 0.035, v1, 11), iso.P(u + 0.035, v1, 11), iso.P(u + 0.035, v1, 0), iso.P(u - 0.035, v1, 0)], ink);
    iso.r.poly([iso.P(u - 0.02, v1, 11), iso.P(u + 0.02, v1, 11), iso.P(u + 0.02, v1, 9.5), iso.P(u - 0.02, v1, 9.5)], COLORS.glassLit);
  }
  // railings along the pavement
  iso.r.line(iso.P(0.02, v1 + 0.12, 4), iso.P(0.98, v1 + 0.12, 4), 1.4, ink);
  for (let u = 0.05; u < 0.97; u += 0.06) {
    iso.r.line(iso.P(u, v1 + 0.12, 0), iso.P(u, v1 + 0.12, 4), 1.1, ink);
  }
  // chimney row behind the parapet
  for (const cu of variantIx === 0 ? [0.2, 0.55, 0.85] : [0.3, 0.7]) {
    iso.box(cu, 0.3, cu + 0.05, 0.36, H, H + 9, darken(stucco, 0.2));
  }
  return iso.build();
}

export function villaTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 31337 + 3);
  // perimeter hedge
  for (const [a, b, c, d] of [
    [0.02, 0.02, 0.98, 0.06],
    [0.02, 0.94, 0.98, 0.98],
    [0.02, 0.02, 0.06, 0.98],
    [0.94, 0.02, 0.98, 0.98],
  ] as const) {
    iso.box(a, b, c, d, 0, 5, COLORS.treeDeep);
  }
  const wall = lighten(COLORS.walls[5] ?? COLORS.white, 0.04); // cream villa
  const roof = roofColor(seed);
  iso.shadow(0.24, 0.2, 0.78, 0.66, 0.18, 0.2);
  // main wing + side wing
  iso.box(0.24, 0.2, 0.62, 0.66, 0, 30, wall);
  iso.box(0.62, 0.28, 0.8, 0.66, 0, 22, wall);
  iso.hip(0.22, 0.18, 0.64, 0.68, 30, 16, roof);
  iso.gable(0.62, 0.26, 0.82, 0.68, 22, 10, 'u', roof, wall);
  iso.windowsLeft(0.66, 0.28, 0.58, 17, 26, 3, glass(rng, 0.45), COLORS.white);
  iso.windowsLeft(0.66, 0.28, 0.46, 4, 13, 2, glass(rng, 0.4), COLORS.white);
  // grand door
  iso.r.poly([P(0.52, 0.66, 13), P(0.58, 0.66, 13), P(0.58, 0.66, 0), P(0.52, 0.66, 0)], darken(roof, 0.2));
  // gravel drive + garden trees
  iso.quad(0.52, 0.7, 0.6, 1, 0, alpha(COLORS.pavement, 0.85));
  iso.ball(0.14, 0.76, 0.09, 20, COLORS.treeGreen);
  iso.cone(0.86, 0.8, 0.08, 22, COLORS.treeDeep);
  return iso.build();
}

// ===========================================================================
// PER-CITY BESPOKE DOMESTIC STOCK (WP6 + WAVE ζ)
// ---------------------------------------------------------------------------
// Cities stop looking like reskinned London terraces. Each function below is a
// hand-drawn archetype whose SILHOUETTE + ROOFLINE + PALETTE read as that place
// at a glance — NOT a recoloured London terrace. They are baked CONDITIONALLY
// (only when their fabric is active — see atlas.ts buildCityStockBufs) and ride
// their OWN off-atlas buffers, so London adds zero frames (byte-identical) and
// the shared sheet never carries 11 cities' stock at once. They are wired
// per-fabric in tileChooser.ts exactly like the Paris `haussmann_*` blocks.
// Pattern to follow for any future city:
//   1. add a `<city>` archetype fn here that reads the active fabric palette;
//   2. register its variants under a `case '<city>'` in atlas.buildCityStockBufs;
//   3. branch on `map.fabric === '<city>'` in tileChooser.cityStockFor.
// A shared rooftop-clutter helper keeps the flat-roof cities consistent. WAVE ζ
// added Sydney/Berlin/Shanghai/Cape Town/Athens/Pune/North-East to the original
// WP6 set (New York/Hong Kong/Cairo; Paris's Haussmann stays in-sheet).
// ===========================================================================

/** A wood-barrel water tank on a steel-leg frame (NYC), or a black plastic /
 *  galvanised roof tank (HK / Cairo). The single strongest flat-roof tell from
 *  above. `style` picks the look; placed at tile-local (cu,cv) on deck height z. */
function roofTank(
  iso: Iso, cu: number, cv: number, z: number, r: number,
  style: 'nycwood' | 'tank', rng: Rng,
): void {
  if (style === 'nycwood') {
    // four splayed steel legs
    for (const [du, dv] of [[-r, -r], [r, -r], [r, r], [-r, r]] as const) {
      iso.r.line(P(cu + du * 0.7, cv + dv * 0.7, z), P(cu + du, cv + dv, z + r * 16), INK_W * 0.7, COLORS.steelDark);
    }
    // the cedar barrel + conical cap
    const bz = z + r * 14;
    iso.box(cu - r, cv - r, cu + r, cv + r, bz, bz + r * 22, hex('#7a5a40'), { topC: hex('#6a4c34') });
    iso.r.poly([P(cu - r * 1.2, cv, bz + r * 22), P(cu + r * 1.2, cv, bz + r * 22), P(cu, cv, bz + r * 30)], hex('#4a3a30'));
  } else {
    // squat cylindrical/box tank straight on the deck (matte black or galv.)
    const c = rng.chance(0.5) ? hex('#2e2e30') : hex('#9aa0a2');
    iso.box(cu - r, cv - r, cu + r, cv + r, z, z + r * 12, c, { ink: false });
    iso.quad(cu - r, cv - r, cu + r, cv + r, z + r * 12, lighten(c, 0.12));
  }
}

/** A bristle of satellite dishes + a rooftop junk box — Cairo/HK rooftop chaos. */
function roofDishes(iso: Iso, u0: number, u1: number, v0: number, v1: number, z: number, rng: Rng, n: number): void {
  for (let i = 0; i < n; i++) {
    const cu = u0 + (u1 - u0) * rng.range(0.12, 0.88);
    const cv = v0 + (v1 - v0) * rng.range(0.12, 0.7);
    const dz = z + rng.range(1, 5);
    // a pale dish facing up-east, on a short stalk
    iso.r.line(P(cu, cv, z), P(cu, cv, dz), INK_W * 0.5, alpha(INK, 0.6));
    const dr = rng.range(0.018, 0.03);
    iso.r.poly(
      [P(cu - dr, cv - dr, dz + dr * 30), P(cu + dr, cv - dr, dz + dr * 22), P(cu + dr, cv + dr, dz), P(cu - dr, cv + dr, dz + dr * 8)],
      rng.chance(0.5) ? hex('#d8d2c4') : hex('#c4bcae'),
    );
  }
}

/**
 * Bespoke NEW YORK stock — the BROWNSTONE row house. 3–4 storeys over a
 * half-sunk basement, faced in warm chocolate-russet sandstone (NOT London
 * red brick), with the three defining tells: a projecting external STOOP of
 * stone steps to a raised parlour door, a deep bracketed CORNICE crowning a
 * FLAT roof, and a full-height squared BAY. A row of them reads as one
 * continuous cliff — identical cornice height, rhythmic stoops like teeth on
 * the sidewalk. (docs/cities/new-york.md: wallMain #9B5B43, cornice/cliff.)
 */
export function brownstoneTile(seed: number, variant: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 33391 + variant * 97 + 19);
  // warm brownstone sandstone — chocolate→russet, a little per-house variation
  const stoneSet: RGBA[] = [hex('#9b5b43'), hex('#8a4f3a'), hex('#a3654a'), hex('#7e4938')];
  const trim = hex('#cdb497'); // pale cast-stone lintels/cornice
  const v0 = 0.12;
  const v1 = 0.74;
  const floors = 3 + (variant % 2); // 3–4 storeys, even cornice line per row
  const fh = 11;
  const base = 6; // half-sunk basement band
  const H = base + floors * fh;
  iso.shadow(0, v0, 1, v1, 0.2, 0.22);
  // three attached houses across the tile
  for (let i = 0; i < 3; i++) {
    const u0 = i / 3;
    const u1 = (i + 1) / 3;
    const stone = stoneSet[(variant + i) % stoneSet.length] ?? stoneSet[0]!;
    iso.box(u0, v0, u1, v1, 0, H, stone);
    // rusticated basement band (darker, a sill line above it)
    iso.r.poly([P(u0, v1, base), P(u1, v1, base), P(u1, v1, 0), P(u0, v1, 0)], darken(stone, 0.22));
    iso.edge(P(u0, v1, base), P(u1, v1, base), INK_W * 0.6, alpha(INK, 0.5));
    // a full-height squared BAY on the left half of each house
    const b0 = u0 + 0.03;
    const b1 = u0 + 0.16;
    iso.box(b0, v1 - 0.001, b1, v1 + 0.05, base, H - 3, lighten(stone, 0.06));
    for (let f = 0; f < floors; f++) {
      const zb = base + f * fh + 2;
      const zt = base + f * fh + fh - 1.5;
      // tall narrow sashes (very vertical) across the flat face, plus the bay
      iso.windowsLeft(v1, u0 + 0.18, u1 - 0.04, zb, zt, 2, glass(rng, 0.42), trim);
      iso.windowsLeft(v1 + 0.05, b0 + 0.012, b1 - 0.012, zb, zt, 1, glass(rng, 0.45), trim);
    }
    // projecting STOOP: a flight of stone steps to the raised parlour door
    const sdoorU = u1 - 0.085;
    const stoopOut = 0.14;
    for (let s = 0; s < 6; s++) {
      const sv = v1 + (stoopOut * s) / 6;
      const sz = base + fh - 2 - ((base + fh - 2) * s) / 6;
      iso.r.poly([P(sdoorU - 0.05, sv, sz), P(sdoorU + 0.03, sv, sz), P(sdoorU + 0.03, sv + 0.024, sz), P(sdoorU - 0.05, sv + 0.024, sz)], lighten(trim, 0.04));
      iso.r.poly([P(sdoorU - 0.05, sv + 0.024, sz), P(sdoorU + 0.03, sv + 0.024, sz), P(sdoorU + 0.03, sv + 0.024, sz - 3.2), P(sdoorU - 0.05, sv + 0.024, sz - 3.2)], shaded(trim, 0.1));
    }
    // the parlour door at the head of the stoop
    iso.r.poly([P(sdoorU - 0.045, v1, base + fh - 2), P(sdoorU + 0.02, v1, base + fh - 2), P(sdoorU + 0.02, v1, base + 2), P(sdoorU - 0.045, v1, base + 2)], darken(stone, 0.4));
    iso.r.poly([P(sdoorU - 0.055, v1, base + fh - 1), P(sdoorU + 0.03, v1, base + fh - 1), P(sdoorU + 0.03, v1, base + fh - 2), P(sdoorU - 0.055, v1, base + fh - 2)], trim);
  }
  // gable-end windows on the right wall
  iso.windowsRight(1, v0 + 0.1, v1 - 0.1, base + 4, H - 6, floors >= 4 ? 3 : 2, glass(rng, 0.3), trim);
  // FLAT roof with a deep bracketed CORNICE — the strong horizontal cliff line
  iso.box(0, v0, 1, v1, H, H + 3, stoneSet[0]!, { ink: false, topC: shaded(hex('#3b3a40'), 0.05) });
  // cornice: a protruding ledge with bracket ticks under it
  iso.r.poly([P(-0.01, v1, H + 3.5), P(1.01, v1, H + 3.5), P(1.01, v1 + 0.03, H + 2), P(-0.01, v1 + 0.03, H + 2)], lighten(trim, 0.05));
  iso.r.poly([P(-0.01, v1 + 0.03, H + 2), P(1.01, v1 + 0.03, H + 2), P(1.01, v1 + 0.03, H - 1), P(-0.01, v1 + 0.03, H - 1)], shaded(trim, 0.12));
  iso.edge(P(-0.01, v1 + 0.03, H + 2), P(1.01, v1 + 0.03, H + 2), INK_W * 0.8);
  for (let u = 0.04; u < 0.98; u += 0.06) {
    iso.r.line(P(u, v1 + 0.03, H + 2), P(u, v1 + 0.03, H - 0.5), INK_W * 0.5, alpha(INK, 0.5));
  }
  // a street tree in its kerb pit
  if (rng.chance(0.7)) iso.ball(0.5, 0.9, 0.07, 17, COLORS.treeGreen);
  return iso.build();
}

/**
 * Bespoke NEW YORK stock — the pre-war SETBACK "wedding-cake" tower (the 1916
 * zoning ziggurat). A bulky masonry block rising sheer from the lot line then
 * stepping back in chunky asymmetric TIERS, read as base / shaft / crown in
 * buff or warm-red brick, crowned with timber WATER TOWERS on steel legs and
 * parapets. Tells: the stepped wedding-cake setbacks + barrel water tanks.
 */
export function setbackTile(seed: number, variant: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 41957 + variant * 211 + 13);
  // pre-war masonry: buff/tan limestone-ish, warm red brick, or pale Deco brick
  const brickSet: RGBA[] = [hex('#c8a878'), hex('#a85a44'), hex('#d8c9b0'), hex('#b5623f'), hex('#8a4a3a'), hex('#bf9a6a')];
  const brick = brickSet[variant % brickSet.length] ?? brickSet[0]!;
  const trim = COLORS.white;
  // three stacked tiers, each inset from the one below (the wedding cake)
  const tiers: Array<[number, number]> = [ // [inset, height]
    [0.06, 46 + (variant % 3) * 8],
    [0.16, 30 + (seed % 3) * 6],
    [0.26, 20 + (variant % 2) * 8],
  ];
  let z = 0;
  iso.shadow(0.06, 0.1, 0.94, 0.7, 0.3, 0.26);
  for (let t = 0; t < tiers.length; t++) {
    const [inset, th] = tiers[t]!;
    const u0 = inset;
    const u1 = 1 - inset;
    const v0 = inset;
    const v1 = 1 - inset;
    iso.box(u0, v0, u1, v1, z, z + th, t === 0 ? brick : lighten(brick, 0.05 * t));
    // dense, small, deeply-set windows in a tight grid on both faces
    const cols = Math.max(3, Math.round((u1 - u0) * 9));
    for (let zz = z + 7; zz < z + th - 5; zz += 11) {
      iso.windowsLeft(v1, u0 + 0.03, u1 - 0.03, zz, zz + 6, cols, glass(rng, 0.34), undefined);
      iso.windowsRight(u1, v0 + 0.03, v1 - 0.03, zz, zz + 6, cols, glass(rng, 0.3), undefined);
    }
    // a pale parapet/setback band crowning each tier
    iso.box(u0 - 0.005, v0 - 0.005, u1 + 0.005, v1 + 0.005, z + th, z + th + 2.5, trim, { ink: false, topC: shaded(hex('#3b3a40'), 0.06) });
    z += th;
  }
  // the base tier carries a stone-trimmed ground band (base/shaft read)
  iso.r.poly([P(0.06, 0.7, 13), P(0.94, 0.7, 13), P(0.94, 0.7, 11), P(0.06, 0.7, 11)], trim);
  // WATER TOWERS on the setback terraces + the crown — the NYC roofscape tell
  const topInset = tiers[2]![0];
  roofTank(iso, 0.5, 0.42, z, 0.05, 'nycwood', rng);
  // one more on a lower terrace, off to a side
  roofTank(iso, tiers[1]![0] + 0.06, 0.34, tiers[0]![1] + tiers[1]![1], 0.04, 'nycwood', rng);
  // parapet bulkhead + a slim flag mast on the crown
  iso.box(topInset + 0.04, topInset + 0.04, topInset + 0.12, topInset + 0.12, z, z + 9, shaded(brick, 0.08));
  iso.box(1 - topInset - 0.09, topInset + 0.05, 1 - topInset - 0.06, topInset + 0.08, z, z + 16, COLORS.steelDark);
  void topInset;
  return iso.build();
}

/**
 * Bespoke HONG KONG stock — the dense residential SLAB on a retail PODIUM.
 * A wide windowless podium (carpark/mall) from which a slender flat-topped
 * tower shoots straight up, its facade peppered with tiny gridded windows,
 * projecting BAY-WINDOW wings, hanging AC units and laundry-pole racks, the
 * flat roof crammed with water tanks + a lift overrun. Clusters of these read
 * as the "wall of towers". (docs/cities/hong-kong.md: wallMain #C9CCD2.)
 */
export function hktowerTile(seed: number, variant: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 53113 + variant * 173 + 23);
  // weathered grey concrete, cooler estate render, or a pastel repaint skin
  const skinSet: RGBA[] = [hex('#c9ccd2'), hex('#a7b0b4'), hex('#d8b79a'), hex('#c4a8a8'), hex('#b8c0bc'), hex('#cfcab8')];
  const skin = skinSet[variant % skinSet.length] ?? skinSet[0]!;
  const ac = hex('#d7d4cc'); // grubby off-white AC boxes
  // PODIUM: a broad, distinctly-read low base (carpark/mall) filling the tile —
  // the slab+podium massing is the HK tell, so it's tall enough to register and
  // capped with a proud deck edge that the tower then rises FROM.
  const pu0 = 0.06;
  const pu1 = 0.94;
  const pv0 = 0.12;
  const pv1 = 0.82;
  const pH = 30 + (variant % 2) * 7;
  iso.shadow(pu0, pv0, pu1, pv1, 0.26, 0.26);
  iso.box(pu0, pv0, pu1, pv1, 0, pH, shaded(skin, 0.04), { topC: shaded(hex('#5b6068'), 0.06) });
  // glazed retail band at street level wrapping BOTH visible faces + a banded
  // carpark grille above it, then a proud podium deck rim crowning the base
  iso.r.poly([P(pu0 + 0.02, pv1, 12), P(pu1 - 0.02, pv1, 12), P(pu1 - 0.02, pv1, 2), P(pu0 + 0.02, pv1, 2)], glass(rng, 0.62));
  iso.r.poly([P(pu1, pv0 + 0.02, 12), P(pu1, pv1 - 0.02, 12), P(pu1, pv1 - 0.02, 2), P(pu1, pv0 + 0.02, 2)], glass(rng, 0.5));
  for (let zz = 15; zz < pH - 3; zz += 3.5) {
    iso.r.line(P(pu0, pv1, zz), P(pu1, pv1, zz), INK_W * 0.4, alpha(INK, 0.32));
    iso.r.line(P(pu1, pv0, zz), P(pu1, pv1, zz), INK_W * 0.4, alpha(INK, 0.28));
  }
  // proud deck rim (a pale cap line) — visually separates podium from tower
  iso.box(pu0 - 0.006, pv0 - 0.006, pu1 + 0.006, pv1 + 0.006, pH, pH + 2.5, lighten(skin, 0.04), { ink: false, topC: shaded(hex('#5b6068'), 0.08) });
  iso.edge(P(pu0, pv1 + 0.006, pH + 2.5), P(pu1, pv1 + 0.006, pH + 2.5), INK_W * 0.7);
  // the slender TOWER rising straight from the podium, flat-topped. Height is
  // capped so the trimmed cell stays compatible with the ≤4096px shared sheet
  // (still reads tall/supertall, just not unbounded).
  const tu0 = 0.24;
  const tu1 = 0.7;
  const tv0 = 0.3;
  const tv1 = 0.66;
  const pTop = pH + 2.5; // tower rises from the podium deck rim
  const H = pTop + 96 + (variant % 4) * 16 + (seed % 3) * 6;
  iso.box(tu0, tv0, tu1, tv1, pTop, H, skin);
  // relentless tiny gridded windows + projecting BAY-WINDOW wings every floor
  const fh = 9.5;
  for (let zz = pTop + 6; zz < H - 6; zz += fh) {
    iso.windowsLeft(tv1, tu0 + 0.03, tu1 - 0.03, zz, zz + fh - 4, 4, glass(rng, 0.4), undefined);
    iso.windowsRight(tu1, tv0 + 0.03, tv1 - 0.03, zz, zz + fh - 4, 3, glass(rng, 0.36), undefined);
    // a projecting bay wing on the left face (the HK "wing")
    iso.r.poly([P(tu0, tv1, zz + fh - 3), P(tu0, tv1 + 0.02, zz + fh - 3), P(tu0, tv1 + 0.02, zz + 1), P(tu0, tv1, zz + 1)], shaded(skin, 0.14));
    iso.box(tu0 - 0.004, tv1 - 0.001, tu0 + 0.1, tv1 + 0.022, zz + 1, zz + fh - 3, lighten(skin, 0.04), { ink: false });
    // hanging AC units + the odd laundry pole projecting from the face
    if (rng.chance(0.55)) {
      const au = rng.range(tu0 + 0.06, tu1 - 0.06);
      iso.box(au, tv1, au + 0.03, tv1 + 0.018, zz + 2, zz + 5.5, ac, { ink: false });
    }
    if (rng.chance(0.3)) {
      const lu = rng.range(tu0 + 0.05, tu1 - 0.05);
      iso.r.line(P(lu, tv1 + 0.02, zz + 3), P(lu, tv1 + 0.075, zz + 3), INK_W * 0.5, alpha(INK, 0.6));
    }
  }
  // FLAT roof clutter: water tanks, a lift overrun, antennae
  iso.box(tu0, tv0, tu1, tv1, H, H + 2, skin, { ink: false, topC: shaded(hex('#5b6068'), 0.04) });
  iso.box(tu0 + 0.08, tv0 + 0.06, tu0 + 0.2, tv0 + 0.16, H + 2, H + 16, shaded(skin, 0.1)); // lift overrun
  roofTank(iso, tu1 - 0.1, tv0 + 0.12, H + 2, 0.035, 'tank', rng);
  roofTank(iso, tu0 + 0.28, tv1 - 0.08, H + 2, 0.03, 'tank', rng);
  iso.r.line(P(0.5, 0.46, H + 2), P(0.5, 0.46, H + 18), INK_W * 0.55, alpha(INK, 0.7)); // antenna
  return iso.build();
}

/**
 * Bespoke HONG KONG stock — the older TONG LAU walk-up: 5–8 storeys, narrow
 * and deep, flat-roofed, weathered pastel render streaked with water stains,
 * continuous projecting balconies/shutters, riotous shop signs, AC units, a
 * cluttered roof. Fills the denser non-tower fabric so HK isn't ALL supertalls.
 */
export function tonglauTile(seed: number, variant: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 60223 + variant * 89 + 31);
  const skinSet: RGBA[] = [hex('#ccbfa0'), hex('#bcae9c'), hex('#c4a8a8'), hex('#a7b0b4'), hex('#cabf8e'), hex('#b8b0a4')];
  const v0 = 0.14;
  const v1 = 0.78;
  const floors = 5 + (variant % 4);
  const fh = 10;
  const H = floors * fh + 4;
  iso.shadow(0, v0, 1, v1, 0.22, 0.24);
  // two attached narrow blocks
  for (let i = 0; i < 2; i++) {
    const u0 = i * 0.5;
    const u1 = u0 + 0.5;
    const skin = skinSet[(variant + i) % skinSet.length] ?? skinSet[0]!;
    iso.box(u0, v0, u1, v1, 0, H, skin);
    // ground-floor shopfront under a cantilevered upper floor (five-foot way)
    iso.r.poly([P(u0 + 0.03, v1, 9), P(u1 - 0.03, v1, 9), P(u1 - 0.03, v1, 1), P(u0 + 0.03, v1, 1)], glass(rng, 0.6));
    // a bright vertical shop sign/banner hanging off the face
    const sgn = ([hex('#c0392b'), hex('#1f8f6a'), hex('#e8a23f'), hex('#46518f')] as RGBA[])[(seed + i) % 4]!;
    iso.box(u0 + 0.06, v1 + 0.01, u0 + 0.1, v1 + 0.04, 10, fh * (floors - 1), sgn, { ink: false });
    // continuous projecting balconies floor by floor + shutters/AC
    for (let f = 1; f < floors; f++) {
      const z = f * fh;
      iso.r.poly([P(u0 + 0.02, v1 + 0.03, z + 0.6), P(u1 - 0.02, v1 + 0.03, z + 0.6), P(u1 - 0.02, v1, z + 0.6), P(u0 + 0.02, v1, z + 0.6)], lit(skin, 0.08));
      iso.r.line(P(u0 + 0.02, v1 + 0.03, z + 4.5), P(u1 - 0.02, v1 + 0.03, z + 4.5), INK_W * 0.55, alpha(INK, 0.6));
      iso.windowsLeft(v1, u0 + 0.05, u1 - 0.05, z + 1.5, z + fh - 2, 2, glass(rng, 0.42), COLORS.white);
      if (rng.chance(0.5)) {
        const au = rng.range(u0 + 0.08, u1 - 0.1);
        iso.box(au, v1, au + 0.028, v1 + 0.016, z + 2, z + 5, hex('#d7d4cc'), { ink: false });
      }
    }
    // water-stain streaks down the weathered render
    for (let s = 0; s < 3; s++) {
      const su = rng.range(u0 + 0.06, u1 - 0.06);
      iso.r.line(P(su, v1, H - 3), P(su, v1, H * rng.range(0.3, 0.6)), INK_W * 0.5, alpha(shaded(skin, 0.22), 0.4));
    }
  }
  iso.windowsRight(1, v0 + 0.08, v1 - 0.08, 8, H - 6, floors >= 7 ? 3 : 2, glass(rng, 0.3), COLORS.white);
  // flat cluttered roof: a parapet, tanks + dishes
  iso.box(0, v0, 1, v1, H, H + 3, skinSet[0]!, { ink: false, topC: shaded(hex('#5b6068'), 0.05) });
  roofTank(iso, 0.3, 0.4, H + 3, 0.032, 'tank', rng);
  roofDishes(iso, 0.05, 0.95, v0, v1, H + 3, rng, 4);
  return iso.build();
}

/**
 * Bespoke CAIRO stock — the desert low-rise vernacular: a 5–9 storey
 * red-brick-infill / concrete-frame walk-up. Tells: the exposed reinforced-
 * CONCRETE FRAME with bare RED-BRICK infill (no render), an UNFINISHED top
 * floor with rusty REBAR columns spiking above the parapet, a flat roof
 * crammed with satellite dishes + water tanks, all under a sandy ochre dust.
 * (docs/cities/cairo.md: wallMain #C7A66B, wallAlt bare brick #B5805A.)
 */
export function cairoblockTile(seed: number, variant: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 70237 + variant * 151 + 29);
  const frame = hex('#b8a888'); // dusty grey-ochre concrete frame
  const brickSet: RGBA[] = [hex('#b5805a'), hex('#a8704a'), hex('#c08a5e'), hex('#9c6644')]; // bare red/brown brick infill
  const dust = hex('#c7a66b');
  const v0 = 0.16;
  const v1 = 0.78;
  const finished = 4 + (variant % 4); // finished storeys
  const unfinished = variant % 2; // 0–1 bare/half-built top floor
  const fh = 11;
  const H = finished * fh + 4;
  iso.shadow(0, v0, 1, v1, 0.22, 0.24);
  // two attached blocks at slightly MISMATCHED heights (the jagged Cairo skyline)
  for (let i = 0; i < 2; i++) {
    const u0 = i * 0.5;
    const u1 = u0 + 0.5;
    const dh = i === 1 ? (variant % 2 === 0 ? fh : -fh) : 0; // neighbour offset
    const bH = Math.max(fh * 3 + 4, H + dh);
    const brick = brickSet[(variant + i) % brickSet.length] ?? brickSet[0]!;
    // the concrete frame: a dusty box
    iso.box(u0, v0, u1, v1, 0, bH, frame);
    // brick INFILL panels recessed within the frame, floor by floor, leaving
    // the frame's columns + floor slabs proud (the concrete-frame tell)
    const bfloors = Math.round((bH - 4) / fh);
    for (let f = 0; f < bfloors; f++) {
      const z0 = f * fh + 2;
      const z1 = f * fh + fh - 1;
      // two brick infill bays per block, with a column gap between
      for (const [iu0, iu1] of [[u0 + 0.04, u0 + 0.225], [u0 + 0.275, u1 - 0.04]] as const) {
        iso.r.poly([P(iu0, v1, z1), P(iu1, v1, z1), P(iu1, v1, z0), P(iu0, v1, z0)], shaded(brick, 0.04));
        // a small punched window in each bay
        iso.windowsLeft(v1, iu0 + 0.02, iu1 - 0.02, z0 + 2, z1 - 1, 1, glass(rng, 0.3), undefined);
      }
      // the proud floor slab line
      iso.r.line(P(u0, v1, z1 + 0.5), P(u1, v1, z1 + 0.5), INK_W * 0.5, alpha(lit(frame, 0.1), 0.8));
    }
    // ground floor: a dusty shopfront / garage shutter
    iso.r.poly([P(u0 + 0.05, v1, 8), P(u1 - 0.05, v1, 8), P(u1 - 0.05, v1, 0), P(u0 + 0.05, v1, 0)], darken(frame, 0.22));
    // UNFINISHED top: bare concrete columns + rusty REBAR spiking up (only the
    // taller of the two, so the row reads "still being built")
    if (unfinished && i === (variant % 2)) {
      const colUs = [u0 + 0.08, u0 + 0.25, u1 - 0.08];
      for (const cu of colUs) {
        iso.box(cu - 0.018, (v0 + v1) / 2 - 0.02, cu + 0.018, (v0 + v1) / 2 + 0.02, bH, bH + 9, frame);
        // 3 rusty rebar whiskers off the column top
        for (const dd of [-0.01, 0, 0.01]) {
          iso.r.line(P(cu + dd, (v0 + v1) / 2, bH + 9), P(cu + dd * 2, (v0 + v1) / 2, bH + 15), INK_W * 0.5, hex('#8a6a3a'));
        }
      }
      // a half-poured grey slab between the columns
      iso.quad(u0 + 0.06, (v0 + v1) / 2 - 0.04, u1 - 0.06, (v0 + v1) / 2 + 0.06, bH + 1, alpha(hex('#9a9488'), 0.85));
    }
    void dust;
  }
  iso.windowsRight(1, v0 + 0.08, v1 - 0.08, 8, H - 6, 2, glass(rng, 0.28), undefined);
  // flat roof crammed with dishes + tanks (on the finished block)
  iso.box(0, v0, 1, v1, H, H + 3, frame, { ink: false, topC: shaded(hex('#9a8568'), 0.05) });
  roofTank(iso, 0.7, 0.4, H + 3, 0.03, 'tank', rng);
  roofDishes(iso, 0.05, 0.6, v0, v1, H + 3, rng, 5);
  return iso.build();
}

/**
 * Bespoke SYDNEY stock — the Federation / Victorian inner-suburb TERRACE with
 * a cast-IRON-LACE VERANDAH over the footpath. A 2-storey honey-sandstone or
 * polychrome-brick row; the tell is the lacework-frieze verandah on slender
 * iron posts shading the front, a corrugated-iron skillion verandah roof, then
 * the main pitched terracotta-tile roof behind a low parapet, party-wall
 * chimneys. A row reads as a continuous balconied street wall (Paddington/
 * Glebe).
 */
export function sydterraceTile(seed: number, variant: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 38693 + variant * 109 + 17);
  // honey sandstone, cream render, warm face brick, polychrome brown
  const wallSets: RGBA[][] = [
    [BUFF_BRICK, RENDER_CREAM, BRICK_ORANGE],
    [RENDER_CREAM, BUFF_BRICK, BRICK_RED],
    [BRICK_RED, BUFF_BRICK, RENDER_CREAM],
    [BUFF_BRICK, BRICK_ORANGE, BUFF_BRICK],
  ];
  const walls = wallSets[variant % 4] ?? wallSets[0]!;
  const tile = TILE_RED; // terracotta tile roof
  const iron = hex('#2a2a30'); // black cast-iron lace + posts
  const lace = lighten(COLORS.white, 0.02); // creamy painted lacework
  const v0 = 0.12;
  const v1 = 0.7;
  const H = 30; // two storeys to the eaves
  iso.shadow(0, v0, 1, v1, 0.22, 0.22);
  // three attached houses
  for (let i = 0; i < 3; i++) {
    const u0 = i / 3;
    const u1 = (i + 1) / 3;
    const wall = walls[i] ?? BUFF_BRICK;
    iso.box(u0, v0, u1, v1, 0, H, wall);
    // upper + lower sash windows behind the verandah (set back)
    iso.windowsLeft(v1, u0 + 0.05, u1 - 0.05, 18, 26, 2, glass(rng, 0.4), COLORS.white);
    iso.windowsLeft(v1, u0 + 0.05, u1 - 0.05, 4, 12, 2, glass(rng, 0.42), COLORS.white);
  }
  // gable-end windows on the right wall of the row
  iso.windowsRight(1, v0 + 0.08, v1 - 0.08, 5, H - 5, 2, glass(rng, 0.3), COLORS.white);
  // the TWO-STOREY cast-iron VERANDAH across the whole front — Sydney's tell.
  // a deck slab at first-floor level, slender posts top and bottom, and a
  // pierced lacework frieze + balustrade.
  const vf = v1 + 0.16; // verandah eave line out over the footpath
  const deck = 14; // first-floor verandah deck height
  // verandah floor slab + first-floor deck soffit
  iso.r.poly([P(0, v1, deck), P(1, v1, deck), P(1, vf, deck), P(0, vf, deck)], shaded(lace, 0.08));
  iso.r.poly([P(0, vf, deck), P(1, vf, deck), P(1, vf, deck - 1.4), P(0, vf, deck - 1.4)], lace);
  // posts: ground + upper storey
  for (let u = 0.06; u <= 0.95; u += 0.16) {
    iso.r.line(P(u, vf, 0), P(u, vf, deck - 1.4), INK_W * 0.7, iron);
    iso.r.line(P(u, vf, deck), P(u, vf, H - 1), INK_W * 0.7, iron);
  }
  // upper lacework frieze valance under the verandah roof + balustrade band
  iso.r.poly([P(0, vf, H - 1), P(1, vf, H - 1), P(1, vf, H - 5), P(0, vf, H - 5)], alpha(lace, 0.9));
  for (let u = 0.04; u < 0.99; u += 0.022) {
    iso.r.line(P(u, vf, H - 1), P(u, vf, H - 4.5), INK_W * 0.4, alpha(iron, 0.55)); // pierced frieze ticks
  }
  iso.r.poly([P(0, vf, deck + 4.5), P(1, vf, deck + 4.5), P(1, vf, deck), P(0, vf, deck)], alpha(lace, 0.85));
  for (let u = 0.04; u < 0.99; u += 0.02) {
    iso.r.line(P(u, vf, deck + 4.5), P(u, vf, deck + 0.6), INK_W * 0.35, alpha(iron, 0.7)); // balusters
  }
  iso.r.line(P(0, vf, deck + 4.5), P(1, vf, deck + 4.5), INK_W * 0.7, iron);
  // corrugated-iron skillion verandah roof + the main terracotta roof behind
  iso.r.poly([P(0, v1, H + 3), P(1, v1, H + 3), P(1, vf, H - 1), P(0, vf, H - 1)], lit(hex('#8a8f93'), 0.04));
  iso.edge(P(0, vf, H - 1), P(1, vf, H - 1), INK_W * 0.7);
  domesticRoof(iso, 0, v0, 1, v1, H + 3, 12, 'u', tile, walls[0] ?? BUFF_BRICK, rng);
  // party-wall chimneys with terracotta pots
  for (const cu of [0.16, 0.5, 0.84]) {
    const vm = (v0 + v1) / 2;
    iso.box(cu - 0.025, vm - 0.04, cu + 0.025, vm + 0.04, H + 9, H + 19, darken(walls[0] ?? BUFF_BRICK, 0.12));
    iso.box(cu - 0.01, vm - 0.02, cu + 0.012, vm, H + 19, H + 23, POT_CLAY, { ink: false });
  }
  return iso.build();
}

/**
 * Bespoke SYDNEY stock — the post-war brick-and-tile suburban BUNGALOW, the
 * dominant Sydney house. A single-storey detached cottage in face brick under
 * a broad HIPPED TERRACOTTA-tile roof with wide eaves, a projecting front
 * gable-room, a small porch, set in a lawn behind a low front fence. The
 * sprawling hip + warm terracotta is the suburban tell (vs London's narrow
 * pitched terraces).
 */
export function sydbungalowTile(seed: number, variant: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 44351 + variant * 67 + 23);
  const wall = ([BUFF_BRICK, BRICK_ORANGE, RENDER_CREAM, BRICK_RED] as RGBA[])[variant % 4] ?? BUFF_BRICK;
  const tile = ([TILE_RED, hex('#9c5238'), TILE_RED, hex('#7a7d80')] as RGBA[])[variant % 4] ?? TILE_RED;
  const u0 = 0.14;
  const u1 = 0.66;
  const v0 = 0.18;
  const v1 = 0.66;
  const H = 19; // low single storey
  iso.shadow(u0, v0, u1 + 0.06, v1 + 0.02, 0.18, 0.2);
  // main body + broad hipped roof with wide eaves
  iso.box(u0, v0, u1, v1, 0, H, wall);
  iso.hip(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, H, 15, tile);
  // windows on the street face
  iso.windowsLeft(v1, u0 + 0.05, u1 - 0.16, 7, 14, 2, glass(rng, 0.42), COLORS.white);
  // projecting front gable-room (the tell) on the right of the facade
  const g0 = u1 - 0.02;
  const g1 = u1 + 0.16;
  iso.box(g0, v0 + 0.06, g1, v1 + 0.04, 0, H + 2, lighten(wall, 0.04));
  iso.gable(g0 - 0.02, v0 + 0.04, g1 + 0.02, v1 + 0.06, H + 2, 12, 'v', tile, wall);
  iso.windowsLeft(v1 + 0.04, g0 + 0.02, g1 - 0.02, 6, 14, 1, glass(rng, 0.45), COLORS.white);
  // little porch + door between body and gable-room
  iso.r.poly([P(u1 - 0.1, v1, 11), P(u1 - 0.03, v1, 11), P(u1 - 0.03, v1, 0), P(u1 - 0.1, v1, 0)], darken(wall, 0.4));
  iso.r.poly([P(u1 - 0.12, v1, 13), P(u1 + 0.0, v1, 13), P(u1 - 0.02, v1 + 0.04, 11), P(u1 - 0.1, v1 + 0.04, 11)], lit(tile, 0.06));
  // a chimney on the near slope
  iso.box(u0 + 0.1, (v0 + v1) / 2, u0 + 0.15, (v0 + v1) / 2 + 0.05, H + 12, H + 20, darken(wall, 0.12));
  // low front fence + lawn shrub
  iso.box(u0 - 0.04, 0.92, g1, 0.96, 0, 4, shaded(COLORS.white, 0.06));
  if (rng.chance(0.7)) iso.ball(u0 + 0.02, 0.82, 0.06, 13, COLORS.treeGreen);
  // paved drive to the plot edge
  iso.quad(g0 + 0.02, v1 + 0.04, g1 + 0.02, 0.96, 0, alpha(COLORS.pavement, 0.9));
  return iso.build();
}

/**
 * Bespoke BERLIN stock — the ALTBAU MIETSHAUS: the pre-1914 perimeter-block
 * tenement that defines inner Berlin. A 5–6 storey stuccoed apartment block
 * built hard to the street, ornate render facade with strong horizontal
 * string-courses + a heavy cornice, tall windows in a strict grid, a few
 * projecting Erker bay-oriels and small iron balconies, crowned by a steep
 * grey MANSARD with dormers. Reads as a continuous, dignified street wall —
 * taller, more ornate, and flat-fronted vs London's bay-fronted brick.
 */
export function altbauTile(seed: number, variant: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 39041 + variant * 127 + 19);
  // grey-beige / ochre / pale-green Berlin stucco
  const stoneSet: RGBA[] = [RENDER_CREAM, hex('#c2b58e'), hex('#b9a578'), hex('#aeb0a6'), hex('#c8bfa8'), hex('#cfc9bb')];
  const stone = stoneSet[variant % stoneSet.length] ?? stoneSet[0]!;
  const zinc = SLATE; // grey zinc/slate mansard
  const band = darken(stone, 0.14); // string-course shadow line
  const iron = hex('#3a3a40');
  const frame = lighten(COLORS.white, 0.02);
  const u0 = 0;
  const u1 = 1;
  const v0 = 0.08;
  const v1 = 0.84;
  // VARIETY (owner: Berlin reads as one homogenous mass): the Berlin perimeter
  // block is built to a mix of eras/heights, so step the storeys across the
  // variant range (3 modest Gründerzeit → 7 tall Wilhelmine) instead of a flat
  // 5–6. Neighbouring tiles take different variants ⇒ a varied street wall, not
  // graph paper.
  const floors = ([4, 6, 5, 7, 3, 6] as const)[variant % 6] ?? 5;
  const fh = 8.8;
  const H = Math.round(10 + floors * fh); // cornice height
  const shop = variant % 3 === 0;
  iso.shadow(u0, v0, u1, v1, 0.26, 0.24);
  iso.box(u0, v0, u1, v1, 0, H, stone);
  // tall ground-floor (Hochparterre) sill line
  iso.edge(P(u0, v1, fh + 3), P(u1, v1, fh + 3), INK_W * 0.6, alpha(INK, 0.5));
  // horizontal string-courses between floors (the Berlin Gliederung)
  for (let f = 1; f <= floors; f++) {
    const z = 10 + f * fh;
    iso.r.line(P(u0, v1, z), P(u1, v1, z), INK_W * 0.6, alpha(band, 0.9));
    iso.r.line(P(u1, v0, z), P(u1, v1, z), INK_W * 0.6, alpha(band, 0.9));
  }
  // regular tall windows on both visible faces
  for (let f = 0; f < floors; f++) {
    const zb = 12 + f * fh + 1.2;
    const zt = 12 + f * fh + fh - 1.2;
    iso.windowsLeft(v1, u0 + 0.05, u1 - 0.05, zb, zt, 5, glass(rng, 0.42), frame);
    iso.windowsRight(u1, v0 + 0.05, v1 - 0.05, zb, zt, 4, glass(rng, 0.38), frame);
  }
  // a projecting Erker bay-oriel running the upper floors on the left face
  const e0 = u0 + 0.34;
  const e1 = u0 + 0.5;
  iso.box(e0, v1 - 0.001, e1, v1 + 0.045, fh + 3, H - fh, lighten(stone, 0.05));
  for (let f = 1; f < floors; f++) {
    const z = 10 + f * fh + 1;
    iso.windowsLeft(v1 + 0.045, e0 + 0.012, e1 - 0.012, z, z + fh - 2, 2, glass(rng, 0.45), frame);
  }
  // small iron balconies on a couple of floors
  for (const f of [2, floors - 1]) {
    if (f < 1 || f >= floors) continue;
    const z = 10 + f * fh;
    drawBalcony(iso, u0 + 0.06, u0 + 0.26, v1, z, iron, frame);
    drawBalcony(iso, u1 - 0.28, u1 - 0.06, v1, z, iron, frame);
  }
  // ground-floor shop on some blocks (the Berlin Eckkneipe / Späti)
  if (shop) {
    iso.windowsLeft(v1, u0 + 0.05, u1 - 0.05, 1.5, fh + 1, 5, COLORS.glassLit, frame);
    const awn = ([COLORS.orange, hex('#3f8f8a'), hex('#b5485f')] as RGBA[])[(seed + variant) % 3]!;
    iso.r.poly([P(u0 + 0.04, v1, fh + 2.4), P(u1 - 0.04, v1, fh + 2.4), P(u1 - 0.04, v1, fh + 1), P(u0 + 0.04, v1, fh + 1)], awn);
  }
  // heavy crowning cornice
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, H - 2, H + 2, lighten(stone, 0.06), { topC: top(stone, 0.3) });
  iso.edge(P(u0, v1 + 0.02, H + 2), P(u1, v1 + 0.02, H + 2), INK_W * 0.8);
  // the steep grey MANSARD with dormers (a minority of blocks are flat-roofed)
  const flatTop = variant % 4 === 3;
  if (flatTop) {
    iso.box(u0, v0, u1, v1, H + 2, H + 5, stone, { ink: false, topC: shaded(zinc, 0.06) });
  } else {
    const mr = 14 + (variant % 3) * 4;
    const ui = 0.16;
    const vi = 0.12;
    const zT = H + mr;
    iso.r.poly([P(u0, v1, H), P(u1, v1, H), P(u1 - ui, v1 - vi, zT), P(u0 + ui, v1 - vi, zT)], shaded(zinc, 0.16));
    iso.r.poly([P(u1, v0, H), P(u1, v1, H), P(u1 - ui, v1 - vi, zT), P(u1 - ui, v0 + vi, zT)], lit(zinc, 0.05));
    iso.r.polyline([P(u0, v1, H), P(u0 + ui, v1 - vi, zT), P(u1 - ui, v1 - vi, zT), P(u1 - ui, v0 + vi, zT), P(u1, v0, H)], INK_W, INK);
    iso.quad(u0 + ui, v0 + vi, u1 - ui, v1 - vi, zT, lighten(zinc, 0.1));
    // dormer windows on the near mansard slope
    for (const du of [0.2, 0.45, 0.7]) {
      const dz = H + mr * 0.42;
      iso.box(du, v1 - vi - 0.04, du + 0.07, v1 - vi + 0.02, dz, dz + 5, lighten(stone, 0.08), { ink: false });
      iso.windowsLeft(v1 - vi + 0.02, du + 0.012, du + 0.058, dz + 1, dz + 4.5, 1, glass(rng, 0.5), frame);
    }
  }
  return iso.build();
}

/**
 * Bespoke BERLIN stock — the PLATTENBAU: the GDR-era prefab concrete-panel
 * slab (WBS 70 / Plattenbau) that fills the outer estates (Marzahn, Lichten-
 * berg). A long, low-rise-to-mid slab whose entire facade is a relentless GRID
 * of identical precast PANELS — the visible panel SEAMS are the whole tell —
 * with uniform windows, thin spandrel bands, recessed loggia-balconies, a flat
 * roof. Pale grey/sand render over the concrete, an occasional painted accent
 * panel from a post-reunification refurb.
 */
export function plattenbauTile(seed: number, variant: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 46399 + variant * 83 + 29);
  // washed concrete greys + a sand and a refurb-pastel skin
  const skinSet: RGBA[] = [hex('#c4c2ba'), hex('#b6b4ab'), hex('#cbc3ac'), hex('#aeb4b2'), hex('#c8c8c2'), hex('#bcbab0')];
  const skin = skinSet[variant % skinSet.length] ?? skinSet[0]!;
  // a single refurb accent hue used on a band of panels
  const accent = ([hex('#d98a4a'), hex('#5fa3a0'), hex('#c75d6e'), hex('#6f9a5a')] as RGBA[])[variant % 4]!;
  const seam = darken(skin, 0.16); // the precast-panel joint line
  const u0 = 0.07;
  const u1 = 0.93;
  const v0 = 0.22;
  const v1 = 0.74;
  // VARIETY: the GDR Plattenbau ranged from low 5-storey WBS-70 rows to 11-storey
  // point-block towers — step the storeys hard across the variants so a Marzahn
  // estate reads as a true mix of slab heights, not one repeated block.
  const floors = ([6, 9, 5, 11, 7, 4] as const)[variant % 6] ?? 6;
  const fh = 10;
  const H = floors * fh + 3;
  const panelsU = 6; // precast panels across the long face
  const panelsV = 4;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.24);
  iso.box(u0, v0, u1, v1, 0, H, skin);
  // the PANEL GRID — horizontal floor-slab seams + vertical panel-joint seams,
  // on both visible faces. This relentless grid IS the Plattenbau.
  for (let f = 0; f <= floors; f++) {
    const z = f * fh;
    iso.r.line(P(u0, v1, z), P(u1, v1, z), INK_W * 0.5, alpha(seam, 0.85));
    iso.r.line(P(u1, v0, z), P(u1, v1, z), INK_W * 0.5, alpha(seam, 0.85));
  }
  for (let p = 0; p <= panelsU; p++) {
    const u = u0 + ((u1 - u0) * p) / panelsU;
    iso.r.line(P(u, v1, 0), P(u, v1, H), INK_W * 0.45, alpha(seam, 0.7));
  }
  for (let p = 0; p <= panelsV; p++) {
    const v = v0 + ((v1 - v0) * p) / panelsV;
    iso.r.line(P(u1, v, 0), P(u1, v, H), INK_W * 0.45, alpha(seam, 0.7));
  }
  // a refurb ACCENT: one vertical stripe of panels repainted (very GDR-refurb)
  const ap = 1 + (seed % (panelsU - 2));
  const au0 = u0 + ((u1 - u0) * ap) / panelsU;
  const au1 = u0 + ((u1 - u0) * (ap + 1)) / panelsU;
  iso.r.poly([P(au0, v1, H - 1), P(au1, v1, H - 1), P(au1, v1, 1), P(au0, v1, 1)], alpha(accent, 0.8));
  // uniform windows, one per panel per floor, with recessed loggia-balconies
  for (let f = 0; f < floors; f++) {
    const zb = f * fh + 2.5;
    const zt = f * fh + fh - 2;
    iso.windowsLeft(v1, u0 + 0.02, u1 - 0.02, zb, zt, panelsU, glass(rng, 0.4), undefined);
    iso.windowsRight(u1, v0 + 0.02, v1 - 0.02, zb, zt, panelsV, glass(rng, 0.36), undefined);
    // recessed loggia balcony on a couple of bays each floor (darker reveal)
    if (f >= 1) {
      const lu = u0 + ((u1 - u0) * ((f + ap) % panelsU)) / panelsU;
      iso.r.poly([P(lu + 0.01, v1, zt), P(lu + ((u1 - u0) / panelsU) - 0.01, v1, zt), P(lu + ((u1 - u0) / panelsU) - 0.01, v1, zb), P(lu + 0.01, v1, zb)], shaded(skin, 0.18));
      iso.r.line(P(lu + 0.01, v1, zb + 3), P(lu + ((u1 - u0) / panelsU) - 0.01, v1, zb + 3), INK_W * 0.5, alpha(COLORS.white, 0.7));
    }
  }
  // flat roof: a thin parapet, a stair/lift overrun, a couple of vent stacks
  iso.box(u0, v0, u1, v1, H, H + 2.5, skin, { ink: false, topC: shaded(hex('#5b6068'), 0.05) });
  iso.box(u0 + 0.1, v0 + 0.08, u0 + 0.24, v0 + 0.2, H + 2.5, H + 12, shaded(skin, 0.1)); // lift overrun
  for (const vu of [0.55, 0.74]) {
    iso.box(vu, v0 + 0.1, vu + 0.04, v0 + 0.16, H + 2.5, H + 8, COLORS.steelDark, { ink: false });
  }
  return iso.build();
}

/**
 * Bespoke BERLIN stock — a tall MODERN point-block / Plattenbau tower (the
 * 11–17 storey Wohnhochhaus that punctuates the estates and the western
 * Hochhaus quarters). A slim rendered shaft with a relentless window grid,
 * recessed loggia balconies stacked up one bay, a flat roof with a lift
 * over-run + plant. Gives the Berlin fabric a vertical ACCENT against the
 * mid-rise Altbau/Plattenbau sea, so a district reads with a skyline.
 */
export function berlintowerTile(seed: number, variant: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 48817 + variant * 173 + 31);
  const skinSet: RGBA[] = [hex('#cbc7bb'), hex('#bcbab2'), hex('#c8bfa8'), hex('#aeb4b2'), hex('#d2cdbf')];
  const skin = skinSet[variant % skinSet.length] ?? skinSet[0]!;
  const accent = ([hex('#d98a4a'), hex('#5fa3a0'), hex('#c75d6e'), hex('#6f9a5a')] as RGBA[])[(seed + variant) % 4]!;
  const seam = darken(skin, 0.14);
  const u0 = 0.24;
  const u1 = 0.72;
  const v0 = 0.3;
  const v1 = 0.64;
  const floors = ([12, 15, 11, 17, 13] as const)[variant % 5] ?? 13;
  const fh = 8.2;
  const H = floors * fh + 4;
  iso.shadow(u0, v0, u1, v1, 0.3, 0.28);
  iso.box(u0, v0, u1, v1, 0, H, skin);
  const bays = 4;
  // floor-slab seams + a stack of recessed loggia balconies up one bay
  const lbay = 1 + (seed % (bays - 1));
  const lu0 = u0 + ((u1 - u0) * lbay) / bays;
  const lu1 = u0 + ((u1 - u0) * (lbay + 1)) / bays;
  for (let f = 0; f < floors; f++) {
    const z = f * fh;
    iso.r.line(P(u0, v1, z), P(u1, v1, z), INK_W * 0.45, alpha(seam, 0.8));
    iso.windowsLeft(v1, u0 + 0.02, u1 - 0.02, z + 2, z + fh - 2, bays, glass(rng, 0.46), undefined);
    iso.windowsRight(u1, v0 + 0.02, v1 - 0.02, z + 2, z + fh - 2, 3, glass(rng, 0.4), undefined);
    if (f >= 1) {
      iso.r.poly([P(lu0 + 0.005, v1, z + fh - 2), P(lu1 - 0.005, v1, z + fh - 2), P(lu1 - 0.005, v1, z + 1.5), P(lu0 + 0.005, v1, z + 1.5)], shaded(skin, 0.2));
      iso.r.line(P(lu0 + 0.005, v1, z + 3), P(lu1 - 0.005, v1, z + 3), INK_W * 0.45, alpha(accent, 0.85));
    }
  }
  // ground-floor entrance band (glazed lobby + a coloured canopy)
  iso.windowsLeft(v1, u0 + 0.04, u1 - 0.04, 1.5, fh, bays, COLORS.glassLit, undefined);
  iso.r.poly([P(u0 + 0.02, v1, fh + 1), P(u1 - 0.02, v1, fh + 1), P(u1 - 0.02, v1 + 0.03, fh - 1), P(u0 + 0.02, v1 + 0.03, fh - 1)], alpha(accent, 0.8));
  // flat roof: parapet, lift over-run, plant box, aerials
  iso.box(u0, v0, u1, v1, H, H + 2.5, skin, { ink: false, topC: shaded(hex('#5b6068'), 0.05) });
  iso.box(u0 + 0.06, v0 + 0.06, u0 + 0.2, v0 + 0.18, H + 2.5, H + 14, shaded(skin, 0.12));
  iso.box(u1 - 0.18, v0 + 0.08, u1 - 0.08, v0 + 0.16, H + 2.5, H + 7, COLORS.steelDark, { ink: false });
  iso.r.line(P(u1 - 0.13, v0 + 0.12, H + 7), P(u1 - 0.13, v0 + 0.12, H + 17), INK_W * 0.55, alpha(INK, 0.7));
  return iso.build();
}

/**
 * Bespoke BERLIN stock — a LOW 2–3 storey older corner house / Vorstadt
 * Gründerzeit row (the modest scale that survives between the big perimeter
 * blocks). A short stucco building with a pitched or shallow roof, a shop in
 * the ground floor, a couple of windows per floor. Provides the LOW end of the
 * height mix so a Berlin street isn't a wall of equal-height blocks.
 */
export function berlinlowTile(seed: number, variant: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 50341 + variant * 109 + 17);
  const stoneSet: RGBA[] = [hex('#d2cdbf'), hex('#c2b58e'), hex('#b9a578'), hex('#cfc9bb'), hex('#c8bfa8')];
  const stone = stoneSet[variant % stoneSet.length] ?? stoneSet[0]!;
  const frame = lighten(COLORS.white, 0.02);
  const band = darken(stone, 0.14);
  const v0 = 0.14;
  const v1 = 0.78;
  const floors = 2 + (variant % 2); // 2–3 storeys
  const fh = 9.5;
  const H = 6 + floors * fh;
  const shop = variant % 2 === 0;
  iso.shadow(0, v0, 1, v1, 0.22, 0.22);
  iso.box(0, v0, 1, v1, 0, H, stone);
  for (let f = 1; f <= floors; f++) {
    const z = 6 + f * fh;
    iso.r.line(P(0, v1, z), P(1, v1, z), INK_W * 0.5, alpha(band, 0.85));
  }
  for (let f = (shop ? 1 : 0); f < floors; f++) {
    const zb = 6 + f * fh + 1.5;
    const zt = 6 + f * fh + fh - 1.5;
    iso.windowsLeft(v1, 0.06, 0.94, zb, zt, 4, glass(rng, 0.4), frame);
    iso.windowsRight(1, v0 + 0.06, v1 - 0.06, zb, zt, 3, glass(rng, 0.36), frame);
  }
  if (shop) {
    iso.windowsLeft(v1, 0.05, 0.95, 1.5, 6 + fh - 2, 4, COLORS.glassLit, frame);
    const awn = ([COLORS.orange, hex('#3f8f8a'), hex('#b5485f')] as RGBA[])[(seed + variant) % 3]!;
    iso.r.poly([P(0.04, v1, 6 + fh - 1), P(0.96, v1, 6 + fh - 1), P(0.96, v1 + 0.04, 6 + fh - 3.5), P(0.04, v1 + 0.04, 6 + fh - 3.5)], awn);
  }
  // crowning cornice + a shallow pitched / flat roof (variant decides)
  iso.box(-0.02, v0 - 0.02, 1.02, v1 + 0.02, H - 2, H + 2, lighten(stone, 0.06), { topC: top(stone, 0.3) });
  iso.edge(P(0, v1 + 0.02, H + 2), P(1, v1 + 0.02, H + 2), INK_W * 0.7);
  if (variant % 3 === 2) {
    iso.box(0, v0, 1, v1, H + 2, H + 5, stone, { ink: false, topC: shaded(SLATE, 0.06) });
  } else {
    iso.gable(0, v0, 1, v1, H + 2, 11, 'u', SLATE, stone);
    for (const du of [0.22, 0.55, 0.82]) {
      const dz = H + 2 + 4.4;
      iso.box(du, (v0 + v1) / 2 + 0.06, du + 0.07, (v0 + v1) / 2 + 0.13, dz, dz + 4.5, lighten(stone, 0.08), { ink: false });
      iso.windowsLeft((v0 + v1) / 2 + 0.13, du + 0.012, du + 0.058, dz + 1, dz + 4, 1, glass(rng, 0.5), frame);
    }
  }
  return iso.build();
}

/**
 * Bespoke SHANGHAI stock — the SHIKUMEN lilong (石库门) lane house, the
 * vernacular that fills old Shanghai. A 2–3 storey grey-brick terrace row in
 * tight lanes; the tell is the carved STONE-GATE doorway (a heavy pale stone
 * lintel + a small triangular/segmental pediment over a dark double timber
 * door) repeating along the row, red-brick string-course banding on the grey
 * brick, a low flat parapet roof, the odd timber shutter. Reads as a dense,
 * dark-grey, low row punctuated by pale stone gates — unmistakably not London.
 */
export function shikumenTile(seed: number, variant: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 50261 + variant * 103 + 19);
  // qing-brick grey, weathered grey-brown, a render-skinned variant
  const greySet: RGBA[] = [hex('#8e8a82'), hex('#7e7a72'), hex('#9a9690'), hex('#86827a')];
  const brickBand = hex('#9c5a44'); // red-brick decorative banding
  const stone = hex('#cabfa6'); // pale gate stone
  const v0 = 0.14;
  const v1 = 0.74;
  const floors = 2 + (variant % 2); // 2–3 storeys
  const fh = 12;
  const H = floors * fh + 3;
  iso.shadow(0, v0, 1, v1, 0.2, 0.22);
  // three attached lane-houses
  for (let i = 0; i < 3; i++) {
    const u0 = i / 3;
    const u1 = (i + 1) / 3;
    const grey = greySet[(variant + i) % greySet.length] ?? greySet[0]!;
    iso.box(u0, v0, u1, v1, 0, H, grey);
    // red-brick string-course banding between storeys (the shikumen trim)
    for (let f = 1; f < floors; f++) {
      const z = f * fh;
      iso.r.poly([P(u0, v1, z + 1), P(u1, v1, z + 1), P(u1, v1, z - 0.8), P(u0, v1, z - 0.8)], brickBand);
    }
    // upper sash/timber windows
    for (let f = 1; f < floors; f++) {
      const zb = f * fh + 2;
      const zt = f * fh + fh - 2;
      iso.windowsLeft(v1, u0 + 0.05, u1 - 0.05, zb, zt, 2, glass(rng, 0.4), lighten(stone, 0.06));
    }
    // the STONE GATE: a pale stone surround + small pediment over a dark door
    const du = (u0 + u1) / 2;
    const gw = 0.07;
    // surround
    iso.r.poly([P(du - gw, v1, fh - 1), P(du + gw, v1, fh - 1), P(du + gw, v1, 0), P(du - gw, v1, 0)], stone);
    // dark double-leaf timber door recessed within
    iso.r.poly([P(du - gw * 0.6, v1, fh - 3), P(du + gw * 0.6, v1, fh - 3), P(du + gw * 0.6, v1, 0), P(du - gw * 0.6, v1, 0)], hex('#3a2e28'));
    iso.r.line(P(du, v1, fh - 3), P(du, v1, 0), INK_W * 0.5, alpha(INK, 0.7));
    // segmental/triangular stone pediment cap over the gate
    iso.r.poly([P(du - gw - 0.012, v1, fh - 1), P(du + gw + 0.012, v1, fh - 1), P(du, v1, fh + 3)], lighten(stone, 0.05));
    iso.edge(P(du - gw - 0.012, v1, fh - 1), P(du, v1, fh + 3), INK_W * 0.6);
    iso.edge(P(du, v1, fh + 3), P(du + gw + 0.012, v1, fh - 1), INK_W * 0.6);
  }
  iso.windowsRight(1, v0 + 0.08, v1 - 0.08, 5, H - 5, floors >= 3 ? 3 : 2, glass(rng, 0.3), lighten(stone, 0.06));
  // low flat parapet roof, a couple of clothes-drying poles + a tank
  iso.box(0, v0, 1, v1, H, H + 3, greySet[0]!, { ink: false, topC: shaded(hex('#6a665e'), 0.05) });
  iso.r.poly([P(0, v1, H + 4), P(1, v1, H + 4), P(1, v1, H + 3), P(0, v1, H + 3)], lighten(stone, 0.04));
  for (const pu of [0.3, 0.66]) {
    iso.r.line(P(pu, 0.4, H + 3), P(pu, 0.5, H + 3), INK_W * 0.5, alpha(INK, 0.6)); // drying pole
  }
  roofTank(iso, 0.8, 0.42, H + 3, 0.028, 'tank', rng);
  return iso.build();
}

/**
 * Bespoke SHANGHAI stock — the mid-century concrete WALK-UP graduating to a
 * newer glassy mid-rise: the workhorse residential block that fills modern
 * Shanghai between the lilong and the supertalls. A flat-topped 6–10 storey
 * slab, pale render or tiled concrete, continuous projecting balcony lines
 * (often enclosed/glazed), tight window grid, a glassier curtain-wall variant
 * with a jade/teal tint and a small crown for the post-2000 stock.
 */
export function shwalkupTile(seed: number, variant: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 57163 + variant * 149 + 23);
  const glassy = variant % 2 === 1; // odd variants are the newer curtain-wall
  const skinSet: RGBA[] = [hex('#cfcabb'), hex('#bcb4a2'), hex('#c2c4c0'), hex('#b4b0a6')];
  const skin = skinSet[variant % skinSet.length] ?? skinSet[0]!;
  const u0 = 0.16;
  const u1 = 0.84;
  const v0 = 0.26;
  const v1 = 0.66;
  const floors = 6 + (variant % 5); // 6–10 storeys
  const fh = 9.5;
  const H = floors * fh + 3;
  iso.shadow(u0, v0, u1, v1, 0.28, 0.26);
  iso.box(u0, v0, u1, v1, 0, H, skin);
  if (glassy) {
    // a jade/teal-tinted curtain wall: full-height glazed grid + spandrel bands
    for (let f = 0; f < floors; f++) {
      const zb = f * fh + 2;
      const zt = f * fh + fh - 1.5;
      iso.windowsLeft(v1, u0 + 0.02, u1 - 0.02, zb, zt, 5, alpha(COLORS.glassSky, 0.92), COLORS.steel);
      iso.windowsRight(u1, v0 + 0.02, v1 - 0.02, zb, zt, 3, alpha(COLORS.glassSunset, 0.85), COLORS.steel);
      iso.r.line(P(u0, v1, zt + 1), P(u1, v1, zt + 1), INK_W * 0.4, alpha(shaded(skin, 0.1), 0.7));
    }
    // a small crown + a slim mast
    iso.box(u0 + 0.04, v0 + 0.04, u1 - 0.04, v1 - 0.04, H, H + 6, shaded(skin, 0.06), { topC: shaded(hex('#5b6068'), 0.06) });
    iso.box((u0 + u1) / 2 - 0.01, (v0 + v1) / 2 - 0.01, (u0 + u1) / 2 + 0.01, (v0 + v1) / 2 + 0.01, H + 6, H + 18, COLORS.steelDark, { ink: false });
  } else {
    // the older concrete walk-up: continuous projecting balcony lines, some
    // glazed-in, a tight punched-window grid
    for (let f = 0; f < floors; f++) {
      const z = f * fh;
      const zb = z + 2;
      const zt = z + fh - 2;
      iso.windowsLeft(v1, u0 + 0.04, u1 - 0.04, zb, zt, 4, glass(rng, 0.42), COLORS.white);
      iso.windowsRight(u1, v0 + 0.04, v1 - 0.04, zb, zt, 3, glass(rng, 0.36), COLORS.white);
      if (f >= 1) {
        // a continuous balcony slab + rail; some bays glazed-in (lighter infill)
        iso.r.poly([P(u0, v1 + 0.03, z + 0.6), P(u1, v1 + 0.03, z + 0.6), P(u1, v1, z + 0.6), P(u0, v1, z + 0.6)], lit(skin, 0.06));
        iso.r.line(P(u0, v1 + 0.03, z + 4.5), P(u1, v1 + 0.03, z + 4.5), INK_W * 0.5, alpha(COLORS.white, 0.8));
        if (rng.chance(0.5)) {
          const bu = rng.range(u0 + 0.05, u1 - 0.18);
          iso.r.poly([P(bu, v1 + 0.03, z + fh - 2), P(bu + 0.14, v1 + 0.03, z + fh - 2), P(bu + 0.14, v1 + 0.03, z + 1), P(bu, v1 + 0.03, z + 1)], alpha(glass(rng, 0.5), 0.7));
        }
      }
    }
    iso.box(u0, v0, u1, v1, H, H + 3, skin, { ink: false, topC: shaded(hex('#6a665e'), 0.05) });
    iso.box(u0 + 0.08, v0 + 0.06, u0 + 0.2, v0 + 0.16, H + 3, H + 12, shaded(skin, 0.08)); // stair head
    roofTank(iso, u1 - 0.12, v0 + 0.12, H + 3, 0.03, 'tank', rng);
  }
  return iso.build();
}

/**
 * Bespoke CAPE TOWN stock — the BO-KAAP colour row. A row of single-storey
 * flat-roofed cottages painted in vivid candy hues (the city's signature),
 * each with a low parapet, a raised stoep (front step/platform) reached by a
 * couple of steps, tall multi-pane sash windows with shutters, a panelled
 * door, and the odd pitched-roof house breaking the line. The riot of
 * saturated wall colour against the white trim is the unmistakable tell.
 */
export function bokaapTile(seed: number, variant: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 51407 + variant * 113 + 17);
  // the candy hues — pull straight from the city's bright wall rotation so the
  // row reads as the Bo-Kaap palette (turquoise, ochre, pink, green, blue…)
  const hues: RGBA[] = [
    wallColor(variant), wallColor(variant + 2), wallColor(variant + 4), wallColor(variant + 1),
  ];
  const trim = lighten(COLORS.white, 0.02);
  const v0 = 0.14;
  const v1 = 0.72;
  const H = 22; // single storey, tall for the era
  iso.shadow(0, v0, 1, v1, 0.2, 0.22);
  for (let i = 0; i < 3; i++) {
    const u0 = i / 3;
    const u1 = (i + 1) / 3;
    const hue = hues[i % hues.length] ?? hues[0]!;
    const pitched = (variant + i) % 4 === 3; // a minority break the flat line
    iso.box(u0, v0, u1, v1, 0, H, hue);
    // a white plinth band + cornice band (the crisp Cape trim)
    iso.r.poly([P(u0, v1, 4), P(u1, v1, 4), P(u1, v1, 2.5), P(u0, v1, 2.5)], trim);
    iso.r.poly([P(u0, v1, H), P(u1, v1, H), P(u1, v1, H - 2.5), P(u0, v1, H - 2.5)], trim);
    // tall multi-pane sash windows with shutters either side
    iso.windowsLeft(v1, u0 + 0.06, u1 - 0.16, 7, 16, 1, glass(rng, 0.45), trim);
    for (const su of [u0 + 0.045, u0 + 0.145]) {
      iso.r.poly([P(su, v1, 16), P(su + 0.012, v1, 16), P(su + 0.012, v1, 7), P(su, v1, 7)], shaded(hue, 0.16));
    }
    // panelled front door + the raised STOEP (platform + 2 steps) before it
    const du = u1 - 0.085;
    iso.r.poly([P(du - 0.04, v1, 15), P(du + 0.04, v1, 15), P(du + 0.04, v1, 0), P(du - 0.04, v1, 0)], darken(hue, 0.4));
    iso.r.poly([P(du - 0.05, v1, 16), P(du + 0.05, v1, 16), P(du + 0.05, v1, 15), P(du - 0.05, v1, 15)], trim);
    for (let s = 0; s < 2; s++) {
      const sv = v1 + 0.02 + s * 0.025;
      const sz = 4 - s * 2;
      iso.r.poly([P(du - 0.06, sv, sz), P(du + 0.06, sv, sz), P(du + 0.06, sv + 0.025, sz), P(du - 0.06, sv + 0.025, sz)], lighten(trim, 0.02));
    }
    if (pitched) {
      domesticRoof(iso, u0 - 0.005, v0 - 0.005, u1 + 0.005, v1 + 0.005, H, 9, 'u', TILE_RED, hue, rng);
    } else {
      // flat parapet roof
      iso.box(u0, v0, u1, v1, H, H + 2.5, hue, { ink: false, topC: shaded(hex('#6a665e'), 0.06) });
    }
  }
  iso.windowsRight(1, v0 + 0.1, v1 - 0.1, 6, H - 4, 1, glass(rng, 0.3), trim);
  return iso.build();
}

/**
 * Bespoke CAPE TOWN stock — the Cape-Victorian / face-brick suburban house.
 * Two looks by variant: (a) a white-render VICTORIAN semi-detached villa with
 * a "broekie-lace" cast-iron verandah and a pitched corrugated-iron roof, the
 * Woodstock/Observatory tell; (b) a darker FACE-BRICK walk-up cottage. Set in
 * a small garden behind a low wall, under the bright Cape light.
 */
export function capecottageTile(seed: number, variant: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 58171 + variant * 131 + 23);
  const faceBrick = variant % 2 === 1;
  const wall = faceBrick
    ? (([BRICK_RED, BRICK_BROWN] as RGBA[])[variant % 2] ?? BRICK_RED)
    : lighten(COLORS.white, 0.02); // whitewashed render
  const iron = hex('#2c2c32');
  const u0 = 0.12;
  const u1 = 0.7;
  const v0 = 0.16;
  const v1 = 0.64;
  const H = faceBrick ? 26 : 22;
  iso.shadow(u0, v0, u1 + 0.04, v1 + 0.02, 0.18, 0.2);
  iso.box(u0, v0, u1, v1, 0, H, wall);
  // corrugated-iron pitched roof (grey) — wide, low pitch
  const roofC = hex('#7a7d80');
  iso.gable(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, H, 12, 'u', roofC, wall);
  // window(s) on the street face
  iso.windowsLeft(v1, u0 + 0.06, u1 - 0.06, H - 10, H - 2, 2, glass(rng, 0.42), COLORS.white);
  // a single-storey verandah across the front on slender iron posts, with a
  // pierced "broekie-lace" valance (the Cape-Victorian tell)
  const vf = v1 + 0.14;
  const vH = 13;
  iso.r.poly([P(u0, v1, vH), P(u1, v1, vH), P(u1, vf, vH - 1.5), P(u0, vf, vH - 1.5)], lit(roofC, 0.04)); // skillion verandah roof
  for (let u = u0 + 0.05; u <= u1 - 0.02; u += 0.14) {
    iso.r.line(P(u, vf, 0), P(u, vf, vH - 1.5), INK_W * 0.7, iron);
  }
  // lace valance band
  iso.r.poly([P(u0, vf, vH - 1.5), P(u1, vf, vH - 1.5), P(u1, vf, vH - 4.5), P(u0, vf, vH - 4.5)], alpha(lighten(COLORS.white, 0.02), 0.9));
  for (let u = u0 + 0.02; u < u1; u += 0.02) {
    iso.r.line(P(u, vf, vH - 1.5), P(u, vf, vH - 4), INK_W * 0.4, alpha(iron, 0.55));
  }
  // door behind the verandah
  iso.r.poly([P(u1 - 0.12, v1, 11), P(u1 - 0.05, v1, 11), P(u1 - 0.05, v1, 0), P(u1 - 0.12, v1, 0)], darken(wall, faceBrick ? 0.3 : 0.5));
  // chimney + a garden shrub behind a low wall
  iso.box(u0 + 0.08, (v0 + v1) / 2, u0 + 0.12, (v0 + v1) / 2 + 0.04, H + 10, H + 18, faceBrick ? darken(wall, 0.12) : shaded(roofC, 0.1));
  iso.box(u0 - 0.04, 0.92, u1 + 0.04, 0.96, 0, 4, faceBrick ? shaded(wall, 0.08) : shaded(COLORS.white, 0.06));
  if (rng.chance(0.7)) iso.ball(u0 + 0.02, 0.82, 0.06, 13, COLORS.treeGreen);
  return iso.build();
}

/**
 * Bespoke ATHENS stock — the POLYKATOIKIA (πολυκατοικία), the concrete-frame
 * apartment block that IS modern Athens. A near-uniform 5–7 storey block in
 * pale render, built wall-to-wall; the tell is the relentless rhythm of deep
 * CANTILEVERED BALCONIES running the full width of every floor, set behind
 * slim railings, many shaded by bright retractable AWNINGS (tendes), with a
 * recessed top-floor (retiré) and a rooftop pergola/water heater. A street of
 * them reads pale, flat-topped and balconied — never London terraces.
 */
export function polykatoikiaTile(seed: number, variant: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 52529 + variant * 137 + 19);
  // pale renders: white, cream, pale grey, soft ochre
  const renderSet: RGBA[] = [hex('#ece6d6'), hex('#e4dcc8'), hex('#d8cdb4'), hex('#dfdacb'), hex('#d0c3a4'), hex('#e8dcc0')];
  const skin = renderSet[variant % renderSet.length] ?? renderSet[0]!;
  const rail = hex('#cfc8ba'); // pale balcony balustrade
  const slab = shaded(skin, 0.06); // the cantilevered balcony soffit
  const awnHues: RGBA[] = [hex('#c4502f'), hex('#3f7f8a'), hex('#d8b24a'), hex('#5e7a45'), hex('#b5485f')];
  const u0 = 0.08;
  const u1 = 0.92;
  const v0 = 0.12;
  const v1 = 0.7;
  const floors = 5 + (variant % 3); // 5–7 storeys
  const fh = 9.5;
  const H = floors * fh + 3;
  iso.shadow(u0, v0, u1, v1, 0.24, 0.24);
  iso.box(u0, v0, u1, v1, 0, H, skin);
  // ground floor: a recessed pilotis/parking level or a shopfront band
  const shop = variant % 3 === 2;
  if (shop) {
    iso.windowsLeft(v1, u0 + 0.04, u1 - 0.04, 1.5, fh - 1.5, 4, COLORS.glassLit, COLORS.white);
  } else {
    iso.r.poly([P(u0 + 0.04, v1, fh - 1.5), P(u1 - 0.04, v1, fh - 1.5), P(u1 - 0.04, v1, 1), P(u0 + 0.04, v1, 1)], shaded(skin, 0.12));
  }
  // every upper floor: a full-width recessed window band + a deep cantilevered
  // balcony slab projecting in front of it, slim railings, sometimes an awning
  for (let f = 1; f < floors; f++) {
    const z = f * fh;
    const recessed = f === floors - 1; // the top floor steps back (retiré)
    const bu0 = recessed ? u0 + 0.1 : u0;
    const bu1 = recessed ? u1 - 0.1 : u1;
    // window band behind the balcony
    iso.windowsLeft(v1, bu0 + 0.04, bu1 - 0.04, z + 1.5, z + fh - 2.5, 4, glass(rng, 0.42), COLORS.white);
    // the cantilevered slab (projects past the facade) + its shaded underside
    const out = v1 + 0.06;
    iso.r.poly([P(bu0, v1, z + 0.4), P(bu1, v1, z + 0.4), P(bu1, out, z + 0.4), P(bu0, out, z + 0.4)], lit(slab, 0.04));
    iso.r.poly([P(bu0, out, z + 0.4), P(bu1, out, z + 0.4), P(bu1, out, z - 1.4), P(bu0, out, z - 1.4)], shaded(slab, 0.1));
    iso.edge(P(bu0, out, z + 0.4), P(bu1, out, z + 0.4), INK_W * 0.6, alpha(INK, 0.6));
    // slim railing band
    iso.r.poly([P(bu0, out, z + 4.5), P(bu1, out, z + 4.5), P(bu1, out, z + 0.6), P(bu0, out, z + 0.6)], alpha(rail, 0.55));
    iso.r.line(P(bu0, out, z + 4.5), P(bu1, out, z + 4.5), INK_W * 0.55, alpha(shaded(rail, 0.2), 0.9));
    for (let u = bu0 + 0.03; u < bu1; u += 0.045) {
      iso.r.line(P(u, out, z + 4.5), P(u, out, z + 0.8), INK_W * 0.3, alpha(shaded(rail, 0.2), 0.6));
    }
    // a bright awning over part of the balcony on some floors
    if (rng.chance(0.5)) {
      const aw = awnHues[(seed + f) % awnHues.length]!;
      const au0 = rng.range(bu0 + 0.02, bu0 + 0.2);
      const au1 = Math.min(bu1 - 0.02, au0 + rng.range(0.22, 0.4));
      iso.r.poly([P(au0, v1, z + fh - 1.5), P(au1, v1, z + fh - 1.5), P(au1, out + 0.02, z + fh - 4), P(au0, out + 0.02, z + fh - 4)], aw);
      iso.edge(P(au0, out + 0.02, z + fh - 4), P(au1, out + 0.02, z + fh - 4), INK_W * 0.5);
    }
  }
  // gable-end (party wall) windows on the right face
  iso.windowsRight(u1, v0 + 0.06, v1 - 0.06, fh + 2, H - fh, 3, glass(rng, 0.32), COLORS.white);
  // flat roof: parapet + a pergola, a solar water-heater + tank (very Greek)
  iso.box(u0, v0, u1, v1, H, H + 2.5, skin, { ink: false, topC: shaded(hex('#b4aea4'), 0.05) });
  // pergola: four posts + a slatted top
  const pu = u0 + 0.16;
  const pv = v0 + 0.12;
  for (const [du, dv] of [[0, 0], [0.18, 0], [0.18, 0.14], [0, 0.14]] as const) {
    iso.r.line(P(pu + du, pv + dv, H + 2.5), P(pu + du, pv + dv, H + 9), INK_W * 0.5, alpha(INK, 0.6));
  }
  for (let u = pu; u <= pu + 0.18; u += 0.03) {
    iso.r.line(P(u, pv, H + 9), P(u, pv + 0.14, H + 9), INK_W * 0.4, alpha(INK, 0.5));
  }
  // solar water heater: a tilted panel + horizontal cylinder (ubiquitous in GR)
  iso.box(u1 - 0.24, v0 + 0.1, u1 - 0.14, v0 + 0.13, H + 2.5, H + 7, hex('#d8d2c4'), { ink: false });
  iso.r.poly([P(u1 - 0.26, v0 + 0.16, H + 3), P(u1 - 0.14, v0 + 0.16, H + 3), P(u1 - 0.14, v0 + 0.22, H + 8), P(u1 - 0.26, v0 + 0.22, H + 8)], shaded(COLORS.panel, 0.05));
  return iso.build();
}

/**
 * Bespoke PUNE stock — the RCC concrete-frame mid-rise FLAT, the workhorse of
 * the IT city. A 5–9 storey reinforced-concrete-frame block in warm
 * cream/ochre cement render, projecting balconies with painted railings (some
 * with drying laundry), an external stair/lift core, window AC units, and a
 * flat RCC roofscape CRAMMED with black water tanks, satellite dishes and a
 * solar heater. Reads warm-ochre and flat-topped with cluttered roofs — the
 * dusty Deccan apartment block, not a London terrace.
 */
export function puneflatTile(seed: number, variant: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 53609 + variant * 139 + 19);
  // warm cement renders: cream, buff ochre, pale terracotta-wash, grey-buff
  const skinSet: RGBA[] = [hex('#d9c39a'), hex('#c9a86a'), hex('#e7e0ce'), hex('#d4b378'), hex('#cabb92'), hex('#b29464')];
  const skin = skinSet[variant % skinSet.length] ?? skinSet[0]!;
  const railHues: RGBA[] = [hex('#3f6e8a'), hex('#8a5a3a'), hex('#5e7a45'), hex('#b5485f')];
  const u0 = 0.12;
  const u1 = 0.84;
  const v0 = 0.2;
  const v1 = 0.66;
  // VARIETY (owner: Pune reads as a homogenous layering of identical tower
  // blocks): the RCC flat ranges from 3-storey older pukka blocks to 12-storey
  // new mid-rises — step the storeys right across the variants so neighbouring
  // tiles differ in scale, giving the fabric a real skyline rhythm.
  const floors = ([4, 7, 3, 9, 5, 12, 6] as const)[variant % 7] ?? 6;
  const fh = 9.5;
  const H = floors * fh + 3;
  iso.shadow(u0, v0, u1, v1, 0.26, 0.26);
  iso.box(u0, v0, u1, v1, 0, H, skin);
  // exposed RCC frame: floor-slab bands + a couple of column lines proud
  for (let f = 1; f <= floors; f++) {
    const z = f * fh;
    iso.r.line(P(u0, v1, z), P(u1, v1, z), INK_W * 0.4, alpha(lit(skin, 0.08), 0.7));
  }
  const rail = railHues[variant % railHues.length]!;
  // ground floor: a recessed parking pilotis (stilts) — near-universal here
  iso.r.poly([P(u0 + 0.04, v1, fh - 1), P(u1 - 0.04, v1, fh - 1), P(u1 - 0.04, v1, 1), P(u0 + 0.04, v1, 1)], shaded(skin, 0.16));
  for (let cu = u0 + 0.12; cu < u1; cu += 0.18) {
    iso.r.line(P(cu, v1, fh - 1), P(cu, v1, 1), INK_W * 0.5, alpha(skin, 0.9)); // stilt columns
  }
  // upper floors: window band + a projecting balcony with a painted railing
  for (let f = 1; f < floors; f++) {
    const z = f * fh;
    iso.windowsLeft(v1, u0 + 0.04, u1 - 0.04, z + 2, z + fh - 2.5, 4, glass(rng, 0.4), COLORS.white);
    iso.windowsRight(u1, v0 + 0.04, v1 - 0.04, z + 2, z + fh - 2.5, 3, glass(rng, 0.34), COLORS.white);
    // a balcony on the left face (projecting slab + coloured rail)
    const out = v1 + 0.05;
    const bu0 = u0 + (f % 2 === 0 ? 0.04 : 0.32);
    const bu1 = bu0 + 0.3;
    iso.r.poly([P(bu0, v1, z + 0.4), P(bu1, v1, z + 0.4), P(bu1, out, z + 0.4), P(bu0, out, z + 0.4)], lit(skin, 0.04));
    iso.r.poly([P(bu0, out, z + 0.4), P(bu1, out, z + 0.4), P(bu1, out, z - 1), P(bu0, out, z - 1)], shaded(skin, 0.12));
    iso.r.poly([P(bu0, out, z + 4), P(bu1, out, z + 4), P(bu1, out, z + 0.6), P(bu0, out, z + 0.6)], alpha(rail, 0.85));
    iso.r.line(P(bu0, out, z + 4), P(bu1, out, z + 4), INK_W * 0.55, darken(rail, 0.15));
    // hanging laundry on some balconies (the lived-in tell)
    if (rng.chance(0.4)) {
      for (const lc of [hex('#d8d2c4'), railHues[(seed + f) % 4]!]) {
        const lu = rng.range(bu0 + 0.04, bu1 - 0.06);
        iso.r.poly([P(lu, out, z + 3.6), P(lu + 0.03, out, z + 3.6), P(lu + 0.03, out, z + 1.2), P(lu, out, z + 1.2)], alpha(lc, 0.7));
      }
    }
    // a window AC unit poking from the facade now and then
    if (rng.chance(0.4)) {
      const au = rng.range(u0 + 0.08, u1 - 0.08);
      iso.box(au, v1, au + 0.03, v1 + 0.016, z + 2, z + 5, hex('#d7d4cc'), { ink: false });
    }
  }
  // flat RCC roof crammed with black water tanks, dishes + a solar heater
  iso.box(u0, v0, u1, v1, H, H + 3, skin, { ink: false, topC: shaded(hex('#8a7c6a'), 0.05) });
  iso.box(u0 + 0.08, v0 + 0.06, u0 + 0.2, v0 + 0.16, H + 3, H + 13, shaded(skin, 0.1)); // lift/stair head
  roofTank(iso, u1 - 0.16, v0 + 0.14, H + 3, 0.032, 'tank', rng);
  roofTank(iso, u0 + 0.34, v1 - 0.1, H + 3, 0.028, 'tank', rng);
  roofDishes(iso, u0 + 0.1, u1 - 0.1, v0, v1, H + 3, rng, 4);
  iso.box(u1 - 0.32, v0 + 0.1, u1 - 0.24, v0 + 0.13, H + 3, H + 7, hex('#d8d2c4'), { ink: false }); // solar heater
  return iso.build();
}

/**
 * Bespoke PUNE stock — the heritage Maratha WADA: the old fortified courtyard
 * townhouse of the Peshwa-era city (Shaniwar Peth, Kasba). A 2–3 storey
 * structure in warm stone/render with thick walls, carved TIMBER columns and
 * brackets along a deep first-floor VERANDAH / jharokha balcony, small timber-
 * shuttered windows, crowned by sloping MANGALORE-TILE eaves (warm red) with
 * deep overhangs. The carved-timber verandah under low red-tile eaves is the
 * heritage tell, distinct from the flat RCC blocks and the hero monuments.
 */
export function wadaTile(seed: number, variant: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 60493 + variant * 151 + 23);
  const wallSet: RGBA[] = [hex('#c9a86a'), hex('#b89464'), hex('#d9c39a'), hex('#a8895a')];
  const wall = wallSet[variant % wallSet.length] ?? wallSet[0]!;
  const timber = hex('#6e4a2e'); // carved teak
  const tile = hex('#a4452e'); // Mangalore terracotta tile
  const v0 = 0.14;
  const v1 = 0.72;
  const floors = 2 + (variant % 2); // 2–3 storeys
  const fh = 12;
  const H = floors * fh + 2;
  iso.shadow(0, v0, 1, v1, 0.2, 0.22);
  // two attached wada fronts
  for (let i = 0; i < 2; i++) {
    const u0 = i * 0.5;
    const u1 = u0 + 0.5;
    const w = i === 0 ? wall : lighten(wall, 0.04);
    iso.box(u0, v0, u1, v1, 0, H, w);
    // thick plinth band
    iso.r.poly([P(u0, v1, 4), P(u1, v1, 4), P(u1, v1, 0), P(u0, v1, 0)], shaded(w, 0.14));
    // small timber-shuttered windows, upper floors
    for (let f = 1; f < floors; f++) {
      const z = f * fh;
      iso.windowsLeft(v1, u0 + 0.06, u1 - 0.06, z + 2, z + fh - 3, 2, glass(rng, 0.36), timber);
    }
    // ground floor: a deep carved-timber VERANDAH on columns (the wada tell)
    const out = v1 + 0.05;
    iso.r.poly([P(u0 + 0.02, v1, fh - 1), P(u1 - 0.02, v1, fh - 1), P(u1 - 0.02, out, fh - 1), P(u0 + 0.02, out, fh - 1)], shaded(timber, 0.05)); // verandah ceiling
    for (let cu = u0 + 0.06; cu <= u1 - 0.04; cu += 0.12) {
      // carved column: a turned timber post with a bracket capital
      iso.box(cu - 0.012, out - 0.004, cu + 0.012, out + 0.004, 0, fh - 1.5, timber, { ink: false });
      iso.r.poly([P(cu - 0.03, out, fh - 1.5), P(cu + 0.03, out, fh - 1.5), P(cu + 0.018, out, fh - 1), P(cu - 0.018, out, fh - 1)], darken(timber, 0.1));
    }
    // a carved timber railing along the first-floor edge
    if (floors >= 2) {
      iso.r.poly([P(u0 + 0.02, out, fh + 4), P(u1 - 0.02, out, fh + 4), P(u1 - 0.02, out, fh - 1), P(u0 + 0.02, out, fh - 1)], alpha(timber, 0.85));
      for (let u = u0 + 0.04; u < u1; u += 0.025) {
        iso.r.line(P(u, out, fh + 4), P(u, out, fh - 0.5), INK_W * 0.4, alpha(darken(timber, 0.1), 0.7));
      }
    }
  }
  iso.windowsRight(1, v0 + 0.08, v1 - 0.08, fh + 2, H - 4, floors >= 3 ? 3 : 2, glass(rng, 0.3), timber);
  // sloping Mangalore-tile roof with deep eaves (a hipped cap over the row)
  iso.hip(-0.03, v0 - 0.03, 1.03, v1 + 0.03, H, 13, tile);
  // a small ridge finial + chajja eave line shadow
  iso.edge(P(0, v1 + 0.03, H), P(1, v1 + 0.03, H), INK_W * 0.7);
  return iso.build();
}

/**
 * Bespoke PUNE stock — a TALL modern IT / residential HIGHRISE (the 12–20
 * storey glass-and-render towers of Hinjewadi / Baner / Kharadi that loom over
 * the mid-rise flats). A slim shaft with broad blue-grey glazing bands, a
 * coloured spandrel grid, the odd projecting balcony stack, a flat roof with a
 * water tank + lift over-run. Gives the Pune fabric the vertical ACCENT it was
 * missing, so the city reads as a varied skyline rather than equal flats.
 */
export function punetowerTile(seed: number, variant: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 57793 + variant * 181 + 23);
  const skinSet: RGBA[] = [hex('#d9c39a'), hex('#cabb92'), hex('#e7e0ce'), hex('#c9a86a'), hex('#d4b378')];
  const skin = skinSet[variant % skinSet.length] ?? skinSet[0]!;
  const glassBand = ([hex('#8fa9b0'), hex('#a8b0b2'), hex('#7f9aa2')] as RGBA[])[(seed + variant) % 3]!;
  const spandrel = ([hex('#3f6e8a'), hex('#5e7a45'), hex('#b5485f'), hex('#8a5a3a')] as RGBA[])[variant % 4]!;
  const u0 = 0.26;
  const u1 = 0.7;
  const v0 = 0.3;
  const v1 = 0.62;
  const floors = ([13, 16, 12, 20, 15] as const)[variant % 5] ?? 15;
  const fh = 8.0;
  const H = floors * fh + 4;
  iso.shadow(u0, v0, u1, v1, 0.3, 0.28);
  iso.box(u0, v0, u1, v1, 0, H, skin);
  const bays = 4;
  // a continuous glazing band per floor with a coloured spandrel under it,
  // plus a projecting balcony stack on one bay (the Indian-highrise tell)
  const bbay = 1 + (seed % (bays - 1));
  const bu0 = u0 + ((u1 - u0) * bbay) / bays;
  const bu1 = u0 + ((u1 - u0) * (bbay + 1)) / bays;
  for (let f = 0; f < floors; f++) {
    const z = f * fh;
    // spandrel band
    iso.r.poly([P(u0 + 0.01, v1, z + 2.2), P(u1 - 0.01, v1, z + 2.2), P(u1 - 0.01, v1, z + 0.4), P(u0 + 0.01, v1, z + 0.4)], alpha(spandrel, 0.65));
    iso.windowsLeft(v1, u0 + 0.02, u1 - 0.02, z + 2.6, z + fh - 1.4, bays, alpha(glassBand, 0.9), undefined);
    iso.windowsRight(u1, v0 + 0.02, v1 - 0.02, z + 2.6, z + fh - 1.4, 3, alpha(glassBand, 0.82), undefined);
    if (f >= 1) {
      const out = v1 + 0.04;
      iso.r.poly([P(bu0, v1, z + 0.6), P(bu1, v1, z + 0.6), P(bu1, out, z + 0.6), P(bu0, out, z + 0.6)], lit(skin, 0.04));
      iso.r.poly([P(bu0, out, z + 3.4), P(bu1, out, z + 3.4), P(bu1, out, z + 0.8), P(bu0, out, z + 0.8)], alpha(spandrel, 0.8));
    }
  }
  // glazed ground-floor lobby + a coloured fascia
  iso.windowsLeft(v1, u0 + 0.04, u1 - 0.04, 1.5, fh, bays, COLORS.glassLit, undefined);
  iso.r.poly([P(u0 + 0.02, v1, fh + 1), P(u1 - 0.02, v1, fh + 1), P(u1 - 0.02, v1 + 0.03, fh - 1), P(u0 + 0.02, v1 + 0.03, fh - 1)], alpha(spandrel, 0.85));
  // flat roof: parapet, tank, lift over-run + an aerial mast
  iso.box(u0, v0, u1, v1, H, H + 2.5, skin, { ink: false, topC: shaded(hex('#8a7c6a'), 0.05) });
  iso.box(u0 + 0.05, v0 + 0.06, u0 + 0.18, v0 + 0.17, H + 2.5, H + 13, shaded(skin, 0.1));
  roofTank(iso, u1 - 0.14, v0 + 0.12, H + 2.5, 0.03, 'tank', rng);
  iso.r.line(P(u1 - 0.08, v0 + 0.1, H + 2.5), P(u1 - 0.08, v0 + 0.1, H + 15), INK_W * 0.55, alpha(INK, 0.7));
  return iso.build();
}

/**
 * Bespoke PUNE stock — a LOW 2–3 storey older PUKKA house / chawl-scale row
 * (the modest cement-render building, often with a small pitched Mangalore-tile
 * porch and a parapet, that fills the gaps between the RCC mid-rises). Provides
 * the LOW end of the Pune height mix so a street isn't a wall of equal flats.
 */
export function punelowTile(seed: number, variant: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 59341 + variant * 113 + 19);
  const wallSet: RGBA[] = [hex('#d9c39a'), hex('#c9a86a'), hex('#e7e0ce'), hex('#cabb92'), hex('#b29464')];
  const wall = wallSet[variant % wallSet.length] ?? wallSet[0]!;
  const rail = ([hex('#3f6e8a'), hex('#8a5a3a'), hex('#5e7a45'), hex('#b5485f')] as RGBA[])[(seed + variant) % 4]!;
  const tile = hex('#a4452e');
  const v0 = 0.16;
  const v1 = 0.74;
  const floors = 2 + (variant % 2); // 2–3 storeys
  const fh = 10;
  const H = floors * fh + 2;
  iso.shadow(0, v0, 1, v1, 0.2, 0.22);
  iso.box(0, v0, 1, v1, 0, H, wall);
  // plinth
  iso.r.poly([P(0, v1, 4), P(1, v1, 4), P(1, v1, 0), P(0, v1, 0)], shaded(wall, 0.14));
  for (let f = 0; f < floors; f++) {
    const zb = f * fh + 5;
    const zt = f * fh + fh + 1.5;
    iso.windowsLeft(v1, 0.06, 0.94, zb, zt, 3, glass(rng, 0.38), COLORS.white);
    iso.windowsRight(1, v0 + 0.06, v1 - 0.06, zb, zt, 2, glass(rng, 0.34), COLORS.white);
    // a slim projecting balcony with a painted rail on the upper floor
    if (f >= 1) {
      const out = v1 + 0.04;
      iso.r.poly([P(0.1, v1, f * fh + 4.5), P(0.6, v1, f * fh + 4.5), P(0.6, out, f * fh + 4.5), P(0.1, out, f * fh + 4.5)], lit(wall, 0.04));
      iso.r.poly([P(0.1, out, f * fh + 8), P(0.6, out, f * fh + 8), P(0.6, out, f * fh + 5), P(0.1, out, f * fh + 5)], alpha(rail, 0.85));
    }
  }
  // flat parapet roof with a small water tank + a pitched tile porch over the door
  iso.box(0, v0, 1, v1, H, H + 3, wall, { ink: false, topC: shaded(hex('#8a7c6a'), 0.05) });
  roofTank(iso, 0.78, v0 + 0.12, H + 3, 0.028, 'tank', rng);
  iso.box(0.06, v0 + 0.08, 0.18, v0 + 0.18, H + 3, H + 10, shaded(wall, 0.1));
  // a Mangalore-tile entrance porch canopy at the street
  iso.r.poly([P(0.3, v1, 8), P(0.6, v1, 8), P(0.64, v1 + 0.07, 5.5), P(0.26, v1 + 0.07, 5.5)], tile);
  iso.edge(P(0.26, v1 + 0.07, 5.5), P(0.64, v1 + 0.07, 5.5), INK_W * 0.6);
  return iso.build();
}

/**
 * Bespoke NORTH-EAST ENGLAND stock — the TYNESIDE FLAT, the region's signature
 * terrace. Each "house" is actually TWO self-contained flats (lower + upper),
 * so the unmistakable tell is the PAIRED front doors — two doors side by side
 * per dwelling, one for each flat — repeating along a low 2-storey red-brick /
 * buff-sandstone row under a dark Welsh-SLATE pitched roof with chimney stacks.
 * A bay window flanks each door-pair. Reads as a Tyneside (Heaton/Byker) street,
 * distinct from London's single-door-per-house terraces.
 */
export function tynesideflatTile(seed: number, variant: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 54851 + variant * 109 + 19);
  // NE brick reds + Grainger buff sandstone, slate roofs
  const wallSets: RGBA[][] = [
    [BRICK_RED, BUFF_BRICK, BRICK_ORANGE],
    [BUFF_BRICK, BRICK_RED, BUFF_BRICK],
    [BRICK_ORANGE, BRICK_BROWN, BRICK_RED],
    [BRICK_RED, BRICK_RED, BUFF_BRICK],
  ];
  const walls = wallSets[variant % 4] ?? wallSets[0]!;
  const slate = ([SLATE, SLATE_DARK, SLATE, SLATE_DARK] as RGBA[])[variant % 4] ?? SLATE;
  const frame = COLORS.white;
  const v0 = 0.14;
  const v1 = 0.74;
  const H = 30; // two storeys
  const rise = 13;
  iso.shadow(0, v0, 1, v1, 0.2, 0.22);
  for (let i = 0; i < 2; i++) {
    const u0 = i * 0.5;
    const u1 = u0 + 0.5;
    const wall = walls[i] ?? BRICK_RED;
    iso.box(u0, v0, u1, v1, 0, H, wall);
    // upper-flat windows (this floor is a separate dwelling)
    iso.windowsLeft(v1, u0 + 0.05, u1 - 0.05, 18, 26, 2, glass(rng, 0.42), frame);
    // the PAIRED FRONT DOORS — two side by side, one for each flat — set to one
    // side, with a shared stone lintel/transom above (the Tyneside-flat tell)
    const d0 = u0 + 0.05;
    const dw = 0.07;
    for (let d = 0; d < 2; d++) {
      const du = d0 + d * (dw + 0.012);
      const doorC = darken(([hex('#3f6048'), hex('#46518f'), hex('#7a3328'), hex('#5d3a52')] as RGBA[])[(variant + i + d) % 4] ?? INK, 0.05);
      iso.r.poly([P(du, v1, 13), P(du + dw, v1, 13), P(du + dw, v1, 0), P(du, v1, 0)], doorC);
      // a small fanlight transom over each door
      iso.r.poly([P(du, v1, 14.5), P(du + dw, v1, 14.5), P(du + dw, v1, 13), P(du, v1, 13)], COLORS.glassLit);
    }
    // shared stone lintel band over the door pair
    iso.r.poly([P(d0 - 0.008, v1, 15.5), P(d0 + 2 * dw + 0.02, v1, 15.5), P(d0 + 2 * dw + 0.02, v1, 14.5), P(d0 - 0.008, v1, 14.5)], lighten(BUFF_BRICK, 0.08));
    // a ground-floor BAY window beside the doors (the lower flat's front room)
    const b0 = u1 - 0.18;
    const b1 = u1 - 0.04;
    iso.box(b0, v1 - 0.001, b1, v1 + 0.05, 0, 14, lighten(wall, 0.08));
    iso.windowsLeft(v1 + 0.05, b0 + 0.012, b1 - 0.012, 4, 12, 2, glass(rng, 0.45), frame);
    iso.quad(b0 - 0.01, v1 - 0.001, b1 + 0.01, v1 + 0.06, 14, frame);
    iso.edge(P(b0 - 0.01, v1 + 0.06, 14), P(b1 + 0.01, v1 + 0.06, 14), INK_W * 0.7);
  }
  // gable-end windows on the right wall
  iso.windowsRight(1, v0 + 0.1, v1 - 0.1, 6, H - 6, 2, glass(rng, 0.3), frame);
  // dark Welsh-slate pitched roof + party-wall chimney stacks with pots
  domesticRoof(iso, 0, v0, 1, v1, H, rise, 'u', slate, walls[0] ?? BRICK_RED, rng);
  for (const cu of [0.05, 0.5, 0.95]) {
    const vm = (v0 + v1) / 2;
    iso.box(cu - 0.03, vm - 0.05, cu + 0.03, vm + 0.05, H + rise - 2, H + rise + 9, darken(walls[0] ?? BRICK_RED, 0.1));
    for (const dv of [-0.03, 0.02]) {
      iso.box(cu - 0.011, vm + dv, cu + 0.011, vm + dv + 0.022, H + rise + 9, H + rise + 13, POT_CLAY, { ink: false });
    }
  }
  return iso.build();
}

/**
 * Bespoke NORTH-EAST ENGLAND stock — the interwar PEBBLEDASH SEMI. A pair of
 * suburban semi-detached houses (Gosforth/Whitley Bay), the lower storey in
 * face brick and the upper in grey-buff PEBBLEDASH render, a curved or square
 * two-storey bay, a hipped or gabled red-tile / slate roof, a porch over the
 * door, gardens and a low wall to the street. The pebbledash-over-brick split
 * + double bays read as a Northern interwar semi, not a London terrace.
 */
export function pebbledashsemiTile(seed: number, variant: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 61609 + variant * 131 + 23);
  const brick = ([BRICK_RED, BRICK_ORANGE, BRICK_BROWN, BRICK_RED] as RGBA[])[variant % 4] ?? BRICK_RED;
  const dash = PEBBLEDASH; // grey-buff pebbledash upper
  const roofC = ([TILE_RED, SLATE, hex('#8a4a38'), SLATE_DARK] as RGBA[])[variant % 4] ?? TILE_RED;
  for (const [u0, u1, mirror] of [
    [0.04, 0.46, false],
    [0.54, 0.96, true],
  ] as const) {
    const v0 = 0.18;
    const v1 = 0.62;
    const H = 27;
    iso.shadow(u0, v0, u1, v1, 0.16, 0.2);
    // lower storey brick, upper storey pebbledash
    iso.box(u0, v0, u1, v1, 0, 13, brick);
    iso.box(u0, v0, u1, v1, 13, H, dash);
    iso.r.line(P(u0, v1, 13), P(u1, v1, 13), INK_W * 0.5, alpha(darken(brick, 0.1), 0.7)); // floor band
    // gabled red-tile/slate roof
    domesticRoof(iso, u0 - 0.015, v0 - 0.015, u1 + 0.015, v1 + 0.015, H, 13, 'u', roofC, dash, rng);
    // upper window
    iso.windowsLeft(v1, u0 + 0.04, u1 - 0.05, 16, 23, 2, glass(rng, 0.42), COLORS.white);
    // two-storey square bay on the outer side of each semi
    const bo = mirror ? u1 - 0.16 : u0 + 0.02;
    const b1 = bo + 0.14;
    iso.box(bo, v1 - 0.001, b1, v1 + 0.05, 0, 18, lighten(brick, 0.06));
    iso.box(bo, v1 - 0.001, b1, v1 + 0.05, 13, 18, lighten(dash, 0.04), { ink: false });
    iso.windowsLeft(v1 + 0.05, bo + 0.012, b1 - 0.012, 4, 11, 2, glass(rng, 0.45), COLORS.white);
    iso.quad(bo - 0.008, v1 - 0.001, b1 + 0.008, v1 + 0.06, 18, shaded(roofC, 0.05));
    iso.edge(P(bo - 0.008, v1 + 0.06, 18), P(b1 + 0.008, v1 + 0.06, 18), INK_W * 0.7);
    // door + little porch canopy on the inner side
    const du = mirror ? u0 + 0.04 : u1 - 0.1;
    iso.r.poly([P(du, v1, 11), P(du + 0.06, v1, 11), P(du + 0.06, v1, 0), P(du, v1, 0)], darken(brick, 0.4));
    iso.r.poly([P(du - 0.015, v1, 13), P(du + 0.075, v1, 13), P(du + 0.06, v1 + 0.03, 11), P(du, v1 + 0.03, 11)], COLORS.white);
    // chimney + a garden shrub
    iso.box(mirror ? u1 - 0.08 : u0 + 0.04, (v0 + v1) / 2, mirror ? u1 - 0.04 : u0 + 0.08, (v0 + v1) / 2 + 0.04, H + 11, H + 19, darken(brick, 0.12));
  }
  // low front wall + a shrub
  iso.box(0.02, 0.92, 0.98, 0.96, 0, 4, shaded(brick, 0.1));
  if (rng.chance(0.6)) iso.ball(0.5, 0.82, 0.06, 13, COLORS.treeGreen);
  return iso.build();
}

/**
 * Bespoke NORTH-EAST ENGLAND stock — the plain BRICK TERRACE: a row of three
 * single-family 2-up-2-down terraced houses (the bread-and-butter Tyneside/
 * Wearside street). Distinct from the paired-door Tyneside FLAT: ONE door per
 * house, one bay window per house. Eras read through the variant — interwar
 * red brick under slate, postwar buff brick under red tile, a touch of modern
 * infill — with slightly varied ridge heights so neighbouring rows differ.
 * A street of these mixed with the flats breaks the "endless identical terrace"
 * monotony while staying brick-and-slate North-East.
 */
export function brickterraceTile(seed: number, variant: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 47147 + variant * 97 + 11);
  // four era flavours: interwar red/slate, postwar buff/tile, brown/slate, infill
  const wallSets: RGBA[][] = [
    [BRICK_RED, BRICK_ORANGE, BRICK_RED],
    [BUFF_BRICK, BRICK_RED, BUFF_BRICK],
    [BRICK_BROWN, BRICK_RED, BRICK_ORANGE],
    [BRICK_ORANGE, BUFF_BRICK, BRICK_RED],
  ];
  const walls = wallSets[variant % 4] ?? wallSets[0]!;
  const roof = ([SLATE, TILE_RED, SLATE_DARK, TILE_RED] as RGBA[])[variant % 4] ?? SLATE;
  const frame = COLORS.white;
  const v0 = 0.16;
  const v1 = 0.74;
  const vm = (v0 + v1) / 2;
  // slightly varied two-storey height + ridge per era so rows don't line up
  const H = 28 + (variant % 3) * 2;
  const rise = 12 + (variant % 2);
  iso.shadow(0, v0, 1, v1, 0.2, 0.22);
  for (let i = 0; i < 3; i++) {
    const u0 = i / 3;
    const u1 = (i + 1) / 3;
    const wall = walls[i] ?? BRICK_RED;
    iso.box(u0, v0, u1, v1, 0, H, wall);
    // a stone/lighter brick string-course at first-floor level (the terrace tell)
    iso.r.line(P(u0, v1, 14), P(u1, v1, 14), INK_W * 0.5, alpha(lighten(BUFF_BRICK, 0.04), 0.8));
    // upper bedroom sashes
    iso.windowsLeft(v1, u0 + 0.045, u1 - 0.045, 17, 25, 2, glass(rng, 0.42), frame);
    // ground floor: a single front door + one window (single-family, NOT paired)
    const du = u1 - 0.1;
    const doorC = darken(([hex('#3f6048'), hex('#46518f'), hex('#7a3328'), hex('#5d3a52')] as RGBA[])[(variant + i) % 4] ?? INK, 0.05);
    iso.r.poly([P(du, v1, 13), P(du + 0.06, v1, 13), P(du + 0.06, v1, 0), P(du, v1, 0)], doorC);
    // stone lintel over the door
    iso.r.poly([P(du - 0.008, v1, 14.5), P(du + 0.068, v1, 14.5), P(du + 0.068, v1, 13), P(du - 0.008, v1, 13)], lighten(BUFF_BRICK, 0.08));
    // a single ground-floor bay (the parlour), brick-built with a stone cap
    const b0 = u0 + 0.03;
    const b1 = u0 + 0.17;
    iso.box(b0, v1 - 0.001, b1, v1 + 0.05, 0, 13, lighten(wall, 0.07));
    iso.windowsLeft(v1 + 0.05, b0 + 0.012, b1 - 0.012, 4, 11, 2, glass(rng, 0.45), frame);
    iso.quad(b0 - 0.01, v1 - 0.001, b1 + 0.01, v1 + 0.06, 13, frame);
    iso.edge(P(b0 - 0.01, v1 + 0.06, 13), P(b1 + 0.01, v1 + 0.06, 13), INK_W * 0.7);
  }
  // gable-end windows on the right wall
  iso.windowsRight(1, v0 + 0.1, v1 - 0.1, 6, H - 6, 2, glass(rng, 0.3), frame);
  // continuous slate / red-tile roof + party-wall chimney stacks with pots
  domesticRoof(iso, 0, v0, 1, v1, H, rise, 'u', roof, walls[0] ?? BRICK_RED, rng);
  for (const cu of [0.05, 0.345, 0.655, 0.95]) {
    iso.box(cu - 0.026, vm - 0.05, cu + 0.026, vm + 0.05, H + rise - 3, H + rise + 8, darken(walls[0] ?? BRICK_RED, 0.1));
    for (const dv of [-0.026, 0.02]) {
      iso.box(cu - 0.011, vm + dv, cu + 0.011, vm + dv + 0.022, H + rise + 8, H + rise + 12, POT_CLAY, { ink: false });
    }
  }
  return iso.build();
}

/**
 * Bespoke NORTH-EAST ENGLAND stock — COTTAGE FLATS / a small WALK-UP: the "odd
 * taller block here and there". A 3-storey brick walk-up (Tyneside cottage-flat
 * block / interwar municipal flats), taller than the surrounding 2-storey
 * terraces, with a regular grid of sash windows, a shared central door, a stone
 * cornice band and a low-pitched slate roof with end chimney stacks. Seeds the
 * dense terraced fabric with height variety so a street isn't all one ridge.
 */
export function cottageflatsTile(seed: number, variant: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 39119 + variant * 113 + 17);
  const wall = ([BRICK_RED, BUFF_BRICK, BRICK_ORANGE, BRICK_BROWN] as RGBA[])[variant % 4] ?? BRICK_RED;
  const band = lighten(BUFF_BRICK, 0.06); // stone string-courses / cornice
  const roof = ([SLATE, SLATE_DARK, SLATE, TILE_RED] as RGBA[])[variant % 4] ?? SLATE;
  const frame = COLORS.white;
  const u0 = 0.07;
  const u1 = 0.9;
  const v0 = 0.2;
  const v1 = 0.66;
  const vm = (v0 + v1) / 2;
  const floors = 3;
  const fh = 11;
  const H = floors * fh + 4;
  const rise = 9;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  iso.box(u0, v0, u1, v1, 0, H, wall);
  // a moulded plinth, a cornice, and a string-course between floors
  iso.r.poly([P(u0, v1, 3), P(u1, v1, 3), P(u1, v1, 0), P(u0, v1, 0)], shaded(band, 0.06));
  for (let f = 1; f < floors; f++) {
    iso.r.line(P(u0, v1, 4 + f * fh), P(u1, v1, 4 + f * fh), INK_W * 0.5, alpha(band, 0.85));
  }
  iso.r.poly([P(u0, v1, H), P(u1, v1, H), P(u1, v1, H - 2), P(u0, v1, H - 2)], band);
  // a regular grid of sash windows, three bays per floor
  for (let f = 0; f < floors; f++) {
    const z = 4 + f * fh;
    iso.windowsLeft(v1, u0 + 0.05, u1 - 0.05, z + 2, z + fh - 2.5, 3, glass(rng, 0.4), frame);
  }
  // a shared central entrance with a stone surround on the ground floor
  const dc = (u0 + u1) / 2;
  iso.r.poly([P(dc - 0.035, v1, 12), P(dc + 0.035, v1, 12), P(dc + 0.035, v1, 0), P(dc - 0.035, v1, 0)], darken(hex('#46518f'), 0.05));
  iso.r.poly([P(dc - 0.05, v1, 14), P(dc + 0.05, v1, 14), P(dc + 0.05, v1, 12), P(dc - 0.05, v1, 12)], band);
  iso.r.poly([P(dc - 0.035, v1, 13.5), P(dc + 0.035, v1, 13.5), P(dc + 0.035, v1, 12), P(dc - 0.035, v1, 12)], COLORS.glassLit);
  // gable-end windows on the right wall
  iso.windowsRight(u1, v0 + 0.06, v1 - 0.06, 8, H - 8, 3, glass(rng, 0.3), frame);
  // low-pitched slate roof + end chimney stacks
  domesticRoof(iso, u0 - 0.012, v0 - 0.012, u1 + 0.012, v1 + 0.012, H, rise, 'u', roof, wall, rng);
  for (const cu of [u0 + 0.02, u1 - 0.06]) {
    iso.box(cu, vm - 0.05, cu + 0.05, vm + 0.05, H + rise - 3, H + rise + 9, darken(wall, 0.1));
    for (const dv of [-0.04, 0.012]) {
      iso.box(cu + 0.008, vm + dv, cu + 0.026, vm + dv + 0.02, H + rise + 9, H + rise + 13, POT_CLAY, { ink: false });
    }
  }
  return iso.build();
}

/**
 * Bespoke NORTH-EAST ENGLAND stock — the postwar DETACHED / large semi: a
 * single chunky brick-and-tile house in its own plot (the suburban "odd
 * detached"), gabled or hipped, a two-storey bay or porch, a garage to the
 * side, a clipped lawn and a sapling. Mixes into the pebbledash-semi suburb so
 * it isn't a uniform run of identical semis.
 */
export function nedetachedTile(seed: number, variant: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 42043 + variant * 89 + 13);
  const brick = ([BRICK_RED, BUFF_BRICK, BRICK_ORANGE, BRICK_BROWN] as RGBA[])[variant % 4] ?? BRICK_RED;
  const dash = PEBBLEDASH;
  const roof = ([TILE_RED, SLATE, hex('#8a4a38'), SLATE_DARK] as RGBA[])[variant % 4] ?? TILE_RED;
  const frame = COLORS.white;
  const hipped = variant % 2 === 1;
  const u0 = 0.16;
  const u1 = 0.6;
  const v0 = 0.2;
  const v1 = 0.64;
  const vm = (v0 + v1) / 2;
  const H = 25;
  const rise = 12;
  iso.shadow(u0, v0, u1 + 0.2, v1, 0.18, 0.2);
  // body: brick to first floor, a rendered (pebbledash) gable above on some eras
  iso.box(u0, v0, u1, v1, 0, H, brick);
  if (variant % 2 === 0) iso.box(u0, v0, u1, v1, 14, H, dash, { ink: false });
  if (hipped) iso.hip(u0 - 0.012, v0 - 0.012, u1 + 0.012, v1 + 0.012, H, rise, roof);
  else domesticRoof(iso, u0 - 0.012, v0 - 0.012, u1 + 0.012, v1 + 0.012, H, rise, 'u', roof, brick, rng);
  // upper windows
  iso.windowsLeft(v1, u0 + 0.04, u1 - 0.05, 16, 22, 2, glass(rng, 0.42), frame);
  // a two-storey square bay on one side
  const b0 = u0 + 0.02;
  const b1 = b0 + 0.15;
  iso.box(b0, v1 - 0.001, b1, v1 + 0.05, 0, 18, lighten(brick, 0.06));
  iso.windowsLeft(v1 + 0.05, b0 + 0.012, b1 - 0.012, 4, 11, 2, glass(rng, 0.45), frame);
  iso.windowsLeft(v1 + 0.05, b0 + 0.012, b1 - 0.012, 13, 17, 2, glass(rng, 0.42), frame);
  iso.quad(b0 - 0.01, v1 - 0.001, b1 + 0.01, v1 + 0.06, 18, shaded(roof, 0.05));
  iso.edge(P(b0 - 0.01, v1 + 0.06, 18), P(b1 + 0.01, v1 + 0.06, 18), INK_W * 0.7);
  // door + porch canopy on the inner side
  const du = u1 - 0.11;
  iso.r.poly([P(du, v1, 12), P(du + 0.06, v1, 12), P(du + 0.06, v1, 0), P(du, v1, 0)], darken(brick, 0.4));
  iso.r.poly([P(du - 0.018, v1, 14), P(du + 0.078, v1, 14), P(du + 0.06, v1 + 0.035, 12), P(du, v1 + 0.035, 12)], frame);
  // chimney
  iso.box(u0 + 0.04, vm - 0.03, u0 + 0.09, vm + 0.03, H + rise - 4, H + rise + 8, darken(brick, 0.12));
  // a side garage with a roller door, a little pitched tile roof + paved drive
  const g0 = u1 + 0.015;
  const g1 = u1 + 0.18;
  const gv0 = v0 + 0.12;
  iso.box(g0, gv0, g1, v1, 0, 13, lighten(brick, 0.03));
  iso.gable(g0 - 0.008, gv0 - 0.008, g1 + 0.008, v1 + 0.008, 13, 5, 'u', roof, lighten(brick, 0.03));
  iso.r.poly([P(g0 + 0.025, v1, 10), P(g1 - 0.025, v1, 10), P(g1 - 0.025, v1, 0), P(g0 + 0.025, v1, 0)], lighten(COLORS.white, 0.02));
  for (let z = 2; z < 10; z += 2.2) iso.r.line(P(g0 + 0.03, v1, z), P(g1 - 0.03, v1, z), INK_W * 0.4, alpha(INK, 0.3));
  iso.quad(g0 + 0.01, v1 + 0.005, g1 + 0.01, 0.96, 0, alpha(COLORS.pavement, 0.9));
  // clipped lawn + a sapling
  if (rng.chance(0.7)) iso.ball(0.16, 0.84, 0.06, 14, COLORS.treeLime);
  return iso.build();
}

/**
 * Bespoke NORTH-EAST ENGLAND stock — the CORNER SHOP / small PARADE: the end-of-
 * terrace local shop. A ground-floor brick shopfront (big glazed window, a
 * stallriser, a fascia sign band and a striped canopy) with a flat above under
 * the slate roof — the corner "offy"/newsagent that punctuates a terraced
 * street. Wired in by cityStockFor where the tile is flagged as shops.
 */
export function necornershopTile(seed: number, variant: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 50221 + variant * 79 + 23);
  const walls: RGBA[] = ([
    [BRICK_RED, BUFF_BRICK, BRICK_RED],
    [BUFF_BRICK, BRICK_ORANGE, BRICK_RED],
    [BRICK_ORANGE, BRICK_RED, BUFF_BRICK],
    [BRICK_BROWN, BRICK_RED, BRICK_ORANGE],
  ] as RGBA[][])[variant % 4] ?? [BRICK_RED, BUFF_BRICK, BRICK_RED];
  const roof = ([SLATE, SLATE_DARK, SLATE, TILE_RED] as RGBA[])[variant % 4] ?? SLATE;
  const awnings: RGBA[] = [COLORS.orange, hex('#3f8f8a'), hex('#46518f'), hex('#7a3328')];
  const frame = COLORS.white;
  const v0 = 0.16;
  const v1 = 0.74;
  const vm = (v0 + v1) / 2;
  const H = 30;
  const rise = 12;
  iso.shadow(0, v0, 1, v1, 0.2, 0.22);
  for (let i = 0; i < 3; i++) {
    const u0 = i / 3;
    const u1 = (i + 1) / 3;
    const wall = walls[i] ?? BRICK_RED;
    iso.box(u0, v0, u1, v1, 0, H, wall);
    iso.r.line(P(u0, v1, 15), P(u1, v1, 15), INK_W * 0.5, alpha(lighten(BUFF_BRICK, 0.04), 0.8));
    // upper-flat sashes
    iso.windowsLeft(v1, u0 + 0.045, u1 - 0.045, 18, 26, 2, glass(rng, 0.42), frame);
    if (i === 0) {
      // the SHOP: full glazed shopfront + stallriser + fascia + striped canopy
      iso.r.poly([P(u0 + 0.03, v1, 13), P(u1 - 0.02, v1, 13), P(u1 - 0.02, v1, 3), P(u0 + 0.03, v1, 3)], glass(rng, 0.75));
      iso.r.poly([P(u0 + 0.03, v1, 3), P(u1 - 0.02, v1, 3), P(u1 - 0.02, v1, 0), P(u0 + 0.03, v1, 0)], darken(wall, 0.3));
      // fascia sign band
      iso.r.poly([P(u0 + 0.02, v1, 14.5), P(u1 - 0.01, v1, 14.5), P(u1 - 0.01, v1, 13), P(u0 + 0.02, v1, 13)], frame);
      // striped canopy
      const awn = awnings[variant % 4] ?? COLORS.orange;
      iso.r.poly([P(u0 + 0.03, v1, 13), P(u1 - 0.02, v1, 13), P(u1 - 0.03, v1 + 0.08, 9), P(u0 + 0.04, v1 + 0.08, 9)], awn);
      for (let t = 0; t < 3; t++) {
        const a0 = u0 + 0.06 + t * 0.085;
        iso.r.poly([P(a0, v1, 13), P(a0 + 0.035, v1, 13), P(a0 + 0.025, v1 + 0.08, 9), P(a0 - 0.01, v1 + 0.08, 9)], alpha(COLORS.white, 0.85));
      }
      iso.edge(P(u0 + 0.04, v1 + 0.08, 9), P(u1 - 0.03, v1 + 0.08, 9), INK_W * 0.7);
    } else {
      // the rest of the parade stays domestic: a door + a bay
      const du = u1 - 0.1;
      iso.r.poly([P(du, v1, 13), P(du + 0.06, v1, 13), P(du + 0.06, v1, 0), P(du, v1, 0)], darken(([hex('#3f6048'), hex('#7a3328'), hex('#5d3a52')] as RGBA[])[(variant + i) % 3] ?? INK, 0.05));
      const b0 = u0 + 0.03;
      const b1 = u0 + 0.17;
      iso.box(b0, v1 - 0.001, b1, v1 + 0.05, 0, 13, lighten(wall, 0.07));
      iso.windowsLeft(v1 + 0.05, b0 + 0.012, b1 - 0.012, 4, 11, 2, glass(rng, 0.45), frame);
      iso.quad(b0 - 0.01, v1 - 0.001, b1 + 0.01, v1 + 0.06, 13, frame);
      iso.edge(P(b0 - 0.01, v1 + 0.06, 13), P(b1 + 0.01, v1 + 0.06, 13), INK_W * 0.7);
    }
  }
  // a projecting hanging shop sign over the corner shop
  iso.r.line(P(0.3, v1, 22), P(0.3, v1 + 0.05, 22), INK_W * 0.8, INK);
  iso.r.poly([P(0.3, v1 + 0.05, 22), P(0.3, v1 + 0.05, 17), P(0.3, v1 + 0.012, 17), P(0.3, v1 + 0.012, 22)], awnings[(variant + 1) % 4] ?? hex('#46518f'));
  // gable-end windows + continuous slate roof + chimneys
  iso.windowsRight(1, v0 + 0.1, v1 - 0.1, 6, H - 6, 2, glass(rng, 0.3), frame);
  domesticRoof(iso, 0, v0, 1, v1, H, rise, 'u', roof, walls[0] ?? BRICK_RED, rng);
  for (const cu of [0.05, 0.5, 0.95]) {
    iso.box(cu - 0.026, vm - 0.05, cu + 0.026, vm + 0.05, H + rise - 3, H + rise + 8, darken(walls[0] ?? BRICK_RED, 0.1));
    for (const dv of [-0.026, 0.02]) {
      iso.box(cu - 0.011, vm + dv, cu + 0.011, vm + dv + 0.022, H + rise + 8, H + rise + 12, POT_CLAY, { ink: false });
    }
  }
  return iso.build();
}

/**
 * Bespoke NORTH-EAST ENGLAND stock — a modest MODERN LOW-RISE BLOCK: a small
 * contemporary brick-and-render apartment block (a recent Quayside-fringe /
 * regeneration infill), 3–4 storeys, a flat or very shallow roof, a render
 * accent bay, juliet balconies and a glazed entrance — so the fabric isn't
 * entirely pre-war. Stays Tyneside in its red/buff brick + slate-grey trim.
 */
export function nemodernblockTile(seed: number, variant: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 33889 + variant * 67 + 19);
  const brick = ([BRICK_RED, BRICK_ORANGE, BRICK_BROWN, BRICK_RED] as RGBA[])[variant % 4] ?? BRICK_RED;
  const render = ([hex('#cab896'), hex('#d2c2a0'), hex('#b9ae96'), hex('#c2a877')] as RGBA[])[variant % 4] ?? hex('#cab896');
  const trim = SLATE_DARK;
  const frame = COLORS.white;
  const u0 = 0.08;
  const u1 = 0.88;
  const v0 = 0.22;
  const v1 = 0.66;
  const floors = 3 + (variant % 2); // 3–4 storeys
  const fh = 11;
  const H = floors * fh + 3;
  iso.shadow(u0, v0, u1, v1, 0.22, 0.22);
  // brick main body + a full-height render accent bay on one side
  iso.box(u0, v0, u1, v1, 0, H, brick);
  const r0 = u1 - 0.26;
  iso.box(r0, v0, u1, v1, 0, H, render, { ink: false });
  iso.edge(P(r0, v0, H), P(r0, v1, H), INK_W * 0.6, alpha(INK, 0.5));
  // storeys of wide windows with juliet-balcony rails; render bay reads lighter
  for (let f = 0; f < floors; f++) {
    const z = 3 + f * fh;
    iso.windowsLeft(v1, u0 + 0.05, r0 - 0.03, z + 2, z + fh - 2.5, 3, glass(rng, 0.45), frame);
    iso.windowsLeft(v1, r0 + 0.03, u1 - 0.05, z + 2, z + fh - 2.5, 1, glass(rng, 0.5), frame);
    if (f > 0) {
      // a slim juliet balcony rail across the render-bay window
      iso.r.line(P(r0 + 0.02, v1 + 0.012, z + 5), P(u1 - 0.04, v1 + 0.012, z + 5), INK_W * 0.6, alpha(trim, 0.9));
      iso.r.line(P(r0 + 0.02, v1 + 0.012, z + 1.5), P(u1 - 0.04, v1 + 0.012, z + 1.5), INK_W * 0.5, alpha(trim, 0.7));
    }
  }
  // a glazed ground-floor entrance under a flat canopy
  const dc = u0 + 0.16;
  iso.r.poly([P(dc - 0.05, v1, 11), P(dc + 0.05, v1, 11), P(dc + 0.05, v1, 0), P(dc - 0.05, v1, 0)], alpha(COLORS.glassSky, 0.9));
  iso.r.poly([P(dc - 0.07, v1, 12.5), P(dc + 0.07, v1, 12.5), P(dc + 0.06, v1 + 0.04, 11), P(dc - 0.06, v1 + 0.04, 11)], shaded(trim, 0.05));
  // gable-end windows
  iso.windowsRight(u1, v0 + 0.06, v1 - 0.06, 6, H - 6, 3, glass(rng, 0.35), frame);
  // a shallow mono-pitch / flat roof with a parapet + a slate-grey coping band
  iso.box(u0, v0, u1, v1, H, H + 3, lighten(brick, 0.02), { topC: shaded(trim, 0.04) });
  iso.r.poly([P(u0, v1, H + 4), P(u1, v1, H + 4), P(u1, v1, H + 3), P(u0, v1, H + 3)], trim);
  // a small rooftop plant box toward the back
  iso.box(u0 + (u1 - u0) * 0.5, v0 + 0.06, u0 + (u1 - u0) * 0.5 + 0.1, v0 + 0.16, H + 3, H + 9, shaded(trim, 0.06), { ink: false });
  return iso.build();
}

/**
 * Bespoke PARIS building stock: a Haussmann apartment block. Researched from
 * the reference photos (owner, 2026-06-14): uniform ~6-storey cream
 * pierre-de-taille ashlar facade with a strong cornice, regular tall French
 * windows, continuous wrought-iron *balcons filants* (typically the 2nd and
 * top floors), and the signature steep GREY ZINC MANSARD roof with dormer
 * windows (lucarnes) + chimney stacks. Drawn full-tile so a street of them
 * reads as the grid-like, pale, uniform Paris the owner described.
 */
export function haussmannTile(seed: number, variant: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 36497 + variant * 131 + 7);
  // pierre de taille — warm pale limestone, a touch of per-block variation
  const stoneSet: RGBA[] = [hex('#e6ddc6'), hex('#e1d7bf'), hex('#eae2cd'), hex('#dcd2b8')];
  const stone = stoneSet[variant % stoneSet.length] ?? stoneSet[0]!;
  // the grey zinc roofscape — VARIED per block (this is what reads from above)
  const roofShades: RGBA[] = [
    hex('#6b7079'), hex('#595f6a'), hex('#787e88'), hex('#535963'),
    hex('#6c6675'), hex('#626a6e'), hex('#70757e'), hex('#4f555f'),
  ];
  const zinc = roofShades[variant % roofShades.length] ?? roofShades[0]!;
  const zincTop = lighten(zinc, 0.12);
  const iron = hex('#34343d'); // balcony railings + window guards
  const band = hex('#d8cdb1'); // string-course / cornice shadow line
  const frame = hex('#f1ebdb');
  const u0 = 0;
  const u1 = 1;
  const v0 = 0.08;
  const v1 = 0.86;
  const floors = 5 + (variant % 3); // 5–7 storeys, near-uniform along the street
  const shop = variant % 3 === 2; // some blocks have ground-floor commerce
  const fh = 8.4;
  const H = Math.round(10 + floors * fh); // top of the stone facade (cornice)
  iso.shadow(u0, v0, u1, v1, 0.26, 0.24);

  // the limestone block
  iso.box(u0, v0, u1, v1, 0, H, stone);

  // ground floor: mark the taller porte-cochère band with a sill line
  iso.edge(P(u0, v1, fh + 2), P(u1, v1, fh + 2), INK_W * 0.6, alpha(INK, 0.5));

  // horizontal string courses between floors (the strong Parisian horizontals)
  for (let f = 1; f <= floors; f++) {
    const z = 10 + f * fh;
    iso.r.line(P(u0, v1, z), P(u1, v1, z), INK_W * 0.7, alpha(band, 0.9));
    iso.r.line(P(u1, v0, z), P(u1, v1, z), INK_W * 0.7, alpha(band, 0.9));
  }

  // regular tall French windows on both visible walls, one row per floor
  for (let f = 0; f < floors; f++) {
    const zb = 12 + f * fh + 1.4;
    const zt = 12 + f * fh + fh - 1.2;
    iso.windowsLeft(v1, u0 + 0.06, u1 - 0.06, zb, zt, 5, glass(rng, 0.45), frame);
    iso.windowsRight(u1, v0 + 0.06, v1 - 0.06, zb, zt, 5, glass(rng, 0.4), frame);
  }

  // ground-floor commerce on some blocks: bright glazed shopfronts under a
  // coloured awning + fascia — the lived-in Parisian street wall
  if (shop) {
    const awn = ([COLORS.orange, hex('#3f8f8a'), hex('#b5485f'), hex('#4a6ba8')] as RGBA[])[
      (seed + variant) % 4
    ]!;
    iso.windowsLeft(v1, u0 + 0.05, u1 - 0.05, 1.5, fh - 0.6, 5, COLORS.glassLit, frame);
    iso.r.poly(
      [P(u0 + 0.04, v1, fh + 0.6), P(u1 - 0.04, v1, fh + 0.6), P(u1 - 0.04, v1, fh - 1), P(u0 + 0.04, v1, fh - 1)],
      awn,
    );
    iso.edge(P(u0 + 0.04, v1, fh - 1), P(u1 - 0.04, v1, fh - 1), INK_W * 0.6, alpha(INK, 0.4));
  }

  // continuous wrought-iron balconies (balcons filants) on the 2nd + top floors
  const balconyFloors = variant % 2 === 0 ? [1, floors - 1] : [1, floors - 2, floors - 1];
  for (const f of balconyFloors) {
    if (f < 1 || f >= floors) continue;
    const z = 12 + f * fh;
    drawBalcony(iso, u0 + 0.04, u1 - 0.04, v1, z, iron, frame);
  }

  // the cornice: a crisp protruding ledge crowning the stone
  iso.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, H - 2, H + 1.5, lighten(stone, 0.06), {
    topC: top(stone, 0.3),
  });

  // the steep grey-zinc MANSARD roof: slopes inward from the cornice
  const mr = 12 + (variant % 4) * 4; // 12..24 — visible roof-height variety
  const ui = 0.16; // inward inset of the mansard's flat top (u)
  const vi = 0.12; // inward inset (v)
  const zT = H + mr;
  // near (left, v1) slope — shaded
  iso.r.poly(
    [P(u0, v1, H), P(u1, v1, H), P(u1 - ui, v1 - vi, zT), P(u0 + ui, v1 - vi, zT)],
    shaded(zinc, 0.18),
  );
  // right (u1) slope — lit
  iso.r.poly(
    [P(u1, v0, H), P(u1, v1, H), P(u1 - ui, v1 - vi, zT), P(u1 - ui, v0 + vi, zT)],
    lit(zinc, 0.06),
  );
  // ink the mansard silhouette
  iso.r.polyline([P(u0, v1, H), P(u0 + ui, v1 - vi, zT), P(u1 - ui, v1 - vi, zT), P(u1 - ui, v0 + vi, zT), P(u1, v0, H)], INK_W, INK);
  iso.edge(P(u1, v1, H), P(u1 - ui, v1 - vi, zT));

  // the roof top — most blocks are HOLLOW around a central courtyard (cour),
  // the dark well that gives the Paris roofscape its characteristic texture
  // instead of a solid identical diamond.
  iso.quad(u0 + ui, v0 + vi, u1 - ui, v1 - vi, zT, zincTop); // the leaded roof
  if (variant % 5 !== 0) {
    // the central light-well / cour: a dark recessed square, the Paris-from-
    // above texture (read flat at the roof plane so it never looks raised)
    const cu0 = 0.38;
    const cu1 = 0.64;
    const cv0 = 0.37;
    const cv1 = 0.57;
    iso.quad(cu0, cv0, cu1, cv1, zT, shaded(zinc, 0.52));
    iso.quad(cu0 + 0.03, cv0 + 0.025, cu1 - 0.03, cv1 - 0.025, zT, shaded(zinc, 0.66));
    iso.r.polyline([P(cu0, cv0, zT), P(cu1, cv0, zT), P(cu1, cv1, zT), P(cu0, cv1, zT), P(cu0, cv0, zT)], INK_W * 0.6, alpha(INK, 0.6));
  }

  // dormer windows (lucarnes) on the near slope — count varies
  const dormers = 2 + (variant % 3);
  for (let i = 0; i < dormers; i++) {
    const u = 0.18 + (i * 0.64) / Math.max(1, dormers - 1);
    const vd = v1 - vi * 0.45;
    const zd = H + mr * 0.32;
    iso.box(u - 0.045, vd, u + 0.045, vd + 0.04, zd, zd + 7, lighten(zinc, 0.14));
    iso.windowsLeft(vd + 0.04, u - 0.034, u + 0.034, zd + 1.5, zd + 6, 1, glass(rng, 0.55), frame);
    iso.r.poly([P(u - 0.055, vd, zd + 7), P(u + 0.055, vd, zd + 7), P(u, vd, zd + 11)], shaded(zinc, 0.05));
  }

  // chimney stacks with pale pots — placement varies per block
  const chimUs = ([[0.1, 0.9], [0.14, 0.5, 0.88], [0.22, 0.78]] as number[][])[variant % 3]!;
  for (const cu of chimUs) {
    const cvm = (v0 + v1) / 2;
    iso.box(cu - 0.028, cvm - 0.035, cu + 0.028, cvm + 0.035, zT, zT + 8, shaded(stone, 0.08));
    for (const dv of [-0.028, 0.018]) {
      iso.box(cu - 0.011, cvm + dv, cu + 0.011, cvm + dv + 0.02, zT + 8, zT + 12, hex('#9a8f78'), { ink: false });
    }
  }
  return iso.build();
}

/** A continuous wrought-iron balcony ledge + balusters across a left wall. */
function drawBalcony(
  iso: Iso,
  uA: number,
  uB: number,
  v: number,
  z: number,
  iron: RGBA,
  rail: RGBA,
): void {
  const out = v + 0.03; // protrudes from the facade
  // the stone slab the balcony sits on
  iso.r.poly([P(uA, v, z), P(uB, v, z), P(uB, out, z), P(uA, out, z)], lighten(iron, 0.55));
  iso.r.poly([P(uA, out, z), P(uB, out, z), P(uB, out, z - 0.8), P(uA, out, z - 0.8)], rail);
  // the iron railing band
  iso.r.poly([P(uA, out, z + 4.2), P(uB, out, z + 4.2), P(uB, out, z), P(uA, out, z)], alpha(iron, 0.92));
  // top rail + balusters (ink)
  iso.r.line(P(uA, out, z + 4.2), P(uB, out, z + 4.2), INK_W * 0.8, iron);
  const n = 22;
  for (let i = 0; i <= n; i++) {
    const u = uA + ((uB - uA) * i) / n;
    iso.r.line(P(u, out, z + 4.2), P(u, out, z + 0.4), INK_W * 0.45, alpha(iron, 0.8));
  }
}

/** Residential tower block with colour-block walls and floor bands. */
export function towerTile(seed: number, variant = 0): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 49157 + variant * 277 + 11);
  // variant drives the WHOLE look so a skyline of these reads diverse: colour
  // (the full wall rotation), height, slab width, window rhythm and crown.
  const wall = wallColor(variant);
  const slim = variant % 3 === 1; // some slimmer point blocks
  const u0 = slim ? 0.26 : 0.18;
  const v0 = slim ? 0.24 : 0.18;
  const u1 = 1 - u0;
  const v1 = 1 - v0;
  const H = 84 + (variant % 4) * 19 + (seed % 3) * 5;
  const cols = 3 + (variant % 2);
  const band = variant % 4 === 0; // banded vs plain spandrels
  iso.shadow(u0, v0, u1, v1, 0.3, 0.26);
  iso.box(u0, v0, u1, v1, 0, H, wall);
  for (let z = 12; z < H - 8; z += 15) {
    if (band) {
      iso.r.poly([P(u0, v1, z + 11), P(u1, v1, z + 11), P(u1, v1, z + 9), P(u0, v1, z + 9)], alpha(COLORS.white, 0.9));
      iso.r.poly([P(u1, v0, z + 11), P(u1, v1, z + 11), P(u1, v1, z + 9), P(u1, v0, z + 9)], alpha(COLORS.white, 0.75));
    }
    iso.windowsLeft(v1, u0 + 0.04, u1 - 0.04, z, z + 8, cols, glass(rng, 0.35));
    iso.windowsRight(u1, v0 + 0.04, v1 - 0.04, z, z + 8, cols, glass(rng, 0.3));
  }
  iso.box(u0 - 0.01, v0 - 0.01, u1 + 0.01, v1 + 0.01, H, H + 4, COLORS.white);
  const crown = variant % 3;
  if (crown === 0) {
    // plant room + beacon
    iso.box(0.5, 0.3, 0.72, 0.5, H + 4, H + 14, COLORS.concrete);
    iso.box(u0 + 0.06, u0 + 0.06, u0 + 0.09, u0 + 0.09, H + 4, H + 12, COLORS.steelDark);
    iso.quad(u0 + 0.045, u0 + 0.045, u0 + 0.105, u0 + 0.105, H + 12, COLORS.orange);
  } else if (crown === 1) {
    // stepped setback
    iso.box(u0 + 0.08, v0 + 0.08, u1 - 0.08, v1 - 0.08, H + 4, H + 18, wall);
    iso.box(u0 + 0.16, v0 + 0.16, u1 - 0.16, v1 - 0.16, H + 18, H + 28, lighten(wall, 0.08));
  } else {
    // pitched cap
    iso.hip(u0 - 0.01, v0 - 0.01, u1 + 0.01, v1 + 0.01, H + 4, 12, roofColor(variant + 1));
  }
  return iso.build();
}

/** Glass office tower with a sunset-reflecting curtain wall and setback crown.
 *  variant rotates the curtain-wall tint, height and crown for skyline variety. */
export function officeTile(seed: number, variant = 0): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 65537 + variant * 313 + 5);
  // a rotation of curtain-wall glazings: bronze/blue/teal/dusk-pink
  const tints: Array<[RGBA, RGBA]> = [
    [COLORS.glassSunset, COLORS.glassSky],
    [hex('#6f86a8'), hex('#9fb4cf')], // cool blue
    [hex('#5f8f86'), hex('#9ac0b4')], // green/teal
    [hex('#b58a5f'), hex('#d6b98f')], // bronze
  ];
  const [faceR, faceL] = tints[variant % tints.length] ?? tints[0]!;
  const u0 = 0.16;
  const v0 = 0.16;
  const u1 = 0.84;
  const v1 = 0.84;
  const H = 108 + (variant % 4) * 16 + (seed % 2) * 8;
  iso.shadow(u0, v0, u1, v1, 0.34, 0.28);
  iso.r.poly([P(u0, v1, H), P(u1, v1, H), P(u1, v1, 0), P(u0, v1, 0)], COLORS.glassDark, shaded(faceL, 0.2));
  iso.r.poly([P(u1, v0, H), P(u1, v1, H), P(u1, v1, 0), P(u1, v0, 0)], faceR, faceL);
  iso.quad(u0, v0, u1, v1, H, COLORS.white);
  for (let z = 14; z < H - 6; z += 14) {
    iso.r.poly([P(u0, v1, z + 1.6), P(u1, v1, z + 1.6), P(u1, v1, z), P(u0, v1, z)], alpha(COLORS.white, 0.85));
    iso.r.poly([P(u1, v0, z + 1.6), P(u1, v1, z + 1.6), P(u1, v1, z), P(u1, v0, z)], alpha(COLORS.white, 0.7));
  }
  for (let z = 16; z < H - 10; z += 14) {
    if (rng.chance(0.4)) {
      const a = rng.range(u0 + 0.05, 0.55);
      iso.r.poly([P(a, v1, z + 9), P(a + 0.2, v1, z + 9), P(a + 0.2, v1, z + 2), P(a, v1, z + 2)], alpha(COLORS.glassLit, 0.8));
    }
  }
  // crown varies: flat setback, or a slim mast, or a stepped top
  if (variant % 3 === 0) {
    iso.box(0.3, 0.3, 0.7, 0.7, H, H + 16, COLORS.white, { topC: COLORS.white });
    iso.box(0.44, 0.44, 0.56, 0.56, H + 16, H + 26, COLORS.steel);
  } else if (variant % 3 === 1) {
    iso.box(0.28, 0.28, 0.72, 0.72, H, H + 10, COLORS.white);
    iso.box(0.46, 0.46, 0.5, 0.5, H + 10, H + 34, COLORS.steelDark); // comms mast
  } else {
    iso.box(0.26, 0.26, 0.74, 0.74, H, H + 8, COLORS.white);
    iso.box(0.34, 0.34, 0.66, 0.66, H + 8, H + 18, lighten(COLORS.steel, 0.1));
    iso.box(0.42, 0.42, 0.58, 0.58, H + 18, H + 26, COLORS.steel);
  }
  return iso.build();
}

/** Essex cottage with a vegetable garden and apple tree. */
export function cottageTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 24593 + 9);
  const wall = COLORS.walls[5] ?? COLORS.white;
  const v0 = 0.26;
  const v1 = 0.64;
  iso.shadow(0.3, v0, 0.74, v1, 0.14, 0.18);
  iso.box(0.3, v0, 0.74, v1, 0, 20, wall);
  iso.gable(0.285, v0 - 0.015, 0.755, v1 + 0.015, 20, 12, 'u', COLORS.roofs[3] ?? COLORS.field, wall);
  iso.windowsLeft(v1, 0.34, 0.56, 6, 14, 2, glass(rng, 0.5), COLORS.white);
  iso.r.poly([P(0.62, v1, 13), P(0.69, v1, 13), P(0.69, v1, 0), P(0.62, v1, 0)], darken(wall, 0.42));
  // chimney
  iso.box(0.4, 0.42, 0.46, 0.48, 30, 40, COLORS.concrete);
  // vegetable rows
  for (let v = 0.74; v < 0.95; v += 0.07) {
    iso.quad(0.45, v, 0.92, v + 0.035, 0, alpha(darken(COLORS.grassDark, 0.15), 0.7));
  }
  iso.ball(0.14, 0.36, 0.1, 22, COLORS.treeGreen);
  return iso.build();
}

/** Distribution warehouse with skylights and roller doors. */
export function warehouseTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 50221 + 15);
  const body = COLORS.steel;
  iso.shadow(0.06, 0.1, 0.94, 0.7, 0.2, 0.2);
  iso.box(0.06, 0.1, 0.94, 0.7, 0, 30, body, { topC: lighten(COLORS.white, 0.02) });
  // roof skylight strips
  for (let u = 0.14; u < 0.86; u += 0.16) {
    iso.quad(u, 0.16, u + 0.07, 0.64, 30, alpha(COLORS.glassSky, 0.85));
  }
  // roller doors on the street face
  for (const a of [0.16, 0.42]) {
    iso.r.poly([P(a, 0.7, 18), P(a + 0.18, 0.7, 18), P(a + 0.18, 0.7, 0), P(a, 0.7, 0)], lighten(body, 0.18));
    iso.r.poly([P(a, 0.7, 18), P(a + 0.18, 0.7, 18), P(a + 0.18, 0.7, 16), P(a, 0.7, 16)], COLORS.steelDark);
  }
  iso.r.poly([P(0.72, 0.7, 12), P(0.79, 0.7, 12), P(0.79, 0.7, 0), P(0.72, 0.7, 0)], COLORS.glassDark);
  // yard pallets
  iso.box(0.16, 0.82, 0.24, 0.9, 0, 6, COLORS.orange);
  if (rng.chance(0.5)) iso.box(0.3, 0.84, 0.36, 0.9, 0, 5, darken(COLORS.orange, 0.2));
  return iso.build();
}

/** Brick factory: sawtooth roof and twin stacks. */
export function factoryTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 60013 + 17);
  const wall = COLORS.walls[6] ?? COLORS.orange;
  iso.shadow(0.08, 0.12, 0.92, 0.68, 0.2, 0.22);
  iso.box(0.08, 0.12, 0.92, 0.68, 0, 32, wall);
  // sawtooth roof: three glass-faced teeth along u
  for (let i = 0; i < 3; i++) {
    const u0 = 0.08 + i * 0.28;
    const u1 = u0 + 0.28;
    iso.r.poly([P(u0, 0.12, 32), P(u1, 0.12, 32), P(u1, 0.4, 46), P(u0, 0.4, 46)], top(wall, 0.3));
    iso.r.poly([P(u0, 0.4, 46), P(u1, 0.4, 46), P(u1, 0.68, 32), P(u0, 0.68, 32)], alpha(COLORS.glassSky, 0.9));
  }
  iso.windowsLeft(0.68, 0.14, 0.6, 16, 26, 3, glass(rng, 0.3), COLORS.white);
  iso.r.poly([P(0.68, 0.68, 16), P(0.84, 0.68, 16), P(0.84, 0.68, 0), P(0.68, 0.68, 0)], COLORS.steelDark);
  // twin stacks
  iso.box(0.76, 0.2, 0.83, 0.27, 32, 78, lighten(wall, 0.06));
  iso.box(0.62, 0.2, 0.69, 0.27, 32, 70, lighten(wall, 0.06));
  iso.quad(0.755, 0.195, 0.835, 0.275, 78, COLORS.steelDark);
  iso.quad(0.615, 0.195, 0.695, 0.275, 70, COLORS.steelDark);
  return iso.build();
}

/** Glasshouse ranges — Essex's growing empire. */
export function greenhouseTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  const rng = new Rng(seed * 70001 + 19);
  for (const [v0, v1] of [
    [0.06, 0.3],
    [0.38, 0.62],
    [0.7, 0.94],
  ] as const) {
    iso.shadow(0.06, v0, 0.94, v1, 0.08, 0.14);
    // glass walls
    const wallGlass = alpha(COLORS.greenhouseGlass, 0.92);
    iso.box(0.06, v0, 0.94, v1, 0, 12, wallGlass, {
      leftC: alpha(shaded(COLORS.greenhouseGlass, 0.12), 0.92),
      rightC: alpha(lit(COLORS.greenhouseGlass, 0.1), 0.95),
      topC: alpha(COLORS.greenhouseGlass, 0.4),
    });
    // glass gable roof catching the light
    iso.gable(0.06, v0, 0.94, v1, 12, 8, 'u', lighten(COLORS.greenhouseGlass, 0.12), COLORS.white);
    // white frame ribs
    for (let u = 0.12; u < 0.92; u += 0.1) {
      iso.r.poly([P(u, v1, 12), P(u + 0.012, v1, 12), P(u + 0.012, v1, 0), P(u, v1, 0)], alpha(COLORS.white, 0.8));
    }
    // crops glowing through
    iso.quad(0.1, v0 + 0.05, 0.9, v1 - 0.05, 1, alpha(COLORS.treeLime, rng.chance(0.5) ? 0.45 : 0.3));
  }
  return iso.build();
}

/** Built-out solar farm: tilted panel rows over the field beneath. */
export function solarFarmTile(seed: number): Uint8ClampedArray<ArrayBuffer> {
  const iso = new Iso();
  for (let v = 0.1; v < 0.9; v += 0.2) {
    iso.shadow(0.08, v, 0.92, v + 0.1, 0.05, 0.12);
    // tilted panel: back edge raised
    iso.r.poly(
      [P(0.08, v, 12), P(0.92, v, 12), P(0.92, v + 0.1, 4), P(0.08, v + 0.1, 4)],
      COLORS.panel,
      COLORS.panelGlint,
    );
    iso.r.poly([P(0.08, v, 12.5), P(0.92, v, 12.5), P(0.92, v, 11), P(0.08, v, 11)], alpha(COLORS.panelGlint, 0.9));
  }
  void seed;
  return iso.build();
}
