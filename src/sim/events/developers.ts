// The developer market. A network operator doesn't build power stations:
// it designates a connection site (a planning signal) and private
// developers bid to build there. Each developer has an appetite per
// technology — renewables are crowded, coal and nuclear interest only
// the conglomerates — and a mood the player can sour by snubbing bids,
// withdrawing tenders, connecting late or curtailing their plant. When
// a conglomerate's mood breaks, the regulator hears about it.

import type { PlacedAsset } from '../assets';
import { GENS, type GenType, strikeMWh } from '../catalog';
import type { Rng } from '../rng';
import type { GenerationModel } from '../powerProfile';
import { pushEvent, type GameState } from '../state';

export interface Developer {
  id: number;
  name: string;
  blurb: string;
  /** Big diversified outfits: they bid on everything large, and they
   *  complain to the regulator when their mood breaks. */
  conglomerate: boolean;
  /** Relative bidding appetite per technology (absent = never bids). */
  appetite: Partial<Record<GenType, number>>;
  /** Constraint-market curtailment price, £k/MWh (ROADMAP #17): what
   *  this developer's firm plant charges to be constrained off. A
   *  personality, not market state — spread ~0.03–0.12 around the flat
   *  CONSTRAINT_COMP_K (0.06) it replaces. Co-ops shrug for £30/MWh;
   *  conglomerate lawyers invoice £120. */
  curtailPriceK: number;
}

export const DEVELOPERS: Developer[] = [
  {
    id: 1,
    name: 'Voltaic Brothers plc',
    blurb: 'Third-generation turbine men. Gas is in the blood.',
    conglomerate: false,
    appetite: { gasCCGT: 1.4, gasPeaker: 1.6, biomass: 0.8 },
    curtailPriceK: 0.05,
  },
  {
    id: 2,
    name: 'Greenfield Grid Capital',
    blurb: 'A pension-fund vehicle that has never seen a field it would not solar.',
    conglomerate: false,
    appetite: { solarFarm: 1.6, windOnshore: 1.4, battery: 1.4, windOffshore: 0.8, electrolyser: 1.0 },
    curtailPriceK: 0.04,
  },
  {
    id: 3,
    name: 'Thames Estuary Renewables',
    blurb: 'Wind and tide specialists; happiest with salt on the blades.',
    conglomerate: false,
    appetite: { windOffshore: 1.4, windOnshore: 1.2, tidal: 1.2, hydro: 1.2, solarFarm: 0.8 },
    curtailPriceK: 0.07,
  },
  {
    id: 4,
    name: 'Megawatt & Sons',
    blurb: 'Family firm. Peakers built to a price, delivered with a handshake.',
    conglomerate: false,
    appetite: { gasPeaker: 1.4, gasCCGT: 1.2, biomass: 1.2 },
    curtailPriceK: 0.06,
  },
  {
    id: 5,
    name: 'Sunpenny Energy Co-operative',
    blurb: 'Community-owned panels; the AGM lasts longer than the build.',
    conglomerate: false,
    appetite: { solarFarm: 1.8, battery: 1.2 },
    curtailPriceK: 0.03,
  },
  {
    id: 6,
    name: 'Borough Light & Power',
    blurb: 'Urban storage developers — substations are their street furniture.',
    conglomerate: false,
    appetite: { battery: 1.6, solarFarm: 1.0, windOnshore: 0.8, electrolyser: 1.4 },
    curtailPriceK: 0.08,
  },
  {
    id: 7,
    name: 'Consolidated Power Holdings',
    blurb: 'A balance sheet with cooling towers. Bids on anything big.',
    conglomerate: true,
    curtailPriceK: 0.12,
    appetite: {
      gasCCGT: 1.6,
      gasPeaker: 1.0,
      coal: 0.7,
      nuclear: 0.5,
      windOffshore: 1.2,
      windOnshore: 0.6,
      solarFarm: 0.6,
      biomass: 0.6,
      battery: 0.8,
      tidal: 0.4,
      hydro: 0.8,
      electrolyser: 0.6,
    },
  },
  {
    id: 8,
    name: 'Albion Infrastructure Group',
    blurb: 'Lawyers first, engineers second — and friends at the regulator.',
    conglomerate: true,
    curtailPriceK: 0.1,
    appetite: {
      gasCCGT: 1.4,
      gasPeaker: 0.8,
      coal: 0.5,
      nuclear: 0.7,
      windOffshore: 1.4,
      windOnshore: 0.6,
      solarFarm: 0.6,
      battery: 1.0,
      tidal: 0.4,
      hydro: 0.9,
    },
  },
];

