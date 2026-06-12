// Ribbon geometry invariants for the shared transport tessellator: mitred
// joins stay bounded, quads wind consistently, zoom bands declutter the
// right classes, width floors hold in screen px, and the derived junction/
// bridge/overpass geometry is deterministic. The same module feeds both
// the Pixi renderer and tools/preview.ts, so these guard both.

import { describe, expect, it } from 'vitest';
import {
  BAND_EDGES,
  MITER_LIMIT,
  RIBBON_PALETTE,
  bandFor,
  deckLiftWorldPx,
  emitRouteRibbons,
  fillHalfFor,
  transportGeometry,
  zoomKeyFor,
} from '../src/render/routeRibbons';
import { chaikin, emitShoreline, traceShorelines } from '../src/render/shoreline';
import { CELL_W, FLOOR_H } from '../src/render/sprites/iso';
import { sampleRoute } from '../src/sim/map/routes';
import { LANDMARK, TERRAIN, type CityMap, type RouteClass } from '../src/sim/map/types';
import { makeTestMap } from './helpers';

const HALF_W = CELL_W / 2;
const HALF_H = FLOOR_H / 2;

/** Inverse iso projection back to tile space (ground-level vertices). */
function unproject(x: number, y: number): { u: number; v: number } {
  return { u: (x / HALF_W + y / HALF_H) / 2, v: (y / HALF_H - x / HALF_W) / 2 };
}

interface Emitted { pts: number[]; color: number; alpha: number; layer: string }

function collect(map: CityMap, band: number, scale: number): Emitted[] {
  const out: Emitted[] = [];
  emitRouteRibbons(map, { band, scale }, (pts, color, alpha, layer) =>
    out.push({ pts, color, alpha, layer }),
  );
  return out;
}

function routedMap(routes: Array<{ kind: RouteClass; pts: Array<[number, number]> }>): CityMap {
  const map = makeTestMap(32, 32);
  map.routes = routes;
  return map;
}

describe('zoom bands', () => {
  it('selects the documented bands', () => {
    expect(bandFor(0.04)).toBe(0);
    expect(bandFor(0.1)).toBe(1);
    expect(bandFor(0.25)).toBe(2);
    expect(bandFor(0.6)).toBe(3);
    expect(bandFor(1.2)).toBe(4);
    expect(BAND_EDGES).toEqual([0.08, 0.18, 0.45, 0.9]);
  });

  it('applies ±10% hysteresis around the rebuild key', () => {
    const key = zoomKeyFor(0.079);
    expect(key.band).toBe(0);
    // a nudge past the boundary stays on the old key…
    expect(zoomKeyFor(0.085, key)).toBe(key);
    // …a real move re-keys
    const next = zoomKeyFor(0.1, key);
    expect(next).not.toBe(key);
    expect(next.band).toBe(1);
    // and coming back just inside the old range doesn't flap
    expect(zoomKeyFor(0.095, next)).toBe(next);
  });

  it('keys are stable within their own range', () => {
    for (const s of [0.03, 0.06, 0.1, 0.2, 0.4, 0.7, 1.3]) {
      const k = zoomKeyFor(s);
      expect(s).toBeGreaterThanOrEqual(k.lo - 1e-9);
      expect(s).toBeLessThanOrEqual(k.hi + 1e-9);
      expect(zoomKeyFor(s, k)).toBe(k);
    }
  });
});

describe('class declutter + width floors', () => {
  const map = routedMap([
    { kind: 'motorway', pts: [[2, 4], [29, 4]] },
    { kind: 'arterial', pts: [[2, 9], [29, 9]] },
    { kind: 'street', pts: [[2, 14], [29, 14]] },
    { kind: 'lane', pts: [[2, 19], [29, 19]] },
    { kind: 'rail', pts: [[2, 24], [29, 24]] },
  ]);

  it('far band shows motorway/arterial/rail only', () => {
    const colors = new Set(collect(map, 0, 0.04).map((e) => e.color));
    expect(colors.has(RIBBON_PALETTE.motorwayFillFar)).toBe(true);
    expect(colors.has(RIBBON_PALETTE.arterialFill)).toBe(true);
    expect(colors.has(RIBBON_PALETTE.railFar)).toBe(true);
    expect(colors.has(RIBBON_PALETTE.streetFill)).toBe(false);
    expect(colors.has(RIBBON_PALETTE.laneFill)).toBe(false);
  });

  it('streets fade in at Z1, lanes at Z2', () => {
    const z1 = new Set(collect(map, 1, 0.12).map((e) => e.color));
    expect(z1.has(RIBBON_PALETTE.streetFill)).toBe(true);
    expect(z1.has(RIBBON_PALETTE.laneFill)).toBe(false);
    const z2 = new Set(collect(map, 2, 0.3).map((e) => e.color));
    expect(z2.has(RIBBON_PALETTE.laneFill)).toBe(true);
  });

  it('motorway width floor holds at far zoom', () => {
    const scale = 0.04;
    const half = fillHalfFor('motorway', 0, scale);
    // floor: 4 screen px ⇒ at least 4 / (256·s) tile units wide
    expect(half * 2 * CELL_W * scale).toBeGreaterThanOrEqual(3.99);
    const quads = collect(map, 0, scale).filter(
      (e) => e.color === RIBBON_PALETTE.motorwayFillFar && e.pts.length === 8,
    );
    expect(quads.length).toBeGreaterThan(0);
    const q = quads[Math.floor(quads.length / 2)];
    if (!q) throw new Error('no quad');
    const a = unproject(q.pts[0] ?? 0, q.pts[1] ?? 0);
    const b = unproject(q.pts[6] ?? 0, q.pts[7] ?? 0);
    const width = Math.hypot(a.u - b.u, a.v - b.v);
    expect(width * CELL_W * scale).toBeGreaterThanOrEqual(3.5);
  });

  it('casing is wider than fill and drawn before it', () => {
    const polys = collect(map, 2, 0.3);
    const firstCasing = polys.findIndex((e) => e.color === RIBBON_PALETTE.casing);
    const firstFill = polys.findIndex((e) => e.color === RIBBON_PALETTE.motorwayFill);
    expect(firstCasing).toBeGreaterThanOrEqual(0);
    expect(firstCasing).toBeLessThan(firstFill);
  });
});

