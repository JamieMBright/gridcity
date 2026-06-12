// The developer market: tenders and bids, awards and grudges, regulator
// complaints, scenario seeding and monthly town growth.

import { describe, expect, it } from 'vitest';
import { applyCommand } from '../src/sim/commands';
import type { SubAsset } from '../src/sim/assets';
import { GENS } from '../src/sim/catalog';
import {
  bidLeadDays,
  bumpMood,
  DEVELOPERS,
  START_MOOD,
  stepTenders,
} from '../src/sim/events/developers';
import { maybeSpawnApplication } from '../src/sim/events/applications';
import { NEW_ESTATES } from '../src/data/londonMap';
import { ZONE } from '../src/sim/map/types';
import { closePeriod, initialTargets, newPeriod } from '../src/sim/regulation/riio';
import { Rng } from '../src/sim/rng';
import {
  applyGrowth,
  deserialize,
  newContext,
  newGame,
  seedScenario,
  serialize,
  type SaveData,
} from '../src/sim/state';
import { advanceTime, derive, solveTick } from '../src/sim/tick';
import { makeTestMap, poweredFixture, setZone } from './helpers';

describe('generation tenders', () => {
  it('designating a site opens a tender, not an asset', () => {
    const map = makeTestMap(30, 30);
    const state = newGame();
    const r = applyCommand(state, map, {
      type: 'build',
      spec: { kind: 'gen', gen: 'gasCCGT', x: 5, y: 5 },
    });
    expect(r.ok).toBe(true);
    expect(state.assets.size).toBe(0);
    expect(state.tenders).toHaveLength(1);
    const t = state.tenders[0];
    expect(t?.status).toBe('open');
    expect(t?.closesMin).toBe(6 * 1440);
    expect(state.events.some((e) => e.msg.includes('site designated'))).toBe(true);
  });

  it('bids arrive deterministically and an award creates developer-owned plant', () => {
    const map = makeTestMap(30, 30);
    const state = newGame();
    applyCommand(state, map, {
      type: 'build',
      spec: { kind: 'gen', gen: 'gasCCGT', x: 5, y: 5 },
    });
    const tender = state.tenders[0];
    if (!tender) throw new Error('no tender');

    // same seed, same bids
    const probe = newGame();
    applyCommand(probe, map, {
      type: 'build',
      spec: { kind: 'gen', gen: 'gasCCGT', x: 5, y: 5 },
    });
    const probeTender = probe.tenders[0];
    const run = (s: typeof state, t: typeof tender): void => {
      const rng = new Rng(s.rngState);
      for (let i = 0; i < 60 && t.bids.length === 0; i++) {
        s.simTimeMin += 360;
        stepTenders(s, rng, 360);
      }
      s.rngState = rng.getState();
    };
    run(state, tender);
    if (probeTender) run(probe, probeTender);
    expect(tender.bids.length).toBeGreaterThan(0);
    expect(tender.bids).toEqual(probeTender?.bids);

    const bid = tender.bids[0];
    if (!bid) throw new Error('no bid');
    const dev = DEVELOPERS.find((d) => d.id === bid.developerId);
    expect((dev?.appetite.gasCCGT ?? 0) > 0).toBe(true);
    // strike within ±15% of the catalog marginal cost
    expect(bid.priceMWh).toBeGreaterThanOrEqual(GENS.gasCCGT.marginalCostK * 1000 * 0.85 - 1);
    expect(bid.priceMWh).toBeLessThanOrEqual(GENS.gasCCGT.marginalCostK * 1000 * 1.15 + 1);

    const before = state.devMood.get(bid.developerId) ?? START_MOOD;
    const res = applyCommand(state, map, {
      type: 'acceptBid',
      tenderId: tender.id,
      developerId: bid.developerId,
    });
    expect(res.ok).toBe(true);
    expect(tender.status).toBe('awarded');
    const asset = res.assetId !== undefined ? state.assets.get(res.assetId) : undefined;
    if (asset?.kind !== 'gen') throw new Error('no gen asset');
    expect(asset.developer).toBe(bid.developerId);
    expect(asset.liveAtMin).toBe(state.simTimeMin + bidLeadDays('gasCCGT', bid) * 1440);
    expect(state.devMood.get(bid.developerId)).toBe(before + 6);

    // the developer owns the plant: demolition refused
    const demo = applyCommand(state, map, { type: 'demolish', assetId: asset.id });
    expect(demo.ok).toBe(false);
    expect(demo.error).toMatch(/developer owns/);
  });

  it('award re-validates the site and fails if built over', () => {
    const map = makeTestMap(30, 30);
    const state = newGame();
    applyCommand(state, map, {
      type: 'build',
      spec: { kind: 'gen', gen: 'gasCCGT', x: 10, y: 10 },
    });
    const tender = state.tenders[0];
    if (!tender) throw new Error('no tender');
    tender.bids.push({ developerId: 1, priceMWh: 85, leadDaysDelta: 0 });
    // the site gets built over in the meantime
    applyCommand(state, map, { type: 'build', spec: { kind: 'sub', sub: 'dist', x: 10, y: 10 } });
    const res = applyCommand(state, map, {
      type: 'acceptBid',
      tenderId: tender.id,
      developerId: 1,
    });
    expect(res.ok).toBe(false);
    expect(tender.status).toBe('open');
    expect(state.events.some((e) => e.msg.includes('award failed'))).toBe(true);
  });

  it('withdrawing a tender sours every bidder; snubbed bidders lose less', () => {
    const map = makeTestMap(30, 30);
    const state = newGame();
    applyCommand(state, map, {
      type: 'build',
      spec: { kind: 'gen', gen: 'gasCCGT', x: 5, y: 5 },
    });
    const tender = state.tenders[0];
    if (!tender) throw new Error('no tender');
    tender.bids.push(
      { developerId: 1, priceMWh: 80, leadDaysDelta: -10 },
      { developerId: 4, priceMWh: 90, leadDaysDelta: 5 },
    );
    const r = applyCommand(state, map, { type: 'declineTender', tenderId: tender.id });
    expect(r.ok).toBe(true);
    expect(tender.status).toBe('lapsed');
    expect(state.devMood.get(1)).toBe(START_MOOD - 12);
    expect(state.devMood.get(4)).toBe(START_MOOD - 12);

    // snubbed (losing) bidders on an awarded tender only lose 8
    applyCommand(state, map, {
      type: 'build',
      spec: { kind: 'gen', gen: 'gasCCGT', x: 15, y: 15 },
    });
    const t2 = state.tenders[1];
    if (!t2) throw new Error('no tender');
    t2.bids.push(
      { developerId: 1, priceMWh: 80, leadDaysDelta: 0 },
      { developerId: 4, priceMWh: 90, leadDaysDelta: 0 },
    );
    applyCommand(state, map, { type: 'acceptBid', tenderId: t2.id, developerId: 1 });
    expect(state.devMood.get(1)).toBe(START_MOOD - 12 + 6);
    expect(state.devMood.get(4)).toBe(START_MOOD - 12 - 8);
  });

  it('a bid-less tender is extended once, then lapses', () => {
    const map = makeTestMap(30, 30);
    const state = newGame();
    applyCommand(state, map, {
      type: 'build',
      spec: { kind: 'gen', gen: 'nuclear', x: 5, y: 5 },
    });
    // (nuclear on a test map fails siting — use coal-free land plant instead)
    expect(state.tenders).toHaveLength(0);
    applyCommand(state, map, {
      type: 'build',
      spec: { kind: 'gen', gen: 'gasPeaker', x: 5, y: 5 },
    });
    const tender = state.tenders[0];
    if (!tender) throw new Error('no tender');
    const rng = new Rng(1);
    const firstClose = tender.closesMin;
    state.simTimeMin = firstClose + 1;
    stepTenders(state, rng, 0); // dtMin 0: no bids can arrive, deadline logic only
    expect(tender.status).toBe('open');
    expect(tender.extended).toBe(true);
    expect(tender.closesMin).toBe(firstClose + 6 * 1440);
    state.simTimeMin = tender.closesMin + 1;
    stepTenders(state, rng, 0);
    expect(tender.status).toBe('lapsed');
    expect(state.events.some((e) => e.msg.includes('lapsed'))).toBe(true);
  });
});