export function developerOf(id: number): Developer | undefined {
  return DEVELOPERS.find((d) => d.id === id);
}

/** The developer's curtailment price, £k/MWh (#17) — dispatch's fallback
 *  for developer plant not yet stamped with GenAsset.curtailK. */
export function devCurtailK(developerId: number): number | undefined {
  return developerOf(developerId)?.curtailPriceK;
}

/** Per-country bid-appetite multiplier (W8 Part-2b): the active generation
 *  model's `tenderBias` skews a developer's appetite for a technology so a
 *  country's tender FLOW matches its real mix (France's nuclear floor dampens
 *  the renewable rush, Australia skews solar+battery, Hong Kong — no real
 *  tender — is biased right down). Absent bias / missing key ⇒ ×1, so GB (no
 *  bias) is byte-identical. Never resurrects a zero appetite (a developer that
 *  never bids on a tech still never does). */
export function biasedAppetite(
  dev: Developer,
  gen: GenType,
  generation: GenerationModel | undefined,
): number {
  const base = dev.appetite[gen] ?? 0;
  if (base <= 0) return 0;
  return base * (generation?.tenderBias?.[gen] ?? 1);
}

/** Every developer starts moderately well-disposed. */
export const START_MOOD = 70;
/** Below this a conglomerate lodges a regulator complaint (per crossing). */
export const COMPLAINT_MOOD = 40;

export function newDevMood(): Map<number, number> {
  return new Map(DEVELOPERS.map((d) => [d.id, START_MOOD]));
}

/** Days a tender invites bids before its first close. */
export const TENDER_OPEN_DAYS = 6;
/** Mean game-days between bids per unit of appetite, per developer.
 *  With ~6 points of total appetite on a popular technology that works
 *  out near one bid every two game-days. */
const BID_MEAN_DAYS = 3;

export interface Bid {
  developerId: number;
  /** Offered PPA strike, £/MWh (tech LCOE ±15%). */
  priceMWh: number;
  /** Days added to (or shaved off) the catalog planning+build lead. */
  leadDaysDelta: number;
  /** Offered capacity, MW — what fits the open land around the site
   *  (Tender.fitMW), at most the catalog ask. Additive: absent on old
   *  saves' bids / fixed-footprint plant = the catalog capacity on a
   *  single tile, exactly the old behaviour. */
  mw?: number | undefined;
}

export interface Tender {
  id: number;
  gen: GenType;
  x: number;
  y: number;
  openedMin: number;
  /** Bidding closes at this game-minute (extended once if bid-less). */
  closesMin: number;
  bids: Bid[];
  status: 'open' | 'awarded' | 'lapsed';
  /** The one no-bids extension has been used. */
  extended?: boolean | undefined;
  /** Latest CfD allocation round (#14) that swept this tender, if any
   *  — a still-open tender migrates into each new round. Additive:
   *  pre-round saves' tenders simply have no round and list as today.
   *  The inbox derives its "ALLOCATION ROUND n" grouping from this, so
   *  the protocol carries no extra round plumbing. */
  roundId?: number | undefined;
  /** Farm techs only: the MW the open land around the site fits (capped
   *  at the catalog ask AND the player's chosen size), surveyed at
   *  designation while the map is in hand — every bid offers at most this.
   *  Additive: absent (old saves, fixed plant) = bids carry no MW and
   *  award the catalog plant. */
  fitMW?: number | undefined;
  /** FOOTPRINT RESERVATION (owner playtest, 2026-06-13: side-by-side bids
   *  "exploded out" on award). The tile indices this tender HOLDS from the
   *  moment it is designated — its eventual plant footprint (the full
   *  `fitMW` farm claim, or the fixed catalog rect). Other designations and
   *  builds treat these as occupied, so two tenders can never claim
   *  overlapping ground and the award lands exactly here (no explosion).
   *  Derived at designation, serialized so a load reproduces the hold.
   *  Additive: absent (old saves) = no reservation, the old behaviour. */
  reserved?: number[] | undefined;
  /** Chosen CONNECTION-VOLTAGE tier (catalog GenTier.kv) the player
   *  designated this site at (owner, 2026-06-26). Carried through to the
   *  awarded plant so its bus level + signage match the tier. Additive:
   *  absent (old saves, default tier) = the catalog default. */
  tierKv?: string | undefined;
}

