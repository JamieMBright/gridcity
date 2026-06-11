// Building tiles, drawn top-down oblique (SNES-SimCity style): you see the
// roof plus a sunlit front facade. Sun sits low in the west — back slopes
// are lit ('S'), front slopes shaded ('s'), shadows warm purple ('K').
// Lit windows ('y'/'Y') are sprinkled per-seed; the renderer picks seeds
// from the map's per-tile variant byte so streets never repeat exactly.

import { Rng } from '../../sim/rng';
import { Px, TILE } from './spriteBuilder';

const M = TILE - 1;

function lawnBase(p: Px): Px {
  return p.rect(0, 0, M, M, 'g').speckle(0, 0, M, M, 'G', 0.22).speckle(0, 0, M, M, 'f', 0.05);
}

function pavement(p: Px, y0: number): Px {
  return p.rect(0, y0, M, M, 'r').hline(0, M, y0, 'R').speckle(0, y0 + 1, M, M, 'R', 0.06);
}

/** 3x3 window with per-seed chance of being warmly lit. */
function win(p: Px, x: number, y: number, rng: Rng, litP = 0.3): void {
  const lit = rng.chance(litP);
  p.rect(x, y, x + 2, y + 2, lit ? 'y' : 'k');
  if (lit) p.set(x + 1, y + 1, 'Y');
  p.hline(x, x + 2, y + 3, 'K'); // sill shadow
}

/** A row of three Victorian terraced houses. wall: 'b' brick or 'c' render;
 *  roof: 's' slate or 'l' brown tile. */
export function terraceTile(seed: number, wall: 'b' | 'c', roof: 's' | 'l' = 's'): string[] {
  const rng = new Rng(seed * 7919 + 13);
  const shade = wall === 'b' ? 'B' : 'C';
  const roofLit = roof === 's' ? 'S' : 'l';
  const roofShade = roof === 's' ? 's' : 'L';
  const p = lawnBase(new Px(seed));
  // chimney stacks rise behind the ridge
  for (const cx of [4, 15, 26]) {
    p.rect(cx, 3, cx + 1, 8, shade).set(cx, 2, 'z').set(cx + 1, 2, 'z');
  }
  // roof: lit back slope, terracotta ridge, shaded front slope
  p.rect(0, 5, M, 8, roofLit);
  for (const cx of [4, 15, 26]) p.rect(cx, 5, cx + 1, 8, shade); // stacks overlap roof
  p.hline(0, M, 9, 'z');
  p.rect(0, 10, M, 14, roofShade).speckle(0, 10, M, 14, roofLit, 0.05);
  p.hline(0, M, 15, 'K'); // eaves
  // facade with party walls
  p.rect(0, 16, M, 27, wall);
  p.vline(10, 16, 27, shade).vline(21, 16, 27, shade);
  for (const ox of [0, 11, 22]) {
    win(p, ox + 2, 17, rng);
    win(p, ox + 6, 17, rng);
    win(p, ox + 2, 22, rng);
    // front door with lintel
    p.rect(ox + 7, 23, ox + 8, 27, 'D').hline(ox + 6, ox + 9, 22, 'K');
  }
  p.hline(0, M, 28, 'K');
  return pavement(p, 29).build();
}

/** Two suburban semis with bay windows and front gardens. */
export function semiTile(seed: number, wall: 'b' | 'c'): string[] {
  const rng = new Rng(seed * 104729 + 7);
  const p = lawnBase(new Px(seed));
  for (const ox of [1, 17]) {
    // hipped roof
    p.hline(ox, ox + 13, 5, 'K');
    p.rect(ox, 6, ox + 13, 8, 'S');
    p.hline(ox + 1, ox + 12, 9, 'z');
    p.rect(ox, 10, ox + 13, 12, 's');
    p.hline(ox, ox + 13, 13, 'K');
    p.set(ox + 11, 4, 'z').rect(ox + 11, 5, ox + 12, 8, wall === 'b' ? 'B' : 'C'); // chimney
    // facade
    p.rect(ox, 14, ox + 13, 21, wall);
    win(p, ox + 2, 15, rng);
    win(p, ox + 8, 15, rng);
    // bay window with cream frame
    p.rect(ox + 1, 19, ox + 5, 21, 'c').rect(ox + 2, 19, ox + 4, 20, rng.chance(0.5) ? 'y' : 'k');
    p.rect(ox + 9, 18, ox + 10, 21, 'D').hline(ox + 8, ox + 11, 17, 'K'); // door
    p.hline(ox, ox + 13, 22, 'K');
    // garden path to the door
    p.vline(ox + 9, 23, M, 'd').vline(ox + 10, 23, M, 'd');
  }
  // front hedges along the street
  p.hline(0, M, M, 'T').speckle(0, M - 1, M, M - 1, 'T', 0.4);
  return p.build();
}

