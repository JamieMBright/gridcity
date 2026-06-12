// Isometric (2:1 dimetric) construction kit on top of the vector Raster.
// World cells are CELL_W x CELL_H; the floor diamond occupies the bottom
// FLOOR_H rows. Tile-local coordinates (u, v) run 0..1 across the diamond
// (u toward screen lower-right, v toward screen lower-left); z is height
// in pixels.
//
// Lighting model (lofi sunset): sun low in the south-east — tops brightest
// and warm, right (east) faces lit, left (south-west) faces in cool shade,
// soft translucent shadows cast to the north-west... flipped on screen as:
// right face warm-lit, left face dusk-shaded, shadow toward lower-left.

import { alpha, darken, hex, lighten, mix, Raster, type Pt, type RGBA } from './raster';

/** Resolution multiplier over the original 128px cell — sprites render at
 *  2x so close zoom stays sharp instead of going soft and pixely. Heights
 *  (z) in sprite code stay in original-pixel units; P() scales them. */
export const RES = 2;
export const CELL_W = 128 * RES;
export const CELL_H = 224 * RES;
export const FLOOR_H = 64 * RES;
/** Screen-y of the floor diamond's centre within a cell. */
export const FLOOR_CY = CELL_H - FLOOR_H / 2;
export const FLOOR_CX = CELL_W / 2;

export const SUN_WARM = hex('#ffb066');
export const DUSK_COOL = hex('#3a2b50');
export const SHADOW = hex('#2e2240');
/** The drawing ink: every form gets a crisp dark contour line. */
export const INK = alpha(hex('#241c38'), 0.85);
/** Contour width in device pixels at full sprite resolution. */
export const INK_W = 1.1 * RES;

/** Project tile-local (u,v,z) to cell pixel coordinates. */
export function P(u: number, v: number, z = 0): Pt {
  return [FLOOR_CX + (u - v) * (CELL_W / 2), FLOOR_CY + (u + v - 1) * (FLOOR_H / 2) - z * RES];
}

/** Warm-lit version of a colour (sun side). */
export function lit(c: RGBA, t = 0.18): RGBA {
  return mix(lighten(c, t), SUN_WARM, 0.17);
}

/** Dusk-shaded version of a colour (away from sun). */
export function shaded(c: RGBA, t = 0.3): RGBA {
  return mix(darken(c, t), DUSK_COOL, 0.25);
}

/** Brightest top-face version. */
export function top(c: RGBA, t = 0.28): RGBA {
  return mix(lighten(c, t), SUN_WARM, 0.12);
}

/** Raster size of a standard (north-corner anchored) multi-tile sprite. */
export function isoDims(wTiles: number, hTiles: number): { w: number; h: number } {
  return {
    w: ((wTiles + hTiles) * CELL_W) / 2,
    h: ((wTiles + hTiles) * FLOOR_H) / 2 + (CELL_H - FLOOR_H),
  };
}

/** Raster size of an SW-anchored multi-tile sprite: the projection shift
 *  means nothing can land below the block's bottom corner, so the canvas
 *  is trimmed to CELL_H + (wTiles-1) half-floors — keeps the atlas lean. */
export function swAnchorDims(wTiles: number, hTiles: number): { w: number; h: number } {
  return {
    w: ((wTiles + hTiles) * CELL_W) / 2,
    h: CELL_H + ((wTiles - 1) * FLOOR_H) / 2,
  };
}

export class Iso {
  r: Raster;
  /** Footprint in tiles: u runs 0..wTiles, v runs 0..hTiles. */
  readonly wTiles: number;
  readonly hTiles: number;
  /** Vertical projection shift (sw-anchored multi-tile sprites). */
  private readonly yOff: number;

