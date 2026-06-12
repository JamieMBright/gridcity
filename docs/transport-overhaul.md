# Transport overhaul — roads, rail, boats, air

Owner prompt (2026-06-12, with a zoomed-out phone screenshot): *"The roads
are still goofy as shit. Real overhaul rethink of how to get a really
realistic looking road, rail, boat, and air network."*

This is a build-ready design. The audit previews referenced throughout were
rendered from the current code (see the crop table at the end); the
implementer should re-render the same crops after each phase.

---

## 1. Audit — how routes become pixels today, and why it reads goofy

### 1.1 The pipeline as-is

1. **Authoring** — `src/data/londonMap.ts` pushes `TransportRoute { kind,
   pts }` (tile-space waypoints). Motorways/rail sweep; arterials/lanes get
   `latticeThroughTowns()`; streets are generated straight lattice runs
   (every 4th row, every 5th column of inhabited tiles) plus bridges.
2. **Stamping** — routes are sampled (`sampleRoute`, Catmull-Rom) and burnt
   into the per-tile `road` raster (RC codes) for gameplay (build rules,
   structure suppression). `tileChooser.structureSpriteFor` returns
   `undefined` on `RC.street`/`arterial`/`motorway`/`rail` tiles so the
   ribbon has a clear floor.
3. **Drawing** — `MapRenderer.buildRoutePaths()` re-samples every route at
   step 0.35, projects each sample through `tileCentre` (world px), and
   `drawRoutes()` strokes them ONCE at init into a single
   `routesG: Graphics` that sits between `terrainLayer` and
   `structureLayer`. Widths are fixed **world px** from `ROUTE_STYLE`
   (motorway 13·RES = 26 wpx on a 256 wpx-wide tile; street 10 wpx). Pass
   order: per-path verges+casing → per-path fills → per-path details
   (dashes, sleepers/rails, water piers, flowers).
4. **Vehicles** — `spawnVehicles()` walks the same `RoutePath`s
   (cars/trains/boats + a synthetic river path for barges); over water,
   road vehicles are lifted `8·RES` (the only thing that currently says
   "bridge").
5. **Water** — terrain tiles; shorelines are 16 baked `water_<NESW mask>`
   sprites with straight sand bands along tile edges
   (`worldSprites.ts`). No vector shoreline exists.
6. **Preview** — `tools/preview.ts` composites ground + structures only and
   explicitly skips ribbons (*"road ribbons are the renderer's job"*), so
   the art-review loop has been **blind to transport** — a process root
   cause of "still goofy".

### 1.2 What the previews show (rendered with a faithful port of
`drawRoutes`; see §8 for files)

**Top diagnoses, in order of visual damage:**

1. **No zoom adaptation at all.** `routesG` is stroked once in world px and
   only scaled. At the owner's phone zoom (world scale ≈ 0.06–0.12, tile
   ≈ 16–30 screen px — `audit_wide_far.png`, `audit_central_far.png`) a
   street is **1 px of dark casing**, a motorway ~2–3 px of low-contrast
   grey: the whole network collapses into noisy dark threads, and the M25
   literally disappears into the fields (`audit_m25_heathrow.png`). There
   is no declutter either, so at far zoom the dense 4×5 street lattice
   contributes pure per-pixel noise.
2. **Round screen-space strokes ignore the iso projection.** Stroke width
   is isotropic in screen px, but a tile is 256 wpx wide and only 64 wpx
   tall. A ribbon running screen-vertical therefore eats ~4× more *tile*
   than the same ribbon running screen-horizontal — roads read as floating
   noodles laid ON TOP of the world instead of tarmac painted INTO the
   ground plane (clearest in `audit_streets_close.png`). Same bug family:
   motorway edge lines are offset in screen-Y only
   (`stroke(..., offset)` shifts y), so on N–S runs both white lines slide
   to one carriageway edge.
3. **No hierarchy or contrast.** Fill colours (street 0x5f5c66, arterial
   0x55525f, motorway 0x474556) are near-identical desaturated greys, all
   darker than the pavement grounds they cross; the ink casing
   (0x241c38 @ 0.6) is invisible against them. Motorway:street width ratio
   is only 2.6×. The 0.55-alpha green verge halo around every street/lane
   smears the residential grid into mush at mid zoom.
