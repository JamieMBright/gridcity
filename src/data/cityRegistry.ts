// Scenario registry. Maps are pure data + a builder, so future cities
// (or a hyper-realistic import) are additions here, not engine changes.

import type { CityMap } from '../sim/map/types';
import { buildLondonMap } from './londonMap';

export interface CityScenario {
  id: string;
  name: string;
  tagline: string;
  build: () => CityMap;
}

export const CITY_SCENARIOS: CityScenario[] = [
  {
    id: 'london',
    name: 'London & the Essex Marches',
    tagline: 'The capital, the estuary, and everything that needs plugging in.',
    build: buildLondonMap,
  },
];

export function getScenario(id: string): CityScenario {
  const s = CITY_SCENARIOS.find((c) => c.id === id);
  if (!s) throw new Error(`unknown scenario: ${id}`);
  return s;
}
