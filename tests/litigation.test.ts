// ROADMAP #54 — Get sued: litigation. Proves: the claim lifecycle
// (arrive → settle / fight / remediate → cost on the bill + reputation
// hit); deterministic fight outcomes per seed; damages escalation from a
// missed connection date; an injury claim seeded from an LTI; a group
// claim from a long mass outage; and the additive save round-trip +
// pre-feature hydration.

import { describe, expect, it } from 'vitest';
import { newGame, deserialize, serialize, type GameState, type SaveData } from '../src/sim/state';
import { newOrg } from '../src/sim/events/directorates';
import {
  applyClaimResponse,
  claimsYrK,
  DAMAGES_ESCALATE_DAYS,
  GROUP_OUTAGE_CUSTMIN,
  maybeSeedGroupClaim,
  openClaims,
  seedInjuryClaim,
  stepLitigation,
  type Claim,
} from '../src/sim/events/litigation';
import { Rng } from '../src/sim/rng';
import { newCouncilState } from '../src/sim/customers/adoption';

function withClaim(kind: Claim['kind'] = 'wayleave'): { s: GameState; claim: Claim } {
  const s = newGame();
  seedInjuryClaim(s, 'electrocution'); // a concrete claim to act on
  const claim = (s.claims ?? [])[0]!;
  void kind;
  return { s, claim };
}

describe('claim lifecycle', () => {
  it('an injury claim arrives in the inbox from an LTI', () => {
    const s = newGame();
    expect(openClaims(s)).toHaveLength(0);
    seedInjuryClaim(s, 'fall');
    expect(openClaims(s)).toHaveLength(1);
    expect(openClaims(s)[0]!.kind).toBe('injury');
  });

  it('settle pays the settlement onto the rolling claims line', () => {
    const { s, claim } = withClaim();
    expect(applyClaimResponse(s, claim.id, 'settle').ok).toBe(true);
    expect(s.claims!.find((c) => c.id === claim.id)!.status).toBe('settled');
    expect(claimsYrK(s, 0)).toBeCloseTo(claim.settleK, 5);
    expect(openClaims(s)).toHaveLength(0); // resolved, drops out of the inbox
  });

  it('remediate costs the remediation and addresses the grievance', () => {
    const { s, claim } = withClaim();
    const r = applyClaimResponse(s, claim.id, 'remediate');
    expect(r.ok).toBe(true);
    expect(s.claims!.find((c) => c.id === claim.id)!.status).toBe('remediated');
    expect(claimsYrK(s, 0)).toBeCloseTo(claim.remediateK, 5);
  });

  it('a resolved claim dents council satisfaction (reputation)', () => {
    const { s, claim } = withClaim();
    s.councils.set(1, { ...newCouncilState(), satisfaction: 80 });
    applyClaimResponse(s, claim.id, 'settle');
    expect(s.councils.get(1)!.satisfaction).toBeLessThan(80);
  });

  it('fighting is deterministic per seed and per claim', () => {
    // two fresh states, identical seed → identical fight outcome
    const run = (): string => {
      const s = newGame();
      s.rngState = 0x12345;
      seedInjuryClaim(s, 'electrocution');
      const c = s.claims![0]!;
      applyClaimResponse(s, c.id, 'fight');
      return s.claims![0]!.status;
    };
    expect(run()).toBe(run());
    expect(['won', 'lost']).toContain(run());
  });

  it('better legal/safety funding raises the win rate over many seeds', () => {
    function winRate(funded: boolean): number {
      let wins = 0;
      const N = 60;
      for (let seed = 1; seed <= N; seed++) {
        const s = newGame();
        s.rngState = seed * 2654435761;
        if (funded) {
          s.org = newOrg();
          s.org.dirs.safety = 4;
          s.org.dirs.regulation = 4;
          s.org.pay = 5;
        }
        seedInjuryClaim(s, 'sliptrip'); // a contestable case
        const c = s.claims![0]!;
        applyClaimResponse(s, c.id, 'fight');
        if (s.claims![0]!.status === 'won') wins++;
      }
      return wins / N;
    }
    expect(winRate(true)).toBeGreaterThan(winRate(false));
  });

  it('a lost fight costs more than settling would have', () => {
    // find a seed that loses, then check the bill exceeds the settlement
    let s: GameState | undefined;
    let claim: Claim | undefined;
    for (let seed = 1; seed < 200; seed++) {
      const t = newGame();
      t.rngState = seed * 40503;
      seedInjuryClaim(t, 'sliptrip');
      const c = t.claims![0]!;
      applyClaimResponse(t, c.id, 'fight');
      if (t.claims![0]!.status === 'lost') {
        s = t;
        claim = c;
        break;
      }
    }
    expect(s).toBeDefined();
    expect(claimsYrK(s!, 0)).toBeGreaterThan(claim!.settleK);
  });
});

