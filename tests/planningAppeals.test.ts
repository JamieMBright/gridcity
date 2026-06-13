// Brownfield-favoured applications + planning appeals (owner: "favour
// applications coming in on brownfield textures, and allow some applications
// to come into non brownfield but dont instantly build those, instead have a
// 30d appeals and simulate planning rejections from the different councils").
//
// Verifies: applications favour brownfield over many seeds; a non-brownfield
// scheme opens a ~30-day council determination and does NOT build at once;
// council decisions are deterministic per seed and land-type-weighted
// (green-belt/conservation reject harder than ordinary greenfield); approve →
// proceeds to 'open', reject → lapses to 'refused'; the news feed carries
// council-named, coord-tagged headlines.

import { describe, expect, it } from 'vitest';
import {
  APPEAL_DAYS,
  BROWNFIELD_BIAS,
  landTypeAt,
  maybeSpawnApplications,
  stepAppeals,
  type Application,
} from '../src/sim/events/applications';
import { planningApproveOdds } from '../src/sim/customers/adoption';
import { TILE_FLAG, isBrownfield, ZONE, type CouncilProfile } from '../src/sim/map/types';
import { getScenario } from '../src/data/cityRegistry';
import { newGame, newContext, seedScenario } from '../src/sim/state';
import { advanceTime, derive, deriveKey, solveTick } from '../src/sim/tick';
import { newsApplicationSubmitted, newsAppealOutcome } from '../src/sim/events/news';
import { Rng } from '../src/sim/rng';
import { makeTestMap } from './helpers';

const COUNCIL: CouncilProfile = {
  id: 0,
  name: 'Camford',
  affluence: 0.5,
  ambition: 0.5,
  blurb: '',
};

/** A map split left/right: a brownfield industrial strip (x<W/2) and an open
 *  greenfield strip (x>=W/2), all under one council, all land. */
function splitMap(w = 40, h = 20) {
  const map = makeTestMap(w, h);
  const flags = new Uint8Array(w * h);
  map.flags = flags;
  map.councils = [COUNCIL];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      map.council[i] = 0;
      if (x < w / 2) {
        map.zone[i] = ZONE.industrial;
        flags[i] = TILE_FLAG.brownfield;
      } else {
        map.zone[i] = ZONE.none; // open green belt
      }
    }
  }
  return map;
}

describe('brownfield flag on the London map', () => {
  it('stamps brownfield on the east-river industrial belt', () => {
    const map = getScenario('london').build();
    expect(map.flags).toBeDefined();
    let brown = 0;
    for (let i = 0; i < (map.flags?.length ?? 0); i++) {
      if ((map.flags?.[i] ?? 0) & TILE_FLAG.brownfield) brown++;
    }
    // a real belt of previously-developed land exists (gasworks/docks/works)
    expect(brown).toBeGreaterThan(60);
    // and the Dagenham works tiles read as brownfield
    expect(isBrownfield(map, 162, 86)).toBe(true);
    // ordinary green-belt countryside does not
    expect(isBrownfield(map, 40, 40)).toBe(false);
  });

  it('classifies land types correctly', () => {
    const map = splitMap();
    expect(landTypeAt(map, 5, 5)).toBe('brownfield');
    expect(landTypeAt(map, 30, 5)).toBe('greenbelt');
  });
});

describe('applications favour brownfield over many seeds', () => {
  it('brownfield sites dominate new battery applications', () => {
    const map = splitMap(40, 20);
    let brown = 0;
    let total = 0;
    // drive many independent seeds; battery is eligible on both strips, so
    // the bias is what tips siting toward brownfield
    for (let seed = 1; seed <= 400; seed++) {
      const rng = new Rng(seed);
      const apps = maybeSpawnApplications(map, rng, 7 * 1440, 0, 0, 1, () => false);
      for (const a of apps) {
        total++;
        if (isBrownfield(map, a.x, a.y)) brown++;
      }
    }
    expect(total).toBeGreaterThan(50);
    // well over half should land on brownfield (the steer is ~0.72, and the
    // non-insisting half still sometimes lands brownfield)
    expect(brown / total).toBeGreaterThan(0.6);
    // sanity: the bias constant is the GB "brownfield first" majority
    expect(BROWNFIELD_BIAS).toBeGreaterThan(0.5);
  });

  it('a brownfield application lands ready-to-connect (no appeal)', () => {
    // an all-brownfield map: every battery site is waved through
    const map = makeTestMap(20, 20);
    map.flags = new Uint8Array(400).fill(TILE_FLAG.brownfield);
    map.councils = [COUNCIL];
    for (let i = 0; i < 400; i++) {
      map.zone[i] = ZONE.industrial;
      map.council[i] = 0;
    }
    let found: Application | undefined;
    for (let seed = 1; seed <= 50 && !found; seed++) {
      const rng = new Rng(seed);
      const apps = maybeSpawnApplications(map, rng, 7 * 1440, 0, 0, 1, () => false);
      found = apps.find((a) => a.kind === 'battery');
    }
    expect(found).toBeDefined();
    expect(found?.status).toBe('open');
    expect(found?.appeal).toBeUndefined();
    expect(found?.landType).toBe('brownfield');
  });
});