describe('ribbon tessellation', () => {
  it('mitred joins stay bounded at lattice L-corners', () => {
    const route = { kind: 'street' as const, pts: [[4, 4], [20, 4], [20, 20]] as Array<[number, number]> };
    const map = routedMap([route]);
    const centre = sampleRoute(route, 0.35);
    const polys = collect(map, 2, 0.3).filter((e) => e.pts.length === 8);
    expect(polys.length).toBeGreaterThan(10);
    // every emitted vertex must stay within MITER_LIMIT × the casing
    // half-width of the sampled centreline (plus half a sample step)
    const maxHalf = fillHalfFor('street', 2, 0.3) + 0.05;
    const bound = maxHalf * MITER_LIMIT + 0.2;
    for (const p of polys) {
      for (let i = 0; i < p.pts.length; i += 2) {
        const { u, v } = unproject(p.pts[i] ?? 0, p.pts[i + 1] ?? 0);
        let best = Number.POSITIVE_INFINITY;
        for (const c of centre) {
          const d = Math.hypot(u - (c[0] ?? 0), v - (c[1] ?? 0));
          if (d < best) best = d;
        }
        expect(best).toBeLessThanOrEqual(bound);
      }
    }
  });

  it('quads wind consistently (no bowties on smooth routes)', () => {
    const map = routedMap([{ kind: 'arterial', pts: [[4, 4], [16, 10], [28, 4]] }]);
    const quads = collect(map, 2, 0.3).filter(
      (e) => e.color === RIBBON_PALETTE.arterialFill && e.pts.length === 8,
    );
    expect(quads.length).toBeGreaterThan(5);
    let sign = 0;
    for (const q of quads) {
      let area = 0;
      for (let i = 0; i < 4; i++) {
        const x0 = q.pts[i * 2] ?? 0;
        const y0 = q.pts[i * 2 + 1] ?? 0;
        const x1 = q.pts[((i + 1) % 4) * 2] ?? 0;
        const y1 = q.pts[((i + 1) % 4) * 2 + 1] ?? 0;
        area += x0 * y1 - x1 * y0;
      }
      expect(Math.abs(area)).toBeGreaterThan(0);
      if (sign === 0) sign = Math.sign(area);
      expect(Math.sign(area)).toBe(sign);
    }
  });
});

