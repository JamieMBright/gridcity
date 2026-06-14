// Scenario registry. Maps are pure data + a builder, so future cities
// (or a hyper-realistic import) are additions here, not engine changes.
// The tutorial-campaign missions register alongside London; 'london'
// stays the default everywhere a scenario id is optional.

import type { CityMap } from '../sim/map/types';
import {
  FRANCE_ECONOMY,
  FRANCE_MARKET,
  FRANCE_REGULATOR,
  LONDON_PROFILE,
  type EconomyProfile,
  type GenerationModel,
  type MarketProfile,
  type PowerSystemProfile,
  type RegulatorProfile,
  type ResolvedProfile,
  type WeatherProfile,
} from '../sim/powerProfile';
import { buildLondonMap, setClientMap } from './londonMap';
import { buildParisMap } from './parisMap';
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

  // --- CityScenario v2: additive, optional per-city config blocks. ------
  // Every block is OPTIONAL and defaults to London's GB behaviour (see
  // resolveProfile), so omitting them all — as London and every mission
  // do — is bit-identical to the pre-v2 engine. No new city ships this
  // wave; these seams just make cities DATA for the next one.

  /** System frequency, voltages, droop (50 Hz GB default). */
  power?: PowerSystemProfile;
  /** Season phase, sun arc, weather regimes (GB winter-peak default). */
  weatherProfile?: WeatherProfile;
  /** Currency + bill shares (GB £/DUoS default). */
  economy?: EconomyProfile;
  /** Generation ownership: liberalised tender (GB default) vs owned. */
  generation?: GenerationModel;
  /** Regulator framing (Ofgem/RIIO default). */
  regulator?: RegulatorProfile;
  /** National wholesale market shape (GB evening-peak default). */
  market?: MarketProfile;

  /** Difficulty 1–10 and the rank a city's offer arrives at (rank wave). */
  difficulty?: number;
  unlockAtRank?: number;
}

/** Resolve a scenario's optional config blocks into the fully-defaulted
 *  ResolvedProfile the sim threads through. Omitted blocks fall back to
 *  London/GB, so the london scenario (which declares none) yields exactly
 *  LONDON_PROFILE — the determinism anchor. */
export function resolveProfile(s: CityScenario): ResolvedProfile {
  return {
    power: s.power ?? LONDON_PROFILE.power,
    weather: s.weatherProfile ?? LONDON_PROFILE.weather,
    economy: s.economy ?? LONDON_PROFILE.economy,
    generation: s.generation ?? LONDON_PROFILE.generation,
    regulator: s.regulator ?? LONDON_PROFILE.regulator,
    market: s.market ?? LONDON_PROFILE.market,
  };
}

/** The active profile for a scenario id (defaults to London). */
export function profileOf(scenarioId: string): ResolvedProfile {
  return resolveProfile(getScenario(scenarioId));
}

export const CITY_SCENARIOS: CityScenario[] = [
  {
    id: 'london',
    name: 'London & the Essex Marches',
    tagline: 'The capital, the estuary, and everything that needs plugging in.',
    build: buildLondonMap,
  },
  {
    id: 'paris',
    name: 'Paris & the Île-de-France',
    tagline: 'The Seine, the Périphérique, and a grid that runs on nuclear.',
    build: buildParisMap,
    // France's operating model: Enedis-style network, a deep nuclear floor
    // (cheap, clean, inflexible imports), and the CRE cost-of-service
    // regulator rather than RIIO incentives.
    market: FRANCE_MARKET,
    regulator: FRANCE_REGULATOR,
    economy: FRANCE_ECONOMY,
    difficulty: 4,
    unlockAtRank: 1,
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
