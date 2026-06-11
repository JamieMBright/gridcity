// Tiny authoring surface for 32x32 char-grid pixel art. Sprites are drawn
// with rect/line/pixel ops plus seeded speckle for organic texture, then
// frozen to a string grid the atlas understands. '.' is transparent.

import { Rng } from '../../sim/rng';

export const TILE = 32;

export class Px {
  private g: string[][];
  private rng: Rng;

  constructor(seed = 1, fill = '.') {
    this.g = Array.from({ length: TILE }, () => Array<string>(TILE).fill(fill));
    this.rng = new Rng(seed);
  }

  set(x: number, y: number, ch: string): this {
    if (x >= 0 && x < TILE && y >= 0 && y < TILE) {
      const row = this.g[y];
      if (row) row[x] = ch;
    }
    return this;
  }

  get(x: number, y: number): string {
    return this.g[y]?.[x] ?? '.';
  }

  rect(x0: number, y0: number, x1: number, y1: number, ch: string): this {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, ch);
    return this;
  }

  hline(x0: number, x1: number, y: number, ch: string): this {
    return this.rect(x0, y, x1, y, ch);
  }

  vline(x: number, y0: number, y1: number, ch: string): this {
    return this.rect(x, y0, x, y1, ch);
  }

  /** Replace a fraction of `over` pixels in a region with `ch` (seeded). */
  speckle(x0: number, y0: number, x1: number, y1: number, ch: string, p: number, over?: string): this {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (over !== undefined && this.get(x, y) !== over) continue;
        if (this.rng.chance(p)) this.set(x, y, ch);
      }
    }
    return this;
  }

  /** Stamp another grid (transparent '.' skipped) at an offset. */
  stamp(grid: string[], ox: number, oy: number): this {
    grid.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch && ch !== '.') this.set(ox + x, oy + y, ch);
      }
    });
    return this;
  }

  build(): string[] {
    return this.g.map((row) => row.join(''));
  }
}
