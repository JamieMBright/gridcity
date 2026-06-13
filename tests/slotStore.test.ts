// ROADMAP #34: named save slots — the slot-list logic (capacity, oldest
// eviction, overwrite) is pure and unit-tested; the localStorage wrappers
// get a tiny in-memory shim so save/load/rename/delete round-trip.

import { beforeEach, describe, expect, it } from 'vitest';
import {
  defaultSlotName,
  MAX_SLOTS,
  upsertSlot,
  type NamedSlot,
} from '../src/persistence/slotStore';

function slot(id: string, savedAt: number): NamedSlot {
  return { id, name: id, savedAt, day: 1, bill: 3000, scenarioId: 'london', data: { v: 11 } };
}

describe('upsertSlot (pure list logic)', () => {
  it('inserts newest-first and overwrites by id without growing', () => {
    let slots: NamedSlot[] = [];
    ({ slots } = upsertSlot(slots, slot('a', 1)));
    ({ slots } = upsertSlot(slots, slot('b', 2)));
    expect(slots.map((s) => s.id)).toEqual(['b', 'a']);
    // re-saving over 'a' keeps the count and replaces in place
    const res = upsertSlot(slots, { ...slot('a', 9), name: 'renamed' });
    expect(res.slots).toHaveLength(2);
    expect(res.slots.find((s) => s.id === 'a')!.name).toBe('renamed');
    expect(res.dropped).toBeUndefined();
  });

  it('evicts the OLDEST when a new slot overflows the cap', () => {
    let slots: NamedSlot[] = [];
    for (let i = 0; i < MAX_SLOTS; i++) {
      ({ slots } = upsertSlot(slots, slot(`s${i}`, i + 1))); // s0 is oldest
    }
    expect(slots).toHaveLength(MAX_SLOTS);
    const res = upsertSlot(slots, slot('new', 999));
    expect(res.slots).toHaveLength(MAX_SLOTS);
    expect(res.dropped?.id).toBe('s0'); // the oldest went
    expect(res.slots.some((s) => s.id === 'new')).toBe(true);
    expect(res.slots.some((s) => s.id === 's0')).toBe(false);
  });
});

describe('defaultSlotName', () => {
  it('reads the scenario + day', () => {
    expect(defaultSlotName({ day: 42, bill: 3000, scenarioId: 'london' })).toBe('London · day 42');
    expect(defaultSlotName({ day: 7, bill: 3000, scenarioId: 'm1-first-light' })).toBe(
      'm1-first-light · day 7',
    );
  });
});

describe('localStorage round-trip', () => {
  beforeEach(() => {
    const mem = new Map<string, string>();
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
      clear: () => mem.clear(),
    };
  });

  it('saves, lists, renames and deletes', async () => {
    const m = await import('../src/persistence/slotStore');
    const saved = m.saveSlot('Coast plan', { v: 11, tick: 5 }, { day: 12, bill: 2900, scenarioId: 'london' });
    expect(m.listSlots()).toHaveLength(1);
    expect(m.loadSlot(saved.id)?.name).toBe('Coast plan');

    m.renameSlot(saved.id, 'Coast plan v2');
    expect(m.loadSlot(saved.id)?.name).toBe('Coast plan v2');

    m.deleteSlot(saved.id);
    expect(m.listSlots()).toHaveLength(0);
  });

  it('falls back to a default name when blank', async () => {
    const m = await import('../src/persistence/slotStore');
    const s = m.saveSlot('   ', { v: 11 }, { day: 3, bill: 3000, scenarioId: 'london' });
    expect(s.name).toBe('London · day 3');
  });
});
