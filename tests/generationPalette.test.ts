// Generation build-palette overhaul (owner, 2026-06-26), four items:
//  1. the hydrogen electrolyser is a LOAD, not generation — it never
//     dispatches as a unit and is filed under the demand-side palette;
//  2. a generator carries a connection-voltage TIER with its own MW band,
//     enforced at build time (too-big solar refused on LV, allowed on 400 kV);
//  3. the palette/hotkeys sort generation by voltage and hydro is numbered;
//  4. a hydro dam straddles the river bank-to-bank (oriented spanning
//     footprint + axis).

import { describe, expect, it } from 'vitest';
import { applyCommand, checkBuild, damAxisAt, damFootprint, footprintTiles } from '../src/sim/commands';
import {
  GENS,
  GEN_PALETTE_ORDER,
  LOAD_PALETTE_ORDER,
  TIER_KV,
  defaultTier,
  genTiers,
  isLoadGen,
  lowestTierKv,
  tierForKv,
  tierMarker,
  type GenType,
} from '../src/sim/catalog';
import { deriveNetwork, genLevel, type GenAsset } from '../src/sim/assets';
import { runDispatch } from '../src/sim/market/dispatch';
import { deserialize, newGame, serialize, type GameState } from '../src/sim/state';
import { makeTestMap } from './helpers';
import { TERRAIN, type CityMap } from '../src/sim/map/types';
import { LONDON_PROFILE } from '../src/sim/powerProfile';

type BuildResult = { ok: true; asset: GenAsset } | { ok: false; error?: string | undefined };

/** Designate a generation tender at (x,y), award the only bid, return the
 *  placed asset. Goes through the real build → bid → acceptBid path so the
 *  tier/axis stamping is exercised end to end. */
function buildGen(
  state: GameState,
  map: CityMap,
  gen: GenType,
  x: number,
  y: number,
  opts: { mw?: number; tierKv?: string } = {},
): BuildResult {
  const r = applyCommand(state, map, {
    type: 'build',
    spec: {
      kind: 'gen',
      gen,
      x,
      y,
      ...(opts.mw !== undefined ? { mw: opts.mw } : {}),
      ...(opts.tierKv !== undefined ? { tierKv: opts.tierKv as never } : {}),
    },
  });
  if (!r.ok) return { ok: false, error: r.error };
  const tender = state.tenders.find((t) => t.status === 'open' && t.x === x && t.y === y)!;
  tender.bids.push({
    developerId: 2,
    priceMWh: 70,
    leadDaysDelta: 0,
    ...(tender.fitMW !== undefined ? { mw: tender.fitMW } : {}),
  });
  const aw = applyCommand(state, map, { type: 'acceptBid', tenderId: tender.id, developerId: 2 });
  if (!aw.ok) return { ok: false, error: aw.error };
  const asset = state.assets.get(aw.assetId!)!;
  if (asset.kind !== 'gen') return { ok: false, error: 'not a gen' };
  return { ok: true, asset };
}

// ────────────────────────────────────────────────────────────────────────
describe('item 1 — the electrolyser is a LOAD, not generation', () => {
  it('is classified as a load in the catalog', () => {
    expect(isLoadGen('electrolyser')).toBe(true);
    expect(GENS.electrolyser.role).toBe('load');
  });

  it('never appears in the generation palette order, only the demand order', () => {
    expect(GEN_PALETTE_ORDER).not.toContain('electrolyser');
    expect(LOAD_PALETTE_ORDER).toContain('electrolyser');
    // and nothing in the generation order is a load
    for (const g of GEN_PALETTE_ORDER) expect(isLoadGen(g)).toBe(false);
  });

  it('never dispatches as a generation unit (it only soaks surplus)', () => {
    // an electrolyser connected to a single bus, with NO generation: dispatch
    // must not stack it as a unit — its genMW is only ever ≤ 0 (a load draw),
    // never a positive supply injection.
    const map = makeTestMap(20, 20);
    const state = newGame();
    const built = buildGen(state, map, 'electrolyser', 10, 10);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const id = built.asset.id;
    built.asset.liveAtMin = 0;
    const net = deriveNetwork(state.assets.values());
    const res = runDispatch(net, state.assets.values(), new Map(), {
      simTimeMin: 12 * 60,
      weather: { cloud: 0.3, wind: 0.5 },
      soc: new Map(),
      dtMin: 30,
      tech: { smartEv: false, flexMarket: false },
      weatherProfile: LONDON_PROFILE.weather,
      power: LONDON_PROFILE.power,
      market: LONDON_PROFILE.market,
      generation: LONDON_PROFILE.generation,
    });
    const mw = res.genMW.get(id) ?? 0;
    expect(mw).toBeLessThanOrEqual(0); // a load draw or nothing — never supply
  });
});