describe('greenfield applications open a council determination', () => {
  /** Force a greenfield-sited battery application by exhausting brownfield
   *  (none on this map) — every site is open green belt under a council. */
  function greenfieldApp(seed: number): Application | undefined {
    const map = makeTestMap(20, 20);
    map.councils = [COUNCIL];
    for (let i = 0; i < 400; i++) {
      map.zone[i] = ZONE.none;
      map.council[i] = 0;
    }
    const rng = new Rng(seed);
    for (let d = 0; d < 120; d++) {
      const apps = maybeSpawnApplications(map, rng, 1440, d * 1440, 0, 1, () => false);
      const a = apps.find((x) => x.status === 'appeal');
      if (a) return a;
    }
    return undefined;
  }

  it('opens a ~30-day appeal and does not build immediately', () => {
    const a = greenfieldApp(7);
    expect(a).toBeDefined();
    expect(a?.status).toBe('appeal');
    expect(a?.appeal).toBeDefined();
    expect(a?.appeal?.council).toBe('Camford');
    expect(a?.appeal?.councilId).toBe(0);
    // ~30 game-days of determination from the day it was lodged
    expect(a?.appeal?.decideAtMin).toBeGreaterThanOrEqual(APPEAL_DAYS * 1440 - 1);
  });

  it('council decisions are deterministic per seed', () => {
    const a = greenfieldApp(7);
    const b = greenfieldApp(7);
    expect(a?.appeal?.willApprove).toBe(b?.appeal?.willApprove);
    expect(a?.appeal?.approveOdds).toBe(b?.appeal?.approveOdds);
  });
});

describe('council determination is land-type weighted', () => {
  it('green belt and conservation reject harder than ordinary greenfield', () => {
    const greenfield = planningApproveOdds(COUNCIL, 'greenfield', 50);
    const greenbelt = planningApproveOdds(COUNCIL, 'greenbelt', 50);
    const conservation = planningApproveOdds(COUNCIL, 'conservation', 50);
    expect(greenfield).toBeGreaterThan(greenbelt);
    expect(greenbelt).toBeGreaterThan(conservation);
  });

  it('ambition lifts approval; affluence + satisfaction lower it', () => {
    const ambitious = planningApproveOdds(
      { ...COUNCIL, ambition: 0.95 },
      'greenfield',
      50,
    );
    const indifferent = planningApproveOdds(
      { ...COUNCIL, ambition: 0.05 },
      'greenfield',
      50,
    );
    expect(ambitious).toBeGreaterThan(indifferent);
    const calm = planningApproveOdds(COUNCIL, 'greenfield', 20);
    const smug = planningApproveOdds(COUNCIL, 'greenfield', 95);
    expect(calm).toBeGreaterThan(smug); // a contented electorate objects more
  });
});

describe('appeal outcomes proceed or lapse', () => {
  function appealApp(willApprove: boolean): Application {
    return {
      id: 1,
      kind: 'battery',
      name: 'Test Battery',
      x: 30,
      y: 5,
      mw: 100,
      customers: 0,
      decideByMin: 30 * 1440,
      landType: 'greenbelt',
      status: 'appeal',
      appeal: {
        councilId: 0,
        council: 'Camford',
        landType: 'greenbelt',
        decideAtMin: 30 * 1440,
        approveOdds: 0.5,
        willApprove,
      },
    };
  }

  it('approve → proceeds to open (connectable)', () => {
    const apps = [appealApp(true)];
    const out = stepAppeals(apps, 30 * 1440);
    expect(out).toHaveLength(1);
    expect(out[0]?.approved).toBe(true);
    expect(apps[0]?.status).toBe('open');
  });

  it('reject → lapses to refused', () => {
    const apps = [appealApp(false)];
    const out = stepAppeals(apps, 30 * 1440);
    expect(out[0]?.approved).toBe(false);
    expect(apps[0]?.status).toBe('refused');
  });

  it('does nothing before the window closes', () => {
    const apps = [appealApp(true)];
    expect(stepAppeals(apps, 10 * 1440)).toHaveLength(0);
    expect(apps[0]?.status).toBe('appeal');
  });
});