/** Detached villa in a hedged garden — posh districts. */
export function villaTile(seed: number): string[] {
  const rng = new Rng(seed * 31337 + 3);
  const p = lawnBase(new Px(seed));
  // perimeter hedge
  p.hline(0, M, 0, 'T').hline(0, M, M, 'T').vline(0, 0, M, 'T').vline(M, 0, M, 'T');
  p.speckle(0, 0, M, 1, 't', 0.3).speckle(0, M - 1, M, M, 't', 0.3);
  // garden trees
  p.rect(3, 3, 6, 6, 'T').rect(4, 3, 5, 5, 't').set(4, 7, 'n');
  p.rect(25, 20, 28, 23, 'T').rect(26, 20, 27, 22, 't');
  // house body x8..24
  p.hline(8, 24, 6, 'K');
  p.rect(8, 7, 24, 9, 'S');
  p.hline(9, 23, 10, 'z');
  p.rect(8, 11, 24, 13, 's');
  p.hline(8, 24, 14, 'K');
  p.rect(8, 15, 24, 22, 'c');
  win(p, 10, 16, rng);
  win(p, 15, 16, rng);
  win(p, 20, 16, rng);
  p.rect(15, 19, 17, 22, 'D').hline(14, 18, 18, 'K'); // grand door
  win(p, 10, 19, rng);
  win(p, 20, 19, rng);
  p.hline(8, 24, 23, 'K');
  // gravel drive sweeping to the bottom-right gate
  for (let y = 24; y < TILE; y++) {
    const x0 = 16 + Math.round((y - 24) * 1.2);
    p.hline(x0, x0 + 3, y, 'd');
  }
  return p.build();
}

/** Council tower block — urban core. */
export function towerTile(seed: number): string[] {
  const rng = new Rng(seed * 49157 + 11);
  const p = lawnBase(new Px(seed));
  // roof slab with plant room
  p.rect(3, 1, 28, 6, 'a').rect(3, 1, 28, 1, 'i');
  p.rect(3, 1, 4, 6, 'A').rect(27, 1, 28, 6, 'A');
  p.rect(18, 2, 23, 5, 'A').rect(19, 3, 22, 4, 'I');
  p.set(6, 2, 'o'); // aviation beacon
  p.hline(3, 28, 7, 'K');
  // floors: window band + spandrel, repeated
  for (let fy = 8; fy <= 25; fy += 3) {
    p.rect(3, fy, 28, fy, 'A');
    for (let wx = 5; wx <= 25; wx += 4) {
      const lit = rng.chance(0.3);
      p.rect(wx, fy + 1, wx + 2, fy + 2, lit ? 'y' : 'k');
    }
    p.vline(3, fy, fy + 2, 'A').vline(28, fy, fy + 2, 'A');
    p.vline(4, fy, fy + 2, 'a').vline(27, fy, fy + 2, 'a');
  }
  p.rect(3, 26, 28, 27, 'A');
  p.rect(13, 26, 18, 28, 'D'); // lobby
  p.hline(3, 28, 28, 'K');
  return pavement(p, 29).build();
}

/** Glass office tower — the financial heart. */
export function officeTile(seed: number): string[] {
  const rng = new Rng(seed * 65537 + 5);
  const p = lawnBase(new Px(seed));
  p.rect(2, 0, 29, 4, 'A').rect(2, 0, 29, 0, 'a');
  for (const vx of [6, 12, 18, 24]) p.rect(vx, 1, vx + 1, 3, 'I'); // roof vents
  p.hline(2, 29, 5, 'K');
  // curtain-wall facade: glass bays between mullions
  p.rect(2, 6, 29, 27, 'q');
  for (let vx = 2; vx <= 29; vx += 4) p.vline(vx, 6, 27, 'I');
  for (let hy = 9; hy <= 27; hy += 4) p.hline(2, 29, hy, 'I');
  // sunset reflections and lit floors
  p.speckle(3, 6, 28, 27, 'Q', 0.18, 'q');
  p.speckle(3, 6, 28, 27, 'p', 0.05, 'q');
  for (let hy = 10; hy <= 26; hy += 4) {
    if (rng.chance(0.35)) p.speckle(3, hy, 28, hy + 2, 'y', 0.25, 'q');
  }
  p.rect(12, 24, 19, 27, 'D').hline(11, 20, 23, 'K'); // entrance
  p.hline(2, 29, 28, 'K');
  return pavement(p, 29).build();
}