describe('developer mood and the regulator', () => {
  it('a conglomerate crossing below 40 complains once per crossing', () => {
    const state = newGame();
    const cong = DEVELOPERS.find((d) => d.conglomerate);
    if (!cong) throw new Error('no conglomerate');
    state.devMood.set(cong.id, 42);
    bumpMood(state, cong.id, -3);
    expect(state.period.complaints).toBe(1);
    expect(state.events.some((e) => e.msg.includes('lodged a complaint'))).toBe(true);
    bumpMood(state, cong.id, -3); // already below: no second complaint
    expect(state.period.complaints).toBe(1);
    bumpMood(state, cong.id, 15);
    bumpMood(state, cong.id, -20); // a fresh crossing complains again
    expect(state.period.complaints).toBe(2);

    // a small independent suffering the same slide stays out of court
    const indie = DEVELOPERS.find((d) => !d.conglomerate);
    if (!indie) throw new Error('no independent');
    state.devMood.set(indie.id, 42);
    bumpMood(state, indie.id, -10);
    expect(state.period.complaints).toBe(2);
  });

  it('complaints dent the RIIO composite, capped at 12 points', () => {
    const actuals = {
      bill: 900,
      ci: 60,
      cml: 90,
      carbon: 250,
      curtailedFirm: 20_000,
      satisfaction: 60,
    };
    const p = newPeriod(1, 0, initialTargets());
    const clean = closePeriod(p, actuals);
    p.complaints = 2;
    expect(closePeriod(p, actuals).composite).toBe(clean.composite - 6);
    p.complaints = 10;
    expect(closePeriod(p, actuals).composite).toBe(clean.composite - 12);
  });
});

