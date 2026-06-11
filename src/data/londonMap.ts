// The ElectriCity main map: a stylized London → Essex region, authored as
// deterministic drawing code. West (x=0) is the dense city; the Thames
// flows west→east, widening into an estuary; the east is rural Essex with
// solar-farm fields, greenhouse clusters and the region's only
// nuclear-capable coastal site. All shapes are hand-placed; a seeded RNG
// adds organic jitter so edges aren't ruler-straight, identically every run.

import {
  CUSTOMERS_PER_TILE,
  NO_COUNCIL,
  TERRAIN,
  ZONE,
  type CityMap,
  type CouncilProfile,
  type Terrain,
  type Zone,
} from '../sim/map/types';
import { Rng } from '../sim/rng';

export const LONDON_W = 192;
export const LONDON_H = 128;

// --- The Thames -----------------------------------------------------------

/** River centerline: gentle meander through the city, drifting to the estuary. */
export function riverCenterY(x: number): number {
  return 64 + 6 * Math.sin(x / 21) + 3 * Math.sin(x / 9 + 1.3);
}

/** River half-width: ~2 tiles in town, fanning out to a wide estuary mouth. */
export function riverHalfWidth(x: number): number {
  if (x < 110) return 1.6;
  const t = (x - 110) / (LONDON_W - 110);
  return 1.6 + 10.5 * t * t;
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
  { id: 0, x: 48, y: 58, name: 'City of Westhaven', affluence: 0.95, ambition: 0.85, blurb: 'Financial heart. Net-zero pledge with a budget to match.' },
  { id: 1, x: 38, y: 34, name: 'Northheath', affluence: 0.9, ambition: 0.45, blurb: 'Leafy and lovely. Resists pylons with great vigour.' },
  { id: 2, x: 28, y: 90, name: 'Riverdene', affluence: 0.85, ambition: 0.7, blurb: 'Riverside villas. Early adopters of anything shiny.' },
  { id: 3, x: 62, y: 44, name: 'Camford', affluence: 0.6, ambition: 0.8, blurb: 'Young, dense, impatient for EV charging on every street.' },
  { id: 4, x: 56, y: 76, name: 'Southwark Vale', affluence: 0.5, ambition: 0.6, blurb: 'Markets and terraces south of the river.' },
  // East city / docks
  { id: 5, x: 80, y: 62, name: 'Old Docks', affluence: 0.35, ambition: 0.65, blurb: 'Regenerating fast. Tower cranes on every block.' },
  { id: 6, x: 76, y: 30, name: 'Walford Marsh', affluence: 0.3, ambition: 0.35, blurb: 'Proud, practical, suspicious of consultants.' },
  { id: 7, x: 84, y: 96, name: 'Penge Hollow', affluence: 0.45, ambition: 0.4, blurb: 'Quiet suburbs that would rather not be disturbed.' },
  // Outer suburbs
  { id: 8, x: 112, y: 48, name: 'Eppingdale', affluence: 0.7, ambition: 0.55, blurb: 'Forest-edge commuter belt. Loves trees near your lines.' },
  { id: 9, x: 116, y: 84, name: 'Thurmead', affluence: 0.4, ambition: 0.5, blurb: 'Riverside industry and new-build estates.' },
  // Essex
  { id: 10, x: 150, y: 38, name: 'Greenmarsh', affluence: 0.5, ambition: 0.75, blurb: 'Glasshouse capital. Wants cheap power and lots of it.' },
  { id: 11, x: 148, y: 78, name: 'Witherly', affluence: 0.45, ambition: 0.25, blurb: 'Deep Essex. Electrification can wait for the cricket.' },
  { id: 12, x: 176, y: 44, name: 'Estuary Point', affluence: 0.35, ambition: 0.6, blurb: 'Salt wind and big skies. Home of the nuclear question.' },
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
  for (let x = 150; x < w; x++) {
    const cy = Math.round(30 + 4 * Math.sin(x / 7));
    setTerrain(x, cy, TERRAIN.water);
    setTerrain(x, cy + 1, TERRAIN.water);
    if (rng.chance(0.3)) setTerrain(x, cy + 2, TERRAIN.water);
  }

  // 2) Hills: northern ridge and southern downs
  for (let x = 0; x < w; x++) {
    const ridgeN = 4 + 3 * Math.sin(x / 13) + rng.range(0, 2);
    const ridgeS = h - 5 - 3 * Math.sin(x / 17) - rng.range(0, 2);
    for (let y = 0; y < h; y++) {
      if (y < ridgeN || y > ridgeS) {
        if (isLand(x, y)) terrain[idx(x, y)] = TERRAIN.hill;
      }
    }
  }

  // 3) Forests — Epping analog band plus scattered woods
  forestBlob(106, 18, 9);
  forestBlob(118, 14, 7);
  forestBlob(98, 24, 6);
  forestBlob(20, 14, 5); // NW woods
  forestBlob(138, 104, 6); // south Essex woods
  forestBlob(64, 112, 5);
  forestBlob(160, 96, 4);

  // 4) Zones, painted background-first so specific districts overwrite
  // the broad rings they sit inside.
  // Inner suburbs ring
  zoneRect(16, 22, 96, 108, ZONE.suburb, 4);
  // Urban ring
  zoneRect(26, 40, 78, 92, ZONE.urban, 3);
  // Urban core on both banks
  zoneRect(36, 48, 66, 80, ZONE.urbanCore, 2);
  // Posh districts: NW heath and SW river bend (underground-only sensibilities)
  zoneRect(30, 28, 48, 40, ZONE.posh, 2);
  zoneRect(20, 82, 38, 98, ZONE.posh, 2);
  // Outer suburb towns
  zoneBlob(108, 44, 7, ZONE.suburb);
  zoneBlob(104, 78, 6, ZONE.suburb);
  zoneBlob(116, 92, 6, ZONE.suburb);
  zoneBlob(124, 60, 5, ZONE.suburb);
  zoneBlob(112, 30, 4, ZONE.suburb);
  // Docklands industry along the river east of the core
  zoneRect(70, 56, 92, 70, ZONE.industrial, 2);
  // Essex industrial estate
  zoneRect(138, 64, 148, 72, ZONE.industrial, 2);
  // Rural Essex villages
  const villages: Array<[number, number, number]> = [
    [136, 40, 4],
    [146, 52, 3],
    [158, 60, 4],
    [168, 70, 3],
    [142, 88, 4],
    [156, 84, 3],
    [170, 92, 3],
    [180, 64, 3],
    [132, 100, 3],
    [164, 36, 3],
    [184, 100, 3],
    [128, 76, 3],
  ];
  for (const [vx, vy, vr] of villages) zoneBlob(vx, vy, vr, ZONE.rural);
  // Greenhouse cluster in Greenmarsh (Lea Valley analog gone east)
  zoneRect(148, 38, 162, 46, ZONE.greenhouse, 1);
  zoneRect(154, 24, 164, 30, ZONE.greenhouse, 1);
  // Pre-sited solar-farm fields (flat open Essex)
  zoneRect(130, 52, 138, 57, ZONE.solarSite);
  zoneRect(152, 68, 160, 73, ZONE.solarSite);
  zoneRect(172, 78, 180, 83, ZONE.solarSite);
  zoneRect(136, 30, 143, 34, ZONE.solarSite);
  // Nuclear-capable coastal site on the estuary's north bank (Bradwell analog)
  zoneRect(168, 46, 178, 52, ZONE.nuclearSite);
  // Offshore-ish wind at the estuary mouth: zoned on water
  for (let y = 56; y <= 78; y++) {
    for (let x = 184; x < w; x++) {
      if (isWater(x, y)) zone[idx(x, y)] = ZONE.windSite;
    }
  }
  // City parks (Hyde / Regent's analogs)
  zoneRect(40, 52, 45, 56, ZONE.park);
  zoneRect(52, 38, 56, 42, ZONE.park);
  zoneRect(70, 86, 74, 90, ZONE.park);

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

  // 6) Roads — arterials, three city bridges, local grids in inhabited zones
  const roadAt = (x: number, y: number): void => {
    if (inb(x, y)) road[idx(x, y)] = 1;
  };
  // East-west arterials hugging each bank
  for (let x = 8; x <= 188; x++) {
    const cy = riverCenterY(x);
    const hw = riverHalfWidth(x);
    const yN = Math.round(cy - hw - 3);
    const yS = Math.round(cy + hw + 3);
    if (isLand(x, yN)) roadAt(x, yN);
    if (x < 150 && isLand(x, yS)) roadAt(x, yS); // south road stops before the marshes
  }
  // North-south radials (bridges where they cross water in town)
  for (const rx of [30, 44, 56, 68, 88, 108, 130, 150, 170]) {
    for (let y = 10; y <= 118; y++) {
      const onWater = isWater(rx, y);
      const isBridgeable = rx <= 68; // only city radials bridge the Thames
      if (onWater && !isBridgeable) continue;
      if (terrain[idx(rx, y)] === TERRAIN.hill) continue;
      roadAt(rx, y);
    }
  }
  // Local street grids where people live
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const z = zone[idx(x, y)] as Zone;
      const inhabited =
        z === ZONE.urbanCore ||
        z === ZONE.urban ||
        z === ZONE.suburb ||
        z === ZONE.posh ||
        z === ZONE.industrial;
      if (!inhabited || !isLand(x, y)) continue;
      const pitch = z === ZONE.urbanCore || z === ZONE.urban ? 6 : 8;
      if (x % pitch === 0 || y % pitch === 0) roadAt(x, y);
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

  // 7) Customers, vegetation, sprite variants
  for (let i = 0; i < n; i++) {
    const z = zone[i] as Zone;
    if (road[i] === 0) customers[i] = CUSTOMERS_PER_TILE[z];
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
    councils: COUNCIL_SEEDS.map(({ x: _x, y: _y, ...profile }) => profile),
  };
}

let cached: CityMap | undefined;

export function getLondonMap(): CityMap {
  cached ??= buildLondonMap();
  return cached;
}