4. **Junctions are an accident.** Same-class fills merge only because all
   casings happen to be stroked before all fills; there is no class
   ordering (a lane painted after a motorway draws its narrow fill across
   it), no junction geometry, no roundabouts, and motorway crossings are
   flat paint — no grade separation, no slip roads. Round caps at lattice
   L-corners produce blobby elbows.
5. **Water edges and crossings don't read.** Shorelines are hard tile
   stairs (16 NESW masks) — the estuary is blue Lego
   (`audit_estuary_dartford.png`, `audit_estuary_southend_far.png`).
   Bridges are not structures: a ribbon continues over the water with
   4.4×5 px screen-space pier dots; the Dartford crossing and all Thames
   bridges are invisible at any distance. Boats (vehicleLayer, above
   routesG) draw **over** what deck there is. Rail beyond close zoom is
   indistinguishable from a street; there is no air network at all.

Secondary findings: vehicles ping-pong (`dir` flips at route ends) which
reads fine; the barge path is synthetic and fine; `routesG` as one Graphics
is cheap (good bones — keep the single-build approach, add band rebuilds).

---

## 2. Target look (research summary)

References: SimCity 2000 / Theme Hospital-era iso (roads as chunky
projected ground quads with kerbs, junction tiles, distinct rail), Google
Maps mid-zoom (casing + fill, class colours, smooth declutter, junction
fills merging), OS Landranger (strong class colour coding, rail as black
line with white ticks, blue motorways), Transport Tycoon (bridges as real
structures with piers + shadows, planes with ground shadows).

Conventions to adopt:

- **Casing/fill** everywhere: each carriageway is a dark outline polygon
  with a lighter fill inset; at night-dusk palette that means fills
  *lighter* than the ground, casing near-black. This single change buys
  most of the "real map" read.
- **Width + colour hierarchy** (tile-space widths, see §4): motorway
  ~0.30 tile (dual 2×0.13 + reservation), arterial 0.18, street 0.10,
  lane 0.07. Motorway fill warm light grey with cream edge lines; arterial
  mid grey; streets cool grey, **no verge halo** (verges return only at
  close zoom as drawn detail).
- **Zoom declutter**: far zoom shows motorways + arterials + rail only,
  width-floored in screen px so the M25 always reads as the map's
  signature ring; streets fade in by band, furniture (dashes, sleepers,
  flowers, kerbs) only at near zoom.
- **Junction merge for free**: draw all casings, then all fills, class
  ascending (street → arterial → motorway) — fills overpaint crossing
  casings so every junction merges with a continuous outline. Verified
  trick; adopt as the core pass structure.
- **Roundabouts** at named arterial meets (annulus fill + casing);
  **grade separation** wherever anything crosses a motorway: minor road
  briefly becomes a bridge (casing gap + parapet + shadow).
- **Rail** near: ballast + sleepers + twin steel (exists, keep), plus
  stations on the line; far: cartographic dark line with cream cross-ticks
  every ~1.5 tiles — instantly reads "railway", never "thin street".
- **Bridges as structures**: deck slab lifted above water, visible piers
  with reflections, parapets, soft SW shadow on the water, boats passing
  under.
- **Shorelines smoothed** (visual only): marching squares over the water
  mask + 2× Chaikin; flat-colour band straddling the contour hides the
  tile stairs; embankment styling through town, sand/marsh outside; thin
  foam line water-side.
- **Air**: Heathrow (exists at (65,87) with runways) gets departure/arrival
  arcs; animated planes with altitude-scaled ground shadows; optional City
  Airport in the Royal Docks later.

---

## 3. Architecture recommendation

**Keep transport as a vector layer rendered from route polylines; change
*how* it's tessellated and when it's rebuilt. No map-geometry changes in
the core phases.**

