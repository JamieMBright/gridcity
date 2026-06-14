// Turn fetched OSM features into a game CityMap. The recognisable shape of a
// city comes from water + the major-road skeleton + the land-use mosaic +
// parks; building footprints refine urban density and surface the heroes.
// Heuristic but data-driven: every layer is rasterised from real geometry,
// then blended with a gentle centre-falloff so density reads like a city.

import {
  LANDMARK,
  NO_COUNCIL,
  RC,
  TERRAIN,
  ZONE,
  type CityMap,
  type CouncilProfile,
  type Landmark,
  type TransportRoute,
} from '../../src/sim/map/types';
import { fillDerivedLayers } from '../../src/data/cityData';
import { Rng } from '../../src/sim/rng';
import {
  fillPolygonTiles,
  ringArea,
  simplifyPath,
  strokePolylineTiles,
  type Pt,
} from './geometry';
import type { LLPolygon, OsmFeatures } from './overpass';
import { TileProjector } from './project';

export interface NamedPlace {
  x: number;
  y: number;
  name: string;
  landmark?: boolean;
}

export interface BuiltCity {
  map: CityMap;
  named: NamedPlace[];
  /** Centre tile (geographic centre of the window). */
  centre: { x: number; y: number };
}

const GRID_W = 256;
const GRID_H = 160;

/** Project a lon/lat ring set into tile-space rings. */
function projectPoly(proj: TileProjector, poly: LLPolygon): Pt[][] {
  return poly.map((ring) => ring.map(([lon, lat]) => proj.toTile(lon, lat)));
}
function projectLine(proj: TileProjector, line: Array<[number, number]>): Pt[] {
  return line.map(([lon, lat]) => proj.toTile(lon, lat));
}

/** Map an OSM landuse value to a coarse urban class. */
type LuClass = 'residential' | 'commercial' | 'industrial' | 'open' | null;
function luClassOf(kind: string): LuClass {
  switch (kind) {
    case 'residential':
      return 'residential';
    case 'commercial':
    case 'retail':
      return 'commercial';
    case 'industrial':
    case 'port':
    case 'railway':
    case 'depot':
    case 'landfill':
    case 'quarry':
    case 'brownfield':
    case 'construction':
      return 'industrial';
    case 'farmland':
    case 'farmyard':
    case 'meadow':
    case 'grass':
    case 'orchard':
    case 'vineyard':
    case 'allotments':
    case 'village_green':
    case 'cemetery':
    case 'recreation_ground':
      return 'open';
    default:
      return null;
  }
}

