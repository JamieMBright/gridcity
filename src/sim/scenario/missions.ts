// The tutorial campaign: five tiny missions that introduce one concept
// each (tenders + 33 kV, voltage levels + bays, storms + the fleet, the
// inbox + connection studies, the bill). Maps are pure data in
// src/data/missions.ts; this file is the gameplay — guided steps the UI
// renders (Tutorial.tsx), a win predicate the worker checks once per
// tick, optional seeded starting assets and scripted beats (the mission
// 3 storm). Everything is deterministic: scripts key off simTimeMin and
// a persisted beat bitmask (GameState.missionBeats), so saves, skips and
// replays all see the same story.

import {
  M1_VILLAGE,
  M1_WIND,
  M2_WINDSITE,
  M3_PLANT,
  M3_SUB,
  M4_APPLICANT,
  M4_PLANT,
  M4_SUB,
  M5_WIND,
} from '../../data/missions';
import { getScenario } from '../../data/cityRegistry';
import { lineBranchId, type PlacedAsset } from '../assets';
import { strikeMWh, type GenType } from '../catalog';
import { applyCommand, type BuildSpec } from '../commands';
import type { Application } from '../events/applications';
import { FIRM_RENEWABLES, type Tender } from '../events/developers';
import { REPAIR_TIME } from '../reliability/faults';
import { AWAITING_CREW, type BranchView, type TickOutputs } from '../tick';
import { pushEvent, type GameState, type SimContext } from '../state';
import type { SimSnapshot } from '../protocol';

// --- views -------------------------------------------------------------------

/** What a mission WIN predicate may read — built by the worker straight
 *  off game state + the tick's outputs (cheap, snapshot-free). */
export interface MissionView {
  assets: PlacedAsset[];
  branches: BranchView[];
  stats: { servedCustomers: number; totalCustomers: number; connectedMW: number };
  bill: { perCustomerYr: number; perCustomerDuosYr: number };
  applications: Application[];
  tenders: Tender[];
  /** Customers of accepted load sites: they count in totalCustomers but
   *  never in servedCustomers (solveTick counts map tiles only). */
  loadSiteCustomers: number;
  simTimeMin: number;
  beats: number;
}

/** Build the win-predicate view (shared by the worker and unit tests). */
export function missionView(state: GameState, out: TickOutputs, totalCustomers: number): MissionView {
  return {
    assets: [...state.assets.values()],
    branches: out.branches,
    stats: {
      servedCustomers: out.servedCustomers,
      totalCustomers,
      connectedMW: out.dispatch.connectedMW,
    },
    bill: out.bill,
    applications: state.applications,
    tenders: state.tenders,
    loadSiteCustomers: state.loadSites.reduce((a, l) => a + l.customers, 0),
    simTimeMin: state.simTimeMin,
    beats: state.missionBeats ?? 0,
  };
}

/** UI-side state the guided steps may read (things that never reach the
 *  sim: ran-a-study count, the headroom overlay toggle). */
export interface MissionUiView {
  studies: number;
  headroom: boolean;
}

export interface MissionStep {
  text: string;
  /** Auto-advance condition; omit for a manual "next". */
  done?: (s: SimSnapshot, ui: MissionUiView) => boolean;
}

export interface Mission {
  id: string;
  name: string;
  tagline: string;
  steps: MissionStep[];
  win: (v: MissionView) => boolean;
  winText: string;
  /** Starting assets / inbox items (runs on worker newGame only). */
  seed?: (state: GameState, ctx: SimContext) => void;
  /** Scripted beats, run every accumulated tick (deterministic). */
  script?: (state: GameState) => void;
  /** Tender-awarded renewables connect FLEXIBLE in this mission, so
   *  constraint payments on a 100 MW plant serving a hamlet don't swamp
   *  the tutorial bill (firm-vs-flex is mission 4's lesson). */
  flexTenders?: boolean;
}

// --- predicate helpers --------------------------------------------------------

const allServed = (v: MissionView): boolean =>
  v.stats.totalCustomers > 0 &&
  v.stats.servedCustomers >= v.stats.totalCustomers - v.loadSiteCustomers;

