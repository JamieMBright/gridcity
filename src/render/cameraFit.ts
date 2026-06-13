// Pure camera-fit + pan-clamp maths for the iso world, factored out of
// MapRenderer so missions can centre/zoom-FIT a tiny map and CLAMP the
// pan to its bounds — and so the geometry is unit-testable without Pixi.
//
// World projection (see MapRenderer.tileCentre):
//   worldX = (x - y) * halfW
//   worldY = (x + y) * halfH
// The screen position of a tile centre is worldX*scale + camera.x.

export interface TileBounds {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface CameraState {
  scale: number;
  x: number;
  y: number;
}

export interface FitOpts {
  screenW: number;
  screenH: number;
  halfW: number;
  halfH: number;
  /** Screen-px breathing room kept around the fitted bounds. */
  paddingPx: number;
  /** Extra screen-px reserved at the TOP (the mission step strip lives
   *  there): the map fits + centres in the area BELOW it, so the focus
   *  tiles never hide under the strip. */
  topReservePx?: number;
  minZoom: number;
  maxZoom: number;
}

/** World-space axis-aligned box covering the centres of every tile in
 *  `b` (a half-tile margin added so edge sprites aren't clipped). */
export function worldBoxOf(
  b: TileBounds,
  halfW: number,
  halfH: number,
): { minX: number; maxX: number; minY: number; maxY: number } {
  // worldX = (x-y)*halfW is widest at (x1,y0) and (x0,y1);
  // worldY = (x+y)*halfH spans (x0+y0)..(x1+y1).
  const minX = (b.x0 - b.y1) * halfW - halfW;
  const maxX = (b.x1 - b.y0) * halfW + halfW;
  const minY = (b.x0 + b.y0) * halfH - halfH;
  const maxY = (b.x1 + b.y1) * halfH + halfH;
  return { minX, maxX, minY, maxY };
}

/** The camera (scale + position) that centres `bounds` and fits them on
 *  screen with padding, clamped to the zoom range. */
export function cameraFitFor(bounds: TileBounds, o: FitOpts): CameraState {
  const box = worldBoxOf(bounds, o.halfW, o.halfH);
  const boxW = Math.max(1, box.maxX - box.minX);
  const boxH = Math.max(1, box.maxY - box.minY);
  const top = o.topReservePx ?? 0;
  const availW = Math.max(1, o.screenW - 2 * o.paddingPx);
  const availH = Math.max(1, o.screenH - 2 * o.paddingPx - top);
  const scale = clamp(Math.min(availW / boxW, availH / boxH), o.minZoom, o.maxZoom);
  const cx = (box.minX + box.maxX) / 2;
  const cy = (box.minY + box.maxY) / 2;
  // centre horizontally; vertically centre within the area BELOW the
  // reserved top strip
  const availTop = o.paddingPx + top;
  const availBottom = o.screenH - o.paddingPx;
  return {
    scale,
    x: o.screenW / 2 - cx * scale,
    y: (availTop + availBottom) / 2 - cy * scale,
  };
}

/** Clamp a camera position so the world box stays in view: if the box is
 *  smaller than the screen it's centred on that axis; otherwise the edge
 *  is held flush so you can never pan the map entirely off-screen. */
export function clampCameraToBounds(
  cam: CameraState,
  bounds: TileBounds,
  o: Pick<FitOpts, 'screenW' | 'screenH' | 'halfW' | 'halfH'> & {
    paddingPx?: number;
    topReservePx?: number;
  },
): CameraState {
  const box = worldBoxOf(bounds, o.halfW, o.halfH);
  const pad = o.paddingPx ?? 0;
  const top = o.topReservePx ?? 0;
  const s = cam.scale;
  return {
    scale: s,
    x: clampAxis(cam.x, box.minX, box.maxX, s, o.screenW, pad, 0),
    y: clampAxis(cam.y, box.minY, box.maxY, s, o.screenH, pad, top),
  };
}

function clampAxis(
  pos: number,
  min: number,
  max: number,
  scale: number,
  screen: number,
  pad: number,
  topReserve: number,
): number {
  // screen position of the box edges is min*scale + pos .. max*scale + pos
  const spanPx = (max - min) * scale;
  const loEdge = pad + topReserve; // start of the usable band
  const hiEdge = screen - pad; // end of the usable band
  if (spanPx <= hiEdge - loEdge) {
    // box fits: centre it in the usable band (below any reserved strip)
    return (loEdge + hiEdge) / 2 - ((min + max) / 2) * scale;
  }
  // box larger than the band: keep both padded edges reachable but never
  // let empty space past them creep in
  const lo = hiEdge - max * scale; // furthest up (max edge at bottom pad)
  const hi = loEdge - min * scale; // furthest down (min edge at top edge)
  return clamp(pos, lo, hi);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
