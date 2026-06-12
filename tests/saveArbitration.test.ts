// Boot save arbitration (owner bug 2026-06-12: "remembers old
// electricity equipment, even on a new game after hard refresh"). The
// old rule — whichever save has more play-time wins — meant a fresh new
// game (tick ~0) lost to the stale cloud copy on every reload. The rule
// is now most-recently-SAVED wins; tick only breaks legacy ties.

import { describe, expect, it } from 'vitest';
import { pickSave } from '../src/persistence/saveStore';

const at = (savedAt: number | undefined, tick: number) => ({ savedAt, tick });

describe('pickSave (local vs cloud slot 0)', () => {
  it('a fresh new game beats an old long-played cloud save', () => {
    const local = at(Date.now(), 3); // just reset
    const cloud = at(undefined, 50_000); // months of the old network
    expect(pickSave(local, cloud)).toBe(local);
  });

  it('cross-device: the more recently saved copy wins both ways', () => {
    const older = at(1_000_000, 90_000);
    const newer = at(2_000_000, 100);
    expect(pickSave(older, newer)).toBe(newer); // cloud newer
    expect(pickSave(newer, older)).toBe(newer); // local newer
  });

  it('legacy saves without the stamp fall back to play-time', () => {
    const shortLocal = at(undefined, 100);
    const longCloud = at(undefined, 5_000);
    expect(pickSave(shortLocal, longCloud)).toBe(longCloud);
    expect(pickSave(longCloud, shortLocal)).toBe(longCloud);
  });

  it('a stamped save beats an unstamped one regardless of tick', () => {
    const stamped = at(5, 10);
    const legacy = at(undefined, 99_999);
    expect(pickSave(stamped, legacy)).toBe(stamped);
    expect(pickSave(legacy, stamped)).toBe(stamped);
  });

  it('missing sides resolve to whichever exists', () => {
    const only = at(1, 1);
    expect(pickSave(only, undefined)).toBe(only);
    expect(pickSave(undefined, only)).toBe(only);
    expect(pickSave(undefined, undefined)).toBeUndefined();
  });

  it('exact savedAt ties go to the cloud (cross-device source of truth)', () => {
    const local = at(7, 1);
    const cloud = at(7, 2);
    expect(pickSave(local, cloud)).toBe(cloud);
  });
});
