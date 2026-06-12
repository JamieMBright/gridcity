// Save persistence behind an interface so cloud saves (Supabase) can slot
// in beside localStorage later without touching game code.

export interface SaveStore {
  load(): unknown | undefined;
  store(data: unknown): void;
  clear(): void;
}

/** The slice boot arbitration reads. */
export interface StampedSave {
  tick: number;
  savedAt?: number | undefined;
}

/** Pick between the local and cloud copy of slot 0: the most recently
 *  SAVED wins — a fresh new game (tick ~0, stamped seconds ago) must
 *  beat an old long-played cloud copy, or "new game" resurrects the old
 *  network on every reload. A stamped save always beats an unstamped
 *  (pre-savedAt) one; play-time (tick) only breaks ties between two
 *  legacy saves. Cloud wins exact ties (cross-device source of truth). */
export function pickSave<L extends StampedSave, C extends StampedSave>(
  local: L | undefined,
  cloud: C | undefined,
): L | C | undefined {
  if (!cloud) return local;
  if (!local) return cloud;
  if (local.savedAt !== undefined || cloud.savedAt !== undefined) {
    return (cloud.savedAt ?? 0) >= (local.savedAt ?? 0) ? cloud : local;
  }
  return cloud.tick >= local.tick ? cloud : local;
}
