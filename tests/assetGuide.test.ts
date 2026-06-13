// The Asset Guide must cover EVERY build option and derive its stats live
// from the catalog — if it drifts, a player reads wrong numbers. These tests
// pin the coverage (one entry per buildable gen/sub/line + the depot) and a
// couple of the live-derivation links so the copy file can never quietly go
// stale against catalog.ts.

import { describe, expect, it } from 'vitest';
import {
  ASSET_GUIDE,
  GUIDE_CATEGORIES,
  entriesFor,
  guideEntry,
} from '../src/ui/assetGuide';
import { GENS, LINES, SUBS, type GenType, type SubType } from '../src/sim/catalog';
import { fmtMoneyK } from '../src/ui/theme';

describe('asset guide coverage', () => {
  it('has an entry for every generator type', () => {
    for (const g of Object.keys(GENS) as GenType[]) {
      expect(guideEntry(`gen:${g}`), `missing guide entry: gen:${g}`).toBeDefined();
    }
  });

  it('has an entry for every buildable substation tier (not the internal tee)', () => {
    for (const s of Object.keys(SUBS) as SubType[]) {
      if (s === 'tee') continue;
      expect(guideEntry(`sub:${s}`), `missing guide entry: sub:${s}`).toBeDefined();
    }
    // the tee is an internal junction node, never browsed
    expect(guideEntry('sub:tee')).toBeUndefined();
  });

  it('has an entry for every solved voltage level and the depot', () => {
    for (const lv of Object.keys(LINES)) {
      expect(guideEntry(`line:${lv}`), `missing guide entry: line:${lv}`).toBeDefined();
    }
    expect(guideEntry('depot')).toBeDefined();
  });

  it('every entry carries an icon, three copy fields and some stats', () => {
    for (const e of ASSET_GUIDE) {
      expect(e.Icon, `${e.key} icon`).toBeTypeOf('function');
      expect(e.what.length, `${e.key} what`).toBeGreaterThan(20);
      expect(e.does.length, `${e.key} does`).toBeGreaterThan(20);
      expect(e.when.length, `${e.key} when`).toBeGreaterThan(10);
      expect(e.stats.length, `${e.key} stats`).toBeGreaterThan(0);
    }
  });

  it('keys are unique', () => {
    const keys = ASSET_GUIDE.map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('asset guide derives stats live from the catalog', () => {
  it("a generator's capex chip matches the catalog (no hardcoding)", () => {
    const e = guideEntry('gen:nuclear');
    expect(e).toBeDefined();
    const capex = e?.stats.find((s) => s.label === 'capex');
    expect(capex?.value).toBe(fmtMoneyK(GENS.nuclear.capexK));
  });

  it("the capacitor bank's voltage + reactive chips reflect the SUBS spec", () => {
    const e = guideEntry('sub:capbank');
    expect(e).toBeDefined();
    const volts = e?.stats.find((s) => s.label === 'voltages');
    expect(volts?.value).toBe('33 kV');
    const vars = e?.stats.find((s) => s.label === 'reactive (nominal)');
    expect(vars?.value).toBe(`${SUBS.capbank.txRatingMW} MVAr`);
    // a capacitor bank has no customer catchment — no service-radius chip
    expect(e?.stats.find((s) => s.label === 'service radius')).toBeUndefined();
  });

  it("a line's overhead cost chip matches LINES capex per tile", () => {
    const e = guideEntry('line:33');
    const oh = e?.stats.find((s) => s.label === 'overhead');
    expect(oh?.value).toBe(`${fmtMoneyK(LINES[33].capexKPerTile.overhead)}/km`);
  });
});

describe('asset guide grouping', () => {
  it('every entry belongs to a declared category and every category is non-empty', () => {
    for (const e of ASSET_GUIDE) {
      expect(GUIDE_CATEGORIES).toContain(e.category);
    }
    for (const cat of GUIDE_CATEGORIES) {
      expect(entriesFor(cat).length, `category ${cat} empty`).toBeGreaterThan(0);
    }
  });
});
