// WP3 — the Pyramids of Giza as an ENERGISABLE DEMAND POINT (Cairo).
//
// The Giza sprites (pyramids + Sphinx) and their `pyramidFlood`/`sphinxFlood`
// Sound-&-Light specs already exist as ART; this proves the GAMEPLAY half:
//   1. Cairo's demand field includes a Giza heritage load (the show is a real,
//      connectable load — not pure scenery), sitting on the Giza hero tiles.
//   2. Those Giza tiles are demand tiles (so they read `unserved` until served),
//      and a substation built out to Giza ENERGISES them (subOfTile covers them)
//      — the precondition that drives the floodlight on in MapRenderer.
//   3. The load is scoped to Cairo: London (and a city with no heritage keys)
//      gets none, and the field is rebuilt deterministically from the artifact
//      (never serialized — no SAVE_VERSION implication).

import { describe, expect, it } from 'vitest';
import { buildCityFromData } from '../src/data/cityData';
import { HERO_BASE, type CityMap } from '../src/sim/map/types';
import type { SubAsset } from '../src/sim/assets';
import { buildDemandField, buildHeritageLoads, tileDemandMW } from '../src/sim/map/demand';
import { assignServiceAreas } from '../src/sim/service';
import { CAIRO_CITY } from '../src/data/cities/cairo';
import { buildLondonMap } from '../src/data/londonMap';

/** The Giza bespoke-hero keys carrying the Sound-&-Light heritage load. */
const GIZA_KEYS = ['great-pyramid', 'pyramid-khafre', 'pyramid-menkaure', 'great-sphinx'];

/** Tile indices occupied (in the landmark raster) by the named Giza heroes. */
function gizaTiles(map: CityMap): number[] {
  const table = map.heroTable ?? [];
  const gizaSlots = new Set<number>();
  table.forEach((slot, idx) => {
    if (GIZA_KEYS.includes(slot.key)) gizaSlots.add(idx);
  });
  const landmark = map.landmark;
  const out: number[] = [];
  if (!landmark) return out;
  for (let i = 0; i < landmark.length; i++) {
    const v = landmark[i] ?? 0;
    if (v >= HERO_BASE && gizaSlots.has(v - HERO_BASE)) out.push(i);
  }
  return out;
}

describe('Giza Sound-&-Light as a Cairo demand point (WP3)', () => {
  const map = buildCityFromData(CAIRO_CITY);

  it('places the Giza heroes (pyramids + Sphinx) on the map', () => {
    const keys = (map.heroTable ?? []).map((s) => s.key);
    // all four Giza monuments are registered AND stamped on the playable map
    for (const k of GIZA_KEYS) expect(keys).toContain(k);
    expect(gizaTiles(map).length).toBeGreaterThan(0);
  });

  it('attaches a heritage load to the Giza tiles (and nowhere else in Cairo)', () => {
    const heritage = map.heritageMW;
    expect(heritage).toBeDefined();
    const tiles = gizaTiles(map);
    const tileSet = new Set(tiles);

    // every tile carrying heritage MW is a Giza hero tile (scoped to Giza)…
    for (const [i, mw] of heritage!) {
      expect(mw).toBeGreaterThan(0);
      expect(tileSet.has(i)).toBe(true);
    }
    // …and the Giza monuments collectively draw a meaningful, single-substation-
    // scale heritage load. The named Giza necropolis stamps 5 heroes — Khufu
    // (4.5), Khafre (3.5), the Sphinx (3.0), and TWO Menkaure-class subsidiary
    // monuments (Meritites I + Hemiunu's tomb, 2.0 each) — summing to 15 MW.
    let total = 0;
    for (const i of tiles) total += map.heritageMW?.get(i) ?? 0;
    expect(total).toBeGreaterThan(10);
    expect(total).toBeLessThan(20);
    expect(total).toBeCloseTo(15, 5);
  });

  it('surfaces the Giza load through the base demand field + tileDemandMW', () => {
    const tiles = gizaTiles(map);
    // each Giza tile's base demand exceeds the heritage MW layered onto it
    for (const i of tiles) {
      const h = map.heritageMW?.get(i) ?? 0;
      expect(tileDemandMW(map, i)).toBeGreaterThanOrEqual(h);
      expect(tileDemandMW(map, i)).toBeGreaterThan(0);
    }
    // the field totals reflect the Giza load: removing it drops totalMW by 15.
    const withGiza = buildDemandField(map);
    const bare: CityMap = { ...map, heritageMW: undefined };
    const withoutGiza = buildDemandField(bare);
    expect(withGiza.totalMW - withoutGiza.totalMW).toBeCloseTo(15, 4);
    // and every Giza tile is a demand tile in the field (so coverage marks it).
    for (const i of tiles) expect(withGiza.byTile.has(i)).toBe(true);
  });

  it('reads UNSERVED with no network, then ENERGISES when a sub is built out to it', () => {
    const tiles = gizaTiles(map);

    // no assets → Giza tiles carry demand but are served by nobody (→ unserved).
    const dark = assignServiceAreas(map, [], [], undefined);
    const demandSet = new Set(dark.demandTiles);
    for (const i of tiles) {
      expect(demandSet.has(i)).toBe(true); // it IS a load…
      expect(dark.subOfTile.has(i)).toBe(false); // …but unenergised (floodlight dark)
    }

    // build a distribution sub on the Giza cluster centroid, sized to reach +
    // power the whole plateau (40 MVA dist → ~8.5-tile radius, ample capacity).
    let sx = 0;
    let sy = 0;
    for (const i of tiles) {
      sx += i % map.width;
      sy += Math.floor(i / map.width);
    }
    sx = Math.round(sx / tiles.length);
    sy = Math.round(sy / tiles.length);
    const sub: SubAsset = { id: 1, kind: 'sub', sub: 'dist', x: sx, y: sy, mva: 40 };

    const lit = assignServiceAreas(map, [sub], [], undefined);
    // the sub now serves the Giza tiles → coverage would read COV.on → the
    // Sound-&-Light floodlight gates ON (its footprint tiles are energised).
    for (const i of tiles) expect(lit.subOfTile.get(i)).toBe(sub.id);
    // and the sub picks up the Giza heritage load (its signed peak >= 13 MW).
    expect(lit.peakOfSub.get(sub.id) ?? 0).toBeGreaterThanOrEqual(13);
  });
});

describe('heritage loads are scoped + deterministic (WP3)', () => {
  it('London carries no heritage load (scoped to cities that declare one)', () => {
    const london = buildLondonMap();
    buildHeritageLoads(london); // explicit call: still a no-op for london fabric
    expect(london.heritageMW).toBeUndefined();
  });

  it('is deterministic — two Cairo builds produce identical heritage fields', () => {
    const a = buildCityFromData(CAIRO_CITY);
    const b = buildCityFromData(CAIRO_CITY);
    expect(a.heritageMW).toBeDefined();
    expect(b.heritageMW).toBeDefined();
    expect([...a.heritageMW!.entries()].sort((x, y) => x[0] - y[0])).toEqual(
      [...b.heritageMW!.entries()].sort((x, y) => x[0] - y[0]),
    );
  });

  it('re-running buildHeritageLoads is idempotent (no double-counting)', () => {
    const map = buildCityFromData(CAIRO_CITY);
    const before = [...(map.heritageMW ?? new Map()).values()].reduce((s, v) => s + v, 0);
    buildHeritageLoads(map); // run again
    const after = [...(map.heritageMW ?? new Map()).values()].reduce((s, v) => s + v, 0);
    expect(after).toBeCloseTo(before, 5);
  });
});
