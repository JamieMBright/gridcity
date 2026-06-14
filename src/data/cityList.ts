// Lightweight sandbox-city metadata for the start-menu picker and the
// "is this a tutorial mission?" check. Deliberately dependency-free: the
// full CityScenario (map builder + operating-model profiles) lives in
// cityRegistry, which sits in a circular-import web with the sim/map
// modules — importing THAT into UI components changes module load order and
// can leave the mission table momentarily empty. This module imports
// nothing, so the menu can list the cities safely.

export interface CityChoice {
  id: string;
  name: string;
  tagline: string;
}

/** The selectable full sandbox cities (not the tutorial-campaign missions),
 *  in menu order. Kept in sync with cityRegistry's scenario entries. */
export const SANDBOX_CITIES: CityChoice[] = [
  {
    id: 'london',
    name: 'London & the Essex Marches',
    tagline: 'The capital, the estuary, and everything that needs plugging in.',
  },
  {
    id: 'paris',
    name: 'Paris & the Île-de-France',
    tagline: 'The Seine, the Périphérique, and a grid that runs on nuclear.',
  },
];

/** True if the scenario is a full sandbox city (London/Paris/…) rather than
 *  a tutorial-campaign mission. */
export function isSandboxCity(scenarioId: string): boolean {
  return SANDBOX_CITIES.some((c) => c.id === scenarioId);
}
