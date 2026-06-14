// Serialized city maps produced by the OSM authoring pipeline (tools/osm).
//
// A generated city ships as a CityData record: the small set of rasters that
// can't be derived (terrain, zone, council, road, landmark, flags) as base64
// typed arrays, plus the vector routes, council profiles and named places as
// plain JSON. The runtime reconstructs a full CityMap with buildCityFromData,
// deriving customers / vegetation / sprite-variant from terrain + zone so the
// committed artifact stays lean. This keeps the game fully offline — no OSM
// egress at play time — while the heavy GIS work happens once, at authoring.
//
// Data © OpenStreetMap contributors (ODbL) — see the in-game credits.

import {
  CUSTOMERS_PER_TILE,
  TERRAIN,
  ZONE,
  type CityMap,
  type CouncilProfile,
  type TransportRoute,
  type Zone,
} from '../sim/map/types';

export interface CityNamedPlace {
  x: number;
  y: number;
  name: string;
  /** true if this place also stamps a landmark sprite. */
  landmark?: boolean;
}

export interface CityData {
  id: string;
  name: string;
  tagline: string;
  width: number;
  height: number;
  /** base64 Uint8Array rasters (row-major, width*height). */
  terrain: string;
  zone: string;
  council: string;
  road: string;
  landmark: string;
  flags: string;
  routes: TransportRoute[];
  councils: CouncilProfile[];
  named: CityNamedPlace[];
  /** Required ODbL attribution string. */
  attribution: string;
}

// --- universal base64 for typed arrays (works in Node 18+ and the browser) --

const B64_CHUNK = 0x8000;

export function encodeBytes(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += B64_CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + B64_CHUNK));
  }
  return btoa(bin);
}

export function decodeBytes(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Overhead-line fault exposure by terrain/zone — leafy edges are riskier. */
export function vegetationFor(terrainCode: number, z: Zone): number {
  if (terrainCode === TERRAIN.trees) return 210;
  if (terrainCode === TERRAIN.water) return 0;
  switch (z) {
    case ZONE.park:
      return 130;
    case ZONE.none:
    case ZONE.rural:
      return 90;
    case ZONE.suburb:
    case ZONE.posh:
      return 45;
    case ZONE.urban:
      return 18;
    case ZONE.urbanCore:
    case ZONE.cbd:
    case ZONE.industrial:
      return 6;
    default:
      return 30;
  }
}

/** Stable per-tile sprite-variant seed so streets don't visibly repeat. */
export function variantFor(i: number): number {
  return (((i * 2654435761) >>> 0) % 251) & 0xff;
}

/**
 * Populate the derived layers (customers, vegetation, variant) of a map from
 * its terrain + zone. The single source of truth shared by the authoring
 * builder and the runtime loader, so a re-derived map is bit-identical to the
 * one that was serialized.
 */
export function fillDerivedLayers(map: CityMap): void {
  const n = map.width * map.height;
  for (let i = 0; i < n; i++) {
    const z = (map.zone[i] ?? ZONE.none) as Zone;
    map.customers[i] = CUSTOMERS_PER_TILE[z] ?? 0;
    map.vegetation[i] = vegetationFor(map.terrain[i] ?? TERRAIN.land, z);
    map.variant[i] = variantFor(i);
  }
}

/** Reconstruct a full CityMap from a serialized CityData record. */
export function buildCityFromData(d: CityData): CityMap {
  const n = d.width * d.height;
  const map: CityMap = {
    width: d.width,
    height: d.height,
    terrain: decodeBytes(d.terrain),
    zone: decodeBytes(d.zone),
    council: decodeBytes(d.council),
    road: decodeBytes(d.road),
    landmark: decodeBytes(d.landmark),
    flags: decodeBytes(d.flags),
    routes: d.routes,
    customers: new Uint16Array(n),
    vegetation: new Uint8Array(n),
    variant: new Uint8Array(n),
    councils: d.councils,
  };
  fillDerivedLayers(map);
  return map;
}
