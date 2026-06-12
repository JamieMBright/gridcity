// Underground rebuilds (lines + substations) and the auto-connect
// placement setting.

import { describe, expect, it } from 'vitest';
import { SUB_UG_MUL, subCapexK, SUBS } from '../src/sim/catalog';
import { applyCommand } from '../src/sim/commands';
import { priceLine } from '../src/sim/cost';
import { subMva } from '../src/sim/assets';
import { assetCapexK } from '../src/sim/regulation/bill';
import { newGame } from '../src/sim/state';
import { derive } from '../src/sim/tick';
import { makeTestMap, mustApply, poweredFixture } from './helpers';

describe('convertLine (underground an overhead line)', () => {
  it('rebuilds the line as a cable at the full underground price', () => {
    const { state, ctx, ids } = poweredFixture();
    state.lineVeg.set(ids.line132, 0.7);
    const r = applyCommand(state, ctx.map, { type: 'convertLine', assetId: ids.line132 });
    expect(r.ok).toBe(true);
    const line = state.assets.get(ids.line132);
    if (!line || line.kind !== 'line') throw new Error('line vanished');
    expect(line.build).toBe('underground');
    expect(line.pylons).toEqual([]);
    expect(line.capexK).toBe(priceLine(ctx.map, 132, 'underground', 5, 5, 15, 15).capexK);
    expect(state.lineVeg.get(ids.line132)).toBeUndefined();
  });

  it('refuses a second conversion and unknown assets', () => {
    const { state, ctx, ids } = poweredFixture();
    mustApply(state, ctx.map, { type: 'convertLine', assetId: ids.line33 });
    expect(applyCommand(state, ctx.map, { type: 'convertLine', assetId: ids.line33 }).ok).toBe(false);
    expect(applyCommand(state, ctx.map, { type: 'convertLine', assetId: 9999 }).ok).toBe(false);
    expect(applyCommand(state, ctx.map, { type: 'convertLine', assetId: ids.grid }).ok).toBe(false);
  });
});

describe('convertSub (underground GIS rebuild)', () => {
  it('flags the sub and multiplies its billed capex', () => {
    const { state, ctx, ids } = poweredFixture();
    const r = applyCommand(state, ctx.map, { type: 'convertSub', assetId: ids.grid });
    expect(r.ok).toBe(true);
    const sub = state.assets.get(ids.grid);
    if (!sub || sub.kind !== 'sub') throw new Error('sub vanished');
    expect(sub.underground).toBe(true);
    expect(assetCapexK(sub)).toBe(subCapexK(sub.sub, subMva(sub)) * SUB_UG_MUL);
    expect(applyCommand(state, ctx.map, { type: 'convertSub', assetId: ids.grid }).ok).toBe(false);
  });

  it("refuses the iDNO's kit", () => {
    const { state, ctx, ids } = poweredFixture();
    const sub = state.assets.get(ids.dist);
    if (!sub || sub.kind !== 'sub') throw new Error('sub vanished');
    sub.idno = true;
    expect(applyCommand(state, ctx.map, { type: 'convertSub', assetId: ids.dist }).ok).toBe(false);
  });
});

describe('section undergrounding', () => {
  it('buries only the clicked span, surfacing at sealing-end towers', () => {
    const { state, ctx, ids } = poweredFixture();
    const line = state.assets.get(ids.line132);
    if (!line || line.kind !== 'line') throw new Error('no line');
    expect((line.pylons ?? []).length).toBeGreaterThan(1); // real spans exist
    const r = applyCommand(state, ctx.map, {
      type: 'undergroundSection',
      lineId: ids.line132,
      x: 10,
      y: 10, // mid-route: a span between two pylons
    });
    expect(r.ok).toBe(true);
    expect(state.assets.get(ids.line132)).toBeUndefined();
    const lines = [...state.assets.values()].filter((a) => a.kind === 'line');
    const buried = lines.filter((l) => l.kind === 'line' && l.build === 'underground');
    const overhead = lines.filter(
      (l) => l.kind === 'line' && l.build === 'overhead' && l.level === 132,
    );
    expect(buried.length).toBe(1);
    expect(overhead.length).toBe(2);
    const seals = [...state.assets.values()].filter(
      (a) => a.kind === 'sub' && a.sub === 'tee' && a.teeLevel === 132,
    );
    expect(seals.length).toBe(2);
    // the buried leg runs between the two sealing ends
    const cable = buried[0];
    if (!cable || cable.kind !== 'line') throw new Error('no cable');
    expect(seals.map((s) => s.id).sort()).toEqual([cable.a, cable.b].sort());
  });

  it('a span touching an endpoint needs only one sealing end', () => {
    const { state, ctx, ids } = poweredFixture();
    const r = applyCommand(state, ctx.map, {
      type: 'undergroundSection',
      lineId: ids.line132,
      x: 5,
      y: 5, // right at endpoint A: first span
    });
    expect(r.ok).toBe(true);
    const seals = [...state.assets.values()].filter((a) => a.kind === 'sub' && a.sub === 'tee');
    expect(seals.length).toBe(1);
  });

  it('overhead lines past homes blight the council; the buried section clears it', () => {
    const { state, ctx } = poweredFixture();
    // route the 33 kV through the suburb's council
    for (const i of ctx.map.council.keys()) ctx.map.council[i] = 0;
    ctx.map.councils.push({
      id: 0,
      name: 'Test Borough',
      blurb: '',
      affluence: 0.5,
      ambition: 0.5,
    });
    const before = derive(state, ctx);
    expect(before.blight.get(0) ?? 0).toBeGreaterThan(0);
    for (const a of state.assets.values()) {
      if (a.kind === 'line') a.build = 'underground';
    }
    state.assetsVersion++;
    const after = derive(state, ctx);
    expect(after.blight.get(0) ?? 0).toBe(0);
  });
});

