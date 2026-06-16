// Lazy-loaded city ARTIFACTS, kept off the initial bundle.
//
// A committed city (Paris, and the rest as they land) ships as a ~320 KB
// base64 CityData artifact in src/data/cities/<id>.ts. Bundling those into the
// main app or the worker would bloat the download for everyone — including the
// London-only player who never opens another city. So a city's `build()` must
// be SYNCHRONOUS (newContext / setActiveScenario call it directly), yet its
// data must arrive via a dynamic import (a separate chunk Vite code-splits).
//
// The bridge: a tiny module-level registry. `loadScenarioData(id)` dynamically
// imports the artifact ONCE and registers the decoded CityData; `cityDataFor`
// then reads it synchronously. Callers that switch to a data-backed scenario
// (the worker's newGame/start, the client's MapView) await loadScenarioData
// FIRST, so the sync build() always finds its data preloaded. London needs no
// preload (its map is code-drawn) — loadScenarioData('london') is a no-op.

import type { CityData } from './cityData';

/** id → the dynamic import of its artifact module. Add a city here and in
 *  CITY_DATA_SCENARIOS (cityRegistry) and it becomes lazily playable. The
 *  import lives behind a thunk so referencing the map doesn't pull the chunk
 *  until something actually loads it. */
const CITY_ARTIFACTS: Record<string, () => Promise<{ default?: unknown } & Record<string, unknown>>> = {
  paris: () => import('./cities/paris'),
  newyork: () => import('./cities/newyork'),
  sydney: () => import('./cities/sydney'),
  hongkong: () => import('./cities/hongkong'),
  berlin: () => import('./cities/berlin'),
  shanghai: () => import('./cities/shanghai'),
  capetown: () => import('./cities/capetown'),
  cairo: () => import('./cities/cairo'),
  athens: () => import('./cities/athens'),
  pune: () => import('./cities/pune'),
  northeast: () => import('./cities/northeast'),
};

/** Scenario ids whose map is a committed (lazy-loaded) artifact, not a
 *  code-drawn builder. The registry's keys — exported so the registry and the
 *  picker agree on what's data-backed. */
export const CITY_DATA_IDS = Object.keys(CITY_ARTIFACTS);

const loaded = new Map<string, CityData>();
const inflight = new Map<string, Promise<void>>();

/** Pull the first CityData-shaped export out of an artifact module (the
 *  generated files export e.g. PARIS_CITY, not a default). */
function pickCityData(mod: Record<string, unknown>): CityData {
  for (const v of Object.values(mod)) {
    if (v && typeof v === 'object' && 'terrain' in v && 'width' in v && 'councils' in v) {
      return v as CityData;
    }
  }
  throw new Error('artifact module has no CityData export');
}

/** Ensure a scenario's artifact is loaded + registered. Idempotent and
 *  de-duped (concurrent calls share one import). A no-op for ids with no
 *  artifact (London, the missions) so callers can await it unconditionally. */
export async function loadScenarioData(id: string): Promise<void> {
  if (loaded.has(id)) return;
  const importer = CITY_ARTIFACTS[id];
  if (!importer) return; // code-drawn scenario: nothing to fetch
  let p = inflight.get(id);
  if (!p) {
    p = importer()
      .then((mod) => {
        loaded.set(id, pickCityData(mod));
      })
      .finally(() => inflight.delete(id));
    inflight.set(id, p);
  }
  return p;
}

/** The preloaded CityData for a scenario, or throw if it wasn't loaded first.
 *  The throw is a programmer error (a sync build() ran before its async
 *  preload) — every real entry point awaits loadScenarioData before building. */
export function cityDataFor(id: string): CityData {
  const d = loaded.get(id);
  if (!d) throw new Error(`scenario "${id}" data not loaded — await loadScenarioData("${id}") first`);
  return d;
}
