// Scenario registry. Maps are pure data + a builder, so future cities
// (or a hyper-realistic import) are additions here, not engine changes.
// The tutorial-campaign missions register alongside London; 'london'
// stays the default everywhere a scenario id is optional.

import type { CityMap } from '../sim/map/types';
import { buildLondonMap, setClientMap } from './londonMap';
import {
  buildBillMap,
  buildFirstLightMap,
  buildInboxMap,
  buildStepUpMap,
  buildStormMap,
} from './missions';

export interface CityScenario {
  id: string;
  name: string;
  tagline: string;
  build: () => CityMap;
  /** Tutorial-campaign mission (tiny map, scripted steps, win check). */
  mission?: boolean;
}

export const CITY_SCENARIOS: CityScenario[] = [
  {
    id: 'london',
    name: 'London & the Essex Marches',
    tagline: 'The capital, the estuary, and everything that needs plugging in.',
    build: buildLondonMap,
  },
  {
    id: 'm1-first-light',
    name: 'First Light',
    tagline: 'One village, one wind tender, one wire.',
    build: buildFirstLightMap,
    mission: true,
  },
  {
    id: 'm2-step-up',
    name: 'Step Up',
    tagline: 'The plant is far away — voltage is how you travel.',
    build: buildStepUpMap,
    mission: true,
  },
  {
    id: 'm3-storm',
    name: 'Keeping the Lights On',
    tagline: 'A woodland crossing, a named storm, and the orange vans.',
    build: buildStormMap,
    mission: true,
  },
  {
    id: 'm4-inbox',
    name: 'The Inbox',
    tagline: 'Someone wants connecting. Study first, promise second.',
    build: buildInboxMap,
    mission: true,
  },
  {
    id: 'm5-bill',
    name: 'Every Pound on the Bill',
    tagline: 'Serve the town — and mind what lands on the bill.',
    build: buildBillMap,
    mission: true,
  },
];

export function getScenario(id: string): CityScenario {
  const s = CITY_SCENARIOS.find((c) => c.id === id);
  if (!s) throw new Error(`unknown scenario: ${id}`);
  return s;
}

// --- the client's active map -------------------------------------------------
// The MAIN THREAD shares one map copy between the renderer, ghost
// previews, hover info and the test hook (all via getLondonMap, whose
// name is historical — see data/londonMap.ts). Switching scenario swaps
// that shared copy; a fresh build each time so a replayed mission never
// inherits a previous run's growth mutations.

let activeScenarioId = 'london';

export function getActiveScenarioId(): string {
  return activeScenarioId;
}

/** Point every client-side map consumer at this scenario's map (fresh
 *  build). Called by MapView whenever the active scenario changes. */
export function setActiveScenario(id: string): void {
  activeScenarioId = id;
  setClientMap(getScenario(id).build());
}
