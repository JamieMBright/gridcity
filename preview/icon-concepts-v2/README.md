# ElectriCity — iPhone home-screen icon concepts (v2)

Fresh pass after the owner rejected all four v1 concepts (Skyline+Bolt, Lit
Pylon, Grid Node, Energised E). None of those are reproduced here. This pass
follows the owner's two explicit directions and was built **with the design
skills** (color-theory, game-ui-design, frontend-design, canvas-design).

## The movement: "Live Current"

A cosy golden-hour dusk, a deep-navy field, and the single most characteristic
thing in this game's world: **electricity actually flowing** — a conductor that
glows because current is in it, light leaping off it, an area lighting up
because it just got powered. The icon is not a logo of the *idea* of power; it
is a held instant of power *happening*. Warm-dominant, hot-white at the core,
navy everywhere else. One bold gesture, everything around it quiet.

## Palette (from `src/ui/theme.ts`, exact)

| token | hex | role in the icon |
|---|---|---|
| navy | `#101630` | the dominant field (~60%) |
| navyLight | `#1d2547` | top-of-field lift (depth) |
| night | `#0a0e22` | deep cosy shadow / vignette |
| dusk | `#3a2b50` | the low golden-hour pool |
| sunset | `#e0697a` | a whisper of dusty pink at the base |
| orange | `#ff8a1e` | the conductor / accent (~10%) |
| orangeSoft | `#ffb066` | glow + spark bloom |
| gold | `#f5c469` | warm window-light cue |
| + heroLights | `#fff3d6` `#ffce82` `#ffb45e` | the hot fairy-light cores |

## The two directions

### Direction 1 — "Energy-flow screen grab" (`flow-*`)
A literal gorgeous slice of the game lighting up at dusk, captured from the REAL
renderer (PixiJS) via `e2e/iconframes.helper.spec.ts`: a real network is built,
the centre energises, the renderer atmosphere is pinned to deep dusk, all HUD is
hidden (photo mode), and tight square frames are grabbed around glowing focal
points (the London Eye's colour-cycling rim, the Shard's beacon, the lit City
cluster against the navy Thames). `tools/icon/flow.ts` crops to the strongest
focal point, applies a small icon tone-curve (deepen navy shadows, warm the
highlights → stronger figure-ground), adds a hot focal core so the eye lands at
60px, and an inner vignette so the corners read as icon chrome.

### Direction 2 — "Stylised cable" (`cable`)
Exactly the owner's description, code-drawn (`tools/icon/cable.ts`): a confident
horizontal orange conductor about two-thirds up the navy square, glowing as if
hot with current, with crisp lightning **arcs** leaping off it (warm-white hot
cores in tight warm blooms — no neon halation), slim insulator pins so it reads
as a spanned line, and a faint row of warm window-lights along the base (the
brand beat: powering an area makes it glow).

## Design-skill principles actually applied

- **color-theory** — Blue/orange complementary pairing for maximum figure-ground
  AND it's the one colour-blind-safe pair (deuteranopia/protanopia/tritanopia all
  separate it). 60-30-10 distribution (navy field / mid-tones / orange accent).
  Dodged the "dark-mode saturation burn / halation on navy" sharp-edge by making
  every glow a *tight* warm bloom around a *hot-white* core rather than a wide
  saturated smear. Never pure black (`#0a0e22`, not `#000`) and never a flat slab
  — a subtle vertical gradient gives depth (surface-elevation thinking).
- **game-ui-design** — Silhouette/readability first: ONE strong horizontal
  element (cable) or ONE focal glow (flow) so the icon survives 60px and
  grayscale, the icon-equivalent of "readable at any intensity." Validated on the
  worst case (60px on a dark wallpaper), not just the 512 hero.
- **frontend-design** — Took a real, defensible aesthetic position instead of the
  templated answer (a bolt in a rounded square): the signature is *live current*.
  Spent the boldness in one place (the arcing) and kept everything else quiet.
- **canvas-design** — Philosophy before pixels; conductor placed in the upper
  third with deliberate negative space below; arcs used as the rare powerful
  gesture; rendered big and box-downscaled (master-craft AA) so every size is
  crisp.

## Files

- `tools/icon/canvas.ts` — software raster toolkit (PNG codec, glows/bulbs,
  glow-lines, polygons, iOS squircle mask, downscale, backdrop compositing).
- `tools/icon/cable.ts` — Direction 2 renderer.
- `tools/icon/flow.ts` — Direction 1 compositor (crops captured frames).
- `tools/icon/build.ts` — renders every concept at every size + the two sheets.
- `e2e/iconframes.helper.spec.ts` — captures the real dusk energy-flow frames.

## How to regenerate

```
# (optional) capture fresh energy-flow frames into _frames/
SHOTS=1 npx playwright test e2e/iconframes.helper.spec.ts --config=playwright.icon.config.ts
# render all concepts + comparison sheets
npx tsx tools/icon/build.ts
```

## Outputs (per concept `<name>`)

`<name>-hero-512.png` (full-bleed) · `<name>-hero-512-ios.png` (squircle) ·
`<name>-180/120/60.png` (squircle) · `<name>-60-gray.png` (silhouette) ·
`<name>-on-dark.png` / `<name>-on-light.png` (home-screen composites).
Comparison sheets: `_sheet-dark.png`, `_sheet-light.png`.
