// The tutorial gate (owner, 2026-06-26): free play stays LOCKED until the
// tutorial curriculum is finished; completion PERSISTS (a sticky flag) so a
// returning player is never re-gated; and a pre-existing player (one with a
// real save) is grandfathered so the gate never softlocks anyone.
//
// The node test env has no localStorage, so a tiny in-memory shim stands in —
// the same pattern rank.test.ts / cameraStore.test.ts use.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  allLessonsDone,
  autoUnlockForAutomation,
  isTutorialComplete,
  markTutorialComplete,
  tutorialProgress,
} from '../src/ui/tutorialGate';
import { MISSIONS } from '../src/sim/scenario/missions';

const CAMPAIGN_KEY = 'ec-campaign-v1';
const TUTORIAL_COMPLETE_KEY = 'ec-tutorial-complete-v1';
const AUTOSAVE_KEY = 'electricity.save.v1';
const SLOTS_KEY = 'electricity.slots.v1';

// the canonical curriculum ids, read off MISSIONS so the test never drifts
const IDS: string[] = MISSIONS.map((m) => m.id);

// --- in-memory localStorage shim (node test env) --------------------------
function installLocalStorage(): Map<string, string> {
  const store = new Map<string, string>();
  const shim = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  };
  vi.stubGlobal('localStorage', shim);
  return store;
}

/** A localStorage whose every method throws — the private-mode / blocked case
 *  the gate must fail OPEN on (never trap the player on the menu). */
function installThrowingLocalStorage(): void {
  const boom = (): never => {
    throw new Error('storage disabled');
  };
  vi.stubGlobal('localStorage', {
    getItem: boom,
    setItem: boom,
    removeItem: boom,
    clear: boom,
  });
}

/** Mark every lesson in the curriculum complete (writes the campaign key the
 *  same way workerBridge.recordMissionComplete does). */
function completeAllLessons(): void {
  localStorage.setItem(CAMPAIGN_KEY, JSON.stringify(IDS));
}

let store: Map<string, string>;
beforeEach(() => {
  store = installLocalStorage();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('tutorial gate — locked until complete', () => {
  it('a brand-new player (no progress, no save) is LOCKED', () => {
    expect(isTutorialComplete()).toBe(false);
    expect(allLessonsDone()).toBe(false);
  });

  it('partial campaign progress does NOT unlock (one finished lesson ≠ done)', () => {
    // a new post-gate player accrues mission ids one at a time — that must not
    // be mistaken for a grandfathered pre-gate player
    localStorage.setItem(CAMPAIGN_KEY, JSON.stringify([IDS[0]]));
    expect(isTutorialComplete()).toBe(false);
  });

  it('finishing the WHOLE curriculum unlocks free play', () => {
    completeAllLessons();
    expect(allLessonsDone()).toBe(true);
    expect(isTutorialComplete()).toBe(true);
  });
});

describe('tutorial gate — completion persists (sticky flag)', () => {
  it('latches the sticky flag the moment the curriculum is complete', () => {
    completeAllLessons();
    expect(store.get(TUTORIAL_COMPLETE_KEY)).toBeUndefined();
    expect(isTutorialComplete()).toBe(true);
    // the read latched the flag for cheap future checks
    expect(store.get(TUTORIAL_COMPLETE_KEY)).toBe('1');
  });

  it('stays unlocked even if campaign progress is later wiped', () => {
    markTutorialComplete();
    localStorage.removeItem(CAMPAIGN_KEY); // e.g. a future schema change
    expect(allLessonsDone()).toBe(false); // lessons no longer recorded…
    expect(isTutorialComplete()).toBe(true); // …but the sticky flag holds
  });

  it('an explicit mark unlocks immediately', () => {
    expect(isTutorialComplete()).toBe(false);
    markTutorialComplete();
    expect(isTutorialComplete()).toBe(true);
  });
});

describe('tutorial gate — pre-existing players are not softlocked', () => {
  it('a player with an autosave is grandfathered (unlocked)', () => {
    // a real-looking save payload (the gate only checks presence; the worker
    // validates the contents on load)
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ v: 16, scenarioId: 'london' }));
    expect(isTutorialComplete()).toBe(true);
    // and it latches so the check is cheap forever after
    expect(store.get(TUTORIAL_COMPLETE_KEY)).toBe('1');
  });

  it('an empty / trivial autosave string does NOT grandfather', () => {
    localStorage.setItem(AUTOSAVE_KEY, '');
    expect(isTutorialComplete()).toBe(false);
  });

  it('a player with a named save slot is grandfathered (unlocked)', () => {
    localStorage.setItem(
      SLOTS_KEY,
      JSON.stringify([{ id: 's1', name: 'coast', savedAt: 1, day: 1, bill: 1, scenarioId: 'london', data: {} }]),
    );
    expect(isTutorialComplete()).toBe(true);
  });

  it('an empty slot array does NOT grandfather', () => {
    localStorage.setItem(SLOTS_KEY, JSON.stringify([]));
    expect(isTutorialComplete()).toBe(false);
  });
});

describe('tutorial gate — automation auto-unlock (e2e harness)', () => {
  function installSessionStorage(): Map<string, string> {
    const ss = new Map<string, string>();
    vi.stubGlobal('sessionStorage', {
      getItem: (k: string) => (ss.has(k) ? ss.get(k)! : null),
      setItem: (k: string, v: string) => void ss.set(k, String(v)),
      removeItem: (k: string) => void ss.delete(k),
      clear: () => ss.clear(),
    });
    return ss;
  }
  function setWebdriver(on: boolean): void {
    vi.stubGlobal('navigator', { webdriver: on });
  }

  it('unlocks under DEV + webdriver (Playwright drives free play)', () => {
    installSessionStorage();
    setWebdriver(true);
    autoUnlockForAutomation(true);
    expect(isTutorialComplete()).toBe(true);
  });

  it('does NOT unlock in production (DEV false) even under webdriver', () => {
    installSessionStorage();
    setWebdriver(true);
    autoUnlockForAutomation(false);
    expect(store.get(TUTORIAL_COMPLETE_KEY)).toBeUndefined();
    expect(isTutorialComplete()).toBe(false);
  });

  it('does NOT unlock in a normal dev session (no webdriver)', () => {
    installSessionStorage();
    setWebdriver(false);
    autoUnlockForAutomation(true);
    expect(store.get(TUTORIAL_COMPLETE_KEY)).toBeUndefined();
    expect(isTutorialComplete()).toBe(false);
  });

  it('respects the force-locked marker so a spec can screenshot the gate', () => {
    const ss = installSessionStorage();
    setWebdriver(true);
    ss.set('ec-force-gate-locked', '1');
    autoUnlockForAutomation(true);
    expect(store.get(TUTORIAL_COMPLETE_KEY)).toBeUndefined();
    expect(isTutorialComplete()).toBe(false);
  });
});

describe('tutorial gate — degrades safely', () => {
  it('fails OPEN when localStorage is entirely unavailable (never traps the player)', () => {
    installThrowingLocalStorage();
    expect(isTutorialComplete()).toBe(true);
  });

  it('reports curriculum progress for the gate caption', () => {
    expect(tutorialProgress()).toEqual({ done: 0, total: MISSIONS.length });
    localStorage.setItem(CAMPAIGN_KEY, JSON.stringify([IDS[0], IDS[1]]));
    expect(tutorialProgress()).toEqual({ done: 2, total: MISSIONS.length });
  });
});
