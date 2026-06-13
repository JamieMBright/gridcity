// Construction-site progress (ROADMAP #43). A plant/substation that is
// underConstruction draws as a building site whose look advances through
// four stages keyed off how far through its lead time it is, so the
// instant-award → commission arc actually reads on the map:
//
//   stage 0 groundworks   (just started — bare foundation + spoil)
//   stage 1 frame          (first lift of structure rising)
//   stage 2 scaffolded shell (full-height cage, sheeted)
//   stage 3 topping out    (near-complete, scaffold coming down)
//
// Pure + dependency-free so it unit-tests without the renderer. The
// MapRenderer feeds it the remaining minutes (liveAtMin − simTimeMin) and
// the asset's total lead time (planning + build, in minutes); the chooser
// maps the elapsed FRACTION to a stage. When the total lead is unknown
// (legacy saves, missing catalog times) it falls back to the finishing
// stage so something sensible always draws.

/** The four construction-site art stages, oldest → newest. */
export type ConstructionStage = 0 | 1 | 2 | 3;

/** The sprite name for a construction stage (atlas keys construction_0..3,
 *  with `construction` aliased to the late stage for stage-less callers). */
export function constructionSpriteFor(stage: ConstructionStage): string {
  return `construction_${stage}`;
}

/**
 * Pick the progress stage from how much lead time is LEFT.
 *
 * @param remainingMin  liveAtMin − simTimeMin (game-minutes still to run).
 *                      Clamped: ≤0 (or commissioned) → the final stage 3.
 * @param totalLeadMin  the full planning+build lead, game-minutes. ≤0 or
 *                      undefined → stage 3 (no way to compute progress).
 */
export function constructionStage(
  remainingMin: number,
  totalLeadMin: number | undefined,
): ConstructionStage {
  if (totalLeadMin === undefined || totalLeadMin <= 0) return 3;
  if (remainingMin <= 0) return 3;
  // elapsed fraction 0..1 (just started → 0, about to finish → 1)
  const done = Math.max(0, Math.min(1, 1 - remainingMin / totalLeadMin));
  // four equal quartiles
  const q = Math.min(3, Math.floor(done * 4));
  return q as ConstructionStage;
}