const noOverload = (v: MissionView): boolean =>
  v.branches.every((b) => Math.abs(b.flowMW) <= b.ratingMW + 1e-6);

const allInService = (v: MissionView): boolean => v.branches.every((b) => b.outMin === undefined);

const hasLine = (s: { assets: PlacedAsset[] }, level: number): boolean =>
  s.assets.some((a) => a.kind === 'line' && a.level === level);

// --- beat bookkeeping ---------------------------------------------------------

function fired(state: GameState, bit: number): boolean {
  return ((state.missionBeats ?? 0) & bit) !== 0;
}

/** Mark a beat fired; true exactly once per game (persisted bitmask). */
function fireOnce(state: GameState, bit: number): boolean {
  if (fired(state, bit)) return false;
  state.missionBeats = (state.missionBeats ?? 0) | bit;
  return true;
}

// --- seeding helpers ----------------------------------------------------------

/** Player-owned, already-commissioned plant (the way test fixtures and
 *  seedScenario insert generation — the tender market is bypassed). */
function seedGen(state: GameState, gen: GenType, x: number, y: number): number {
  const id = state.nextAssetId++;
  state.assets.set(id, { id, kind: 'gen', gen, x, y, ppaMWh: strikeMWh(gen), liveAtMin: 0 });
  state.assetsVersion++;
  return id;
}

function mustBuild(state: GameState, ctx: SimContext, spec: BuildSpec): void {
  const r = applyCommand(state, ctx.map, { type: 'build', spec });
  if (!r.ok) throw new Error(`mission seed failed: ${r.error ?? 'build refused'}`);
}

/** A working starter network: plant → 33 kV overhead → dist sub. */
function seedNetwork(
  state: GameState,
  ctx: SimContext,
  gen: GenType,
  plant: { x: number; y: number },
  sub: { x: number; y: number },
): void {
  seedGen(state, gen, plant.x, plant.y);
  mustBuild(state, ctx, { kind: 'sub', sub: 'dist', x: sub.x, y: sub.y });
  mustBuild(state, ctx, {
    kind: 'line',
    level: 33,
    build: 'overhead',
    ax: plant.x,
    ay: plant.y,
    bx: sub.x,
    by: sub.y,
  });
}

// --- mission 3's scripted storm ------------------------------------------------

const M3_BEAT = { warned: 1, landfall: 2, fault: 4, cleared: 8 } as const;
const M3_WARN_MIN = 12 * 60;
const M3_LANDFALL_MIN = 36 * 60;
export const M3_FAULT_MIN = 38 * 60;
const M3_CLEAR_MIN = 52 * 60;

/** Bring a tree down on the seeded woodland line: the same outage + job
 *  shape solveTick's rollFaults produces, minus the dice. */
function tripSeededLine(state: GameState): void {
  const line = [...state.assets.values()]
    .filter((a) => a.kind === 'line' && a.build === 'overhead')
    .sort((a, b) => a.id - b.id)[0];
  if (!line || line.kind !== 'line') return;
  const branchId = lineBranchId(line.id);
  if (state.outages.has(branchId)) return;
  const endA = state.assets.get(line.a);
  const endB = state.assets.get(line.b);
  const x =
    endA && endB && endA.kind !== 'line' && endB.kind !== 'line'
      ? Math.round((endA.x + endB.x) / 2)
      : 0;
  const y =
    endA && endB && endA.kind !== 'line' && endB.kind !== 'line'
      ? Math.round((endA.y + endB.y) / 2)
      : 0;
  const label = `Storm Aldgate brings a tree down on the ${line.level} kV line`;
  state.outages.set(branchId, AWAITING_CREW);
  state.outageCause.set(branchId, 'storm damage — a tree through the conductors');
  state.jobs.set(branchId, {
    branchId,
    assetId: line.id,
    x,
    y,
    repairMin: REPAIR_TIME.overheadLine ?? 240,
    waitedMin: 0,
    label,
  });
  pushEvent(state, 'bad', label, x, y);
}

