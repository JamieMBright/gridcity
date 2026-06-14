# Reality-seeded stylised cities — the plan

Owner direction (2026-06-14): *"We have exact roads, geography, building shapes.
But I like the art style + gameplay. So I don't want exactly Paris — use this to
populate a simplified, cut-back version, using reality as a seed."*

So: **reality is the SEED, the game's art + gameplay are the OUTPUT.**
Recognisable-not-literal (the existing map doctrine), but now every layer is
informed by real data instead of guessed.

## Recommendation — the choice (owner asked: roads must CUT THROUGH, not dominate)

**Buildings are the dominant fabric; roads are thin streets that cut through it.**
That's what made the blank-shapes render look fantastic — the ground is nearly
all building, and the roads are the slivers between. To get that in the game
without roads "eating tiles":

1. **Fine, core-focused tile scale (~30–40 m/tile, 256×160 over the city core).**
   This is the lever that stops roads dominating: at ~35 m a street is ≈ one
   tile, so it reads as a seam, not a void. Zero perf cost (same grid). Covers
   the dense core, not the outer sprawl — the right trade for a power-network
   game. (A bigger grid for full-metro is a later option.)
2. **Buildings fill the blocks, from real footprints.** A tile that real
   footprints cover becomes a building; the road-centreline tiles stay clear for
   the street. So buildings are the majority of tiles (dominant), roads the
   minority seams (cut through).
3. **Roads rendered as proper thin streets** — carriageway + kerb/pavement, the
   width by class (boulevard a touch wider, residential a hairline). Never a
   full-tile clear-to-grass. They divide the fabric into the real block shapes.
4. **Metadata choice for the fabric:** classify each building tile by the
   dominant real `building=` / `amenity=` (domestic / commercial / civic /
   industrial / retail); the ~half tagged generic `yes` inherit the
   neighbourhood majority (+ land-use fallback). Height band from
   `building:levels`. → the game draws its stylised per-city sprite for that
   type+height. Real mix, game art.

That's the recommendation: **fine tiles + real-footprint building fabric + thin
cut-through streets + tag-driven types/heroes.**

## What OSM actually gives us (measured on central Paris, 98,577 buildings)

Buildings are not just shapes — they're classified:

| Signal | Coverage | Use |
|---|---|---|
| `building=` | 100% | type: **apartments 38k (domestic)**, house 1.4k, office, retail, hotel, **school 637**, **hospital 370**, industrial, `yes` 52k (generic) |
| `building:levels` | **55%** | **height** per building (median storeys → low/mid/tall) |
| `amenity=` | place_of_worship 265, school, theatre, library, college, kindergarten… | **civic specials** |
| `office=` | government 51, company, diplomatic… | civic / commercial |
| `shop=` | mall, supermarket, department_store… | retail frontage |
| `tourism=` | hotel 528, museum 36, gallery, attraction | commercial + heroes |
| `historic=` | castle, palace (manor 103), monument, city_gate | heroes |
| `healthcare=` | hospital, clinic | critical loads |
| `name` / `wikidata` | 4061 / 2154 | **heroes** (notability) |

So we can tell domestic from commercial from civic from a hospital from a hero —
plus a height for most — straight from the data.

## The pipeline: aggregate reality onto the game tile grid, render game art

The simplification step is **aggregation to the game's tile grid**; the render
step stays pure game art. Reality drives *what/where/how-tall/how-dense*, the
game decides *how it looks and plays*.

1. **Terrain / water / parks** — rasterise real OSM (done): Seine, coast, parks
   in true positions.
2. **Roads** — simplify the real network to the game's vector ribbon layer: keep
   the topology + shape (boulevards, the radial grid) but smooth + decimate to
   the tile scale, drawn in the game's road style. The grid divides blocks.
3. **Building tiles (the seed → sim bridge)** — for each game tile, aggregate the
   real footprints whose centroid falls in it:
   - **type** = dominant OSM building class → game zone (domestic / commercial /
     civic / industrial / retail-frontage).
   - **density** = footprint coverage + count → urbanCore vs urban vs suburb.
   - **height** = median `building:levels` → which stylised sprite (low terrace →
     mid Haussmann → tower).
   The game then draws its OWN per-city stylised sprite for that tile — so the
   art style is preserved, but type/density/height are REAL.
4. **Civic specials** — drop the game's existing landmark sprites at real
   locations: `amenity=hospital`→hospital, `=school`→school,
   `=place_of_worship`→church/dome, `office=government`→townhall, etc.
5. **Heroes** — `name`/`wikidata`/`historic`/`tourism` → the bespoke marquee
   (Eiffel, Notre-Dame…) + the grand-civic generator for the ~100 notable
   buildings, at true positions, sized big.
6. **Demand / gameplay (seeded too)** — domestic tiles → customers; commercial /
   civic → process load; **hospital = a critical load**, data-centre = a hungry
   one. The power-network challenge now reflects the real city, not a uniform
   blob — gameplay seeded by reality.

## Why this is the reconciliation

- **Art style kept** — we render the game's stylised sprites, not GIS polygons.
- **Gameplay kept** — tiles, zones, demand, the DNO sim are unchanged in kind.
- **Cut-back/simplified** — 98k footprints collapse to ~tens of thousands of
  tiles; only heroes are bespoke; the rest are stylised archetypes chosen by
  real type+height.
- **Seeded by reality** — roads, water, building MIX, heights, civic anchors and
  heroes are all real → it reads as the city without being a literal copy.

## Build order

1. `classifyBuilding(tags)` → {class, levels} (pure, tested).
2. Aggregate footprints → per-tile {zone, density, heightBand, special?} in
   `buildCityFromOsm` (replaces the landuse+road-density guess with the real
   building mix; keep landuse as a fallback where buildings are untyped `yes`).
3. Civic-special placement from amenity/office/healthcare tags → landmark ids.
4. Height band → sprite choice (per-city: London brick low/mid/tower; Paris
   Haussmann; tower where levels are high).
5. Heroes (already built) + the grand generator wired in.
6. Validate: blank-shapes vs the rendered game map side by side; demand map
   reflects the real domestic/commercial/civic split.

Map data © OpenStreetMap contributors (ODbL).