/** Tiles every still-open tender holds (its reserved footprint) — the
 *  occupancy a new designation / build / farm survey must avoid. */
export function reservedTiles(tenders: Iterable<Tender>): Set<number> {
  const held = new Set<number>();
  for (const t of tenders) {
    if (t.status !== 'open') continue;
    for (const i of t.reserved ?? []) held.add(i);
  }
  return held;
}

/** The MW a developer offers on a tender: what the land fits. */
function bidMWFor(t: Tender): number | undefined {
  return t.fitMW === undefined ? undefined : Math.min(GENS[t.gen].capacityMW, t.fitMW);
}

/** Adjusted lead time for a bid, game-days. */
export function bidLeadDays(gen: GenType, bid: Bid): number {
  const g = GENS[gen];
  return Math.max(1, g.planningDays + g.buildDays + bid.leadDaysDelta);
}

// --- CfD allocation rounds (#14) --------------------------------------------
//
// Quarterly, every open designated site is swept into one sealed-bid
// "allocation round": every developer with appetite prices every site at
// once, and the inbox presents the round as a single clear-the-lot
// decision (cheapest bid on every tender) alongside today's per-tender
// awards. Per-site tendering between rounds is unchanged.

/** Game-days between allocation rounds (a quarter). */
export const ROUND_INTERVAL_DAYS = 90;
export const ROUND_INTERVAL_MIN = ROUND_INTERVAL_DAYS * 1440;

/** The calendar-aligned game-minute the next round opens after `nowMin`
 *  (newGame and old-save hydration both land on the same schedule). */
export function nextRoundOpensMin(nowMin: number): number {
  return (Math.floor(nowMin / ROUND_INTERVAL_MIN) + 1) * ROUND_INTERVAL_MIN;
}

/** One bid's worth of RNG draws — shared by trickle and round bids so
 *  the sealed round reuses the exact per-site machinery. `shade`
 *  multiplies the strike (1 = the classic trickle bid). */
function rollBid(rng: Rng, developerId: number, gen: GenType, shade: number): Bid {
  const spec = GENS[gen];
  const leadDays = spec.planningDays + spec.buildDays;
  return {
    developerId,
    priceMWh: Math.max(1, Math.round(strikeMWh(gen) * rng.range(0.85, 1.15) * shade)),
    leadDaysDelta: Math.round(leadDays * rng.range(-0.2, 0.25)),
  };
}

/** A sealed allocation-round bid: strike ±15% shaded by personality —
 *  an eager developer (high appetite) sharpens the pencil, a soured one
 *  pads the price. Neutral (mood 70, appetite 1) shades nothing. */
export function sealedRoundBid(rng: Rng, dev: Developer, gen: GenType, mood: number): Bid {
  const appetite = dev.appetite[gen] ?? 0;
  const shade = Math.max(
    0.8,
    Math.min(1.25, 1 + (START_MOOD - mood) * 0.002 - (appetite - 1) * 0.03),
  );
  return rollBid(rng, dev.id, gen, shade);
}

/** Open allocation round `roundId + 1`: tag every open tender into it and
 *  collect a sealed bid from every developer with appetite that hasn't
 *  already bid on the site. `generation` carries the active country's
 *  `tenderBias` (W8 Part-2b); absent ⇒ unbiased GB behaviour. */
