// ROADMAP #14: quarterly CfD allocation rounds — every open designated
// site collects sealed strike bids at once, the inbox clears the round
// cheapest-everywhere (sequential acceptBid awards), and developers who
// bid in the round but won nothing sour slightly when it settles.

import { describe, expect, it } from 'vitest';
import { applyCommand } from '../src/sim/commands';
import {
  DEVELOPERS,
  devCurtailK,
  inheritCurtailPrices,
  nextRoundOpensMin,
  ROUND_INTERVAL_MIN,
  sealedRoundBid,
  START_MOOD,
  stepTenders,
  type Bid,
  type Tender,
} from '../src/sim/events/developers';
import { Rng } from '../src/sim/rng';
import { deserialize, newGame, serialize, type GameState } from '../src/sim/state';
import { makeTestMap } from './helpers';

/** A fresh game with two designated sites (gas + solar) opened one day
 *  before the first quarterly round. */
function roundFixture(): { state: GameState; map: ReturnType<typeof makeTestMap> } {
  const map = makeTestMap(30, 30);
  const state = newGame();
  state.simTimeMin = ROUND_INTERVAL_MIN - 1440;
  applyCommand(state, map, { type: 'build', spec: { kind: 'gen', gen: 'gasCCGT', x: 5, y: 5 } });
  applyCommand(state, map, {
    type: 'build',
    spec: { kind: 'gen', gen: 'solarFarm', x: 20, y: 20 },
  });
  return { state, map };
}

const biddersFor = (gen: 'gasCCGT' | 'solarFarm'): number[] =>
  DEVELOPERS.filter((d) => (d.appetite[gen] ?? 0) > 0).map((d) => d.id);

const cheapest = (t: Tender): Bid => {
  const b = [...t.bids].sort((a, b) => a.priceMWh - b.priceMWh)[0];
  if (!b) throw new Error('no bids');
  return b;
};

describe('allocation round opening (#14)', () => {
  it('opens on the quarterly schedule and seals bids on every open tender', () => {
    const { state } = roundFixture();
    expect(state.roundOpensMin).toBe(ROUND_INTERVAL_MIN);

    // a day early: no round yet
    const rng = new Rng(state.rngState);
    stepTenders(state, rng, 30);
    expect(state.roundId).toBe(0);

    state.simTimeMin = ROUND_INTERVAL_MIN;
    stepTenders(state, rng, 30);
    expect(state.roundId).toBe(1);
    expect(state.roundOpensMin).toBe(2 * ROUND_INTERVAL_MIN);
    expect(state.events.some((e) => e.msg.includes('Allocation Round 1 open'))).toBe(true);

    // EVERY open tender is swept and EVERY developer with appetite bid
    for (const t of state.tenders) {
      expect(t.status).toBe('open');
      expect(t.roundId).toBe(1);
      const expected = biddersFor(t.gen as 'gasCCGT' | 'solarFarm');
      expect([...t.bids.map((b) => b.developerId)].sort((a, b) => a - b)).toEqual(expected);
      for (const b of t.bids) expect(b.priceMWh).toBeGreaterThan(0);
    }
  });

  it('is deterministic: the same seed seals the same round', () => {
    const run = (): Tender[] => {
      const { state } = roundFixture();
      state.simTimeMin = ROUND_INTERVAL_MIN;
      const rng = new Rng(state.rngState);
      stepTenders(state, rng, 30);
      return state.tenders;
    };
    expect(run()).toEqual(run());
  });

  it('an empty quarter (no open tenders) passes silently', () => {
    const state = newGame();
    state.simTimeMin = 3 * ROUND_INTERVAL_MIN; // a long-idle save catches up
    stepTenders(state, new Rng(1), 30);
    expect(state.roundId).toBe(3);
    expect(state.roundClearedId).toBe(3);
    expect(state.events).toHaveLength(0);
  });

  it('sealed bids shade with mood and eagerness; trickle bids stay classic', () => {
    const greenfield = DEVELOPERS.find((d) => d.id === 2);
    const sunpenny = DEVELOPERS.find((d) => d.id === 5); // solar appetite 1.8
    const thames = DEVELOPERS.find((d) => d.id === 3); // solar appetite 0.8
    if (!greenfield || !sunpenny || !thames) throw new Error('missing developers');
    // same RNG draws, lower mood → padded price
    const happy = sealedRoundBid(new Rng(7), greenfield, 'solarFarm', START_MOOD);
    const soured = sealedRoundBid(new Rng(7), greenfield, 'solarFarm', 20);
    expect(soured.priceMWh).toBeGreaterThan(happy.priceMWh);
    // same RNG draws, hungrier developer → sharper pencil
    const eager = sealedRoundBid(new Rng(7), sunpenny, 'solarFarm', START_MOOD);
    const lukewarm = sealedRoundBid(new Rng(7), thames, 'solarFarm', START_MOOD);
    expect(eager.priceMWh).toBeLessThan(lukewarm.priceMWh);
  });
});

