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

export const CELL_W = 128;
export const CELL_H = 224;
export const FLOOR_H = 64;
/** Screen-y of the floor diamond's centre within a cell. */
export const FLOOR_CY = CELL_H - FLOOR_H / 2;
export const FLOOR_CX = CELL_W / 2;

export const SUN_WARM = hex('#ffb066');
export const DUSK_COOL = hex('#3a2b50');
export const SHADOW = hex('#2e2240');

/** Project tile-local (u,v,z) to cell pixel coordinates. */
export function P(u: number, v: number, z = 0): Pt {
  return [FLOOR_CX + (u - v) * (CELL_W / 2), FLOOR_CY + (u + v - 1) * (FLOOR_H / 2) - z];
}

/** Warm-lit version of a colour (sun side). */
export function lit(c: RGBA, t = 0.18): RGBA {
  return mix(lighten(c, t), SUN_WARM, 0.12);
}

/** Dusk-shaded version of a colour (away from sun). */
export function shaded(c: RGBA, t = 0.3): RGBA {
  return mix(darken(c, t), DUSK_COOL, 0.18);
}

/** Brightest top-face version. */
export function top(c: RGBA, t = 0.28): RGBA {
  return mix(lighten(c, t), SUN_WARM, 0.08);
}

export class Iso {
  r: Raster;

  constructor() {
    this.r = new Raster(CELL_W, CELL_H);
  }

  /** Flat quad on the ground or at height z. */
  quad(u0: number, v0: number, u1: number, v1: number, z: number, c: RGBA, shadeTo?: RGBA): void {
    this.r.poly([P(u0, v0, z), P(u1, v0, z), P(u1, v1, z), P(u0, v1, z)], c, shadeTo);
  }

  /** Full floor diamond. */
  floor(c: RGBA, shadeTo?: RGBA): void {
    this.quad(0, 0, 1, 1, 0, c, shadeTo);
  }

  /** Soft shadow cast from a footprint toward screen lower-left. */
  shadow(u0: number, v0: number, u1: number, v1: number, len = 0.16, a = 0.2): void {
    this.r.poly(
      [P(u0, v0 + 0.02), P(u1, v0 + 0.02), P(u1, v1 + len), P(u0 + len * 0.4, v1 + len)],
      alpha(SHADOW, a),
    );
  }

