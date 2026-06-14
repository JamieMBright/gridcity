// OSM map-pipeline pure-geometry tests: projection (lon/lat → tile grid) and
// the tile rasterisers (polygon fill, polyline stroke, path simplify). These
// are the deterministic core the authoring tool is built on.

import { describe, expect, it } from 'vitest';
import {
  lonLatToMerc,
  mercToLonLat,
  projectorFromBbox,
  projectorFromCentre,
} from '../tools/osm/project';
import {
  fillPolygonTiles,
  pointInPolygon,
  ringArea,
  ringCentroid,
  simplifyPath,
  strokePolylineTiles,
  type Pt,
} from '../tools/osm/geometry';

describe('Web-Mercator projection', () => {
  it('round-trips lon/lat → merc → lon/lat', () => {
    for (const [lon, lat] of [
      [0, 51.5],
      [2.35, 48.85],
      [-0.1, 51.5],
      [151.2, -33.86],
    ] as const) {
      const [mx, my] = lonLatToMerc(lon, lat);
      const back = mercToLonLat(mx, my);
      expect(back.lon).toBeCloseTo(lon, 6);
      expect(back.lat).toBeCloseTo(lat, 6);
    }
  });

  it('maps the centre to the grid centre and north to the top', () => {
    const centre = { lon: 2.3484, lat: 48.8535 };
    const proj = projectorFromCentre(centre, 22, 256, 160);
    const [cx, cy] = proj.toTile(centre.lon, centre.lat);
    expect(cx).toBeCloseTo(128, 1);
    expect(cy).toBeCloseTo(80, 1);
    // a point due north of centre is higher up the grid (smaller ty)
    const [, ny] = proj.toTile(centre.lon, centre.lat + 0.05);
    expect(ny).toBeLessThan(cy);
    // a point due east is further right (larger tx)
    const [ex] = proj.toTile(centre.lon + 0.05, centre.lat);
    expect(ex).toBeGreaterThan(cx);
  });

  it('projectorFromCentre fills the grid edge-to-edge with matched aspect', () => {
    const proj = projectorFromCentre({ lon: 0, lat: 51.5 }, 24, 256, 160);
    const b = proj.bbox();
    const [x0] = proj.toTile(b.minLon, b.minLat);
    const [x1] = proj.toTile(b.maxLon, b.maxLat);
    expect(x0).toBeCloseTo(0, 1);
    expect(x1).toBeCloseTo(256, 1);
    // a tile is a sensible real-world size (tens to low hundreds of metres)
    expect(proj.metresPerTile()).toBeGreaterThan(20);
    expect(proj.metresPerTile()).toBeLessThan(500);
  });

  it('projectorFromBbox letterboxes a bbox inside the grid', () => {
    const proj = projectorFromBbox(
      { minLon: 2.2, minLat: 48.8, maxLon: 2.5, maxLat: 48.9 },
      256,
      160,
    );
    const [cx, cy] = proj.toTile(2.35, 48.85);
    expect(cx).toBeGreaterThan(40);
    expect(cx).toBeLessThan(216);
    expect(cy).toBeGreaterThan(20);
    expect(cy).toBeLessThan(140);
  });
});

describe('tile rasterisers', () => {
  it('fills a square polygon by tile centres', () => {
    const ring: Pt[] = [
      [2, 2],
      [10, 2],
      [10, 10],
      [2, 10],
    ];
    let count = 0;
    let minX = 99;
    let maxX = -1;
    fillPolygonTiles([ring], 64, 64, (x) => {
      count++;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
    });
    expect(count).toBe(64); // tiles 2..9 × 2..9
    expect(minX).toBe(2);
    expect(maxX).toBe(9);
  });

  it('respects a hole (even-odd) in a polygon', () => {
    const outer: Pt[] = [
      [0, 0],
      [12, 0],
      [12, 12],
      [0, 12],
    ];
    const hole: Pt[] = [
      [4, 4],
      [8, 4],
      [8, 8],
      [4, 8],
    ];
    let withHole = 0;
    fillPolygonTiles([outer, hole], 32, 32, () => withHole++);
    let solid = 0;
    fillPolygonTiles([outer], 32, 32, () => solid++);
    expect(withHole).toBeLessThan(solid);
    expect(solid - withHole).toBe(16); // the 4×4 hole
  });

  it('clips fills to the grid bounds', () => {
    const ring: Pt[] = [
      [-5, -5],
      [5, -5],
      [5, 5],
      [-5, 5],
    ];
    let maxX = -1;
    let minX = 99;
    fillPolygonTiles([ring], 8, 8, (x) => {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
    });
    expect(minX).toBeGreaterThanOrEqual(0);
    expect(maxX).toBeLessThan(8);
  });

  it('pointInPolygon agrees with a known square', () => {
    const sq: Pt[] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ];
    expect(pointInPolygon([sq], 5, 5)).toBe(true);
    expect(pointInPolygon([sq], 15, 5)).toBe(false);
  });

  it('strokes a polyline into a connected band', () => {
    const pts: Pt[] = [
      [2, 2],
      [2, 30],
    ];
    const hit = new Set<number>();
    strokePolylineTiles(pts, 0.6, 64, 64, (x, y) => hit.add(y * 64 + x));
    // every row between the endpoints is covered (no gaps)
    for (let y = 3; y <= 29; y++) expect(hit.has(y * 64 + 2)).toBe(true);
  });

  it('simplifyPath drops collinear vertices but keeps the shape', () => {
    const line: Pt[] = [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
      [3, 5],
    ];
    const out = simplifyPath(line, 0.2);
    expect(out.length).toBeLessThan(line.length);
    expect(out[0]).toEqual([0, 0]);
    expect(out[out.length - 1]).toEqual([3, 5]);
  });

  it('ringArea and ringCentroid of a unit-ish square', () => {
    const sq: Pt[] = [
      [0, 0],
      [4, 0],
      [4, 4],
      [0, 4],
    ];
    expect(ringArea(sq)).toBeCloseTo(16, 6);
    const c = ringCentroid(sq);
    expect(c[0]).toBeCloseTo(2, 6);
    expect(c[1]).toBeCloseTo(2, 6);
  });
});