describe('derived junction / bridge geometry', () => {
  it('junction nodes are deterministic and need ≥3 meeting routes', () => {
    const arms: Array<{ kind: RouteClass; pts: Array<[number, number]> }> = [
      { kind: 'street', pts: [[4, 16], [16, 16]] },
      { kind: 'street', pts: [[16, 4], [16, 16]] },
      { kind: 'street', pts: [[28, 16], [16, 16]] },
      { kind: 'street', pts: [[16, 28], [16, 16]] },
    ];
    const a = transportGeometry(routedMap(arms));
    const b = transportGeometry(routedMap(arms));
    expect(a.junctions).toEqual(b.junctions);
    expect(a.junctions.length).toBeGreaterThanOrEqual(1);
    const j = a.junctions[0];
    if (!j) throw new Error('no junction');
    expect(Math.hypot(j.u - 16, j.v - 16)).toBeLessThan(0.6);
    // a lone open-country sweep derives nothing
    const sweep = transportGeometry(routedMap([{ kind: 'lane', pts: [[2, 2], [16, 12], [30, 8]] }]));
    expect(sweep.junctions).toEqual([]);
    expect(sweep.overpasses).toEqual([]);
    expect(sweep.spans).toEqual([]);
  });

  it('anything crossing a motorway becomes an overpass, not a junction', () => {
    const g = transportGeometry(
      routedMap([
        { kind: 'motorway', pts: [[2, 16], [30, 16]] },
        { kind: 'street', pts: [[16, 2], [16, 30]] },
      ]),
    );
    expect(g.junctions).toEqual([]);
    expect(g.overpasses.length).toBe(1);
    const op = g.overpasses[0];
    if (!op) throw new Error('no overpass');
    expect(g.fine[op.pathIx]?.kind).toBe('street');
    expect(Math.abs(op.s - 14)).toBeLessThan(1);
  });

  it('water runs become bridge spans with approaches; dead-ends become piers', () => {
    const map = routedMap([
      { kind: 'street', pts: [[2, 16], [30, 16]] },
      { kind: 'lane', pts: [[2, 24], [16, 24]] },
    ]);
    for (let y = 0; y < 32; y++) {
      for (let x = 12; x <= 19; x++) map.terrain[y * 32 + x] = TERRAIN.water;
    }
    const g = transportGeometry(map);
    const bridge = g.spans.find((s) => g.fine[s.pathIx]?.kind === 'street');
    const pier = g.spans.find((s) => g.fine[s.pathIx]?.kind === 'lane');
    expect(bridge?.mode).toBe('bridge');
    expect(pier?.mode).toBe('pier');
    if (!bridge) throw new Error('no bridge');
    // water spans x∈[11.5,19.5] from a start at x=2 ⇒ s≈[9.5,17.5] ± approach
    expect(bridge.s0).toBeGreaterThan(7.5);
    expect(bridge.s0).toBeLessThan(10);
    expect(bridge.s1).toBeGreaterThan(17);
    expect(bridge.s1).toBeLessThan(19.5);
  });

  it('spans inside the Tower Bridge reservation stay plain', () => {
    const map = routedMap([{ kind: 'street', pts: [[2, 16], [30, 16]] }]);
    map.landmark = new Uint8Array(32 * 32);
    for (let y = 0; y < 32; y++) {
      for (let x = 14; x <= 17; x++) {
        map.terrain[y * 32 + x] = TERRAIN.water;
        if (y >= 15 && y <= 17) map.landmark[y * 32 + x] = LANDMARK.towerBridge;
      }
    }
    const g = transportGeometry(map);
    expect(g.spans.length).toBe(1);
    expect(g.spans[0]?.mode).toBe('plain');
  });

  it('bridge decks lift vehicles by class', () => {
    expect(deckLiftWorldPx('motorway')).toBeGreaterThan(deckLiftWorldPx('street'));
    for (const k of ['motorway', 'arterial', 'street', 'lane', 'rail'] as const) {
      expect(deckLiftWorldPx(k)).toBeGreaterThan(0);
    }
  });

  it('bridge parapets split across the vehicle layer', () => {
    const map = routedMap([{ kind: 'arterial', pts: [[2, 16], [30, 16]] }]);
    for (let y = 0; y < 32; y++) {
      for (let x = 12; x <= 19; x++) map.terrain[y * 32 + x] = TERRAIN.water;
    }
    const polys = collect(map, 3, 0.6);
    const layers = new Set(polys.map((e) => e.layer));
    expect(layers.has('bridgeTop')).toBe(true);
    const top = polys.filter((e) => e.layer === 'bridgeTop');
    for (const t of top) expect(t.color).toBe(RIBBON_PALETTE.parapet);
  });
});

describe('shoreline smoothing', () => {
  it('traces a closed, deterministic contour around a water body', () => {
    const map = makeTestMap(16, 16);
    for (let y = 5; y <= 8; y++) {
      for (let x = 4; x <= 9; x++) map.terrain[y * 16 + x] = TERRAIN.water;
    }
    const chains = traceShorelines(map);
    expect(chains.length).toBe(1);
    const c = chains[0];
    if (!c) throw new Error('no chain');
    expect(c.closed).toBe(true);
    // 6×4 water block ⇒ 20 marching-squares segments
    expect(c.pts.length).toBe(21);
    expect(traceShorelines(map)).toEqual(chains);
  });

  it('chaikin doubles point counts on closed chains', () => {
    const square = [
      { u: 0, v: 0 },
      { u: 4, v: 0 },
      { u: 4, v: 4 },
      { u: 0, v: 4 },
    ];
    expect(chaikin(square, true).length).toBe(8);
    expect(chaikin(square, false).length).toBe(8); // 2(n−1) + endpoints
  });

  it('emits water + bank bands and nothing on a dry map', () => {
    const map = makeTestMap(16, 16);
    for (let y = 5; y <= 8; y++) {
      for (let x = 4; x <= 9; x++) map.terrain[y * 16 + x] = TERRAIN.water;
    }
    const colors = new Set<number>();
    let n = 0;
    emitShoreline(map, (_pts, color) => {
      colors.add(color);
      n++;
    });
    expect(n).toBeGreaterThan(0);
    expect(colors.size).toBeGreaterThanOrEqual(3); // water, bank, ink (+foam)
    let dry = 0;
    emitShoreline(makeTestMap(8, 8), () => dry++);
    expect(dry).toBe(0);
  });
});
