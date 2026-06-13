// P7 air layer invariants: the AIRPORTS export is render-side scenery only
// (never serialized), arcs follow the westerly operation, and the whole
// animation is a pure deterministic function of time — no RNG anywhere
// near the sim.

import { describe, expect, it } from 'vitest';
import {
  AIR_PALETTE,
  altAt,
  emitFlightArcs,
  emitPlanes,
  flightArcsFor,
  planeAt,
} from '../src/render/airLayer';
import { AIRPORTS, LONDON_H, LONDON_W } from '../src/data/londonMap';
import { newGame, serialize, type SaveData } from '../src/sim/state';

describe('AIRPORTS export', () => {
  it('is additive render-side data: Heathrow at its landmark, in bounds', () => {
    expect(AIRPORTS.length).toBeGreaterThanOrEqual(1);
    const lhr = AIRPORTS.find((a) => a.name === 'Heathrow');
    expect(lhr).toEqual({ name: 'Heathrow', x: 65, y: 87, hdg: 'EW' });
    for (const a of AIRPORTS) {
      expect(a.x).toBeGreaterThanOrEqual(0);
      expect(a.x).toBeLessThan(LONDON_W);
      expect(a.y).toBeGreaterThanOrEqual(0);
      expect(a.y).toBeLessThan(LONDON_H);
    }
  });

  it('never serializes into a save payload', () => {
    const data: SaveData = serialize(newGame());
    expect(JSON.stringify(data).toLowerCase()).not.toContain('airport');
    expect(JSON.stringify(data)).not.toContain('Heathrow');
    expect('airports' in data).toBe(false);
  });
});

describe('flight arcs', () => {
  const arcs = flightArcsFor(AIRPORTS);

  it('gives each airport 2 departures + 2 arrivals, deterministically', () => {
    expect(arcs.length).toBe(AIRPORTS.length * 4);
    expect(arcs.filter((a) => a.kind === 'departure').length).toBe(AIRPORTS.length * 2);
    expect(flightArcsFor(AIRPORTS)).toEqual(arcs);
  });

  it('flies the westerly operation: depart west off the runway, arrive from the east', () => {
    for (const arc of arcs) {
      if (arc.kind === 'departure') {
        expect(arc.p0[0]).toBeGreaterThan(60); // runway threshold
        expect(arc.p1[0]).toBe(0); // exits the west edge
      } else {
        expect(arc.p0[0]).toBe(255); // enters from the east edge
        expect(arc.p1[0]).toBeGreaterThan(60); // lands on the runway
      }
    }
  });

  it('altitude profile: on the deck at the runway, cruise at the edge', () => {
    const dep = arcs.find((a) => a.kind === 'departure');
    const arr = arcs.find((a) => a.kind === 'arrival');
    if (!dep || !arr) throw new Error('missing arcs');
    expect(altAt(dep, 0)).toBe(0);
    expect(altAt(dep, 1)).toBe(1);
    expect(altAt(arr, 0)).toBe(1);
    expect(altAt(arr, 1)).toBe(0);
  });
});

describe('plane animation determinism', () => {
  const arcs = flightArcsFor(AIRPORTS);

  it('is a pure function of time and loops with the arc duration', () => {
    for (const arc of arcs) {
      expect(planeAt(arc, 37.5)).toEqual(planeAt(arc, 37.5));
      const a = planeAt(arc, 12);
      const b = planeAt(arc, 12 + arc.dur);
      expect(b.u).toBeCloseTo(a.u, 6);
      expect(b.v).toBeCloseTo(a.v, 6);
      expect(b.alt).toBeCloseTo(a.alt, 6);
    }
  });

  it('fades at the map edge so planes never pop', () => {
    const dep = arcs.find((a) => a.kind === 'departure');
    if (!dep) throw new Error('no departure');
    // t≈1 (the west edge): faded out; mid-run: fully on
    const tEnd = (0.999 - dep.phase + 1) * dep.dur;
    expect(planeAt(dep, tEnd % dep.dur).fade).toBeLessThan(0.05);
    const tMid = (0.5 - dep.phase + 1) * dep.dur;
    expect(planeAt(dep, tMid % dep.dur).fade).toBe(1);
  });

  it('heading is a unit tangent', () => {
    for (const arc of arcs) {
      const st = planeAt(arc, 23);
      expect(Math.hypot(st.du, st.dv)).toBeCloseTo(1, 6);
    }
  });
});

describe('air emission', () => {
  it('emits a bounded set of arc dashes, deterministically', () => {
    const a: Array<[number[], number, number]> = [];
    const b: Array<[number[], number, number]> = [];
    emitFlightArcs(AIRPORTS, 0.3, (pts, c, al) => a.push([pts, c, al]));
    emitFlightArcs(AIRPORTS, 0.3, (pts, c, al) => b.push([pts, c, al]));
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(0);
    expect(a.length).toBeLessThanOrEqual(AIRPORTS.length * 4 * 22);
    for (const [, color] of a) expect(color).toBe(AIR_PALETTE.arc);
  });

  it('emits a shadow + silhouette + tailfin per visible plane, shadow first', () => {
    const out: Array<{ color: number; alpha: number; pts: number[] }> = [];
    emitPlanes(AIRPORTS, 26, 0.3, (pts, color, alpha) => out.push({ pts, color, alpha }));
    expect(out.length).toBeGreaterThan(0);
    expect(out.length).toBeLessThanOrEqual(AIRPORTS.length * 4 * 3);
    const colors = out.map((o) => o.color);
    expect(colors).toContain(AIR_PALETTE.shadow);
    expect(colors).toContain(AIR_PALETTE.plane);
    expect(colors).toContain(AIR_PALETTE.tail);
    const iShadow = colors.indexOf(AIR_PALETTE.shadow);
    const iPlane = colors.indexOf(AIR_PALETTE.plane);
    expect(iShadow).toBeLessThan(iPlane);
    for (const o of out) {
      expect(o.alpha).toBeGreaterThan(0);
      expect(o.alpha).toBeLessThanOrEqual(1);
    }
  });

  it('the silhouette flies ABOVE its ground shadow (lift in −y)', () => {
    const groups: Array<{ shadowY: number; planeY: number }> = [];
    let current: { shadowY?: number; planeY?: number } = {};
    emitPlanes(AIRPORTS, 26, 0.3, (pts, color) => {
      const midY = pts.filter((_, i) => i % 2 === 1).reduce((s, y) => s + y, 0) / (pts.length / 2);
      if (color === AIR_PALETTE.shadow) current = { shadowY: midY };
      if (color === AIR_PALETTE.plane && current.shadowY !== undefined) {
        groups.push({ shadowY: current.shadowY, planeY: midY });
        current = {};
      }
    });
    expect(groups.length).toBeGreaterThan(0);
    // at t=26 the departures are mid-climb: every airborne plane sits
    // higher on screen (smaller y) than its shadow
    for (const g of groups) expect(g.planeY).toBeLessThanOrEqual(g.shadowY);
  });
});
