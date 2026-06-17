// Demand-model unit tests focused on the car-park EV-charging load (WP5):
// a modest per-car-park EV load that lives in the demand field and GROWS
// with the surrounding council's EV adoption — deterministic, scoped to the
// demand model.

import { describe, expect, it } from 'vitest';
import {
  CARPARK_EV_MW,
  carparkEvMW,
  tileDemand,
  tileDemandMW,
} from '../src/sim/map/demand';
import { assignServiceAreas } from '../src/sim/service';
import { LANDMARK, NO_COUNCIL, ZONE, type CityMap } from '../src/sim/map/types';
import type { CouncilAdoption } from '../src/sim/customers/adoption';
import type { PlacedAsset } from '../src/sim/assets';
import { makeTestMap, setZone } from './helpers';

/** A test map with a landmark raster allocated (makeTestMap omits it). */
function mapWithLandmarks(w: number, h: number): CityMap {
  const map = makeTestMap(w, h);
  map.landmark = new Uint8Array(w * h);
  return map;
}

const at = (map: CityMap, x: number, y: number) => y * map.width + x;

describe('carparkEvMW (the growing per-car-park EV load)', () => {
  it('is zero at no adoption and the full peak at full adoption', () => {
    expect(carparkEvMW(0)).toBe(0);
    expect(carparkEvMW(1)).toBeCloseTo(CARPARK_EV_MW, 9);
  });

  it('grows monotonically with EV adoption (a busier hub as the area electrifies)', () => {
    const samples = [0, 0.1, 0.25, 0.5, 0.85, 1].map(carparkEvMW);
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]!).toBeGreaterThan(samples[i - 1]!);
    }
    // linear in adoption: half the uptake ⇒ half the load
    expect(carparkEvMW(0.5)).toBeCloseTo(CARPARK_EV_MW * 0.5, 9);
  });

  it('clamps a stray out-of-range adoption fraction to [0,1]', () => {
    expect(carparkEvMW(-0.5)).toBe(0);
    expect(carparkEvMW(1.5)).toBeCloseTo(CARPARK_EV_MW, 9);
  });

  it('is a MODEST load — a fraction of an industrial process tile', () => {
    // sanity on the "light realism touch" scale: well under a 0.5 MW
    // industrial process tile, comfortably above zero
    expect(CARPARK_EV_MW).toBeGreaterThan(0);
    expect(CARPARK_EV_MW).toBeLessThan(0.5);
  });
});

describe('tileDemand picks up the car-park EV load', () => {
  it('a car-park tile draws EV that grows with its council adoption', () => {
    const map = mapWithLandmarks(8, 8);
    const i = at(map, 3, 3);
    map.landmark![i] = LANDMARK.carpark;
    map.council[i] = 0; // give it a council so adoption applies

    // no adoption yet → no car-park load
    const dry: Map<number, CouncilAdoption> = new Map([[0, { ev: 0, hp: 0, pv: 0 }]]);
    expect(tileDemand(map, i, dry).evMW).toBeCloseTo(0, 9);

    // a quarter adopted → a quarter of the peak
    const some: Map<number, CouncilAdoption> = new Map([[0, { ev: 0.25, hp: 0, pv: 0 }]]);
    expect(tileDemand(map, i, some).evMW).toBeCloseTo(CARPARK_EV_MW * 0.25, 6);

    // fully adopted → the full modest peak
    const full: Map<number, CouncilAdoption> = new Map([[0, { ev: 1, hp: 0, pv: 0 }]]);
    expect(tileDemand(map, i, full).evMW).toBeCloseTo(CARPARK_EV_MW, 6);
  });

  it('adds car-park EV ON TOP of a tile that also has homes', () => {
    const map = mapWithLandmarks(8, 8);
    const i = at(map, 3, 3);
    setZone(map, 3, 3, ZONE.urban); // homes on the same tile
    map.landmark![i] = LANDMARK.carpark;
    map.council[i] = 0;
    const a: Map<number, CouncilAdoption> = new Map([[0, { ev: 0.5, hp: 0, pv: 0 }]]);

    const withPark = tileDemand(map, i, a).evMW;
    // strip the landmark and re-measure: the delta is exactly the car-park EV
    map.landmark![i] = LANDMARK.none;
    const homesOnly = tileDemand(map, i, a).evMW;
    expect(homesOnly).toBeGreaterThan(0); // domestic EV present
    expect(withPark - homesOnly).toBeCloseTo(carparkEvMW(0.5), 6);
  });

  it('a non-car-park tile draws no car-park load', () => {
    const map = mapWithLandmarks(8, 8);
    const i = at(map, 3, 3);
    map.landmark![i] = LANDMARK.station; // a different landmark
    map.council[i] = 0;
    const a: Map<number, CouncilAdoption> = new Map([[0, { ev: 1, hp: 0, pv: 0 }]]);
    expect(tileDemand(map, i, a).evMW).toBeCloseTo(0, 9);
  });

  it('the no-DER base demand stays clean (car-park EV is DER, not base)', () => {
    const map = mapWithLandmarks(8, 8);
    const i = at(map, 3, 3);
    map.landmark![i] = LANDMARK.carpark;
    // tileDemandMW is the baseline used for headroom etc — must exclude DER
    expect(tileDemandMW(map, i)).toBe(0);
  });

  it('a car park with no council draws nothing (no growth signal)', () => {
    const map = mapWithLandmarks(8, 8);
    const i = at(map, 3, 3);
    map.landmark![i] = LANDMARK.carpark;
    map.council[i] = NO_COUNCIL;
    expect(tileDemand(map, i, new Map()).evMW).toBeCloseTo(0, 9);
  });
});

describe('a car-park EV load reaches the network (service assignment)', () => {
  // a dist sub beside a car-park tile that has NO homes: the catchment must
  // still pick the car-park tile up and carry its (growing) EV load.
  function fixture(evAdoption: number): { peakMW: number; assigned: boolean } {
    const map = mapWithLandmarks(12, 12);
    const cp = at(map, 6, 6);
    map.landmark![cp] = LANDMARK.carpark;
    map.council[cp] = 0;
    const sub: PlacedAsset = {
      id: 1,
      kind: 'sub',
      sub: 'dist',
      x: 6,
      y: 5,
      mva: 10,
      mvaAuto: false,
    };
    const councils: Map<number, CouncilAdoption> = new Map([
      [0, { ev: evAdoption, hp: 0, pv: 0 }],
    ]);
    const svc = assignServiceAreas(map, [sub], [], councils);
    return {
      peakMW: svc.peakOfSub.get(1) ?? 0,
      assigned: svc.subOfTile.get(cp) === 1,
    };
  }

  it('the car-park tile is signed up to the sub and contributes its EV peak', () => {
    const half = fixture(0.5);
    expect(half.assigned).toBe(true);
    expect(half.peakMW).toBeCloseTo(carparkEvMW(0.5), 6);
  });

  it('the served car-park load GROWS as the council electrifies', () => {
    const low = fixture(0.1).peakMW;
    const mid = fixture(0.5).peakMW;
    const high = fixture(1).peakMW;
    expect(low).toBeGreaterThan(0);
    expect(mid).toBeGreaterThan(low);
    expect(high).toBeGreaterThan(mid);
    expect(high).toBeCloseTo(CARPARK_EV_MW, 6);
  });
});
