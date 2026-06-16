// Shared raster toolkit for the ElectriCity app-icon CONCEPTS (icon-concepts-v2).
// A tiny software canvas (RGBA, straight-alpha over / additive blend) with the
// drawing vocabulary the brief needs: soft radial glows / hot-core BULBS (the
// same fairy-light atom the in-game heroLights.ts uses), thick glowing lines
// with bloom, polygon fill, an iOS "squircle" rounded-corner mask (the real
// continuous-curvature shape iOS uses, not a plain rounded rect), box-filter
// downscale for crisp small sizes, and home-screen backdrop compositing.
//
// PNG encoder is the proven one from tools/preview.ts (zlib deflate, CRC32).
// Everything renders at high RES then box-downscales -> clean anti-aliasing,
// exactly like the game's 2x art pipeline.

import { deflateSync, inflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

// ---------------------------------------------------------------- PNG codec ---

function crc32(buf: Uint8Array): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i] ?? 0;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

export function encodePng(width: number, height: number, rgba: Uint8ClampedArray): Buffer {
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, width);
  dv.setUint32(4, height);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  const raw = new Uint8Array(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), y * (width * 4 + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', new Uint8Array(0)),
  ]);
}

// ------------------------------------------------------------------- canvas ---

export interface Img {
  w: number;
  h: number;
  px: Uint8ClampedArray;
}

// --------------------------------------------------------------- PNG reader ---

/** Minimal PNG decoder (8-bit, colour types 2/6, no interlace) -- just enough
 *  to read the captured game-frame PNGs back in for Direction 1 cropping. */
export function decodePng(buf: Buffer): Img {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let p = 8;
  let w = 0;
  let h = 0;
  let colorType = 6;
  let bitDepth = 8;
  const idat: Buffer[] = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString('ascii', p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      bitDepth = data[8] ?? 8;
      colorType = data[9] ?? 6;
    } else if (type === 'IDAT') {
      idat.push(Buffer.from(data));
    } else if (type === 'IEND') {
      break;
    }
    p += 12 + len;
  }
  if (bitDepth !== 8 || (colorType !== 6 && colorType !== 2)) {
    throw new Error(`unsupported PNG (depth ${bitDepth}, colorType ${colorType})`);
  }
  const channels = colorType === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * channels;
  const out = new Uint8ClampedArray(w * h * 4);
  const prev = new Uint8Array(stride);
  const cur = new Uint8Array(stride);
  let ri = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[ri++] ?? 0;
    for (let x = 0; x < stride; x++) {
      const rawByte = raw[ri++] ?? 0;
      const a = x >= channels ? (cur[x - channels] ?? 0) : 0;
      const b = prev[x] ?? 0;
      const c = x >= channels ? (prev[x - channels] ?? 0) : 0;
      let v = rawByte;
      switch (filter) {
        case 1:
          v = rawByte + a;
          break;
        case 2:
          v = rawByte + b;
          break;
        case 3:
          v = rawByte + ((a + b) >> 1);
          break;
        case 4: {
          const pp = a + b - c;
          const pa = Math.abs(pp - a);
          const pb = Math.abs(pp - b);
          const pc = Math.abs(pp - c);
          v = rawByte + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
          break;
        }
        default:
          v = rawByte;
      }
      cur[x] = v & 0xff;
    }
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      out[o] = cur[x * channels] ?? 0;
      out[o + 1] = cur[x * channels + 1] ?? 0;
      out[o + 2] = cur[x * channels + 2] ?? 0;
      out[o + 3] = channels === 4 ? (cur[x * channels + 3] ?? 255) : 255;
    }
    prev.set(cur);
  }
  return { w, h, px: out };
}

export function newImg(w: number, h: number, bg = 0x00000000): Img {
  const px = new Uint8ClampedArray(w * h * 4);
  const r = (bg >>> 24) & 0xff;
  const g = (bg >>> 16) & 0xff;
  const b = (bg >>> 8) & 0xff;
  const a = bg & 0xff;
  for (let i = 0; i < w * h; i++) {
    px[i * 4] = r;
    px[i * 4 + 1] = g;
    px[i * 4 + 2] = b;
    px[i * 4 + 3] = a;
  }
  return { w, h, px };
}

