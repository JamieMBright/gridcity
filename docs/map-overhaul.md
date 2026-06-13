# Map Overhaul — River-first re-lay, high-street frontage, landmark gleam, legible labels

Owner brief (2026-06-13, two reference images): roads eat too much real
estate and zig-zag; London is a high-street city so buildings must sit
UP AGAINST the carriageway; map the major roads like real London and
overlay them on the river; improve the Thames shape; the city reads too
sparse (London is denser); landmarks don't pop (add a "special gleam",
many are missing); zoomed-out town labels are too small to read on
mobile. Build in the real planner's order: **river → major roads →
minor roads → towns/buildings → landmarks → labels.**

This is a DESIGN plan. No code was edited in this lane. Every phase below
names the real files, the constants/functions to change, the
SAVE_VERSION implication, the preview crops to render before/after, and
verify steps. Skills cited inline: **EnvArt** = environment-art,
**UI** = game-ui-design, **Color** = color-theory.

---

## Top-5 diagnoses from the two images + rendered crops

Crops rendered for this audit (under `preview/`):
- `wholemap.png` (0,0–256,160 @8, band Z1) — the far/label band.
- `central.png` (96,60–150,110 @2, band Z3) — the road-moat band.
- `cityloop.png` (106,70–140,100 @1, band Z4) — City + Isle of Dogs close.
- `roadband.png` (100,64–170,110 @4, band Z2) — the screenshot's band.

