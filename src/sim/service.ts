// Service areas: every customer tile (and accepted large-load site) wants
// its nearest distribution substation — but a substation is iron, not
// geography: it only signs up load it can actually carry. Tiles are
// assigned nearest-first until the fitted transformer's MVA is spoken
// for; the rest spill to the next sub in reach or stay dark. Reach and
// capacity both scale with the fitted MVA, so growing demand (EVs, heat
// pumps) squeezes catchments and forces reinforcement. The aggregated
// loads are recomputed every tick; whether a substation is actually
// energized is the power flow's call.

import { subCapexK, subRadius, SUBS } from './catalog';
import { subMva, type PlacedAsset } from './assets';
import type { CityMap } from './map/types';
import { tileDemand, tileDemandMW } from './map/demand';
import type { CouncilAdoption } from './customers/adoption';

export { subCapexK, subRadius };

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
  /** dist-sub asset id → signed-up peak demand, MW (incl. DER uptake). */
  peakOfSub: Map<number, number>;
  /** Every tile with demand (incl. load sites), served or not. */
  demandTiles: number[];
  /** Total customers on the map (served or not). */
  totalCustomers: number;
  /** Total base peak demand, MW (served or not). */
  totalDemandMW: number;
}

/** Planning peak for a tile: everything that can coincide on a cold
 *  evening (PV export doesn't relieve the transformer at peak). */
function tilePeakMW(
  map: CityMap,
  i: number,
  councils: Map<number, CouncilAdoption> | undefined,
  siteMW: number,
): number {
  const d = tileDemand(map, i, councils);
  return d.domMW + d.procMW + d.evMW + d.hpMW + siteMW;
}

export function assignServiceAreas(
  map: CityMap,
  assets: Iterable<PlacedAsset>,
  loadSites: LoadSite[],
  councils?: Map<number, CouncilAdoption>,
): ServiceAreas {
  interface SubSlot {
    id: number;
    x: number;
    y: number;
    r2: number;
    capacityMW: number;
    assignedMW: number;
  }
  const subs: SubSlot[] = [];
  for (const a of assets) {
    if (a.kind !== 'sub') continue;
    if (SUBS[a.sub].serviceRadius === undefined) continue;
    const mva = subMva(a);
    const r = subRadius(a.sub, mva);
    subs.push({ id: a.id, x: a.x, y: a.y, r2: r * r, capacityMW: mva, assignedMW: 0 });
  }

  const siteOfTile = new Map<number, LoadSite>();
  for (const s of loadSites) siteOfTile.set(s.y * map.width + s.x, s);

  const subOfTile = new Map<number, number>();
  const tilesOfSub = new Map<number, number[]>();
  const customersOfSub = new Map<number, number>();
  const peakOfSub = new Map<number, number>();
  const demandTiles: number[] = [];
  let totalCustomers = 0;
  let totalDemandMW = 0;

  // collect demand tiles + every (tile, sub) pairing in reach
  interface Pair {
    tile: number;
    sub: SubSlot;
    d2: number;
    peakMW: number;
    customers: number;
  }
  const pairs: Pair[] = [];
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
      const peakMW = tilePeakMW(map, i, councils, site?.mw ?? 0);
      for (const s of subs) {
        const dx = s.x - x;
        const dy = s.y - y;
        const d2 = dx * dx + dy * dy;
        if (d2 <= s.r2) pairs.push({ tile: i, sub: s, d2, peakMW, customers: tileCustomers });
      }
    }
  }

  // nearest-first, capacity-limited: a sub signs tiles up until its
  // transformer is fully subscribed (one tile may overshoot — dedicated
  // feeders for big sites — but a full sub signs nothing more)
  pairs.sort((a, b) => a.d2 - b.d2 || a.tile - b.tile || a.sub.id - b.sub.id);
  for (const p of pairs) {
    if (subOfTile.has(p.tile)) continue;
    if (p.sub.assignedMW >= p.sub.capacityMW) continue;
    p.sub.assignedMW += p.peakMW;
    subOfTile.set(p.tile, p.sub.id);
    let tiles = tilesOfSub.get(p.sub.id);
    if (!tiles) {
      tiles = [];
      tilesOfSub.set(p.sub.id, tiles);
    }
    tiles.push(p.tile);
    customersOfSub.set(p.sub.id, (customersOfSub.get(p.sub.id) ?? 0) + p.customers);
  }
  for (const s of subs) peakOfSub.set(s.id, s.assignedMW);

  return {
    subOfTile,
    tilesOfSub,
    customersOfSub,
    peakOfSub,
    demandTiles,
    totalCustomers,
    totalDemandMW,
  };
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