// ────────────────────────────────────────────────────────────────────────
describe('item 2 — voltage tiers with per-tier MW bands, enforced at build', () => {
  it('solar offers LV→400 kV tiers, sorted low to high', () => {
    const kvs = genTiers('solarFarm').map((t) => t.kv);
    expect(kvs).toEqual(['LV', '11', '33', '132', '400']);
    // strictly ascending kV
    const nums = kvs.map((k) => TIER_KV[k]);
    expect([...nums].sort((a, b) => a - b)).toEqual(nums);
  });

  it('wind offers a single-turbine tier and a transmission farm tier', () => {
    expect(genTiers('windOnshore').map((t) => t.kv)).toEqual(['11', '33', '132']);
    expect(genTiers('windOffshore').map((t) => t.kv)).toEqual(['132', '400']);
  });

  it('every multi-tier band steps UP with voltage and the default sits in range', () => {
    for (const g of ['solarFarm', 'windOnshore', 'windOffshore'] as const) {
      const tiers = genTiers(g);
      for (let i = 1; i < tiers.length; i++) {
        expect(tiers[i]!.maxMW).toBeGreaterThanOrEqual(tiers[i - 1]!.maxMW);
      }
      const def = defaultTier(g);
      expect(GENS[g].capacityMW).toBeGreaterThanOrEqual(def.minMW);
    }
  });

  it('refuses a too-big solar farm on the LV tier', () => {
    const map = makeTestMap(40, 40);
    const state = newGame();
    // 40 MW of solar onto a low-voltage feeder is physically nonsense
    const r = applyCommand(state, map, {
      type: 'build',
      spec: { kind: 'gen', gen: 'solarFarm', x: 10, y: 10, mw: 40, tierKv: 'LV' },
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/LV kV band/);
  });

  it('allows that same large solar farm on the 400 kV tier', () => {
    const map = makeTestMap(40, 40);
    const state = newGame();
    const res = buildGen(state, map, 'solarFarm', 10, 10, { mw: 200, tierKv: '400' });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    // it lands at the chosen voltage: the asset's connection level is 400 kV
    expect(genLevel(res.asset)).toBe(400);
    expect(res.asset.tierKv).toBe('400');
  });

  it('the chosen tier sets the modelled bus level for the network + dispatch', () => {
    const map = makeTestMap(40, 40);
    const state = newGame();
    // an 11 kV community array evacuates through the 33 kV distribution bus
    const res = buildGen(state, map, 'solarFarm', 10, 10, { mw: 3, tierKv: '11' });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(genLevel(res.asset)).toBe(33);
    // the derived network places the gen bus at that level
    const net = deriveNetwork([res.asset]);
    expect(net.buses.some((b) => b.level === 33)).toBe(true);
  });

  it('a default-tier farm clamps to the voltage ceiling, not rejected', () => {
    const map = makeTestMap(40, 40);
    const state = newGame();
    // ask for far more than the 33 kV default band allows, with no explicit
    // tier: it lands clamped to the 33 kV ceiling (50 MW), never refused
    const r = applyCommand(state, map, {
      type: 'build',
      spec: { kind: 'gen', gen: 'solarFarm', x: 10, y: 10, mw: 500 },
    });
    expect(r.ok).toBe(true);
    const t = state.tenders.find((tn) => tn.x === 10 && tn.y === 10)!;
    expect(t.fitMW).toBeLessThanOrEqual(tierForKv('solarFarm', '33')!.maxMW);
  });

  it('a single-tier technology keeps its catalog level (back-compat)', () => {
    // gas/nuclear/etc. have one implicit tier == their catalog level
    expect(genTiers('gasCCGT')).toHaveLength(1);
    expect(defaultTier('nuclear').level).toBe(GENS.nuclear.level);
    // the implicit tier covers the whole catalog plant
    expect(genTiers('coal')[0]!.maxMW).toBe(GENS.coal.capacityMW);
  });
});

// ────────────────────────────────────────────────────────────────────────
describe('item 3 — palette sorts by voltage and hydro is numbered', () => {
  it('generation is sorted ascending by lowest connection voltage', () => {
    const lows = GEN_PALETTE_ORDER.map((g) => lowestTierKv(g));
    expect([...lows].sort((a, b) => a - b)).toEqual(lows);
  });

  it('hydro appears in the numbered roster (no longer unallocated)', () => {
    expect(GEN_PALETTE_ORDER).toContain('hydro');
    // it lands within the first ten, so it takes a number-row key
    expect(GEN_PALETTE_ORDER.indexOf('hydro')).toBeLessThan(10);
  });

  it('the tier marker reads as a kV range for multi-tier tech', () => {
    expect(tierMarker('solarFarm')).toBe('LV–400 kV');
    expect(tierMarker('windOnshore')).toBe('11–132 kV');
    expect(tierMarker('gasCCGT')).toBe('132 kV'); // single tier
  });
});

// ────────────────────────────────────────────────────────────────────────
describe('item 4 — the hydro dam straddles the river bank-to-bank', () => {
  /** A map with a straight river channel `w` tiles wide running N–S at
   *  columns [cx, cx+w), with dry land either side. */
  function riverMap(w: number, cx: number, vertical: boolean): CityMap {
    const map = makeTestMap(40, 40);
    for (let a = 0; a < 40; a++) {
      for (let b = cx; b < cx + w; b++) {
        const i = vertical ? a * map.width + b : b * map.width + a;
        map.terrain[i] = TERRAIN.water;
      }
    }
    return map;
  }

  it('detects the river axis: an N–S channel orients the wall E–W', () => {
    const map = riverMap(3, 18, true); // river runs N–S (vertical)
    // a bank tile just west of the channel
    expect(damAxisAt(map, 17, 20)).toBe('ns');
    // an E–W channel reads the other way
    const map2 = riverMap(3, 18, false);
    expect(damAxisAt(map2, 20, 17)).toBe('ew');
  });

  it('the dam footprint spans 3 tiles across the channel, oriented by axis', () => {
    expect(damFootprint('ns')).toEqual([3, 2]); // wall spans E–W (x)
    expect(damFootprint('ew')).toEqual([2, 3]); // wall spans N–S (y)
  });

  it('places a dam on a bank, stamping its axis and spanning footprint', () => {
    const map = riverMap(3, 18, true); // N–S river
    const state = newGame();
    const res = buildGen(state, map, 'hydro', 17, 20); // on the west bank
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.asset.gen).toBe('hydro');
    expect(res.asset.damAxis).toBe('ns');
    // its footprint reaches across the river (3 tiles wide on the wall axis)
    const tiles = footprintTiles(map, res.asset);
    expect(tiles).toHaveLength(6); // 3 × 2
    // the span reaches into the water (the wall blocks the channel)
    const touchesWater = tiles.some((i) => map.terrain[i] === TERRAIN.water);
    expect(touchesWater).toBe(true);
  });

  it('refuses a dam where the river is too narrow to impound', () => {
    const map = riverMap(1, 18, true); // a 1-wide trickle
    const state = newGame();
    const check = checkBuild(map, state.assets.values(), { kind: 'gen', gen: 'hydro', x: 17, y: 20 });
    expect(check.ok).toBe(false);
    expect(check.error).toMatch(/river at least/);
  });
});

