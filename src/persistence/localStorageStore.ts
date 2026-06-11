import type { SaveStore } from './saveStore';

const KEY = 'electricity.save.v1';

export const localStorageStore: SaveStore = {
  load(): unknown | undefined {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as unknown) : undefined;
    } catch {
      return undefined; // private mode / corrupt JSON: start fresh
    }
  },
  store(data: unknown): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      // quota/private mode: play on without persistence
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // ignore
    }
  },
};
