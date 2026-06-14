// Fetch + normalise OSM geometry for a bounding box via the Overpass API.
// One query pulls every layer the map needs (water, roads, rail, land use,
// green space, notable buildings, admin boundaries). `out geom;` returns
// node coordinates inline, so no second round-trip is needed. Everything is
// returned in lon/lat; projection to the tile grid happens downstream.

import { cachedFetch } from './net';
import type { Bbox } from './project';

const ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];

/** A lon/lat coordinate pair. */
export type LL = [number, number];
/** A lon/lat ring (outer first, then holes). */
export type LLPolygon = LL[][];

export type RoadClass = 'motorway' | 'arterial' | 'street' | 'lane';

export interface RoadFeature {
  cls: RoadClass;
  pts: LL[];
}
export interface NamedPolygon {
  name?: string | undefined;
  kind: string;
  poly: LLPolygon;
  tags: Record<string, string>;
}
export interface Poi {
  name: string;
  lon: number;
  lat: number;
  tags: Record<string, string>;
}

export interface OsmFeatures {
  water: LLPolygon[];
  rivers: LL[][];
  coastline: LL[][];
  roads: RoadFeature[];
  rail: LL[][];
  landuse: NamedPolygon[];
  green: NamedPolygon[];
  buildings: NamedPolygon[];
  councils: NamedPolygon[];
  pois: Poi[];
}

interface OsmGeomNode {
  lat: number;
  lon: number;
}
interface OsmElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
  geometry?: OsmGeomNode[];
  members?: Array<{ type: string; role: string; geometry?: OsmGeomNode[] }>;
}

function buildQuery(b: Bbox): string {
  const bbox = `${b.minLat},${b.minLon},${b.maxLat},${b.maxLon}`;
  return `[out:json][timeout:240];
(
  way["natural"="water"](${bbox});
  relation["natural"="water"](${bbox});
  way["waterway"="riverbank"](${bbox});
  relation["waterway"="riverbank"](${bbox});
  way["waterway"~"^(river|canal|stream)$"](${bbox});
  way["natural"="coastline"](${bbox});
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|unclassified|living_street|motorway_link|trunk_link|primary_link|secondary_link)$"](${bbox});
  way["railway"~"^(rail|subway|light_rail|tram)$"](${bbox});
  way["landuse"](${bbox});
  relation["landuse"](${bbox});
  way["leisure"~"^(park|garden|recreation_ground|nature_reserve|golf_course|common|pitch)$"](${bbox});
  relation["leisure"~"^(park|garden|recreation_ground|nature_reserve|golf_course|common)$"](${bbox});
  way["natural"~"^(wood|scrub|heath|grassland|wetland|beach|sand)$"](${bbox});
  relation["natural"~"^(wood|heath|grassland|wetland)$"](${bbox});
  way["building"]["name"](${bbox});
  way["building"]["wikidata"](${bbox});
  relation["building"]["name"]["type"="multipolygon"](${bbox});
  nwr["tourism"~"^(attraction|museum|gallery|viewpoint|theme_park|zoo|aquarium)$"]["name"](${bbox});
  nwr["historic"~"^(castle|monument|memorial|ruins|fort|palace|tower)$"]["name"](${bbox});
  nwr["aeroway"="aerodrome"]["name"](${bbox});
  relation["boundary"="administrative"]["admin_level"~"^(8|9|10)$"](${bbox});
);
out geom;`;
}

/** Close a ring (append the first point) and return as [lon,lat] tuples. */
function ringOf(geom: OsmGeomNode[] | undefined): LL[] {
  if (!geom || geom.length === 0) return [];
  const r: LL[] = geom.map((g) => [g.lon, g.lat]);
  return r;
}

