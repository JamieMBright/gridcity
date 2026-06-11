// Save persistence behind an interface so cloud saves (Supabase) can slot
// in beside localStorage later without touching game code.

export interface SaveStore {
  load(): unknown | undefined;
  store(data: unknown): void;
  clear(): void;
}
