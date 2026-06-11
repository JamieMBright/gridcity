// Demand model. M3: static peak demand per tile; the diurnal/weather/DER
// dynamics arrive with the market milestone and adoption waves.

import { ADMD_KW } from '../catalog';
import { ZONE, type CityMap, type Zone } from './types';

/** Extra process load (MW per tile) beyond domestic customers. */
const PROCESS_MW: Partial<Record<Zone, number>> = {
  [ZONE.industrial]: 0.5,
  [ZONE.greenhouse]: 0.7, // glasshouse lighting and heat pumps
};

export function tileDemandMW(map: CityMap, i: number): number {
  const customers = map.customers[i] ?? 0;
  const zone = (map.zone[i] ?? ZONE.none) as Zone;
  const domestic = (customers * ADMD_KW) / 1000;
  return domestic + (PROCESS_MW[zone] ?? 0);
}

export interface DemandField {
  /** MW per tile index (sparse: only tiles with demand). */
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
