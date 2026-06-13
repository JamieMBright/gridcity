// Every buildable generator and substation tier must have a bespoke icon
// in the shared registry — the build palette and the collapsed mobile rail
// both index it, so a missing glyph would render a blank tap target.

import { describe, expect, it } from 'vitest';
import { GEN_ICONS, SUB_ICONS } from '../src/ui/icons';
import { GENS, SUBS } from '../src/sim/catalog';
import type { GenType, SubType } from '../src/sim/catalog';

// the tiers a player actually places (tee is an internal junction node).
const BUILDABLE_SUBS: SubType[] = ['bulk', 'grid', 'dist', 'pole', 'vault', 'capbank'];

describe('bespoke icon registry', () => {
  it('has a glyph for every generator type', () => {
    for (const g of Object.keys(GENS) as GenType[]) {
      expect(GEN_ICONS[g], `missing gen icon: ${g}`).toBeTypeOf('function');
    }
  });

  it('has a glyph for every buildable substation tier', () => {
    for (const s of BUILDABLE_SUBS) {
      expect(SUB_ICONS[s], `missing sub icon: ${s}`).toBeTypeOf('function');
    }
    // every SUBS spec except the internal tee should resolve too
    for (const s of Object.keys(SUBS) as SubType[]) {
      if (s === 'tee') continue;
      expect(SUB_ICONS[s], `missing sub icon: ${s}`).toBeTypeOf('function');
    }
  });
});
