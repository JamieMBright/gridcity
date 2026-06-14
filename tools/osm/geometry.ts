// Pure tile-space rasterisers: turn projected OSM geometry (polylines and
// polygons, already in fractional tile coordinates) into tile stamps via a
// `plot(x, y)` callback. Renderer-agnostic and side-effect-free, so they
// are unit-tested directly. A tile (ix, iy) is considered covered when the
// geometry contains its CENTRE (ix + 0.5, iy + 0.5) — matching how the
// hand-built London map samples tiles.

export type Pt = [number, number];
export type Ring = Pt[];
/** A polygon is an outer ring followed by zero or more hole rings. */
export type Polygon = Ring[];

export type Plot = (x: number, y: number) => void;

export interface IntBounds {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Integer tile bounding box of a set of rings, clamped to the grid. */
export function ringsBounds(rings: Ring[], gridW: number, gridH: number): IntBounds | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const ring of rings) {
    for (const [x, y] of ring) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (!Number.isFinite(minX)) return null;
  const x0 = Math.max(0, Math.floor(minX));
  const y0 = Math.max(0, Math.floor(minY));
  const x1 = Math.min(gridW - 1, Math.ceil(maxX));
  const y1 = Math.min(gridH - 1, Math.ceil(maxY));
  if (x1 < x0 || y1 < y0) return null;
  return { x0, y0, x1, y1 };
}

/**
 * Non-zero-winding scanline fill of a polygon (outer ring + holes), in tile
 * space. Stamps every tile whose centre lies inside. The winding rule lets
 * the outer and hole rings carry opposite orientations OR be passed in any
 * orientation (a hole simply re-crosses the scanline, toggling coverage),
 * which is robust to OSM multipolygon member ordering.
 */
export function fillPolygonTiles(poly: Polygon, gridW: number, gridH: number, plot: Plot): void {
  const all = poly.filter((r) => r.length >= 3);
  if (all.length === 0) return;
  const b = ringsBounds(all, gridW, gridH);
  if (!b) return;
  // collect all edges once
  const edges: Array<{ ax: number; ay: number; bx: number; by: number }> = [];
  for (const ring of all) {
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i]!;
      const c = ring[(i + 1) % ring.length]!;
      if (a[1] !== c[1]) edges.push({ ax: a[0], ay: a[1], bx: c[0], by: c[1] });
    }
  }
  const xs: number[] = [];
  for (let iy = b.y0; iy <= b.y1; iy++) {
    const yc = iy + 0.5;
    xs.length = 0;
    for (const e of edges) {
      const { ay, by } = e;
      // half-open interval [min, max) so shared vertices aren't double-counted
      if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) {
        const t = (yc - ay) / (by - ay);
        xs.push(e.ax + t * (e.bx - e.ax));
      }
    }
    if (xs.length < 2) continue;
    xs.sort((p, q) => p - q);
    // even-odd pairing (equivalent to non-zero for simple closed rings)
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const sx = Math.max(b.x0, Math.ceil((xs[k] ?? 0) - 0.5));
      const ex = Math.min(b.x1, Math.floor((xs[k + 1] ?? 0) - 0.5));
      for (let ix = sx; ix <= ex; ix++) plot(ix, iy);
    }
  }
}

/** True if (px,py) is inside the polygon (outer + holes), even-odd rule. */
export function pointInPolygon(poly: Polygon, px: number, py: number): boolean {
  let inside = false;
  for (const ring of poly) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i]!;
      const c = ring[j]!;
      const yi = a[1];
      const yj = c[1];
      if (yi > py !== yj > py) {
        const xint = ((c[0] - a[0]) * (py - yi)) / (yj - yi) + a[0];
        if (px < xint) inside = !inside;
      }
    }
  }
  return inside;
}

/**
 * Stamp every tile within `halfWidth` tiles of a polyline. Walks each
 * segment in sub-tile steps and stamps a filled disk, so corners stay
 * connected and thin diagonal roads never leak gaps.
 */
export function strokePolylineTiles(
  pts: Pt[],
  halfWidth: number,
  gridW: number,
  gridH: number,
  plot: Plot,
): void {
  if (pts.length < 2) {
    if (pts.length === 1) stampDisk(pts[0]![0], pts[0]![1], halfWidth, gridW, gridH, plot);
    return;
  }
  const r = Math.max(0, halfWidth);
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i]!;
    const c = pts[i + 1]!;
    const dx = c[0] - a[0];
    const dy = c[1] - a[1];
    const len = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(len * 2));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      stampDisk(a[0] + dx * t, a[1] + dy * t, r, gridW, gridH, plot);
    }
  }
}

function stampDisk(cx: number, cy: number, r: number, gridW: number, gridH: number, plot: Plot): void {
  if (r < 0.5) {
    const ix = Math.round(cx - 0.5);
    const iy = Math.round(cy - 0.5);
    if (ix >= 0 && ix < gridW && iy >= 0 && iy < gridH) plot(ix, iy);
    return;
  }
  const x0 = Math.max(0, Math.floor(cx - r - 0.5));
  const x1 = Math.min(gridW - 1, Math.ceil(cx + r - 0.5));
  const y0 = Math.max(0, Math.floor(cy - r - 0.5));
  const y1 = Math.min(gridH - 1, Math.ceil(cy + r - 0.5));
  const r2 = r * r;
  for (let iy = y0; iy <= y1; iy++) {
    for (let ix = x0; ix <= x1; ix++) {
      const ddx = ix + 0.5 - cx;
      const ddy = iy + 0.5 - cy;
      if (ddx * ddx + ddy * ddy <= r2) plot(ix, iy);
    }
  }
}

/** Polygon area in tile² (shoelace, absolute) of the OUTER ring. */
export function ringArea(ring: Ring): number {
  let a = 0;
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i]!;
    const q = ring[(i + 1) % ring.length]!;
    a += p[0] * q[1] - q[0] * p[1];
  }
  return Math.abs(a) / 2;
}

/**
 * Ramer–Douglas–Peucker path simplification (tolerance in tiles). OSM road
 * ways carry far more vertices than a stylised ribbon needs; thinning them
 * keeps the vector layer cheap without visibly changing the curve.
 */
export function simplifyPath(pts: Pt[], tol: number): Pt[] {
  if (pts.length <= 2) return pts.slice();
  const first = pts[0]!;
  const last = pts[pts.length - 1]!;
  let maxD = 0;
  let idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perpDist(pts[i]!, first, last);
    if (d > maxD) {
      maxD = d;
      idx = i;
    }
  }
  if (maxD > tol) {
    const left = simplifyPath(pts.slice(0, idx + 1), tol);
    const right = simplifyPath(pts.slice(idx), tol);
    return [...left.slice(0, -1), ...right];
  }
  return [first, last];
}

function perpDist(p: Pt, a: Pt, b: Pt): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  return Math.abs((p[0] - a[0]) * dy - (p[1] - a[1]) * dx) / len;
}

/** Centroid of a ring (vertex average — good enough for label/marker placement). */
export function ringCentroid(ring: Ring): Pt {
  let sx = 0;
  let sy = 0;
  for (const [x, y] of ring) {
    sx += x;
    sy += y;
  }
  const n = Math.max(1, ring.length);
  return [sx / n, sy / n];
}