/** Outer/inner rings of a way (a closed way) or multipolygon relation. */
function polygonOf(el: OsmElement): LLPolygon {
  if (el.type === 'way') {
    const ring = ringOf(el.geometry);
    return ring.length >= 3 ? [ring] : [];
  }
  // relation: stitch member ways by role. Each member's geometry is treated
  // as one ring (OSM closed-way members); partial rings are approximated.
  const outers: LL[][] = [];
  const inners: LL[][] = [];
  for (const m of el.members ?? []) {
    if (m.type !== 'way') continue;
    const ring = ringOf(m.geometry);
    if (ring.length < 3) continue;
    (m.role === 'inner' ? inners : outers).push(ring);
  }
  // outer rings first, then holes — the even-odd rasteriser handles either
  return [...outers, ...inners];
}

function roadClass(hw: string): RoadClass {
  if (hw.startsWith('motorway') || hw.startsWith('trunk')) return 'motorway';
  if (hw.startsWith('primary') || hw.startsWith('secondary')) return 'arterial';
  return 'street';
}

function categorise(elements: OsmElement[]): OsmFeatures {
  const f: OsmFeatures = {
    water: [],
    rivers: [],
    coastline: [],
    roads: [],
    rail: [],
    landuse: [],
    green: [],
    buildings: [],
    councils: [],
    pois: [],
  };
  for (const el of elements) {
    const t = el.tags ?? {};
    const named: NamedPolygon = { name: t.name, kind: '', poly: [], tags: t };

    if (t.natural === 'water' || t.waterway === 'riverbank') {
      const p = polygonOf(el);
      if (p.length) f.water.push(p);
      continue;
    }
    if (t.natural === 'coastline' && el.type === 'way') {
      const ln = ringOf(el.geometry);
      if (ln.length >= 2) f.coastline.push(ln);
      continue;
    }
    if (t.waterway && /^(river|canal|stream)$/.test(t.waterway) && el.type === 'way') {
      const ln = ringOf(el.geometry);
      if (ln.length >= 2) f.rivers.push(ln);
      continue;
    }
    if (t.highway && el.type === 'way') {
      const ln = ringOf(el.geometry);
      if (ln.length >= 2) f.roads.push({ cls: roadClass(t.highway), pts: ln });
      continue;
    }
    if (t.railway && el.type === 'way') {
      // surface rail only — underground metro/subway shouldn't draw as a
      // surface line, and tunnel sections clutter the map
      if (t.railway === 'subway' || t.tunnel === 'yes' || t.location === 'underground') continue;
      const ln = ringOf(el.geometry);
      if (ln.length >= 2) f.rail.push(ln);
      continue;
    }
    if (t.boundary === 'administrative' && t.admin_level) {
      const p = polygonOf(el);
      if (p.length && t.name) f.councils.push({ ...named, kind: `admin${t.admin_level}`, poly: p });
      continue;
    }
    if (t.landuse) {
      const p = polygonOf(el);
      if (p.length) f.landuse.push({ ...named, kind: t.landuse, poly: p });
      continue;
    }
    if (t.leisure || (t.natural && /^(wood|scrub|heath|grassland|wetland|beach|sand)$/.test(t.natural))) {
      const p = polygonOf(el);
      if (p.length) f.green.push({ ...named, kind: t.leisure ?? t.natural ?? 'green', poly: p });
      continue;
    }
    if (t.building) {
      const p = polygonOf(el);
      if (p.length) f.buildings.push({ ...named, kind: t.building, poly: p });
      // a named/wikidata building is also a hero candidate point
      if (t.name) {
        const c = polyCentroidLL(p);
        if (c) f.pois.push({ name: t.name, lon: c[0], lat: c[1], tags: t });
      }
      continue;
    }
    // standalone notable POIs (tourism / historic / aerodrome)
    if (t.name && (t.tourism || t.historic || t.aeroway)) {
      if (el.type === 'node' && el.lon !== undefined && el.lat !== undefined) {
        f.pois.push({ name: t.name, lon: el.lon, lat: el.lat, tags: t });
      } else {
        const p = polygonOf(el);
        const c = polyCentroidLL(p);
        if (c) f.pois.push({ name: t.name, lon: c[0], lat: c[1], tags: t });
      }
    }
  }
  return f;
}

