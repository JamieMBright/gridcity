// The ElectriCity main map: a stylized London → Essex region, authored as
// deterministic drawing code. The city is painted as rings around the
// Thames; everything beyond it grows from TOWN SEEDS the way real places
// do — a high street with shops at the seed, housing thinning with
// distance, a factory or industry that explains why the town exists, a
// school, the town hall, a station if the railway calls, and a Victorian
// water tower or sewage works on the edge. Transport is a VECTOR network:
// smooth meandering routes from 20 mph streets up to the orbital
// motorway, plus three railway lines — the tile raster only records what
// the routes pass over for gameplay rules. A seeded RNG adds organic
// jitter, identically every run.

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

// --- The Thames -----------------------------------------------------------

/** River centerline: gentle meander through the city, drifting to the estuary. */
export function riverCenterY(x: number): number {
  return 80 + 8 * Math.sin(x / 26) + 4 * Math.sin(x / 11 + 1.3);
}

/** River half-width: ~2 tiles in town, fanning out to a wide estuary mouth. */
export function riverHalfWidth(x: number): number {
  if (x < 150) return 1.8;
  const t = (x - 150) / (LONDON_W - 150);
  return 1.8 + 13.5 * t * t;
}

// --- Councils --------------------------------------------------------------

interface CouncilSeed extends CouncilProfile {
  x: number;
  y: number;
}

const COUNCIL_SEEDS: CouncilSeed[] = [
  { id: 0, x: 64, y: 72, name: 'City of Westhaven', affluence: 0.95, ambition: 0.85, blurb: 'Financial heart. Net-zero pledge with a budget to match.' },
  { id: 1, x: 50, y: 42, name: 'Northheath', affluence: 0.9, ambition: 0.45, blurb: 'Leafy and lovely. Resists pylons with great vigour.' },
  { id: 2, x: 37, y: 112, name: 'Riverdene', affluence: 0.85, ambition: 0.7, blurb: 'Riverside villas. Early adopters of anything shiny.' },
  { id: 3, x: 83, y: 55, name: 'Camford', affluence: 0.6, ambition: 0.8, blurb: 'Young, dense, impatient for EV charging on every street.' },
  { id: 4, x: 75, y: 95, name: 'Southwark Vale', affluence: 0.5, ambition: 0.6, blurb: 'Markets and terraces south of the river.' },
  { id: 5, x: 107, y: 78, name: 'Old Docks', affluence: 0.4, ambition: 0.7, blurb: 'Regenerating fast. Tower cranes on every block.' },
  { id: 6, x: 101, y: 38, name: 'Walford Marsh', affluence: 0.3, ambition: 0.35, blurb: 'Proud, practical, suspicious of consultants.' },
  { id: 7, x: 112, y: 120, name: 'Penge Hollow', affluence: 0.45, ambition: 0.4, blurb: 'Quiet suburbs that would rather not be disturbed.' },
  { id: 8, x: 149, y: 60, name: 'Eppingdale', affluence: 0.7, ambition: 0.55, blurb: 'Forest-edge commuter belt. Loves trees near your lines.' },
  { id: 9, x: 155, y: 105, name: 'Thurmead', affluence: 0.4, ambition: 0.5, blurb: 'Riverside industry and new-build estates.' },
  { id: 10, x: 124, y: 136, name: 'Croyfield', affluence: 0.55, ambition: 0.6, blurb: 'Trams, towers and ten thousand loft conversions.' },
  { id: 11, x: 200, y: 48, name: 'Greenmarsh', affluence: 0.5, ambition: 0.75, blurb: 'Glasshouse capital. Wants cheap power and lots of it.' },
  { id: 12, x: 197, y: 98, name: 'Witherly', affluence: 0.45, ambition: 0.25, blurb: 'Deep Essex. Electrification can wait for the cricket.' },
  { id: 13, x: 234, y: 55, name: 'Estuary Point', affluence: 0.35, ambition: 0.6, blurb: 'Salt wind and big skies. Home of the nuclear question.' },
  { id: 14, x: 236, y: 120, name: 'Shoebury Ness', affluence: 0.4, ambition: 0.45, blurb: 'End of the line. Cockles, caravans and a long pier.' },
];

// --- Town seeds --------------------------------------------------------------
// Each outer town exists for a reason: industry at the edge, a high street
// at the heart, civic kit in between. Villages are smaller echoes.

