# public/heroes — outsourced hero landmark rasters

Drop an optional **`<spriteName>.png`** here to override an iconic landmark's
code-drawn sprite with a generated/painted raster. Everything else stays
code-art; a landmark with no PNG here keeps its vector sprite.

- The file name is the **atlas sprite name** (e.g. `lm_parliament.png`,
  `lm_bridge.png`, `lm_spire.png`). The eligible set + required pixel sizes
  live in `src/render/heroRasters.ts`.
- Each PNG must be **8-bit RGBA, non-interlaced, transparent background**, at
  the **exact canvas size** for that landmark (a wrong size is ignored and the
  code sprite is used). See `docs/hero-sprites.md` for sizes + the prompt set.
- The art is **reference-only sourced** (you generate original art in our
  style); we do not ship copied photographs.

How it flows in: `tools/heroLoader.ts` (Node, for the preview tool) and the
browser loader in `src/render/atlasCache.ts` decode any PNGs here and pass them
to `buildAtlas(overrides)`, which swaps the pixels of that landmark's existing
atlas frame — so anchoring, trim and the dusk grade are unchanged.
