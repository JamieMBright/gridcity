// The ElectriCity main map: LONDON, drawn from its real geography. The
// Thames follows its true shape — the Staines/Walton meanders, the big
// Richmond/Kingston S-bends, Hammersmith and Battersea, the Westminster
// bend, the deep Isle of Dogs loop and the Greenwich peninsula, the
// Erith–Purfleet double bend, the Dartford narrows, then the widening
// estuary past Tilbury to the sea. The city itself is no painted
// rectangle: an organic density field falls away from the centre,
// ribboning outward along the real radial roads (A1, A10, A12, A13, A2,
// A23, A3, A4, A40, the A41) inside the North/South Circular ring and
// the M25 — which swings WEST of Heathrow, as it really does. Beyond the
// green belt, real satellite towns at their true relative positions in
// honestly varied sizes: big Watford, Slough, Basildon and shore-hugging
// Southend down to villages like Cobham, Chigwell and Ongar. The
// countryside is enclosed farmland: variable-size hedged fields (3–9
// tiles a side), heaths, woods, reservoir chains, gravel pits, golf
// courses and scattered farmsteads. All shapes are deterministic; a
// seeded RNG adds organic jitter, identically every run.

import {
  CUSTOMERS_PER_TILE,
  LANDMARK,
  NO_COUNCIL,
  RC,
  TERRAIN,
  ZONE,
  type CityMap,
  type CouncilProfile,
  type Landmark,
  type Terrain,
  type TransportRoute,
  type Zone,
} from '../sim/map/types';
import { sampleRoute } from '../sim/map/routes';
import { Rng } from '../sim/rng';

export const LONDON_W = 256;
export const LONDON_H = 160;

/** Charing Cross, more or less: the centre everything falls away from. */
const CENTRE = { x: 118, y: 80 };

// --- The Thames: its actual shape -------------------------------------------
// Control points west→east, each one a real reach: in from the Windsor
// meadows, the Staines and Walton meanders, the Kingston dip and the hard
// swing north through Richmond and Kew, the Hammersmith/Putney wiggles,
// Battersea reach, the Westminster bend turning north-east, the City
// reach, then the deep southward loop around the Isle of Dogs, the
// Greenwich peninsula poking back north, Woolwich and Barking reaches,
// the Erith–Purfleet double bend, the narrows under the Dartford
// crossing, and the long widening estuary past Tilbury and Canvey.

const RIVER_PTS: Array<[number, number]> = [
  [0, 92], // Windsor reach in
  [8, 96], // Datchet
  [14, 92], // Horton
  [22, 98], // Wraysbury
  [30, 103], // Staines
  [38, 100], // Laleham
  [44, 106], // Chertsey
  [52, 110], // Walton
  [60, 106], // Sunbury
  [66, 111], // Hampton
  [72, 113], // Kingston, the southmost dip
  [77, 104], // Teddington, swinging hard north
  [80, 97], // Richmond
  [84, 94], // Kew
  [88, 98], // the Chiswick/Barnes loop
  [92, 94], // Hammersmith bend
  [96, 99], // Putney/Fulham
  [100, 95], // Battersea reach
  [104, 97], // Chelsea/Vauxhall
  [108, 92], // Westminster bend, turning north
  [112, 87], // Waterloo
  [116, 86], // the City reach
  [120, 86], // Tower Bridge
  [124, 89], // Wapping
  [127, 87], // Limehouse
  [130, 92], // down the west side of the Isle of Dogs
  [133, 96], // the loop bottom — Greenwich on the south bank
  [136, 96],
  [139, 89], // up the east side
  [142, 84], // the Greenwich peninsula tip (the dome's tent)
  [146, 88], // Blackwall
  [152, 88], // Woolwich reach
  [158, 92], // Gallions
  [164, 97], // Barking / Halfway reach
  [168, 99], // Erith rands
  [172, 94], // Purfleet — the double bend
  [176, 98], // Greenhithe
  [180, 96], // the Dartford narrows (the crossing)
  [186, 99], // Gravesend reach
  [194, 97], // Tilbury
  [204, 93],
  [214, 88], // Lower Hope, turning north-east
  [228, 83], // Canvey
  [242, 79],
  [255, 76], // the open sea
];

/** River centreline lookup, sampled once from the control spline. */
const RIVER_Y: number[] = (() => {
  const ys = new Array<number>(LONDON_W).fill(80);
  const samples = sampleRoute({ kind: 'lane', pts: RIVER_PTS }, 0.25);
  for (const [sx, sy] of samples) {
    const x = Math.round(sx);
    if (x >= 0 && x < LONDON_W) ys[x] = sy;
  }
  // fill any gaps from neighbours
  for (let x = 1; x < LONDON_W; x++) {
    if (ys[x] === 80 && Math.abs((ys[x - 1] ?? 80) - 80) > 0.01) ys[x] = ys[x - 1] ?? 80;
  }
  return ys;
})();

export function riverCenterY(x: number): number {
  const xi = Math.min(LONDON_W - 1, Math.max(0, Math.round(x)));
  return RIVER_Y[xi] ?? 80;
}

/** River half-width: a narrow upper river, broadening through town and the
 *  Barking reach, pinching back at the Dartford narrows, then fanning out
 *  into the estuary past Tilbury. */
export function riverHalfWidth(x: number): number {
  if (x < 76) return 1.0;
  if (x < 150) return 1.1 + 1.1 * ((x - 76) / 74); // through town
  if (x < 166) return 2.2 + 0.6 * ((x - 150) / 16); // Barking reach
  if (x < 180) return 2.8 - 0.8 * ((x - 166) / 14); // narrowing to Dartford
  const t = (x - 180) / (LONDON_W - 180);
  return 2 + 14.5 * t * t; // the estuary fans open
}

// --- Councils --------------------------------------------------------------

interface CouncilSeed extends CouncilProfile {
  x: number;
  y: number;
}

const COUNCIL_SEEDS: CouncilSeed[] = [
  { id: 0, x: 116, y: 79, name: 'City of Westhaven', affluence: 0.95, ambition: 0.85, blurb: 'Financial heart. Net-zero pledge with a budget to match.' },
  { id: 1, x: 104, y: 62, name: 'Northheath', affluence: 0.9, ambition: 0.45, blurb: 'Leafy and lovely. Resists pylons with great vigour.' },
  { id: 2, x: 82, y: 104, name: 'Riverdene', affluence: 0.85, ambition: 0.7, blurb: 'Riverside villas. Early adopters of anything shiny.' },
  { id: 3, x: 124, y: 64, name: 'Camford', affluence: 0.6, ambition: 0.8, blurb: 'Young, dense, impatient for EV charging on every street.' },
  { id: 4, x: 112, y: 96, name: 'Southwark Vale', affluence: 0.5, ambition: 0.6, blurb: 'Markets and terraces south of the river.' },
  { id: 5, x: 136, y: 88, name: 'Old Docks', affluence: 0.4, ambition: 0.7, blurb: 'Regenerating fast. Tower cranes on every block.' },
  { id: 6, x: 134, y: 70, name: 'Walford Marsh', affluence: 0.3, ambition: 0.35, blurb: 'Proud, practical, suspicious of consultants.' },
  { id: 7, x: 116, y: 116, name: 'Penge Hollow', affluence: 0.45, ambition: 0.4, blurb: 'Quiet suburbs that would rather not be disturbed.' },
  { id: 8, x: 94, y: 74, name: 'Westgate', affluence: 0.7, ambition: 0.6, blurb: 'Stucco terraces and embassy lawns.' },
  { id: 9, x: 72, y: 50, name: 'Watfordshire', affluence: 0.6, ambition: 0.5, blurb: 'Commuter belt with opinions about train times.' },
  { id: 10, x: 160, y: 40, name: 'Harlow Reach', affluence: 0.5, ambition: 0.65, blurb: 'New town, newer ambitions.' },
  { id: 11, x: 196, y: 48, name: 'Greenmarsh', affluence: 0.5, ambition: 0.75, blurb: 'Glasshouse capital. Wants cheap power and lots of it.' },
  { id: 12, x: 190, y: 116, name: 'Witherly', affluence: 0.45, ambition: 0.25, blurb: 'Deep countryside. Electrification can wait for the cricket.' },
  { id: 13, x: 212, y: 60, name: 'Estuary Point', affluence: 0.35, ambition: 0.6, blurb: 'Salt wind and big skies. Home of the nuclear question.' },
  { id: 14, x: 238, y: 64, name: 'Southend Ness', affluence: 0.4, ambition: 0.45, blurb: 'End of the line. Cockles, caravans and a long pier.' },
];