export function buildCityFromOsm(
  features: OsmFeatures,
  proj: TileProjector,
  seed: number,
): BuiltCity {
  const w = GRID_W;
  const h = GRID_H;
  const n = w * h;
  const rng = new Rng(seed >>> 0);
  const idx = (x: number, y: number): number => y * w + x;

  const terrain = new Uint8Array(n).fill(TERRAIN.land);
  const zone = new Uint8Array(n).fill(ZONE.none);
  const council = new Uint8Array(n).fill(NO_COUNCIL);
  const road = new Uint8Array(n);
  const customers = new Uint16Array(n);
  const vegetation = new Uint8Array(n);
  const variant = new Uint8Array(n);
  const landmark = new Uint8Array(n);
  const flags = new Uint8Array(n);

  const FLAG_SHOPS = 1;
  const FLAG_BROWNFIELD = 4;

  // --- 1) water: fill polygons, then stroke river/canal centrelines --------
  for (const poly of features.water) {
    fillPolygonTiles(projectPoly(proj, poly), w, h, (x, y) => {
      terrain[idx(x, y)] = TERRAIN.water;
    });
  }
  for (const line of features.rivers) {
    strokePolylineTiles(projectLine(proj, line), 0.7, w, h, (x, y) => {
      terrain[idx(x, y)] = TERRAIN.water;
    });
  }

  // --- 2) woods → trees terrain; record park/open polys for later ----------
  const parkPolys: Pt[][][] = [];
  for (const g of features.green) {
    const tp = projectPoly(proj, g.poly);
    if (/wood|forest|scrub/.test(g.kind)) {
      fillPolygonTiles(tp, w, h, (x, y) => {
        if (terrain[idx(x, y)] === TERRAIN.land) terrain[idx(x, y)] = TERRAIN.trees;
      });
    } else {
      parkPolys.push(tp);
    }
  }
  for (const lu of features.landuse) {
    if (/forest|wood/.test(lu.kind)) {
      fillPolygonTiles(projectPoly(proj, lu.poly), w, h, (x, y) => {
        if (terrain[idx(x, y)] === TERRAIN.land) terrain[idx(x, y)] = TERRAIN.trees;
      });
    }
  }

  // --- 3) councils: rasterise the most granular admin level present --------
  const councils = rasterCouncils(features, proj, council, w, h, rng);

  // --- 4) building density + a per-tile tall-building flag ------------------
  const bdens = new Float32Array(n);
  const tall = new Uint8Array(n);
  for (const b of features.buildings) {
    const tp = projectPoly(proj, b.poly);
    const levels = Number(b.tags['building:levels'] ?? 0);
    const heightM = Number(String(b.tags.height ?? '').replace(/[^\d.]/g, '')) || levels * 3;
    fillPolygonTiles(tp, w, h, (x, y) => {
      const i = idx(x, y);
      bdens[i] = (bdens[i] ?? 0) + 1;
      if (heightM >= 45) tall[i] = 1;
    });
  }

  // --- 5) land-use class raster (priority: industrial > commercial > resi) --
  const lucls = new Int8Array(n).fill(-1); // -1 none, 0 resi, 1 comm, 2 ind, 3 open
  const order: Array<[LuClass, number]> = [
    ['open', 3],
    ['residential', 0],
    ['commercial', 1],
    ['industrial', 2],
  ];
  for (const [target, code] of order) {
    for (const lu of features.landuse) {
      if (luClassOf(lu.kind) !== target) continue;
      const brown = /industrial|brownfield|landfill|quarry|construction|railway|depot|port/.test(
        lu.kind,
      );
      fillPolygonTiles(projectPoly(proj, lu.poly), w, h, (x, y) => {
        const i = idx(x, y);
        if (terrain[i] !== TERRAIN.land) return;
        lucls[i] = code;
        if (brown) flags[i] |= FLAG_BROWNFIELD;
      });
    }
  }

  // --- 6) roads + rail: raster (gameplay rules) + simplified vector ribbons -
  // Stamp the FULL road raster first: it drives the urbanity field below, and
  // local streets become ground texture. Only the major skeleton + rail +
  // rivers become vector ribbons (a clean stylised network, not a GIS dump).
  const stampRoad = (pts: Pt[], rc: number, hw: number): void => {
    strokePolylineTiles(pts, hw, w, h, (x, y) => {
      const i = idx(x, y);
      if (terrain[i] === TERRAIN.water) return;
      if (rc > (road[i] ?? 0)) road[i] = rc;
    });
  };
  // streetTouch (NOT street): a road clips the tile but the building STAYS.
  // Crucial — a city's dense street grid stamped as RC.street would suppress
  // the structure on nearly every tile and the place would look deserted. We
  // only CLEAR a tile (RC.arterial+, so the renderer drops the building and
  // draws the carriageway) for roads we actually DRAW as ribbons, so a cleared
  // tile is never an empty hole. Local streets + undrawn arterials stay
  // streetTouch: they feed the urbanity field + gameplay, keep their building,
  // and don't clutter the ribbon layer.
  const motorwayR: TransportRoute[] = [];
  const railR: TransportRoute[] = [];
  const riverR: TransportRoute[] = [];
  const arterialCands: Array<{ pts: Pt[]; len: number }> = [];
  for (const r of features.roads) {
    const pts = projectLine(proj, r.pts);
    if (r.cls === 'motorway') {
      stampRoad(pts, RC.motorway, 0.75);
      const simp = simplifyPath(clipToGrid(pts, w, h), 0.6);
      if (simp.length >= 2 && pathLen(simp) >= 4) motorwayR.push({ kind: 'motorway', pts: simp.map(toPair) });
    } else if (r.cls === 'arterial') {
      stampRoad(pts, RC.streetTouch, 0.18); // provisional — re-stamped if drawn
      const clipped = clipToGrid(pts, w, h);
      const L = pathLen(clipped);
      if (clipped.length >= 2 && L >= 6) arterialCands.push({ pts: clipped, len: L });
    } else {
      stampRoad(pts, RC.streetTouch, 0.18);
    }
  }
  // the longest arterials become drawn ribbons (bounded + legible); only those
  // clear their tiles
  arterialCands.sort((a, b) => b.len - a.len);
  const arterialR: TransportRoute[] = [];
  for (const a of arterialCands.slice(0, 700)) {
    stampRoad(a.pts, RC.arterial, 0.45);
    arterialR.push({ kind: 'arterial', pts: simplifyPath(a.pts, 0.6).map(toPair) });
  }
  for (const line of features.rail) {
    const pts = projectLine(proj, line);
    const simp = simplifyPath(clipToGrid(pts, w, h), 0.6);
    if (simp.length >= 2 && pathLen(simp) >= 6) {
      stampRoad(pts, RC.rail, 0.3);
      railR.push({ kind: 'rail', pts: simp.map(toPair) });
    } else {
      stampRoad(pts, RC.streetTouch, 0.2);
    }
  }
  for (const line of features.rivers) {
    const simp = simplifyPath(clipToGrid(projectLine(proj, line), w, h), 0.7);
    if (simp.length >= 2 && pathLen(simp) >= 6) riverR.push({ kind: 'lane', pts: simp.map(toPair) });
  }
  const routes: TransportRoute[] = [...riverR, ...motorwayR, ...railR, ...arterialR];

  // --- 7) urbanity: blurred street density — the real proxy for "built-up" --
  const urbanity = densityField(road, w, h, 3);

  // --- 8) zone each land tile -----------------------------------------------
  // urbanity gives the city's REAL footprint (its true shape, with the holes
  // the parks/rivers/woods punch); the radial falloff supplies the intensity
  // TIER (a dense core → urban ring → suburban edge), the way real cities and
  // the hand-built London map both grade. land-use refines the specials.
  const cx = w / 2;
  const cy = h / 2;
  const RMAX = 95;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = idx(x, y);
      if (terrain[i] !== TERRAIN.land) continue;
      // NB: arterial/motorway tiles still get an urban zone so their GROUND
      // paves over; the renderer (structureSpriteFor) suppresses the building
      // and draws the carriageway ribbon there. Zeroing the zone here would
      // turn paved city into grass along every major road.
      const lc = lucls[i] ?? -1;
      const b = bdens[i] ?? 0;
      const u = urbanity[i] ?? 0;
      const builtUp = lc === 0 || lc === 1 || b > 0 || u > 0.12;
      if (!builtUp) continue;
      const radial = Math.max(0, 1 - Math.hypot(x - cx, y - cy) / RMAX);
      const isTall = (tall[i] ?? 0) === 1;
      if (lc === 2) {
        zone[i] = ZONE.industrial;
        flags[i] |= FLAG_BROWNFIELD;
        continue;
      }
      // tier from distance-to-centre, nudged by local street density
      const v = Math.min(1, radial * 0.9 + u * 0.3);
      if (lc === 1) {
        if (isTall || (radial > 0.55 && u > 0.6)) zone[i] = ZONE.cbd;
        else {
          zone[i] = v >= 0.6 ? ZONE.urbanCore : ZONE.urban;
          flags[i] |= FLAG_SHOPS;
        }
        continue;
      }
      if (isTall && radial > 0.35) zone[i] = ZONE.cbd;
      else if (v >= 0.62) zone[i] = ZONE.urbanCore;
      else if (v >= 0.36) zone[i] = ZONE.urban;
      else zone[i] = ZONE.suburb;
    }
  }

  // posh: leafy low-density pockets get the underground-cable treatment
  for (let i = 0; i < n; i++) {
    if (zone[i] === ZONE.suburb && (urbanity[i] ?? 0) < 0.3 && rng.chance(0.06)) zone[i] = ZONE.posh;
  }

  // --- parks override (on land, never over the CBD towers) ------------------
  for (const tp of parkPolys) {
    fillPolygonTiles(tp, w, h, (x, y) => {
      const i = idx(x, y);
      if (terrain[i] === TERRAIN.land && zone[i] !== ZONE.cbd) zone[i] = ZONE.park;
    });
  }

  // --- 9) a few generation opportunities on open land / the water edge ------
  seedGenerationSites(terrain, zone, w, h, rng);

  // --- 10) heroes + named places (before derived layers so customers count) -
  const named = placeHeroes(features, proj, terrain, zone, landmark, flags, w, h);

  // --- 11) customers, vegetation, variant (shared with the runtime loader) --
  const map: CityMap = {
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
    councils,
  };
  fillDerivedLayers(map);
  return { map, named, centre: { x: Math.round(cx), y: Math.round(cy) } };
}

