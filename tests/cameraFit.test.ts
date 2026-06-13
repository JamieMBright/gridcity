// Camera fit + pan-clamp maths (render/cameraFit.ts) — THE mission-camera
// fix lives here: a tiny mission map must centre, zoom-FIT and clamp so
// the village/ridge can never sit off-screen.

import { describe, expect, it } from 'vitest';
import {
  cameraFitFor,
  clampCameraToBounds,
  worldBoxOf,
  type TileBounds,
} from '../src/render/cameraFit';

const HALF_W = 16;
const HALF_H = 8;
// the m1 First Light map is 32x24 (data/missions.ts)
const M1: TileBounds = { x0: 0, y0: 0, x1: 31, y1: 23 };
const PHONE = { screenW: 844, screenH: 390 };

/** Screen position of a tile centre under a camera. */
function screenOf(tx: number, ty: number, cam: { scale: number; x: number; y: number }) {
  return {
    x: (tx - ty) * HALF_W * cam.scale + cam.x,
    y: (tx + ty) * HALF_H * cam.scale + cam.y,
  };
}

function opts(extra: Partial<Parameters<typeof cameraFitFor>[1]> = {}) {
  return {
    screenW: PHONE.screenW,
    screenH: PHONE.screenH,
    halfW: HALF_W,
    halfH: HALF_H,
    paddingPx: 36,
    minZoom: 0.01,
    maxZoom: 8,
    ...extra,
  };
}

describe('worldBoxOf', () => {
  it('covers every tile centre with a half-tile margin', () => {
    const box = worldBoxOf(M1, HALF_W, HALF_H);
    // widest worldX at (x1,y0) and (x0,y1)
    expect(box.maxX).toBeCloseTo(31 * HALF_W + HALF_W);
    expect(box.minX).toBeCloseTo(-23 * HALF_W - HALF_W);
    expect(box.minY).toBeCloseTo(0 - HALF_H);
    expect(box.maxY).toBeCloseTo((31 + 23) * HALF_H + HALF_H);
  });
});

describe('cameraFitFor — the mission camera lock', () => {
  it('every mission tile lands inside the padded viewport at 844x390', () => {
    const cam = cameraFitFor(M1, opts());
    for (let x = M1.x0; x <= M1.x1; x++) {
      for (let y = M1.y0; y <= M1.y1; y++) {
        const p = screenOf(x, y, cam);
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(PHONE.screenW);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(PHONE.screenH);
      }
    }
  });

  it('the village tile (24,12) is comfortably on-screen on mission start', () => {
    const cam = cameraFitFor(M1, opts());
    const p = screenOf(24, 12, cam);
    expect(p.x).toBeGreaterThan(0);
    expect(p.x).toBeLessThan(PHONE.screenW);
    expect(p.y).toBeGreaterThan(0);
    expect(p.y).toBeLessThan(PHONE.screenH);
  });

  it('centres the bounds: the box centre lands at the screen centre', () => {
    const cam = cameraFitFor(M1, opts());
    const box = worldBoxOf(M1, HALF_W, HALF_H);
    const centre = screenOfWorld((box.minX + box.maxX) / 2, (box.minY + box.maxY) / 2, cam);
    expect(centre.x).toBeCloseTo(PHONE.screenW / 2, 3);
    expect(centre.y).toBeCloseTo(PHONE.screenH / 2, 3);
  });

  it('respects the zoom clamp', () => {
    const tiny = cameraFitFor(M1, opts({ maxZoom: 0.3 }));
    expect(tiny.scale).toBeCloseTo(0.3);
  });

  it('with a reserved top strip, the map fits BELOW it and the village clears it', () => {
    const reserve = 104;
    const cam = cameraFitFor(M1, opts({ topReservePx: reserve }));
    // every tile sits inside the band below the strip
    for (let x = M1.x0; x <= M1.x1; x++) {
      for (let y = M1.y0; y <= M1.y1; y++) {
        const p = screenOf(x, y, cam);
        expect(p.y).toBeGreaterThanOrEqual(reserve - 0.001);
        expect(p.y).toBeLessThanOrEqual(PHONE.screenH + 0.001);
      }
    }
    // the village specifically is well clear of the strip
    const v = screenOf(24, 12, cam);
    expect(v.y).toBeGreaterThan(reserve);
    // the box centres in the band, not at screen-centre
    const box = worldBoxOf(M1, HALF_W, HALF_H);
    const cy = ((box.minY + box.maxY) / 2) * cam.scale + cam.y;
    expect(cy).toBeGreaterThan(PHONE.screenH / 2); // pushed down by the reserve
  });
});

describe('clampCameraToBounds', () => {
  it('a fitted camera that fits is re-centred (no off-screen pan possible)', () => {
    const cam = cameraFitFor(M1, opts());
    // try to shove the camera 5000px off to the side
    const shoved = { ...cam, x: cam.x + 5000, y: cam.y - 5000 };
    const back = clampCameraToBounds(shoved, M1, {
      screenW: PHONE.screenW,
      screenH: PHONE.screenH,
      halfW: HALF_W,
      halfH: HALF_H,
      paddingPx: 8,
    });
    // re-centred on each axis because the fitted box fits the screen
    expect(back.x).toBeCloseTo(cam.x, 3);
    expect(back.y).toBeCloseTo(cam.y, 3);
  });

  it('when zoomed IN past the fit, the edges stay reachable but no empty gap creeps in', () => {
    const fit = cameraFitFor(M1, opts());
    const zoomed = { ...fit, scale: fit.scale * 4 };
    const clamped = clampCameraToBounds(zoomed, M1, {
      screenW: PHONE.screenW,
      screenH: PHONE.screenH,
      halfW: HALF_W,
      halfH: HALF_H,
      paddingPx: 8,
    });
    const box = worldBoxOf(M1, HALF_W, HALF_H);
    // the box now overflows the screen: its left edge must be at or past
    // the left of the screen (no dead space to its left)
    const leftEdge = box.minX * clamped.scale + clamped.x;
    const rightEdge = box.maxX * clamped.scale + clamped.x;
    expect(leftEdge).toBeLessThanOrEqual(8 + 0.001);
    expect(rightEdge).toBeGreaterThanOrEqual(PHONE.screenW - 8 - 0.001);
  });
});

function screenOfWorld(wx: number, wy: number, cam: { scale: number; x: number; y: number }) {
  return { x: wx * cam.scale + cam.x, y: wy * cam.scale + cam.y };
}
