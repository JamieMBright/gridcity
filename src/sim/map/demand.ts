// Demand model: domestic load (diurnal household profile), process load
// (industry/glasshouses, flatter), and DER components that appear as the
// councils electrify — EVs (evening), heat pumps (cold/morning), rooftop
// PV (midday export, weather-dependent).

import { ADMD_KW } from '../catalog';
import { EV_KW, HP_KW, PV_EXPORT_KW, type CouncilAdoption } from '../customers/adoption';
import { HERO_BASE, LANDMARK, NO_COUNCIL, ZONE, type CityMap, type Zone } from './types';

/** Extra process load (MW per tile) beyond domestic customers. */
const PROCESS_MW: Partial<Record<Zone, number>> = {
  [ZONE.industrial]: 0.5,
  [ZONE.greenhouse]: 0.7, // glasshouse lighting and heat pumps
};

/** Peak public EV-charging load a surface CAR PARK draws at FULL local EV
 *  adoption, MW — a modest bank of (diversified) chargepoints. It is a DER
 *  load (an EV component), so it lives in evMW alongside domestic EV, and it
 *  GROWS with the surrounding council's EV adoption: an empty car park today,
 *  a busy charging hub once the area has electrified. 0.3 MW is the legible
 *  "light realism touch" scale — a quarter of an industrial process tile,
 *  ~a couple of rapid chargers plus a row of fast posts. LANDMARK.carpark is
 *  a single-tile landmark (placeLandmark stamps one tile), so this is one
 *  modest load per car park. */
export const CARPARK_EV_MW = 0.3;

/** The car park's EV-charging load right now, MW: its full-adoption peak
 *  scaled by the local council's EV fraction (clamped 0..1). Zero with no
 *  council / no uptake, so it phases in deterministically as the area
 *  electrifies — the same growth signal domestic EV rides. */
export function carparkEvMW(evAdoption: number): number {
  return CARPARK_EV_MW * Math.max(0, Math.min(1, evAdoption));
}

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
    // process load + any heritage/civic point-load on this tile (the Giza
    // Sound-&-Light show…). Heritage MW is a fixed lighting/visitor load,
    // independent of council DER uptake, so it rides the process term rather
    // than scaling with EV/HP/PV adoption.
    procMW: (PROCESS_MW[zone] ?? 0) + (map.heritageMW?.get(i) ?? 0),
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
  // public EV charging at a surface CAR PARK — additive to whatever the tile's
  // zone already draws, growing with the local council's EV adoption (new-
  // estate tiles run their estate at near-full uptake, so use 0.9 there).
  if (map.landmark?.[i] === LANDMARK.carpark) {
    const ev = zone === ZONE.newEstate ? 0.9 : (a?.ev ?? 0);
    d.evMW += carparkEvMW(ev);
  }
  return d;
}

/** Base peak demand of a tile (no DER), MW. Includes any heritage/civic
 *  point-load (Giza Sound-&-Light…) layered onto the tile. */
export function tileDemandMW(map: CityMap, i: number): number {
  const customers = map.customers[i] ?? 0;
  const zone = (map.zone[i] ?? ZONE.none) as Zone;
  return (
    (customers * ADMD_KW) / 1000 + (PROCESS_MW[zone] ?? 0) + (map.heritageMW?.get(i) ?? 0)
  );
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

// --- heritage / civic point-loads -------------------------------------------
//
// A handful of landmarks are notable ELECTRICAL loads in their own right — most
// famously the Pyramids of Giza, whose nightly Sound-&-Light show, plateau
// floodlighting and visitor complex draw real power. We model them as a fixed
// per-hero load distributed across the hero's footprint tiles, so:
//   • the player must build network OUT to Giza and energise it (the tiles read
//     `unserved` until a sub serves them), and
//   • the Sound-&-Light floodlights (`pyramidFlood`/`sphinxFlood`) gate on the
//     hero's OWN energisation — dark until powered — rather than only borrowing
//     a lit neighbour via the zero-demand fallback in MapRenderer.recomputeHeroLit.
//
// Sizing is real-then-simplified: the historic Sound-&-Light rigs are hundreds
// of kW each; with the wider visitor/AC/pumping plateau load each monument makes
// a chunky load. The named Giza necropolis stamps five heroes — Khufu, Khafre,
// the Sphinx and two Menkaure-class subsidiary monuments (queens' pyramid +
// mastaba tomb) — so the plateau totals a single-substation-scale node (~15 MW).
// Keyed by the per-city bespoke-hero KEY (so it is scenario data, not hard-coded
// tile coords) and spread over each hero's footprint.

/** Peak heritage load (MW) per bespoke-hero key, by fabric. The key set must
 *  match the hero `key`s registered in render/sprites/heroes/<fabric>.ts. */
const HERITAGE_MW: Partial<Record<NonNullable<CityMap['fabric']>, Record<string, number>>> = {
  cairo: {
    // The Giza plateau Sound-&-Light show + monument floodlighting + visitor load.
    'great-pyramid': 4.5, // Khufu — the headline show
    'pyramid-khafre': 3.5,
    'pyramid-menkaure': 2.0,
    'great-sphinx': 3.0, // the Sphinx has its own iconic nightly show
  },
};

/**
 * Build the map's sparse heritage point-load field from its bespoke-hero table.
 * Deterministic from the scenarioId (it reads only `fabric` + the already-built
 * `heroTable`/`landmark` raster), recomputed at every load by buildCityFromData,
 * and NEVER serialized — so it carries no SAVE_VERSION implication.
 *
 * For each hero whose key has a HERITAGE_MW entry, the hero's total load is
 * spread EVENLY over the tiles it occupies in the landmark raster (the same
 * footprint tiles whose coverage gates its floodlight in the renderer), so a
 * partially-served monument still draws proportional load.
 */
export function buildHeritageLoads(map: CityMap): void {
  const fabric = map.fabric ?? 'london';
  const table = HERITAGE_MW[fabric];
  const heroTable = map.heroTable;
  const landmark = map.landmark;
  if (!table || !heroTable || !landmark) return;

  // hero slot index → tiles it occupies (landmark raster value === HERO_BASE + idx)
  const tilesOfSlot = new Map<number, number[]>();
  const n = map.width * map.height;
  for (let i = 0; i < n; i++) {
    const v = landmark[i] ?? 0;
    if (v < HERO_BASE) continue;
    const idx = v - HERO_BASE;
    let tiles = tilesOfSlot.get(idx);
    if (!tiles) {
      tiles = [];
      tilesOfSlot.set(idx, tiles);
    }
    tiles.push(i);
  }

  // Recompute from scratch each call (idempotent — like buildHeroTable), so a
  // re-run never double-counts onto an existing field.
  const heritage = new Map<number, number>();
  for (let idx = 0; idx < heroTable.length; idx++) {
    const slot = heroTable[idx];
    if (!slot) continue;
    const mw = table[slot.key];
    if (mw === undefined || mw <= 0) continue;
    const tiles = tilesOfSlot.get(idx);
    if (!tiles || tiles.length === 0) continue; // hero off-map / not stamped
    const per = mw / tiles.length;
    for (const i of tiles) heritage.set(i, (heritage.get(i) ?? 0) + per);
  }

  map.heritageMW = heritage.size > 0 ? heritage : undefined;
}