// --- helpers ---------------------------------------------------------------

const toPair = (p: Pt): [number, number] => [p[0], p[1]];
function pathLen(pts: Pt[]): number {
  let L = 0;
  for (let i = 0; i + 1 < pts.length; i++) L += Math.hypot(pts[i + 1]![0] - pts[i]![0], pts[i + 1]![1] - pts[i]![1]);
  return L;
}
/**
 * Blurred street-density field (0..1) from the road raster. A separable box
 * blur over a "tile has any road" mask: dense street grids → ~1 (city core),
 * sparse lanes → ~0 (countryside). This is the urban-form signal that drives
 * zoning, since fetching every building footprint city-wide is impractical.
 */
function densityField(road: Uint8Array, w: number, h: number, radius: number): Float32Array {
  const n = w * h;
  const bin = new Float32Array(n);
  for (let i = 0; i < n; i++) bin[i] = (road[i] ?? 0) >= 1 ? 1 : 0;
  const tmp = new Float32Array(n);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let cnt = 0;
      for (let dx = -radius; dx <= radius; dx++) {
        const xx = x + dx;
        if (xx < 0 || xx >= w) continue;
        sum += bin[y * w + xx] ?? 0;
        cnt++;
      }
      tmp[y * w + x] = sum / cnt;
    }
  }
  const out = new Float32Array(n);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let sum = 0;
      let cnt = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        sum += tmp[yy * w + x] ?? 0;
        cnt++;
      }
      out[y * w + x] = sum / cnt;
    }
  }
  return out;
}

