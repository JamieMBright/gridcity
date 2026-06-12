// The ElectriCity main map: LONDON, drawn from its real geography. The
// Thames follows its true shape — the Richmond meanders, the Westminster
// bend, the deep Isle of Dogs loop, then the widening estuary. The city
// itself is no painted rectangle: an organic density field falls away
// from the centre, ribboning outward along the real radial roads (A1,
// A10, A12, A13, A2, A23, A3, A4, A40, the A41) inside the North/South
// Circular ring and the M25 — so housing hangs off the road network the
// way the real city does, and countryside opens on every side for
// generation. Beyond the green belt, satellite towns (Watford, St
// Albans, Harlow, Brentwood, Southend, Sevenoaks, Guildford, Slough…)
// grow from seeds with high streets, industry and civic kit. All shapes
// are deterministic; a seeded RNG adds organic jitter, identically
// every run.

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
// Control points west→east: Runnymede in, the Richmond/Kew meanders, up
// through Putney to the Westminster bend, the City reach, then the deep
// southward loop around the Isle of Dogs, Greenwich, and out through the
// widening estuary.

const RIVER_PTS: Array<[number, number]> = [
  [0, 126],
  [16, 122],
  [30, 118],
  [42, 110],
  [50, 112],
  [58, 106],
  [66, 104],
  [72, 97],
  [80, 94],
  [86, 90],   // Westminster bend
  [92, 87],
  [98, 88],   // the City reach
  [103, 93],
  [107, 99],  // around the Isle of Dogs
  [111, 95],
  [116, 88],  // Greenwich back north
  [124, 85],
  [134, 83],
  [148, 81],
  [164, 79],
  [184, 78],
  [208, 79],
  [232, 82],
  [255, 84],
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

/** River half-width: a narrow upper river, broadening through town, then
 *  fanning out into the estuary east of Gravesend. */
export function riverHalfWidth(x: number): number {
  if (x < 60) return 1.1;
  if (x < 170) return 1.1 + 0.9 * ((x - 60) / 110);
  const t = (x - 170) / (LONDON_W - 170);
  return 2 + 13 * t * t;
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
  { id: 5, x: 136, y: 84, name: 'Old Docks', affluence: 0.4, ambition: 0.7, blurb: 'Regenerating fast. Tower cranes on every block.' },
  { id: 6, x: 134, y: 70, name: 'Walford Marsh', affluence: 0.3, ambition: 0.35, blurb: 'Proud, practical, suspicious of consultants.' },
  { id: 7, x: 116, y: 116, name: 'Penge Hollow', affluence: 0.45, ambition: 0.4, blurb: 'Quiet suburbs that would rather not be disturbed.' },
  { id: 8, x: 94, y: 74, name: 'Westgate', affluence: 0.7, ambition: 0.6, blurb: 'Stucco terraces and embassy lawns.' },
  { id: 9, x: 72, y: 50, name: 'Watfordshire', affluence: 0.6, ambition: 0.5, blurb: 'Commuter belt with opinions about train times.' },
  { id: 10, x: 160, y: 40, name: 'Harlow Reach', affluence: 0.5, ambition: 0.65, blurb: 'New town, newer ambitions.' },
  { id: 11, x: 196, y: 52, name: 'Greenmarsh', affluence: 0.5, ambition: 0.75, blurb: 'Glasshouse capital. Wants cheap power and lots of it.' },
  { id: 12, x: 190, y: 110, name: 'Witherly', affluence: 0.45, ambition: 0.25, blurb: 'Deep countryside. Electrification can wait for the cricket.' },
  { id: 13, x: 232, y: 64, name: 'Estuary Point', affluence: 0.35, ambition: 0.6, blurb: 'Salt wind and big skies. Home of the nuclear question.' },
  { id: 14, x: 234, y: 96, name: 'Southend Ness', affluence: 0.4, ambition: 0.45, blurb: 'End of the line. Cockles, caravans and a long pier.' },
];

// --- Town seeds --------------------------------------------------------------
// Satellite towns beyond the green belt, on every side of the city.

export interface TownSeed {
  x: number;
  y: number;
  /** Urban-core radius; suburbs reach ~2.2x this. */
  r: number;
  kind: 'town' | 'village';
}

export const TOWNS: TownSeed[] = [
  { x: 64, y: 42, r: 3, kind: 'town' }, // Watford
  { x: 98, y: 22, r: 3, kind: 'town' }, // St Albans
  { x: 162, y: 26, r: 3, kind: 'town' }, // Harlow
  { x: 184, y: 52, r: 3, kind: 'town' }, // Brentwood
  { x: 208, y: 40, r: 3, kind: 'town' }, // Chelmsford
  { x: 236, y: 92, r: 3, kind: 'town' }, // Southend
  { x: 162, y: 136, r: 3, kind: 'town' }, // Sevenoaks
  { x: 52, y: 132, r: 3, kind: 'town' }, // Guildford
  { x: 34, y: 70, r: 3, kind: 'town' }, // Slough
  { x: 160, y: 102, r: 2, kind: 'town' }, // Dartford
  { x: 36, y: 28, r: 2, kind: 'village' },
  { x: 78, y: 16, r: 2, kind: 'village' },
  { x: 130, y: 14, r: 2, kind: 'village' },
  { x: 188, y: 22, r: 2, kind: 'village' },
  { x: 232, y: 30, r: 2, kind: 'village' },
  { x: 200, y: 66, r: 2, kind: 'village' },
  { x: 222, y: 110, r: 2, kind: 'village' },
  { x: 196, y: 128, r: 2, kind: 'village' },
  { x: 132, y: 146, r: 2, kind: 'village' },
  { x: 92, y: 142, r: 2, kind: 'village' },
  { x: 24, y: 104, r: 2, kind: 'village' },
  { x: 18, y: 46, r: 2, kind: 'village' },
  { x: 246, y: 56, r: 2, kind: 'village' },
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
  { x: 122, y: 86, name: 'London Bridge' },
  { x: 64, y: 84, name: 'Heathrow' },
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
  { gen: 'gasPeaker', x: 134, y: 44 }, // Enfield analog up the Lea
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

  const forestBlob = (cx: number, cy: number, r: number): void => {
    for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) {
      for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
        if (!isLand(x, y)) continue;
        const d = Math.hypot(x - cx, y - cy);
        if (d <= r - 1 || (d <= r + 1 && rng.chance(0.5))) terrain[idx(x, y)] = TERRAIN.trees;
      }
    }
  };

  // 1) The Thames + the Essex creek
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

  // 1b) Tributaries: the Lea down from the north, the Wey/Mole up from
  // the Surrey hills, the Colne in the west — thin winding water
  const TRIBUTARIES: Array<Array<[number, number]>> = [
    [[134, 14], [132, 30], [134, 46], [130, 62], [127, 74], [125, riverCenterY(125) - 1]], // Lea
    [[98, 154], [102, 136], [100, 120], [102, 106], [101, riverCenterY(101) + 2]], // Wey/Mole
    [[52, 18], [48, 38], [44, 60], [42, 84], [42, riverCenterY(42) - 1]], // Colne
  ];
  for (const trib of TRIBUTARIES) {
    for (const [sx, sy] of sampleRoute({ kind: 'lane', pts: trib }, 0.4)) {
      const tx = Math.round(sx + rng.range(-0.3, 0.3));
      const ty = Math.round(sy);
      setTerrain(tx, ty, TERRAIN.water);
      if (rng.chance(0.35)) setTerrain(tx + 1, ty, TERRAIN.water);
    }
  }
  // reservoir chains: along the Lea valley and out west by the Colne
  for (const [cx, cy, r] of [
    [136, 38, 2.2],
    [135, 46, 2.6],
    [138, 54, 2],
    [38, 92, 2.8],
    [44, 88, 2],
    [206, 116, 2.2],
  ] as const) {
    for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) {
      for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d <= r || (d <= r + 0.8 && rng.chance(0.4))) setTerrain(x, y, TERRAIN.water);
      }
    }
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

  // 3) Forests: Epping NE of the city, woods scattered through the belt
  forestBlob(148, 50, 8); // Epping
  forestBlob(156, 38, 6);
  forestBlob(40, 32, 6);
  forestBlob(46, 118, 7);
  forestBlob(182, 128, 7);
  forestBlob(216, 122, 5);
  forestBlob(76, 130, 5);
  forestBlob(24, 84, 5);

  // 4) The radial skeleton (real bearings) — defined BEFORE the density
  // field so housing can ribbon along it the way real London does.
  const RADIALS: Array<{ pts: Array<[number, number]>; amp: number }> = [
    { pts: [[118, 70], [112, 46], [104, 32], [98, 22], [92, 4]], amp: 1.4 }, // A1 north
    { pts: [[121, 70], [130, 44], [136, 28], [140, 8]], amp: 1.4 }, // A10
    { pts: [[124, 73], [142, 56], [162, 26]], amp: 1.6 }, // A12 → Harlow
    { pts: [[128, 76], [152, 60], [184, 52], [208, 40], [244, 30]], amp: 1.8 }, // A12/A130 → Brentwood, Chelmsford
    { pts: [[128, 82], [150, 76], [176, 72], [206, 72], [240, 74]], amp: 1.4 }, // A13 along the estuary
    { pts: [[122, 88], [142, 98], [160, 102], [192, 118], [226, 134]], amp: 1.6 }, // A2 → Dartford, Kent
    { pts: [[116, 90], [112, 112], [106, 130], [100, 156]], amp: 1.4 }, // A23 south
    { pts: [[112, 88], [94, 106], [72, 122], [52, 132], [38, 148]], amp: 1.6 }, // A3 → Guildford
    { pts: [[108, 82], [84, 84], [58, 78], [34, 70], [8, 66]], amp: 1.4 }, // A4 → Slough
    { pts: [[110, 76], [88, 64], [62, 52], [36, 44]], amp: 1.5 }, // A40 west-northwest
    { pts: [[112, 72], [98, 56], [78, 46], [64, 42], [44, 24]], amp: 1.5 }, // A41/M1 → Watford
    { pts: [[120, 86], [134, 96], [148, 108], [162, 136]], amp: 1.6 }, // A21 → Sevenoaks
  ];

  // 5) The city: an organic density field around the centre, boosted
  // along the radials, eaten by noise at the edges — no straight lines.
  {
    // corridor boost raster from radial samples
    const boost = new Float32Array(n);
    for (const r of RADIALS) {
      for (const [sx, sy] of sampleRoute({ kind: 'arterial', pts: r.pts }, 0.5)) {
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

  // the two skyscraper districts: the Square Mile and the Docklands wharf
  zoneBlob(116, 77, 3.4, ZONE.cbd);
  zoneBlob(107, 95, 2.4, ZONE.cbd); // on the Isle of Dogs loop
  // conservation quarters: Mayfair beside the park, the heath NW, the
  // river bend SW
  zoneBlob(107, 77, 2.6, ZONE.posh);
  zoneBlob(103, 63, 4.5, ZONE.posh);
  zoneBlob(82, 100, 4.5, ZONE.posh);
  // industry: the east-river corridors + the western works
  zoneRect(134, 74, 152, 80, ZONE.industrial, 2);
  zoneRect(138, 86, 154, 92, ZONE.industrial, 2);
  zoneBlob(94, 70, 3, ZONE.industrial);
  zoneRect(186, 62, 198, 70, ZONE.industrial, 2);

  // 5b) Copses: small woods scattered through the open countryside so the
  // belt reads as enclosed English farmland, not a snooker table
  for (let attempt = 0; attempt < 90; attempt++) {
    const cx = 4 + rng.int(w - 8);
    const cy = 6 + rng.int(h - 12);
    if (zone[idx(cx, cy)] !== ZONE.none) continue;
    if (!isLand(cx, cy)) continue;
    forestBlob(cx, cy, 1 + rng.int(2));
  }

  // 6) Satellite towns and villages beyond the belt
  for (const t of TOWNS) {
    if (t.kind === 'town') {
      zoneBlob(t.x, t.y, t.r * 2.2, ZONE.suburb);
      zoneBlob(t.x, t.y, t.r, ZONE.urban);
      const a = rng.range(0, Math.PI * 2);
      zoneBlob(t.x + Math.cos(a) * t.r * 2.4, t.y + Math.sin(a) * t.r * 2.4, 2, ZONE.industrial);
    } else {
      zoneBlob(t.x, t.y, t.r, ZONE.rural);
    }
  }
  for (const e of NEW_ESTATES) zoneBlob(e.x, e.y, e.r, ZONE.newEstate);

  // glasshouses (the Lea Valley NNE + Essex), pre-sited generation
  zoneRect(132, 30, 142, 40, ZONE.greenhouse, 1);
  zoneRect(204, 46, 216, 54, ZONE.greenhouse, 1);
  zoneRect(38, 96, 48, 102, ZONE.solarSite);
  zoneRect(72, 26, 82, 31, ZONE.solarSite);
  zoneRect(190, 86, 200, 92, ZONE.solarSite);
  zoneRect(214, 104, 224, 110, ZONE.solarSite);
  zoneRect(58, 142, 68, 148, ZONE.solarSite);
  zoneRect(172, 116, 180, 121, ZONE.solarSite);
  zoneRect(226, 58, 240, 66, ZONE.nuclearSite);
  for (let y = 64; y <= 104; y++) {
    for (let x = 244; x < w; x++) {
      if (isWater(x, y)) zone[idx(x, y)] = ZONE.windSite;
    }
  }
  // royal parks + the great commons
  zoneRect(108, 73, 115, 78, ZONE.park); // Hyde
  zoneRect(112, 64, 118, 69, ZONE.park); // Regent's
  zoneRect(99, 56, 107, 61, ZONE.park); // the heath
  zoneRect(78, 108, 88, 116, ZONE.park); // Richmond park
  zoneRect(124, 71, 130, 75, ZONE.park); // Victoria park
  zoneRect(110, 99, 116, 103, ZONE.park); // Greenwich park
  zoneRect(126, 108, 132, 113, ZONE.park);

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

  const wander = (pts: Array<[number, number]>, amp: number): Array<[number, number]> => {
    const out: Array<[number, number]> = [];
    for (let s = 0; s + 1 < pts.length; s++) {
      const [ax, ay] = pts[s] ?? [0, 0];
      const [bx, by] = pts[s + 1] ?? [0, 0];
      const dx = bx - ax;
      const dy = by - ay;
      const len = Math.max(1, Math.hypot(dx, dy));
      const px = -dy / len;
      const py = dx / len;
      const phase = rng.range(0, Math.PI * 2);
      const freq = rng.range(1.2, 2.4);
      const pieces = Math.max(1, Math.round(len / 6));
      for (let k = 0; k < pieces; k++) {
        const t = k / pieces;
        const off =
          Math.sin(phase + t * Math.PI * 2 * freq) * amp * Math.sin(Math.PI * t) +
          (k > 0 ? rng.range(-0.5, 0.5) : 0);
        out.push([ax + dx * t + px * off, ay + dy * t + py * off]);
      }
    }
    const last = pts[pts.length - 1];
    if (last) out.push(last);
    return out;
  };

  const addRoute = (kind: TransportRoute['kind'], pts: Array<[number, number]>, amp = 0): void => {
    routes.push({ kind, pts: amp > 0 ? wander(pts, amp) : pts });
  };

  // the M25, ringing the whole city
  {
    const pts: Array<[number, number]> = [];
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      pts.push([
        CENTRE.x + Math.cos(a) * 55 + rng.range(-1.5, 1.5),
        CENTRE.y + Math.sin(a) * 47 + rng.range(-1.5, 1.5),
      ]);
    }
    const first = pts[0];
    if (first) pts.push([first[0], first[1]]);
    addRoute('motorway', pts);
  }
  // the North + South Circulars: the inner ring road
  {
    const pts: Array<[number, number]> = [];
    for (let i = 0; i <= 30; i++) {
      const a = (i / 30) * Math.PI * 2;
      pts.push([
        CENTRE.x + Math.cos(a) * 25 + rng.range(-1, 1),
        CENTRE.y + Math.sin(a) * 20 + rng.range(-1, 1),
      ]);
    }
    addRoute('arterial', pts);
  }
  // embankment arterials hugging each bank through town
  {
    const north: Array<[number, number]> = [];
    const south: Array<[number, number]> = [];
    for (let x = 64; x <= 240; x += 7) {
      const cy = riverCenterY(x);
      const hw = riverHalfWidth(x);
      north.push([x, cy - hw - 2.5 + rng.range(-0.5, 0.5)]);
      if (x < 176) south.push([x, cy + hw + 2.5 + rng.range(-0.5, 0.5)]);
    }
    addRoute('arterial', north);
    addRoute('arterial', south);
  }
  // the radials themselves
  for (const r of RADIALS) addRoute('arterial', r.pts, r.amp);
  // country lanes chaining the villages
  addRoute('lane', [[36, 28], [18, 46], [24, 104], [52, 132]], 2);
  addRoute('lane', [[78, 16], [98, 22], [130, 14], [188, 22], [232, 30]], 2);
  addRoute('lane', [[200, 66], [222, 110], [196, 128], [162, 136]], 2);
  addRoute('lane', [[92, 142], [132, 146], [162, 136]], 1.8);
  addRoute('lane', [[208, 40], [246, 56], [236, 92]], 2);
  addRoute('lane', [[160, 102], [196, 128]], 1.8);

  // railways: four lines out of the central termini
  const RAILS: Array<Array<[number, number]>> = [
    [[114, 78], [98, 58], [78, 46], [64, 42], [42, 26]], // NW → Watford
    [[122, 76], [142, 56], [162, 26]], // NE → Harlow
    [[124, 80], [152, 62], [184, 52], [208, 40], [246, 34]], // E → Chelmsford
    [[122, 86], [144, 96], [160, 102], [200, 92], [236, 92]], // estuary → Southend
    [[114, 86], [108, 112], [122, 126], [162, 136]], // S → Sevenoaks
  ];
  for (const line of RAILS) addRoute('rail', line, 1.2);

  // local streets: orthogonal-ish grids with a soft jitter, where people live
  {
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
    const pitchOf = (x: number, y: number): number => {
      const z = zone[idx(x, y)] as Zone;
      if (z === ZONE.newEstate) return 4;
      return z === ZONE.urbanCore || z === ZONE.cbd || z === ZONE.urban ? 6 : 8;
    };
    for (let y = 2; y < h - 2; y++) {
      let runStart = -1;
      for (let x = 0; x <= w; x++) {
        const onGrid = x < w && inhabited(x, y) && y % pitchOf(x, y) === 0;
        if (onGrid && runStart < 0) runStart = x;
        if (!onGrid && runStart >= 0) {
          if (x - runStart >= 4) {
            addRoute('street', [
              [runStart, y],
              [(runStart + x - 1) / 2, y + rng.range(-0.7, 0.7)],
              [x - 1, y],
            ]);
          }
          runStart = -1;
        }
      }
    }
    for (let x = 2; x < w - 2; x++) {
      let runStart = -1;
      for (let y = 0; y <= h; y++) {
        const p = y < h && inhabited(x, y) ? pitchOf(x, y) : 8;
        const crank = (Math.floor(y / p) % 2) * Math.floor(p / 2);
        const onGrid = y < h && inhabited(x, y) && (x + crank) % p === 0;
        if (onGrid && runStart < 0) runStart = y;
        if (!onGrid && runStart >= 0) {
          if (y - runStart >= 4) {
            addRoute('street', [
              [x, runStart],
              [x + rng.range(-0.7, 0.7), (runStart + y - 1) / 2],
              [x, y - 1],
            ]);
          }
          runStart = -1;
        }
      }
    }
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

  // 8c) High streets: shops flank the arterials through inhabited fabric
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

  const riverY = (x: number): number => Math.round(riverCenterY(x));
  const hwAt = (x: number): number => riverHalfWidth(x);
  // Westminster: parliament on the north bank, the wheel across the water
  placeLandmark(86, riverY(86) - Math.ceil(hwAt(86)) - 1, LANDMARK.parliament);
  placeLandmark(87, riverY(87) + Math.ceil(hwAt(87)) + 1, LANDMARK.eye);
  // the City: the dome; the shard on the south bank; the fortress + bridge
  placeLandmark(113, 78, LANDMARK.dome);
  placeLandmark(116, riverY(116) + Math.ceil(hwAt(116)) + 1, LANDMARK.spire);
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
    addRoute('street', [[bx, cy - hw - 2], [bx, cy + hw + 2]]);
  }
  // the central bridges: Westminster, Waterloo, Blackfriars, London
  for (const bx of [86, 92, 98, 114]) {
    const cy = riverCenterY(bx);
    const hw = riverHalfWidth(bx);
    addRoute('street', [[bx, cy - hw - 2], [bx, cy + hw + 2]]);
  }
  // Heathrow in the west: a runway cut into the fields + the terminal
  {
    for (let x = 58; x <= 70; x++) {
      for (let y = 86; y <= 87; y++) {
        if (!inb(x, y) || !isLand(x, y)) continue;
        const i = idx(x, y);
        zone[i] = ZONE.none;
        flags[i] = (flags[i] ?? 0) | FLAG_RUNWAY;
      }
    }
    placeLandmark(64, 84, LANDMARK.airport);
    addRoute('street', [[72, 84], [78, 84]]); // the airport spur
  }
  // Battersea's four chimneys on the south bank, west of the centre
  placeLandmark(100, riverY(100) + Math.ceil(hwAt(100)) + 1, LANDMARK.powerstation);
  placeLandmark(132, 68, LANDMARK.stadium); // the Olympic bowl, Stratford
  placeLandmark(118, 58, LANDMARK.arena); // north London ground
  placeLandmark(106, 110, LANDMARK.arena); // south London ground
  placeLandmark(98, 74, LANDMARK.mall); // the western Westfield
  placeLandmark(133, 71, LANDMARK.mall); // the eastern one by the bowl
  placeLandmark(114, 65, LANDMARK.zoo); // in Regent's park
  placeLandmark(115, 65, LANDMARK.zoo);
  // central termini
  placeLandmark(114, 78, LANDMARK.station);
  placeLandmark(122, 76, LANDMARK.station);
  placeLandmark(122, 86, LANDMARK.station);
  // schools + the city hall through the boroughs
  for (const [sx, sy] of [[102, 70], [128, 64], [108, 94], [126, 92], [138, 80], [96, 86], [116, 108]] as const) {
    placeLandmark(sx, sy, LANDMARK.school);
  }
  placeLandmark(121, 90, LANDMARK.townhall);

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

  // 10) Customers, vegetation, sprite variants
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
  for (let i = 0; i < n; i++) {
    const z = zone[i] as Zone;
    const lm = landmark[i] as Landmark;
    if (lm !== LANDMARK.none) customers[i] = LANDMARK_CUSTOMERS[lm] ?? 0;
    else if ((road[i] ?? 0) >= RC.arterial) customers[i] = 0;
    else customers[i] = CUSTOMERS_PER_TILE[z];
    const t = terrain[i];
    if (t === TERRAIN.trees) vegetation[i] = 200 + rng.int(56);
    else if (z === ZONE.rural || z === ZONE.none) vegetation[i] = t === TERRAIN.land ? 90 + rng.int(70) : 30;
    else if (z === ZONE.suburb || z === ZONE.posh || z === ZONE.park) vegetation[i] = 60 + rng.int(60);
    else vegetation[i] = 10 + rng.int(30);
    variant[i] = rng.int(256);
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

export function getLondonMap(): CityMap {
  cached ??= buildLondonMap();
  return cached;
}
