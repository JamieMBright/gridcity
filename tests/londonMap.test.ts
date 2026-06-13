import { describe, expect, it } from 'vitest';
import {
  buildLondonMap,
  LONDON_H,
  LONDON_W,
  riverCenterY,
  riverHalfWidth,
} from '../src/data/londonMap';
import { sampleRoute } from '../src/sim/map/routes';
import { LANDMARK, NO_COUNCIL, RC, TERRAIN, ZONE } from '../src/sim/map/types';

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

  it('transport is a vector network stamped onto the raster', () => {
    const kinds = new Set((map.routes ?? []).map((r) => r.kind));
    for (const k of ['motorway', 'arterial', 'street', 'lane', 'rail']) {
      expect(kinds.has(k as never), `route class ${k} should exist`).toBe(true);
    }
    let streets = 0;
    let heavy = 0;
    for (let i = 0; i < map.road.length; i++) {
      const rc = map.road[i] ?? 0;
      if (rc === RC.street || rc === RC.streetTouch) streets++;
      if (rc >= RC.arterial) {
        heavy++;
        // nobody lives under a motorway, an A-road or the railway
        expect(map.customers[i]).toBe(0);
      }
    }
    expect(streets).toBeGreaterThan(1000); // homes keep fronting the streets
    expect(heavy).toBeGreaterThan(400);
  });

  it('streets follow the tile-edge lattice: integer corners, axis-aligned runs', () => {
    for (const r of map.routes ?? []) {
      if (r.kind !== 'street') continue;
      for (const [x, y] of r.pts) {
        expect(Number.isInteger(x) && Number.isInteger(y), `street point ${x},${y}`).toBe(true);
      }
      for (let k = 0; k + 1 < r.pts.length; k++) {
        const a = r.pts[k];
        const b = r.pts[k + 1];
        if (!a || !b) continue;
        expect(a[0] === b[0] || a[1] === b[1], `street segment ${a} → ${b} is diagonal`).toBe(
          true,
        );
      }
    }
  });

  it('no street, lane or arterial crosses the Thames away from a bridge', () => {
    // the designated crossings: Kingston/Richmond/Hammersmith and the
    // central bridges, the Circular's two crossings (96, 145), the
    // Staines town bridge (30), Tower Bridge (120) and the pier (238)
    const BRIDGES = new Set([30, 74, 80, 88, 96, 102, 106, 110, 114, 117, 120, 145, 238]);
    for (const r of map.routes ?? []) {
      if (r.kind === 'rail' || r.kind === 'motorway') continue;
      for (const [sx, sy] of sampleRoute(r, 0.3)) {
        const inThames = Math.abs(sy - riverCenterY(sx)) <= riverHalfWidth(sx) - 0.6;
        if (inThames) {
          expect(
            BRIDGES.has(Math.round(sx)),
            `${r.kind} crosses the Thames off-bridge at ${sx.toFixed(1)},${sy.toFixed(1)}`,
          ).toBe(true);
        }
      }
    }
  });

  it('no rock-wall rim: the extreme map edge is not blanketed in hill terrain', () => {
    // owner: "the edges of the map are rock walls. Just stick to real
    // towns." The top/bottom margin rows must NOT be a continuous hill
    // band — the uplands are real geographic masses, not a cliff rim.
    const rowHillFrac = (y: number): number => {
      let hill = 0;
      let land = 0;
      for (let x = 0; x < map.width; x++) {
        const t = map.terrain[y * map.width + x];
        if (t === TERRAIN.water) continue;
        land++;
        if (t === TERRAIN.hill) hill++;
      }
      return land === 0 ? 0 : hill / land;
    };
    // the very outer rows are countryside/sea, never a hill wall
    expect(rowHillFrac(0)).toBeLessThan(0.2);
    expect(rowHillFrac(map.height - 1)).toBeLessThan(0.2);
  });

  it('the urban fabric is dense: a big continuous core fills the inner map', () => {
    // denser than the old sparse blob (owner: "London is more dense than
    // this"). Count built tiles inside ~30 of Charing Cross [118,80].
    let core = 0;
    for (let y = 50; y <= 110; y++) {
      for (let x = 88; x <= 148; x++) {
        const z = map.zone[y * map.width + x];
        if (z === ZONE.urbanCore || z === ZONE.cbd) core++;
      }
    }
    expect(core).toBeGreaterThan(800); // a solid inner mass, not a small patch
  });

  it('the radial road skeleton converges on the centre (a spider web, not a lattice)', () => {
    // every arterial radial should have an endpoint near Charing Cross AND
    // reach out toward the edge — the leading lines that carry the eye in.
    const arterials = (map.routes ?? []).filter((r) => r.kind === 'arterial');
    let convergent = 0;
    for (const r of arterials) {
      const near = r.pts.some(([x, y]) => Math.hypot(x - 118, y - 80) < 16);
      const far = r.pts.some(
        ([x, y]) => x <= 2 || x >= map.width - 2 || y <= 2 || y >= map.height - 2,
      );
      if (near && far) convergent++;
    }
    expect(convergent).toBeGreaterThanOrEqual(6); // the real radial bundle
  });

  it('to-scale landmarks reserve their full precincts', () => {
    const tilesOf = (id: number): number => {
      let count = 0;
      for (const lm of map.landmark ?? []) if (lm === id) count++;
      return count;
    };
    expect(tilesOf(LANDMARK.parliament)).toBe(6); // 3 long × 2 deep on the bank
    expect(tilesOf(LANDMARK.dome)).toBe(4); // St Paul's 2×2
    expect(tilesOf(LANDMARK.powerstation)).toBe(4); // Battersea 2×2
    expect(tilesOf(LANDMARK.eye)).toBe(1); // single-anchor icons stay as-is
    expect(tilesOf(LANDMARK.spire)).toBe(1);
  });
});
