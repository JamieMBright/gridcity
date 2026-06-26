import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the supabase client module so signOut() runs against a controllable
// fake auth client. Each test sets sbAuthSignOut's behaviour.
const sbAuthSignOut = vi.fn();
vi.mock('../src/online/supabase', () => ({
  supabase: () => ({ auth: { signOut: sbAuthSignOut } }),
}));

import { onAuthChange, signOut } from '../src/online/auth';

// The vitest env is `node` (no DOM), so install a minimal Map-backed
// localStorage so clearPersistedSession() has something real to clear. This is
// the SAME storage shape supabase-js persists to (`sb-<ref>-auth-token`).
function installLocalStorage(): void {
  const store = new Map<string, string>();
  const ls = {
    get length() {
      return store.size;
    },
    key: (i: number) => [...store.keys()][i] ?? null,
    getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  };
  (globalThis as { localStorage?: unknown }).localStorage = ls;
}

describe('signOut', () => {
  beforeEach(() => {
    sbAuthSignOut.mockReset();
    installLocalStorage();
    // a persisted supabase session present, so we can assert the belt-and-
    // braces clear removes it on the error paths.
    localStorage.setItem('sb-testref-auth-token', '{"access_token":"x"}');
    localStorage.setItem('unrelated', 'keep-me');
  });
  afterEach(() => {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it('signs out with LOCAL scope (no server round-trip dependency) and returns no error', async () => {
    sbAuthSignOut.mockResolvedValue({ error: null });
    const err = await signOut();
    expect(err).toBeUndefined();
    // the scope matters: a global scope can leave the local session if the
    // server revoke fails — the exact "kept me signed in" bug.
    expect(sbAuthSignOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('surfaces the error message AND force-clears the persisted session when the SDK reports an error', async () => {
    sbAuthSignOut.mockResolvedValue({ error: { message: 'network unreachable' } });
    const err = await signOut();
    expect(err).toBe('network unreachable');
    // the device session must be gone regardless, so a reload stays signed out
    expect(localStorage.getItem('sb-testref-auth-token')).toBeNull();
    // unrelated keys are untouched
    expect(localStorage.getItem('unrelated')).toBe('keep-me');
  });

  it('catches a thrown rejection into a friendly string (never a rejected promise) and clears the session', async () => {
    sbAuthSignOut.mockRejectedValue(new Error('boom'));
    const err = await signOut();
    expect(err).toBe('boom');
    expect(localStorage.getItem('sb-testref-auth-token')).toBeNull();
  });

  it('notifies onAuthChange subscribers on success, error, AND throw', async () => {
    const seen: string[] = [];
    const off = onAuthChange(() => seen.push('hit'));

    sbAuthSignOut.mockResolvedValue({ error: null });
    await signOut();
    sbAuthSignOut.mockResolvedValue({ error: { message: 'x' } });
    await signOut();
    sbAuthSignOut.mockRejectedValue(new Error('y'));
    await signOut();

    expect(seen).toEqual(['hit', 'hit', 'hit']);
    off();
    // after unsubscribe, no further notifications
    sbAuthSignOut.mockResolvedValue({ error: null });
    await signOut();
    expect(seen).toEqual(['hit', 'hit', 'hit']);
  });

  it('a throwing listener does not stop the others from being notified', async () => {
    const seen: string[] = [];
    const offA = onAuthChange(() => {
      throw new Error('bad listener');
    });
    const offB = onAuthChange(() => seen.push('B'));
    sbAuthSignOut.mockResolvedValue({ error: null });
    await signOut();
    expect(seen).toEqual(['B']);
    offA();
    offB();
  });
});
