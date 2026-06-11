// The ElectriCity main map: a stylized London → Essex region, authored as
// deterministic drawing code. West is the dense city around the meandering
// Thames; the east opens into rural Essex with solar fields, glasshouses
// and the region's only nuclear-capable coastal site. Roads wander the way
// real ones do — an orbital motorway, meandering radials and lanes, plus
// staggered local grids — and the skyline gets its landmarks: the clock
// tower and the wheel, the dome and the shard, the Olympic bowl, malls,
// the zoo in the big park, and the old four-chimney power station.
// All shapes are hand-placed; a seeded RNG adds organic jitter so edges
// aren't ruler-straight, identically every run.

import {
  CUSTOMERS_PER_TILE,
  LANDMARK,
  NO_COUNCIL,
  TERRAIN,
  ZONE,
  type CityMap,
  type CouncilProfile,
  type Landmark,
  type Terrain,
  type Zone,
} from '../sim/map/types';
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
// Land is partitioned by nearest-seed Voronoi. Affluence drives what
// residents can afford (EVs, PV, heat pumps); ambition is how hard the
// council pushes electrification. Their product sets DER uptake pace.

interface CouncilSeed extends CouncilProfile {
  x: number;
  y: number;
}

const COUNCIL_SEEDS: CouncilSeed[] = [
  // City and west
  { id: 0, x: 64, y: 72, name: 'City of Westhaven', affluence: 0.95, ambition: 0.85, blurb: 'Financial heart. Net-zero pledge with a budget to match.' },
  { id: 1, x: 50, y: 42, name: 'Northheath', affluence: 0.9, ambition: 0.45, blurb: 'Leafy and lovely. Resists pylons with great vigour.' },
  { id: 2, x: 37, y: 112, name: 'Riverdene', affluence: 0.85, ambition: 0.7, blurb: 'Riverside villas. Early adopters of anything shiny.' },
  { id: 3, x: 83, y: 55, name: 'Camford', affluence: 0.6, ambition: 0.8, blurb: 'Young, dense, impatient for EV charging on every street.' },
  { id: 4, x: 75, y: 95, name: 'Southwark Vale', affluence: 0.5, ambition: 0.6, blurb: 'Markets and terraces south of the river.' },
  // East city / docks
  { id: 5, x: 107, y: 78, name: 'Old Docks', affluence: 0.4, ambition: 0.7, blurb: 'Regenerating fast. Tower cranes on every block.' },
  { id: 6, x: 101, y: 38, name: 'Walford Marsh', affluence: 0.3, ambition: 0.35, blurb: 'Proud, practical, suspicious of consultants.' },
  { id: 7, x: 112, y: 120, name: 'Penge Hollow', affluence: 0.45, ambition: 0.4, blurb: 'Quiet suburbs that would rather not be disturbed.' },
  // Outer suburbs
  { id: 8, x: 149, y: 60, name: 'Eppingdale', affluence: 0.7, ambition: 0.55, blurb: 'Forest-edge commuter belt. Loves trees near your lines.' },
  { id: 9, x: 155, y: 105, name: 'Thurmead', affluence: 0.4, ambition: 0.5, blurb: 'Riverside industry and new-build estates.' },
  { id: 10, x: 124, y: 136, name: 'Croyfield', affluence: 0.55, ambition: 0.6, blurb: 'Trams, towers and ten thousand loft conversions.' },
  // Essex
  { id: 11, x: 200, y: 48, name: 'Greenmarsh', affluence: 0.5, ambition: 0.75, blurb: 'Glasshouse capital. Wants cheap power and lots of it.' },
  { id: 12, x: 197, y: 98, name: 'Witherly', affluence: 0.45, ambition: 0.25, blurb: 'Deep Essex. Electrification can wait for the cricket.' },
  { id: 13, x: 234, y: 55, name: 'Estuary Point', affluence: 0.35, ambition: 0.6, blurb: 'Salt wind and big skies. Home of the nuclear question.' },
  { id: 14, x: 236, y: 120, name: 'Shoebury Ness', affluence: 0.4, ambition: 0.45, blurb: 'End of the line. Cockles, caravans and a long pier.' },
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

  const idx = (x: number, y: number): number => y * w + x;
  const inb = (x: number, y: number): boolean => x >= 0 && x < w && y >= 0 && y < h;

  const setTerrain = (x: number, y: number, t: Terrain): void => {
    if (inb(x, y)) terrain[idx(x, y)] = t;
  };
  const isWater = (x: number, y: number): boolean =>
    inb(x, y) && terrain[idx(x, y)] === TERRAIN.water;
  const isLand = (x: number, y: number): boolean =>
    inb(x, y) && terrain[idx(x, y)] === TERRAIN.land;

  /** Zone a rect onto land tiles, with optional edge jitter for organic shapes. */
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

  /** Zone a rough blob (jittered disc) onto land tiles. */
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
  // A tributary creek in Essex marshland (Crouch analog)
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

  // 3) Forests — Epping analog band plus scattered woods
  forestBlob(140, 22, 11);
  forestBlob(156, 17, 8);
  forestBlob(128, 30, 7);
  forestBlob(26, 18, 6); // NW woods
  forestBlob(184, 130, 8); // south Essex woods
  forestBlob(84, 140, 6);
  forestBlob(214, 120, 5);
  forestBlob(60, 22, 5);

  // 4) Zones, painted background-first so specific districts overwrite
  // the broad rings they sit inside.
  // Inner suburbs ring
  zoneRect(22, 30, 126, 134, ZONE.suburb, 5);
  // Urban ring
  zoneRect(34, 50, 104, 116, ZONE.urban, 4);
  // Urban core on both banks
  zoneRect(46, 60, 90, 100, ZONE.urbanCore, 2);
  // Skyscraper districts: the City cluster and the Canary cluster downriver
  zoneRect(60, 66, 70, 74, ZONE.cbd, 1);
  zoneRect(92, 82, 99, 88, ZONE.cbd, 1);
  // Posh districts: NW heath and SW river bend (underground-only sensibilities)
  zoneRect(38, 34, 62, 50, ZONE.posh, 2);
  zoneRect(26, 102, 50, 124, ZONE.posh, 2);
  // Docklands industry along the river east of the core
  zoneRect(100, 70, 124, 88, ZONE.industrial, 2);
  // Essex industrial estate
  zoneRect(184, 82, 198, 92, ZONE.industrial, 2);
  // Outer suburb towns
  zoneBlob(144, 58, 9, ZONE.suburb);
  zoneBlob(138, 100, 8, ZONE.suburb);
  zoneBlob(154, 118, 7, ZONE.suburb);
  zoneBlob(165, 76, 6, ZONE.suburb);
  zoneBlob(148, 38, 6, ZONE.suburb);
  zoneBlob(120, 40, 5, ZONE.suburb);
  zoneBlob(118, 124, 6, ZONE.suburb);
  // Rural Essex villages
  const villages: Array<[number, number, number]> = [
    [180, 48, 4],
    [194, 62, 3],
    [208, 72, 4],
    [222, 84, 3],
    [188, 110, 4],
    [206, 104, 3],
    [226, 114, 3],
    [238, 76, 3],
    [174, 126, 3],
    [216, 44, 3],
    [244, 124, 3],
    [170, 92, 3],
    [232, 132, 3],
    [158, 138, 3],
    [240, 36, 3],
    [186, 24, 3],
  ];
  for (const [vx, vy, vr] of villages) zoneBlob(vx, vy, vr, ZONE.rural);
  // Greenhouse cluster in Greenmarsh (Lea Valley analog gone east)
  zoneRect(198, 48, 214, 58, ZONE.greenhouse, 1);
  zoneRect(205, 28, 217, 36, ZONE.greenhouse, 1);
  // Pre-sited solar-farm fields (flat open Essex)
  zoneRect(172, 64, 182, 70, ZONE.solarSite);
  zoneRect(200, 88, 210, 94, ZONE.solarSite);
  zoneRect(228, 98, 238, 104, ZONE.solarSite);
  zoneRect(180, 36, 188, 41, ZONE.solarSite);
  zoneRect(162, 130, 170, 135, ZONE.solarSite);
  // Nuclear-capable coastal site on the estuary's north bank (Bradwell analog)
  zoneRect(224, 58, 238, 65, ZONE.nuclearSite);
  // Offshore-ish wind at the estuary mouth: zoned on water
  for (let y = 68, yEnd = 102; y <= yEnd; y++) {
    for (let x = 244; x < w; x++) {
      if (isWater(x, y)) zone[idx(x, y)] = ZONE.windSite;
    }
  }
  // City parks: the big one with the zoo (Regent's analog), the long one by
  // the posh river bend (Hyde analog), and southern commons
  zoneRect(50, 38, 62, 50, ZONE.park);
  zoneRect(42, 64, 52, 72, ZONE.park);
  zoneRect(86, 110, 96, 120, ZONE.park);
  zoneRect(70, 46, 76, 52, ZONE.park);

  // 5) Councils: nearest-seed Voronoi over land
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

  // 6) Roads. Arterials meander like real ones; only local streets grid.
  const roadAt = (x: number, y: number, bridge = false): void => {
    if (!inb(x, y)) return;
    if (terrain[idx(x, y)] === TERRAIN.water && !bridge) return;
    if (terrain[idx(x, y)] === TERRAIN.hill) return;
    road[idx(x, y)] = 1;
  };

  /** Straight tile run between two points (Bresenham), optionally bridging water. */
  const roadSeg = (ax: number, ay: number, bx: number, by: number, bridge: boolean): void => {
    let x = ax;
    let y = ay;
    const dx = Math.abs(bx - ax);
    const dy = Math.abs(by - ay);
    const sx = ax < bx ? 1 : -1;
    const sy = ay < by ? 1 : -1;
    let err = dx - dy;
    for (;;) {
      roadAt(x, y, bridge);
      if (x === bx && y === by) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  };

  /** A meandering road between waypoints: a sine wander (pinned at the
   *  ends) plus seeded jitter, drawn as connected short segments. */
  const meander = (pts: Array<[number, number]>, amp: number, bridge = false): void => {
    for (let s = 0; s + 1 < pts.length; s++) {
      const [ax, ay] = pts[s] ?? [0, 0];
      const [bx, by] = pts[s + 1] ?? [0, 0];
      const dx = bx - ax;
      const dy = by - ay;
      const len = Math.max(1, Math.hypot(dx, dy));
      const px = -dy / len;
      const py = dx / len;
      const phase = rng.range(0, Math.PI * 2);
      const freq = rng.range(1.2, 2.6);
      const steps = Math.ceil(len);
      let prev: [number, number] = [ax, ay];
      for (let k = 1; k <= steps; k++) {
        const t = k / steps;
        const off =
          Math.sin(phase + t * Math.PI * 2 * freq) * amp * Math.sin(Math.PI * t) +
          rng.range(-0.4, 0.4);
        const x = Math.round(ax + dx * t + px * off);
        const y = Math.round(ay + dy * t + py * off);
        roadSeg(prev[0], prev[1], x, y, bridge);
        prev = [x, y];
      }
    }
  };

  // Orbital motorway (M25 analog) ringing the city
  {
    const cx = 76;
    const cy = 82;
    const rx = 60;
    const ry = 56;
    let prev: [number, number] | undefined;
    for (let i = 0; i <= 140; i++) {
      const a = (i / 140) * Math.PI * 2;
      const x = Math.round(cx + Math.cos(a) * rx + rng.range(-0.6, 0.6));
      const y = Math.round(cy + Math.sin(a) * ry + rng.range(-0.6, 0.6));
      if (prev) roadSeg(prev[0], prev[1], x, y, true); // motorway bridges the river
      prev = [x, y];
    }
  }

  // Riverside arterials hugging each bank
  {
    let prevN: [number, number] | undefined;
    let prevS: [number, number] | undefined;
    for (let x = 8; x <= 242; x += 3) {
      const cy = riverCenterY(x);
      const hw = riverHalfWidth(x);
      const yN = Math.round(cy - hw - 3 + rng.range(-0.5, 0.5));
      if (prevN) roadSeg(prevN[0], prevN[1], x, yN, false);
      prevN = [x, yN];
      if (x < 190) {
        const yS = Math.round(cy + hw + 3 + rng.range(-0.5, 0.5));
        if (prevS) roadSeg(prevS[0], prevS[1], x, yS, false);
        prevS = [x, yS]; // south road stops before the marshes
      }
    }
  }

  // City radials: meander out from the centre; the city ones bridge the Thames
  meander([[66, 78], [60, 50], [50, 24], [40, 8]], 1.5, true);
  meander([[66, 78], [78, 48], [90, 26], [98, 8]], 1.5, true);
  meander([[66, 80], [56, 100], [44, 124], [34, 150]], 1.5, true);
  meander([[68, 80], [84, 104], [98, 128], [108, 152]], 1.5, true);
  meander([[66, 78], [44, 70], [20, 64]], 1.5, true);
  meander([[68, 78], [96, 60], [120, 42], [148, 38]], 1.8, true);
  meander([[68, 82], [98, 92], [120, 100], [138, 100]], 1.8, true);
  // Cross-town and Essex A-roads chaining the towns and villages
  meander([[120, 40], [144, 58], [165, 76], [180, 48], [216, 44], [240, 36]], 2.2);
  meander([[138, 100], [154, 118], [174, 126], [188, 110], [206, 104], [226, 114], [244, 124]], 2.2);
  meander([[165, 76], [180, 48]], 1.6);
  meander([[165, 76], [170, 92], [188, 110]], 1.8);
  meander([[180, 48], [194, 62], [208, 72], [222, 84], [238, 76]], 2);
  meander([[148, 38], [186, 24], [216, 44]], 2);
  meander([[154, 118], [158, 138], [174, 126]], 1.6);
  meander([[208, 72], [206, 104]], 1.6);
  meander([[222, 84], [232, 132], [244, 124]], 1.8);

  // Local street grids where people live: orthogonal but staggered — the
  // vertical streets crank sideways every block so nothing runs ruler-straight
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const z = zone[idx(x, y)] as Zone;
      const inhabited =
        z === ZONE.urbanCore ||
        z === ZONE.cbd ||
        z === ZONE.urban ||
        z === ZONE.suburb ||
        z === ZONE.posh ||
        z === ZONE.industrial;
      if (!inhabited || !isLand(x, y)) continue;
      const pitch = z === ZONE.urbanCore || z === ZONE.cbd || z === ZONE.urban ? 6 : 8;
      const crank = (Math.floor(y / pitch) % 2) * Math.floor(pitch / 2);
      if ((x + crank) % pitch === 0 || y % pitch === 0) roadAt(x, y);
    }
  }

  // 6b) prune orphaned road stubs left by zone-edge jitter
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (road[idx(x, y)] !== 1) continue;
        const neighbours =
          (inb(x, y - 1) && road[idx(x, y - 1)] === 1 ? 1 : 0) +
          (inb(x + 1, y) && road[idx(x + 1, y)] === 1 ? 1 : 0) +
          (inb(x, y + 1) && road[idx(x, y + 1)] === 1 ? 1 : 0) +
          (inb(x - 1, y) && road[idx(x - 1, y)] === 1 ? 1 : 0);
        if (neighbours === 0) road[idx(x, y)] = 0;
      }
    }
  }

  // 7) Landmarks — placed last so they sit on finished fabric. Each tile
  // gets its landmark id; roads/zones beneath are cleared so the sprite
  // owns the tile. Customer counts land in step 8.
  const placeLandmark = (x: number, y: number, id: Landmark, keepRoad = false): void => {
    if (!inb(x, y)) return;
    const i = idx(x, y);
    landmark[i] = id;
    if (!keepRoad) road[i] = 0;
    // breathing room: no tower blocks crowding right up against an icon
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        if (!inb(x + dx, y + dy)) continue;
        const j = idx(x + dx, y + dy);
        if (zone[j] === ZONE.urbanCore || zone[j] === ZONE.cbd) zone[j] = ZONE.urban;
      }
    }
  };
  const riverY = (x: number): number => Math.round(riverCenterY(x));
  const hwAt = (x: number): number => riverHalfWidth(x);

  // Parliament + clock tower on the north bank; the wheel across the river
  placeLandmark(58, riverY(58) - Math.ceil(hwAt(58)) - 1, LANDMARK.parliament);
  placeLandmark(60, riverY(60) + Math.ceil(hwAt(60)) + 1, LANDMARK.eye);
  // The dome in the City; the glass shard on the south bank
  placeLandmark(65, 68, LANDMARK.dome);
  placeLandmark(76, riverY(76) + Math.ceil(hwAt(76)) + 2, LANDMARK.spire);
  // The fortress by the river and its twin-tower bridge
  {
    const bx = 82;
    placeLandmark(bx - 1, riverY(bx - 1) - Math.ceil(hwAt(bx - 1)) - 1, LANDMARK.fortress);
    const cy = riverCenterY(bx);
    const hw = riverHalfWidth(bx);
    for (let y = Math.floor(cy - hw - 1); y <= Math.ceil(cy + hw + 1); y++) {
      if (!inb(bx, y)) continue;
      const i = idx(bx, y);
      if (terrain[i] === TERRAIN.water) {
        landmark[i] = LANDMARK.towerBridge;
        road[i] = 1; // traffic crosses the bascule deck
      } else {
        road[i] = 1; // approach ramps
      }
    }
  }
  // The Olympic bowl in the north-east (Stratford analog)
  placeLandmark(112, 52, LANDMARK.stadium);
  // Football grounds north and south
  placeLandmark(70, 38, LANDMARK.arena);
  placeLandmark(98, 124, LANDMARK.arena);
  // Glass-roofed malls west and east (Westfield analogs)
  placeLandmark(40, 78, LANDMARK.mall);
  placeLandmark(118, 96, LANDMARK.mall);
  // The zoo in the big park
  placeLandmark(55, 43, LANDMARK.zoo);
  placeLandmark(56, 43, LANDMARK.zoo);
  // The decommissioned four-chimney power station on the south bank
  placeLandmark(48, riverY(48) + Math.ceil(hwAt(48)) + 1, LANDMARK.powerstation);

  // 8) Customers, vegetation, sprite variants
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
  };
  for (let i = 0; i < n; i++) {
    const z = zone[i] as Zone;
    const lm = landmark[i] as Landmark;
    if (lm !== LANDMARK.none) customers[i] = LANDMARK_CUSTOMERS[lm] ?? 0;
    else if (road[i] === 0) customers[i] = CUSTOMERS_PER_TILE[z];
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
    customers,
    vegetation,
    variant,
    landmark,
    councils: COUNCIL_SEEDS.map(({ x: _x, y: _y, ...profile }) => profile),
  };
}

let cached: CityMap | undefined;

export function getLondonMap(): CityMap {
  cached ??= buildLondonMap();
  return cached;
}
