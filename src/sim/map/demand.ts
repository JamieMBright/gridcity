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

// --- time-of-use tariff (ROADMAP #24) ---------------------------------------
//
// Once the ToU pilot delivers (tech.touTariff), domestic demand across
// the whole licence area runs a re-shaped diurnal profile: the evening
// peak shaves ~8% and the shaved energy moves into the midday shoulder,
// so the DAY'S ENERGY IS CONSERVED — a tariff changes when people use
// power, not how much. Implemented as a time-of-day RATIO against the
// canonical domesticProfile, applied to each catchment's domMW
// (customers/smartCharging.ts shapeSubLoads) so dispatch's global
// domestic factor lands on the ToU shape without touching dispatch.
//
// The gaussian terms below mirror events/weather.ts domesticProfile
// (that file is read-only to this lane); the seasonal multiplier cancels
// in the ratio, which is why conservation holds in every season.

/** Fraction shaved off the evening gaussian (≈8% off the peak VALUE,
 *  since the evening term carries ~0.62 of the ~1.0 peak). */
export const TOU_EVENING_SHAVE = 0.133;
/** Midday shoulder fill, sized so ∫fill dt = ∫shave dt over a day:
 *  shave energy = TOU_EVENING_SHAVE · 0.62 · 2.3√π, fill = TOU_FILL · 3√π. */
export const TOU_FILL = (TOU_EVENING_SHAVE * 0.62 * 2.3) / 3;

/** ToU/base domestic profile ratio at this moment (≤1 at the evening
 *  peak, >1 over the midday shoulder; daily ∫ratio·dom dt = ∫dom dt). */
export function touDomesticRatio(simTimeMin: number): number {
  const h = (simTimeMin / 60) % 24;
  const morning = 0.2 * Math.exp(-(((h - 7.8) / 1.6) ** 2));
  const evening = 0.62 * Math.exp(-(((h - 18.4) / 2.3) ** 2));
  const base = 0.38 + morning + evening;
  const fill = TOU_FILL * Math.exp(-(((h - 13) / 3) ** 2));
  return (base - TOU_EVENING_SHAVE * evening + fill) / base;
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
