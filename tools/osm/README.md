# OSM → ElectriCity map pipeline

Turn **any real city** into a playable ElectriCity map, drawn from
OpenStreetMap. This is the authoring side of `docs/osm-pipeline.md` — it runs
once, offline-cached, and emits a committed data artifact the game loads with
zero network at play time.

> Map data **© OpenStreetMap contributors** (ODbL). A stylised game map is a
> "Produced Work" — allowed, with attribution. The generated artifact carries
> the credit string and the game shows it.

## Usage

```bash
# fetch + build + print a stats report (dry run; raw OSM cached to .cache/)
npx tsx tools/buildCity.ts "Paris, France" paris "Paris & the Seine" --span=22

# emit src/data/cities/paris.ts (the committed artifact)
npx tsx tools/buildCity.ts "Paris, France" paris "Paris & the Seine" --span=22 --write

# preview a generated city (validates the serialize → load → render round-trip)
npx tsx tools/previewCity.ts paris                       # whole map, far
npx tsx tools/previewCity.ts paris 96 54 162 106 4 mid   # a crop
```

Flags: `--span=<km>` window width E–W (default 24); `--write` emit the module;
`--lon= --lat=` skip the geocoder and centre explicitly.

## How it works (the modules)

| File | Job |
|---|---|
| `project.ts` | Web-Mercator + fit a metric window to the 256×160 tile grid (pure). |
| `geometry.ts` | Tile-space rasterisers: polygon fill, polyline stroke, RDP simplify (pure). |
| `net.ts` | Cached HTTP (disk cache keyed by request hash) + retry/backoff + UA. |
| `nominatim.ts` | Geocode a place name → centre + bbox. |
| `overpass.ts` | One bbox query → normalised water/roads/rail/land-use/green/buildings/admin. |
| `buildCityFromOsm.ts` | The orchestrator: rasterise every layer → a `CityMap`. |
| `emitCityData.ts` | Serialize a `CityMap` → `src/data/cities/<id>.ts`. |

The runtime loader is `src/data/cityData.ts` (`buildCityFromData`); it decodes
the base64 rasters and re-derives customers/vegetation/sprite-variant, so the
committed artifact stays lean.

## Method notes

- **Urban density is real**, not a guess: a blurred street-density field gives
  the city its true footprint (with the holes parks/rivers punch); radial
  distance sets the intensity tier (dense core → urban ring → suburb), the way
  the hand-built London map grades.
- **Streets clip tiles (`streetTouch`), they don't clear them** — otherwise a
  city's dense street grid suppresses the building on every tile and the place
  looks deserted. Only DRAWN major roads (motorway/arterial/rail ribbons) clear
  their tiles so the carriageway shows.
- **Landmarks** are discovered from OSM tags (wikidata / tourism / historic /
  named buildings), ranked by notability, placed at their true position with a
  cleared "parvis" apron so they stand proud. They currently map to the nearest
  existing sprite archetype (cathedral → dome, château → castle, …) — bespoke
  per-city hero art + procedural footprint buildings + per-city architectural
  palettes (Haussmann cream/grey, etc.) are the next steps (`docs/osm-pipeline.md`
  stages 6–8).

## Caching

Every Overpass/Nominatim response is cached under `tools/osm/.cache/`
(git-ignored). Re-runs are offline. Delete the cache to force a refresh.
