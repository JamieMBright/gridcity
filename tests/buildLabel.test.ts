// The on-screen "Building: …" chip mapping: the armed tool resolves to a
// catalog-accurate label, and the neutral inspect tool shows nothing.

import { describe, expect, it } from 'vitest';
import { buildLabel } from '../src/ui/buildLabel';
import { GENS, SUBS } from '../src/sim/catalog';

describe('buildLabel', () => {
  it('returns null for the inspect tool (nothing being built)', () => {
    expect(buildLabel({ t: 'inspect' })).toBeNull();
  });

  it('labels a generation type with its catalog name', () => {
    expect(buildLabel({ t: 'gen', gen: 'gasCCGT' })).toEqual({
      verb: 'Building',
      name: GENS.gasCCGT.name,
    });
  });

  it('strips the voltage suffix from a substation name', () => {
    const label = buildLabel({ t: 'sub', sub: 'grid' });
    expect(label?.verb).toBe('Building');
    expect(label?.name).toBe('Grid substation');
    // sanity: the catalog name carries the parenthetical we stripped
    expect(SUBS.grid.name).toContain('(');
  });

  it('describes overhead and underground lines distinctly', () => {
    expect(buildLabel({ t: 'line', level: 132, build: 'overhead' })).toEqual({
      verb: 'Placing',
      name: '132 kV line',
    });
    expect(buildLabel({ t: 'line', level: 33, build: 'underground' })).toEqual({
      verb: 'Placing',
      name: '33 kV cable',
    });
  });

  it('labels the depot and demolish tools', () => {
    expect(buildLabel({ t: 'depot' })).toEqual({ verb: 'Building', name: 'Field depot' });
    expect(buildLabel({ t: 'demolish' })?.verb).toBe('Demolishing');
  });
});