  constructor(wTiles = 1, hTiles = 1, opts: { swAnchor?: boolean } = {}) {
    this.wTiles = wTiles;
    this.hTiles = hTiles;
    // SW anchoring: shift the footprint up so that footprint tile
    // (0, hTiles-1) — the block's south-west corner — sits exactly where
    // a 1x1 sprite's floor diamond would. The standard structure placement
    // (top-left = tileCentre + (-CELL_W/2, FLOOR_H/2 - CELL_H)) used by
    // both MapRenderer.paintTile and tools/preview then pins the whole
    // multi-tile sprite correctly when the chooser emits it on the block's
    // (min x, max y) tile. No renderer special-casing needed.
    this.yOff = opts.swAnchor ? -((hTiles - 1) * FLOOR_H) / 2 : 0;
    const dims = opts.swAnchor ? swAnchorDims(wTiles, hTiles) : isoDims(wTiles, hTiles);
    this.r = new Raster(dims.w, dims.h);
  }

  /** Project tile-local (u,v,z) to this sprite's pixel coordinates.
   *  For a 1x1 footprint this is exactly the module-level P(). */
  P(u: number, v: number, z = 0): Pt {
    return [
      this.hTiles * (CELL_W / 2) + (u - v) * (CELL_W / 2),
      CELL_H - FLOOR_H + (u + v) * (FLOOR_H / 2) + this.yOff - z * RES,
    ];
  }

  /** Flat quad on the ground or at height z. */
  quad(u0: number, v0: number, u1: number, v1: number, z: number, c: RGBA, shadeTo?: RGBA): void {
    this.r.poly([this.P(u0, v0, z), this.P(u1, v0, z), this.P(u1, v1, z), this.P(u0, v1, z)], c, shadeTo);
  }

  /** Full floor diamond. */
  floor(c: RGBA, shadeTo?: RGBA): void {
    this.quad(0, 0, this.wTiles, this.hTiles, 0, c, shadeTo);
  }

  /** Soft shadow cast from a footprint toward screen lower-left. */
  shadow(u0: number, v0: number, u1: number, v1: number, len = 0.16, a = 0.2): void {
    this.r.poly(
      [this.P(u0, v0 + 0.02), this.P(u1, v0 + 0.02), this.P(u1, v1 + len), this.P(u0 + len * 0.4, v1 + len)],
      alpha(SHADOW, a),
    );
  }

  /** Ink contour along a segment (the sharp-line drawing style). */
  edge(a: Pt, b: Pt, w = INK_W, c: RGBA = INK): void {
    this.r.line(a, b, w, c);
  }

  /** Extruded box from z0 up to z1: left+right walls and top, finished
   *  with ink contours on the silhouette and the facing corner. */
  box(
    u0: number,
    v0: number,
    u1: number,
    v1: number,
    z0: number,
    z1: number,
    c: RGBA,
    opts: { topC?: RGBA; leftC?: RGBA; rightC?: RGBA; ink?: boolean } = {},
  ): void {
    const leftC = opts.leftC ?? shaded(c);
    const rightC = opts.rightC ?? lit(c);
    const topC = opts.topC ?? top(c);
    // left wall: edge (u0,v1)-(u1,v1)
    this.r.poly([this.P(u0, v1, z1), this.P(u1, v1, z1), this.P(u1, v1, z0), this.P(u0, v1, z0)], leftC);
    // right wall: edge (u1,v0)-(u1,v1)
    this.r.poly([this.P(u1, v0, z1), this.P(u1, v1, z1), this.P(u1, v1, z0), this.P(u1, v0, z0)], rightC);
    // top
    this.quad(u0, v0, u1, v1, z1, topC);
    if (opts.ink !== false && z1 - z0 > 2) {
      // verticals: silhouette corners + the near corner between the walls
      this.edge(this.P(u0, v1, z1), this.P(u0, v1, z0));
      this.edge(this.P(u1, v1, z1), this.P(u1, v1, z0));
      this.edge(this.P(u1, v0, z1), this.P(u1, v0, z0));
      // top rim
      this.r.polyline([this.P(u0, v0, z1), this.P(u1, v0, z1), this.P(u1, v1, z1), this.P(u0, v1, z1)], INK_W, INK, true);
      // base line along the visible walls
      this.edge(this.P(u0, v1, z0), this.P(u1, v1, z0));
      this.edge(this.P(u1, v1, z0), this.P(u1, v0, z0));
    }
  }

