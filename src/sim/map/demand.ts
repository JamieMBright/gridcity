// Demand model: domestic load (diurnal household profile), process load
// (industry/glasshouses, flatter), and DER components that appear as the
// councils electrify — EVs (evening), heat pumps (cold/morning), rooftop
// PV (midday export, weather-dependent).

import { ADMD_KW } from '../catalog';
import { EV_KW, HP_KW, PV_EXPORT_KW, type CouncilAdoption } from '../customers/adoption';
import { NO_COUNCIL, ZONE, type CityMap, type Zone } from './types';

/** Extra process load (MW per tile) beyond domestic customers. */
const PROCESS_MW: Partial<Record<Zone, number>> = {
  [ZONE.industrial]: 0.5,
  [ZONE.greenhouse]: 0.7, // glasshouse lighting and heat pumps
};

export interface TileDemand {
  domMW: number;
  procMW: number;
  /** Peak EV charging load at full diversity, MW. */
  evMW: number;
  /** Peak heat-pump load, MW. */
  hpMW: number;
  /** Peak rooftop-PV export, MW. */
  pvMW: number;
}

export function tileDemand(
  map: CityMap,
  i: number,
  councils?: Map<number, CouncilAdoption>,
): TileDemand {
  const customers = map.customers[i] ?? 0;
  const zone = (map.zone[i] ?? ZONE.none) as Zone;
  const d: TileDemand = {
    domMW: (customers * ADMD_KW) / 1000,
    procMW: PROCESS_MW[zone] ?? 0,
    evMW: 0,
    hpMW: 0,
    pvMW: 0,
  };
  const councilId = map.council[i] ?? NO_COUNCIL;
  const a = councilId === NO_COUNCIL ? undefined : councils?.get(councilId);
  if (zone === ZONE.newEstate && customers > 0) {
    // new-build estate: every home already has the EV, the heat pump and
    // the solar — they're just waiting for someone to energize the iDNO
    d.evMW = (customers * 0.9 * EV_KW) / 1000;
    d.hpMW = (customers * 0.95 * HP_KW) / 1000;
    d.pvMW = (customers * 0.85 * PV_EXPORT_KW) / 1000;
  } else if (a && customers > 0) {
    d.evMW = (customers * a.ev * EV_KW) / 1000;
    d.hpMW = (customers * a.hp * HP_KW) / 1000;
    d.pvMW = (customers * a.pv * PV_EXPORT_KW) / 1000;
  }
  return d;
}

/** Base peak demand of a tile (no DER), MW. */
export function tileDemandMW(map: CityMap, i: number): number {
  const customers = map.customers[i] ?? 0;
  const zone = (map.zone[i] ?? ZONE.none) as Zone;
  return (customers * ADMD_KW) / 1000 + (PROCESS_MW[zone] ?? 0);
}

export interface DemandField {
  /** Peak MW per tile index (sparse: only tiles with demand). */
  byTile: Map<number, number>;
  totalMW: number;
}

export function buildDemandField(map: CityMap): DemandField {
  const byTile = new Map<number, number>();
  let totalMW = 0;
  const n = map.width * map.height;
  for (let i = 0; i < n; i++) {
    const d = tileDemandMW(map, i);
    if (d > 0) {
      byTile.set(i, d);
      totalMW += d;
    }
  }
  return { byTile, totalMW };
}
