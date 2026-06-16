// Tutorial-campaign mission maps: tiny handcrafted CityMaps, pure data.
// Each map is a hamlet/town in enclosed farmland sized so one screen
// shows the whole lesson — no roads, no landmarks beyond a church, one
// named council per mission (every land tile carries its id). The
// gameplay side (steps, win predicates, scripted beats) lives in
// src/sim/scenario/missions.ts; this file is geography only.

import {
  CUSTOMERS_PER_TILE,
  LANDMARK,
  NO_COUNCIL,
  TERRAIN,
  ZONE,
  type CityMap,
  type CouncilProfile,
  type Zone,
} from '../sim/map/types';
import { Rng } from '../sim/rng';

// --- shared painter ----------------------------------------------------------

function blankMap(w: number, h: number, council: CouncilProfile): CityMap {
  const n = w * h;
  return {
    width: w,
    height: h,
    terrain: new Uint8Array(n).fill(TERRAIN.land),
    zone: new Uint8Array(n),
    council: new Uint8Array(n).fill(council.id),
    road: new Uint8Array(n),
    routes: [],
    customers: new Uint16Array(n),
    vegetation: new Uint8Array(n),
    variant: new Uint8Array(n),
    landmark: new Uint8Array(n),
    flags: new Uint8Array(n),
    councils: [council],
  };
}

function rect(
  map: CityMap,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  fn: (i: number) => void,
): void {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (x < 0 || y < 0 || x >= map.width || y >= map.height) continue;
      fn(y * map.width + x);
    }
  }
}

const paintZone = (map: CityMap, x0: number, y0: number, x1: number, y1: number, z: Zone): void =>
  rect(map, x0, y0, x1, y1, (i) => {
    map.zone[i] = z;
  });
const paintTrees = (map: CityMap, x0: number, y0: number, x1: number, y1: number): void =>
  rect(map, x0, y0, x1, y1, (i) => {
    map.terrain[i] = TERRAIN.trees;
  });
const paintHill = (map: CityMap, x0: number, y0: number, x1: number, y1: number): void =>
  rect(map, x0, y0, x1, y1, (i) => {
    map.terrain[i] = TERRAIN.hill;
  });
const paintWater = (map: CityMap, x0: number, y0: number, x1: number, y1: number): void =>
  rect(map, x0, y0, x1, y1, (i) => {
    map.terrain[i] = TERRAIN.water;
    map.council[i] = NO_COUNCIL;
    map.zone[i] = ZONE.none;
  });

function cottages(map: CityMap, at: Array<[number, number]>): void {
  for (const [x, y] of at) {
    if (x < 0 || y < 0 || x >= map.width || y >= map.height) continue;
    map.zone[y * map.width + x] = ZONE.rural;
  }
}

function church(map: CityMap, x: number, y: number): void {
  if (map.landmark) map.landmark[y * map.width + x] = LANDMARK.church;
}

/** Fill customers / vegetation / sprite variants from the painted zones,
 *  mirroring the London builder's rules (8x8-ish field-cell hash so the
 *  open farmland reads as enclosures, not per-tile noise). */
function finalize(map: CityMap, seed: number): CityMap {
  const rng = new Rng(seed);
  const CHURCH_CUSTOMERS = 2;
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const i = y * map.width + x;
      const z = map.zone[i] as Zone;
      const lm = map.landmark?.[i] ?? 0;
      map.customers[i] = lm === LANDMARK.church ? CHURCH_CUSTOMERS : CUSTOMERS_PER_TILE[z];
      const t = map.terrain[i];
      if (t === TERRAIN.trees) map.vegetation[i] = 200 + rng.int(56);
      else if (z === ZONE.rural || z === ZONE.none)
        map.vegetation[i] = t === TERRAIN.land || t === TERRAIN.hill ? 90 + rng.int(70) : 30;
      else if (z === ZONE.suburb) map.vegetation[i] = 60 + rng.int(60);
      else map.vegetation[i] = 10 + rng.int(30);
      if (z === ZONE.none && t !== TERRAIN.water) {
        const cell = Math.floor(x / 4) * 7 + Math.floor(y / 3) * 13;
        map.variant[i] = rng.chance(0.15) ? rng.int(256) : cell % 256;
      } else {
        map.variant[i] = rng.int(256);
      }
    }
  }
  return map;
}

