// Progressive-disclosure selector shared by the build palette, mobile
// chrome and HUD: in a campaign mission the UI shows ONLY the tools and
// HUD surfaces the mission has unlocked up to the current step; in the
// sandbox (london) everything is available. Data lives on the mission
// (missions.ts); this is pure UI-side filtering — the sim never sees it.

import { useAppStore } from '../app/store';
import { missionOf, missionUnlocks } from '../sim/scenario/missions';
import type { Tool } from '../app/store';

export interface UnlockGate {
  /** True when progressive disclosure is in force (an active mission). */
  active: boolean;
  /** Is this unlock key currently available? Always true in the sandbox. */
  has: (key: string) => boolean;
  /** Is this build tool currently available? Always true in the sandbox. */
  tool: (t: Tool) => boolean;
}

/** Map a build Tool to its unlock key (matches the strings missions
 *  declare in MissionStep.unlocks). */
export function toolUnlockKey(t: Tool): string {
  switch (t.t) {
    case 'gen':
      return `gen:${t.gen}`;
    case 'sub':
      return `sub:${t.sub}`;
    case 'line':
      return `line:${t.level}`;
    case 'depot':
      return 'depot';
    case 'inspect':
      return 'inspect';
    case 'demolish':
      return 'demolish';
  }
}

export function useUnlockGate(): UnlockGate {
  const scenarioId = useAppStore((s) => s.scenarioId);
  const step = useAppStore((s) => s.tutorialStep);
  const mission = missionOf(scenarioId);
  if (!mission) {
    return { active: false, has: () => true, tool: () => true };
  }
  const set = missionUnlocks(mission, step);
  return {
    active: true,
    has: (key) => set.has(key),
    tool: (t) => set.has(toolUnlockKey(t)),
  };
}
