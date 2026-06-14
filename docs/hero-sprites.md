# Hero landmark sprites — the outsourced-raster pipeline

Hand-coded iso vector art is great for **bold, simple icons** (the O2 dome, the
Shard, Tower Bridge's silhouette) but hits a ceiling on **intricate** buildings
(the Palace of Westminster). For those marquee heroes we outsource the art to an
**image-generation model** (the right tool for "make this look real"), then bake
the result in as a static sprite. Code art stays the default for the long tail.

This doc is the **generation brief**: what to make, at what size, in what style,
and how it slots in.

## How it slots in (already built, additive)

1. Generate a transparent **PNG** for a hero at its exact canvas size (below).
2. Save it to `public/heroes/<spriteName>.png`.
3. Done — `buildAtlas()` overrides that landmark's frame pixels with the PNG
   (anchor/trim/dusk-grade unchanged). No PNG ⇒ the code sprite is used. A
   wrong-sized or non-baseline PNG is ignored (logged), never breaks the build.

Source of truth for the eligible set + sizes: `src/render/heroRasters.ts`
(`heroCanvasDims(name)`). The Node preview tool (`npx tsx tools/preview.ts …`)
and the in-game atlas both pick the PNGs up automatically.

## Canvas sizes (device pixels, the art is 2× RES)

| Sprite name (file) | Landmark | Footprint (tiles) | PNG size (w×h) |
|---|---|---|---|
| `lm_parliament` | Houses of Parliament | 3×5 SW | **1024 × 576** |
| `lm_bridge` | Tower Bridge | 1×4 SW | **640 × 448** |
| `lm_dome` | St Paul's Cathedral | 2×2 SW | **512 × 512** |
| `lm_o2dome` | The O2 | 3×3 SW | **768 × 576** |
| `lm_wembley` | Wembley Stadium | 2×2 SW | **512 × 512** |
| `lm_spire` | The Shard | 1×1 | **256 × 448** |
| `lm_gherkin` | 30 St Mary Axe (Gherkin) | 1×1 | **256 × 448** |
| `lm_eye` | London Eye | 1×1 | **256 × 448** |
| `lm_fortress` | Tower of London | 1×1 | **256 × 448** |

## Composition / alignment (critical — or it won't sit on its tiles)

The view is **2:1 dimetric isometric**, sun low in the south-east (right/east
faces warm-lit, left/south-west faces in cool dusk shade). The building must be
drawn to land on its tile footprint exactly like the code sprite does:

- **Ground line / anchor.** The footprint's floor diamond sits in the **bottom**
  of the canvas. For a 1×1 (256×448) the floor diamond centre is at roughly
  `(128, 416)` with the diamond spanning the bottom ~128px; the building rises
  **up** from there into the upper transparent area. For SW-anchored multi-tile
  heroes the block's **south-west (lower-left) corner** pins to that same point.
- The fastest alignment aid: render the current **code sprite** as a guide and
  match its footing/scale, then replace it —
  `npx tsx tools/preview.ts sprite <name>` writes `preview/sprite_<name>.png`.
- **Transparent** everywhere that isn't the building. No drop shadow baked in
  (the renderer casts its own); no ground/grass.

## Style brief (so heroes sit in the same world)

> Isometric 2:1 dimetric game sprite of **{LANDMARK}**, single building,
> 3/4 top-down view, transparent background. Lofi cosy golden-hour palette —
> warm sunset stone, dusty pinks, muted purples, deep-navy dusk shadows; the
> sun is low in the **south-east** so right/east faces are warm-lit and
> left/south-west faces fall into cool shade. Clean **ink-contour** outlines
> over flat colour blocks (low-poly, hand-illustrated, not photoreal, no
> gradients-heavy realism). Recognisable real architecture and true
> proportions, but stylised to read at a glance. Centred, building rises from
> a footprint at the bottom of the frame, nothing cropped. {DETAILS}

Per-hero `{DETAILS}` (proportions verified from references):

- **Houses of Parliament** — long, LOW Perpendicular-Gothic river palace with a
  floodlit ground arcade and a spiky pinnacled skyline; **Victoria Tower** at
  the SW end is the tallest/bulkiest (98.5 m, square, corner turrets + tall
  flagstaff); **Big Ben / Elizabeth Tower** at the NE end is slimmer (96.3 m,
  four gilt-ringed clock faces high up, louvred belfry, steep ornate spire);
  slender **Central spire** (91.4 m) between them. Honey Bath-stone, dark slate
  roofs.
- **Tower Bridge** — two Victorian-Gothic towers in pale Portland stone linked
  by high walkways and a blue suspension span over the river; bascule roadway
  between the towers.
- **St Paul's** — Portland-stone English-Baroque cathedral dominated by the
  great lead **dome** + lantern, twin west baroque towers, long nave.
- **The O2** — vast white spherical tent dome, twelve tall yellow support masts
  spiking through the canopy, low and wide.
- **Wembley** — modern white bowl stadium with the great steel **arch** soaring
  over it.
- **The Shard** — tapering glass pyramid spire, fragmented shard top, ~300 m,
  pale icy glass catching the sunset.
- **Gherkin** — bullet-shaped curved glass tower with the diagonal diamond
  lattice and a rounded apex.
- **London Eye** — giant white observation wheel, fine spokes, capsules on the
  rim, A-frame support, beside the river.
- **Tower of London** — medieval stone fortress, the square White Tower keep
  with four turrets, curtain walls.

## Notes

- Determinism is unaffected: a baked PNG is a static file, no different from a
  hand-coded sprite. The atlas cache rebakes when hero art changes
  (`heroFingerprint` folds into the IndexedDB key).
- Keep the sheet under the 4096 px GPU ceiling — heroes already occupy big
  frames, so don't add transparent padding beyond the canvas size.
- After dropping a PNG, eyeball it: `npx tsx tools/preview.ts sprite <name>` and
  an in-context crop, exactly like the code-art design gate.