// --- mission 1: First Light --------------------------------------------------
// A hamlet in the east, a breezy ridge in the west — one wind tender,
// one 33 kV line, one distribution substation.

/** Suggested wind site on the western ridge (steps + e2e aim here). */
export const M1_WIND = { x: 5, y: 12 } as const;
/** The heart of the village (a dist sub here covers every home). */
export const M1_VILLAGE = { x: 24, y: 12 } as const;

export function buildFirstLightMap(): CityMap {
  const map = blankMap(32, 24, {
    id: 0,
    name: 'Alderbrook Parish',
    affluence: 0.45,
    ambition: 0.5,
    blurb: 'A hamlet that has waited long enough for the lights to come on.',
  });
  paintHill(map, 3, 7, 7, 17); // the windy western ridge
  paintTrees(map, 13, 3, 16, 6);
  paintTrees(map, 15, 17, 19, 20);
  paintWater(map, 10, 18, 12, 20); // the mill pond
  paintZone(map, 23, 10, 25, 13, ZONE.suburb);
  cottages(map, [
    [21, 11],
    [21, 13],
    [27, 10],
    [27, 13],
    [26, 15],
    [22, 8],
  ]);
  church(map, 24, 8);
  return finalize(map, 0xa1de01);
}

// --- mission 2: Step Up ------------------------------------------------------
// The village again — but the generation is offshore, a long way east.
// 33 kV has no bay at the plant; the lesson is 132 kV + a grid substation.

export const M2_VILLAGE = { x: 8, y: 12 } as const;
/** The surveyed estuary wind zone (offshore tender goes here). */
export const M2_WINDSITE = { x: 50, y: 12 } as const;

export function buildStepUpMap(): CityMap {
  const map = blankMap(56, 24, {
    id: 0,
    name: 'Saltmarsh Hundred',
    affluence: 0.4,
    ambition: 0.6,
    blurb: 'Where the farmland gives out, the estuary wind begins.',
  });
  paintZone(map, 7, 10, 9, 13, ZONE.suburb);
  cottages(map, [
    [5, 9],
    [5, 12],
    [11, 9],
    [11, 14],
    [8, 15],
    [6, 7],
  ]);
  church(map, 8, 8);
  paintTrees(map, 24, 4, 28, 8);
  paintHill(map, 30, 14, 34, 18);
  // the estuary: open water past x=46, with a ragged shoreline
  paintWater(map, 46, 0, 55, 23);
  paintWater(map, 44, 0, 45, 7);
  paintWater(map, 44, 17, 45, 23);
  paintWater(map, 45, 8, 45, 9);
  paintWater(map, 45, 15, 45, 16);
  // the surveyed offshore wind zone
  paintZone(map, 49, 10, 51, 13, ZONE.windSite);
  return finalize(map, 0xa1de02);
}

// --- mission 3: Keeping the Lights On ---------------------------------------
// A town fed through a woodland crossing; a scripted storm takes the
// line down. Depot, vans, vegetation.

export const M3_TOWN = { x: 7, y: 11 } as const;
/** Pre-seeded network endpoints (see scenario/missions.ts seed). */
export const M3_PLANT = { x: 32, y: 12 } as const;
export const M3_SUB = { x: 10, y: 11 } as const;

export function buildStormMap(): CityMap {
  const map = blankMap(40, 24, {
    id: 0,
    name: 'Thornwood Vale',
    affluence: 0.5,
    ambition: 0.45,
    blurb: 'A market town behind ten miles of very tall, very dry trees.',
  });
  paintZone(map, 6, 9, 9, 13, ZONE.suburb);
  cottages(map, [
    [5, 10],
    [11, 8],
    [11, 15],
    [7, 16],
  ]);
  church(map, 7, 7);
  paintTrees(map, 16, 7, 27, 17); // the woodland the line must cross
  paintTrees(map, 30, 2, 34, 5);
  return finalize(map, 0xa1de03);
}