/** sRGB hex -> [r,g,b] 0..255. */
export function rgb(hex: number): [number, number, number] {
  return [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff];
}

/** Lerp two 0xRRGGBB. */
export function mix(a: number, b: number, t: number): number {
  const k = t < 0 ? 0 : t > 1 ? 1 : t;
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  return (
    ((Math.round(ar + (br - ar) * k) << 16) |
      (Math.round(ag + (bg - ag) * k) << 8) |
      Math.round(ab + (bb - ab) * k)) >>>
    0
  );
}

/** Source-over a single pixel (straight alpha). */
function over(px: Uint8ClampedArray, o: number, r: number, g: number, b: number, a: number): void {
  if (a <= 0) return;
  const ia = 1 - a;
  px[o] = r * a + (px[o] ?? 0) * ia;
  px[o + 1] = g * a + (px[o + 1] ?? 0) * ia;
  px[o + 2] = b * a + (px[o + 2] ?? 0) * ia;
  px[o + 3] = a * 255 + (px[o + 3] ?? 0) * ia;
}

/** ADDITIVE blend (for glow/light layers -- light adds, it doesn't occlude). */
function add(px: Uint8ClampedArray, o: number, r: number, g: number, b: number, a: number): void {
  if (a <= 0) return;
  px[o] = Math.min(255, (px[o] ?? 0) + r * a);
  px[o + 1] = Math.min(255, (px[o + 1] ?? 0) + g * a);
  px[o + 2] = Math.min(255, (px[o + 2] ?? 0) + b * a);
  px[o + 3] = Math.min(255, (px[o + 3] ?? 0) + a * 255);
}

export type Blend = 'over' | 'add';

function put(img: Img, x: number, y: number, color: number, a: number, blend: Blend): void {
  const xi = x | 0;
  const yi = y | 0;
  if (xi < 0 || yi < 0 || xi >= img.w || yi >= img.h) return;
  const o = (yi * img.w + xi) * 4;
  const [r, g, b] = rgb(color);
  if (blend === 'add') add(img.px, o, r, g, b, a);
  else over(img.px, o, r, g, b, a);
}

/** Filled axis-aligned rectangle. */
export function fillRect(
  img: Img,
  x0: number,
  y0: number,
  w: number,
  h: number,
  color: number,
  a = 1,
  blend: Blend = 'over',
): void {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) put(img, x, y, color, a, blend);
  }
}

/** Vertical gradient fill of the whole image. */
export function fillVGrad(img: Img, top: number, bottom: number): void {
  for (let y = 0; y < img.h; y++) {
    const c = mix(top, bottom, y / Math.max(1, img.h - 1));
    for (let x = 0; x < img.w; x++) put(img, x, y, c, 1, 'over');
  }
}

/** A soft radial glow pool: smooth falloff, additive by default. */
export function radialGlow(
  img: Img,
  cx: number,
  cy: number,
  radius: number,
  color: number,
  a = 1,
  blend: Blend = 'add',
  falloff = 2.0,
): void {
  if (radius <= 0) return;
  const r0 = Math.max(0, Math.floor(cx - radius));
  const r1 = Math.min(img.w - 1, Math.ceil(cx + radius));
  const c0 = Math.max(0, Math.floor(cy - radius));
  const c1 = Math.min(img.h - 1, Math.ceil(cy + radius));
  const [r, g, b] = rgb(color);
  for (let y = c0; y <= c1; y++) {
    for (let x = r0; x <= r1; x++) {
      const d = Math.hypot(x - cx, y - cy) / radius;
      if (d >= 1) continue;
      const t = Math.pow(1 - d, falloff);
      const aa = a * t;
      const o = (y * img.w + x) * 4;
      if (blend === 'add') add(img.px, o, r, g, b, aa);
      else over(img.px, o, r, g, b, aa);
    }
  }
}

/** A fairy-light BULB: tight warm bloom + hot white core (the heroLights atom). */
export function bulb(
  img: Img,
  cx: number,
  cy: number,
  r: number,
  bloomColor: number,
  a = 1,
  coreColor = 0xfffef6,
): void {
  radialGlow(img, cx, cy, r * 3.0, bloomColor, a * 0.16, 'add', 2.3);
  radialGlow(img, cx, cy, r * 1.5, bloomColor, a * 0.6, 'add', 1.8);
  radialGlow(img, cx, cy, Math.max(0.8, r * 0.7), coreColor, Math.min(1, a * 1.0), 'add', 1.4);
}

