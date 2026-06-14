# OSM-driven map + landmark pipeline (build plan for the fresh env)

Goal: **request any city → an accurate, stylised map** with rivers/coast/roads
in the right places and **hundreds of real buildings** placed at their true
positions, scaled from real footprints/heights. No hand-placing, no hero cap —
notability is discovered, not curated. Bespoke hand-art is reserved for the
marquee few; everything else is procedural.

Prereq: the egress allowlist in `docs/env-allowlist.md` (this session is
GitHub-only, so the pipeline can't run here — build it in the fresh env).

## Pipeline stages
1. **Geocode** (Nominatim): city name → bounding box + the admin relation.
2. **Fetch geometry** (Overpass, bbox-scoped, cached to disk):
   - water: `natural=coastline`, `natural=water`, `waterway=riverbank|river|canal`
   - transport: `highway=motorway…residential`, `railway=rail|subway`
   - land: `landuse=*`, `leisure=park`, `natural=*`
   - buildings: `building=*` with `name`, `height`, `building:levels`,
     `wikidata`, `wikipedia`, `amenity/tourism/historic` tags.
3. **Project to the tile grid**: lat/lon → local metric (Web Mercator or a local
   tangent plane) → scale/translate to the game's tile map size (e.g. 256×160),
   choosing the scale so the city's core fills the grid. Keep the transform so
   every later layer lines up.
4. **Derive map layers** (the existing `CityMap`): rasterise water/coast to the
   `terrain` array; roads/rail to the `road` array (by `RC` class); landuse to
   `zone`; parks; the density field from building density.
5. **Discover heroes** (no cap): a building is "notable" if it has
   `wikidata`/`wikipedia`, or `historic`/`tourism`, or a `name` + large
   footprint. Cross-check via **Wikidata SPARQL** (heritage/tourism/architectural
   significance in the bbox) and the **Wikipedia `pageimages`** test. Rank by
   notability; the top tier gets bespoke art, the rest procedural.
6. **Procedural building art from footprint + height** (the big win): extrude the
   real OSM footprint polygon into the iso style — walls from `height` (or
   `levels × 3 m`), roof by `roof:shape`, tint by `building` type
   (residential/commercial/civic/industrial). This yields hundreds of distinct,
   correctly-shaped buildings for free, in the existing ink-contour dusk style.
   Footprint → iso mesh reuses the `Iso`/`Raster` kit; a new
   `footprintTile(polygon, height, kind)` is the core addition.
7. **Bespoke heroes**: the marquee landmarks keep hand-coded sprites
   (`landmarkSprites.ts`) driven by the visual-spec workflow
   (`docs/landmarks/<name>.md`), placed at their true OSM position/footprint.
8. **Stylise**: the map stays "recognisable-not-literal" — simplify/smooth OSM
   polygons, snap to the grid, apply the sector-character + density doctrine, so
   it reads as the game's world, not a GIS dump.

## Attribution + caching
- Credit **"© OpenStreetMap contributors"** in-app (ODbL Produced Work).
- Cache every Overpass/Wikidata/Wikimedia response to disk (keyed by query) so
  re-runs are offline and we respect rate limits.

## Suggested build order
1. `tools/osm/` fetchers (nominatim, overpass, wikidata, wikimedia) with disk cache.
2. The projection + a `tools/osm/buildCityFromOsm.ts` that emits a `CityMap`.
3. `footprintTile()` procedural building renderer + atlas wiring.
4. Hero discovery + ranking; wire bespoke sprites for the top tier.
5. London first (validate against the current hand-built map), then any city.
