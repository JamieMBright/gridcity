// Wave 9 — missing landmarks + the gleam: the new heroes (Wembley, the O2,
// Crystal Palace mast, Alexandra Palace, ExCeL, Kew Palm House, BT Tower)
// must land at their TRUE positions and reserve their precincts, the Gherkin
// must carry a real LANDMARK id, and every hero sprite must be registered in
// the atlas under the 4096px ceiling.

import { describe, expect, it } from 'vitest';
import { buildLondonMap, NAMED_PLACES } from '../src/data/londonMap';
import { LANDMARK, ZONE } from '../src/sim/map/types';
import { buildAtlas } from '../src/render/sprites/atlas';

const map = buildLondonMap();

function tilesOf(id: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  const lm = map.landmark;
  if (!lm) return out;
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      if (lm[y * map.width + x] === id) out.push([x, y]);
    }
  }
  return out;
}

describe('wave-9 landmarks', () => {
  it('places every new hero at (or snapped beside) its true relative position', () => {
    // single-anchor icons snap to the nearest free tile of their target (the
    // exact tile is sometimes already protected fabric / CBD) — within 2
    const near = (id: number, tx: number, ty: number): void => {
      const t = tilesOf(id);
      expect(t, `landmark ${id} should be placed`).toHaveLength(1);
      const d = Math.hypot((t[0]?.[0] ?? 0) - tx, (t[0]?.[1] ?? 0) - ty);
      expect(d, `landmark ${id} near (${tx},${ty})`).toBeLessThanOrEqual(2);
    };
    near(LANDMARK.wembley, 88, 60); // NW
    near(LANDMARK.o2dome, 140, 90); // Greenwich peninsula
    near(LANDMARK.palacemast, 118, 118); // S ridge
    near(LANDMARK.kewhouse, 86, 96); // river bend
    near(LANDMARK.bttower, 112, 72); // West End
    // the Gherkin is stamped on its exact City tile (a real id that survives)
    expect(tilesOf(LANDMARK.gherkin)).toEqual([[118, 77]]);
  });

  it('reserves the multi-tile precincts in full (no stray holes)', () => {
    expect(tilesOf(LANDMARK.allypally)).toHaveLength(2); // 2×1
    expect(tilesOf(LANDMARK.excel)).toHaveLength(2); // 2×1
    // Heathrow's bespoke concrete island is an 8×3 stamp
    const hw = tilesOf(LANDMARK.heathrow);
    expect(hw).toHaveLength(24);
    const xs = hw.map(([x]) => x);
    const ys = hw.map(([, y]) => y);
    expect(Math.min(...xs)).toBe(61);
    expect(Math.max(...xs)).toBe(68);
    expect(Math.min(...ys)).toBe(86);
    expect(Math.max(...ys)).toBe(88);
  });

  it('Heathrow is open tarmac fabric (no zone/road under the apron)', () => {
    for (const [x, y] of tilesOf(LANDMARK.heathrow)) {
      const i = y * map.width + x;
      expect(map.zone[i]).toBe(0); // ZONE.none
      expect(map.road[i] ?? 0).toBe(0); // RC.none — nothing builds on the apron
    }
  });

  it('keeps the heroes to ~6–8 true new additions (5% hero rule)', () => {
    const newHeroes = [
      LANDMARK.wembley,
      LANDMARK.o2dome,
      LANDMARK.palacemast,
      LANDMARK.allypally,
      LANDMARK.excel,
      LANDMARK.kewhouse,
      LANDMARK.bttower,
      LANDMARK.gherkin,
    ];
    expect(newHeroes.length).toBeLessThanOrEqual(8);
    for (const id of newHeroes) expect(tilesOf(id).length).toBeGreaterThan(0);
  });

  it('names the new heroes in NAMED_PLACES', () => {
    const names = new Set(NAMED_PLACES.map((p) => p.name));
    for (const n of ['Wembley', 'The O2', 'Crystal Palace', 'Alexandra Palace', 'ExCeL', 'Kew Gardens', 'BT Tower']) {
      expect(names.has(n), `NAMED_PLACES should include ${n}`).toBe(true);
    }
  });

  it('registers every hero sprite in the atlas under the 4096px ceiling', () => {
    const atlas = buildAtlas();
    expect(atlas.width).toBeLessThanOrEqual(4096);
    expect(atlas.height).toBeLessThanOrEqual(4096);
    for (const name of [
      'lm_wembley',
      'lm_o2dome',
      'lm_palacemast',
      'lm_allypally',
      'lm_excel',
      'lm_kewhouse',
      'lm_bttower',
      'lm_gherkin',
      'lm_heathrow',
    ]) {
      const f = atlas.frames.get(name);
      expect(f, `atlas should contain ${name}`).toBeDefined();
      expect((f?.w ?? 0) > 0 && (f?.h ?? 0) > 0).toBe(true);
    }
  });

  it('the atlas frames never overlap on the sheet (trim offsets are sound)', () => {
    const atlas = buildAtlas();
    const fr = [...atlas.frames.values()];
    for (let i = 0; i < fr.length; i++) {
      for (let j = i + 1; j < fr.length; j++) {
        const a = fr[i]!;
        const b = fr[j]!;
        const overlap =
          a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
        expect(overlap, 'no two atlas frames may overlap').toBe(false);
      }
    }
  });

  it('is deterministic (same landmark raster every build)', () => {
    const again = buildLondonMap();
    expect(again.landmark).toEqual(map.landmark);
  });
});

