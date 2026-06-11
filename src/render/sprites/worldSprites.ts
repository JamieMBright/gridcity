// World/terrain tiles. Connectivity-dependent families (water shores,
// roads) are pre-baked as 16 variants indexed by a NESW neighbour bitmask
// (bit 0 = N, 1 = E, 2 = S, 3 = W set when the neighbour is "same kind").

import { Px, TILE } from './spriteBuilder';

const M = TILE - 1;

export function grassTile(seed: number): string[] {
  return new Px(seed, 'g')
    .speckle(0, 0, M, M, 'G', 0.22)
    .speckle(0, 0, M, M, 'f', 0.06)
    .build();
}

export function fieldTile(seed: number): string[] {
  const p = new Px(seed, 'e');
  for (let y = 1; y < TILE; y += 4) p.hline(0, M, y, 'E');
  return p.speckle(0, 0, M, M, 'n', 0.015).speckle(0, 0, M, M, 'g', 0.03).build();
}

export function hillTile(seed: number): string[] {
  const p = new Px(seed, 'u');
  for (const y of [6, 14, 22, 28]) {
    for (let x = 0; x < TILE; x++) {
      const yy = y + Math.round(2 * Math.sin((x + seed) / 5));
      p.set(x, yy, 'U');
    }
  }
  return p.speckle(0, 0, M, M, 'U', 0.1).speckle(0, 0, M, M, 'g', 0.05).build();
}

/** Water with sandy shoreline on the sides where `mask` has LAND (not water). */
export function waterTile(seed: number, landMask: number): string[] {
  const p = new Px(seed, 'w');
  for (let y = 3; y < TILE; y += 6) {
    for (let x = (seed + y) % 5; x < TILE; x += 9) p.hline(x, x + 3, y, 'W');
  }
  p.speckle(0, 0, M, M, 'p', 0.008); // sunset glints
  if (landMask & 1) p.hline(0, M, 0, 'd').hline(0, M, 1, 'd').speckle(0, 2, M, 2, 'd', 0.5);
  if (landMask & 2) p.vline(M, 0, M, 'd').vline(M - 1, 0, M, 'd').speckle(M - 2, 0, M - 2, M, 'd', 0.5);
  if (landMask & 4) p.hline(0, M, M, 'd').hline(0, M, M - 1, 'd').speckle(0, M - 2, M, M - 2, 'd', 0.5);
  if (landMask & 8) p.vline(0, 0, M, 'd').vline(1, 0, M, 'd').speckle(2, 0, 2, M, 'd', 0.5);
  return p.build();
}

/** Road with connections per NESW mask; kerbs close unconnected sides. */
export function roadTile(seed: number, mask: number): string[] {
  const p = new Px(seed, 'r');
  p.speckle(0, 0, M, M, 'R', 0.05);
  const n = (mask & 1) !== 0;
  const e = (mask & 2) !== 0;
  const s = (mask & 4) !== 0;
  const wst = (mask & 8) !== 0;
  // kerb lines on closed sides
  if (!n) p.hline(0, M, 0, 'R').hline(0, M, 1, 'R');
  if (!s) p.hline(0, M, M, 'R').hline(0, M, M - 1, 'R');
  if (!e) p.vline(M, 0, M, 'R').vline(M - 1, 0, M, 'R');
  if (!wst) p.vline(0, 0, M, 'R').vline(1, 0, M, 'R');
  // faded centre dashes only on straight-through stretches
  const cx = TILE / 2;
  const cy = TILE / 2;
  if (n && s && !e && !wst) for (let y = 0; y < TILE; y += 6) p.vline(cx, y, y + 2, 'm');
  if (e && wst && !n && !s) for (let x = 0; x < TILE; x += 6) p.hline(x, x + 2, cy, 'm');
  return p.build();
}

/** A clump of broadleaf trees on grass — the vegetation your lines fear. */
export function treesTile(seed: number): string[] {
  const p = new Px(seed, 'g');
  p.speckle(0, 0, M, M, 'G', 0.25);
  const canopy = (cx: number, cy: number, r: number): void => {
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d > r) continue;
        // sun from the upper-left: lit crown, shaded skirt
        const lit = x - cx + (cy - y) > r * 0.2;
        p.set(x, y, lit ? 't' : 'T');
      }
    }
    p.set(cx, cy + r, 'n');
  };
  const spots: Array<[number, number, number]> = [
    [8, 8, 5],
    [22, 14, 6],
    [10, 23, 5],
    [26, 27, 4],
    [27, 4, 3],
  ];
  const pick = 3 + (seed % 3);
  for (let i = 0; i < pick && i < spots.length; i++) {
    const s = spots[i];
    if (s) canopy(s[0], s[1], s[2]);
  }
  return p.build();
}

/** City park: lawn, a winding gravel path, trees, a flowerbed. */
export function parkTile(seed: number): string[] {
  const p = new Px(seed, 'g');
  p.speckle(0, 0, M, M, 'G', 0.2);
  for (let x = 0; x < TILE; x++) {
    const y = Math.round(16 + 6 * Math.sin((x + seed * 3) / 7));
    p.set(x, y, 'd');
    p.set(x, y + 1, 'd');
  }
  const tree = (cx: number, cy: number): void => {
    p.rect(cx - 2, cy - 2, cx + 2, cy + 2, 'T');
    p.rect(cx - 1, cy - 2, cx + 1, cy, 't');
    p.set(cx, cy + 3, 'n');
  };
  tree(6, 7);
  tree(25, 6);
  tree(8, 26);
  // flowerbed
  p.rect(20, 24, 27, 28, 'f').speckle(20, 24, 27, 28, 'p', 0.3).speckle(20, 24, 27, 28, 'y', 0.15);
  return p.build();
}

/** Pre-development solar site: golden field with survey stakes. */
export function solarSiteTile(seed: number): string[] {
  const p = new Px(seed, 'e');
  for (let y = 1; y < TILE; y += 4) p.hline(0, M, y, 'E');
  for (const [x, y] of [
    [6, 8],
    [24, 6],
    [10, 24],
    [26, 22],
  ] as const) {
    p.set(x, y, 'i').set(x, y - 1, 'o');
  }
  return p.build();
}
