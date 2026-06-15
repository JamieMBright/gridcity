// Scenario registry. Maps are pure data + a builder, so future cities
// (or a hyper-realistic import) are additions here, not engine changes.
// The tutorial-campaign missions register alongside London; 'london'
// stays the default everywhere a scenario id is optional.

import type { CityMap } from '../sim/map/types';
import {
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
import { buildCityFromData } from './cityData';
import { cityDataFor } from './scenarioData';
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
    // Paris — the first DATA-backed playable city. Its map is a committed
    // OSM artifact (src/data/cities/paris.ts), lazily imported: build() reads
    // the preloaded CityData (every entry point awaits loadScenarioData first)
    // and reconstructs the CityMap. The power/economy/regulator profile blocks
    // are omitted, so Paris resolves to LONDON_PROFILE for now — fully
    // PLAYABLE; the FR-specific seams (nuclear baseload, CRE/TURPE) land later
    // per docs/multi-city-and-rank.md. (owner: "open to all for now so I can
    // test".)
    id: 'paris',
    name: 'Paris & the Seine',
    tagline: 'Haussmann limestone, a calm grey river, and a grid to electrify.',
    build: () => buildCityFromData(cityDataFor('paris')),
    difficulty: 4,
    unlockAtRank: 4,
  },
  {
    // New York — second DATA-backed playable city (OSM artifact
    // src/data/cities/newyork.ts): Manhattan between the Hudson and East River,
    // Central Park, the boroughs across the water. Like Paris it resolves to
    // LONDON_PROFILE for now (the US 60 Hz / NEM-style seams land later);
    // fully PLAYABLE — open to all for testing.
    id: 'newyork',
    name: 'New York & the Harbor',
    tagline: 'The grid, the boroughs, two rivers, and a skyline to power.',
    build: () => buildCityFromData(cityDataFor('newyork')),
    difficulty: 6,
    unlockAtRank: 6,
  },
  {
    // Sydney — OSM artifact (src/data/cities/sydney.ts): the harbour and its
    // inlets, the Opera House, the eastern-suburbs peninsula, the open Tasman
    // to the south-east. Resolves to LONDON_PROFILE for now (the AU 50 Hz /
    // NEM seams land later); fully PLAYABLE — open to all for testing.
    id: 'sydney',
    name: 'Sydney & the Harbour',
    tagline: 'The harbour, the bridge, the Opera House, and a coast to power.',
    build: () => buildCityFromData(cityDataFor('sydney')),
    difficulty: 5,
    unlockAtRank: 7,
  },
  {
    // Hong Kong — OSM artifact (src/data/cities/hongkong.ts): Victoria Harbour
    // dividing Kowloon from the Island, the green Peak, the outlying islands.
    // Resolves to LONDON_PROFILE for now; fully PLAYABLE — open to all.
    id: 'hongkong',
    name: 'Hong Kong & Victoria Harbour',
    tagline: 'A harbour city of peaks and towers, packed against the sea.',
    build: () => buildCityFromData(cityDataFor('hongkong')),
    difficulty: 7,
    unlockAtRank: 8,
  },
  {
    // Berlin — OSM artifact (src/data/cities/berlin.ts): the Spree threading a
    // landlocked metropolis, Mitte's core, lakes and forests at the edge.
    // Resolves to LONDON_PROFILE for now (the DE 50 Hz seams land later);
    // fully PLAYABLE — open to all for testing.
    id: 'berlin',
    name: 'Berlin & the Spree',
    tagline: 'A flat city on a slow river, ringed by lakes and woods.',
    build: () => buildCityFromData(cityDataFor('berlin')),
    difficulty: 4,
    unlockAtRank: 8,
  },
  {
    // Shanghai — OSM artifact (src/data/cities/shanghai.ts): the Huangpu
    // winding past Pudong's towers, a dense megacity grid. Resolves to
    // LONDON_PROFILE for now; fully PLAYABLE — open to all for testing.
    id: 'shanghai',
    name: 'Shanghai & the Huangpu',
    tagline: 'A megacity on a winding river, towers crowding the Bund.',
    build: () => buildCityFromData(cityDataFor('shanghai')),
    difficulty: 8,
    unlockAtRank: 9,
  },
  {
    // Cape Town — OSM artifact (src/data/cities/capetown.ts): Table Bay and the
    // Atlantic, the City Bowl below the mountain, the Cape Flats sprawl.
    // Resolves to LONDON_PROFILE for now; fully PLAYABLE — open to all.
    id: 'capetown',
    name: 'Cape Town & Table Bay',
    tagline: 'A city bowl under the mountain, between two oceans.',
    build: () => buildCityFromData(cityDataFor('capetown')),
    difficulty: 6,
    unlockAtRank: 9,
  },
  {
    // Cairo — OSM artifact (src/data/cities/cairo.ts): the Nile threading a vast
    // dense city, the Pyramids on the desert edge. Resolves to LONDON_PROFILE
    // for now; fully PLAYABLE — open to all for testing.
    id: 'cairo',
    name: 'Cairo & the Nile',
    tagline: 'A vast dense city on the great river, desert at its back.',
    build: () => buildCityFromData(cityDataFor('cairo')),
    difficulty: 8,
    unlockAtRank: 10,
  },
  {
    // Athens — OSM artifact (src/data/cities/athens.ts): the Attic basin, the
    // Saronic coast at Piraeus, the Acropolis, mountains framing the sprawl.
    // Resolves to LONDON_PROFILE for now; fully PLAYABLE — open to all.
    id: 'athens',
    name: 'Athens & the Saronic Gulf',
    tagline: 'An ancient basin between the mountains and the sea.',
    build: () => buildCityFromData(cityDataFor('athens')),
    difficulty: 5,
    unlockAtRank: 10,
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

// Re-export the lazy-loader so callers go through the registry (which knows
// which scenarios need a preload). A no-op for code-drawn ids (London/missions).
export { loadScenarioData } from './scenarioData';

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