function stormScript(state: GameState): void {
  const t = state.simTimeMin;
  if (t >= M3_WARN_MIN && fireOnce(state, M3_BEAT.warned)) {
    pushEvent(
      state,
      'warn',
      'Met Office names Storm Aldgate — landfall tomorrow. Crews roll from field depots; build one before it hits.',
    );
  }
  if (t >= M3_LANDFALL_MIN && t < M3_CLEAR_MIN) {
    // hold the blow for the storm window: the regime machine would
    // otherwise mean-revert the gusts away mid-lesson
    const w = state.weather;
    w.regime = 'windy-wet';
    w.nextRegime = 'mild';
    if ((w.regimeEndsMin ?? 0) < M3_CLEAR_MIN) w.regimeEndsMin = M3_CLEAR_MIN;
    if (w.wind < 0.9) w.wind = 0.92;
    if (fireOnce(state, M3_BEAT.landfall)) {
      pushEvent(state, 'bad', 'Storm Aldgate makes landfall — gusts tear at the woodland crossing');
    }
  }
  if (t >= M3_FAULT_MIN && fireOnce(state, M3_BEAT.fault)) tripSeededLine(state);
  if (t >= M3_CLEAR_MIN && fireOnce(state, M3_BEAT.cleared)) {
    state.weather.wind = Math.min(state.weather.wind, 0.5);
    pushEvent(state, 'info', 'Storm Aldgate clears the coast — count the damage');
  }
}

// --- the campaign --------------------------------------------------------------

/** Mission 5's scoreboard: network charges per household, £/yr. */
export const M5_DUOS_TARGET = 200;

function mission(
  id: string,
  rest: Omit<Mission, 'id' | 'name' | 'tagline'>,
): Mission {
  const sc = getScenario(id);
  return { id, name: sc.name, tagline: sc.tagline, ...rest };
}

