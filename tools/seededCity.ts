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
import { fetchAllBuildings, fetchCoastline, fetchOsmFeatures, type BuildingFootprint } from './osm/overpass';
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

// Flood the open SEA from OSM coastlines. OSM coastlines are open ways drawn
// with land on the LEFT (water on the right) in geographic, y-UP orientation;
// projecting to our y-DOWN tile grid flips the handedness, so the water sits on
// the (-dy, dx) side of each segment's travel direction. We stamp the coast as
// a 1-tile barrier, seed the water side, then 4-connected flood across open
// (unbuilt, un-vegetated) tiles. The dense building/park fabric is a second
// wall, so a gap where the coastline leaves the bbox can't leak the ocean deep
// inland. Without this every coastal city (NY harbour, Sydney, Hong Kong, Cape
// Town) renders its defining sea as plain land.
function floodSea(lines: Pt[][], W: number, H: number, terrain: Uint8Array, block: Uint8Array): number {
  if (!lines.length) return 0;
  const n = W * H;
  const idx = (x: number, y: number): number => y * W + x;
  const coast = new Uint8Array(n);
  for (const ln of lines) strokePolylineTiles(ln, 0.7, W, H, (x, y) => { coast[idx(x, y)] = 1; });
  const seen = new Uint8Array(n);
  const queue: number[] = [];
  const seed = (fx: number, fy: number): void => {
    const x = Math.round(fx);
    const y = Math.round(fy);
    if (x < 0 || x >= W || y < 0 || y >= H) return;
    const i = idx(x, y);
    if (seen[i] || coast[i] || block[i]) return;
    seen[i] = 1;
    queue.push(i);
  };
  for (const ln of lines) {
    for (let k = 0; k + 1 < ln.length; k++) {
      const [ax, ay] = ln[k]!;
      const [bx, by] = ln[k + 1]!;
      const dx = bx - ax;
      const dy = by - ay;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len; // water-side normal (tile space, y-down)
      const ny = dx / len;
      const steps = Math.max(1, Math.ceil(len));
      for (let s = 0; s <= steps; s++) {
        const px = ax + (dx * s) / steps;
        const py = ay + (dy * s) / steps;
        seed(px + nx * 1.6, py + ny * 1.6);
        seed(px + nx * 2.8, py + ny * 2.8);
      }
    }
  }
  let filled = 0;
  while (queue.length) {
    const i = queue.pop()!;
    terrain[i] = TERRAIN.water;
    filled++;
    const x = i % W;
    const y = (i / W) | 0;
    const nb: Array<[number, number]> = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
    for (const [ax, ay] of nb) {
      if (ax < 0 || ax >= W || ay < 0 || ay >= H) continue;
      const j = idx(ax, ay);
      if (seen[j] || coast[j] || block[j]) continue;
      seen[j] = 1;
      queue.push(j);
    }
  }
  return filled;
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
  const coastline = await fetchCoastline(proj.bbox());
  console.log(`  ${buildings.length} footprints, ${features.roads.length} roads, ${coastline.length} coastlines`);

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

  // --- open sea from coastlines (bounded by the built + vegetated fabric) --
  const seaBlock = new Uint8Array(n);
  for (let i = 0; i < n; i++) if (built[i]) seaBlock[i] = 1;
  for (const gp of features.green) fillPolygonTiles(project(gp.poly), W, H, (x, y) => { seaBlock[idx(x, y)] = 1; });
  const coastTiles = coastline.map((ln) => ln.map(([lo, la]) => proj.toTile(lo, la)));
  const sea = floodSea(coastTiles, W, H, terrain, seaBlock);
  if (coastTiles.length) console.log(`  sea: ${sea} tiles from ${coastTiles.length} coastlines`);

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

  // --- roads: the FULL network as contiguous ribbons that CUT THROUGH -------
  const routes: TransportRoute[] = [];
  const stamp = (pts: Pt[], rc: number, hw: number): void => strokePolylineTiles(pts, hw, W, H, (x, y) => { const i = idx(x, y); if (terrain[i] !== TERRAIN.water && rc > (road[i] ?? 0)) road[i] = rc; });
  for (const r of features.roads) {
    const pts = r.pts.map(([lo, la]) => proj.toTile(lo, la));
    const simp = simplifyPath(pts, 0.5);
    if (simp.length < 2) continue;
    const sp = simp.map((p): [number, number] => [p[0], p[1]]);
    // every road is BOTH stamped (clears its tile so the street shows, not a
    // building) AND drawn as a continuous ribbon → a contiguous network
    // only MAJOR roads clear their tiles (cut through as visible corridors);
    // residential streets are streetTouch — the building stays, so the dense
    // road grid doesn't punch the map full of empty paved voids. They still
    // draw as thin ribbons that read in the gaps.
    if (r.cls === 'motorway') { stamp(pts, RC.motorway, 0.45); routes.push({ kind: 'motorway', pts: sp }); }
    else if (r.cls === 'arterial') { stamp(pts, RC.arterial, 0.28); routes.push({ kind: 'arterial', pts: sp }); }
    else { stamp(pts, RC.streetTouch, 0.12); routes.push({ kind: 'street', pts: sp }); }
  }
  for (const line of features.rivers) { const s = simplifyPath(line.map(([lo, la]) => proj.toTile(lo, la)), 0.6); if (s.length >= 2) routes.push({ kind: 'lane', pts: s.map((p) => [p[0], p[1]]) }); }
  // road tiles hold no building (the street shows through)
  for (let i = 0; i < n; i++) if ((road[i] ?? 0) >= RC.arterial) zone[i] = zone[i] === ZONE.none ? ZONE.none : ZONE.urban;

  // --- up to 100 HERO buildings, from the real notable buildings -----------
  // The named buildings are the notable ones (4k in Paris). Take the biggest
  // (most prominent) first; route each to the bespoke marquee (Eiffel, Notre-
  // Dame…), a civic special (school/church/hospital/townhall) or the
  // grand-civic generator, and place it as an N×N SW-anchored block.
  // Each hero is sized from its REAL footprint (a palace/terminal is huge; a
  // local landmark is small). No artificial apron — heroes stand proud by
  // being TALLER/WIDER within their square; clearance comes only where the real
  // building has open ground (parks/squares the seeded map already left empty).
  const FOOT: Record<number, number> = { [LANDMARK.eiffel]: 3, [LANDMARK.notredame]: 2 };
  const footExtent = (ring: [number, number][]): number => {
    let mnx = Infinity, mny = Infinity, mxx = -Infinity, mxy = -Infinity;
    for (const [lo, la] of ring) {
      const [tx, ty] = proj.toTile(lo, la);
      if (tx < mnx) mnx = tx; if (tx > mxx) mxx = tx; if (ty < mny) mny = ty; if (ty > mxy) mxy = ty;
    }
    return Math.max(mxx - mnx, mxy - mny); // real size in tiles
  };
  const notable = buildings
    .filter((b) => b.name && b.poly[0])
    .map((b) => ({ b, ext: footExtent(b.poly[0]!) }))
    .sort((a, b) => b.ext - a.ext);
  let heroes = 0;
  for (const { b, ext } of notable) {
    if (heroes >= 100) break;
    const name = b.name ?? '';
    let lm = heroOf(name);
    if (lm === LANDMARK.none) {
      const sp = classify(b).special;
      // only genuinely LARGE notable buildings become grand civic blocks; the
      // small/medium named civic get their compact specials; tiny named
      // ordinary buildings aren't heroes at all
      if (sp !== LANDMARK.none) lm = sp;
      else if (ext >= 2.2) lm = LANDMARK.grand;
      else continue;
    }
    // footprint: bespoke fixed sizes, else size to the real extent (1..4)
    const N = FOOT[lm] ?? (lm === LANDMARK.grand ? 3 : Math.max(1, Math.min(4, Math.round(ext))));
    const c = b.poly[0]!;
    let sx = 0;
    let sy = 0;
    for (const [lo, la] of c) { sx += lo; sy += la; }
    const [tx, ty] = proj.toTile(sx / c.length, sy / c.length);
    const x = Math.round(tx);
    const y = Math.round(ty);
    if (x < 1 || x + N - 1 >= W - 1 || y - (N - 1) <= 0 || y >= H - 1) continue;
    let clear = true;
    for (let dx = 0; dx < N && clear; dx++) for (let dy = 0; dy < N; dy++) if (landmark[idx(x + dx, y - dy)] !== LANDMARK.none) clear = false;
    if (!clear) continue;
    for (let dx = 0; dx < N; dx++) for (let dy = 0; dy < N; dy++) { const j = idx(x + dx, y - dy); landmark[j] = lm; zone[j] = ZONE.park; }
    heroes++;
  }
  console.log(`  placed ${heroes} hero buildings`);

  const fabric = process.argv.includes('--fabric=paris') ? 'paris' : 'london';
  const map: CityMap = {
    width: W, height: H, terrain, zone,
    council: new Uint8Array(n).fill(NO_COUNCIL), road, routes,
    customers: new Uint16Array(n), vegetation: new Uint8Array(n), variant: new Uint8Array(n),
    landmark, flags, councils: [], fabric,
  };
  fillDerivedLayers(map);

  applyCityFabric(fabric);
  const atlas = buildAtlas();
  const x0 = arg('x0', 96);
  const y0 = arg('y0', 56);
  const x1 = arg('x1', 160);
  const y1 = arg('y1', 104);
  renderCityCrop(atlas, map, x0, y0, x1, y1, scale, `seeded-${id}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
