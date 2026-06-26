// Scenario registry. Maps are pure data + a builder, so future cities
// (or a hyper-realistic import) are additions here, not engine changes.
// The tutorial-campaign missions register alongside London; 'london'
// stays the default everywhere a scenario id is optional.

import type { CityMap } from '../sim/map/types';
import {
  countryProfile,
  type CountryId,
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
  buildSunStoreMap,
} from './missions';

export interface CityScenario {
  id: string;
  name: string;
  tagline: string;
  build: () => CityMap;
  /** Tutorial-campaign mission (tiny map, scripted steps, win check). */
  mission?: boolean;

  // --- CityScenario v2/WP2: additive, optional per-city operating model. -
  // A scenario picks its country's operating model with `country` (the
  // recommended path — many cities share a country, so the six profile
  // blocks are factored once in powerProfile.ts COUNTRY_PROFILES). The
  // individual blocks below remain available to OVERRIDE a single dimension
  // on top of the country base (e.g. a city localising its peakDoy). Omitting
  // `country` AND every block — as London and every mission do — yields
  // exactly LONDON_PROFILE (GB), bit-identical to the pre-WP2 engine.

  /** Operating-model country (powerProfile.ts COUNTRY_PROFILES). Absent ⇒ GB.
   *  This is the primary per-city lever; the blocks below override single
   *  dimensions on top of it. */
  country?: CountryId;

  /** System frequency, voltages, droop (overrides the country's; GB default). */
  power?: PowerSystemProfile;
  /** Season phase, sun arc, weather regimes (overrides the country's). */
  weatherProfile?: WeatherProfile;
  /** Currency + bill shares (overrides the country's). */
  economy?: EconomyProfile;
  /** Generation ownership: liberalised tender vs owned (overrides the country's). */
  generation?: GenerationModel;
  /** Regulator framing (overrides the country's; Ofgem/RIIO default). */
  regulator?: RegulatorProfile;
  /** National wholesale market shape (overrides the country's). */
  market?: MarketProfile;

  /** Difficulty 1–10 and the rank a city's offer arrives at (rank wave). */
  difficulty?: number;
  unlockAtRank?: number;
}

/** Resolve a scenario into the fully-defaulted ResolvedProfile the sim threads
 *  through. The base is the scenario's `country` operating model (GB when
 *  absent), and any explicit per-block field overrides that single dimension.
 *  So the london scenario (no country, no blocks) yields exactly LONDON_PROFILE
 *  — the determinism anchor — and a GB-country city resolves identically too. */
