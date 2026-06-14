// The serialized-city format + runtime loader, exercised against the REAL
// generated Paris artifact (proving the OSM pipeline → committed data →
// CityMap → sim round-trip the game itself relies on).

import { describe, expect, it } from 'vitest';
import {
  buildCityFromData,
  decodeBytes,
  encodeBytes,
  fillDerivedLayers,
  variantFor,
  vegetationFor,
} from '../src/data/cityData';
import { CUSTOMERS_PER_TILE, TERRAIN, ZONE, type CityMap } from '../src/sim/map/types';
import { buildDemandField } from '../src/sim/map/demand';
import { PARIS_CITY } from '../src/data/cities/paris';

describe('base64 typed-array codec', () => {
  it('round-trips arbitrary bytes', () => {
    const bytes = new Uint8Array(1000);
    for (let i = 0; i < bytes.length; i++) bytes[i] = (i * 37) & 0xff;
    expect(Array.from(decodeBytes(encodeBytes(bytes)))).toEqual(Array.from(bytes));
  });
  it('handles an empty array', () => {
    expect(decodeBytes(encodeBytes(new Uint8Array(0))).length).toBe(0);
  });
});

describe('derived layers', () => {
  it('customers/vegetation/variant derive deterministically from terrain+zone', () => {
    const w = 4;
    const h = 1;
    const map: CityMap = {
      width: w,
      height: h,
      terrain: Uint8Array.from([TERRAIN.land, TERRAIN.water, TERRAIN.trees, TERRAIN.land]),
      zone: Uint8Array.from([ZONE.urbanCore, ZONE.none, ZONE.none, ZONE.park]),
      council: new Uint8Array(w * h),
      road: new Uint8Array(w * h),
      customers: new Uint16Array(w * h),
      vegetation: new Uint8Array(w * h),
      variant: new Uint8Array(w * h),
      councils: [],
    };
    fillDerivedLayers(map);
    expect(map.customers[0]).toBe(CUSTOMERS_PER_TILE[ZONE.urbanCore]);
    expect(map.customers[1]).toBe(0);
    expect(map.vegetation[1]).toBe(0); // water
    expect(map.vegetation[2]).toBe(210); // trees
    expect(map.vegetation[0]).toBe(vegetationFor(TERRAIN.land, ZONE.urbanCore));
    expect(map.variant[3]).toBe(variantFor(3));
  });
});

describe('the generated Paris city', () => {
  const map = buildCityFromData(PARIS_CITY);
  const n = map.width * map.height;
  const count = (pred: (i: number) => boolean): number => {
    let c = 0;
    for (let i = 0; i < n; i++) if (pred(i)) c++;
    return c;
  };

  it('loads at the standard grid size with councils + places', () => {
    expect(map.width).toBe(256);
    expect(map.height).toBe(160);
    expect(map.councils.length).toBeGreaterThan(0);
    expect(PARIS_CITY.named.length).toBeGreaterThan(10);
    expect(PARIS_CITY.attribution).toMatch(/OpenStreetMap/);
  });

  it('has the Seine (a meaningful amount of water) and green space', () => {
    const water = count((i) => map.terrain[i] === TERRAIN.water);
    const trees = count((i) => map.terrain[i] === TERRAIN.trees);
    expect(water / n).toBeGreaterThan(0.02);
    expect(water / n).toBeLessThan(0.4);
    expect(trees).toBeGreaterThan(0);
  });

  it('has a graded urban form (a dense core, an urban ring, suburbs)', () => {
    const core = count((i) => map.zone[i] === ZONE.urbanCore);
    const urban = count((i) => map.zone[i] === ZONE.urban);
    const suburb = count((i) => map.zone[i] === ZONE.suburb);
    expect(core).toBeGreaterThan(100);
    expect(urban).toBeGreaterThan(100);
    expect(suburb).toBeGreaterThan(100);
    // not a monoculture: no single built zone is the entire city
    expect(core / n).toBeLessThan(0.5);
  });

  it('routes and a road raster exist', () => {
    expect((map.routes ?? []).length).toBeGreaterThan(50);
    expect(count((i) => (map.road[i] ?? 0) > 0)).toBeGreaterThan(500);
  });

  it('names recognisable Paris landmarks as heroes', () => {
    const heroes = PARIS_CITY.named.filter((p) => p.landmark).map((p) => p.name.toLowerCase());
    const joined = heroes.join(' | ');
    expect(joined).toMatch(/tour eiffel|notre-dame|louvre/);
  });

  it('produces a sim-compatible map (demand field is populated)', () => {
    const field = buildDemandField(map);
    expect(field.totalMW).toBeGreaterThan(0);
    expect(field.byTile.size).toBeGreaterThan(100);
  });

  it('every council id painted on the map has a profile', () => {
    const maxId = map.councils.length - 1;
    for (let i = 0; i < n; i++) {
      const c = map.council[i] ?? 255;
      if (c !== 255) expect(c).toBeLessThanOrEqual(maxId);
    }
  });
});
