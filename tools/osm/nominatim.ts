// Geocode a place name → centre + bounding box, via OSM Nominatim.

import { cachedFetchJson } from './net';
import type { Bbox, LonLat } from './project';

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  /** [south, north, west, east] as strings. */
  boundingbox: [string, string, string, string];
  type?: string;
  class?: string;
  importance?: number;
}

export interface GeocodeResult {
  centre: LonLat;
  bbox: Bbox;
  displayName: string;
}

export async function geocode(query: string): Promise<GeocodeResult> {
  const url =
    'https://nominatim.openstreetmap.org/search?' +
    new URLSearchParams({ q: query, format: 'jsonv2', limit: '1' }).toString();
  const results = await cachedFetchJson<NominatimResult[]>(url, { label: `geocode ${query}` });
  const r = results[0];
  if (!r) throw new Error(`Nominatim found nothing for "${query}"`);
  const [south, north, west, east] = r.boundingbox.map(Number) as [number, number, number, number];
  return {
    centre: { lon: Number(r.lon), lat: Number(r.lat) },
    bbox: { minLon: west, minLat: south, maxLon: east, maxLat: north },
    displayName: r.display_name,
  };
}