// --- Town seeds --------------------------------------------------------------
// Real satellite towns at their true relative positions, in honestly
// varied sizes — big commuter towns, market towns, and villages scattered
// between. Estuary towns hug the shore; valley towns string along their
// rivers (`dir` is the growth axis).

export interface TownSeed {
  x: number;
  y: number;
  /** Urban-core radius; suburbs reach ~2x this, lobes further. */
  r: number;
  kind: 'town' | 'village';
  name: string;
  /** Preferred growth axis (valley/shore towns); omit for roundish towns. */
  dir?: [number, number];
}

export const TOWNS: TownSeed[] = [
  // the big ones
  { x: 64, y: 42, r: 4, kind: 'town', name: 'Watford', dir: [0.3, 1] }, // strung down the Colne valley
  { x: 34, y: 70, r: 3.5, kind: 'town', name: 'Slough', dir: [1, 0] }, // ribboned along the A4
  { x: 40, y: 122, r: 3, kind: 'town', name: 'Woking', dir: [1, 0.2] },
  { x: 120, y: 114, r: 4, kind: 'town', name: 'Croydon' }, // the conurbation's southern edge
  { x: 158, y: 64, r: 3.5, kind: 'town', name: 'Romford' }, // its eastern edge
  { x: 198, y: 58, r: 3.5, kind: 'town', name: 'Basildon', dir: [1, 0] },
  { x: 236, y: 64, r: 4, kind: 'town', name: 'Southend', dir: [1, -0.25] }, // hugs the estuary shore
  // market towns
  { x: 98, y: 22, r: 3, kind: 'town', name: 'St Albans' },
  { x: 162, y: 24, r: 3, kind: 'town', name: 'Harlow' },
  { x: 208, y: 32, r: 3, kind: 'town', name: 'Chelmsford' },
  { x: 182, y: 50, r: 2.5, kind: 'town', name: 'Brentwood' },
  { x: 174, y: 102, r: 2.5, kind: 'town', name: 'Dartford', dir: [0.3, 1] }, // up the Darent valley
  { x: 188, y: 104, r: 2.5, kind: 'town', name: 'Gravesend', dir: [1, 0] }, // along the south shore
  { x: 90, y: 128, r: 2.5, kind: 'town', name: 'Epsom' },
  { x: 36, y: 108, r: 2.5, kind: 'town', name: 'Staines', dir: [1, 0.3] }, // on the river
  { x: 162, y: 138, r: 2.5, kind: 'town', name: 'Sevenoaks' },
  { x: 48, y: 142, r: 2.5, kind: 'town', name: 'Guildford', dir: [1, 0] }, // under the Hog's Back
  { x: 178, y: 90, r: 2, kind: 'town', name: 'Grays', dir: [1, 0] }, // among the chalk pits
  // villages scattered between
  { x: 22, y: 36, r: 2, kind: 'village', name: 'Amersham' },
  { x: 18, y: 86, r: 2, kind: 'village', name: 'Windsor' },
  { x: 48, y: 114, r: 1.5, kind: 'village', name: 'Chertsey' },
  { x: 60, y: 128, r: 1.5, kind: 'village', name: 'Cobham' },
  { x: 88, y: 144, r: 2, kind: 'village', name: 'Dorking' },
  { x: 132, y: 146, r: 1.5, kind: 'village', name: 'Oxted' },
  { x: 142, y: 62, r: 1.5, kind: 'village', name: 'Chigwell' },
  { x: 174, y: 36, r: 1.5, kind: 'village', name: 'Ongar' },
  { x: 194, y: 44, r: 2, kind: 'village', name: 'Billericay' },
  { x: 222, y: 50, r: 2, kind: 'village', name: 'Rayleigh' },
  { x: 234, y: 22, r: 2, kind: 'village', name: 'Maldon' },
  { x: 136, y: 12, r: 2, kind: 'village', name: 'Ware' },
  { x: 112, y: 14, r: 1.5, kind: 'village', name: 'Hatfield' },
  { x: 182, y: 92, r: 1.5, kind: 'village', name: 'Tilbury' }, // docks on the marsh
  { x: 206, y: 110, r: 1.5, kind: 'village', name: 'Hoo' },
];

/** New-build estates: iDNO transformer in, every roof solar'd, waiting. */
export const NEW_ESTATES: Array<{ x: number; y: number; r: number }> = [
  { x: 70, y: 48, r: 3 },
  { x: 188, y: 58, r: 3 },
  { x: 156, y: 130, r: 3 },
];

/** Map flags bitmask (CityMap.flags). */
export const FLAG_SHOPS = 1;
export const FLAG_RUNWAY = 2;

/** Named places shown by the inspector (central termini, the airport). */
export const NAMED_PLACES: Array<{ x: number; y: number; name: string }> = [
  { x: 114, y: 78, name: "King's Cross" },
  { x: 122, y: 76, name: 'Liverpool Street' },
  { x: 122, y: 90, name: 'London Bridge' },
  { x: 65, y: 87, name: 'Heathrow' },
];

/** Generation already on the system when the game opens — the real-world
 *  foundations (estuary gas, Lea-side plant, Essex solar/wind), developer
 *  owned and operational, just waiting for someone to wire them in. The
 *  owner's Embedded Capacity Register extract can replace this list. */
export const EXISTING_GENERATION: Array<{
  gen: 'gasCCGT' | 'gasPeaker' | 'solarFarm' | 'windOnshore';
  x: number;
  y: number;
}> = [
  { gen: 'gasCCGT', x: 204, y: 70 }, // Coryton/Tilbury analog on the estuary
  { gen: 'gasPeaker', x: 128, y: 40 }, // Enfield analog up the Lea
  { gen: 'solarFarm', x: 192, y: 88 }, // Essex field array
  { gen: 'windOnshore', x: 228, y: 46 }, // turbines above the creek
];

// --- Builder ---------------------------------------------------------------

