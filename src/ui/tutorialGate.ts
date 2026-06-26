// The tutorial gate: free play (a "new game" on any city) is LOCKED until the
// player has completed the tutorial sequence (owner, 2026-06-26 — "prevent
// players launching the main game until they have completed the tutorials").
//
// The campaign IS the tutorial: completing every lesson in MISSIONS is the
// tutorial sequence. Once complete we latch a sticky `ec-tutorial-complete-v1`
// flag so a returning player is never re-gated (even if they later clear a
// campaign entry). It mirrors the lessonProgress / completedMissions pattern:
// a single localStorage key, every access wrapped in try/catch so private-mode
// browsers degrade gracefully (there, we fail OPEN — see below).
//
// Existing players are never softlocked: anyone who already has a save (the
// autosave or a named slot) or any prior campaign progress predates the gate,
// so on first read we grandfather them straight to "complete".

import { MISSIONS } from '../sim/scenario/missions';

const TUTORIAL_COMPLETE_KEY = 'ec-tutorial-complete-v1';
const CAMPAIGN_KEY = 'ec-campaign-v1';
const AUTOSAVE_KEY = 'electricity.save.v1';
const SLOTS_KEY = 'electricity.slots.v1';

/** Read the completed-mission id set (mirrors workerBridge.completedMissions,
 *  duplicated here so the gate has no import cycle through the worker bridge). */
function completedMissionIds(): Set<string> {
  try {
    const raw = localStorage.getItem(CAMPAIGN_KEY);
    const arr: unknown = raw ? JSON.parse(raw) : [];
    return new Set(
      Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [],
    );
  } catch {
    return new Set();
  }
}

/** How many of the tutorial lessons are done, for the gate's progress line. */
export function tutorialProgress(): { done: number; total: number } {
  const done = completedMissionIds();
  return { done: MISSIONS.filter((m) => done.has(m.id)).length, total: MISSIONS.length };
}

/** True when EVERY lesson in the curriculum has been completed. */
export function allLessonsDone(): boolean {
  const done = completedMissionIds();
  return MISSIONS.every((m) => done.has(m.id));
}

/** Latch the sticky "tutorial complete" flag (idempotent). Called when the
 *  final lesson finishes, and by the grandfather migration. */
export function markTutorialComplete(): void {
  try {
    localStorage.setItem(TUTORIAL_COMPLETE_KEY, '1');
  } catch {
    // private mode: nothing to persist; isTutorialComplete fails open anyway
  }
}

/** Test-harness escape hatch: the e2e suite drives sandbox gameplay through the
 *  "new game" path, which the gate would otherwise lock on a fresh context.
 *  When the app boots under automation (Playwright sets navigator.webdriver)
 *  in a DEV build, pre-unlock free play UNLESS a spec deliberately cleared the
 *  flag to inspect the locked state. Never runs in production (no DEV, no
 *  webdriver), so real players are still gated. */
export function autoUnlockForAutomation(isDev: boolean): void {
  try {
    const automated =
      typeof navigator !== 'undefined' && (navigator as Navigator).webdriver === true;
    // a spec that wants the LOCKED view sets this marker before navigating
    const forceLocked = sessionStorage.getItem('ec-force-gate-locked') === '1';
    if (isDev && automated && !forceLocked) markTutorialComplete();
  } catch {
    // storage/navigator unavailable — nothing to do
  }
}

/** Does the player have a real, pre-gate save (the autosave or a named slot)?
 *  Such a player started before the gate existed — never softlock them. We
 *  only check that the keys hold non-empty content; the worker validates the
 *  payload on load, so a cheap presence check is enough here. */
function hasExistingSave(): boolean {
  try {
    const auto = localStorage.getItem(AUTOSAVE_KEY);
    if (auto && auto.length > 2) return true;
    const slots = localStorage.getItem(SLOTS_KEY);
    if (slots) {
      const arr: unknown = JSON.parse(slots);
      if (Array.isArray(arr) && arr.length > 0) return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Is free play unlocked? True when ANY of:
 *  - the sticky completion flag is set (the player finished the tutorial), OR
 *  - every lesson is now complete (latches the flag on the way past), OR
 *  - the player predates the gate — they hold a real save (autosave or named
 *    slot), so they were playing the actual game before the gate shipped and
 *    must never be softlocked. We latch the flag so the check is cheap forever
 *    after.
 *
 * NB: partial campaign progress is NOT a grandfather signal — a brand-new
 * player accrues completed-mission ids one lesson at a time, so unlocking on
 * "any mission done" would defeat the gate. Only a finished curriculum (or a
 * pre-existing save) opens it.
 *
 * Fails OPEN if localStorage is entirely unavailable (private mode / blocked):
 * we never want a storage error to trap a player on the menu with no way in.
 */
export function isTutorialComplete(): boolean {
  let storageOk = false;
  try {
    // a single probe that also tells us storage works at all
    if (localStorage.getItem(TUTORIAL_COMPLETE_KEY) === '1') return true;
    storageOk = true;
  } catch {
    storageOk = false;
  }
  // storage is dead → fail open (don't trap the player)
  if (!storageOk) return true;

  // grandfather a pre-gate player (one with a real save), or latch + unlock
  // the moment the whole curriculum is done.
  if (hasExistingSave() || allLessonsDone()) {
    markTutorialComplete();
    return true;
  }
  return false;
}