/** Drop points far outside the grid so off-map ways don't bloat the ribbon. */
function clipToGrid(pts: Pt[], w: number, h: number): Pt[] {
  const out: Pt[] = [];
  for (const p of pts) {
    if (p[0] >= -4 && p[0] <= w + 3 && p[1] >= -4 && p[1] <= h + 3) out.push(p);
    else if (out.length && out[out.length - 1] !== null) out.push(p); // keep one off-map anchor for continuity
  }
  return out.length >= 2 ? out : pts;
}

function rasterCouncils(
  features: OsmFeatures,
  proj: TileProjector,
  council: Uint8Array,
  w: number,
  h: number,
  rng: Rng,
): CouncilProfile[] {
  // pick the most granular admin level that actually has members
  const byLevel = new Map<string, typeof features.councils>();
  for (const c of features.councils) {
    const arr = byLevel.get(c.kind) ?? [];
    arr.push(c);
    byLevel.set(c.kind, arr);
  }
  let chosen: typeof features.councils = [];
  for (const key of ['admin10', 'admin9', 'admin8']) {
    const arr = byLevel.get(key);
    if (arr && arr.length > chosen.length) chosen = arr;
  }
  const profiles: CouncilProfile[] = [];
  if (chosen.length === 0) {
    // fallback: a 4×3 grid of districts so the council layer still exists
    const cols = 4;
    const rows = 3;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const id = profiles.length;
        profiles.push(councilProfile(id, `District ${id + 1}`, rng));
        for (let y = Math.floor((r * h) / rows); y < ((r + 1) * h) / rows; y++) {
          for (let x = Math.floor((c * w) / cols); x < ((c + 1) * w) / cols; x++) {
            council[y * w + x] = id;
          }
        }
      }
    }
    return profiles;
  }
  // largest-area councils first so small enclaves paint last (on top)
  const sorted = chosen
    .map((c) => ({ c, area: c.poly[0] ? ringArea(c.poly[0].map(([lo, la]) => proj.toTile(lo, la))) : 0 }))
    .sort((a, b) => b.area - a.area)
    .slice(0, 200);
  for (const { c } of sorted) {
    const id = profiles.length;
    profiles.push(councilProfile(id, c.name ?? `Council ${id + 1}`, rng));
    fillPolygonTiles(
      c.poly.map((ring) => ring.map(([lo, la]) => proj.toTile(lo, la))),
      w,
      h,
      (x, y) => {
        council[y * w + x] = id;
      },
    );
  }
  return profiles;
}