export function resolveProfile(s: CityScenario): ResolvedProfile {
  const base = countryProfile(s.country);
  return {
    power: s.power ?? base.power,
    weather: s.weatherProfile ?? base.weather,
    economy: s.economy ?? base.economy,
    generation: s.generation ?? base.generation,
    regulator: s.regulator ?? base.regulator,
    market: s.market ?? base.market,
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
    // and reconstructs the CityMap. WP2: now wired to the FRANCE operating
    // model (country 'FR') — a flat/low near-zero-carbon nuclear wholesale
    // market (FRANCE_MARKET), CRE cost-of-service carbon-light KPI weights
    // (FRANCE_REGULATOR), the € bill, a sharper winter peak, and the
    // documented baseloadFloor data hook (dispatch consumes it in Phase-D).
    id: 'paris',
    name: 'Paris & the Seine',
    tagline: 'Haussmann limestone, a calm grey river, and a grid to electrify.',
    build: () => buildCityFromData(cityDataFor('paris')),
    country: 'FR',
    difficulty: 4,
    unlockAtRank: 4,
  },
  {
    // New York — second DATA-backed playable city (OSM artifact
    // src/data/cities/newyork.ts): Manhattan between the Hudson and East River,
    // Central Park, the boroughs across the water. WP2: wired to the USA
    // operating model (country 'US') — a 60 Hz gas-and-nuclear NYISO market
    // with a summer air-conditioning peak (USA_MARKET), the NYPSC cost-of-
    // service rate case (USA_REGULATOR: SAIDI/SAIFI, delivery charge, CLCPA
    // clean-energy lean), and the $ bill.
    id: 'newyork',
    name: 'New York & the Harbor',
    tagline: 'The grid, the boroughs, two rivers, and a skyline to power.',
    build: () => buildCityFromData(cityDataFor('newyork')),
    country: 'US',
    difficulty: 6,
    unlockAtRank: 6,
  },
  {
    // Sydney — OSM artifact (src/data/cities/sydney.ts): the harbour and its
    // inlets, the Opera House, the eastern-suburbs peninsula, the open Tasman
    // to the south-east. WP2: now wired to the AUSTRALIA operating model
    // (country 'AU') — the rooftop-PV DUCK CURVE (AUSTRALIA_MARKET: midday
    // price goes negative, violent heatwave evening peaks), a SUMMER peak
    // (the inverse of GB), the AER curtailment-heavy KPI weights
    // (AUSTRALIA_REGULATOR), and the A$ bill. The single most distinctive
    // near-term city.
    id: 'sydney',
    name: 'Sydney & the Harbour',
    tagline: 'The harbour, the bridge, the Opera House, and a coast to power.',
    build: () => buildCityFromData(cityDataFor('sydney')),
    country: 'AU',
    difficulty: 5,
    unlockAtRank: 7,
  },
  {
    // Hong Kong — OSM artifact (src/data/cities/hongkong.ts): Victoria Harbour
    // dividing Kowloon from the Island, the green Peak, the outlying islands.
    // WP2: now wired to the HONG KONG operating model (country 'HK') — a high,
    // stable, regulated-gas wholesale market (HONGKONG_MARKET), the Scheme of
    // Control profit-cap regulator whose card is dominated by world-best
    // reliability (HONGKONG_REGULATOR: CI/CML 0.26 each), a summer peak, and
    // the HK$ bill. NOTE: HK is really VERTICALLY INTEGRATED ('owned'); that
    // structural fork (no tender — you build the plant) is DEFERRED to Phase-C
    // (HONGKONG_GENERATION stays 'tender' for now). See powerProfile.ts §4b.
    id: 'hongkong',
    name: 'Hong Kong & Victoria Harbour',
    tagline: 'A harbour city of peaks and towers, packed against the sea.',
    build: () => buildCityFromData(cityDataFor('hongkong')),
    country: 'HK',
    difficulty: 7,
    unlockAtRank: 8,
  },
  {
    // Berlin — OSM artifact (src/data/cities/berlin.ts): the Spree threading a
    // landlocked metropolis, Mitte's core, lakes and forests at the edge.
    // WP2: wired to the GERMANY operating model (country 'DE') — a renewables-
    // heavy Energiewende market with deep PV middays + a Dunkelflaute spike
    // (GERMANY_MARKET), the BNetzA Anreizregulierung revenue cap (GERMANY_
    // REGULATOR: SAIDI/SAIFI, Netzentgelte, carbon/hosting lean), and the € bill.
    id: 'berlin',
    name: 'Berlin & the Spree',
    tagline: 'A flat city on a slow river, ringed by lakes and woods.',
    build: () => buildCityFromData(cityDataFor('berlin')),
    country: 'DE',
    difficulty: 4,
    unlockAtRank: 8,
  },
  {
    // Shanghai — OSM artifact (src/data/cities/shanghai.ts): the Huangpu
    // winding past Pudong's towers, a dense megacity grid. WP2: wired to the
    // CHINA operating model (country 'CN') — the NDRC/NEA transmission-and-
    // distribution price review over a State Grid UHV system, and the ¥ bill.
    id: 'shanghai',
    name: 'Shanghai & the Huangpu',
    tagline: 'A megacity on a winding river, towers crowding the Bund.',
    build: () => buildCityFromData(cityDataFor('shanghai')),
    country: 'CN',
    difficulty: 8,
    unlockAtRank: 9,
  },
  {
    // Cape Town — OSM artifact (src/data/cities/capetown.ts): Table Bay and the
    // Atlantic, the City Bowl below the mountain, the Cape Flats sprawl. WP2:
    // wired to the SOUTH AFRICA operating model (country 'ZA') — the NERSA
    // Multi-Year Price Determination over a load-shedding-constrained grid, and
    // the R bill.
    id: 'capetown',
    name: 'Cape Town & Table Bay',
    tagline: 'A city bowl under the mountain, between two oceans.',
    build: () => buildCityFromData(cityDataFor('capetown')),
    country: 'ZA',
    difficulty: 6,
    unlockAtRank: 9,
  },
  {
    // Cairo — OSM artifact (src/data/cities/cairo.ts): the Nile threading a vast
    // dense city, the Pyramids on the desert edge. WP2: wired to the EGYPT
    // operating model (country 'EG') — the EgyptERA subsidised tariff schedule
    // over a fast-growing Nile-valley grid, and the E£ bill.
    id: 'cairo',
    name: 'Cairo & the Nile',
    tagline: 'A vast dense city on the great river, desert at its back.',
    build: () => buildCityFromData(cityDataFor('cairo')),
    country: 'EG',
    difficulty: 8,
    unlockAtRank: 10,
  },
  {
    // Athens — OSM artifact (src/data/cities/athens.ts): the Attic basin, the
    // Saronic coast at Piraeus, the Acropolis, mountains framing the sprawl.
    // WP2: wired to the GREECE operating model (country 'GR') — the RAE
    // required-revenue methodology for HEDNO over a sun-baked island-linked
    // grid, and the € bill.
    id: 'athens',
    name: 'Athens & the Saronic Gulf',
    tagline: 'An ancient basin between the mountains and the sea.',
    build: () => buildCityFromData(cityDataFor('athens')),
    country: 'GR',
    difficulty: 5,
    unlockAtRank: 10,
  },
  {
    // Pune — OSM artifact (src/data/cities/pune.ts): a dense Deccan-plateau
    // city, the muddy Mula-Mutha looping through, basalt forts and saffron
    // temples in the old peths, mirror-glass IT parks on the fringes. WP2:
    // wired to the INDIA operating model (country 'IN') — a coal-heavy market
    // with a pre-monsoon summer peak (INDIA_MARKET), the MERC Multi-Year Tariff
    // order (INDIA_REGULATOR: SAIDI/SAIFI · AT&C losses, wheeling charge), and
    // the ₹ bill.
    id: 'pune',
    name: 'Pune & the Mula-Mutha',
    tagline: 'A hazy plateau city of fort-stone, temples and tech towers.',
    build: () => buildCityFromData(cityDataFor('pune')),
    country: 'IN',
    difficulty: 6,
    unlockAtRank: 11,
  },
  {
    // North-East England — OSM artifact (src/data/cities/northeast.ts): a
    // coastal REGION, the Tyne and Wear cutting to the North Sea, Newcastle and
    // Gateshead on the gorge, the quaysides, castles and the cold grey coast.
    // SHARES GB laws with London (owner: "London and North East can have same
    // shared laws") — country 'GB' makes that explicit, so it reads in the same
    // Ofgem/RIIO language and resolves to LONDON_PROFILE.
    id: 'northeast',
    name: 'North-East England & the Tyne',
    tagline: 'Honey sandstone, steel bridges and a cold North Sea coast.',
    build: () => buildCityFromData(cityDataFor('northeast')),
    country: 'GB',
    difficulty: 4,
    unlockAtRank: 11,
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
  {
    id: 'm6-sun-store',
    name: 'Sun & Store',
    tagline: 'Solar fills the day; a battery carries it through the night.',
    build: buildSunStoreMap,
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