describe("tee'd connections", () => {
  it('splits the circuit at a junction and runs the new leg — one command', () => {
    const { state, ctx, ids } = poweredFixture();
    const newSub = mustApply(state, ctx.map, {
      type: 'build',
      spec: { kind: 'sub', sub: 'grid', x: 12, y: 5 },
    });
    const before = [...state.assets.values()].filter((a) => a.kind === 'line').length;
    const r = applyCommand(state, ctx.map, {
      type: 'tee',
      lineId: ids.line132,
      x: 9,
      y: 9,
      fromAssetId: newSub,
      build: 'overhead',
    });
    expect(r.ok).toBe(true);
    expect(state.assets.get(ids.line132)).toBeUndefined(); // split in two
    const tee = r.assetId !== undefined ? state.assets.get(r.assetId) : undefined;
    if (!tee || tee.kind !== 'sub') throw new Error('no tee junction');
    expect(tee.sub).toBe('tee');
    expect(tee.teeLevel).toBe(132);
    const lines = [...state.assets.values()].filter((a) => a.kind === 'line');
    expect(lines.length).toBe(before + 2); // two halves + the new leg
    const touching = lines.filter(
      (l) => l.kind === 'line' && (l.a === tee.id || l.b === tee.id),
    );
    expect(touching.length).toBe(3); // a real three-ended circuit
    expect(touching.every((l) => l.kind === 'line' && l.level === 132)).toBe(true);
  });

  it('refuses a tee from an asset without the bay, leaving the line intact', () => {
    const { state, ctx, ids } = poweredFixture();
    const r = applyCommand(state, ctx.map, {
      type: 'tee',
      lineId: ids.line132,
      x: 9,
      y: 9,
      fromAssetId: ids.dist, // 33 kV only
      build: 'overhead',
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/132 kV bay/);
    expect(state.assets.get(ids.line132)).toBeDefined();
  });
});

describe('auto-connect placement setting', () => {
  it('feeds a new dist sub from the nearest 33 kV bay in one command', () => {
    const { state, ctx } = poweredFixture();
    const before = [...state.assets.values()].filter((a) => a.kind === 'line').length;
    const id = mustApply(state, ctx.map, {
      type: 'build',
      spec: { kind: 'sub', sub: 'dist', x: 22, y: 15, autoConnect: true },
    });
    const lines = [...state.assets.values()].filter((a) => a.kind === 'line');
    expect(lines.length).toBe(before + 1);
    const fed = lines.some(
      (l) => l.kind === 'line' && l.level === 33 && (l.a === id || l.b === id),
    );
    expect(fed).toBe(true);
  });

  it('connects every bay of a multi-winding sub it can reach', () => {
    const { state, ctx } = poweredFixture();
    // a bulk BSP near the powered grid sub: its 132 and 33 bays both have
    // neighbours in reach (the grid sub + dist sub), 400 has none
    const id = mustApply(state, ctx.map, {
      type: 'build',
      spec: { kind: 'sub', sub: 'bulk', x: 12, y: 20, autoConnect: true },
    });
    const mine = [...state.assets.values()].filter(
      (l) => l.kind === 'line' && (l.a === id || l.b === id),
    );
    expect(mine.length).toBeGreaterThanOrEqual(1);
    expect(SUBS.bulk.levels).toContain(400);
    expect(mine.every((l) => l.kind === 'line' && l.level !== 400)).toBe(true);
  });

  it('does nothing without the flag, notes when nothing is in reach', () => {
    const map = makeTestMap(30, 30);
    const state = newGame();
    mustApply(state, map, {
      type: 'build',
      spec: { kind: 'sub', sub: 'dist', x: 5, y: 5, autoConnect: true },
    });
    expect([...state.assets.values()].some((a) => a.kind === 'line')).toBe(false);
    expect(state.events.some((e) => e.msg.includes('auto-connect'))).toBe(true);
  });
});