export const MISSIONS: Mission[] = [
  mission('m1-first-light', {
    flexTenders: true,
    steps: [
      {
        text:
          'Alderbrook has never had mains power. Your whole job in one village: ' +
          'generation → wire → substation → lit homes. Drag to pan, scroll to zoom.',
      },
      {
        text:
          'You are a network operator, not a power company — you DESIGNATE sites and ' +
          'developers build on them. Pick ONSHORE WIND and click open land on the ' +
          'breezy western ridge (the map shades green where it can go). That opens a tender.',
        done: (s) => s.inbox.tenders.length > 0,
      },
      {
        text:
          'Developers are pricing the site — run time forward (▶▶▶) and watch the INBOX. ' +
          'When a bid lands, AWARD it: the turbines appear, spinning and waiting for your wires.',
        done: (s) => s.inbox.tenders.some((t) => t.status === 'awarded'),
      },
      {
        text:
          'Homes connect through a DISTRIBUTION SUBSTATION (33 kV/LV). Place one among ' +
          'the village houses — its service ring must cover them.',
        done: (s) => s.assets.some((a) => a.kind === 'sub' && a.sub === 'dist' && !a.idno),
      },
      {
        text:
          'Last hop: arm the 33 KV LINE, click the wind farm, then the substation — ' +
          'wooden poles march the route and the chevrons start to flow.',
        done: (s) => hasLine(s, 33) && s.stats.servedCustomers > 0,
      },
      {
        text:
          'The village is waking up. Light EVERY home — church and outlying cottages ' +
          'included — to complete First Light.',
      },
    ],
    win: allServed,
    winText:
      'Every home in Alderbrook is on supply. One tender, one wire, one substation — that is the whole game in miniature.',
  }),

  mission('m2-step-up', {
    flexTenders: true,
    steps: [
      {
        text:
          'Saltmarsh: the village is here, the wind is 40 km east, OFFSHORE. ' +
          'Distance is what voltage is for — this is the step-up lesson.',
      },
      {
        text:
          'Designate OFFSHORE WIND on the surveyed estuary zone in the far east ' +
          '(only those tiles shade green), then award a bid from the INBOX (▶▶▶ helps).',
        done: (s) => s.inbox.tenders.some((t) => t.status === 'awarded'),
      },
      {
        text:
          'Try a 33 kV line from the plant — refused: offshore wind lands at 132 kV, and a ' +
          'line needs a matching BAY at both ends. Place a GRID SUBSTATION (132/33 kV) ' +
          'beside the village: it owns both bays and steps the voltage down.',
        done: (s) => s.assets.some((a) => a.kind === 'sub' && a.sub === 'grid' && !a.idno),
      },
      {
        text: 'Run the 132 KV LINE from the wind farm to the grid substation — big pylons this time.',
        done: (s) => hasLine(s, 132),
      },
      {
        text:
          'Finish locally: DISTRIBUTION SUBSTATION among the homes, 33 KV LINE from the ' +
          'grid substation to it. 132 kV travels, 33 kV delivers.',
        done: (s) => s.stats.servedCustomers > 0,
      },
      { text: 'Light every home via the 132 kV link to complete Step Up.' },
    ],
    win: (v) => allServed(v) && v.assets.some((a) => a.kind === 'line' && a.level === 132),
    winText:
      'Saltmarsh is lit from 40 km away. High voltage to travel, a grid substation to step down, 33 kV to deliver — the bays rule will never surprise you again.',
  }),

  mission('m3-storm', {
    seed: (state, ctx) => seedNetwork(state, ctx, 'biomass', M3_PLANT, M3_SUB),
    script: stormScript,
    steps: [
      {
        text:
          'Thornwood Vale is already wired — through ten miles of woodland. Trees and ' +
          'overhead lines are old enemies, and a storm is forming out in the Atlantic.',
      },
      {
        text:
          'Faults need crews and crews need a home: build a FIELD DEPOT near the line. ' +
          'Your two vans appear there the moment it exists.',
        done: (s) => s.assets.some((a) => a.kind === 'depot'),
      },
      {
        text:
          'Open the FLEET panel and set a VEGETATION programme — reactive at least. ' +
          'Untrimmed woodland is where storm faults breed.',
        done: (s) => s.fleet.vegPolicy > 0,
      },
      {
        text:
          'Storm Aldgate is about to land. Ride it out: when the woodland line comes down, ' +
          'watch a van race out and restore it (the ⇥ skip buttons pass the waiting).',
        done: (s) =>
          s.simTimeMin > M3_FAULT_MIN && s.branches.every((b) => b.outMin === undefined),
      },
      { text: 'Get every customer back on supply to complete Keeping the Lights On.' },
    ],
    win: (v) =>
      v.assets.some((a) => a.kind === 'depot') &&
      (v.beats & M3_BEAT.fault) !== 0 &&
      allInService(v) &&
      allServed(v),
    winText:
      'Storm ridden, line repaired, lights back on. Depots, vans and vegetation budgets are how a network survives weather.',
  }),

  mission('m4-inbox', {
    seed: (state, ctx) => {
      seedNetwork(state, ctx, 'biomass', M4_PLANT, M4_SUB);
      state.applications.push({
        id: state.nextAppId++,
        kind: 'dataCentre',
        name: 'Eastbox Compute',
        x: M4_APPLICANT.x,
        y: M4_APPLICANT.y,
        mw: 12,
        customers: 50,
        decideByMin: state.simTimeMin + 90 * 1440,
        status: 'open',
      });
      pushEvent(
        state,
        'warn',
        'connection application: Eastbox Compute (12 MW demand)',
        M4_APPLICANT.x,
        M4_APPLICANT.y,
      );
    },
    steps: [
      {
        text:
          'Watermead is served and quiet — until the INBOX pings: Eastbox Compute want ' +
          '12 MW on the far side of the parish. Connections are the day job.',
      },
      {
        text:
          'Never promise blind. Open the INBOX and RUN A CONNECTION STUDY on the ' +
          'application — it tells you what the network can host before you sign.',
        done: (_s, ui) => ui.studies > 0,
      },
      {
        text:
          'Now answer. FIRM = full access, and you pay constraint compensation whenever you ' +
          'curtail them. FLEXIBLE = you may curtail freely — that was the deal. ' +
          'Either works here; big loads usually want firm.',
        done: (s) => s.inbox.applications.some((a) => a.status === 'firm' || a.status === 'flex'),
      },
      {
        text:
          'They build their kit; you owe them WIRES by the deadline (late = liquidated ' +
          'damages). Place a DISTRIBUTION SUBSTATION whose ring covers their site and run ' +
          '33 kV back to your network — without overloading anything.',
        done: (s) => s.inbox.applications.some((a) => a.status === 'connected'),
      },
      { text: 'Keep the whole parish on supply with no overloads to complete The Inbox.' },
    ],
    win: (v) =>
      v.applications.some((a) => a.status === 'connected') && noOverload(v) && allServed(v),
    winText:
      'Eastbox Compute is live, on time, and nothing is running hot. Study, respond, deliver — the inbox is the network operator’s front door.',
  }),

  mission('m5-bill', {
    flexTenders: true,
    steps: [
      {
        text:
          'Pennyford reads its bills line by line. Capital is unlimited — but every pound ' +
          `you spend lands on customers. Serve the whole town with network charges at or ` +
          `under £${M5_DUOS_TARGET} per household per year.`,
      },
      {
        text:
          'The BILL panel is the scoreboard: capex annuities, O&M, fleet, energy. The ' +
          '"network £/home" line is yours to control. Glance at it now — then keep it honest.',
      },
      {
        text: 'Toggle HEADROOM (▦ / H) to see spare capacity per corridor. Right-sized kit is cheap kit.',
        done: (_s, ui) => ui.headroom,
      },
      {
        text:
          'Build lean: wind tender on the ridge NEXT DOOR, one distribution substation in ' +
          'town, short 33 kV runs. No grid substations, no gold-plate — the town is small.',
        done: (s) =>
          s.stats.totalCustomers > 0 && s.stats.servedCustomers >= s.stats.totalCustomers,
      },
      {
        text: `Hold it there: every home served AND network £/home ≤ £${M5_DUOS_TARGET}. Demolish anything gold-plated — refunds are instant.`,
        done: (s) => s.missionComplete === true,
      },
    ],
    win: (v) =>
      allServed(v) &&
      v.bill.perCustomerDuosYr > 0 &&
      v.bill.perCustomerDuosYr <= M5_DUOS_TARGET,
    winText:
      `Pennyford is lit for £${M5_DUOS_TARGET} a home or less. That discipline — service per pound — is what the RIIO report cards grade you on in the big city.`,
  }),
];

