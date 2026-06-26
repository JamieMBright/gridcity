// Per-game application variety (owner: "I keep getting identical applications —
// Marsh Ridge Wind / Peak Shift Storage — every London game. Should be random
// seeds.").
//
// The fix has two halves, both proven here:
//   1. LARGE developer name pools (≈12+ per kind) so repeats are rare even
//      within one game.
//   2. A per-game `appSeed` that varies WHICH name each application draws —
//      OFF the tick rng, so within-game determinism (and the spawn cadence /
//      count / site / kind) is untouched, while across games the names differ.
//
// What's asserted:
//   (a) two games with DIFFERENT appSeed produce DIFFERENT name sequences;
//   (b) two games with the SAME (fixed default) appSeed produce IDENTICAL ones;
//   (c) the name pools are large;
//   (d) the appSeed roundtrips through a save (within-game determinism survives
//       a reload), and a pre-v17 save hydrates appSeed to the fixed default.

import { describe, expect, it } from 'vitest';
import {
  APP_SEED_DEFAULT,
  NAMES,
  maybeSpawnApplications,
  nameFor,
  type AppKind,
} from '../src/sim/events/applications';
import { Rng } from '../src/sim/rng';
import {
  deserialize,
  newGame,
  serialize,
  SAVE_VERSION,
  type SaveData,
} from '../src/sim/state';
import { makeTestMap, setZone } from './helpers';
import { ZONE } from '../src/sim/map/types';

/** A dense map where both generation (solar/battery on land) and demand (data
 *  centre on urban core) sites can always be placed, so a stream never stalls
 *  for want of a site and the NAMES are what vary. */
function denseMap(): ReturnType<typeof makeTestMap> {
  const map = makeTestMap(40, 40);
  for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) setZone(map, x, y, ZONE.urbanCore);
  // a block of solar sites so generation always has somewhere to go
  for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) map.zone[y * 40 + x] = ZONE.solarSite;
  return map;
}

/** Run the SAME deterministic tick stream (fixed rng seed) but with a given
 *  app-naming seed, and collect the developer names in spawn order. The rng
 *  seed is identical across calls, so cadence/count/kind/site are identical —
 *  ONLY the names can differ, and only because of appSeed. */
function nameSequence(appSeed: number, days = 400, rngSeed = 1234): string[] {
  const map = denseMap();
  const rng = new Rng(rngSeed);
  const names: string[] = [];
  let nextId = 1;
  for (let d = 0; d < days; d++) {
    const apps = maybeSpawnApplications(
      map,
      rng,
      1440,
      d * 1440,
      50_000,
      nextId,
      () => false,
      () => 50,
      appSeed,
    );
    for (const a of apps) {
      names.push(a.name);
      nextId++;
    }
  }
  return names;
}

describe('per-game application name variety', () => {
  it('(c) every kind has a LARGE name pool (so repeats are rare within a game)', () => {
    const kinds: AppKind[] = ['solarFarm', 'windOnshore', 'battery', 'dataCentre', 'evHub'];
    for (const k of kinds) {
      expect(NAMES[k].length).toBeGreaterThanOrEqual(12);
      // names are unique within a pool (no accidental dupes)
      expect(new Set(NAMES[k]).size).toBe(NAMES[k].length);
      // all non-empty
      for (const n of NAMES[k]) expect(n.length).toBeGreaterThan(0);
    }
  });

  it('(b) the SAME (fixed default) appSeed reproduces an IDENTICAL name sequence', () => {
    const a = nameSequence(APP_SEED_DEFAULT);
    const b = nameSequence(APP_SEED_DEFAULT);
    expect(a.length).toBeGreaterThan(10); // a meaningful run, not an empty one
    expect(a).toEqual(b);
  });

  it('(a) a DIFFERENT appSeed produces a DIFFERENT name sequence (same tick stream)', () => {
    // identical rng seed ⇒ identical cadence/count/kind/site; only appSeed differs
    const base = nameSequence(APP_SEED_DEFAULT);
    const other = nameSequence(0x12345678);
    expect(base.length).toEqual(other.length); // same number of apps (rng unchanged)
    expect(base.length).toBeGreaterThan(10);
    expect(base).not.toEqual(other); // but the NAMES differ
    // and they really do differ in a lot of slots, not just one
    let diff = 0;
    for (let i = 0; i < base.length; i++) if (base[i] !== other[i]) diff++;
    expect(diff).toBeGreaterThan(base.length / 4);
  });

  it('several distinct seeds give pairwise-distinct sequences (not one lucky pair)', () => {
    const seeds = [APP_SEED_DEFAULT, 0x1, 0xdeadbeef, 0x2468ace0, 0x0badf00d];
    const seqs = seeds.map((s) => nameSequence(s, 300));
    for (let i = 0; i < seqs.length; i++) {
      for (let j = i + 1; j < seqs.length; j++) {
        expect(seqs[i]).not.toEqual(seqs[j]);
      }
    }
  });

  it('nameFor is a pure, in-pool function of (appSeed, id) — same inputs ⇒ same name', () => {
    for (const id of [1, 2, 7, 50, 999]) {
      const n1 = nameFor('battery', 0xabc, id);
      const n2 = nameFor('battery', 0xabc, id);
      expect(n1).toBe(n2);
      expect(NAMES.battery).toContain(n1);
    }
    // different seed for the same id generally lands a different name
    expect(nameFor('windOnshore', 1, 5)).not.toBe(nameFor('windOnshore', 2, 5));
  });
});

describe('appSeed save round-trip', () => {
  it('persists the appSeed (within-game determinism survives a reload)', () => {
    const s = newGame('london');
    s.appSeed = 0x0c0ffee1;
    const data = serialize(s);
    expect(data.v).toBe(SAVE_VERSION);
    expect(data.appSeed).toBe(0x0c0ffee1);
    expect(deserialize(data).appSeed).toBe(0x0c0ffee1);
  });

  it('hydrates a pre-v17 save (no appSeed) to the fixed default', () => {
    const s = newGame('london');
    const data = serialize(s) as SaveData & { appSeed?: number };
    delete data.appSeed; // simulate an older save written before this field
    expect(deserialize(data).appSeed).toBe(APP_SEED_DEFAULT);
  });
});