/** Essex cottage with a vegetable garden. */
export function cottageTile(seed: number): string[] {
  const rng = new Rng(seed * 24593 + 9);
  const p = lawnBase(new Px(seed));
  // apple tree
  p.rect(3, 4, 7, 8, 'T').rect(4, 4, 6, 6, 't').set(5, 9, 'n').set(4, 6, 'p');
  // thatched roof
  p.hline(9, 24, 6, 'K');
  p.rect(9, 7, 24, 9, 'e');
  p.hline(10, 23, 10, 'E');
  p.rect(9, 11, 24, 12, 'E');
  p.hline(9, 24, 13, 'K');
  p.set(21, 5, 'z').rect(21, 6, 22, 9, 'B'); // chimney
  // whitewashed walls
  p.rect(9, 14, 24, 20, 'c');
  win(p, 11, 15, rng);
  win(p, 19, 15, rng);
  p.rect(15, 16, 16, 20, 'D').hline(14, 17, 15, 'K');
  p.hline(9, 24, 21, 'K');
  // vegetable patch rows
  p.rect(18, 25, 29, 30, 'n');
  for (let y = 25; y <= 30; y += 2) p.hline(18, 29, y, 'f');
  p.vline(16, 22, M, 'd').vline(15, 22, M, 'd'); // path
  return p.build();
}

/** Distribution-shed warehouse. */
export function warehouseTile(seed: number): string[] {
  const p = lawnBase(new Px(seed));
  p.hline(1, 30, 3, 'K');
  p.rect(1, 4, 30, 21, 'I');
  for (let vx = 3; vx <= 29; vx += 4) p.vline(vx, 4, 21, 'i'); // roof ribs
  p.rect(8, 7, 11, 9, 'q').rect(20, 12, 23, 14, 'q'); // skylights
  p.hline(1, 30, 22, 'K');
  p.rect(1, 23, 30, 27, 'A');
  p.rect(5, 24, 12, 27, 'i').hline(5, 12, 24, 'I'); // roller door
  p.rect(16, 24, 23, 27, 'i').hline(16, 23, 24, 'I');
  p.rect(26, 25, 27, 27, 'D'); // staff door
  p.hline(1, 30, 28, 'K');
  pavement(p, 29);
  p.set(3, 30, 'o').set(4, 30, 'o'); // pallet stack
  return p.build();
}

/** Brick factory with sawtooth roof and twin stacks. */
export function factoryTile(seed: number): string[] {
  const p = lawnBase(new Px(seed));
  // smoke drifting from the stacks
  p.set(23, 1, 'x').set(25, 0, 'x').set(28, 1, 'x').set(30, 0, 'x');
  // sawtooth roof: three north-light teeth
  for (const ox of [1, 11, 21]) {
    p.rect(ox, 6, ox + 9, 8, 'S');
    p.rect(ox, 9, ox + 9, 11, 'q').speckle(ox, 9, ox + 9, 11, 'Q', 0.2);
    p.vline(ox, 6, 11, 'K');
  }
  p.hline(1, 30, 5, 'K').hline(1, 30, 12, 'K');
  // stacks
  p.rect(23, 2, 24, 12, 'B').set(23, 1, 'K').set(24, 1, 'K');
  p.rect(27, 3, 28, 12, 'B').set(27, 2, 'K').set(28, 2, 'K');
  // brick body with high windows
  p.rect(1, 13, 30, 23, 'b');
  for (let wx = 3; wx <= 27; wx += 6) p.rect(wx, 15, wx + 3, 17, 'k').hline(wx, wx + 3, 18, 'K');
  p.rect(13, 19, 18, 23, 'i').hline(13, 18, 19, 'I'); // works door
  p.hline(1, 30, 24, 'K');
  pavement(p, 25);
  p.rect(4, 27, 6, 29, 'O').rect(8, 28, 9, 29, 'o'); // crates in the yard
  return p.build();
}

/** Glasshouse ranges — Essex's growing empire. */
export function greenhouseTile(seed: number): string[] {
  const p = lawnBase(new Px(seed));
  for (const oy of [2, 12, 22]) {
    p.hline(1, 30, oy, 'K');
    p.rect(1, oy + 1, 30, oy + 2, 'Q'); // lit roof slope
    p.rect(1, oy + 3, 30, oy + 6, 'q');
    for (let vx = 1; vx <= 30; vx += 4) p.vline(vx, oy + 1, oy + 6, 'I'); // glazing bars
    p.speckle(2, oy + 3, 29, oy + 6, 'p', 0.04, 'q');
    p.speckle(2, oy + 3, 29, oy + 6, 't', 0.1, 'q'); // crops showing through
    p.hline(1, 30, oy + 7, 'K');
  }
  p.hline(0, M, 10, 'd').hline(0, M, 20, 'd'); // sandy work paths
  return p.build();
}

/** Built-out solar farm rows (for when the Essex fields say yes). */
export function solarFarmTile(seed: number): string[] {
  const p = lawnBase(new Px(seed));
  for (let oy = 2; oy <= 26; oy += 6) {
    p.hline(2, 29, oy, 'V');
    p.rect(2, oy + 1, 29, oy + 2, 'v');
    p.hline(2, 29, oy + 3, 'K');
  }
  return p.build();
}