export function buildLondonMap(): CityMap {
  const w = LONDON_W;
  const h = LONDON_H;
  const n = w * h;
  const rng = new Rng(0x10ec1717);

  const terrain = new Uint8Array(n).fill(TERRAIN.land);
  const zone = new Uint8Array(n).fill(ZONE.none);
  const council = new Uint8Array(n).fill(NO_COUNCIL);
  const road = new Uint8Array(n);
  const customers = new Uint16Array(n);
  const vegetation = new Uint8Array(n);
  const variant = new Uint8Array(n);
  const landmark = new Uint8Array(n);
  const flags = new Uint8Array(n);
  const routes: TransportRoute[] = [];

  const idx = (x: number, y: number): number => y * w + x;
  const inb = (x: number, y: number): boolean => x >= 0 && x < w && y >= 0 && y < h;

  const setTerrain = (x: number, y: number, t: Terrain): void => {
    if (inb(x, y)) terrain[idx(x, y)] = t;
  };
  const isWater = (x: number, y: number): boolean =>
    inb(x, y) && terrain[idx(x, y)] === TERRAIN.water;
  const isLand = (x: number, y: number): boolean =>
    inb(x, y) && terrain[idx(x, y)] === TERRAIN.land;

  const zoneRect = (x0: number, y0: number, x1: number, y1: number, z: Zone, jitter = 0): void => {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (!isLand(x, y)) continue;
        if (jitter > 0) {
          const edge =
            Math.min(x - x0, x1 - x, y - y0, y1 - y) < jitter ? rng.chance(0.45) : false;
          if (edge) continue;
        }
        zone[idx(x, y)] = z;
      }
    }
  };

  const zoneBlob = (cx: number, cy: number, r: number, z: Zone): void => {
    for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) {
      for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
        if (!isLand(x, y)) continue;
        const d = Math.hypot(x - cx, y - cy);
        if (d <= r - 1 || (d <= r + 1 && rng.chance(0.5))) zone[idx(x, y)] = z;
      }
    }
  };

  const terrainBlob = (cx: number, cy: number, r: number, t: Terrain): void => {
    for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) {
      for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
        if (!isLand(x, y)) continue;
        const d = Math.hypot(x - cx, y - cy);
        if (d <= r - 1 || (d <= r + 1 && rng.chance(0.5))) terrain[idx(x, y)] = t;
      }
    }
  };
  const forestBlob = (cx: number, cy: number, r: number): void => terrainBlob(cx, cy, r, TERRAIN.trees);
  const lakeBlob = (cx: number, cy: number, r: number): void => {
    for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) {
      for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d <= r || (d <= r + 0.8 && rng.chance(0.4))) setTerrain(x, y, TERRAIN.water);
      }
    }
  };

  // 1) The Thames + the Essex creek (the Crouch)
  for (let x = 0; x < w; x++) {
    const cy = riverCenterY(x);
    const hw = riverHalfWidth(x);
    for (let y = Math.floor(cy - hw - 1); y <= Math.ceil(cy + hw + 1); y++) {
      const d = Math.abs(y - cy);
      if (d <= hw || (d <= hw + 0.9 && rng.chance(0.4))) setTerrain(x, y, TERRAIN.water);
    }
  }
  for (let x = 210; x < w; x++) {
    const cy = Math.round(30 + 4 * Math.sin(x / 8));
    setTerrain(x, cy, TERRAIN.water);
    setTerrain(x, cy + 1, TERRAIN.water);
    if (rng.chance(0.3)) setTerrain(x, cy + 2, TERRAIN.water);
  }

  // 1b) Tributaries, each a real valley: the Colne past Watford to Staines,
  // the Lea down the reservoir chain, the Wey through Woking, the Mole
  // under the Downs, the Darent through Dartford, the Roding past Romford.
  const TRIBUTARIES: Array<Array<[number, number]>> = [
    [[56, 10], [58, 24], [56, 38], [52, 52], [48, 66], [46, 80], [44, 92], [42, 103]], // Colne
    [[136, 10], [134, 24], [136, 38], [133, 50], [130, 62], [128, 74], [126, 86]], // Lea
    [[46, 156], [44, 144], [42, 132], [40, 122], [44, 114], [48, 109]], // Wey
    [[98, 156], [94, 144], [90, 132], [82, 124], [72, 118], [68, 112]], // Mole
    [[166, 142], [168, 128], [170, 114], [172, 104], [173, 97]], // Darent
    [[172, 28], [168, 42], [163, 56], [159, 70], [156, 82], [155, 88]], // Roding
  ];
  for (const trib of TRIBUTARIES) {
    for (const [sx, sy] of sampleRoute({ kind: 'lane', pts: trib }, 0.4)) {
      const tx = Math.round(sx + rng.range(-0.3, 0.3));
      const ty = Math.round(sy);
      setTerrain(tx, ty, TERRAIN.water);
      if (rng.chance(0.35)) setTerrain(tx + 1, ty, TERRAIN.water);
    }
  }
  // 1c) Standing water: the Staines/Wraysbury reservoir group right beside
  // Heathrow, the Lea Valley chain, gravel pits down the Colne, the
  // flooded chalk pits behind Grays, and the Kent and Essex reservoirs.
  for (const [cx, cy, r] of [
    [46, 92, 3], [52, 96, 2.6], [44, 98, 2.2], [60, 118, 2.4], // Staines group + the QE2
    [44, 76, 1.2], [42, 82, 1.4], [46, 86, 1], // Colne gravel pits
    [136, 34, 1.8], [137, 42, 2.2], [134, 52, 2.4], [131, 62, 2], [129, 70, 1.8], // the Lea chain
    [174, 86, 1.4], [171, 90, 1.1], // Grays chalk pits
    [206, 116, 2.2], // the Kent reservoir
    [200, 44, 1.8], // Hanningfield, Essex
  ] as const) {
    lakeBlob(cx, cy, r);
  }

  // 2) Hills: the Chiltern edge NW, the North Downs along the south
  for (let x = 0; x < w; x++) {
    const ridgeN = 4 + 3 * Math.sin(x / 16) + rng.range(0, 2) + (x < 60 ? 3 : 0);
    const ridgeS = h - 5 - 4 * Math.sin(x / 21) - rng.range(0, 2);
    for (let y = 0; y < h; y++) {
      if (y < ridgeN || y > ridgeS) {
        if (isLand(x, y)) terrain[idx(x, y)] = TERRAIN.hill;
      }
    }
  }
  // named heights: the Downs spurs, the Chiltern knolls, Langdon Hills
  for (const [cx, cy, r] of [
    [96, 138, 3.5], // Epsom Downs
    [60, 136, 3], // the Hog's Back
    [118, 140, 3], [146, 134, 2.5], // the Downs above Oxted
    [24, 26, 4], [12, 48, 3], [38, 14, 3], // Chiltern fringe
    [192, 68, 2], // Langdon Hills above Basildon
    [218, 40, 2], // Danbury ridge
  ] as const) {
    terrainBlob(cx, cy, r, TERRAIN.hill);
  }

  // 3) Forests: Epping NE of the city, real woods through the belt in
  // honestly varied sizes
  forestBlob(148, 50, 8); // Epping
  forestBlob(156, 38, 6);
  forestBlob(40, 32, 6); // Chiltern beechwoods
  forestBlob(46, 126, 4); // Chobham heathwoods
  forestBlob(182, 128, 7); // the Kent Weald edge
  forestBlob(216, 122, 5);
  forestBlob(76, 132, 5); // Ranmore
  forestBlob(24, 84, 5); // Windsor Great Park
  forestBlob(108, 28, 3);
  forestBlob(228, 116, 4);
  forestBlob(12, 112, 4);
  forestBlob(166, 116, 3);
  forestBlob(86, 30, 2);

  // 4) The radial skeleton (real bearings) — defined BEFORE the density
  // field so housing can ribbon along it the way real London does.
  // The south-bank radials anchor on the embankment carriageway row (a
  // fixed quantized setback off the water) so none of them starts in, or
  // clips, the river.

  /** Quantized carriageway row a fixed setback off the river bank. */
  const bank = (x: number, side: -1 | 1): number =>
    side < 0
      ? Math.floor(riverCenterY(x) - riverHalfWidth(x)) - 3
      : Math.ceil(riverCenterY(x) + riverHalfWidth(x)) + 3;

  const RADIALS: Array<Array<[number, number]>> = [
    [[118, 70], [112, 46], [104, 32], [98, 22], [92, 0]], // A1 north
    [[121, 70], [130, 44], [134, 28], [136, 12], [136, 0]], // A10 past Ware
    [[124, 73], [142, 56], [154, 40], [162, 24]], // A12/M11 → Harlow
    [[128, 76], [152, 60], [182, 50], [208, 34], [240, 24], [255, 20]], // A12 → Brentwood, Chelmsford, out east
    [[130, 78], [158, 64], [178, 60], [198, 58], [222, 56], [236, 62]], // A127 → Romford, Basildon, Southend
    [[128, 82], [148, 80], [166, 84], [182, 86], [196, 82], [212, 74], [228, 68], [238, 64]], // A13 along the estuary
    [[122, bank(122, 1)], [130, 99], [142, 100], [158, 102], [174, 104], [188, 106], [206, 112], [226, 124], [240, 130], [255, 136]], // A2 → Dartford, Gravesend, Kent (south of the loop)
    [[116, bank(116, 1)], [114, 112], [110, 130], [106, 146], [104, 159]], // A23 south
    [[112, bank(112, 1)], [104, 102], [94, 106], [74, 120], [60, 128], [50, 140], [44, 152], [42, 159]], // A3 → Cobham, Guildford (south of the Battersea bend)
    [[108, 82], [88, 82], [70, 78], [52, 74], [34, 70], [16, 66], [0, 64]], // A4 → Slough, out west
    [[110, 76], [88, 64], [62, 52], [40, 42], [22, 36], [8, 28], [0, 26]], // A40 west-northwest
    [[112, 72], [98, 56], [78, 46], [64, 42], [50, 30], [40, 16], [36, 0]], // A41 → Watford, out north-west
    [[120, bank(120, 1)], [128, 101], [148, 112], [156, 124], [162, 138], [166, 150], [168, 159]], // A21 → Sevenoaks, out south
  ];

  // 5) The city: an organic density field around the centre, boosted
  // along the radials, eaten by noise at the edges — no straight lines.
  {
    // corridor boost raster from radial samples
    const boost = new Float32Array(n);
    for (const r of RADIALS) {
      for (const [sx, sy] of sampleRoute({ kind: 'arterial', pts: r }, 0.5)) {
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const tx = Math.round(sx + dx);
            const ty = Math.round(sy + dy);
            if (!inb(tx, ty)) continue;
            const d = Math.hypot(sx - tx, sy - ty);
            const i = idx(tx, ty);
            boost[i] = Math.max(boost[i] ?? 0, 0.16 * Math.max(0, 1 - d / 2.6));
          }
        }
      }
    }
    const noiseAt = (x: number, y: number): number => {
      // smooth-ish value noise from coarse lattice hashes
      const hash = (gx: number, gy: number): number =>
        ((((gx * 73856093) ^ (gy * 19349663)) >>> 0) % 1000) / 1000;
      const gx = x / 5;
      const gy = y / 5;
      const x0 = Math.floor(gx);
      const y0 = Math.floor(gy);
      const fx = gx - x0;
      const fy = gy - y0;
      const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
      const v = lerp(
        lerp(hash(x0, y0), hash(x0 + 1, y0), fx),
        lerp(hash(x0, y0 + 1), hash(x0 + 1, y0 + 1), fx),
        fy,
      );
      return (v - 0.5) * 0.26;
    };
    const RMAX = 46;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!isLand(x, y)) continue;
        const i = idx(x, y);
        const d = Math.hypot(x - CENTRE.x, y - CENTRE.y);
        let v = 1.09 - d / RMAX + (boost[i] ?? 0) + noiseAt(x, y);
        // south of the river thins a touch sooner, like home
        if (y > riverCenterY(x)) v -= 0.04;
        if (v >= 0.62) zone[i] = ZONE.urbanCore;
        else if (v >= 0.46) zone[i] = ZONE.urban;
        else if (v >= 0.3) zone[i] = ZONE.suburb;
      }
    }
  }

  // the two skyscraper districts: the Square Mile, and the wharf towers
  // on the Isle of Dogs inside the river's deep loop
  zoneBlob(116, 77, 3.4, ZONE.cbd);
  zoneBlob(134, 89, 2.2, ZONE.cbd); // Canary, on the tongue inside the loop
  // conservation quarters: Mayfair beside the park, the heath NW, the
  // river bend at Richmond/Kew
  zoneBlob(107, 77, 2.6, ZONE.posh);
  zoneBlob(103, 63, 4.5, ZONE.posh);
  zoneBlob(84, 102, 4.5, ZONE.posh);
  // industry: the east-river corridors + the western works
  zoneRect(134, 74, 152, 80, ZONE.industrial, 2); // Lea mouth / Stratford
  zoneRect(158, 84, 170, 88, ZONE.industrial, 2); // Dagenham, north bank
  zoneRect(146, 94, 158, 98, ZONE.industrial, 2); // Charlton/Woolwich, south bank
  zoneBlob(94, 70, 3, ZONE.industrial); // Park Royal
  zoneRect(176, 86, 182, 90, ZONE.industrial, 1); // Grays riverside works
  zoneRect(180, 90, 186, 93, ZONE.industrial, 1); // Tilbury docks

  // 6) Satellite towns and villages beyond the belt: organic footprints —
  // a core, suburb lobes strung along the town's growth axis, industry on
  // the edge. Estuary towns hug the shore; valley towns follow rivers.
  const townBlob = (t: TownSeed): void => {
    const [dx, dy] = t.dir ?? [0, 0];
    const len = Math.hypot(dx, dy);
    const ux = len > 0 ? dx / len : 0;
    const uy = len > 0 ? dy / len : 0;
    zoneBlob(t.x, t.y, t.r * 1.9, ZONE.suburb);
    const lobes = t.r >= 3.5 ? 4 : t.r >= 2.5 ? 3 : 2;
    for (let k = 0; k < lobes; k++) {
      let ox: number;
      let oy: number;
      if (len > 0) {
        const s = (k % 2 === 0 ? 1 : -1) * rng.range(0.8, 2) * t.r;
        ox = ux * s + rng.range(-1.5, 1.5);
        oy = uy * s + rng.range(-1.5, 1.5);
      } else {
        const a = rng.range(0, Math.PI * 2);
        const d = t.r * rng.range(1, 2);
        ox = Math.cos(a) * d;
        oy = Math.sin(a) * d;
      }
      zoneBlob(t.x + ox, t.y + oy, t.r * rng.range(0.7, 1.3), ZONE.suburb);
    }
    zoneBlob(t.x, t.y, t.r, ZONE.urban);
    if (t.r >= 3.5) {
      zoneBlob(t.x + ux * t.r + rng.range(-2, 2), t.y + uy * t.r + rng.range(-2, 2), t.r * 0.55, ZONE.urban);
    }
    const ind = t.r >= 3.5 ? 2 : 1;
    for (let k = 0; k < ind; k++) {
      const a = rng.range(0, Math.PI * 2);
      zoneBlob(t.x + Math.cos(a) * t.r * 2.3, t.y + Math.sin(a) * t.r * 2.3, 1.6 + t.r * 0.2, ZONE.industrial);
    }
  };
  for (const t of TOWNS) {
    if (t.kind === 'town') townBlob(t);
    else zoneBlob(t.x, t.y, t.r, ZONE.rural);
  }
  // Southend spreads in a strip along its shore (and gets the long pier)
  for (let x = 222; x <= 248; x++) {
    const shore = Math.floor(riverCenterY(x) - riverHalfWidth(x));
    for (let y = shore - 4; y <= shore - 1; y++) {
      if (!isLand(x, y)) continue;
      if (y === shore - 4 && rng.chance(0.5)) continue;
      zone[idx(x, y)] = zone[idx(x, y)] === ZONE.urban ? ZONE.urban : ZONE.suburb;
    }
  }
  for (const e of NEW_ESTATES) zoneBlob(e.x, e.y, e.r, ZONE.newEstate);

  // Heathrow's airfield in the west: two parallel runways cut into the
  // fields, the ground cleared before the streets are laid — inside the
  // M25 (which passes to its west), south of the M4, north of the M3
  const inAirfield = (x: number, y: number): boolean => x >= 54 && x <= 76 && y >= 83 && y <= 91;
  {
    for (let x = 54; x <= 76; x++) {
      for (let y = 83; y <= 91; y++) {
        if (!inb(x, y) || !isLand(x, y)) continue;
        zone[idx(x, y)] = ZONE.none;
      }
    }
    for (let x = 56; x <= 72; x++) {
      for (const y of [84, 85]) {
        if (!inb(x, y) || !isLand(x, y)) continue;
        flags[idx(x, y)] = (flags[idx(x, y)] ?? 0) | FLAG_RUNWAY;
      }
    }
    for (let x = 58; x <= 74; x++) {
      for (const y of [89, 90]) {
        if (!inb(x, y) || !isLand(x, y)) continue;
        flags[idx(x, y)] = (flags[idx(x, y)] ?? 0) | FLAG_RUNWAY;
      }
    }
  }

  // glasshouses (the Lea Valley NNE, Essex, and the Kent fringe market
  // gardens), pre-sited generation
  zoneRect(132, 30, 142, 40, ZONE.greenhouse, 1);
  zoneRect(204, 46, 216, 54, ZONE.greenhouse, 1);
  zoneRect(146, 118, 154, 124, ZONE.greenhouse, 1); // Kent fringe
  zoneRect(22, 52, 32, 58, ZONE.solarSite);
  zoneRect(72, 26, 82, 31, ZONE.solarSite);
  zoneRect(190, 86, 200, 92, ZONE.solarSite);
  zoneRect(214, 104, 224, 110, ZONE.solarSite);
  zoneRect(58, 142, 68, 148, ZONE.solarSite);
  zoneRect(172, 116, 180, 121, ZONE.solarSite);
  zoneRect(208, 64, 220, 71, ZONE.nuclearSite); // the marshy north shore
  for (let y = 56; y <= 110; y++) {
    for (let x = 244; x < w; x++) {
      if (isWater(x, y)) zone[idx(x, y)] = ZONE.windSite;
    }
  }
  // royal parks + the great commons, and Greenwich park on its hill
  // inside the loop's south bank
  zoneRect(108, 73, 115, 78, ZONE.park); // Hyde
  zoneRect(112, 64, 118, 69, ZONE.park); // Regent's
  zoneRect(99, 56, 107, 61, ZONE.park); // the heath
  zoneRect(78, 108, 88, 116, ZONE.park); // Richmond park
  zoneRect(124, 71, 130, 75, ZONE.park); // Victoria park
  zoneRect(130, 100, 137, 104, ZONE.park); // Greenwich park
  zoneRect(126, 108, 132, 113, ZONE.park); // Dulwich
  // golf courses fringing the suburbs and towns
  for (const [cx, cy, r] of [
    [70, 58, 2], [44, 64, 1.8], [100, 34, 1.8], [148, 70, 2],
    [126, 126, 2], [170, 110, 1.8], [52, 118, 1.8], [228, 56, 1.8],
  ] as const) {
    zoneBlob(cx, cy, r, ZONE.park);
  }

  // 6b) Copses + scattered farmsteads: the belt reads as worked, enclosed
  // English farmland, not a snooker table
  for (let attempt = 0; attempt < 110; attempt++) {
    const cx = 4 + rng.int(w - 8);
    const cy = 6 + rng.int(h - 12);
    if (zone[idx(cx, cy)] !== ZONE.none) continue;
    if (!isLand(cx, cy) || inAirfield(cx, cy)) continue;
    forestBlob(cx, cy, 1 + rng.int(3));
  }
  for (let attempt = 0; attempt < 60; attempt++) {
    const cx = 6 + rng.int(w - 12);
    const cy = 8 + rng.int(h - 16);
    if (zone[idx(cx, cy)] !== ZONE.none || !isLand(cx, cy) || inAirfield(cx, cy)) continue;
    if (cx > 180 && Math.abs(cy - riverCenterY(cx)) < 10) continue; // not on the marsh
    zoneBlob(cx, cy, 0.9, ZONE.rural); // a farmstead and its yard
  }
  // heather and rough grazing in patches through the belt
  for (let attempt = 0; attempt < 14; attempt++) {
    const cx = 8 + rng.int(w - 16);
    const cy = 10 + rng.int(h - 20);
    if (zone[idx(cx, cy)] !== ZONE.none || !isLand(cx, cy) || inAirfield(cx, cy)) continue;
    if (cx > 180 && Math.abs(cy - riverCenterY(cx)) < 10) continue;
    terrainBlob(cx, cy, 1.5 + rng.range(0, 1.5), TERRAIN.hill);
  }

  // 7) Councils: nearest-seed Voronoi over land
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!isLand(x, y) && terrain[idx(x, y)] !== TERRAIN.trees && terrain[idx(x, y)] !== TERRAIN.hill)
        continue;
      let best = NO_COUNCIL;
      let bestD = Infinity;
      for (const s of COUNCIL_SEEDS) {
        const d = (x - s.x) * (x - s.x) + (y - s.y) * (y - s.y);
        if (d < bestD) {
          bestD = d;
          best = s.id;
        }
      }
      council[idx(x, y)] = best;
    }
  }

  // 8) The vector transport network ------------------------------------------
  // Doctrine: through built fabric every carriageway follows the TILE
  // LATTICE — integer corner points and axis-aligned runs (the render
  // spline rounds each corner by well under a tile, a neat chamfer), so
  // streets run BETWEEN the building blocks and houses front straight onto
  // them. Out in the open country, motorways, railways and lanes keep
  // their sweep. No street or arterial crosses the Thames except at the
  // designated bridges, always perpendicular to the water.

  /** Tiles that count as built fabric for the road lattice. */
  const inhabited = (x: number, y: number): boolean => {
    if (!inb(x, y) || !isLand(x, y)) return false;
    const z = zone[idx(x, y)] as Zone;
    return (
      z === ZONE.urbanCore ||
      z === ZONE.cbd ||
      z === ZONE.urban ||
      z === ZONE.suburb ||
      z === ZONE.posh ||
      z === ZONE.industrial ||
      z === ZONE.newEstate
    );
  };
  const nearTown = (x: number, y: number): boolean => {
    const xi = Math.round(x);
    const yi = Math.round(y);
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (inhabited(xi + dx, yi + dy)) return true;
      }
    }
    return false;
  };

  /** Re-lay a sweeping polyline so that wherever it passes through town it
   *  follows the lattice: waypoints snap to tile corners and every leg
   *  becomes axis-aligned runs with an L-corner every few tiles. Open-
   *  country stretches keep their original sweep. Original waypoints are
   *  preserved, so junctions between routes survive. */
  const latticeThroughTowns = (pts: Array<[number, number]>): Array<[number, number]> => {
    // chop every leg into ~4-tile chords so the town test is local
    const chords: Array<[number, number]> = [];
    for (let s = 0; s + 1 < pts.length; s++) {
      const [ax, ay] = pts[s] ?? [0, 0];
      const [bx, by] = pts[s + 1] ?? [0, 0];
      const pieces = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / 4));
      for (let k = 0; k < pieces; k++) {
        chords.push([ax + ((bx - ax) * k) / pieces, ay + ((by - ay) * k) / pieces]);
      }
    }
    const lastPt = pts[pts.length - 1];
    if (lastPt) chords.push([lastPt[0], lastPt[1]]);
    const town = chords.map(([x, y]) => nearTown(x, y));
    const out: Array<[number, number]> = [];
    const push = (x: number, y: number): void => {
      const tail = out[out.length - 1];
      if (!tail || tail[0] !== x || tail[1] !== y) out.push([x, y]);
    };
    for (let k = 0; k < chords.length; k++) {
      const [cx, cy] = chords[k] ?? [0, 0];
      const snap = town[k] === true;
      const px = snap ? Math.round(cx) : cx;
      const py = snap ? Math.round(cy) : cy;
      const tail = out[out.length - 1];
      if (tail && snap && town[k - 1] === true && px !== tail[0] && py !== tail[1]) {
        // L-corner between lattice points: longest leg first
        if (Math.abs(px - tail[0]) >= Math.abs(py - tail[1])) push(px, tail[1]);
        else push(tail[0], py);
      }
      push(px, py);
    }
    return out;
  };

  const addRoute = (kind: TransportRoute['kind'], pts: Array<[number, number]>): void => {
    routes.push({ kind, pts });
  };
  /** Arterials and country lanes take the in-town lattice treatment. */
  const addRoad = (kind: 'arterial' | 'lane', pts: Array<[number, number]>): void => {
    addRoute(kind, latticeThroughTowns(pts));
  };

  // the M25, ringing the whole city — hand-laid on its real line: it
  // passes WEST of Heathrow (the airport sits inside the ring between the
  // M4 and the M3) and crosses the river at the Dartford narrows
  addRoute('motorway', [
    [118, 28], // South Mimms
    [100, 30],
    [84, 32], // Kings Langley
    [68, 34], // skirting north-west of Watford
    [58, 40], // Chorleywood
    [52, 50],
    [48, 62], // the M40 junction
    [48, 76], // the M4 junction — west of Heathrow
    [50, 90], // still west of the airport
    [52, 102], // Staines, crossing the river
    [56, 112], // the M3 junction
    [62, 122], // Chertsey
    [70, 130], // Wisley (the A3)
    [84, 136], // Leatherhead
    [100, 140], // Reigate
    [118, 142], // Godstone
    [134, 140],
    [146, 132], // the Kent corner, north of Sevenoaks
    [154, 120],
    [160, 110], // Swanley
    [166, 102],
    [170, 96], // the Dartford crossing, over the narrows
    [172, 86], // Thurrock
    [172, 74],
    [170, 62],
    [166, 50], // the Brentwood corner
    [158, 42], // the M11 junction
    [146, 36], // skirting Epping forest
    [134, 32], // Enfield
    [118, 28],
  ]);
  // the M4 west past Slough and the M3 south-west — Heathrow sits between
  // (the M3 starts on the south bank: it never enters the river)
  addRoute('motorway', [[100, 78], [80, 76], [60, 72], [40, 68], [20, 64], [0, 62]]);
  addRoute('motorway', [[100, 101], [82, 105], [62, 112], [44, 116], [24, 122], [0, 126]]);
  // the North + South Circulars: the inner ring road, lattice-laid, with
  // its two river crossings as perpendicular bridges (Kew side at x=96,
  // Blackwall side at x=143)
  addRoad('arterial', [
    [104, 62], [112, 60], [124, 60], [132, 63], [138, 68], [142, 74],
    [143, bank(143, -1)], [143, bank(143, 1)], // the east crossing
    [140, 97], [134, 103], [126, 104], [118, 103], [110, 102], [102, 103],
    [96, bank(96, 1)], [96, bank(96, -1)], // the west crossing
    [94, 87], [93, 80], [94, 72], [98, 66], [104, 62],
  ]);
  // embankment arterials hugging each bank through town: stepped along the
  // lattice at a fixed quantized setback off the water
  {
    // the north embankment steps one column early behind Westminster so
    // the Parliament precinct keeps its river frontage to itself
    const rowAt = (x: number, side: -1 | 1): number =>
      side < 0 && x >= 106 && x <= 110 ? bank(x + 1, -1) : bank(x, side);
    const bankPath = (x0: number, x1: number, side: -1 | 1): void => {
      let y = rowAt(x0, side);
      const pts: Array<[number, number]> = [[x0, y]];
      for (let x = x0 + 1; x <= x1; x++) {
        const ny = rowAt(x, side);
        if (ny !== y) {
          pts.push([x, y]);
          pts.push([x, ny]);
          y = ny;
        }
      }
      const tail = pts[pts.length - 1];
      if (!tail || tail[0] !== x1 || tail[1] !== y) pts.push([x1, y]);
      addRoute('arterial', pts); // lattice by construction
    };
    bankPath(86, 170, -1);
    bankPath(86, 160, 1);
  }
  // the radials themselves
  for (const r of RADIALS) addRoad('arterial', r);
  // country lanes chaining the villages — every lane ends at a town, a
  // village, another road or the map edge; none dies in a field. They
  // sweep through open country and snap to the lattice through towns.
  addRoad('lane', [[22, 36], [18, 60], [18, 86]]); // Amersham → Windsor
  addRoad('lane', [[18, 86], [26, 78], [34, 70]]); // Windsor → Slough
  addRoad('lane', [[18, 86], [26, 92], [30, 96], [30, 107], [36, 108]]); // Windsor → Staines, crossing the river square-on at the town bridge
  addRoad('lane', [[36, 108], [48, 114], [60, 128], [76, 128], [90, 128]]); // Staines → Chertsey → Cobham → Epsom
  addRoad('lane', [[48, 114], [40, 122]]); // Chertsey → Woking
  addRoad('lane', [[60, 128], [48, 142]]); // Cobham → Guildford
  addRoad('lane', [[48, 142], [68, 146], [88, 144]]); // Guildford → Dorking, under the Downs
  addRoad('lane', [[88, 144], [90, 128]]); // Dorking → Epsom
  addRoad('lane', [[90, 128], [106, 122], [120, 114]]); // Epsom → Croydon
  addRoad('lane', [[120, 114], [126, 130], [132, 146]]); // Croydon → Oxted
  addRoad('lane', [[132, 146], [148, 144], [162, 138]]); // Oxted → Sevenoaks
  addRoad('lane', [[188, 106], [206, 110]]); // Gravesend → Hoo
  addRoad('lane', [[206, 110], [216, 118], [225, 124]]); // Hoo → the A2
  addRoad('lane', [[22, 36], [40, 40], [64, 42]]); // Amersham → Watford
  addRoad('lane', [[64, 42], [80, 34], [98, 22]]); // Watford → St Albans
  addRoad('lane', [[98, 22], [112, 14], [136, 12]]); // St Albans → Hatfield → Ware
  addRoad('lane', [[136, 12], [148, 16], [162, 24]]); // Ware → Harlow
  addRoad('lane', [[162, 24], [174, 36], [182, 50]]); // Harlow → Ongar → Brentwood
  addRoad('lane', [[182, 50], [194, 44], [208, 32]]); // Brentwood → Billericay → Chelmsford
  addRoad('lane', [[208, 32], [222, 26], [234, 22]]); // Chelmsford → Maldon
  addRoad('lane', [[234, 22], [228, 38], [222, 50]]); // Maldon → Rayleigh
  addRoad('lane', [[198, 58], [210, 54], [222, 50]]); // Basildon → Rayleigh
  addRoad('lane', [[222, 50], [230, 56], [236, 62]]); // Rayleigh → Southend
  addRoad('lane', [[182, 92], [178, 90], [177, 85]]); // Tilbury → Grays → the A13
  addRoad('lane', [[142, 62], [150, 64], [158, 64]]); // Chigwell → Romford

  // railways out of the central termini, every line ending at a town or
  // the map edge
  const RAILS: Array<Array<[number, number]>> = [
    [[114, 78], [98, 58], [78, 46], [64, 42], [48, 28], [40, 14], [38, 0]], // NW main line through Watford
    [[122, 76], [134, 54], [148, 38], [162, 24]], // Lea valley → Harlow
    [[124, 80], [146, 70], [158, 64], [182, 52], [208, 32], [228, 20], [248, 10], [255, 7]], // Great Eastern → Romford, Chelmsford, out NE
    [[124, 82], [148, 80], [166, 84], [178, 88], [192, 86], [210, 76], [224, 68], [236, 64]], // LTS along the estuary → Southend
    [[122, 86], [142, 96], [160, 100], [174, 103], [188, 105], [206, 112], [222, 124], [236, 138], [246, 152], [250, 159]], // North Kent → Dartford, Gravesend, out SE
    [[114, 86], [118, 102], [120, 116], [114, 132], [108, 148], [106, 159]], // Brighton line through Croydon
    [[122, 88], [136, 102], [150, 118], [162, 138]], // SE → Sevenoaks
    [[110, 83], [88, 98], [66, 108], [48, 114], [40, 122]], // SW → Staines side, Woking (lifted off the bank behind Parliament)
    [[112, 78], [88, 80], [62, 76], [34, 70], [14, 68], [0, 67]], // Great Western → Slough
  ];
  for (const line of RAILS) addRoute('rail', line);

  // local streets: the CITY-BLOCK LATTICE. Straight runs along the tile
  // grid — rows every 4th tile, columns every 5th — clipped to inhabited
  // land, never crossing water. The carriageway corridor clears its own
  // row of structures and the houses either side front straight onto it;
  // blocks come out 4 wide by 3 deep. No jitter: tessellation is the point.
  {
    for (let y = 4; y < h - 2; y += 4) {
      let runStart = -1;
      for (let x = 0; x <= w; x++) {
        const on = x < w && inhabited(x, y);
        if (on && runStart < 0) runStart = x;
        if (!on && runStart >= 0) {
          if (x - runStart >= 3) addRoute('street', [[runStart, y], [x - 1, y]]);
          runStart = -1;
        }
      }
    }
    for (let x = 2; x < w - 2; x += 5) {
      let runStart = -1;
      for (let y = 0; y <= h; y++) {
        const on = y < h && inhabited(x, y);
        if (on && runStart < 0) runStart = y;
        if (!on && runStart >= 0) {
          if (y - runStart >= 3) addRoute('street', [[x, runStart], [x, y - 1]]);
          runStart = -1;
        }
      }
    }
  }

  // the Thames bridges: Kingston, Richmond, Hammersmith upstream, then
  // Westminster, Waterloo, Blackfriars, London Bridge and Tower Bridge
  // through town — each crossing square-on to the water, its approach
  // road running on to meet the nearest street-lattice row. (The
  // Circular's own crossings at x=96 and x=143 are arterial bridges.)
  for (const bx of [74, 80, 88, 102, 106, 110, 114, 117, 120]) {
    let yN = bank(bx, -1);
    while (yN % 4 !== 0) yN--;
    let yS = bank(bx, 1);
    while (yS % 4 !== 0) yS++;
    addRoute('street', [[bx, yN], [bx, yS]]);
  }
  // Heathrow's spur road: in from the A4 along the lattice, crossing the
  // north runway square-on to reach the terminal between the runways
  addRoute('street', [[70, 78], [70, 83], [66, 83], [66, 86]]);
  // Southend's pier: the longest in the world, a street into the sea
  {
    const px = 238;
    const shore = Math.ceil(riverCenterY(px) - riverHalfWidth(px));
    addRoute('street', [[px, shore - 1], [px, shore + 5]]);
  }

  // 8b) Stamp routes onto the gameplay raster
  const CLASS_CODE: Record<TransportRoute['kind'], number> = {
    street: RC.street,
    lane: RC.street,
    arterial: RC.arterial,
    motorway: RC.motorway,
    rail: RC.rail,
  };
  for (const route of routes) {
    const code = CLASS_CODE[route.kind];
    for (const [sx, sy] of sampleRoute(route, 0.3)) {
      const tx = Math.round(sx);
      const ty = Math.round(sy);
      if (!inb(tx, ty)) continue;
      const i = idx(tx, ty);
      if (code === RC.street) {
        const near = Math.abs(sx - tx) < 0.33 && Math.abs(sy - ty) < 0.33;
        const val = near ? RC.street : RC.streetTouch;
        if ((road[i] ?? 0) < val) road[i] = val;
      } else if ((road[i] ?? 0) < code) {
        road[i] = code;
      }
    }
  }

  // 8c) Enclosure: hedgerow lines divide the open countryside into fields
  // of honestly varied size — 3..9 tiles a pitch, lines that wander a
  // tile either way, whole stretches missing where fields were merged.
  // (Laid after the roads so no hedge grows through a carriageway.)
  const fieldCols: number[] = [];
  const fieldRows: number[] = [];
  {
    for (let x = 2 + rng.int(5); x < w; x += 3 + rng.int(7)) fieldCols.push(x);
    for (let y = 2 + rng.int(5); y < h; y += 3 + rng.int(7)) fieldRows.push(y);
    const hash2 = (a: number, b: number): number =>
      (Math.imul(a + 0x9e37, 2654435761) ^ Math.imul(b + 0x79b9, 97002721)) >>> 0;
    const open = (x: number, y: number): boolean =>
      inb(x, y) &&
      terrain[idx(x, y)] === TERRAIN.land &&
      zone[idx(x, y)] === ZONE.none &&
      (road[idx(x, y)] ?? 0) === 0 &&
      !inAirfield(x, y) &&
      !(x > 180 && Math.abs(y - riverCenterY(x)) < 9); // the marsh stays open
    fieldCols.forEach((bx, k) => {
      for (let y = 0; y < h; y++) {
        if (hash2(k, y >> 3) % 10 < 3) continue; // merged fields leave gaps
        const off = (hash2(k * 7 + 1, y >> 2) % 3) - 1; // the line wanders
        const x = bx + off;
        if (open(x, y) && rng.chance(0.62)) terrain[idx(x, y)] = TERRAIN.trees;
      }
    });
    fieldRows.forEach((by, k) => {
      for (let x = 0; x < w; x++) {
        if (hash2(k + 101, x >> 3) % 10 < 3) continue;
        const off = (hash2(k * 13 + 5, x >> 2) % 3) - 1;
        const y = by + off;
        if (open(x, y) && rng.chance(0.62)) terrain[idx(x, y)] = TERRAIN.trees;
      }
    });
  }
  /** Index of the enclosure a tile sits in (for coherent per-field tint). */
  const fieldCellOf = (x: number, y: number): number => {
    let cx = 0;
    while (cx < fieldCols.length && (fieldCols[cx] ?? w) <= x) cx++;
    let cy = 0;
    while (cy < fieldRows.length && (fieldRows[cy] ?? h) <= y) cy++;
    return (Math.imul(cx * 31 + 7, 2654435761) ^ Math.imul(cy * 17 + 3, 97002721)) >>> 0;
  };

  // 8d) High streets: shops flank the arterials through inhabited fabric
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = idx(x, y);
      const z = zone[i] as Zone;
      if (z !== ZONE.urban && z !== ZONE.suburb) continue;
      if ((road[i] ?? 0) >= RC.arterial) continue;
      const nearArterial =
        road[idx(x, y - 1)] === RC.arterial ||
        road[idx(x + 1, y)] === RC.arterial ||
        road[idx(x, y + 1)] === RC.arterial ||
        road[idx(x - 1, y)] === RC.arterial;
      if (nearArterial) flags[i] = (flags[i] ?? 0) | FLAG_SHOPS;
    }
  }

  // 9) Landmarks: the icons in their real places + civic kit per town
  const placeLandmark = (x: number, y: number, id: Landmark): void => {
    const xi = Math.round(x);
    const yi = Math.round(y);
    if (!inb(xi, yi)) return;
    for (let r = 0; r <= 3; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const tx = xi + dx;
          const ty = yi + dy;
          if (!inb(tx, ty)) continue;
          const i = idx(tx, ty);
          if (terrain[i] !== TERRAIN.land) continue;
          if ((landmark[i] ?? 0) !== 0) continue;
          if ((road[i] ?? 0) >= RC.arterial) continue;
          landmark[i] = id;
          if (road[i] === RC.street) road[i] = RC.streetTouch;
          for (let ny = -1; ny <= 1; ny++) {
            for (let nx = -1; nx <= 1; nx++) {
              if (!inb(tx + nx, ty + ny)) continue;
              const j = idx(tx + nx, ty + ny);
              if (zone[j] === ZONE.urbanCore || zone[j] === ZONE.cbd) zone[j] = ZONE.urban;
            }
          }
          return;
        }
      }
    }
  };

  /** Claim an exact w×h tile rectangle for a to-scale landmark: every
   *  tile is protected fabric + building exclusion. Land only; arterials
   *  refuse; streets beneath demote to a frontage touch. */
  const placeLandmarkRect = (x0: number, y0: number, rw: number, rh: number, id: Landmark): void => {
    for (let ty = y0; ty < y0 + rh; ty++) {
      for (let tx = x0; tx < x0 + rw; tx++) {
        if (!inb(tx, ty)) continue;
        const i = idx(tx, ty);
        if (terrain[i] !== TERRAIN.land) continue;
        if ((road[i] ?? 0) >= RC.arterial) continue;
        landmark[i] = id;
        if (road[i] === RC.street) road[i] = RC.streetTouch;
        for (let ny = -1; ny <= 1; ny++) {
          for (let nx = -1; nx <= 1; nx++) {
            if (!inb(tx + nx, ty + ny)) continue;
            const j = idx(tx + nx, ty + ny);
            if (zone[j] === ZONE.urbanCore || zone[j] === ZONE.cbd) zone[j] = ZONE.urban;
          }
        }
      }
    }
  };

  const riverY = (x: number): number => Math.round(riverCenterY(x));
  const hwAt = (x: number): number => riverHalfWidth(x);
  // Westminster: the Houses of Parliament take a full 3-long × 2-deep
  // river-front precinct on the north bank at the bend (each column
  // follows the bank, so the long face fronts the water beside the
  // Westminster bridge); the wheel watches from across the water
  for (let px = 107; px <= 109; px++) {
    const py = riverY(px) - Math.ceil(hwAt(px)) - 1;
    placeLandmarkRect(px, py - 1, 1, 2, LANDMARK.parliament);
  }
  placeLandmark(108, riverY(108) + Math.ceil(hwAt(108)) + 1, LANDMARK.eye);
  // the City: St Paul's takes a 2×2 close (a step back from the
  // embankment carriageway); the shard on the south bank; the fortress
  // + bridge
  placeLandmarkRect(114, 79, 2, 2, LANDMARK.dome);
  placeLandmark(118, riverY(118) + Math.ceil(hwAt(118)) + 1, LANDMARK.spire);
  {
    const bx = 120;
    placeLandmark(bx - 1, riverY(bx - 1) - Math.ceil(hwAt(bx - 1)) - 1, LANDMARK.fortress);
    const cy = riverCenterY(bx);
    const hw = riverHalfWidth(bx);
    for (let y = Math.floor(cy - hw - 1); y <= Math.ceil(cy + hw + 1); y++) {
      if (!inb(bx, y)) continue;
      const i = idx(bx, y);
      if (terrain[i] === TERRAIN.water) landmark[i] = LANDMARK.towerBridge;
    }
  }
  // Heathrow's terminal between its two runways (spur road laid with the
  // network above)
  placeLandmark(65, 87, LANDMARK.airport);
  // Battersea's four chimneys claim a 2×2 block on the south bank
  placeLandmarkRect(100, riverY(100) + Math.ceil(hwAt(100)) + 1, 2, 2, LANDMARK.powerstation);
  placeLandmark(132, 68, LANDMARK.stadium); // the Olympic bowl on the Lea
  placeLandmark(118, 58, LANDMARK.arena); // north London ground
  placeLandmark(106, 110, LANDMARK.arena); // south London ground
  placeLandmark(98, 74, LANDMARK.mall); // the western Westfield
  placeLandmark(133, 71, LANDMARK.mall); // the eastern one by the bowl
  placeLandmark(114, 65, LANDMARK.zoo); // in Regent's park
  placeLandmark(115, 65, LANDMARK.zoo);
  // central termini
  placeLandmark(114, 78, LANDMARK.station);
  placeLandmark(122, 76, LANDMARK.station);
  placeLandmark(122, 90, LANDMARK.station); // London Bridge, south bank
  // schools + the city hall through the boroughs
  for (const [sx, sy] of [[102, 70], [128, 64], [106, 102], [126, 94], [138, 78], [96, 88], [116, 108]] as const) {
    placeLandmark(sx, sy, LANDMARK.school);
  }
  placeLandmark(121, 92, LANDMARK.townhall);
  // the sewage works that serve the city, on the riverbanks east and west
  placeLandmark(152, 82, LANDMARK.sewage); // Beckton analog
  placeLandmark(162, 100, LANDMARK.sewage); // Crossness analog
  placeLandmark(78, 95, LANDMARK.sewage); // Mogden analog

  // every town seed gets its civic kit
  const railSamples: Array<[number, number]> = [];
  for (const route of routes) {
    if (route.kind === 'rail') railSamples.push(...sampleRoute(route, 0.5));
  }
  for (const t of TOWNS) {
    if (t.kind === 'town') {
      placeLandmark(t.x + rng.int(3) - 1, t.y + rng.int(3) - 1, LANDMARK.townhall);
      placeLandmark(t.x + rng.range(-t.r, t.r), t.y - t.r - rng.int(2), LANDMARK.school);
      placeLandmark(t.x - t.r, t.y + t.r, LANDMARK.carpark);
      placeLandmark(
        t.x + (rng.chance(0.5) ? 1 : -1) * (t.r * 2 + 1),
        t.y + rng.int(3) - 1,
        rng.chance(0.5) ? LANDMARK.watertower : LANDMARK.sewage,
      );
      let best: [number, number] | undefined;
      let bestD = 9;
      for (const [rx, ry] of railSamples) {
        const d = Math.hypot(rx - t.x, ry - t.y);
        if (d < bestD) {
          bestD = d;
          best = [rx, ry];
        }
      }
      if (best) placeLandmark((best[0] ?? t.x) + 1, best[1] ?? t.y, LANDMARK.station);
    } else {
      placeLandmark(t.x, t.y - 1, LANDMARK.church);
      if (rng.chance(0.3)) placeLandmark(t.x + 2, t.y + 2, LANDMARK.watertower);
    }
  }
  // 10) Customers, vegetation, sprite variants. Open countryside takes a
  // coherent per-field tint (one enclosure, one sward) so the patchwork
  // reads as real fields of varied size rather than per-tile noise.
  const LANDMARK_CUSTOMERS: Partial<Record<Landmark, number>> = {
    [LANDMARK.mall]: 40,
    [LANDMARK.stadium]: 12,
    [LANDMARK.arena]: 10,
    [LANDMARK.parliament]: 8,
    [LANDMARK.zoo]: 4,
    [LANDMARK.dome]: 4,
    [LANDMARK.spire]: 30,
    [LANDMARK.eye]: 4,
    [LANDMARK.fortress]: 4,
    [LANDMARK.station]: 8,
    [LANDMARK.school]: 6,
    [LANDMARK.townhall]: 6,
    [LANDMARK.church]: 2,
    [LANDMARK.datacentre]: 2,
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = idx(x, y);
      const z = zone[i] as Zone;
      const lm = landmark[i] as Landmark;
      if (lm !== LANDMARK.none) customers[i] = LANDMARK_CUSTOMERS[lm] ?? 0;
      else if ((road[i] ?? 0) >= RC.arterial) customers[i] = 0;
      else customers[i] = CUSTOMERS_PER_TILE[z];
      const t = terrain[i];
      if (t === TERRAIN.trees) vegetation[i] = 200 + rng.int(56);
      else if (z === ZONE.rural || z === ZONE.none)
        vegetation[i] = t === TERRAIN.land ? 90 + rng.int(70) : 30;
      else if (z === ZONE.suburb || z === ZONE.posh || z === ZONE.park) vegetation[i] = 60 + rng.int(60);
      else vegetation[i] = 10 + rng.int(30);
      if (z === ZONE.none && t === TERRAIN.land && !(x > 180 && Math.abs(y - riverCenterY(x)) < 9)) {
        const cell = fieldCellOf(x, y);
        variant[i] = rng.chance(0.15) ? rng.int(256) : cell % 256;
      } else {
        variant[i] = rng.int(256);
      }
    }
  }

  return {
    width: w,
    height: h,
    terrain,
    zone,
    council,
    road,
    routes,
    customers,
    vegetation,
    variant,
    landmark,
    flags,
    councils: COUNCIL_SEEDS.map(({ x: _x, y: _y, ...profile }) => profile),
  };
}

let cached: CityMap | undefined;

/** The map the CLIENT is currently playing. Historically always London;
 *  tutorial missions swap in their tiny maps via
 *  data/cityRegistry.setActiveScenario (which calls setClientMap). The
 *  function keeps its name so the renderer/ghost/hover call sites — and
 *  other lanes' code — follow the active scenario without edits. */
let clientMap: CityMap | undefined;

export function setClientMap(map: CityMap | undefined): void {
  clientMap = map;
}

export function getLondonMap(): CityMap {
  if (clientMap) return clientMap;
  cached ??= buildLondonMap();
  return cached;
}