export function missionOf(scenarioId: string | undefined): Mission | undefined {
  return MISSIONS.find((m) => m.id === scenarioId);
}

/** The mission after this one (campaign order), if any. */
export function nextMission(scenarioId: string): Mission | undefined {
  const ix = MISSIONS.findIndex((m) => m.id === scenarioId);
  return ix >= 0 ? MISSIONS[ix + 1] : undefined;
}

/** Worker hook, once per tick on mission scenarios: run scripted beats,
 *  stamp flex onto tender-awarded renewables where the mission asks for
 *  it, and latch the win (celebratory event + sticky flag). */
export function advanceMission(state: GameState, view: MissionView): void {
  const m = missionOf(state.scenarioId);
  if (!m) return;
  if (m.flexTenders) {
    for (const a of state.assets.values()) {
      if (a.kind === 'gen' && a.developer !== undefined && !a.flex && FIRM_RENEWABLES.has(a.gen)) {
        a.flex = true;
      }
    }
  }
  m.script?.(state);
  if (!state.missionComplete && m.win(view)) {
    state.missionComplete = true;
    pushEvent(state, 'info', `🏆 mission complete — ${m.name}`);
  }
}

// referenced by mission siting hints in the UI / e2e (kept exported so
// the steps, tests and specs aim at the same tiles as the maps)
export const MISSION_SITES = {
  m1: { wind: M1_WIND, village: M1_VILLAGE },
  m2: { windsite: M2_WINDSITE },
  m4: { applicant: M4_APPLICANT },
  m5: { wind: M5_WIND },
} as const;