describe('Queen Elizabeth Olympic Park (Stratford)', () => {
  it('places the four heroes at their true relative positions on the Lea east bank', () => {
    const one = (id: number): [number, number] => {
      const t = tilesOf(id);
      expect(t, `landmark ${id} should have an anchor`).not.toHaveLength(0);
      return t[0]!;
    };
    const velo = one(LANDMARK.velodrome);
    const orbit = one(LANDMARK.orbit);
    // the new park stadium (there is exactly one stadium, now in Stratford)
    const stad = tilesOf(LANDMARK.stadium);
    expect(stad).toHaveLength(1);
    // all sit on the east bank of the Lea (x >= 132) in the Stratford band
    for (const [x, y] of [velo, stad[0]!, orbit]) {
      expect(x).toBeGreaterThanOrEqual(132);
      expect(y).toBeGreaterThanOrEqual(64);
      expect(y).toBeLessThanOrEqual(74);
    }
    // true relative order: VeloPark north of the stadium; Orbit east of it
    expect(velo[1]).toBeLessThan(stad[0]![1]);
    expect(orbit[0]).toBeGreaterThan(stad[0]![0]);
  });

  it('reserves Westfield as a full 2×2 retail precinct to the south-east', () => {
    const wf = tilesOf(LANDMARK.westfield);
    expect(wf).toHaveLength(4);
    const xs = wf.map(([x]) => x);
    const ys = wf.map(([, y]) => y);
    expect(Math.max(...xs) - Math.min(...xs)).toBe(1);
    expect(Math.max(...ys) - Math.min(...ys)).toBe(1);
    // SE of the stadium (further east and south)
    const stad = tilesOf(LANDMARK.stadium)[0]!;
    expect(Math.max(...ys)).toBeGreaterThan(stad[1]);
  });

  it('stands the heroes in Olympic parkland, not dense towers', () => {
    // the tiles immediately around the cluster are park (ZONE.park = 8), so the
    // four heroes read as the park rather than being swamped by urbanCore towers
    let park = 0;
    for (let y = 65; y <= 73; y++) {
      for (let x = 132; x <= 139; x++) {
        if (map.zone[y * map.width + x] === ZONE.park) park++;
      }
    }
    expect(park).toBeGreaterThan(30); // most of the precinct apron is parkland
  });

  it('names the Olympic Park landmarks in NAMED_PLACES', () => {
    const names = new Set(NAMED_PLACES.map((p) => p.name));
    for (const n of ['Olympic Park', 'Lee Valley VeloPark', 'ArcelorMittal Orbit', 'Westfield Stratford']) {
      expect(names.has(n), `NAMED_PLACES should include ${n}`).toBe(true);
    }
  });

  it('registers the new Olympic sprites in the atlas under the 4096px ceiling', () => {
    const atlas = buildAtlas();
    expect(atlas.width).toBeLessThanOrEqual(4096);
    expect(atlas.height).toBeLessThanOrEqual(4096);
    for (const name of ['lm_velodrome', 'lm_orbit', 'lm_westfield']) {
      const f = atlas.frames.get(name);
      expect(f, `atlas should contain ${name}`).toBeDefined();
      expect((f?.w ?? 0) > 0 && (f?.h ?? 0) > 0).toBe(true);
    }
  });
});
