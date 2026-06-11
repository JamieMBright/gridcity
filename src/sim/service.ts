// Service areas: every customer tile (and accepted large-load site) is fed
// by its nearest in-range distribution substation. The geometric
// assignment is cached on asset changes; the aggregated loads are
// recomputed every tick because council electrification keeps reshaping
// them. Whether a substation is actually energized is the power flow's
// call.

import { SUBS } from './catalog';
import type { PlacedAsset } from './assets';
import type { CityMap } from './map/types';
import { tileDemand, tileDemandMW } from './map/demand';
import type { CouncilAdoption } from './customers/adoption';

export interface SubLoad {
  /** Domestic peak load, MW (diurnal household profile). */
  domMW: number;
  /** Process load, MW (industry/glasshouses/large sites; flatter). */
  procMW: number;
  /** EV charging peak, MW (evening). */
  evMW: number;
  /** Heat pump peak, MW (cold mornings/evenings). */
  hpMW: number;
  /** Rooftop PV export peak, MW (sunny midday). */
  pvMW: number;
}

/** An accepted large-demand connection (data centre, EV hub…). */
export interface LoadSite {
  id: number;
  x: number;
  y: number;
  mw: number;
  customers: number;
  name: string;
}

export interface ServiceAreas {
  /** demand tile index → serving dist-sub asset id. */
  subOfTile: Map<number, number>;
  /** dist-sub asset id → served tile indices. */
  tilesOfSub: Map<number, number[]>;
  /** dist-sub asset id → customers served. */
  customersOfSub: Map<number, number>;
  /** Every tile with demand (incl. load sites), served or not. */
  demandTiles: number[];
  /** Total customers on the map (served or not). */
  totalCustomers: number;
  /** Total base peak demand, MW (served or not). */
  totalDemandMW: number;
}

export function assignServiceAreas(
  map: CityMap,
  assets: Iterable<PlacedAsset>,
  loadSites: LoadSite[],
): ServiceAreas {
  const subs: Array<{ id: number; x: number; y: number; r2: number }> = [];
  for (const a of assets) {
    if (a.kind !== 'sub') continue;
    const r = SUBS[a.sub].serviceRadius;
    if (r !== undefined) subs.push({ id: a.id, x: a.x, y: a.y, r2: r * r });
  }

  const siteOfTile = new Map<number, LoadSite>();
  for (const s of loadSites) siteOfTile.set(s.y * map.width + s.x, s);

  const subOfTile = new Map<number, number>();
  const tilesOfSub = new Map<number, number[]>();
  const customersOfSub = new Map<number, number>();
  const demandTiles: number[] = [];
  let totalCustomers = 0;
  let totalDemandMW = 0;

  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const i = y * map.width + x;
      const site = siteOfTile.get(i);
      const demand = tileDemandMW(map, i) + (site?.mw ?? 0);
      if (demand <= 0) continue;
      const tileCustomers = (map.customers[i] ?? 0) + (site?.customers ?? 0);
      totalCustomers += tileCustomers;
      totalDemandMW += demand;
      demandTiles.push(i);

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
      customersOfSub.set(best, (customersOfSub.get(best) ?? 0) + tileCustomers);
    }
  }

  return { subOfTile, tilesOfSub, customersOfSub, demandTiles, totalCustomers, totalDemandMW };
}

/** Aggregate each substation's load components for this moment's adoption
 *  state — recomputed per tick (cheap: only assigned tiles). */
export function computeSubLoads(
  map: CityMap,
  tilesOfSub: Map<number, number[]>,
  councils: Map<number, CouncilAdoption>,
  loadSites: LoadSite[],
): Map<number, SubLoad> {
  const siteOfTile = new Map<number, number>();
  for (const s of loadSites) siteOfTile.set(s.y * map.width + s.x, s.mw);

  const out = new Map<number, SubLoad>();
  for (const [subId, tiles] of tilesOfSub) {
    const load: SubLoad = { domMW: 0, procMW: 0, evMW: 0, hpMW: 0, pvMW: 0 };
    for (const i of tiles) {
      const d = tileDemand(map, i, councils);
      load.domMW += d.domMW;
      load.procMW += d.procMW + (siteOfTile.get(i) ?? 0);
      load.evMW += d.evMW;
      load.hpMW += d.hpMW;
      load.pvMW += d.pvMW;
    }
    out.set(subId, load);
  }
  return out;
}
