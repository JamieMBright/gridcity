# Fresh-env network allowlist (for the OSM + reference pipeline)

The autonomous "request any city → accurate map + landmarks" pipeline needs
outbound egress to the hosts below. The current session is **GitHub-only**, so
these are blocked; create a fresh environment with this allowlist.

Prefer **wildcards** where the platform supports them (several of these load-
balance across subdomains / CDNs). Exact hosts listed too.

## OSM geometry + geocoding (the map backbone)
| Host | Wildcard | Why |
|---|---|---|
| `overpass-api.de` | `*.overpass-api.de` | Overpass API — building footprints, waterways, coastline, roads, rail, landuse, parks by bbox. Main endpoint redirects to `lz4.`/`z.` subdomains → wildcard needed. |
| `overpass.kumi.systems` | — | Alternative Overpass instance (fallback / higher limits). |
| `nominatim.openstreetmap.org` | `*.openstreetmap.org` | Geocode a city name → bounding box / relation id. |
| `api.openstreetmap.org` | `*.openstreetmap.org` | OSM element/relation geometry lookup. |
| `download.geofabrik.de` | `*.geofabrik.de` | Bulk regional `.osm.pbf` extracts (large areas / offline). |
| `tile.openstreetmap.org` | `*.tile.openstreetmap.org` | Raster tiles — optional visual cross-check only. |

## Landmark discovery + metadata + references
| Host | Wildcard | Why |
|---|---|---|
| `query.wikidata.org` | `*.wikidata.org` | Wikidata SPARQL — find NOTABLE buildings in a bbox (heritage status, tourism, architectural significance) and link them to OSM via `wikidata=` tags. The "hundreds of heroes" discovery query. |
| `www.wikidata.org` | `*.wikidata.org` | Wikidata entity API (labels, coordinates, images). |
| `en.wikipedia.org` | `*.wikipedia.org` | Article + `pageimages` API. The "is it on Wikipedia ⇒ it's a hero" test + textual descriptions for the visual specs. |
| `commons.wikimedia.org` | `*.wikimedia.org` | Wikimedia Commons API — freely-licensed reference photos metadata. |
| `upload.wikimedia.org` | `*.wikimedia.org` | The actual image BYTES — download a reference photo to disk to view/critique against (and, if ever revisited, to drive raster art). |

## Optional — only if the outsourced-raster hero route is ever revived
| Host | Why |
|---|---|
| `api.openai.com` | `gpt-image-1` (native transparent PNGs). Currently NOT in plan (we reverted the raster pipeline), listed for completeness. |

## Licensing reminders (bake into attribution)
- **OSM data is ODbL.** A stylised game map is a "Produced Work": allowed, but
  must credit **"© OpenStreetMap contributors"** (e.g. in an about/credits
  screen). Does not force open-sourcing the game.
- **Wikimedia images** are per-file licensed (mostly CC-BY-SA / public domain) —
  used as REFERENCE to draw original art; if any image is ever shipped, honour
  its specific licence + attribution.
- **Wikidata** is CC0 (no attribution required, but courteous to credit).

## Etiquette / rate limits (so we don't get blocked)
- Overpass: keep queries bbox-scoped, cache results to disk, ≤ a few req/min,
  set a `User-Agent`. Heavy/whole-city pulls → use Geofabrik extracts instead.
- Nominatim: ≤ 1 req/s, real `User-Agent`, cache.
- Wikimedia/Wikidata: descriptive `User-Agent`, cache, batch where possible.