1. **New shared module `src/render/routeRibbons.ts`** (used by both
   `MapRenderer` and `tools/preview.ts`): takes `CityMap.routes` + a zoom
   band, emits **projected polygon geometry** — ribbons are built in
   TILE space (constant tile-space half-width, mitred joins), each vertex
   projected through the iso transform (`x=(u−v)·HALF_W, y=(u+v)·HALF_H`).
   This fixes diagnosis #2 exactly: a road is a quad strip lying in the
   ground plane, foreshortened like every floor diamond. Emission API is
   renderer-agnostic (callback receives `poly(points, color, alpha)`), so
   the Node preview rasterises the identical geometry.
2. **Pass structure** (diagnosis #4): for the band's visible classes, in
   ascending class order: *all* casing polys → *all* fill polys → details.
   Junctions merge for free; arterials ride over streets, motorways over
   everything. Rail draws after roads (it bridges/level-crosses them).
3. **Zoom bands, not per-frame restyle** (diagnosis #1): 5 bands (§4).
   `MapRenderer.setZoom`/pinch picks the band with hysteresis (±10 %);
   on band change rebuild `routesG` from `routeRibbons` (decimated
   sampling at far bands). One Graphics per band, built lazily, keep at
   most 2 cached. Width = `max(tileWidth, minScreenPx / (256·scale))`
   tile units, so far-zoom floors hold.
4. **Layer order** (bridges/boats): split today's `vehicleLayer`:
   `terrainLayer → shoreG → boatLayer → routesG (incl. bridge decks)
   → roadVehicleLayer → bridgeTopG (parapets) → structureLayer`. Boats go
   under decks; cars cross over decks but under the near parapet. All new
   layers `eventMode='none'` — picking/demolish (which live in
   `assetLayer`/`linesG` above) untouched.
5. **Map data**: junctions, bridge spans and pier runs are **derived** at
   renderer build time from existing routes (span = consecutive
   water-flagged samples; junction = endpoint/crossing proximity in tile
   space) — no `CityMap` change, no SAVE_VERSION risk. Only the air phase
   adds authored data (`AIRPORTS` const in `londonMap.ts` — additive
   export, not in the save payload; Heathrow-only needs zero tile edits).
   Roundabout/dual-carriageway annotations live in a small const table in
   `routeRibbons.ts` keyed by route index/class, not in map data.

Why not alternatives: per-tile road **sprites** (SC2K-style) were rejected
— they cannot follow the smooth motorway splines, junction variants
explode (the old goofiness partly came from tile-locked thinking), and the
vector layer already exists. A **Mesh/RenderTexture cache** is unnecessary
at this geometry size (see §7 budget) and a world-sized RenderTexture is
impossible (map is 53 248×13 632 wpx; atlas 4 096 limit lesson applies).

---

## 4. Zoom / declutter table

Bands by world scale `s` (tile screen width = 256·s; zoom range is
0.025–1.6). Widths in **tile units** with a **min screen px** floor.

| Class | Z0 far `s<0.08` | Z1 `0.08–0.18` | Z2 default `0.18–0.45` | Z3 `0.45–0.9` | Z4 close `≥0.9` |
|---|---|---|---|---|---|
| motorway | 0.30 t, floor 4 px, casing floor 6 px | 0.30 t / 5 px | 0.30 t + edge lines | dual 2×0.13 t + reservation + dashes | + hard shoulder, gantry posts |
| arterial | 0.18 t, floor 2.5 px, no dashes | 0.18 t / 3 px | 0.18 t + casing + centre dash | + cycle lanes, kerb line | + crossings, verge flowers |
| street | **hidden** | 0.10 t / 1.5 px, fill only, 0.6 α | 0.10 t + casing | + kerbs, pavement tone | + verges, flowers, drives |
| lane | **hidden** | **hidden** | 0.07 t fill only | 0.07 t + casing | + hedgerow shadow |
| rail | line 0.06 t / 2 px + ticks every 1.5 t | same | ballast 0.10 t + ticks | ballast + sleepers + twin steel | + catenary posts, station canopies |
| bridges | deck = class width + 0.04 t, always visible for motorway/arterial/rail | same + piers | + parapet, shadow | full piers, reflections | full |
| boats | hidden | dots | hulls | hulls + wakes | + deck detail |
| air | arcs hidden, planes 2 px | planes + shadows | planes + shadows | full | full |

Palette (dusk world, value contrast against ground): casing `#1f1834`;
motorway fill `#777287`, edge lines `#e8e2d2`, reservation `#3f8f4e`;
arterial fill `#6e6a7c`; street fill `#605c6b`; lane fill `#8a7a5e`;
rail ballast `#4a4555`, steel `#9aa4b5`, far-zoom ticks `#e8e2d2`;
bridge deck lightened class fill + parapet `#b8b2c4`.

---

## 5. Junction, bridge, shoreline, rail, boat, air treatments

**Junctions.** The two-pass-per-class order (§3.2) handles 90 %. On top:
derive junction nodes where ≥3 route ends/crossings fall within 0.4 t;
draw a fill disc (major class width, in projected ellipse form — iso!) to
clean odd angles. Named roundabout table for big arterial meets (Circulars
× radials): annulus casing+fill, 0.5 t outer radius, drawn in the fill
pass. Motorway crossings: the crossing route gets a derived mini-bridge
(casing gap across the motorway + parapet ticks + shadow) — motorways are
never crossed at grade.

**Bridges.** Span = maximal run of water-flagged samples (plus 0.7 t
approach each side). Deck: ribbon polys lifted `z = 9·RES·widthFactor`,
drawn in routesG; piers every ~1.2 t — projected boxes from waterline to
deck with a 2-px reflection streak; SW shadow polygon on the water at
0.18 α; near-side parapet polyline in `bridgeTopG` (above road vehicles).
Vehicle lift switches from constant `8·RES` to the span's deck height —
path-following code is otherwise untouched. Streets/lanes over water with
no land beyond (Southend pier) render as **piers**: wood-tone deck, twin
pile rows, no casing.

**Shoreline smoothing** (`src/render/shoreline.ts`, visual only). Marching
squares over `map.terrain` water mask (256×160 ⇒ contour ≈ 3–5 k segments)
→ closed polylines → Chaikin ×2 → for each segment emit two projected
band strips: water-side 0.45 t flat water colour (covers land-stair
teeth), land-side 0.35 t bank colour (sand; marsh tone where
`ground_marsh`; stone embankment where adjacent zone is urban/cbd/core) →
ink waterline 1.5 px + cream foam line 0.6 α offset 0.12 t water-side.
Built once at init (static), drawn between terrain and boats. Cost: ~8–10 k
small polys once ≈ tens of ms init, zero per-frame. Tiles keep gameplay
semantics; no data change.

**Rail.** Far bands: single dark line + cross-ticks (table above) drawn
*after* roads. Near bands: keep existing ballast/sleepers/steel but in
projected geometry. Stations: existing `lm_station` landmarks already sit
on lines; add a small platform slab poly where a rail path passes within
0.7 t of a station landmark (derived, no data change).

**Boats.** Keep barge spawning; add `wakeG` (cleared per frame): two
fading 0.5-px trail lines per moving boat ≈ 9 boats × 6 segments —
trivial. Dock furniture (Tilbury crane sprite) is optional polish in the
sprite atlas, not core.

**Air** (`src/render/airLayer.ts`). New const in `londonMap.ts`:
`export const AIRPORTS = [{ name:'Heathrow', x:65, y:87, hdg:'EW' }]` —
additive export, no tiles touched, **no SAVE_VERSION bump**. Flight paths:
2 departure + 2 arrival quadratic arcs per airport aligned with the real
westerly operation (climb out west over the M25, arrive from the east over
town). 3 planes: white cross-shaped sprite scaled 0.6→1.0 by altitude,
ground-shadow ellipse on the terrain offset SW, fading with altitude;
drawn above structures, below pins/labels. Optional later: City Airport in
the Royal Docks — needs FLAG_RUNWAY tiles + landmark ⇒ map-geometry change
⇒ justify + bump SAVE_VERSION (v10) in its own PR.

---

## 6. How the vector layer coexists with painter-order sprites

Roads are ground-plane paint: anything between `terrainLayer` and
`structureLayer` is automatically "under buildings" because structures are
suppressed on RC road tiles and building sprites paint after. Bridges are
the only transport element with height — handled by the layer split in
§3.4 plus deck z-lift, never by `zIndex` games inside `structureLayer`.
The Tower Bridge landmark keeps drawing as a structure over its street
route (already special-cased in `tileChooser`); the new bridge pass must
**skip spans within a `towerBridge` landmark reservation**. Selection,
ghosts, lines, pins all live above `structureLayer` and are unaffected;
all new Graphics are non-interactive.

---

## 7. Performance budget (mobile-first)

| Item | Budget | Notes |
|---|---|---|
| routesG rebuild on band change | ≤ 50 ms desktop / ≤ 120 ms mid phone | ~700 paths; far bands decimate sampling to step 1.0 (≈ 25 k verts), near bands step 0.35 visible-classes-only. Measure with `performance.now`; if over, build across 2 rAF frames (casing frame 1, fills frame 2 — visually acceptable during a pinch). |
| Cached band Graphics | ≤ 2 alive (~4–8 MB GPU) | destroy LRU band. |
| Shoreline build | once at init, ≤ 80 ms | static thereafter. |
| Per-frame additions | wakes (≤ 60 segs), 3 planes + shadows, deck-height vehicle lift | all O(vehicles), no filters, no per-frame Graphics besides existing flow/pulse + small wakeG. |
| Fill rate | shoreline bands ≈ +1 overdraw near shores only; ribbons < 8 % of screen | no blurs/filters; flat alpha polys only — fine for phone-landscape. |
| Atlas | unchanged (no new big sprites in core phases) | plane/crane sprites are tiny; shelf-packer guard already enforces 4 096. |

---

## 8. Phased build plan (each phase independently shippable + previewable)

Verification baseline for every phase: re-render the §9 crops with
`npx tsx tools/preview.ts x0 y0 x1 y1 scale` (after P0 the tool shows
transport), eyeball them against the "after" intent, run
`npx vitest run`, `npx tsc -b`, `npx eslint src tests e2e tools`, and the
full local Playwright suite before merging (fresh server).

- **P0 — Make transport previewable** *(unblocks everything; no visual
  change in game).* Extract geometry+style emission into
  `src/render/routeRibbons.ts` with a renderer-agnostic `poly` sink;
  `MapRenderer.drawRoutes()` and `tools/preview.ts` both consume it (the
  preview gains a software poly rasteriser ≈ 60 lines). Unit test:
  `tests/render/routeRibbons.test.ts` — geometry counts per class,
  identical output for renderer/preview sinks. Verify: §9 crops now show
  ribbons; game pixel-identical (style table unchanged in this phase).
- **P1 — Projected ribbons, hierarchy, casing, zoom bands** *(the core
  fix; biggest visible win).* Tile-space quad-strip tessellation with
  mitred joins; class-ascending casing→fill passes; §4 style table +
  band selection with hysteresis + lazy per-band Graphics in
  `MapRenderer`; kill the verge halo below Z3; fix the edge-line offset
  bug (perpendicular in tile space). Unit tests: band selection thresholds,
  width-floor maths, mitre joins on the lattice L-corners. e2e: existing
  suite green (no selector changes); add a screenshot step at far zoom in
  `e2e/shots.helper.spec.ts` flow if cheap. Verify crops: wide_far must
  show the M25 ring + radials cleanly with streets gone.
- **P2 — Junction nodes, roundabouts, grade separation.** Derived junction
  discs; roundabout const table (Circular × radial meets); motorway
  mini-overpasses. Unit tests: junction derivation on a fixture map
  (counts, no junctions on open-country sweeps). Verify: central +
  m25_heathrow crops — junctions merge, no casing crosses, roundabouts
  read at Z2.
- **P3 — Bridges as structures + piers.** Span detection, decks, piers,
  parapets, shadows; layer split (`boatLayer`/`roadVehicleLayer`/
  `bridgeTopG`); vehicle lift = deck height; Southend pier styling; skip
  Tower Bridge reservation. Unit tests: span detection (Dartford, Thames
  bridges, pier). e2e: vehicles still animate (existing smoke), picking
  unaffected (new layers non-interactive — assert demolish flow e2e still
  green). Verify: estuary_dartford + central crops.
- **P4 — Shoreline smoothing.** `src/render/shoreline.ts` (marching
  squares + Chaikin + band emission, shared with preview via the P0 sink).
  Unit tests: contour closure on fixture masks, Chaikin point counts,
  embankment-style selection. Verify: estuary_southend_far +
  estuary_dartford + central crops — no tile stairs at any band.
- **P5 — Rail identity.** Far-zoom tick symbology; projected near-zoom
  track; station platforms; rail drawn after road passes. Verify: central
  (termini fans) + wide_far (lines read as railways, not streets).
- **P6 — Water life.** Boat wakes; pier/dock polish sprites if time.
  Verify: estuary crops + in-game screenshot (wakes are animated; use
  `SHOTS=1 npx playwright test e2e/shots.helper.spec.ts`).
- **P7 — Air layer.** `AIRPORTS` export (Heathrow only, no tile change, no
  SAVE_VERSION bump), `src/render/airLayer.ts` arcs/planes/shadows.
  Verify: m25_heathrow crop (static shadow check) + animated screenshot.
  *(Optional follow-up PR: City Airport — map-geometry change, bump
  SAVE_VERSION to 10 with justification.)*

Suggested parallelisation: P4 (shoreline) and P5 (rail) are independent of
P2/P3 once P0+P1 land.

## Risks

- **SAVE_VERSION**: core phases (P0–P6) change zero map geometry — the RC
  raster and routes are untouched; no bump. City Airport (optional P7b)
  and ANY route re-lay (e.g. if roundabout geometry is moved into
  `londonMap.ts` waypoints instead of the renderer table) ⇒ bump + justify.
- **Vehicle path-following** must keep working: `RoutePath` sampling is
  unchanged; only the water-lift constant becomes span-derived. Keep the
  existing e2e vehicle smoke as the gate.
- **Mobile GPU fill rate / memory**: band Graphics LRU ≤ 2; no filters; if
  band rebuild jank shows on phone, amortise across frames (§7). Test at
  phone-landscape viewport per the design principles.
- **Z-order regressions** (line picking, demolish, ghosts): all new layers
  are below `assetLayer` and non-interactive; run the demolish/pick e2e
  specs explicitly in P3 review.
- **Tower Bridge / landmark conflicts**: bridge pass must skip landmark
  reservations or we double-draw decks under the bascule sprite.
- **Preview/renderer drift**: P0's shared emission module is the guard —
  never let `tools/preview.ts` grow its own styling again.

---

## 9. Audit preview crops (re-render these after every phase)

Rendered 2026-06-12 from current main via a faithful port of
`drawRoutes()` (preview tool itself can't draw transport until P0 — the
implementer should reproduce via `npx tsx tools/preview.ts x0 y0 x1 y1 sc`
once P0 lands; coordinates below).

| File | Crop / scale | Verdict (before) |
|---|---|---|
| `preview/audit_central.png` | 98 62 146 100 / 4 | Streets read as grey noodles with green-halo mush; Thames is blue Lego; bridges invisible. |
| `preview/audit_central_far.png` | 98 62 146 100 / 12 | Network collapses to 1-px dark threads in building noise — the owner's screenshot reproduced. |
| `preview/audit_m25_heathrow.png` | 38 58 76 96 / 4 | The M25 is a hairline lost in the fields; no hierarchy vs lanes; upper Thames staircase. |
| `preview/audit_estuary_dartford.png` | 156 72 196 112 / 4 | Dartford crossing unreadable as a bridge; pier dots float; brutal water tile stairs. |
| `preview/audit_estuary_southend_far.png` | 198 38 252 92 / 8 | Sawtooth coastline; Southend pier invisible; rail = faint thread. |
| `preview/audit_streets_close.png` | 110 64 128 82 / 2 | Close zoom: rounded noodle joins, no kerbs/junction geometry, ribbons float over ground rather than lying in it. |
| `preview/audit_wide_far.png` | 80 50 180 120 / 16 | Phone-zoom equivalent: roads essentially invisible; no M25 ring, no rail, blobby river. Success = this crop alone telling the whole transport story. |