function polyCentroidLL(poly: LLPolygon): LL | null {
  const ring = poly[0];
  if (!ring || ring.length === 0) return null;
  let sx = 0;
  let sy = 0;
  for (const [x, y] of ring) {
    sx += x;
    sy += y;
  }
  return [sx / ring.length, sy / ring.length];
}

/** A real OSM building footprint + the tags we classify it by. */
export interface BuildingFootprint {
  poly: LLPolygon;
  heightM: number;
  levels: number;
  /** `building=` value (apartments/office/retail/hospital/…/yes). */
  kind: string;
  /** civic/POI tags that pin a special or hero. */
  amenity?: string;
  office?: string;
  shop?: string;
  tourism?: string;
  historic?: string;
  name?: string;
  wikidata?: string;
}

/** Fetch EVERY building footprint in the bbox (not just the named/notable
 *  ones) — for the reality-seeded building layer. Heavy, so cached. */
export async function fetchAllBuildings(bbox: Bbox): Promise<BuildingFootprint[]> {
  const b = `${bbox.minLat},${bbox.minLon},${bbox.maxLat},${bbox.maxLon}`;
  const query = `[out:json][timeout:240];(way["building"](${b});relation["building"]["type"="multipolygon"](${b}););out geom;`;
  let lastErr: unknown;
  for (const endpoint of ENDPOINTS) {
    try {
      const text = await cachedFetch(endpoint, {
        body: 'data=' + encodeURIComponent(query),
        cacheKey: query,
        label: `overpass buildings ${endpoint}`,
      });
      const json = JSON.parse(text) as { elements?: OsmElement[] };
      const els = json.elements ?? [];
      if (els.length === 0) throw new Error('no buildings');
      const out: BuildingFootprint[] = [];
      for (const el of els) {
        const poly = polygonOf(el);
        if (!poly.length) continue;
        const t = el.tags ?? {};
        const levels = Number(t['building:levels'] ?? 0);
        const heightM = Number(String(t.height ?? '').replace(/[^\d.]/g, '')) || levels * 3 || 0;
        out.push({
          poly,
          heightM,
          levels,
          kind: t.building ?? 'yes',
          ...(t.amenity ? { amenity: t.amenity } : {}),
          ...(t.office ? { office: t.office } : {}),
          ...(t.shop ? { shop: t.shop } : {}),
          ...(t.tourism ? { tourism: t.tourism } : {}),
          ...(t.historic ? { historic: t.historic } : {}),
          ...(t.name ? { name: t.name } : {}),
          ...(t.wikidata ? { wikidata: t.wikidata } : {}),
        });
      }
      return out;
    } catch (err) {
      lastErr = err;
      console.log(`  buildings endpoint failed (${endpoint}): ${String(err)}`);
    }
  }
  throw new Error(`all overpass endpoints failed for buildings: ${String(lastErr)}`);
}

export async function fetchOsmFeatures(bbox: Bbox): Promise<OsmFeatures> {
  const query = buildQuery(bbox);
  let lastErr: unknown;
  for (const endpoint of ENDPOINTS) {
    try {
      const body = 'data=' + encodeURIComponent(query);
      const text = await cachedFetch(endpoint, {
        body,
        cacheKey: query,
        label: `overpass ${endpoint}`,
      });
      const json = JSON.parse(text) as { elements?: OsmElement[] };
      const els = json.elements ?? [];
      if (els.length === 0) throw new Error('Overpass returned no elements');
      return categorise(els);
    } catch (err) {
      lastErr = err;
      console.log(`  overpass endpoint failed (${endpoint}): ${String(err)}`);
    }
  }
  throw new Error(`all overpass endpoints failed: ${String(lastErr)}`);
}
