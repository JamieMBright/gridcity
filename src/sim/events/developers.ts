// The developer market. A network operator doesn't build power stations:
// it designates a connection site (a planning signal) and private
// developers bid to build there. Each developer has an appetite per
// technology — renewables are crowded, coal and nuclear interest only
// the conglomerates — and a mood the player can sour by snubbing bids,
// withdrawing tenders, connecting late or curtailing their plant. When
// a conglomerate's mood breaks, the regulator hears about it.

import { GENS, type GenType } from '../catalog';
import type { Rng } from '../rng';
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
}

export const DEVELOPERS: Developer[] = [
  {
    id: 1,
    name: 'Voltaic Brothers plc',
    blurb: 'Third-generation turbine men. Gas is in the blood.',
    conglomerate: false,
    appetite: { gasCCGT: 1.4, gasPeaker: 1.6, biomass: 0.8 },
  },
  {
    id: 2,
    name: 'Greenfield Grid Capital',
    blurb: 'A pension-fund vehicle that has never seen a field it would not solar.',
    conglomerate: false,
    appetite: { solarFarm: 1.6, windOnshore: 1.4, battery: 1.4, windOffshore: 0.8 },
  },
  {
    id: 3,
    name: 'Thames Estuary Renewables',
    blurb: 'Wind and tide specialists; happiest with salt on the blades.',
    conglomerate: false,
    appetite: { windOffshore: 1.4, windOnshore: 1.2, tidal: 1.2, solarFarm: 0.8 },
  },
  {
    id: 4,
    name: 'Megawatt & Sons',
    blurb: 'Family firm. Peakers built to a price, delivered with a handshake.',
    conglomerate: false,
    appetite: { gasPeaker: 1.4, gasCCGT: 1.2, biomass: 1.2 },
  },
  {
    id: 5,
    name: 'Sunpenny Energy Co-operative',
    blurb: 'Community-owned panels; the AGM lasts longer than the build.',
    conglomerate: false,
    appetite: { solarFarm: 1.8, battery: 1.2 },
  },
  {
    id: 6,
    name: 'Borough Light & Power',
    blurb: 'Urban storage developers — substations are their street furniture.',
    conglomerate: false,
    appetite: { battery: 1.6, solarFarm: 1.0, windOnshore: 0.8 },
  },
  {
    id: 7,
    name: 'Consolidated Power Holdings',
    blurb: 'A balance sheet with cooling towers. Bids on anything big.',
    conglomerate: true,
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
    },
  },
  {
    id: 8,
    name: 'Albion Infrastructure Group',
    blurb: 'Lawyers first, engineers second — and friends at the regulator.',
    conglomerate: true,
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
    },
  },
];

export function developerOf(id: number): Developer | undefined {
  return DEVELOPERS.find((d) => d.id === id);
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
const BID_MEAN_DAYS = 12;

export interface Bid {
  developerId: number;
  /** Offered PPA strike, £/MWh (catalog marginal cost ±15%). */
  priceMWh: number;
  /** Days added to (or shaved off) the catalog planning+build lead. */
  leadDaysDelta: number;
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
}

/** Adjusted lead time for a bid, game-days. */
export function bidLeadDays(gen: GenType, bid: Bid): number {
  const g = GENS[gen];
  return Math.max(1, g.planningDays + g.buildDays + bid.leadDaysDelta);
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
 *  Tenders holding bids wait indefinitely for the player's award. */
export function stepTenders(state: GameState, rng: Rng, dtMin: number): void {
  for (const t of state.tenders) {
    if (t.status !== 'open') continue;
    if (state.simTimeMin < t.closesMin) {
      const spec = GENS[t.gen];
      for (const dev of DEVELOPERS) {
        const appetite = dev.appetite[t.gen] ?? 0;
        if (appetite <= 0) continue;
        if (t.bids.some((b) => b.developerId === dev.id)) continue;
        if (!rng.chance((appetite * dtMin) / (BID_MEAN_DAYS * 1440))) continue;
        const leadDays = spec.planningDays + spec.buildDays;
        const bid: Bid = {
          developerId: dev.id,
          priceMWh: Math.round(spec.marginalCostK * 1000 * rng.range(0.85, 1.15)),
          leadDaysDelta: Math.round(leadDays * rng.range(-0.2, 0.25)),
        };
        t.bids.push(bid);
        pushEvent(
          state,
          'warn',
          `${dev.name} bids on the ${spec.name} tender — £${bid.priceMWh}/MWh, ${bidLeadDays(t.gen, bid)} days`,
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

const FIRM_RENEWABLES: ReadonlySet<GenType> = new Set([
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