function councilProfile(id: number, name: string, rng: Rng): CouncilProfile {
  return {
    id,
    name,
    affluence: 0.3 + rng.next() * 0.55,
    ambition: 0.3 + rng.next() * 0.55,
    blurb: `${name} — a district of the city, with its own mix of homes, work and ambition.`,
  };
}

function seedGenerationSites(
  terrain: Uint8Array,
  zone: Uint8Array,
  w: number,
  h: number,
  rng: Rng,
): void {
  const idx = (x: number, y: number): number => y * w + x;
  const isWater = (x: number, y: number): boolean =>
    x >= 0 && x < w && y >= 0 && y < h && terrain[idx(x, y)] === TERRAIN.water;
  // solar farms on big open patches away from the core
  let solar = 0;
  for (let t = 0; t < 4000 && solar < 6; t++) {
    const x = 6 + Math.floor(rng.next() * (w - 12));
    const y = 6 + Math.floor(rng.next() * (h - 12));
    const i = idx(x, y);
    if (terrain[i] !== TERRAIN.land || zone[i] !== ZONE.none) continue;
    if (Math.hypot(x - w / 2, y - h / 2) < w * 0.28) continue;
    let open = true;
    for (let dy = -1; dy <= 1 && open; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const j = idx(x + dx, y + dy);
        if (terrain[j] !== TERRAIN.land || zone[j] !== ZONE.none) open = false;
      }
    if (!open) continue;
    zone[i] = ZONE.solarSite;
    solar++;
  }
  // a couple of estuary/offshore wind sites: open land tile next to water
  let wind = 0;
  for (let t = 0; t < 6000 && wind < 2; t++) {
    const x = 4 + Math.floor(rng.next() * (w - 8));
    const y = 4 + Math.floor(rng.next() * (h - 8));
    const i = idx(x, y);
    if (terrain[i] !== TERRAIN.land || zone[i] !== ZONE.none) continue;
    if (isWater(x + 1, y) || isWater(x - 1, y) || isWater(x, y + 1) || isWater(x, y - 1)) {
      zone[i] = wind === 0 ? ZONE.nuclearSite : ZONE.windSite;
      wind++;
    }
  }
}

/** Multi-tile hero footprints (N×N, SW-anchored). Default 1×1. */
const LANDMARK_FOOT: Partial<Record<number, number>> = {
  [LANDMARK.eiffel]: 3, // the massive iron tower
};

const HERO_KEYWORDS: Array<[RegExp, Landmark]> = [
  [/cathedral|basilica|minster|duomo/i, LANDMARK.dome],
  [/church|chapel|temple|mosque|synagogue|abbey/i, LANDMARK.church],
  [/castle|fort|citadel|palace|château|chateau/i, LANDMARK.fortress],
  [/stadium|stade|arena|estadio/i, LANDMARK.stadium],
  [/\bzoo\b|aquarium/i, LANDMARK.zoo],
  [/tower|tour\b/i, LANDMARK.bttower],
  [/museum|gallery|galerie/i, LANDMARK.townhall],
  [/airport|aéroport|aeroport|aerodrome/i, LANDMARK.airport],
  [/mall|centre commercial|shopping/i, LANDMARK.mall],
  [/station|gare\b/i, LANDMARK.station],
];