  /** Gable roof over a footprint; ridge runs along the u axis (axis='u')
   *  or v axis. Visible: near slope + gable end triangle. */
  gable(
    u0: number,
    v0: number,
    u1: number,
    v1: number,
    z0: number,
    rise: number,
    axis: 'u' | 'v',
    c: RGBA,
    wallC: RGBA,
  ): void {
    if (axis === 'u') {
      const vm = (v0 + v1) / 2;
      // far slope (just visible above the ridge)
      this.r.poly([this.P(u0, v0, z0), this.P(u1, v0, z0), this.P(u1, vm, z0 + rise), this.P(u0, vm, z0 + rise)], top(c, 0.34));
      // near slope
      this.r.poly([this.P(u0, vm, z0 + rise), this.P(u1, vm, z0 + rise), this.P(u1, v1, z0), this.P(u0, v1, z0)], lit(c, 0.06));
      // gable end (right): triangle on the u1 face
      this.r.poly([this.P(u1, v0, z0), this.P(u1, vm, z0 + rise), this.P(u1, v1, z0)], lit(wallC));
      // ink: ridge, eaves and the gable rake
      this.edge(this.P(u0, vm, z0 + rise), this.P(u1, vm, z0 + rise));
      this.edge(this.P(u0, v1, z0), this.P(u1, v1, z0));
      this.r.polyline([this.P(u1, v0, z0), this.P(u1, vm, z0 + rise), this.P(u1, v1, z0)], INK_W, INK);
    } else {
      const um = (u0 + u1) / 2;
      this.r.poly([this.P(u0, v0, z0), this.P(um, v0, z0 + rise), this.P(um, v1, z0 + rise), this.P(u0, v1, z0)], top(c, 0.34));
      this.r.poly([this.P(um, v0, z0 + rise), this.P(u1, v0, z0), this.P(u1, v1, z0), this.P(um, v1, z0 + rise)], lit(c, 0.06));
      // gable end (left): triangle on the v1 face
      this.r.poly([this.P(u0, v1, z0), this.P(um, v1, z0 + rise), this.P(u1, v1, z0)], shaded(wallC, 0.18));
      this.edge(this.P(um, v0, z0 + rise), this.P(um, v1, z0 + rise));
      this.edge(this.P(u0, v1, z0), this.P(u1, v1, z0));
      this.r.polyline([this.P(u0, v1, z0), this.P(um, v1, z0 + rise), this.P(u1, v1, z0)], INK_W, INK);
    }
  }

  /** Hip (pyramid) roof: two visible triangular faces. */
  hip(u0: number, v0: number, u1: number, v1: number, z0: number, rise: number, c: RGBA): void {
    const um = (u0 + u1) / 2;
    const vm = (v0 + v1) / 2;
    const apex = this.P(um, vm, z0 + rise);
    this.r.poly([this.P(u0, v1, z0), this.P(u1, v1, z0), apex], shaded(c, 0.12)); // left face
    this.r.poly([this.P(u1, v0, z0), this.P(u1, v1, z0), apex], lit(c, 0.1)); // right face
    this.edge(this.P(u0, v1, z0), apex);
    this.edge(this.P(u1, v1, z0), apex);
    this.edge(this.P(u1, v0, z0), apex);
    this.edge(this.P(u0, v1, z0), this.P(u1, v1, z0));
    this.edge(this.P(u1, v1, z0), this.P(u1, v0, z0));
  }

  /** Vertical window strip on the LEFT wall (v=v1 edge) between u positions. */
  windowsLeft(
    v: number,
    uA: number,
    uB: number,
    zBottom: number,
    zTop: number,
    cols: number,
    glass: RGBA,
    frame?: RGBA,
  ): void {
    const du = (uB - uA) / cols;
    for (let i = 0; i < cols; i++) {
      const a = uA + du * i + du * 0.22;
      const b = uA + du * (i + 1) - du * 0.22;
      if (frame) {
        this.r.poly(
          [this.P(a - 0.015, v, zTop + 1.5), this.P(b + 0.015, v, zTop + 1.5), this.P(b + 0.015, v, zBottom - 1.5), this.P(a - 0.015, v, zBottom - 1.5)],
          frame,
        );
      }
      this.r.poly([this.P(a, v, zTop), this.P(b, v, zTop), this.P(b, v, zBottom), this.P(a, v, zBottom)], glass);
    }
  }