// ────────────────────────────────────────────────────────────────────────
describe('save compatibility', () => {
  it('a tiered gen + a straddling dam survive a save round-trip', () => {
    const map = makeTestMap(40, 40);
    // a wide river for the dam
    for (let a = 0; a < 40; a++) for (let b = 18; b < 22; b++) map.terrain[a * map.width + b] = TERRAIN.water;
    const state = newGame();
    const solar = buildGen(state, map, 'solarFarm', 5, 5, { mw: 200, tierKv: '400' });
    const dam = buildGen(state, map, 'hydro', 17, 25);
    expect(solar.ok && dam.ok).toBe(true);
    const round = deserialize(JSON.parse(JSON.stringify(serialize(state))));
    if (!solar.ok || !dam.ok) return;
    const s2 = round.assets.get(solar.asset.id)!;
    const d2 = round.assets.get(dam.asset.id)!;
    expect(s2.kind === 'gen' && s2.level).toBe(400);
    expect(s2.kind === 'gen' && s2.tierKv).toBe('400');
    expect(d2.kind === 'gen' && d2.damAxis).toBe('ns');
  });

  it('an old-shape gen (no level/tierKv) hydrates to its catalog level', () => {
    // a hand-built asset with NONE of the new fields = an old save
    const a = { id: 1, kind: 'gen' as const, gen: 'solarFarm' as const, x: 0, y: 0 };
    expect(genLevel(a)).toBe(GENS.solarFarm.level);
  });
});