function landmarkFor(name: string, tags: Record<string, string>): Landmark {
  if (tags.aeroway === 'aerodrome') return LANDMARK.airport;
  // bespoke Paris icons (checked before the generic tower/cathedral rules)
  if (/eiffel/i.test(name)) return LANDMARK.eiffel;
  if (/arc de triomphe|porte saint[- ]?(denis|martin)|triumphal/i.test(name)) return LANDMARK.arch;
  if (/sacr[ée][- ]?c[œoe]ur|basilique/i.test(name)) return LANDMARK.basilica;
  if (/louvre/i.test(name)) return LANDMARK.louvre;
  // the bespoke gothic cathedral is reserved for Notre-Dame specifically (so
  // a city's other cathedrals don't all become identical twins of it)
  if (/notre[- ]?dame/i.test(name)) return LANDMARK.notredame;
  if (tags.building === 'cathedral' || tags.building === 'church') {
    return /cathedral|basilica|minster/i.test(name) ? LANDMARK.dome : LANDMARK.church;
  }
  for (const [re, lm] of HERO_KEYWORDS) if (re.test(name)) return lm;
  if (tags.historic === 'castle' || tags.historic === 'fort') return LANDMARK.fortress;
  if (tags.tourism === 'zoo') return LANDMARK.zoo;
  return LANDMARK.none;
}

/** Notability score: heritage/wikidata weigh most, then tourism/historic. */
function notability(p: { tags: Record<string, string> }): number {
  const t = p.tags;
  let s = 0;
  if (t.wikidata) s += 5;
  if (t.wikipedia) s += 3;
  if (t.heritage) s += 3;
  if (t.historic) s += 2;
  if (t.tourism) s += 2;
  if (t.aeroway) s += 4;
  if (t.building === 'cathedral') s += 4;
  return s;
}

function placeHeroes(
  features: OsmFeatures,
  proj: TileProjector,
  terrain: Uint8Array,
  zone: Uint8Array,
  landmark: Uint8Array,
  flags: Uint8Array,
  w: number,
  h: number,
): NamedPlace[] {
  const idx = (x: number, y: number): number => y * w + x;
  // rank, dedupe by rounded tile, cap to keep the map legible
  const ranked = features.pois
    .map((p) => ({ p, score: notability(p), tile: proj.toTile(p.lon, p.lat) }))
    .filter(({ tile }) => tile[0] >= 1 && tile[0] < w - 1 && tile[1] >= 1 && tile[1] < h - 1)
    .sort((a, b) => b.score - a.score);

  const seen = new Set<string>();
  const named: NamedPlace[] = [];
  for (const { p, score, tile } of ranked) {
    if (named.length >= 90) break;
    let x = Math.round(tile[0]);
    let y = Math.round(tile[1]);
    // snap off water to the nearest land tile
    if (terrain[idx(x, y)] === TERRAIN.water) {
      const snapped = nearestLand(terrain, x, y, w, h);
      if (!snapped) continue;
      [x, y] = snapped;
    }
    const key = `${x >> 1},${y >> 1}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const lm = landmarkFor(p.name, p.tags);
    const isHero = lm !== LANDMARK.none && score >= 2;
    if (isHero) {
      // multi-tile heroes (e.g. the massive 3×3 Eiffel) stamp an N×N block,
      // SW-anchored on (x,y) so the renderer's block-anchor lands the one
      // sprite; (x,y) is the south-west corner, extending N + E.
      let n = LANDMARK_FOOT[lm] ?? 1;
      if (x + n - 1 >= w - 1 || y - (n - 1) <= 0) n = 1; // no room → demote
      for (let dx = 0; dx < n; dx++) {
        for (let dy = 0; dy < n; dy++) {
          const i = idx(x + dx, y - dy);
          if (terrain[i] === TERRAIN.water) continue;
          landmark[i] = lm;
          zone[i] = lm === LANDMARK.airport ? ZONE.industrial : ZONE.park;
          if (lm === LANDMARK.airport) flags[i] |= 2;
        }
      }
      // a parvis/garden apron ringing the whole block so the monument stands
      // proud instead of being buried behind the blocks painted in front of it
      for (let dy = -(n + 1); dy <= 2; dy++) {
        for (let dx = -1; dx <= n + 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          const j = idx(nx, ny);
          if (terrain[j] === TERRAIN.water || landmark[j] !== LANDMARK.none) continue;
          zone[j] = ZONE.park;
        }
      }
    }
    named.push({ x, y, name: p.name, ...(isHero ? { landmark: true } : {}) });
  }
  return named;
}

function nearestLand(
  terrain: Uint8Array,
  x: number,
  y: number,
  w: number,
  h: number,
): [number, number] | null {
  for (let r = 1; r <= 4; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        if (terrain[ny * w + nx] === TERRAIN.land) return [nx, ny];
      }
    }
  }
  return null;
}
