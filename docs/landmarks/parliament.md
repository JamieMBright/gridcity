# Landmark visual spec — Palace of Westminster (`lm_parliament`)

A research-backed, element-by-element breakdown used to (a) drive the code
sprite and (b) critique it with ultra-specific, measurable fixes. Format is
reusable for any landmark: **palette → massing/proportions → per-element shape +
colour + proportion → critique checklist**. Sprite code: `parliamentTile()` in
`src/render/sprites/landmarkSprites.ts`. Reference: the river (east) elevation.

## One-line silhouette
A long, LOW honey-stone Perpendicular-Gothic river palace with a spiky
pinnacled skyline, floodlit at the base, with three great towers far above it:
the massive square **Victoria Tower** (SW), the slender **Elizabeth Tower / Big
Ben** (NE), and a needle **Central spire** between.

## Palette (hex)
| Role | Hex | Notes |
|---|---|---|
| Sunlit honey stone (Anston/Clipsham limestone) | `#e3cf9d` | east/right faces |
| Shaded stone | `#b9a878` | SW/left faces |
| Floodlit stone (dusk base glow) | `#ecd6a0` | warmer near the ground |
| Cast-iron roofs | `#3d444b` | dark blue-grey, NOT green |
| Iron cresting / spire frame / flagstaff | `#3b4750` | |
| Clock dial (opal glass) | `#f2ead4` | off-white |
| Clock surround — **Prussian blue** | `#1f3a5f` | the 2017–22 restored colour; deep, not mid-blue |
| Gilt (gold leaf — rings, numerals, finials) | `#c8a24a` | |
| Floodlit window glow (ground arcade) | `#ffce86` | |

## Massing & proportions (the ratios that must read)
Reference unit = main river-front **parapet height** (`H ≈ 26 m`).
- River frontage **length ≈ 9–10 × H** (very long, very low).
- **Victoria Tower:** height **≈ 3.8 × H** (98.5 m, the TALLEST); width **≈
  0.9 × H** (22.9 m square — bulky).
- **Elizabeth Tower (Big Ben):** height **≈ 3.7 × H** (96 m, marginally shorter
  than Victoria); width **≈ 0.46 × H** (12 m square — about HALF Victoria's
  width → distinctly slender). **Clock dial centre at ≈ 0.57 of tower height**
  (dials ~55 m up a 96 m tower) — i.e. a long plain shaft, clock in the upper
  third, belfry + spire above.
- **Central spire:** height **≈ 3.5 × H** (91.4 m), the slenderest — a needle.
- Tower : façade ratio overall ≈ **4 : 1** (towers dominate; façade is a low band).

## Per-element spec
### River façade (the show frontage)
- **Shape:** long unbroken range, 4 fenestrated storeys over a tall ground
  arcade; flat roof hidden behind a pinnacled parapet.
- **Windows:** dense regular **pointed lancets** in storey bands between slim
  buttress ribs; ground-floor arcade **floodlit gold** (`#ffce86`).
- **Roofline:** flat parapet with a CONTINUOUS run of stone pinnacles, taller
  pinnacles on a ~4-bay rhythm, pointed gablet dormers; dark cast-iron ridge
  cresting behind. Spiky, never plain.
- **Colour:** honey stone, floodlit warmer at the base; dark iron roof.

### Victoria Tower (SW end — the heavy one)
- **Shape:** big SQUARE tower, ~0.9 H wide; three tall lancet bays per face
  divided by buttresses rising into **four octagonal corner turrets** with tall
  crocketed spirelets; pierced/merlon crown; tall thin **iron flagstaff** with
  the flag at the very top. Tallest stonework of the three.
- **Colour:** honey stone; iron crown + flagstaff.

### Elizabeth Tower / Big Ben (NE end — the slender one)
- **Shape:** slender square shaft (~half Victoria's width), plain stone for the
  lower ~57%, then the **clock stage** (slightly proud, four faces — two visible
  in 3/4 view), then a louvred **belfry**, then a steep ornate **framed spire**
  with crockets and a **gilt finial**. Marginally shorter than Victoria.
- **Clock face:** circular **opal off-white** dial, **deep Prussian-blue** square
  spandrel surround, **gold** ring + numerals, black hands (long minute, short
  hour). Dial diameter reads BIG relative to the slim shaft.

### Central spire (middle)
- **Shape:** slim octagonal lantern that tapers to a sharp **needle**; small
  lucarne windows; gilt finial. Reads as the most delicate vertical.

## Critique checklist (verify each on every render)
1. Is the tower:façade ratio ~4:1 (façade reads LOW, towers dominate)?
2. Is Victoria visibly **wider** (~2×) AND marginally **taller** than Big Ben?
3. Is Big Ben's clock at ~**0.57 height** (not jammed near the top)?
4. Is the clock surround **deep Prussian blue**, dial off-white, ring/numerals gold?
5. Is the central spire the slenderest, a true needle?
6. Floodlit gold ground arcade present; roofs dark iron (not green)?
7. Skyline spiky (dense pinnacles + gablets + corner spirelets)?

## Sources
[UK Parliament — the stonework](https://www.parliament.uk/about/living-heritage/building/palace/architecture/palacestructure/the-stonework/) ·
[UK Parliament — Big Ben dials turned blue](https://www.parliament.uk/about/living-heritage/building/palace/big-ben/elizabeth-tower-and-big-ben-conservation-works-2017-/turning-big-bens-clock-dials-blue/) ·
[UK Parliament — Great Clock facts](https://www.parliament.uk/about/living-heritage/building/palace/big-ben/facts-figures/great-clock-facts/)
