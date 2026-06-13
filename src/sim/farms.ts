// Capacity-proportional farm footprints (owner: "scale things like the
// wind farms to be proportionate to the capacity… solar: 5 MW might be
// one tile, 100 MW [many] tiles"). The mechanic is DEVELOPERS BID WHAT
// FITS: designating a site computes how much open land surrounds the
// tile, every bid's MW is capped by what its technology fits there, and
// the award claims the proportional tile set.
//
// The claimed tile set is DERIVED, never serialized: farmClaimTiles(map,
// gen, anchor, mw) is a pure function of the static map and the awarded
// MW (stamped on GenAsset.mw), so old saves hydrate to exactly the tiles
// the award claimed and the save format carries nothing new. Derivation
// walks open land breadth-first from the anchor in a fixed N/E/S/W
// neighbour order — compact blob growth, solar as field arrays — and
// wind keeps turbine spacing by claiming only tiles on the anchor's
// checkerboard parity (the gaps between turbines stay open farmland,
// exactly like a real wind farm). Claims are PREFIX-STABLE: a smaller MW
// claims a prefix of a bigger MW's tile order, and the award caps MW to
// the largest prefix free of other assets.
//
// Town infill can re-zone open land over time; the derivation reads only
// static-ish map features (terrain, zone, landmark, heavy roads), so a
// claimed tile swallowed by growth simply drops out and the BFS claims
// the next tile in order — the farm self-heals around the new homes
// (tick.growTown also avoids claimed tiles, so this is belt-and-braces).

import { FARM_MW_PER_TILE, GENS, type GenType } from './catalog';
import { RC, TERRAIN, ZONE, type CityMap } from './map/types';
import { FLAG_RUNWAY } from '../data/londonMap';

/** Chebyshev radius cap on the blob — bids can't claim half the county. */
export const FARM_MAX_RADIUS = 9;

/** Technologies whose footprint scales with awarded MW. */
export function isFarmGen(gen: GenType): boolean {
  return FARM_MW_PER_TILE[gen] !== undefined;
}

/** Open, claimable ground for a farm technology — STATIC map features
 *  only (the derivation must replay identically on load). */
function openForFarm(map: CityMap, gen: GenType, x: number, y: number): boolean {
  if (x < 0 || x >= map.width || y < 0 || y >= map.height) return false;
  const i = y * map.width + x;
  if ((map.landmark?.[i] ?? 0) !== 0) return false;
  if (((map.flags?.[i] ?? 0) & FLAG_RUNWAY) !== 0) return false;
  if ((map.road[i] ?? 0) >= RC.arterial) return false;
  const z = map.zone[i] ?? ZONE.none;
  if (gen === 'windOffshore') return z === ZONE.windSite; // arrays stay in the estuary zone
  if (map.terrain[i] !== TERRAIN.land) return false;
  return z === ZONE.none || z === ZONE.solarSite; // open countryside / surveyed fields
}

/** Deterministic BFS ordering of the claimable tiles around an anchor:
 *  anchor first (its siting was validated at designation even when its
 *  own zone isn't open countryside), then ring-by-ring blob growth over
 *  open land, N/E/S/W neighbour order, capped at FARM_MAX_RADIUS. Wind
 *  technologies keep only the anchor-parity checkerboard for turbine
 *  spacing.
 *
 *  `taken` (tiles already occupied by other assets/pylons OR reserved by
 *  another open tender) are skipped DURING the walk — both as claimable
 *  tiles AND as walkable ground — so a designation's footprint never grows
 *  through, or into, ground a neighbour already holds. The anchor itself
 *  is always claimable (its siting was validated). Determinism is
 *  preserved: the BFS order is still a pure function of (map, anchor, taken). */
export function farmTileOrder(
  map: CityMap,
  gen: GenType,
  ax: number,
  ay: number,
  taken?: ReadonlySet<number>,
): number[] {
  const anchor = ay * map.width + ax;
  if (!isFarmGen(gen)) return [anchor];
  const spaced = gen === 'windOnshore' || gen === 'windOffshore';
  const parity = (ax + ay) & 1;
  const visited = new Set<number>([anchor]);
  const queue: Array<[number, number]> = [[ax, ay]];
  const order: number[] = [anchor];
  for (let head = 0; head < queue.length; head++) {
    const [x, y] = queue[head] ?? [ax, ay];
    for (const [dx, dy] of [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (Math.max(Math.abs(nx - ax), Math.abs(ny - ay)) > FARM_MAX_RADIUS) continue;
      const i = ny * map.width + nx;
      if (visited.has(i)) continue;
      if (taken?.has(i)) continue; // neighbour's reserved/occupied ground — wall it off
      if (!openForFarm(map, gen, nx, ny)) continue;
      visited.add(i);
      queue.push([nx, ny]);
      if (!spaced || ((nx + ny) & 1) === parity) order.push(i);
    }
  }
  return order;
}

/** The most MW a technology fits around a designated tile, capped at the
 *  catalog ask (the tender is for that plant, not an unbounded one). The
 *  optional `taken` set excludes ground other assets/tenders already hold. */
export function farmFitMW(
  map: CityMap,
  gen: GenType,
  x: number,
  y: number,
  taken?: ReadonlySet<number>,
): number {
  const per = FARM_MW_PER_TILE[gen];
  if (per === undefined) return GENS[gen].capacityMW;
  return Math.min(GENS[gen].capacityMW, farmTileOrder(map, gen, x, y, taken).length * per);
}

/** Tiles a farm of `mw` claims: the BFS-order prefix. ceil(mw/density),
 *  never less than the anchor tile. */
export function farmClaimTiles(
  map: CityMap,
  gen: GenType,
  x: number,
  y: number,
  mw: number,
  taken?: ReadonlySet<number>,
): number[] {
  const per = FARM_MW_PER_TILE[gen];
  if (per === undefined) return [y * map.width + x];
  const n = Math.max(1, Math.ceil(mw / per));
  return farmTileOrder(map, gen, x, y, taken).slice(0, n);
}

/** Effective capacity of a placed generator, MW — the awarded (land-
 *  capped) figure when stamped, else the catalog plant. */
export function assetMW(a: { gen: GenType; mw?: number | undefined }): number {
  return a.mw ?? GENS[a.gen].capacityMW;
}

/** Rough load-factor per generation technology — the share of nameplate a
 *  unit actually delivers on average. Game-chunky, in the right ballpark
 *  for GB (onshore ~30%, offshore ~45%, solar ~11%, firm plant high). Only
 *  used for the "powers ~N homes" picker estimate, never the sim. */
const LOAD_FACTOR: Partial<Record<GenType, number>> = {
  windOnshore: 0.3,
  windOffshore: 0.45,
  solarFarm: 0.11,
};

/** Average domestic draw, kW per home (≈3,500 kWh/yr diversified). The
 *  capacity-picker's "powers ~N homes" headline (a planning rule of thumb,
 *  not the dispatch model). */
export const HOME_AVG_KW = 0.4;

/** Rough homes a farm of `mw` powers, for the capacity picker's live
 *  estimate: nameplate × load factor / average home draw. */
export function homesPowered(gen: GenType, mw: number): number {
  const lf = LOAD_FACTOR[gen] ?? 0.5;
  return Math.round((mw * 1000 * lf) / HOME_AVG_KW);
}