describe('town growth', () => {
  it('monthly infill mutates the map and demand, and replays from a save', () => {
    const { state, ctx } = poweredFixture();
    state.speed = 16;
    state.simTimeMin = 43_200 - 60; // just before the month boundary
    advanceTime(state);
    solveTick(state, ctx, derive(state, ctx), true);

    expect(state.growth.length).toBeGreaterThan(0);
    expect(state.growth.length).toBeLessThanOrEqual(3);
    for (const g of state.growth) {
      expect(g.zone).toBe(ZONE.suburb);
      expect(ctx.map.zone[g.i]).toBe(ZONE.suburb);
      expect(ctx.map.customers[g.i]).toBe(g.customers);
      expect(ctx.demand.byTile.get(g.i) ?? 0).toBeGreaterThan(0);
    }
    expect(state.events.some((e) => e.msg.includes('new homes'))).toBe(true);

    // append-only record round-trips and replays onto a fresh map
    const restored = deserialize(JSON.parse(JSON.stringify(serialize(state))) as SaveData);
    expect(restored.growth).toEqual(state.growth);
    const fresh = makeTestMap(30, 30);
    applyGrowth(fresh, restored.growth);
    const first = state.growth[0];
    if (!first) throw new Error('no growth');
    expect(fresh.zone[first.i]).toBe(ZONE.suburb);
    expect(fresh.customers[first.i]).toBe(first.customers);
  });
});

describe('scenario seeding', () => {
  it('seedScenario plants the iDNO estate subs and starter applications', () => {
    const state = newGame();
    const ctx = newContext();
    seedScenario(state, ctx);

    const idnos = [...state.assets.values()].filter(
      (a): a is SubAsset => a.kind === 'sub' && a.idno === true,
    );
    expect(idnos).toHaveLength(NEW_ESTATES.length);
    for (const e of NEW_ESTATES) {
      const sub = idnos.find((a) => a.x === e.x && a.y === e.y);
      expect(sub?.kind === 'sub' && sub.sub === 'dist' && sub.mva === 10).toBe(true);
      expect(sub?.kind === 'sub' && sub.mvaAuto).toBe(false);
    }

    const apps = state.applications.filter((a) => a.status === 'open');
    expect(apps.length).toBeGreaterThanOrEqual(2);
    expect(apps.length).toBeLessThanOrEqual(3);
    expect(apps.some((a) => a.kind === 'solarFarm')).toBe(true);
    for (const a of apps) {
      expect(a.decideByMin).toBe(30 * 1440);
      expect(ctx.map.zone[a.y * ctx.map.width + a.x]).toBeDefined();
    }
    // a fresh unit-test game stays unseeded
    expect(newGame().assets.size).toBe(0);
    expect(newGame().applications).toHaveLength(0);
  });
});

describe('data-centre applications', () => {
  it('wants dense urban tiles and 40–120 MW', () => {
    const map = makeTestMap(20, 20);
    for (let y = 0; y < 20; y++) {
      for (let x = 0; x < 20; x++) setZone(map, x, y, ZONE.urbanCore); // 120 cust/tile
    }
    const rng = new Rng(7);
    for (let i = 0; i < 4000; i++) {
      const app = maybeSpawnApplication(map, rng, 1440, 0, 50_000, 1, () => false);
      if (app?.kind !== 'dataCentre') continue;
      expect(map.customers[app.y * map.width + app.x] ?? 0).toBeGreaterThanOrEqual(60);
      expect(app.mw).toBeGreaterThanOrEqual(40);
      expect(app.mw).toBeLessThanOrEqual(120);
      expect(app.customers).toBe(50);
      return;
    }
    throw new Error('no data centre spawned');
  });
});