// --- mission 4: The Inbox ----------------------------------------------------
// A served town and a hungry applicant on the far side of the parish.

export const M4_TOWN = { x: 7, y: 11 } as const;
export const M4_PLANT = { x: 30, y: 5 } as const;
export const M4_SUB = { x: 10, y: 11 } as const;
/** Where the data-centre application lands (seeded in the inbox). */
export const M4_APPLICANT = { x: 27, y: 16 } as const;

export function buildInboxMap(): CityMap {
  const map = blankMap(40, 24, {
    id: 0,
    name: 'Watermead District',
    affluence: 0.55,
    ambition: 0.55,
    blurb: 'Good fibre, flat fields, and a planning office that answers email.',
  });
  paintZone(map, 6, 9, 9, 13, ZONE.suburb);
  cottages(map, [
    [5, 10],
    [11, 8],
    [11, 15],
    [7, 16],
  ]);
  church(map, 7, 7);
  paintTrees(map, 18, 3, 22, 6);
  paintWater(map, 16, 20, 22, 22);
  return finalize(map, 0xa1de04);
}

// --- mission 5: Every Pound on the Bill --------------------------------------
// A proper town to serve — cheaply. The bill panel is the scoreboard.

export const M5_TOWN = { x: 11, y: 12 } as const;
export const M5_WIND = { x: 5, y: 12 } as const;

export function buildBillMap(): CityMap {
  const map = blankMap(44, 28, {
    id: 0,
    name: 'Pennyford Borough',
    affluence: 0.5,
    ambition: 0.5,
    blurb: 'They read their bills here. Line by line. Then they write in.',
  });
  paintHill(map, 2, 8, 6, 18); // the cheap wind next door
  paintZone(map, 8, 10, 13, 15, ZONE.suburb);
  paintZone(map, 10, 12, 11, 13, ZONE.urban); // the high-street core
  cottages(map, [
    [6, 9],
    [6, 13],
    [15, 10],
    [15, 14],
    [11, 17],
    [9, 7],
  ]);
  church(map, 10, 8);
  paintTrees(map, 24, 6, 29, 11);
  paintTrees(map, 20, 18, 25, 22);
  paintWater(map, 34, 20, 39, 25);
  return finalize(map, 0xa1de05);
}

// --- mission 6: Sun & Store --------------------------------------------------
// A sunny village with a wide-open south field. Solar generates only by
// day; a battery stores the surplus and discharges after sunset — so the
// lesson is solar + storage keeping a town lit around the clock.

export const M6_VILLAGE = { x: 9, y: 12 } as const;
/** The open south field where the solar farm goes (steps + e2e aim here). */
export const M6_SOLAR = { x: 26, y: 17 } as const;
/** Where the battery sits, between the solar field and the village. */
export const M6_BATTERY = { x: 22, y: 14 } as const;

export function buildSunStoreMap(): CityMap {
  const map = blankMap(40, 26, {
    id: 0,
    name: 'Sunningmead',
    affluence: 0.5,
    ambition: 0.6,
    blurb: 'Long days, a south-facing field, and a village that wants to go solar.',
  });
  paintZone(map, 7, 10, 11, 14, ZONE.suburb);
  cottages(map, [
    [6, 9],
    [6, 14],
    [12, 9],
    [12, 15],
    [9, 16],
    [8, 7],
  ]);
  church(map, 9, 8);
  paintTrees(map, 16, 3, 20, 7); // a copse to the north
  paintWater(map, 14, 21, 19, 24); // a pond, south-west
  // the wide-open, unshaded south field reads as the natural solar site
  return finalize(map, 0xa1de06);
}