/** A glowing thick line A->B: additive bloom sheath + bright warm core. */
export function glowLine(
  img: Img,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  coreW: number,
  bloomW: number,
  coreColor: number,
  bloomColor: number,
  a = 1,
): void {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(2, Math.ceil(len));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    radialGlow(img, x, y, bloomW, bloomColor, a * 0.14, 'add', 2.3);
    radialGlow(img, x, y, coreW * 1.8, bloomColor, a * 0.5, 'add', 1.8);
    radialGlow(img, x, y, coreW, coreColor, a * 0.95, 'add', 1.3);
  }
}

/** Crisp round-cap line (anti-aliased edge) -- the solid conductor / arcs. */
export function strokeLine(
  img: Img,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  width: number,
  color: number,
  a = 1,
  blend: Blend = 'over',
): void {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(2, Math.ceil(len * 1.5));
  const hr = width / 2;
  const [r, g, b] = rgb(color);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    const r0 = Math.max(0, Math.floor(x - hr - 1));
    const r1 = Math.min(img.w - 1, Math.ceil(x + hr + 1));
    const c0 = Math.max(0, Math.floor(y - hr - 1));
    const c1 = Math.min(img.h - 1, Math.ceil(y + hr + 1));
    for (let yy = c0; yy <= c1; yy++) {
      for (let xx = r0; xx <= r1; xx++) {
        const d = Math.hypot(xx - x, yy - y);
        if (d > hr + 0.6) continue;
        const edge = d <= hr - 0.6 ? 1 : 1 - (d - (hr - 0.6)) / 1.2;
        const o = (yy * img.w + xx) * 4;
        if (blend === 'add') add(img.px, o, r, g, b, a * edge);
        else over(img.px, o, r, g, b, a * edge);
      }
    }
  }
}

/** Filled polygon (even-odd scanline), straight-alpha over-composite. */
export function fillPoly(img: Img, pts: number[], color: number, a = 1, blend: Blend = 'over'): void {
  const n = pts.length >> 1;
  if (n < 3) return;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < n; i++) {
    const y = pts[i * 2 + 1] ?? 0;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const y0 = Math.max(0, Math.ceil(minY));
  const y1 = Math.min(img.h - 1, Math.floor(maxY));
  for (let y = y0; y <= y1; y++) {
    const xs: number[] = [];
    for (let i = 0; i < n; i++) {
      const ax = pts[i * 2] ?? 0;
      const ay = pts[i * 2 + 1] ?? 0;
      const bx = pts[((i + 1) % n) * 2] ?? 0;
      const by = pts[((i + 1) % n) * 2 + 1] ?? 0;
      if ((ay <= y && by > y) || (by <= y && ay > y)) {
        xs.push(ax + ((y - ay) / (by - ay)) * (bx - ax));
      }
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const sx = Math.max(0, Math.ceil(xs[k] ?? 0));
      const ex = Math.min(img.w - 1, Math.floor(xs[k + 1] ?? 0));
      for (let x = sx; x <= ex; x++) put(img, x, y, color, a, blend);
    }
  }
}

// ----------------------------------------------------------- iOS squircle ---

function squircleInside(x: number, y: number, s: number, n = 5): boolean {
  const ax = Math.abs(x) / s;
  const ay = Math.abs(y) / s;
  return Math.pow(ax, n) + Math.pow(ay, n) <= 1;
}

/** Apply the iOS squircle (continuous-corner) mask in place; AA edge. n~5 is
 *  the app-icon superellipse exponent. */