function openAllocationRound(state: GameState, rng: Rng, generation?: GenerationModel): void {
  state.roundId += 1;
  const open = state.tenders.filter((t) => t.status === 'open');
  for (const t of open) t.roundId = state.roundId; // migrates leftovers forward
  if (open.length === 0) {
    state.roundClearedId = state.roundId; // empty round: nothing to clear
    return;
  }
  let sealed = 0;
  for (const t of open) {
    for (const dev of DEVELOPERS) {
      if (biasedAppetite(dev, t.gen, generation) <= 0) continue;
      if (t.bids.some((b) => b.developerId === dev.id)) continue;
      const mw = bidMWFor(t); // capped by what the land fits
      t.bids.push({
        ...sealedRoundBid(rng, dev, t.gen, state.devMood.get(dev.id) ?? START_MOOD),
        ...(mw !== undefined ? { mw } : {}),
      });
      sealed++;
    }
  }
  pushEvent(
    state,
    'warn',
    `Allocation Round ${state.roundId} open — ${sealed} sealed bid${sealed === 1 ? '' : 's'} across ${open.length} site${open.length === 1 ? '' : 's'}`,
  );
}

/** The developer plant an awarded tender produced (acceptBid builds it on
 *  the tender's tile). */
function awardedPlantOf(
  state: GameState,
  t: Tender,
): (PlacedAsset & { kind: 'gen' }) | undefined {
  for (const a of state.assets.values()) {
    if (a.kind === 'gen' && a.developer !== undefined && a.x === t.x && a.y === t.y) return a;
  }
  return undefined;
}

/** Round clearance bookkeeping: once every tender swept into a round has
 *  settled (awarded individually or via the inbox's clear-round button,
 *  or withdrawn/lapsed), developers who bid in the round and won nothing
 *  sour slightly — on top of acceptBid's per-tender snub. Detected here
 *  rather than in acceptBid because the clear is just sequential awards
 *  (and commands.ts belongs to another work package this wave). */
function settleClearedRounds(state: GameState): void {
  while (state.roundClearedId < state.roundId) {
    const r = state.roundClearedId + 1;
    const members = state.tenders.filter((t) => t.roundId === r);
    if (members.some((t) => t.status === 'open')) return; // round still live
    state.roundClearedId = r;
    if (members.length === 0) continue; // everything migrated into a later round
    const winners = new Set<number>();
    let priceSum = 0;
    let priceN = 0;
    for (const t of members) {
      if (t.status !== 'awarded') continue;
      const plant = awardedPlantOf(state, t);
      if (plant?.developer !== undefined) winners.add(plant.developer);
      if (plant?.ppaMWh !== undefined) {
        priceSum += plant.ppaMWh;
        priceN++;
      }
    }
    if (winners.size === 0) continue; // wholly withdrawn round: declineTender already stung
    const losers = new Set<number>();
    for (const t of members) {
      for (const b of t.bids) {
        if (!winners.has(b.developerId)) losers.add(b.developerId);
      }
    }
    for (const id of losers) bumpMood(state, id, -4);
    pushEvent(
      state,
      'info',
      `Allocation Round ${r} cleared${priceN > 0 ? ` at £${Math.round(priceSum / priceN)}/MWh average` : ''} — ${priceN} site${priceN === 1 ? '' : 's'} awarded`,
    );
  }
}

/** ROADMAP #17: awarded plants inherit their developer's curtailment
 *  price onto the asset (additive — rides PlacedAsset serialization).
 *  Stamped here rather than in acceptBid (commands.ts is another
 *  engineer's this wave); dispatch falls back to the same personality
 *  price for any plant not yet stamped, so behaviour is identical. */
export function inheritCurtailPrices(state: GameState): void {
  for (const a of state.assets.values()) {
    if (a.kind !== 'gen' || a.developer === undefined || a.curtailK !== undefined) continue;
    const k = devCurtailK(a.developer);
    if (k !== undefined) a.curtailK = k;
  }
}

/** Clamp-adjust a developer's mood; a conglomerate crossing below the
 *  complaint threshold files with the regulator (once per crossing). */