describe('claim spawning', () => {
  it('a firm connection overdue past the cap escalates to a damages suit', () => {
    const s = newGame();
    s.applications.push({
      id: 1,
      kind: 'dataCentre',
      name: 'Eastbox Compute',
      x: 5,
      y: 5,
      mw: 60,
      customers: 50,
      status: 'firm',
      decideByMin: 0,
      connectByMin: 0, // due at t=0
    });
    // not yet escalated just past the cap-1
    s.simTimeMin = (DAMAGES_ESCALATE_DAYS - 1) * 1440;
    stepLitigation(s, new Rng(1), 1440, new Map(), () => undefined);
    expect(openClaims(s).some((c) => c.kind === 'damages')).toBe(false);
    // now past the cap → a single damages claim
    s.simTimeMin = (DAMAGES_ESCALATE_DAYS + 2) * 1440;
    stepLitigation(s, new Rng(1), 1440, new Map(), () => undefined);
    const damages = openClaims(s).filter((c) => c.kind === 'damages');
    expect(damages).toHaveLength(1);
    // it escalates at most once
    stepLitigation(s, new Rng(1), 1440, new Map(), () => undefined);
    expect(openClaims(s).filter((c) => c.kind === 'damages')).toHaveLength(1);
  });

  it('a long mass outage seeds a group claim, deduped', () => {
    const s = newGame();
    expect(maybeSeedGroupClaim(s, GROUP_OUTAGE_CUSTMIN - 1)).toBe(false); // below threshold
    expect(maybeSeedGroupClaim(s, GROUP_OUTAGE_CUSTMIN * 2, 10, 10)).toBe(true);
    expect(openClaims(s).filter((c) => c.kind === 'group')).toHaveLength(1);
    // a second trigger while one is open does nothing
    expect(maybeSeedGroupClaim(s, GROUP_OUTAGE_CUSTMIN * 3)).toBe(false);
  });

  it('sustained pylon blight seeds a wayleave/nuisance claim', () => {
    const s = newGame();
    const blight = new Map<number, number>([[1, 30]]); // well over the threshold
    // run many days so the rare roll lands at least once
    let got = false;
    for (let d = 0; d < 4000 && !got; d++) {
      s.simTimeMin += 1440;
      stepLitigation(s, new Rng(d + 1), 1440, blight, () => ({ x: 3, y: 3 }));
      got = openClaims(s).some((c) => c.kind === 'wayleave');
    }
    expect(got).toBe(true);
  });
});

describe('save round-trip', () => {
  it('claims + the rolling rate round-trip', () => {
    const s = newGame();
    seedInjuryClaim(s, 'electrocution');
    applyClaimResponse(s, s.claims![0]!.id, 'settle');
    seedInjuryClaim(s, 'fall'); // an open one too
    const back = deserialize(serialize(s));
    expect(back.claims?.length).toBe(s.claims!.length);
    expect(claimsYrK(back, 0)).toBeCloseTo(claimsYrK(s, 0), 5);
    expect(openClaims(back)).toHaveLength(1);
  });

  it('a pre-feature save (no claims) hydrates clean', () => {
    const legacy = { ...serialize(newGame()) } as SaveData;
    delete legacy.claims;
    delete legacy.claimsYrK;
    const back = deserialize(legacy);
    expect(openClaims(back)).toHaveLength(0);
    expect(claimsYrK(back, 0)).toBe(0);
  });

  it('an untouched game serializes no litigation fields', () => {
    const data = serialize(newGame());
    expect('claims' in data).toBe(false);
    expect('claimsYrK' in data).toBe(false);
  });
});
