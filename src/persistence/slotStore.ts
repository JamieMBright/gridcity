// Named save slots (ROADMAP #34): a few manual saves the player can name,
// beside the single autosave the worker already writes. Additive — the
// autosave (localStorageStore, key electricity.save.v1) and continue flow
// are untouched; slots live under their own key so old saves keep working.
//
// A slot holds the SaveData payload plus a player-given name and the
// wall-clock time it was written, so the menu can list "Coast experiment ·
// day 412 · £2,940 · 3 days ago". The store is a thin localStorage wrapper
// behind a small pure API so the slot logic (add/name/delete, capacity)
// can be unit-tested without a DOM.

const SLOTS_KEY = 'electricity.slots.v1';

/** Maximum named manual slots (the autosave is separate and uncounted). */
export const MAX_SLOTS = 5;

export interface SlotMeta {
  /** Player-given name (trimmed; falls back to a default on save). */
  name: string;
  /** Wall-clock ms the slot was written. */
  savedAt: number;
  /** Game-day the save sits at, for the menu list. */
  day: number;
  /** Average household bill £/yr at save time, for the menu list. */
  bill: number;
  /** Scenario the save belongs to ('london' or a mission id). */
  scenarioId: string;
}

export interface NamedSlot extends SlotMeta {
  /** Stable id (timestamp-derived) so React keys and deletes are stable. */
  id: string;
  /** The serialized SaveData payload (opaque here — the worker validates). */
  data: unknown;
}

/** What a caller knows at save time to summarise a slot (read off the
 *  latest snapshot). */
export interface SlotSummary {
  day: number;
  bill: number;
  scenarioId: string;
}

function read(): NamedSlot[] {
  try {
    const raw = localStorage.getItem(SLOTS_KEY);
    const arr: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    return arr.filter((s): s is NamedSlot => typeof s === 'object' && s !== null && 'id' in s);
  } catch {
    return [];
  }
}

function write(slots: NamedSlot[]): void {
  try {
    localStorage.setItem(SLOTS_KEY, JSON.stringify(slots));
  } catch {
    // quota / private mode: slots just won't persist
  }
}

/** Slots, newest first (the menu order). */
export function listSlots(): NamedSlot[] {
  return read().sort((a, b) => b.savedAt - a.savedAt);
}

/** Pure slot-list update: insert/replace a slot, capping the list at
 *  MAX_SLOTS by dropping the OLDEST when a brand-new name overflows.
 *  Reusing an existing id (re-saving over a slot) never overflows. Exposed
 *  for unit tests; the DOM wrappers below call it. */
export function upsertSlot(
  slots: NamedSlot[],
  slot: NamedSlot,
): { slots: NamedSlot[]; dropped?: NamedSlot | undefined } {
  const existing = slots.findIndex((s) => s.id === slot.id);
  let next: NamedSlot[];
  if (existing >= 0) {
    next = slots.slice();
    next[existing] = slot;
    return { slots: next };
  }
  next = [slot, ...slots];
  let dropped: NamedSlot | undefined;
  if (next.length > MAX_SLOTS) {
    // drop the oldest by savedAt
    const oldest = next.reduce((a, b) => (a.savedAt <= b.savedAt ? a : b));
    dropped = oldest;
    next = next.filter((s) => s.id !== oldest.id);
  }
  return { slots: next, dropped };
}

let idCounter = 0;
function freshId(): string {
  // monotonic even within the same ms (rapid test saves)
  return `slot-${Date.now()}-${idCounter++}`;
}

/** Save `data` into a new named slot (or overwrite `id` when given). */
export function saveSlot(
  name: string,
  data: unknown,
  summary: SlotSummary,
  id?: string,
): NamedSlot {
  const slot: NamedSlot = {
    id: id ?? freshId(),
    name: name.trim() || defaultSlotName(summary),
    savedAt: Date.now(),
    day: summary.day,
    bill: summary.bill,
    scenarioId: summary.scenarioId,
    data,
  };
  const { slots } = upsertSlot(read(), slot);
  write(slots);
  return slot;
}

/** Rename a slot in place (keeps its data + timestamp). */
export function renameSlot(id: string, name: string): void {
  const slots = read();
  const s = slots.find((x) => x.id === id);
  if (!s) return;
  s.name = name.trim() || s.name;
  write(slots);
}

export function deleteSlot(id: string): void {
  write(read().filter((s) => s.id !== id));
}

export function loadSlot(id: string): NamedSlot | undefined {
  return read().find((s) => s.id === id);
}

/** A sensible auto-name when the player leaves the field blank. */
export function defaultSlotName(summary: SlotSummary): string {
  const place = summary.scenarioId === 'london' ? 'London' : summary.scenarioId;
  return `${place} · day ${summary.day}`;
}