export interface TownSeed {
  x: number;
  y: number;
  /** Urban-core radius; suburbs reach ~2.2x this. */
  r: number;
  kind: 'town' | 'village';
}

export const TOWNS: TownSeed[] = [
  { x: 144, y: 58, r: 4, kind: 'town' }, // Eppingdale
  { x: 138, y: 100, r: 4, kind: 'town' }, // Thurmead
  { x: 154, y: 118, r: 3, kind: 'town' },
  { x: 165, y: 76, r: 3, kind: 'town' },
  { x: 148, y: 38, r: 3, kind: 'town' },
  { x: 120, y: 40, r: 2, kind: 'town' },
  { x: 118, y: 124, r: 3, kind: 'town' },
  { x: 180, y: 48, r: 2, kind: 'village' },
  { x: 194, y: 62, r: 2, kind: 'village' },
  { x: 208, y: 72, r: 2, kind: 'village' },
  { x: 222, y: 84, r: 2, kind: 'village' },
  { x: 188, y: 110, r: 2, kind: 'village' },
  { x: 206, y: 104, r: 2, kind: 'village' },
  { x: 226, y: 114, r: 2, kind: 'village' },
  { x: 238, y: 76, r: 2, kind: 'village' },
  { x: 174, y: 126, r: 2, kind: 'village' },
  { x: 216, y: 44, r: 2, kind: 'village' },
  { x: 244, y: 124, r: 2, kind: 'village' },
  { x: 170, y: 92, r: 2, kind: 'village' },
  { x: 232, y: 132, r: 2, kind: 'village' },
  { x: 158, y: 138, r: 2, kind: 'village' },
  { x: 240, y: 36, r: 2, kind: 'village' },
  { x: 186, y: 24, r: 2, kind: 'village' },
];

/** New-build estates: iDNO transformer in, every roof solar'd, waiting. */
export const NEW_ESTATES: Array<{ x: number; y: number; r: number }> = [
  { x: 152, y: 50, r: 3 },
  { x: 146, y: 108, r: 3 },
  { x: 124, y: 130, r: 3 },
];