export function bumpMood(state: GameState, developerId: number, delta: number): void {
  const before = state.devMood.get(developerId) ?? START_MOOD;
  const after = Math.max(0, Math.min(100, before + delta));
  if (after === before) return;
  state.devMood.set(developerId, after);
  if (before >= COMPLAINT_MOOD && after < COMPLAINT_MOOD) {
    const dev = developerOf(developerId);
    if (dev?.conglomerate) {
      pushEvent(state, 'bad', `⚠ ${dev.name} has lodged a complaint with the regulator`);
      state.period.complaints += 1;
    }
  }
}

export function bumpAllMoods(state: GameState, delta: number): void {
  for (const d of DEVELOPERS) bumpMood(state, d.id, delta);
}

/** Advance open tenders by dtMin: bids accrue by appetite while bidding
 *  is open; a bid-less tender gets one 6-day extension, then lapses.
 *  Tenders holding bids wait indefinitely for the player's award.
 *  Also the home of the quarterly allocation-round timer (#14) and the
 *  curtail-price inheritance pass (#17). `generation` carries the active
 *  country's `tenderBias` (W8 Part-2b) that skews the bid FLOW per technology;
 *  absent ⇒ unbiased GB behaviour, byte-identical. */
export function stepTenders(
  state: GameState,
  rng: Rng,
  dtMin: number,
  generation?: GenerationModel,
): void {
  if (dtMin > 0) {
    // quarterly CfD allocation round: sweep all open tenders at once
    while (state.simTimeMin >= state.roundOpensMin) {
      openAllocationRound(state, rng, generation);
      state.roundOpensMin += ROUND_INTERVAL_MIN;
    }
    settleClearedRounds(state);
    inheritCurtailPrices(state);
  }
  for (const t of state.tenders) {
    if (t.status !== 'open') continue;
    if (state.simTimeMin < t.closesMin) {
      const spec = GENS[t.gen];
      for (const dev of DEVELOPERS) {
        const appetite = biasedAppetite(dev, t.gen, generation);
        if (appetite <= 0) continue;
        if (t.bids.some((b) => b.developerId === dev.id)) continue;
        if (!rng.chance((appetite * dtMin) / (BID_MEAN_DAYS * 1440))) continue;
        const mw = bidMWFor(t); // capped by what the land fits
        const bid: Bid = {
          ...rollBid(rng, dev.id, t.gen, 1), // classic trickle bid, unshaded
          ...(mw !== undefined ? { mw } : {}),
        };
        t.bids.push(bid);
        pushEvent(
          state,
          'warn',
          `${dev.name} bids on the ${spec.name} tender — ${
            bid.mw !== undefined ? `${bid.mw} MW at ` : ''
          }£${bid.priceMWh}/MWh`,
          t.x,
          t.y,
        );
      }
    } else if (t.bids.length === 0) {
      if (!t.extended) {
        t.extended = true;
        t.closesMin += TENDER_OPEN_DAYS * 1440;
        pushEvent(
          state,
          'info',
          `no bids yet for the ${GENS[t.gen].name} site — tender held open another ${TENDER_OPEN_DAYS} days`,
          t.x,
          t.y,
        );
      } else {
        t.status = 'lapsed';
        pushEvent(
          state,
          'bad',
          `${GENS[t.gen].name} tender lapsed — no developer interest`,
          t.x,
          t.y,
        );
      }
    }
  }
}

export const FIRM_RENEWABLES: ReadonlySet<GenType> = new Set([
  'solarFarm',
  'windOnshore',
  'windOffshore',
  'tidal',
]);

/** Monthly: sustained constraint payments relative to the generation
 *  line sour every developer whose firm renewable plant is on the
 *  receiving end of the curtailment. */
export function dingCurtailedDevelopers(state: GameState, genYrK: number): void {
  if (state.constraintYrK <= 0.1 * Math.max(1, genYrK)) return;
  const dinged = new Set<number>();
  for (const a of state.assets.values()) {
    if (a.kind !== 'gen' || a.developer === undefined) continue;
    if (a.flex || !FIRM_RENEWABLES.has(a.gen)) continue;
    dinged.add(a.developer);
  }
  for (const id of dinged) bumpMood(state, id, -3);
}
