// REALITY-SEEDED stylised city (preview). Builds a fine-scale CityMap from the
// real OSM data — water/parks/roads + EVERY building footprint aggregated onto
// the tile grid, typed + height-banded from the real tags — and renders it with
// the GAME's stylised sprites. Buildings are the dominant fabric; the real road
// network cuts through as thin streets (docs/osm-seeded-city.md).
//
//   npx tsx tools/seededCity.ts "Paris, France" paris [--span=9] [--scale=3] [--x0 --y0 --x1 --y1]
//   → preview/seeded-<id>.png   (preview only — not committed)
//
// Map data © OpenStreetMap contributors (ODbL).

import { mkdirSync } from 'node:fs';
import { applyCityFabric } from '../src/render/sprites/buildingSprites';
import { buildAtlas } from '../src/render/sprites/atlas';
import { fillDerivedLayers } from '../src/data/cityData';
import {
  LANDMARK,
  NO_COUNCIL,
  RC,
  TERRAIN,
  ZONE,
  type CityMap,
  type Landmark,
  type TransportRoute,
} from '../src/sim/map/types';
import { fillPolygonTiles, simplifyPath, strokePolylineTiles, type Pt } from './osm/geometry';
import { geocode } from './osm/nominatim';
import { fetchAllBuildings, fetchOsmFeatures, type BuildingFootprint } from './osm/overpass';
import { projectorFromCentre, type TileProjector } from './osm/project';
import { renderCityCrop } from './preview';

const W = 256;
const H = 160;

function arg(flag: string, d: number): number {
  const a = process.argv.find((s) => s.startsWith(`--${flag}=`));
  return a ? Number(a.slice(flag.length + 3)) : d;
}

type Cls = 'domestic' | 'commercial' | 'civic' | 'industrial';
function classify(b: BuildingFootprint): { cls: Cls; special: Landmark } {
  const k = b.kind;
  const am = b.amenity ?? '';
  // civic specials → a placed landmark
  if (am === 'hospital' || k === 'hospital') return { cls: 'civic', special: LANDMARK.sewage }; // (stand-in icon)
  if (am === 'school' || am === 'college' || am === 'university' || k === 'school') return { cls: 'civic', special: LANDMARK.school };
  if (am === 'place_of_worship' || k === 'church' || k === 'cathedral' || k === 'chapel') {
    return { cls: 'civic', special: /cathedral|basilica/.test(k) ? LANDMARK.dome : LANDMARK.church };
  }
  if (b.office === 'government' || am === 'townhall') return { cls: 'civic', special: LANDMARK.townhall };
  if (/industrial|warehouse|factory|shed|service|roof|hangar/.test(k)) return { cls: 'industrial', special: LANDMARK.none };
  if (/office|retail|commercial|hotel|supermarket|kiosk|public/.test(k) || b.shop || b.office || b.tourism === 'hotel') {
    return { cls: 'commercial', special: LANDMARK.none };
  }
  return { cls: 'domestic', special: LANDMARK.none }; // apartments/house/residential/yes
}

const HERO: Array<[RegExp, Landmark]> = [
  [/eiffel/i, LANDMARK.eiffel],
  [/notre[- ]?dame/i, LANDMARK.notredame],
  [/louvre/i, LANDMARK.louvre],
  [/arc de triomphe|porte saint/i, LANDMARK.arch],
  [/sacr[ée][- ]?c[œoe]ur|basilique/i, LANDMARK.basilica],
];
function heroOf(name: string): Landmark {
  for (const [re, lm] of HERO) if (re.test(name)) return lm;
  return LANDMARK.none;
}

