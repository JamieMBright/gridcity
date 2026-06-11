// Pure-TS vector rasterizer for the tile art: polygon scanline fill with
// 2x supersampling (clean anti-aliased edges, no pixel-art look), linear
// gradients, and alpha compositing. Works identically in browser, worker
// and Node — the whole art style is code.

export type RGBA = [number, number, number, number];

export function hex(h: string, a = 1): RGBA {
  return [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
    Math.round(a * 255),
  ];
}

export function mix(a: RGBA, b: RGBA, t: number): RGBA {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
    Math.round(a[3] + (b[3] - a[3]) * t),
  ];
}

export function lighten(c: RGBA, t: number): RGBA {
  return mix(c, [255, 255, 255, c[3]], t);
}

export function darken(c: RGBA, t: number): RGBA {
  return mix(c, [0, 0, 0, c[3]], t);
}

export function alpha(c: RGBA, a: number): RGBA {
  return [c[0], c[1], c[2], Math.round(a * 255)];
}

export type Pt = [number, number];

const SS = 2; // supersampling factor

export class Raster {
  readonly w: number;
  readonly h: number;
  /** Supersampled RGBA buffer. */
  private buf: Float32Array;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.buf = new Float32Array(w * SS * h * SS * 4);
  }

  private blend(x: number, y: number, c: RGBA): void {
    const W = this.w * SS;
    if (x < 0 || x >= W || y < 0 || y >= this.h * SS) return;
    const o = (y * W + x) * 4;
    const sa = (c[3] ?? 255) / 255;
    if (sa <= 0) return;
    const da = this.buf[o + 3] ?? 0;
    const outA = sa + da * (1 - sa);
    if (outA <= 0) return;
    for (let i = 0; i < 3; i++) {
      const sc = c[i] ?? 0;
      const dc = this.buf[o + i] ?? 0;
      this.buf[o + i] = (sc * sa + dc * da * (1 - sa)) / outA;
    }
    this.buf[o + 3] = outA;
  }

  /** Fill polygon. `shade` optionally varies colour by 0..1 vertical
   *  position within the polygon's bounding box (cheap linear gradient). */
  poly(pts: Pt[], color: RGBA, shadeTo?: RGBA): void {
    if (pts.length < 3) return;
    const xs = pts.map((p) => p[0] * SS);
    const ys = pts.map((p) => p[1] * SS);
    const y0 = Math.max(0, Math.floor(Math.min(...ys)));
    const y1 = Math.min(this.h * SS - 1, Math.ceil(Math.max(...ys)));
    const bboxH = Math.max(1, Math.max(...ys) - Math.min(...ys));
    const yTop = Math.min(...ys);
    const n = pts.length;

    for (let y = y0; y <= y1; y++) {
      const yc = y + 0.5;
      const cuts: number[] = [];
      for (let i = 0; i < n; i++) {
        const xA = xs[i] ?? 0;
        const yA = ys[i] ?? 0;
        const xB = xs[(i + 1) % n] ?? 0;
        const yB = ys[(i + 1) % n] ?? 0;
        if (yA === yB) continue;
        if ((yc >= yA && yc < yB) || (yc >= yB && yc < yA)) {
          cuts.push(xA + ((yc - yA) / (yB - yA)) * (xB - xA));
        }
      }
      cuts.sort((a, b) => a - b);
      const rowColor = shadeTo ? mix(color, shadeTo, (yc - yTop) / bboxH) : color;
      for (let k = 0; k + 1 < cuts.length; k += 2) {
        const xa = Math.max(0, Math.round(cuts[k] ?? 0));
        const xb = Math.min(this.w * SS - 1, Math.round((cuts[k + 1] ?? 0) - 1));
        for (let x = xa; x <= xb; x++) this.blend(x, y, rowColor);
      }
    }
  }

  /** Convenience: axis-aligned rectangle. */
  rect(x0: number, y0: number, x1: number, y1: number, color: RGBA, shadeTo?: RGBA): void {
    this.poly(
      [
        [x0, y0],
        [x1, y0],
        [x1, y1],
        [x0, y1],
      ],
      color,
      shadeTo,
    );
  }

  /** Downsample to the final RGBA cell. */
  toPixels(): Uint8ClampedArray<ArrayBuffer> {
    const out = new Uint8ClampedArray(this.w * this.h * 4);
    const W = this.w * SS;
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        let r = 0;
        let g = 0;
        let b = 0;
        let a = 0;
        for (let dy = 0; dy < SS; dy++) {
          for (let dx = 0; dx < SS; dx++) {
            const o = ((y * SS + dy) * W + x * SS + dx) * 4;
            const pa = this.buf[o + 3] ?? 0;
            r += (this.buf[o] ?? 0) * pa;
            g += (this.buf[o + 1] ?? 0) * pa;
            b += (this.buf[o + 2] ?? 0) * pa;
            a += pa;
          }
        }
        const oo = (y * this.w + x) * 4;
        if (a > 0) {
          out[oo] = r / a;
          out[oo + 1] = g / a;
          out[oo + 2] = b / a;
          out[oo + 3] = (a / (SS * SS)) * 255;
        }
      }
    }
    return out;
  }
}