describe('clearing a round (#14)', () => {
  it('cheapest-everywhere awards settle the round and sour the losers −4', () => {
    const { state, map } = roundFixture();
    state.simTimeMin = ROUND_INTERVAL_MIN;
    const rng = new Rng(state.rngState);
    stepTenders(state, rng, 30);

    // what the inbox's "clear round" button does: sequential acceptBid
    // of the cheapest bid on every tender in the round
    const winners = new Set<number>();
    const expected = new Map(state.devMood);
    for (const t of state.tenders) {
      const best = cheapest(t);
      winners.add(best.developerId);
      for (const b of t.bids) {
        const delta = b.developerId === best.developerId ? 6 : -8;
        expected.set(b.developerId, (expected.get(b.developerId) ?? START_MOOD) + delta);
      }
      const r = applyCommand(state, map, {
        type: 'acceptBid',
        tenderId: t.id,
        developerId: best.developerId,
      });
      expect(r.ok).toBe(true);
    }
    expect(state.tenders.every((t) => t.status === 'awarded')).toBe(true);

    // the next step settles the clearance: round losers sour another −4
    stepTenders(state, rng, 30);
    expect(state.roundClearedId).toBe(1);
    expect(state.events.some((e) => e.msg.includes('Allocation Round 1 cleared'))).toBe(true);
    const losers = new Set<number>();
    for (const t of state.tenders) {
      for (const b of t.bids) if (!winners.has(b.developerId)) losers.add(b.developerId);
    }
    expect(losers.size).toBeGreaterThan(0);
    for (const d of DEVELOPERS) {
      const extra = losers.has(d.id) ? -4 : 0;
      expect(state.devMood.get(d.id)).toBe(
        Math.max(0, Math.min(100, (expected.get(d.id) ?? START_MOOD) + extra)),
      );
    }

    // settling is once-only: another step changes no moods
    const after = new Map(state.devMood);
    stepTenders(state, rng, 30);
    expect(state.devMood).toEqual(after);

    // #17: the awarded plants carry their developer's curtailment price
    for (const a of state.assets.values()) {
      if (a.kind !== 'gen' || a.developer === undefined) continue;
      expect(a.curtailK).toBe(devCurtailK(a.developer));
    }
  });

  it('a tender still open at the next round migrates into it', () => {
    const { state } = roundFixture();
    state.simTimeMin = ROUND_INTERVAL_MIN;
    const rng = new Rng(state.rngState);
    stepTenders(state, rng, 30);
    expect(state.tenders.every((t) => t.roundId === 1)).toBe(true);

    state.simTimeMin = 2 * ROUND_INTERVAL_MIN;
    stepTenders(state, rng, 30);
    expect(state.roundId).toBe(2);
    expect(state.tenders.every((t) => t.roundId === 2)).toBe(true);
    // round 1 emptied forward: cleared silently, nobody soured
    expect(state.roundClearedId).toBe(1);
    for (const d of DEVELOPERS) expect(state.devMood.get(d.id)).toBe(START_MOOD);
  });
});

describe('saves stay additive (#14/#17)', () => {
  it('round state and curtail prices round-trip', () => {
    const { state, map } = roundFixture();
    state.simTimeMin = ROUND_INTERVAL_MIN;
    const rng = new Rng(state.rngState);
    stepTenders(state, rng, 30);
    const t0 = state.tenders[0];
    if (!t0) throw new Error('no tender');
    applyCommand(state, map, {
      type: 'acceptBid',
      tenderId: t0.id,
      developerId: cheapest(t0).developerId,
    });
    inheritCurtailPrices(state);

    const back = deserialize(JSON.parse(JSON.stringify(serialize(state))) as never);
    expect(back.roundOpensMin).toBe(state.roundOpensMin);
    expect(back.roundId).toBe(1);
    expect(back.roundClearedId).toBe(state.roundClearedId);
    expect(back.tenders).toEqual(state.tenders);
    const plant = [...back.assets.values()].find((a) => a.kind === 'gen');
    if (plant?.kind !== 'gen') throw new Error('no plant');
    expect(plant.curtailK).toBe(devCurtailK(plant.developer ?? -1));
  });

  it('hydrates pre-round saves onto the quarterly schedule (no version bump)', () => {
    const state = newGame();
    state.simTimeMin = 100_000;
    const data = serialize(state);
    delete data.roundOpensMin;
    delete data.roundId;
    delete data.roundClearedId;
    const back = deserialize(data);
    expect(back.roundId).toBe(0);
    expect(back.roundClearedId).toBe(0);
    expect(back.roundOpensMin).toBe(nextRoundOpensMin(100_000));
    expect(back.roundOpensMin).toBeGreaterThan(100_000);
  });
});