async function main(): Promise<void> {
  const query = process.argv[2];
  const id = process.argv[3] ?? 'city';
  if (!query) {
    console.error('usage: npx tsx tools/seededCity.ts "<query>" <id> [--span=9] [--scale=3]');
    process.exit(1);
    return;
  }
  const span = arg('span', 9);
  const scale = arg('scale', 3);
  mkdirSync('preview', { recursive: true });
  const g = await geocode(query);
  const proj: TileProjector = projectorFromCentre(g.centre, span, W, H);
  console.log(`${g.displayName}  ·  ${proj.metresPerTile().toFixed(0)} m/tile`);
  const features = await fetchOsmFeatures(proj.bbox());
  const buildings = await fetchAllBuildings(proj.bbox());
  console.log(`  ${buildings.length} footprints, ${features.roads.length} roads`);

  const n = W * H;
  const idx = (x: number, y: number): number => y * W + x;
  const terrain = new Uint8Array(n).fill(TERRAIN.land);
  const zone = new Uint8Array(n).fill(ZONE.none);
  const road = new Uint8Array(n);
  const landmark = new Uint8Array(n);
  const flags = new Uint8Array(n);
  const project = (poly: number[][][] | [number, number][][]): Pt[][] =>
    (poly as [number, number][][]).map((r) => r.map(([lo, la]) => proj.toTile(lo, la)));

  // water + rivers
  for (const p of features.water) fillPolygonTiles(project(p), W, H, (x, y) => { terrain[idx(x, y)] = TERRAIN.water; });
  for (const line of features.rivers) strokePolylineTiles(line.map(([lo, la]) => proj.toTile(lo, la)), 0.6, W, H, (x, y) => { terrain[idx(x, y)] = TERRAIN.water; });

  // --- footprint aggregation: per-tile coverage + class votes + max levels ---
  const cover = new Uint16Array(n);
  const votes = new Uint8Array(n * 4); // domestic, commercial, civic, industrial
  const maxLev = new Uint8Array(n);
  const CLS_IX: Record<Cls, number> = { domestic: 0, commercial: 1, civic: 2, industrial: 3 };
  // count each building in the tile it SITS in (its centroid) — most buildings
  // are smaller than a tile, so a tile gathers the several buildings centred in
  // it; street tiles gather none → the grid emerges as the empty tiles, dense
  // like the blank-shapes render.
  for (const b of buildings) {
    const c = b.poly[0];
    if (!c) continue;
    let sx = 0;
    let sy = 0;
    for (const [lo, la] of c) { sx += lo; sy += la; }
    const [tx, ty] = proj.toTile(sx / c.length, sy / c.length);
    const x = Math.round(tx);
    const y = Math.round(ty);
    if (x < 0 || x >= W || y < 0 || y >= H) continue;
    const i = idx(x, y);
    if (terrain[i] === TERRAIN.water) continue;
    const ci = CLS_IX[classify(b).cls];
    const lev = Math.min(60, b.levels || Math.round((b.heightM || 9) / 3) || 3);
    cover[i] = Math.min(65535, (cover[i] ?? 0) + 1);
    votes[i * 4 + ci] = Math.min(255, (votes[i * 4 + ci] ?? 0) + 1);
    if (lev > (maxLev[i] ?? 0)) maxLev[i] = lev;
  }

  // build mask + dilation (so street gaps inside the city pave, not grass)
  const built = new Uint8Array(n);
  for (let i = 0; i < n; i++) if ((cover[i] ?? 0) > 0) built[i] = 1;
  const urban = new Uint8Array(n);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!built[idx(x, y)]) continue;
      for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < W && ny >= 0 && ny < H) urban[idx(nx, ny)] = 1;
        }
    }

  // --- zone each tile from the real building mix + height -----------------
  for (let i = 0; i < n; i++) {
    if (terrain[i] !== TERRAIN.land) continue;
    if (!built[i]) {
      if (urban[i]) zone[i] = ZONE.urban; // paved street/courtyard gap inside the city
      continue;
    }
    // dominant class
    let ci = 0;
    for (let c = 1; c < 4; c++) if ((votes[i * 4 + c] ?? 0) > (votes[i * 4 + ci] ?? 0)) ci = c;
    const lev = maxLev[i] ?? 3;
    if (ci === 3) zone[i] = ZONE.industrial;
    else if (lev >= 12) zone[i] = ZONE.cbd; // La Défense towers
    else if (ci === 1) { zone[i] = lev >= 5 ? ZONE.urbanCore : ZONE.urban; flags[i] |= 1; }
    else if (ci === 2) zone[i] = ZONE.urban; // civic
    else {
      // domestic, by height
      zone[i] = lev >= 6 ? ZONE.urbanCore : lev >= 4 ? ZONE.urban : ZONE.suburb;
    }
  }

  // parks (override, on land)
  for (const gp of features.green) {
    if (/wood|forest|scrub/.test(gp.kind)) {
      fillPolygonTiles(project(gp.poly), W, H, (x, y) => { if (terrain[idx(x, y)] === TERRAIN.land && !built[idx(x, y)]) terrain[idx(x, y)] = TERRAIN.trees; });
    } else {
      fillPolygonTiles(project(gp.poly), W, H, (x, y) => { const i = idx(x, y); if (terrain[i] === TERRAIN.land && !built[i]) zone[i] = ZONE.park; });
    }
  }

  // --- roads: thin streets that CUT THROUGH (stamp + suppress building) ----
  const routes: TransportRoute[] = [];
  const stamp = (pts: Pt[], rc: number, hw: number): void => strokePolylineTiles(pts, hw, W, H, (x, y) => { const i = idx(x, y); if (terrain[i] !== TERRAIN.water && rc > (road[i] ?? 0)) road[i] = rc; });
  const arterialCands: Array<{ pts: Pt[]; len: number }> = [];
  for (const r of features.roads) {
    const pts = r.pts.map(([lo, la]) => proj.toTile(lo, la));
    if (r.cls === 'motorway') { stamp(pts, RC.motorway, 0.5); routes.push({ kind: 'motorway', pts: simplifyPath(pts, 0.5).map((p) => [p[0], p[1]]) }); }
    else if (r.cls === 'arterial') { stamp(pts, RC.arterial, 0.32); arterialCands.push({ pts, len: pathLen(pts) }); }
    else stamp(pts, RC.street, 0.16); // thin residential — clears the seam, no ribbon
  }
  arterialCands.sort((a, b) => b.len - a.len);
  for (const a of arterialCands.slice(0, 500)) routes.push({ kind: 'arterial', pts: simplifyPath(a.pts, 0.5).map((p) => [p[0], p[1]]) });
  for (const line of features.rivers) { const s = simplifyPath(line.map(([lo, la]) => proj.toTile(lo, la)), 0.6); if (s.length >= 2) routes.push({ kind: 'lane', pts: s.map((p) => [p[0], p[1]]) }); }
  // road tiles hold no building (the street shows through)
  for (let i = 0; i < n; i++) if ((road[i] ?? 0) >= RC.arterial) zone[i] = zone[i] === ZONE.none ? ZONE.none : ZONE.urban;

  // --- heroes + civic specials from tags -----------------------------------
  // heroes first (by name), then NAMED civic specials up to a cap, so the map
  // gets distinct landmarks without a school/church on every block.
  let heroes = 0;
  const place = (list: BuildingFootprint[], pick: (b: BuildingFootprint) => Landmark, cap: number): void => {
    for (const b of list) {
      if (heroes >= cap) break;
      const c = b.poly[0];
      if (!c) continue;
      const lm = pick(b);
      if (lm === LANDMARK.none) continue;
      let sx = 0;
      let sy = 0;
      for (const [lo, la] of c) { sx += lo; sy += la; }
      const [tx, ty] = proj.toTile(sx / c.length, sy / c.length);
      const x = Math.round(tx);
      const y = Math.round(ty);
      if (x < 1 || x >= W - 1 || y < 1 || y >= H - 1 || landmark[idx(x, y)] !== LANDMARK.none) continue;
      landmark[idx(x, y)] = lm;
      if (lm === LANDMARK.eiffel) { for (let dx = 0; dx < 3; dx++) for (let dy = 0; dy < 3; dy++) { const j = idx(x + dx, y - dy); if (j >= 0 && j < n) { landmark[j] = lm; zone[j] = ZONE.park; } } }
      else zone[idx(x, y)] = ZONE.park;
      heroes++;
    }
  };
  place(buildings, (b) => (b.name ? heroOf(b.name) : LANDMARK.none), 40); // marquee
  place(buildings, (b) => (b.name ? classify(b).special : LANDMARK.none), 80); // named civic
  console.log(`  placed ${heroes} heroes/specials`);

  const map: CityMap = {
    width: W, height: H, terrain, zone,
    council: new Uint8Array(n).fill(NO_COUNCIL), road, routes,
    customers: new Uint16Array(n), vegetation: new Uint8Array(n), variant: new Uint8Array(n),
    landmark, flags, councils: [], fabric: 'paris',
  };
  fillDerivedLayers(map);

  applyCityFabric('paris');
  const atlas = buildAtlas();
  const x0 = arg('x0', 96);
  const y0 = arg('y0', 56);
  const x1 = arg('x1', 160);
  const y1 = arg('y1', 104);
  renderCityCrop(atlas, map, x0, y0, x1, y1, scale, `seeded-${id}`);
}

function pathLen(pts: Pt[]): number {
  let L = 0;
  for (let i = 0; i + 1 < pts.length; i++) L += Math.hypot(pts[i + 1]![0] - pts[i]![0], pts[i + 1]![1] - pts[i]![1]);
  return L;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