  /** Extruded box from z0 up to z1: left+right walls and top. */
  box(
    u0: number,
    v0: number,
    u1: number,
    v1: number,
    z0: number,
    z1: number,
    c: RGBA,
    opts: { topC?: RGBA; leftC?: RGBA; rightC?: RGBA } = {},
  ): void {
    const leftC = opts.leftC ?? shaded(c);
    const rightC = opts.rightC ?? lit(c);
    const topC = opts.topC ?? top(c);
    // left wall: edge (u0,v1)-(u1,v1)
    this.r.poly([P(u0, v1, z1), P(u1, v1, z1), P(u1, v1, z0), P(u0, v1, z0)], leftC);
    // right wall: edge (u1,v0)-(u1,v1)
    this.r.poly([P(u1, v0, z1), P(u1, v1, z1), P(u1, v1, z0), P(u1, v0, z0)], rightC);
    // top
    this.quad(u0, v0, u1, v1, z1, topC);
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
      this.r.poly([P(u0, v0, z0), P(u1, v0, z0), P(u1, vm, z0 + rise), P(u0, vm, z0 + rise)], top(c, 0.34));
      // near slope
      this.r.poly([P(u0, vm, z0 + rise), P(u1, vm, z0 + rise), P(u1, v1, z0), P(u0, v1, z0)], lit(c, 0.06));
      // gable end (right): triangle on the u1 face
      this.r.poly([P(u1, v0, z0), P(u1, vm, z0 + rise), P(u1, v1, z0)], lit(wallC));
    } else {
      const um = (u0 + u1) / 2;
      this.r.poly([P(u0, v0, z0), P(um, v0, z0 + rise), P(um, v1, z0 + rise), P(u0, v1, z0)], top(c, 0.34));
      this.r.poly([P(um, v0, z0 + rise), P(u1, v0, z0), P(u1, v1, z0), P(um, v1, z0 + rise)], lit(c, 0.06));
      // gable end (left): triangle on the v1 face
      this.r.poly([P(u0, v1, z0), P(um, v1, z0 + rise), P(u1, v1, z0)], shaded(wallC, 0.18));
    }
  }

  /** Hip (pyramid) roof: two visible triangular faces. */
  hip(u0: number, v0: number, u1: number, v1: number, z0: number, rise: number, c: RGBA): void {
    const um = (u0 + u1) / 2;
    const vm = (v0 + v1) / 2;
    const apex = P(um, vm, z0 + rise);
    this.r.poly([P(u0, v1, z0), P(u1, v1, z0), apex], shaded(c, 0.12)); // left face
    this.r.poly([P(u1, v0, z0), P(u1, v1, z0), apex], lit(c, 0.1)); // right face
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
          [P(a - 0.015, v, zTop + 1.5), P(b + 0.015, v, zTop + 1.5), P(b + 0.015, v, zBottom - 1.5), P(a - 0.015, v, zBottom - 1.5)],
          frame,
        );
      }
      this.r.poly([P(a, v, zTop), P(b, v, zTop), P(b, v, zBottom), P(a, v, zBottom)], glass);
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
          [P(u, a - 0.015, zTop + 1.5), P(u, b + 0.015, zTop + 1.5), P(u, b + 0.015, zBottom - 1.5), P(u, a - 0.015, zBottom - 1.5)],
          frame,
        );
      }
      this.r.poly([P(u, a, zTop), P(u, b, zTop), P(u, b, zBottom), P(u, a, zBottom)], glass);
    }
  }

  /** Low-poly conifer: faceted cone (two shades) + stub trunk. */
  cone(u: number, v: number, rad: number, hgt: number, c: RGBA, z0 = 0): void {
    this.shadow(u - rad * 0.6, v - rad * 0.2, u + rad * 0.6, v + rad * 0.5, rad * 1.2, 0.16);
    const trunk = hex('#6f4a33');
    this.box(u - 0.015, v - 0.015, u + 0.015, v + 0.015, z0, z0 + hgt * 0.18, trunk);
    const apex = P(u, v, z0 + hgt);
    const L = P(u - rad, v + rad, z0 + hgt * 0.12);
    const Btm = P(u + rad * 0.7, v + rad * 0.7, z0 + hgt * 0.06);
    const Rgt = P(u + rad, v - rad, z0 + hgt * 0.12);
    this.r.poly([apex, L, Btm], shaded(c, 0.18));
    this.r.poly([apex, Btm, Rgt], lit(c, 0.08));
  }

  /** Low-poly broadleaf: faceted ball (three shades) + trunk. */
  ball(u: number, v: number, rad: number, hgt: number, c: RGBA, z0 = 0): void {
    this.shadow(u - rad * 0.6, v - rad * 0.2, u + rad * 0.6, v + rad * 0.5, rad * 1.1, 0.16);
    const trunk = hex('#6f4a33');
    this.box(u - 0.018, v - 0.018, u + 0.018, v + 0.018, z0, z0 + hgt * 0.3, trunk);
    const zc = z0 + hgt * 0.62;
    const R = rad * (CELL_W / 2);
    const ZR = hgt * 0.42;
    const [cx, cy] = P(u, v, zc);
    const hexPts = (s: number): Pt[] => {
      const pts: Pt[] = [];
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i + Math.PI / 6;
        pts.push([cx + Math.cos(a) * R * s, cy + Math.sin(a) * ZR * s]);
      }
      return pts;
    };
    this.r.poly(hexPts(1), shaded(c, 0.16));
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