  /** Vertical window strip on the RIGHT wall (u=u1 edge) between v positions. */
  windowsRight(
    u: number,
    vA: number,
    vB: number,
    zBottom: number,
    zTop: number,
    cols: number,
    glass: RGBA,
    frame?: RGBA,
  ): void {
    const dv = (vB - vA) / cols;
    for (let i = 0; i < cols; i++) {
      const a = vA + dv * i + dv * 0.22;
      const b = vA + dv * (i + 1) - dv * 0.22;
      if (frame) {
        this.r.poly(
          [this.P(u, a - 0.015, zTop + 1.5), this.P(u, b + 0.015, zTop + 1.5), this.P(u, b + 0.015, zBottom - 1.5), this.P(u, a - 0.015, zBottom - 1.5)],
          frame,
        );
      }
      this.r.poly([this.P(u, a, zTop), this.P(u, b, zTop), this.P(u, b, zBottom), this.P(u, a, zBottom)], glass);
    }
  }

  /** Low-poly conifer: faceted cone (two shades) + stub trunk. */
  cone(u: number, v: number, rad: number, hgt: number, c: RGBA, z0 = 0): void {
    this.shadow(u - rad * 0.6, v - rad * 0.2, u + rad * 0.6, v + rad * 0.5, rad * 1.2, 0.16);
    const trunk = hex('#6f4a33');
    this.box(u - 0.015, v - 0.015, u + 0.015, v + 0.015, z0, z0 + hgt * 0.18, trunk);
    const apex = this.P(u, v, z0 + hgt);
    const L = this.P(u - rad, v + rad, z0 + hgt * 0.12);
    const Btm = this.P(u + rad * 0.7, v + rad * 0.7, z0 + hgt * 0.06);
    const Rgt = this.P(u + rad, v - rad, z0 + hgt * 0.12);
    this.r.poly([apex, L, Btm], shaded(c, 0.18));
    this.r.poly([apex, Btm, Rgt], lit(c, 0.08));
    this.r.polyline([L, apex, Rgt], INK_W * 0.8, alpha(INK, 0.6));
  }

  /** Low-poly broadleaf: faceted ball (three shades) + trunk. */
  ball(u: number, v: number, rad: number, hgt: number, c: RGBA, z0 = 0): void {
    this.shadow(u - rad * 0.6, v - rad * 0.2, u + rad * 0.6, v + rad * 0.5, rad * 1.1, 0.16);
    const trunk = hex('#6f4a33');
    this.box(u - 0.018, v - 0.018, u + 0.018, v + 0.018, z0, z0 + hgt * 0.3, trunk);
    const zc = z0 + hgt * 0.62;
    const R = rad * (CELL_W / 2);
    const ZR = hgt * 0.42 * RES;
    const [cx, cy] = this.P(u, v, zc);
    const hexPts = (s: number): Pt[] => {
      const pts: Pt[] = [];
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i + Math.PI / 6;
        pts.push([cx + Math.cos(a) * R * s, cy + Math.sin(a) * ZR * s]);
      }
      return pts;
    };
    this.r.poly(hexPts(1), shaded(c, 0.16));
    this.r.polyline(hexPts(1), INK_W * 0.8, alpha(INK, 0.55), true);
    // lit facet: offset smaller hexagon toward upper-right
    const litPts = hexPts(0.62).map(([x, y]): Pt => [x + R * 0.18, y - ZR * 0.22]);
    this.r.poly(litPts, lit(c, 0.1));
    const topPts = hexPts(0.32).map(([x, y]): Pt => [x + R * 0.26, y - ZR * 0.34]);
    this.r.poly(topPts, top(c, 0.3));
  }

  build(): Uint8ClampedArray<ArrayBuffer> {
    return this.r.toPixels();
  }
}
