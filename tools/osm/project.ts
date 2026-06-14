// Web-Mercator projection + tile-grid fitting for the OSM map pipeline.
//
// All geometry from OSM arrives as lon/lat (WGS84). The game world is a
// flat tile grid (width × height, row-major, y increasing SOUTH like a
// screen). We project lon/lat to Web-Mercator metres (the same projection
// every slippy map uses, so shapes look "right"), then affine-fit a
// metric bounding box to the tile grid. Over a ~25 km city the Mercator
// scale distortion is sub-pixel, so a single uniform fit keeps rivers,
// roads and footprints in agreement.
//
// This module is PURE (no I/O) so it is unit-tested directly.

/** WGS84 semi-major axis (the Web-Mercator sphere radius), metres. */
export const EARTH_R = 6378137;
const DEG = Math.PI / 180;

export interface LonLat {
  lon: number;
  lat: number;
}

export interface Bbox {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
}

/** Web-Mercator metres, y pointing NORTH (standard EPSG:3857 sign). */
export function lonLatToMerc(lon: number, lat: number): [number, number] {
  const x = EARTH_R * lon * DEG;
  const clamped = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const y = EARTH_R * Math.log(Math.tan(Math.PI / 4 + (clamped * DEG) / 2));
  return [x, y];
}

/** Inverse of {@link lonLatToMerc}. */
export function mercToLonLat(x: number, y: number): LonLat {
  const lon = x / (EARTH_R * DEG);
  const lat = (2 * Math.atan(Math.exp(y / EARTH_R)) - Math.PI / 2) / DEG;
  return { lon, lat };
}

/** Metres per degree of longitude at a given latitude (for span sizing). */
export function metresPerLon(lat: number): number {
  return EARTH_R * DEG * Math.cos(lat * DEG);
}

/**
 * Maps lon/lat → fractional tile coordinates for a fixed Mercator window.
 * Tile (0,0) is the NW corner of the window; tx grows east, ty grows south.
 */
export class TileProjector {
  constructor(
    readonly mercMinX: number,
    readonly mercMaxX: number,
    readonly mercMinY: number,
    readonly mercMaxY: number,
    readonly gridW: number,
    readonly gridH: number,
  ) {}

  /** lon/lat → fractional tile (tx east, ty south). */
  toTile(lon: number, lat: number): [number, number] {
    const [mx, my] = lonLatToMerc(lon, lat);
    const tx = ((mx - this.mercMinX) / (this.mercMaxX - this.mercMinX)) * this.gridW;
    // north (max merc y) maps to the TOP of the grid (ty = 0)
    const ty = ((this.mercMaxY - my) / (this.mercMaxY - this.mercMinY)) * this.gridH;
    return [tx, ty];
  }

  /** The lon/lat geographic bounds of this window (for the Overpass query). */
  bbox(): Bbox {
    const sw = mercToLonLat(this.mercMinX, this.mercMinY);
    const ne = mercToLonLat(this.mercMaxX, this.mercMaxY);
    return { minLon: sw.lon, minLat: sw.lat, maxLon: ne.lon, maxLat: ne.lat };
  }

  /** Metres covered by one tile, east-west (≈ the world scale of a tile). */
  metresPerTile(): number {
    return (this.mercMaxX - this.mercMinX) / this.gridW;
  }
}

/**
 * Build a projector centred on a lon/lat covering `spanKmX` east-west, with
 * the Mercator window aspect-matched to the tile grid so the projected city
 * fills it edge-to-edge (no letterboxing, no cropping of a matched bbox).
 */
export function projectorFromCentre(
  centre: LonLat,
  spanKmX: number,
  gridW: number,
  gridH: number,
): TileProjector {
  const [cx, cy] = lonLatToMerc(centre.lon, centre.lat);
  // span at the centre latitude → Mercator metres (Mercator stretches by
  // 1/cos(lat); the same factor applies to both axes so aspect is preserved)
  const stretch = 1 / Math.cos(centre.lat * DEG);
  const halfX = (spanKmX * 1000 * stretch) / 2;
  const halfY = halfX * (gridH / gridW);
  return new TileProjector(cx - halfX, cx + halfX, cy - halfY, cy + halfY, gridW, gridH);
}

/**
 * Build a projector that fits an arbitrary geographic bbox INSIDE the grid
 * (letterboxed, centred, preserving Mercator aspect). Used when a caller
 * wants to honour a geocoder's exact bounds rather than a fixed span.
 */
export function projectorFromBbox(
  bbox: Bbox,
  gridW: number,
  gridH: number,
  marginFrac = 0.04,
): TileProjector {
  const [x0, y0] = lonLatToMerc(bbox.minLon, bbox.minLat);
  const [x1, y1] = lonLatToMerc(bbox.maxLon, bbox.maxLat);
  const bw = x1 - x0;
  const bh = y1 - y0;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  // scale so the bbox fits inside the grid with a margin (fit-inside = max
  // of the two required half-extents)
  const m = 1 + marginFrac * 2;
  const halfX = Math.max(bw, (bh * gridW) / gridH) * 0.5 * m;
  const halfY = halfX * (gridH / gridW);
  return new TileProjector(cx - halfX, cx + halfX, cy - halfY, cy + halfY, gridW, gridH);
}