describe('planning headlines hit the news feed with council + coords', () => {
  function freshState() {
    return newGame('london');
  }

  it('a refusal headline names the council and tags coords', () => {
    const s = freshState();
    const app: Application = {
      id: 1,
      kind: 'solarFarm',
      name: 'Estuary Sun',
      x: 212,
      y: 60,
      mw: 50,
      customers: 0,
      decideByMin: 0,
      landType: 'greenbelt',
      status: 'refused',
      appeal: {
        councilId: 13,
        council: 'Estuary Point',
        landType: 'greenbelt',
        decideAtMin: 0,
        approveOdds: 0.3,
        willApprove: false,
      },
    };
    newsAppealOutcome(s, app, false);
    const ev = s.events.at(-1);
    expect(ev?.sev).toBe('bad');
    expect(ev?.msg).toContain('Estuary Point');
    expect(ev?.msg.toUpperCase()).toContain('REFUSES');
    expect(ev?.x).toBe(212);
    expect(ev?.y).toBe(60);
  });

  it('an approval headline reads as a grant', () => {
    const s = freshState();
    const app: Application = {
      id: 2,
      kind: 'battery',
      name: 'Dagenham Storage',
      x: 162,
      y: 86,
      mw: 100,
      customers: 0,
      decideByMin: 0,
      landType: 'greenfield',
      status: 'open',
      appeal: {
        councilId: 5,
        council: 'Old Docks',
        landType: 'greenfield',
        decideAtMin: 0,
        approveOdds: 0.7,
        willApprove: true,
      },
    };
    newsAppealOutcome(s, app, true);
    const ev = s.events.at(-1);
    expect(ev?.sev).toBe('info');
    expect(ev?.msg).toContain('Old Docks');
    expect(ev?.msg).toContain('grant');
  });

  it('a brownfield submission is celebrated; a contested one names the clock', () => {
    const s = freshState();
    const brown: Application = {
      id: 3,
      kind: 'battery',
      name: 'Dagenham Storage',
      x: 162,
      y: 86,
      mw: 100,
      customers: 0,
      decideByMin: 0,
      landType: 'brownfield',
      status: 'open',
    };
    newsApplicationSubmitted(s, brown);
    expect(s.events.at(-1)?.msg.toLowerCase()).toContain('brownfield');

    const contested: Application = {
      ...brown,
      id: 4,
      landType: 'greenbelt',
      status: 'appeal',
      appeal: {
        councilId: 5,
        council: 'Old Docks',
        landType: 'greenbelt',
        decideAtMin: 30 * 1440,
        approveOdds: 0.4,
        willApprove: false,
      },
    };
    newsApplicationSubmitted(s, contested);
    const ev = s.events.at(-1);
    expect(ev?.msg).toContain('Old Docks');
    expect(ev?.x).toBe(162);
  });
});

describe('full london tick raises appeals and refusals deterministically', () => {
  it('over a seeded year, contested schemes appeal and some are refused', () => {
    const state = newGame('london');
    const ctx = newContext('london');
    seedScenario(state, ctx);
    state.speed = 16;
    let derived = derive(state, ctx);
    const startMin = state.simTimeMin;
    while (state.simTimeMin - startMin < 365 * 1440) {
      advanceTime(state);
      if (derived.version !== deriveKey(state)) derived = derive(state, ctx);
      solveTick(state, ctx, derived, true);
    }
    // some applications went through (or are in) a planning determination
    const everAppealed = state.applications.filter(
      (a) => a.appeal !== undefined,
    );
    expect(everAppealed.length).toBeGreaterThan(0);
    // a refusal headline fired at least once over the year
    const refusalNews = state.events.filter((e) => e.msg.toUpperCase().includes('REFUSES'));
    expect(refusalNews.length).toBeGreaterThan(0);
    // and refusal events carry coords (click-to-jump)
    for (const e of refusalNews) {
      expect(e.x).toBeDefined();
      expect(e.y).toBeDefined();
    }
  }, 30_000);
});