/** Map flags bitmask (CityMap.flags). */
export const FLAG_SHOPS = 1;

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

  // 1) Thames + estuary
  for (let x = 0; x < w; x++) {
    const cy = riverCenterY(x);
    const hw = riverHalfWidth(x);
    for (let y = Math.floor(cy - hw - 1); y <= Math.ceil(cy + hw + 1); y++) {
      const d = Math.abs(y - cy);
      if (d <= hw || (d <= hw + 0.9 && rng.chance(0.4))) setTerrain(x, y, TERRAIN.water);
    }
  }
  for (let x = 198; x < w; x++) {
    const cy = Math.round(36 + 5 * Math.sin(x / 8));
    setTerrain(x, cy, TERRAIN.water);
    setTerrain(x, cy + 1, TERRAIN.water);
    if (rng.chance(0.3)) setTerrain(x, cy + 2, TERRAIN.water);
  }

  // 2) Hills: northern ridge and southern downs
  for (let x = 0; x < w; x++) {
    const ridgeN = 5 + 4 * Math.sin(x / 16) + rng.range(0, 2);
    const ridgeS = h - 6 - 4 * Math.sin(x / 21) - rng.range(0, 2);
    for (let y = 0; y < h; y++) {
      if (y < ridgeN || y > ridgeS) {
        if (isLand(x, y)) terrain[idx(x, y)] = TERRAIN.hill;
      }
    }
  }

  // 3) Forests
  forestBlob(140, 22, 11);
  forestBlob(156, 17, 8);
  forestBlob(128, 30, 7);
  forestBlob(26, 18, 6);
  forestBlob(184, 130, 8);
  forestBlob(84, 140, 6);
  forestBlob(214, 120, 5);
  forestBlob(60, 22, 5);

  // 4) London proper: painted rings (the megacity IS the biggest seed)
  zoneRect(22, 30, 126, 134, ZONE.suburb, 5);
  zoneRect(34, 50, 104, 116, ZONE.urban, 4);
  zoneRect(46, 60, 90, 100, ZONE.urbanCore, 2);
  zoneRect(60, 66, 70, 74, ZONE.cbd, 1);
  zoneRect(92, 82, 99, 88, ZONE.cbd, 1);
  zoneRect(38, 34, 62, 50, ZONE.posh, 2);
  zoneRect(26, 102, 50, 124, ZONE.posh, 2);
  zoneRect(100, 70, 124, 88, ZONE.industrial, 2);
  zoneRect(184, 82, 198, 92, ZONE.industrial, 2);

  // 5) Towns and villages grow radially from their seeds
  for (const t of TOWNS) {
    if (t.kind === 'town') {
      zoneBlob(t.x, t.y, t.r * 2.2, ZONE.suburb);
      zoneBlob(t.x, t.y, t.r, ZONE.urban); // the dense heart around the high street
      // the industry that explains the town: a small estate on the edge
      const a = rng.range(0, Math.PI * 2);
      zoneBlob(t.x + Math.cos(a) * t.r * 2.4, t.y + Math.sin(a) * t.r * 2.4, 2, ZONE.industrial);
    } else {
      zoneBlob(t.x, t.y, t.r, ZONE.rural);
    }
  }
  for (const e of NEW_ESTATES) zoneBlob(e.x, e.y, e.r, ZONE.newEstate);

  // glasshouses, pre-sited generation, parks (unchanged geography)
  zoneRect(198, 48, 214, 58, ZONE.greenhouse, 1);
  zoneRect(205, 28, 217, 36, ZONE.greenhouse, 1);
  zoneRect(172, 64, 182, 70, ZONE.solarSite);
  zoneRect(200, 88, 210, 94, ZONE.solarSite);
  zoneRect(228, 98, 238, 104, ZONE.solarSite);
  zoneRect(180, 36, 188, 41, ZONE.solarSite);
  zoneRect(162, 130, 170, 135, ZONE.solarSite);
  zoneRect(224, 58, 238, 65, ZONE.nuclearSite);
  for (let y = 68; y <= 102; y++) {
    for (let x = 244; x < w; x++) {
      if (isWater(x, y)) zone[idx(x, y)] = ZONE.windSite;
    }
  }
  zoneRect(50, 38, 62, 50, ZONE.park);
  zoneRect(42, 64, 52, 72, ZONE.park);
  zoneRect(86, 110, 96, 120, ZONE.park);
  zoneRect(70, 46, 76, 52, ZONE.park);

  // 6) Councils: nearest-seed Voronoi over land
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

  // 7) The vector transport network ------------------------------------------

  /** Subdivide waypoints with a perpendicular sine wander (ends pinned)
   *  so the rendered curve meanders like a real road. */
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

  // Orbital motorway ringing the city
  {
    const pts: Array<[number, number]> = [];
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      pts.push([76 + Math.cos(a) * 60 + rng.range(-1.5, 1.5), 82 + Math.sin(a) * 56 + rng.range(-1.5, 1.5)]);
    }
    const first = pts[0];
    if (first) pts.push([first[0], first[1]]); // closed loop
    addRoute('motorway', pts);
  }

  // Riverside arterials hugging each bank
  {
    const north: Array<[number, number]> = [];
    const south: Array<[number, number]> = [];
    for (let x = 8; x <= 242; x += 8) {
      const cy = riverCenterY(x);
      const hw = riverHalfWidth(x);
      north.push([x, cy - hw - 3 + rng.range(-0.6, 0.6)]);
      if (x < 190) south.push([x, cy + hw + 3 + rng.range(-0.6, 0.6)]);
    }
    addRoute('arterial', north);
    addRoute('arterial', south);
  }

  // City radials and the cross-country A-roads (high streets ride these)
  addRoute('arterial', [[66, 78], [60, 50], [50, 24], [40, 8]], 1.5);
  addRoute('arterial', [[66, 78], [78, 48], [90, 26], [98, 8]], 1.5);
  addRoute('arterial', [[66, 80], [56, 100], [44, 124], [34, 150]], 1.5);
  addRoute('arterial', [[68, 80], [84, 104], [98, 128], [108, 152]], 1.5);
  addRoute('arterial', [[66, 78], [44, 70], [20, 64]], 1.5);
  addRoute('arterial', [[68, 78], [96, 60], [120, 42], [148, 38]], 1.8);
  addRoute('arterial', [[68, 82], [98, 92], [120, 100], [138, 100]], 1.8);
  addRoute('arterial', [[120, 40], [144, 58], [165, 76], [180, 48], [216, 44], [240, 36]], 2.2);
  addRoute('arterial', [[138, 100], [154, 118], [174, 126], [188, 110], [206, 104], [226, 114], [244, 124]], 2.2);
  // country lanes chaining the villages
  addRoute('lane', [[165, 76], [170, 92], [188, 110]], 1.8);
  addRoute('lane', [[180, 48], [194, 62], [208, 72], [222, 84], [238, 76]], 2);
  addRoute('lane', [[148, 38], [186, 24], [216, 44]], 2);
  addRoute('lane', [[154, 118], [158, 138], [174, 126]], 1.6);
  addRoute('lane', [[208, 72], [206, 104]], 1.6);
  addRoute('lane', [[222, 84], [232, 132], [244, 124]], 1.8);

  // Railways: three lines out of the city, stations along the way
  const RAILS: Array<Array<[number, number]>> = [
    [[62, 76], [96, 56], [120, 40], [144, 58], [148, 38], [200, 48], [240, 36]],
    [[70, 84], [98, 90], [124, 94], [138, 100], [165, 76], [208, 72], [236, 60]],
    [[64, 86], [84, 106], [104, 118], [118, 124], [154, 118], [174, 126]],
  ];
  for (const line of RAILS) addRoute('rail', line, 1.2);

  // Local streets: orthogonal-ish grids with a soft jitter, only where
  // people live. Routes (not tiles) — short polylines per block row/col.
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
    // horizontal streets
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
    // vertical streets (cranked per band so nothing runs forever)
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

  // 7b) Stamp routes onto the gameplay raster
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
        // near the centre: carriageway through the plot; clipping a
        // corner leaves the houses fronting the street
        const near = Math.abs(sx - tx) < 0.33 && Math.abs(sy - ty) < 0.33;
        const val = near ? RC.street : RC.streetTouch;
        if ((road[i] ?? 0) < val) road[i] = val;
      } else if ((road[i] ?? 0) < code) {
        road[i] = code;
      }
    }
  }

  // 7c) High streets: shops flank the arterials through inhabited fabric
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

  // 8) Landmarks: the city icons + civic kit for every town seed
  const placeLandmark = (x: number, y: number, id: Landmark): void => {
    const xi = Math.round(x);
    const yi = Math.round(y);
    if (!inb(xi, yi)) return;
    // slide to the nearest clear land tile
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
          // breathing room: no tower blocks crowding right up against an icon
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
  placeLandmark(58, riverY(58) - Math.ceil(hwAt(58)) - 1, LANDMARK.parliament);
  placeLandmark(60, riverY(60) + Math.ceil(hwAt(60)) + 1, LANDMARK.eye);
  placeLandmark(65, 68, LANDMARK.dome);
  placeLandmark(76, riverY(76) + Math.ceil(hwAt(76)) + 2, LANDMARK.spire);
  {
    const bx = 82;
    placeLandmark(bx - 1, riverY(bx - 1) - Math.ceil(hwAt(bx - 1)) - 1, LANDMARK.fortress);
    const cy = riverCenterY(bx);
    const hw = riverHalfWidth(bx);
    for (let y = Math.floor(cy - hw - 1); y <= Math.ceil(cy + hw + 1); y++) {
      if (!inb(bx, y)) continue;
      const i = idx(bx, y);
      if (terrain[i] === TERRAIN.water) landmark[i] = LANDMARK.towerBridge;
    }
    // the bridge carries a street over the river
    addRoute('street', [[bx, cy - hw - 2], [bx, cy + hw + 2]]);
  }
  placeLandmark(112, 52, LANDMARK.stadium);
  placeLandmark(70, 38, LANDMARK.arena);
  placeLandmark(98, 124, LANDMARK.arena);
  placeLandmark(40, 78, LANDMARK.mall);
  placeLandmark(118, 96, LANDMARK.mall);
  placeLandmark(55, 43, LANDMARK.zoo);
  placeLandmark(56, 43, LANDMARK.zoo);
  placeLandmark(48, riverY(48) + Math.ceil(hwAt(48)) + 1, LANDMARK.powerstation);
  // city terminus stations where the railways set off
  placeLandmark(62, 76, LANDMARK.station);
  placeLandmark(70, 84, LANDMARK.station);
  placeLandmark(64, 86, LANDMARK.station);
  // a handful of London schools and town halls through the rings
  for (const [sx, sy] of [[44, 56], [80, 64], [58, 108], [96, 102], [110, 60], [88, 40]] as const) {
    placeLandmark(sx, sy, LANDMARK.school);
  }
  placeLandmark(72, 90, LANDMARK.townhall);

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
      // a station if the railway calls at this town
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

  // 9) Customers, vegetation, sprite variants
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
