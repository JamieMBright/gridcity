// Service areas: every customer tile is fed by its nearest in-range
// distribution substation. The assignment is geometric (recomputed only
// when assets change); electrical reality — whether that substation is
// actually energized and at what voltage — is decided by the power flow.

import { SUBS } from './catalog';
import type { PlacedAsset } from './assets';
import type { CityMap } from './map/types';
import { tileDemandMW } from './map/demand';

export interface ServiceAreas {
  /** demand tile index → serving dist-sub asset id. */
  subOfTile: Map<number, number>;
  /** dist-sub asset id → served tile indices. */
  tilesOfSub: Map<number, number[]>;
  /** dist-sub asset id → aggregate peak load, MW. */
  loadMWOfSub: Map<number, number>;
  /** dist-sub asset id → customers served. */
  customersOfSub: Map<number, number>;
  /** Total customers on the map (served or not). */
  totalCustomers: number;
  /** Total demand on the map, MW (served or not). */
  totalDemandMW: number;
}

export function assignServiceAreas(map: CityMap, assets: Iterable<PlacedAsset>): ServiceAreas {
  const subs: Array<{ id: number; x: number; y: number; r2: number }> = [];
  for (const a of assets) {
    if (a.kind !== 'sub') continue;
    const r = SUBS[a.sub].serviceRadius;
    if (r !== undefined) subs.push({ id: a.id, x: a.x, y: a.y, r2: r * r });
  }

  const subOfTile = new Map<number, number>();
  const tilesOfSub = new Map<number, number[]>();
  const loadMWOfSub = new Map<number, number>();
  const customersOfSub = new Map<number, number>();
  let totalCustomers = 0;
  let totalDemandMW = 0;

  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const i = y * map.width + x;
      const demand = tileDemandMW(map, i);
      if (demand <= 0) continue;
      totalCustomers += map.customers[i] ?? 0;
      totalDemandMW += demand;

      let best = -1;
      let bestD2 = Infinity;
      for (const s of subs) {
        const dx = s.x - x;
        const dy = s.y - y;
        const d2 = dx * dx + dy * dy;
        if (d2 <= s.r2 && d2 < bestD2) {
          best = s.id;
          bestD2 = d2;
        }
      }
      if (best < 0) continue;
      subOfTile.set(i, best);
      let tiles = tilesOfSub.get(best);
      if (!tiles) {
        tiles = [];
        tilesOfSub.set(best, tiles);
      }
      tiles.push(i);
      loadMWOfSub.set(best, (loadMWOfSub.get(best) ?? 0) + demand);
      customersOfSub.set(best, (customersOfSub.get(best) ?? 0) + (map.customers[i] ?? 0));
    }
  }

  return { subOfTile, tilesOfSub, loadMWOfSub, customersOfSub, totalCustomers, totalDemandMW };
}