export function squircleMask(img: Img, n = 5): void {
  const s = img.w / 2;
  const cx = img.w / 2 - 0.5;
  const cy = img.h / 2 - 0.5;
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      const px = x - cx;
      const py = y - cy;
      const v = Math.pow(Math.abs(px) / s, n) + Math.pow(Math.abs(py) / s, n);
      let cover = 1;
      if (v > 1.0) {
        let hit = 0;
        for (const dx of [-0.3, 0.3]) {
          for (const dy of [-0.3, 0.3]) if (squircleInside(px + dx, py + dy, s, n)) hit++;
        }
        cover = hit / 4;
      }
      if (cover < 1) {
        const o = (y * img.w + x) * 4;
        img.px[o + 3] = (img.px[o + 3] ?? 0) * cover;
      }
    }
  }
}

// ------------------------------------------------------------- downscaling ---

/** Box-filter integer downscale (alpha-weighted area average). */
export function downscale(img: Img, f: number): Img {
  if (f <= 1) return img;
  const W = Math.floor(img.w / f);
  const H = Math.floor(img.h / f);
  const out = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let dy = 0; dy < f; dy++) {
        for (let dx = 0; dx < f; dx++) {
          const o = ((y * f + dy) * img.w + x * f + dx) * 4;
          const aa = img.px[o + 3] ?? 0;
          r += (img.px[o] ?? 0) * aa;
          g += (img.px[o + 1] ?? 0) * aa;
          b += (img.px[o + 2] ?? 0) * aa;
          a += aa;
        }
      }
      const oo = (y * W + x) * 4;
      if (a > 0) {
        out[oo] = r / a;
        out[oo + 1] = g / a;
        out[oo + 2] = b / a;
      }
      out[oo + 3] = a / (f * f);
    }
  }
  return { w: W, h: H, px: out };
}

/** Bilinear resample to an exact target size. */
export function resize(img: Img, W: number, H: number): Img {
  const out = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    const sy = ((y + 0.5) * img.h) / H - 0.5;
    const y0 = Math.max(0, Math.floor(sy));
    const y1 = Math.min(img.h - 1, y0 + 1);
    const fy = sy - y0;
    for (let x = 0; x < W; x++) {
      const sx = ((x + 0.5) * img.w) / W - 0.5;
      const x0 = Math.max(0, Math.floor(sx));
      const x1 = Math.min(img.w - 1, x0 + 1);
      const fx = sx - x0;
      const oo = (y * W + x) * 4;
      for (let c = 0; c < 4; c++) {
        const p00 = img.px[(y0 * img.w + x0) * 4 + c] ?? 0;
        const p10 = img.px[(y0 * img.w + x1) * 4 + c] ?? 0;
        const p01 = img.px[(y1 * img.w + x0) * 4 + c] ?? 0;
        const p11 = img.px[(y1 * img.w + x1) * 4 + c] ?? 0;
        const top = p00 + (p10 - p00) * fx;
        const bot = p01 + (p11 - p01) * fx;
        out[oo + c] = top + (bot - top) * fy;
      }
    }
  }
  return { w: W, h: H, px: out };
}

// ------------------------------------------------------------- compositing ---

/** Composite `src` (straight alpha) onto `dst` at (dx,dy), over-blend. */
export function blit(dst: Img, src: Img, dx: number, dy: number): void {
  for (let y = 0; y < src.h; y++) {
    for (let x = 0; x < src.w; x++) {
      const so = (y * src.w + x) * 4;
      const a = (src.px[so + 3] ?? 0) / 255;
      if (a <= 0) continue;
      put(
        dst,
        dx + x,
        dy + y,
        ((src.px[so] ?? 0) << 16) | ((src.px[so + 1] ?? 0) << 8) | (src.px[so + 2] ?? 0),
        a,
        'over',
      );
    }
  }
}

/** Drop a soft contact shadow then blit -- how an icon sits on a wallpaper. */
export function blitWithShadow(dst: Img, src: Img, dx: number, dy: number, shadow = 0.5): void {
  const off = Math.max(1, Math.round(src.h * 0.035));
  for (let y = 0; y < src.h; y++) {
    for (let x = 0; x < src.w; x++) {
      const so = (y * src.w + x) * 4;
      const a = (src.px[so + 3] ?? 0) / 255;
      if (a <= 0) continue;
      for (const [ox, oy, sa] of [
        [0, off, shadow * 0.5],
        [1, off + 2, shadow * 0.32],
        [-1, off + 4, shadow * 0.2],
      ] as const) {
        put(dst, dx + x + ox, dy + y + oy, 0x04060e, a * sa, 'over');
      }
    }
  }
  blit(dst, src, dx, dy);
}