1. **Road moats eat the fabric (the #1 complaint).** `cityloop.png`
   shows the street lattice as wide grey bands with an empty grey gutter
   on BOTH sides before any building. Root cause is two-fold: (a) the
   local-street generator in `londonMap.ts` lays a carriageway on a rigid
   grid (`for y … += 4`, `for x … += 5`) and stamps `RC.street`, which
   `tileChooser.structureSpriteFor` treats as "no structure" — so the
   centre tile AND its frontage read as void; (b) `routeRibbons.ROAD`
   street `fillFloor` keeps a 1.0–1.5 screen-px floor but the casing plus
   the cleared tile widens the visual corridor to ~1 whole tile. Net: a
   4×3 block surrounded by grey on all four sides. London streets are
   ~8–12 m kerb-to-kerb with the building wall ON the back of the
   pavement — frontage, not setback. **EnvArt "Ignoring Negative Space" /
   "Uniform Detail Distribution":** the grey grid is uniform negative
   space competing with the fabric, so nothing reads.

2. **The grid zig-zags / reads as a lattice, not London.** The radial
   "organic" intent is undone by `latticeThroughTowns()` snapping every
   in-town leg to integer corners with L-staircases, then overlaid on the
   even 4×5 street grid. `roadband.png` shows the arterials staircasing.
   Real London is a *spider's web*: radials converging on the centre,
   crossed by partial ring roads (the two Circulars + M25), with the
   medieval/organic street pattern only locally rectilinear. The current
   output is a chequerboard with diagonal arterials laid over it.

3. **The city is a small dense blob in a sea of farmland — reads
   sparse.** `wholemap.png`: the urban core is a ~50-tile-wide patch; the
   density field `RMAX=46` with thresholds 0.62/0.46/0.30 puts `urbanCore`
   only within ~22 tiles of Charing Cross and lets noise punch holes in
   it. London's continuous built-up area is ~40 km across — it should fill
   far more of the inner map, wall-to-wall, before the green belt. The
   `noiseAt` amplitude (±0.13) also speckles the core with gaps.
   **EnvArt squint test:** squinting `wholemap.png`, the focal mass is
   too small and too soft-edged to be "London".

4. **Landmarks don't pop — no hierarchy, no gleam.** `cityloop.png`: the
   Shard, Gherkin, St Paul's, the towers all sit at the same value as the
   pink residential towers around them. There is NO specular/bloom
   treatment distinguishing a hero landmark from fill. **EnvArt
   "Hero/Unique/Modular/Dressing":** heroes should own 90–100% contrast
   (the squint test) and 80% of the detail budget; right now they're
   ~40% contrast fill. **Color:** the dusk grade flattens everything to
   the same value — heroes need a warm specular accent (the complement of
   the navy shadow) to separate from the field.

5. **Town labels are illegible (the owner's mobile complaint, confirmed
   in math).** `MapRenderer.buildLabels` bakes `fontSize: 64` then
   `animate()` scales by `base * inv * 0.25` where `base = px/64` and the
   layer rides the world scale `sc`. Net on-screen size collapses to
   `px * 0.25`: a **town at px=15 renders at ~3.75 screen px**, a village
   at ~2.6 px, named places at ~2.25 px. That is below any legible floor
   on any display, catastrophic on a phone-landscape DPR-3 panel. **UI
   "Resolution-Dependent Sizing" + size thresholds:** body text floor is
   ~14 px @1080p; map labels here are 4× under that.

Secondary diagnoses folded into the phases below: the Isle of Dogs loop
reads but the estuary mouth is abrupt (river phase); missing landmarks
(Wembley arch, Crystal Palace mast, the Gherkin has no id, Alexandra
Palace, Excel, the O2 dome, Kew, Crystal Palace, Wimbledon, etc.); high
streets exist as a `FLAG_SHOPS` tint but don't form continuous ribbons.

---

## Recommended river-first build order (5 sentences)

1. Re-cut the **Thames** first as the map's master spline — tighten the
   Isle of Dogs loop, add the Woolwich/Thamesmead reach, and fan the
   estuary smoothly from the Dartford narrows out past Southend — because
   every bank-anchored road, bridge and riverside landmark samples
   `riverCenterY`/`riverHalfWidth`, so the river must be final before
   anything downstream is authored.
2. Author the **major roads** as a real-London spider's web overlaid on
   that river: the M25 orbital, the radial motorways/A-roads converging
   on Charing Cross, the two Circular partial rings, each anchored to its
   true town and its true bridge crossing, replacing the current
   chequerboard-plus-diagonals.
3. Hang the **minor streets** off those majors with a *frontage* model —
   narrow the carriageway constants and stop clearing the building on
   street tiles so terraces sit wall-to-wall against the kerb (the
   high-street fix), with continuous shop ribbons along the arterials.
4. Re-seed **towns and buildings denser** — widen the urban-core radius,
   raise the density thresholds' coverage, kill the hole-punching noise
   in the core, and bias `tileChooser` to wall-to-wall terraces/blocks so
   the inner map fills like real London before the green belt.
5. Finally add **landmark gleam** (a warm specular highlight + soft bloom
   that rides the existing glow layer) to the missing-and-existing hero
   set, and fix the **labels** to a screen-px floor with a halo and
   collision declutter so towns are legible on a phone held landscape.

---

## Phase 1 — RIVER FIRST

**Files:** `src/data/londonMap.ts` (`RIVER_PTS`, `riverHalfWidth`,
`TRIBUTARIES`, the estuary creek loop near line 345).

**Why it drives everything:** `riverCenterY()`/`riverHalfWidth()` are
sampled by the embankment arterials (`bank()`), every bridge approach,
the radial south-bank anchors, the riverside landmarks (Parliament, Eye,
Shard, Tower Bridge, Battersea), the shoreline renderer and the marsh
test in `tileChooser`. Change the river and you must re-verify all of
them — so it must be locked first.

**Audit vs the real reference (`IMG_2585`):**
- The current spline is already good west→City (Staines/Walton meanders,
  Richmond swing, Westminster bend). Keep those.
- **Isle of Dogs loop** (pts ~[130,92]…[142,84]) is too shallow — the
  real loop drops deep south around Greenwich then pokes the peninsula
  back north. Deepen the loop bottom to ~y=99 at x=134–136 and sharpen
  the peninsula tip back to ~y=84.
- **Woolwich/Thamesmead reach** (x=146–164) is too straight; add the
  gentle S through Woolwich Reach and Gallions Reach so it's not a ruler.
- **Estuary fan** (`riverHalfWidth` x≥180): the `2 + 14.5·t²` curve fans
  correctly but `riverCenterY` past x=204 climbs too steeply to y=76 —
  on the reference the estuary stays broad and the *south* (Kent) shore
  drops away while the Essex shore holds. Bias the centreline lower
  (y≈80→78) and widen the half-width ceiling so Southend (x=236) sits on
  a genuinely wide mouth, Sheppey/Kent implied on the far bank.

**Method (recommended):** keep the hand-authored control-point approach
(it's deterministic and readable) — do NOT switch to a procedural river.
Adjust these specific control points:
```
// deeper Isle of Dogs loop + peninsula
[130, 93], [133, 98], [136, 99], [139, 90], [142, 84],
// straighter-but-not-ruler Woolwich/Gallions
[148, 87], [154, 90], [160, 94], [166, 98],
// estuary: hold the centreline, fan wider
[182, 99], [194, 98], [206, 96], [220, 92], [236, 88], [255, 86],
```
and raise the estuary half-width ceiling from `2 + 14.5·t²` to
`2 + 18·t²` so the mouth past Tilbury reads as open water.

**SAVE_VERSION:** **BUMP required.** River tiles are `terrain` =
geometry; old saves' network assets reference tile indices whose
land/water classification changes. Bump `SAVE_VERSION` in
`src/sim/state.ts` (currently 9 → 10) and justify in the changelog: "map
geometry: Thames re-cut (Isle of Dogs loop, estuary fan)."

**Preview crops:** before/after `cityloop.png` (loop), and a new
`estuary.png` = `npx tsx tools/preview.ts 180 60 256 120 4 estuary`.
**Verify:** Parliament/Eye/Shard/Battersea/Tower Bridge still anchor on
their banks (they sample the new spline); run `npx vitest run` map
fixtures; shoreline renders without gaps.

---

## Phase 2 — MAJOR ROADS, mapped like real London, overlaid on the river

**Files:** `src/data/londonMap.ts` — the `addRoute('motorway', …)` M25
block, the `RADIALS` array, the North/South Circular `addRoad('arterial',
…)`, and the `RAILS` array. Plus `routeRibbons.ROAD` widths (Phase 3).

**Doctrine change:** stop running arterials through `latticeThroughTowns`
(which produces the staircase). Through built fabric, arterials should
follow a **gently curved real alignment**, not snap to tile corners — the
ribbon renderer already rounds corners, so the lattice snap is redundant
AND it's what makes the zig-zag. Reserve lattice-snapping for *local
streets only* (Phase 3). Author the majors as smooth polylines anchored
to towns + bridges.

**The spider's-web inventory to author** (centre = Charing Cross
[118,80]; bearings true to `IMG_2585`):

| Route | Class | Tile-space strategy / anchors |
|---|---|---|
| **M25 orbital** | motorway | KEEP the existing hand-laid ring (it's correct: west of Heathrow, crosses at the Dartford narrows). Just re-verify it tracks the new river at the Staines (x≈52,y≈102) and Dartford (x≈170,y≈96) crossings. |
| **M1 / A1(M) north** | motorway+radial | Up from [114,46] through South Mimms (M25 jct ~[100,30]) to the N edge ~[92,0]. The A1 radial exists; promote its inner trunk. |
| **M11 (NE → Harlow/Stansted)** | motorway | New: [128,72]→[140,58]→[150,42]→[158,28]→[160,8], crossing the M25 at the Epping corner [146,36]. |
| **A12 / A13 (E → Essex coast)** | arterial | Two distinct radials already present ([128,76]… and [130,78]…). Keep; smooth (don't lattice). A12 to Chelmsford/Colchester, A13 hugging the estuary to Southend. |
| **M20 / M2 (SE → Kent)** | motorway | New M2: south-bank radial from the A2 trunk [122,bank]→[150,108]→[180,118]→[210,128] toward the Kent coast (off-map SE). M20 splits at Swanley [160,110]→[190,128]. |
| **M23 (S → Gatwick/Crawley)** | motorway | New: from Croydon's south [118,116]→[112,132]→[108,150] toward Crawley off-map S, paralleling the A23. |
| **A3 (SW → Guildford)** | arterial | Exists ([112,bank]…[44,152]). Keep, smooth. |
| **M3 (SW)** | motorway | Exists (south of Heathrow, [100,101]→[0,126]). Keep. |
| **M4 (W → Slough/Reading)** | motorway | Exists ([100,78]→[0,62]). Keep. |
| **M40 (WNW)** | arterial→motorway | Exists as A40 radial; add a motorway trunk [110,76]→[60,52]→[22,36] to the M25 jct, distinct from the A40 surface road. |
| **A41 (NW → Watford)** | arterial | Exists. Keep. |
| **A10 (N → Ware), A2 (SE), A21 (S → Sevenoaks)** | arterial | Exist. Keep, smooth. |
| **North Circular (N ring)** | arterial | Re-author as a true partial ring from Chiswick [94,84] N through [104,62]→[124,60]→[142,74] to the Blackwall crossing — KEEP it as a smooth arc, not lattice. |
| **South Circular (S ring)** | arterial | The scrappier southern half [142,74]→[140,97]→[118,103]→[94,87], crossing at Kew [96]. |

**Key principle (EnvArt leading lines):** the radials ARE the leading
lines that carry the eye to the focal centre. They must converge cleanly,
not staircase. The density field already boosts housing along the radials
(`boost` raster) — keep that, it's what gives London its real ribboned
sprawl along the A-roads.

**SAVE_VERSION:** roads stamp the `road` raster (geometry) → covered by
the Phase-1 bump; no separate bump needed if shipped in the same wave.

**Preview crops:** `wholemap.png` (web reads as a spider, not a grid),
new `radials.png` = `npx tsx tools/preview.ts 80 40 170 120 4 radials`.
**Verify:** M25 still rings cleanly at far zoom (band Z0/Z1 shows
motorway+arterial only); no arterial crosses the Thames except at a
bridge tile; `transportGeometry` junction/roundabout derivation still
finds the radial meets.

---

## Phase 3 — SMALLER roads + the HIGH-STREET FRONTAGE FIX (the core ask)

**Files:** `src/render/routeRibbons.ts` (the `ROAD` width table),
`src/data/londonMap.ts` (local-street generator ~line 886, the `RC`
stamping ~line 933, and the high-street `FLAG_SHOPS` pass ~line 1002),
`src/sim/map/types.ts` (`RC` semantics), `src/render/tileChooser.ts`
(`structureSpriteFor` street handling ~line 187).

### 3a. Narrow the carriageways

Current `ROAD` half-widths (tile units) + screen-px floors:
```
lane     half 0.035  fillFloor [0,0,1,1,1]
street   half 0.05   fillFloor [0,1.5,1.2,1,1]
arterial half 0.09   fillFloor [2.5,3,2,1.5,1.5]
motorway half 0.15   fillFloor [4,5,3,2,2]
```
The *natural* half-widths are already slim; the visual fatness comes from
(a) the **casing** (`casingExtra` + the cleared tile) and (b) the
**street fillFloor at Z3/Z4 still being 1.0–1.2 screen-px PLUS a whole
cleared tile under it**. Recommended:
- **street:** `half 0.05 → 0.04`, `fillFloor [0,1.5,1.2,1,1] → [0,1.2,0.8,0.55,0.5]`.
  A residential street should be a thin seam between terrace backs, not a
  band. **EnvArt scale ref:** 8–10 m carriageway at ~256 px/tile-of-~40 m
  ≈ 0.2 tile *including* pavements — but the building must sit ON the
  pavement, so the *clear* width is ~0.1 tile, half ≈ 0.05 max.
- **lane:** keep `half 0.035`; lanes are correctly hairline.
- **arterial:** `half 0.09 → 0.075`, floors `[2.5,3,2,1.5,1.5] →
  [2.2,2.6,1.6,1.1,1.0]`. High streets are wider than a back street but
  still have shops hard against them.
- **motorway:** keep `half 0.15` (motorways genuinely are wide and should
  stay the signature far-zoom element) but drop the Z3/Z4 floor
  `[4,5,3,2,2] → [4,5,2.4,1.6,1.6]` so it isn't cartoonishly fat up close.

### 3b. The FRONTAGE rule — buildings against the kerb (the heart of it)

Today `RC.street` means "carriageway runs through the tile centre: no
structure" (`structureSpriteFor` returns `undefined` for `rc === RC.street`).
That single rule is the road-moat: the street owns a full tile and the
building is pushed to the *next* tile, leaving a grey gutter.

**Change the model so streets sit on tile EDGES, not tile centres, and
the frontage tiles keep their building.** Two viable implementations,
recommended in order:

- **Preferred — edge-routed local streets.** Re-lay the local-street grid
  so carriageways run along tile *boundaries* (offset the polyline by 0.5
  in tile space: `[[runStart+0.5, y+0.5] … ]`), and STOP stamping
  `RC.street` on the centre tiles — stamp only `RC.streetTouch` on the two
  flanking rows so `structureSpriteFor` keeps their buildings
  (`streetTouch` already means "houses keep fronting it"). The ribbon
  renders in the gap between buildings; the terraces are wall-to-wall.
  Block size tightens from 4×3 to a continuous wall broken only by the
  thin seam. This is the London-high-street wall.
- **Fallback — frontage sprites.** If edge-routing destabilises the
  junction derivation, keep centre-routed streets but add a *frontage*
  sprite tier: on `RC.street` tiles in `urban`/`urbanCore`, render a
  half-depth terrace-front sprite flush to the carriageway instead of
  clearing the tile. More art, same visual result.

**Continuous high-street ribbons:** the current `FLAG_SHOPS` pass only
tags `urban`/`suburb` tiles orthogonally adjacent to an arterial. Extend
it to tag a *continuous 1-tile ribbon* along BOTH sides of every arterial
and the inner radials through inhabited fabric, and have `tileChooser`
return `vicshop_*` for the whole ribbon — so the A-roads read as the
shopping high streets they are (EnvArt environmental storytelling: "this
is a high street" told by an unbroken parade, not scattered shops).

**SAVE_VERSION:** `road` raster semantics change (street→streetTouch on
many tiles) = geometry → same Phase-1 bump.

**Preview crops:** before/after `cityloop.png` and `central.png` — the
grey gutters must close to a thin seam with building walls touching.
New `highstreet.png` = `npx tsx tools/preview.ts 108 74 130 92 1 highstreet`.
**Verify:** squint test on `cityloop.png` — the fabric reads as solid
blocks cut by thin streets, not a grey grid; no building renders ON a
carriageway; pylon/cable routing rules (which read `RC`) still avoid
arterials.

---

## Phase 4 — THEN seed towns + buildings, DENSER

**Files:** `src/data/londonMap.ts` (density field ~line 451: `RMAX`,
thresholds, `noiseAt`; `zoneBlob` CBD/posh; `townBlob`), `tileChooser.ts`
(variety mix).

**Why it reads sparse (diagnosis):**
- `RMAX=46` + threshold `urbanCore ≥0.62` ⇒ core only within ~22 tiles of
  centre; `urban ≥0.46` within ~34; everything past ~46 tiles is suburb
  or nothing. London's continuous build is bigger than that on this map.
- `noiseAt` amplitude ±0.13 punches holes THROUGH the core (you can see
  green speckle inside the city in `roadband.png`).
- The south-of-river `-0.04` and the per-field tint don't hurt, keep.

**Recommended density changes (EnvArt density/hierarchy + squint test —
the focal mass must dominate the inner map):**
- Widen the falloff: `RMAX 46 → 60`, so the gradient reaches the green
  belt before dying.
- Raise core coverage: thresholds `0.62/0.46/0.30 → 0.58/0.42/0.26`, and
  lift the base from `1.09` to `1.16` so the inner ~30 tiles are solid
  `urbanCore`.
- Halve the hole-punching in the core: scale `noiseAt` by a centre-weighted
  factor — `v += noiseAt(x,y) * clamp(d/40, 0.25, 1)` — so the dense core
  stays wall-to-wall and only the *edges* get the organic speckle that
  makes the green-belt boundary ragged (EnvArt: detail at the transition,
  calm in the mass).
- `tileChooser` urban mix: bias toward terraces/council blocks (already
  good) but raise `urbanCore` tower frequency near the CBDs and ensure the
  `vicshop`/`terrace` wall is unbroken — no `trees` punch-through in
  `urban` (keep leafy trees only in `suburb`/`posh`, as now).

**Density target (EnvArt 60-30-10 of value):** inner ~30 tiles solid
core (the 60% mass), a graded urban/suburb ring (the 30%), green belt +
satellite towns as the 10% accent — so the squint test lands the eye on
central London, then follows the radial ribbons out to the named towns.

**SAVE_VERSION:** zone field changes = geometry → same Phase-1 bump.

**Preview crops:** `wholemap.png` (the focal mass should now fill the
inner third densely), `roadband.png`. **Verify:** demand totals in
`src/sim/map/demand.ts` re-baseline (more customers); e2e asset-count
baselines update (denser fabric); `seedScenario` iDNO/gen counts
unaffected.

---

## Phase 5 — LANDMARKS: gleam + completeness

**Files:** `src/sim/map/types.ts` (`LANDMARK` enum — add ids),
`src/data/londonMap.ts` (`NAMED_PLACES`, the landmark placement block
~line 1018, `LANDMARK_CUSTOMERS`), `src/render/sprites/landmarkSprites.ts`
(sprite fns + a new gleam helper), `src/render/tileChooser.ts`
(`LANDMARK_SPRITE` map), `src/render/MapRenderer.ts` (the bloom/glow
layer — coordinate the gleam here).

### 5a. Missing landmarks (owner: "many are missing")

Present today: parliament, eye, dome (St Paul's), spire (Shard), fortress
(Tower), towerBridge, stadium (Olympic), arena, mall, zoo, powerstation
(Battersea), gherkin (CBD-anchored, no id), plus civic kit (station,
school, townhall, watertower, sewage, carpark, church, datacentre,
airport).

**Propose adding (true positions, tile-space):**
| Landmark | id | Position | Note |
|---|---|---|---|
| Wembley arch | `wembley` | ~[88,60] | NW, the arch is a hero silhouette |
| The O2 / Dome | `o2dome` | ~[140,90] | Greenwich peninsula tip (inside the loop) |
| Crystal Palace mast | `palacemast` | ~[118,118] | S ridge above Croydon |
| Alexandra Palace | `allypally` | ~[114,52] | N hill, transmitter |
| Excel / Royal Docks | `excel` | ~[150,86] | E, by the (future) City airport |
| Kew / glasshouse | `kewhouse` | ~[86,96] | the Palm House by the river bend |
| Wimbledon (greens) | reuse `arena`/park | ~[96,108] | optional |
| Gherkin | give it `gherkin` id | [118,77] | currently tile-anchored only; a real id survives map shifts |
| BT Tower | `bttower` | ~[112,72] | a thin hero spike in the West End |
| Shard already = spire | — | — | keep |

Cap additions to ~6–8 true heroes (EnvArt: heroes are 5% — don't dilute).
Give each a `LANDMARK_CUSTOMERS` entry and a sprite fn following the
existing ink-contour style. Wembley arch and BT Tower especially earn
their place as **silhouette** heroes (read from 50 m / far zoom).

### 5b. The "special gleam" (Color + EnvArt hero contrast)

The dusk grade flattens heroes to fill value. Add a **warm specular
gleam** that rides the EXISTING additive glow layer (`MapRenderer`'s
`bloomG`/`glowWorld`) so it does NOT fight the beauty pass:

- **Specular hit:** in each hero sprite fn, paint a small high-value warm
  highlight (sunset gold `~#ffe6b0`, the complement of the navy shadow
  `#10162f` — **Color complementary harmony** = maximum pop) on the
  sun-facing edge/roofline. This is baked into the sprite, costs nothing
  at render.
- **Soft bloom halo:** register hero landmark tiles into the bloom layer
  with a small radial warm glow (alpha ~0.25, radius ~1.2 tile) that
  pulses *very* gently with the day/night `glow` value already animated in
  `stepAtmosphere`. At night the heroes literally glow (matches the CLAUDE
  doctrine "powering an area makes it glow"); by day it's a faint
  golden-hour glint. **Color dark-mode rule:** in the dark grade, the
  hero accent goes *lighter* (approaching the light source), not more
  saturated — keep chroma modest so it reads as light, not neon.
- **Glint animation (optional, cheap):** a 1-px traveling specular
  highlight across glass heroes (Shard, Gherkin, O2) every few seconds,
  driven by the existing `bobPhase` — a "gleam" the owner can literally
  see catch the light. **UI "motion guides attention":** keep it subtle
  so it draws the eye without distracting.

**Hierarchy enforcement (EnvArt squint test):** heroes get the bloom +
specular (90–100% contrast); civic kit (station/school/townhall) get a
*tiny* warm rim only (50–70%); residential fabric gets none. Verify by
squinting `cityloop.png` — your eye must land on the Shard/St Paul's/
Gherkin cluster first.

**SAVE_VERSION:** new `LANDMARK` ids stamped into the `landmark` raster =
geometry → same Phase-1 bump (the enum values must stay append-only so
existing ids don't shift).

**Preview crops:** `cityloop.png` (hero pop), `SEASON`/night variants if
the preview tool supports a glow flag; a new `heroes.png` =
`npx tsx tools/preview.ts 108 74 130 92 1 heroes`. **Verify:** atlas stays
≤4096 on each axis after new hero sprites (shelf packer guard); squint
test passes; no gleam on non-hero tiles.

---

## Phase 6 — TOWN LABELS legibility

**Files:** `src/render/MapRenderer.ts` (`buildLabels` ~line 486, the label
scaling in `animate` ~line 1411).

**The bug (math):** final on-screen px = `px * 0.25` because `base =
px/64`, scale = `base*inv*0.25`, layer rides world scale `sc`, and the
`64` baked size cancels. Town labels land at ~3.75 px. Illegible.

**Fix (UI readable-at-size + Resolution-Dependent Sizing):**
- **Screen-px floors:** target on-screen sizes — `LONDON` 30 px, towns
  20 px, villages 14 px, named places 13 px. Drop the stray `*0.25`; set
  scale so the rendered height equals the target screen px regardless of
  zoom (`l.t.scale.set(targetPx / 64 * inv)` with the layer NOT
  double-scaled, or divide out `sc`). Re-verify the cancellation so the
  number you ask for is the number you get.
- **Weight + halo:** keep `fontWeight 700`; the stroke is `0x10162f`
  width 8 baked at 64 px = ~2.5 px halo on screen — good (UI "text
  outlines for readability"). Bump to width 10 for the navy halo so the
  cream text survives over both the pale core and the green fields
  (**Color simultaneous-contrast:** the same cream reads differently over
  pavement vs grass — the halo neutralises it).
- **Contrast:** towns cream `#f4f1ea` on the navy halo = AAA; named
  places gold `#ffd277` — keep, it codes "transport" distinct from town
  names (Color semantic + not-color-alone since they're also smaller).
- **Collision / declutter (UI):** at far zoom many town labels overlap.
  Add a simple priority declutter: sort labels by importance
  (LONDON > big towns by `r` > villages > named places); when two label
  boxes overlap at the current scale, hide the lower-priority one. Fade
  villages out entirely one zoom band before towns (progressive
  disclosure) so the far view shows only LONDON + major towns — the
  reference map itself only labels the big towns at country scale.
- **Mobile check:** at phone-landscape (~800×360 CSS px, DPR 3) a 20 px
  town label is ~20 logical px ≈ comfortably legible; verify with the
  shots helper at a phone viewport.

**SAVE_VERSION:** none — labels are pure render, not serialized.

**Preview/verify:** `SHOTS=1 npx playwright test e2e/shots.helper.spec.ts`
at desktop AND a phone-landscape viewport; eyeball that `WATFORD`,
`CROYDON`, `SOUTHEND` are readable zoomed out and that villages declutter
before towns. (The Node preview tool doesn't draw labels — labels MUST be
verified via Playwright screenshots, not `preview.ts`.)

---

## Findings — rendered crops + verdicts

| Crop | Cmd | Verdict |
|---|---|---|
| `preview/wholemap.png` | `… 0 0 256 160 8 wholemap` | Urban mass too small/soft in a sea of farmland — confirms Phase-4 sparse diagnosis; web reads as grid not spider (Phase 2). |
| `preview/central.png` | `… 96 60 150 110 2 central` | Wide grey carriageways with building setback gutters on both sides — the road-moat (Phase 3) in the clearest form. |
| `preview/cityloop.png` | `… 106 70 140 100 1 cityloop` | Street lattice = grey grid with empty frontage; CBD towers/landmarks DON'T pop (no gleam) — Phases 3 + 5. Isle of Dogs loop reads but shallow (Phase 1). |
| `preview/roadband.png` | `… 100 64 170 110 4 roadband` | Mid-zoom: streets dominate, green speckle holes inside the core, arterials staircase — Phases 2,3,4. |

(Labels could not be previewed in `preview.ts` — it renders no label
layer; Phase 6 is verified via Playwright shots, noted above.)

---

## Ordered phase plan for the implementer (Wave 8 flagship lane)

Execute strictly in this order; each phase gates the next and they SHARE
one SAVE_VERSION bump (9 → 10) since all touch map geometry — do the bump
once in Phase 1 and justify it as "map geometry overhaul (river/roads/
density/landmarks)".

1. **River** (`londonMap.ts` `RIVER_PTS`/`riverHalfWidth`): deepen Isle
   of Dogs loop, smooth Woolwich reach, fan the estuary. Bump
   `SAVE_VERSION` to 10. Render `cityloop.png`+`estuary.png`; verify
   riverside landmarks + shoreline. **Gate: river final.**
2. **Major roads** (`londonMap.ts` M25/`RADIALS`/Circulars/`RAILS`):
   author the spider's web; stop lattice-snapping arterials. Render
   `wholemap.png`+`radials.png`; verify M25 far-zoom ring + bridge-only
   crossings. **Gate: web reads, no staircase.**
3. **Minor roads + frontage** (`routeRibbons.ROAD` widths;
   `londonMap.ts` local-street edge-routing + `RC` stamping + high-street
   ribbon; `types.ts` `RC`; `tileChooser` street handling): narrow
   carriageways, edge-route streets so terraces front the kerb, continuous
   shop ribbons. Render `cityloop.png`+`central.png`+`highstreet.png`;
   squint test for solid blocks. **Gate: no road moats.**
4. **Density** (`londonMap.ts` density field + `townBlob`; `tileChooser`
   mix): `RMAX 46→60`, thresholds down, centre-weight the noise, wall-to-
   wall fabric. Render `wholemap.png`+`roadband.png`; re-baseline demand +
   e2e asset counts. **Gate: focal mass dominates inner map.**
5. **Landmarks + gleam** (`types.ts` enum append; `londonMap.ts`
   placement + `NAMED_PLACES`; `landmarkSprites.ts` specular + new heroes;
   `tileChooser` `LANDMARK_SPRITE`; `MapRenderer` bloom coordination): add
   ~6–8 heroes, warm specular + soft bloom on the glow layer, gentle
   glint. Render `cityloop.png`+`heroes.png`; squint test lands on heroes;
   atlas ≤4096. **Gate: heroes pop, hierarchy holds.**
6. **Labels** (`MapRenderer` `buildLabels` + `animate` scaling): kill the
   `*0.25`, set screen-px floors (towns 20, villages 14, LONDON 30),
   fatten the halo, add priority collision declutter, fade villages first.
   No SAVE_VERSION change. Verify via Playwright shots at desktop AND
   phone-landscape. **Gate: towns legible on mobile.**

Run the full local suite (`npx vitest run`, `npx playwright test`,
`npx tsc -b`, `npx eslint …`, `npm run build`) before the PR; CI runs
unit tests only, so the local e2e is the real gate. Auto-merge once green
per standing policy.
