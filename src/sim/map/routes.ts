// Vector transport geometry, shared by the map generator (stamping routes
// onto the gameplay raster) and the renderer (drawing ribbons and driving
// vehicles) so both always trace the identical curve.

import type { TransportRoute } from './types';

/** Catmull-Rom sample of a route's waypoints at ~`step` tile spacing.
 *  Returns tile-space points including both endpoints. */
export function sampleRoute(route: TransportRoute, step = 0.3): Array<[number, number]> {
  const pts = route.pts;
  if (pts.length < 2) return [...pts];
  const out: Array<[number, number]> = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? pts[i + 1];
    if (!p0 || !p1 || !p2 || !p3) continue;
    const segLen = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const n = Math.max(1, Math.ceil(segLen / step));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push([
        0.5 *
          (2 * p1[0] +
            (-p0[0] + p2[0]) * t +
            (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
            (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 *
          (2 * p1[1] +
            (-p0[1] + p2[1]) * t +
            (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
            (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  const last = pts[pts.length - 1];
  if (last) out.push([last[0], last[1]]);
  return out;
}
