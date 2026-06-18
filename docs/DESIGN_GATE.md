# Visual design gate — the checklist (run on EVERY visual change)

Owner mandate (2026-06-18): graphics/UI changes are judged on real screengrabs,
**systematically** — extract what we can objectively, then judge styling by eye.
Run this on **desktop (1280×800)**, **phone-landscape (844×390)** AND a **narrow
phone-landscape (667×375)** — and across HUD states (resting · inbox · bill ·
pinned inspector · busy). A visual PR is not done until every box is ticked.

## How to run it
- **Objective layout checks (auto-extracted):** `e2e/hudfit.helper.spec.ts`
  extracts every HUD panel's bounding box from the live DOM and fails on any
  clip / safe-area breach / overlap, at several viewports. It also writes grabs
  to `preview/hudfit-*`.
  - `SHOTS=1 npx playwright test e2e/hudfit.helper.spec.ts`
- **Holistic styling checks:** open the grabs it produced and judge §B by eye,
  harshly, against the real thing.

## A. Layout & fit — OBJECTIVE (the extractor enforces these)
1. **No clipping** — no chrome element crosses a viewport edge.
2. **Safe area** — nothing inside the notch / home-indicator insets (`--sai-*`).
3. **No overlap** — no chrome panel overlaps another (the pinned inspector and
   transient toasts are the only allowed exceptions, and only over the map).
4. **Bars fit their row** — top/bottom bars fit within `100vw − safe-areas`
   (wrap, don't overflow).
5. **Map framing** — the playable map fills the viewport in the default framing;
   no flat off-map void wedge.

## B. Holistic styling — VISUAL JUDGEMENT (judge on the grabs)
6. **One palette** — cohesive dusk/golden-hour; no off-palette colours.
7. **Consistent panel chrome** — same corner radius, border, blur, shadow on
   every panel/pill.
8. **Spacing rhythm** — consistent padding/gaps; nothing cramped or touching an
   edge; comfortable density (mobile especially).
9. **Typography** — consistent scale; legible at size; **no truncated or
   overflowing text**.
10. **Icons** — one consistent set (weight, size, optical alignment).
11. **Alignment & symmetry** — rails aligned to their edges; bars centred as
    intended; stats evenly distributed.
12. **Accent discipline** — orange = active/primary, used sparingly; glows subtle.
13. **Contrast** — text vs panel and panel vs map both readable, over BOTH the
    bright golden map and the dark night map.
14. **State coherence** — looks right resting, with the inbox open, the bill
    open, an inspector pinned, and during a busy many-events moment.
15. **Zoom coherence** — reads well at far / mid / close; labels never clutter the
    far whole-region view.

## Log of gate findings (append per pass)
- 2026-06-18 (phone-landscape): bottom control bar overflowed the safe area at
  667/740/844 (content wider than `100vw − safe-areas`, `nowrap` → end controls
  under the notch). Fixed: compact bar wraps within the safe width. Map showed
  off-map void at the edges/zoom-out (tracked separately).
