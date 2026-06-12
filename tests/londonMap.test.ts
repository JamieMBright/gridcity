import { describe, expect, it } from 'vitest';
import { buildLondonMap, LONDON_H, LONDON_W } from '../src/data/londonMap';
import { NO_COUNCIL, TERRAIN, ZONE } from '../src/sim/map/types';

const map = buildLondonMap();

describe('london map invariants', () => {
  it('has the expected dimensions', () => {
    expect(map.width).toBe(LONDON_W);
    expect(map.height).toBe(LONDON_H);
    expect(map.terrain.length).toBe(LONDON_W * LONDON_H);
  });

  it('is deterministic', () => {
    const again = buildLondonMap();
    expect(again.terrain).toEqual(map.terrain);
    expect(again.zone).toEqual(map.zone);
    expect(again.variant).toEqual(map.variant);
  });

  it('the Thames reaches from the west edge to the east edge', () => {
    const waterInColumn = (x: number): boolean => {
      for (let y = 0; y < map.height; y++) {
        if (map.terrain[y * map.width + x] === TERRAIN.water) return true;
      }
      return false;
    };
    for (let x = 0; x < map.width; x++) {
      expect(waterInColumn(x), `column ${x} should contain river water`).toBe(true);
    }
  });

  it('the estuary is much wider than the city river', () => {
    const widthAt = (x: number): number => {
      let count = 0;
      for (let y = 0; y < map.height; y++) {
        if (map.terrain[y * map.width + x] === TERRAIN.water) count++;
      }
      return count;
    };
    expect(widthAt(250)).toBeGreaterThan(widthAt(60) * 3);
  });

  it('every zone type is present, including the special sites', () => {
    const present = new Set<number>();
    for (const z of map.zone) present.add(z);
    for (const z of Object.values(ZONE)) {
      expect(present.has(z), `zone ${z} should exist on the map`).toBe(true);
    }
  });

  it('zones (except wind) sit on dry land', () => {
    for (let i = 0; i < map.zone.length; i++) {
      const z = map.zone[i];
      if (z === ZONE.none || z === ZONE.windSite) continue;
      expect(map.terrain[i]).not.toBe(TERRAIN.water);
    }
  });

  it('all non-water tiles belong to a council, water belongs to none', () => {
    for (let i = 0; i < map.council.length; i++) {
      if (map.terrain[i] === TERRAIN.water) {
        expect(map.council[i]).toBe(NO_COUNCIL);
      } else {
        expect(map.council[i]).toBeLessThan(map.councils.length);
      }
    }
  });

  it('has a big-city number of customers', () => {
    let total = 0;
    for (const c of map.customers) total += c;
    expect(total).toBeGreaterThan(200_000);
    expect(total).toBeLessThan(900_000);
  });

  it('councils have distinct names and valid profiles', () => {
    const names = new Set(map.councils.map((c) => c.name));
    expect(names.size).toBe(map.councils.length);
    for (const c of map.councils) {
      expect(c.affluence).toBeGreaterThanOrEqual(0);
      expect(c.affluence).toBeLessThanOrEqual(1);
      expect(c.ambition).toBeGreaterThanOrEqual(0);
      expect(c.ambition).toBeLessThanOrEqual(1);
    }
  });

  it('roads exist and never have customers on the same tile', () => {
    let roadCount = 0;
    for (let i = 0; i < map.road.length; i++) {
      if (map.road[i] === 1) {
        roadCount++;
        expect(map.customers[i]).toBe(0);
      }
    }
    expect(roadCount).toBeGreaterThan(500);
  });
});