export function save(img: Img, path: string): void {
  writeFileSync(path, encodePng(img.w, img.h, img.px));
}

/** A separable box blur (radius r, `passes` passes ~ Gaussian). Operates on
 *  RGB only (alpha left at 255) — used to build a bloom layer from extracted
 *  highlights. Cheap enough for the small icon canvases. */
export function boxBlur(img: Img, r: number, passes = 2): Img {
  const cur = new Float32Array(img.w * img.h * 3);
  for (let i = 0; i < img.w * img.h; i++) {
    cur[i * 3] = img.px[i * 4] ?? 0;
    cur[i * 3 + 1] = img.px[i * 4 + 1] ?? 0;
    cur[i * 3 + 2] = img.px[i * 4 + 2] ?? 0;
  }
  const W = img.w;
  const H = img.h;
  const tmp = new Float32Array(cur.length);
  const win = 2 * r + 1;
  for (let p = 0; p < passes; p++) {
    // horizontal
    for (let y = 0; y < H; y++) {
      for (let c = 0; c < 3; c++) {
        let acc = 0;
        for (let x = -r; x <= r; x++) acc += cur[(y * W + Math.min(W - 1, Math.max(0, x))) * 3 + c] ?? 0;
        for (let x = 0; x < W; x++) {
          tmp[(y * W + x) * 3 + c] = acc / win;
          const xa = Math.min(W - 1, x + r + 1);
          const xs = Math.max(0, x - r);
          acc += (cur[(y * W + xa) * 3 + c] ?? 0) - (cur[(y * W + xs) * 3 + c] ?? 0);
        }
      }
    }
    // vertical
    for (let x = 0; x < W; x++) {
      for (let c = 0; c < 3; c++) {
        let acc = 0;
        for (let y = -r; y <= r; y++) acc += tmp[(Math.min(H - 1, Math.max(0, y)) * W + x) * 3 + c] ?? 0;
        for (let y = 0; y < H; y++) {
          cur[(y * W + x) * 3 + c] = acc / win;
          const ya = Math.min(H - 1, y + r + 1);
          const ys = Math.max(0, y - r);
          acc += (tmp[(ya * W + x) * 3 + c] ?? 0) - (tmp[(ys * W + x) * 3 + c] ?? 0);
        }
      }
    }
  }
  const out = newImg(W, H);
  for (let i = 0; i < W * H; i++) {
    out.px[i * 4] = cur[i * 3] ?? 0;
    out.px[i * 4 + 1] = cur[i * 3 + 1] ?? 0;
    out.px[i * 4 + 2] = cur[i * 3 + 2] ?? 0;
    out.px[i * 4 + 3] = 255;
  }
  return out;
}

/** Perceptual-luma grayscale copy (the silhouette test). */
export function grayscale(img: Img): Img {
  const out = new Uint8ClampedArray(img.px.length);
  for (let i = 0; i < img.w * img.h; i++) {
    const r = img.px[i * 4] ?? 0;
    const g = img.px[i * 4 + 1] ?? 0;
    const b = img.px[i * 4 + 2] ?? 0;
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    out[i * 4] = l;
    out[i * 4 + 1] = l;
    out[i * 4 + 2] = l;
    out[i * 4 + 3] = img.px[i * 4 + 3] ?? 0;
  }
  return { w: img.w, h: img.h, px: out };
}

/** The ElectriCity palette (src/ui/theme.ts) + the heroLights fairy-light
 *  warm-light atoms, as numbers for the renderers. Single source of truth. */
export const PAL = {
  navy: 0x101630,
  navyLight: 0x1d2547,
  night: 0x0a0e22,
  orange: 0xff8a1e,
  orangeSoft: 0xffb066,
  slate: 0x8d97b4,
  offWhite: 0xf2efe8,
  dusk: 0x3a2b50,
  sunset: 0xe0697a,
  gold: 0xf5c469,
  // heroLights warm-light atoms
  fwhite: 0xfff3d6,
  fgold: 0xffce82,
  famber: 0xffb45e,
  ember: 0xff8a52,
  cool: 0xcfe6ff,
} as const;
