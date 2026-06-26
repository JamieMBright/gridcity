// Per-country regulator & policy localization (owner ask, 2026-06-26):
// "RIIO / Ofgem / DUoS are British concepts and must NOT appear in non-GB
// cities. Country-specific policy must proliferate and MATERIALLY change the
// targets/metrics/framing per country. London + North-East England share GB
// laws. In GB, spell out RIIO."
//
// This suite is the GUARD:
//   1. each city resolves its real country's regulator (Berlin→BNetzA,
//      New York→NYPSC, Pune→MERC, …); London + North-East share GB/Ofgem.
//   2. NO British regulator term (RIIO / Ofgem / DUoS / CI/CML) leaks into any
//      NON-GB profile's framing strings — and GB DOES use them.
//   3. GB spells out RIIO (the gloss), and every country has its own gloss.
//   4. the framing is complete + the KPI weights renormalise to 1 per country,
//      and the materially-different weights actually re-score a network.

import { describe, expect, it } from 'vitest';
import { profileOf, getScenario } from '../src/data/cityRegistry';
import {
  COUNTRY_PROFILES,
  LONDON_PROFILE,
  type CountryId,
  type ResolvedProfile,
} from '../src/sim/powerProfile';
import {
  BASE_WEIGHTS,
  closePeriod,
  newPeriod,
  resolveFraming,
  resolveWeights,
  type KpiKey,
  type PeriodActuals,
  type PeriodTargets,
  type RegulatorFraming,
} from '../src/sim/regulation/riio';

// --- 1. each city resolves its OWN country regulator -----------------------

describe('per-country regulator selection', () => {
  // city → [country, regulator name] the player should see.
  const CITY_REGULATOR: Record<string, [CountryId, string]> = {
    london: ['GB', 'Ofgem'],
    northeast: ['GB', 'Ofgem'], // owner: London + North-East share GB laws
    paris: ['FR', 'CRE'],
    newyork: ['US', 'NYPSC'],
    sydney: ['AU', 'AER'],
    hongkong: ['HK', 'EMSD'],
    berlin: ['DE', 'BNetzA'],
    shanghai: ['CN', 'NEA / NDRC'],
    capetown: ['ZA', 'NERSA'],
    cairo: ['EG', 'EgyptERA'],
    athens: ['GR', 'RAE'],
    pune: ['IN', 'MERC'],
  };

  for (const [city, [country, regName]] of Object.entries(CITY_REGULATOR)) {
    it(`${city} → ${country} regulator "${regName}"`, () => {
      const p = profileOf(city);
      expect(p.regulator.name).toBe(regName);
      expect(p).toEqual(COUNTRY_PROFILES[country]);
    });
  }

  it('London and North-East England share the SAME GB profile (one country)', () => {
    // owner: "London and North East can have same shared laws"
    expect(profileOf('northeast')).toEqual(profileOf('london'));
    expect(profileOf('northeast')).toEqual(LONDON_PROFILE);
    expect(getScenario('northeast').country).toBe('GB');
  });

  it('every NON-GB city departs from the GB profile (no GB-skinned clones)', () => {
    for (const city of Object.keys(CITY_REGULATOR)) {
      if (CITY_REGULATOR[city]![0] === 'GB') continue;
      expect(profileOf(city)).not.toEqual(LONDON_PROFILE);
      // and its currency is NOT the £ (each city bills in its own money)
      expect(profileOf(city).economy.iso).not.toBe('GBP');
    }
  });
});

// --- 2. NO British term leaks into a non-GB regulator's framing ------------

/** The fully-resolved framing strings a non-GB city must never contain. */
function framingStrings(p: ResolvedProfile): string {
  const f = resolveFraming(p.regulator.model, p.regulator.framing);
  return [
    p.regulator.name,
    f.scheme,
    f.schemeGloss,
    f.review,
    f.blurb,
    f.reliabilityMetric,
    f.ciLabel,
    f.cmlLabel,
    f.networkChargeLabel,
    f.constraintLabel,
    f.returnHint,
    f.safetyBody,
  ].join(' ');
}

// British regulator/scheme terms (word-boundary so e.g. "CRE" doesn't match
// "incentive"). Each must be absent from EVERY non-GB profile's framing.
const BRITISH_TERMS = [
  /\bRIIO\b/,
  /\bOfgem\b/,
  /\bDUoS\b/i,
  /\bCI\s*\/\s*CML\b/i,
  /\bRAV\b/, // GB Regulatory Asset Value (US = rate base)
  /\bHSE\b/, // GB Health & Safety Executive
  /\bNational Grid\b/,
];

describe('no British term leaks outside GB', () => {
  for (const id of Object.keys(COUNTRY_PROFILES) as CountryId[]) {
    if (id === 'GB') continue;
    it(`${id} framing carries no RIIO/Ofgem/DUoS/CI-CML/HSE`, () => {
      const text = framingStrings(COUNTRY_PROFILES[id]);
      for (const term of BRITISH_TERMS) {
        expect(text, `"${text}"`).not.toMatch(term);
      }
    });
  }

  it('GB DOES use its own British terms (Ofgem / RIIO / DUoS / CI-CML / HSE)', () => {
    const text = framingStrings(LONDON_PROFILE);
    expect(text).toMatch(/\bOfgem\b/);
    expect(text).toMatch(/\bRIIO\b/);
    expect(text).toMatch(/\bDUoS\b/i);
    expect(text).toMatch(/\bCI\s*\/\s*CML\b/i);
    expect(text).toMatch(/\bHSE\b/);
  });

  it('the playable non-GB cities each name a DISTINCT scheme + metric', () => {
    // Berlin/New York/Pune must read in their own regulatory language.
    const berlin = resolveFraming(profileOf('berlin').regulator.model, profileOf('berlin').regulator.framing);
    const ny = resolveFraming(profileOf('newyork').regulator.model, profileOf('newyork').regulator.framing);
    const pune = resolveFraming(profileOf('pune').regulator.model, profileOf('pune').regulator.framing);
    expect(berlin.scheme).toBe('Anreizregulierung');
    expect(berlin.reliabilityMetric).toMatch(/SAIDI/);
    expect(ny.scheme).toBe('rate case');
    expect(ny.reliabilityMetric).toMatch(/SAIDI/);
    expect(pune.scheme).toBe('Multi-Year Tariff');
    expect(pune.reliabilityMetric).toMatch(/AT&C/); // the defining Indian metric
    // none of them name a British charge
    for (const f of [berlin, ny, pune]) {
      expect(f.networkChargeLabel).not.toMatch(/DUoS/i);
    }
  });
});

// --- 3. GB spells out RIIO; every country has its own gloss ----------------

describe('every scheme is spelled out (the gloss)', () => {
  it('GB spells out RIIO = Revenue + Incentives + Innovation + Outputs', () => {
    const f = resolveFraming(LONDON_PROFILE.regulator.model, LONDON_PROFILE.regulator.framing);
    expect(f.schemeGloss).toMatch(/RIIO/);
    expect(f.schemeGloss).toMatch(/Incentives/i);
    expect(f.schemeGloss).toMatch(/Innovation/i);
    expect(f.schemeGloss).toMatch(/Outputs/i);
  });

  it('every country ships a non-empty gloss naming its own scheme', () => {
    for (const id of Object.keys(COUNTRY_PROFILES) as CountryId[]) {
      const f = resolveFraming(
        COUNTRY_PROFILES[id].regulator.model,
        COUNTRY_PROFILES[id].regulator.framing,
      );
      expect(f.schemeGloss.length, id).toBeGreaterThan(20);
      // the gloss spells out the scheme tag (RIIO/Anreizregulierung/MYT/…);
      // case-insensitive since a gloss may capitalise it at the sentence start.
      expect(f.schemeGloss.toLowerCase(), id).toContain(f.scheme.toLowerCase());
    }
  });
});

// --- 4. framing complete + weights renormalise + materially re-score -------

describe('framing completeness + material KPI-weight differences', () => {
  it('every country has a complete, non-empty framing', () => {
    const keys: (keyof RegulatorFraming)[] = [
      'scheme',
      'schemeGloss',
      'review',
      'blurb',
      'reliabilityMetric',
      'ciLabel',
      'cmlLabel',
      'networkChargeLabel',
      'constraintLabel',
      'returnHint',
      'safetyBody',
    ];
    for (const id of Object.keys(COUNTRY_PROFILES) as CountryId[]) {
      const f = resolveFraming(
        COUNTRY_PROFILES[id].regulator.model,
        COUNTRY_PROFILES[id].regulator.framing,
      );
      for (const k of keys) expect((f[k] ?? '').length, `${id}.${k}`).toBeGreaterThan(0);
    }
  });

  it('every country regulator weight set renormalises to 1', () => {
    for (const id of Object.keys(COUNTRY_PROFILES) as CountryId[]) {
      const w = resolveWeights(COUNTRY_PROFILES[id].regulator.kpiWeights);
      const sum = (Object.keys(w) as KpiKey[]).reduce((s, k) => s + w[k], 0);
      expect(sum, id).toBeCloseTo(1, 9);
    }
  });

  it('GB uses the BASE_WEIGHTS unchanged (determinism anchor)', () => {
    expect(resolveWeights(LONDON_PROFILE.regulator.kpiWeights)).toBe(BASE_WEIGHTS);
  });

  it('the SAME network scores DIFFERENTLY under different regulators (material)', () => {
    const TARGETS: PeriodTargets = {
      bill: 3000,
      ci: 60,
      cml: 90,
      carbon: 250,
      curtailedFirm: 20_000,
      satisfaction: 60,
    };
    const scoreUnder = (country: CountryId, a: PeriodActuals): number =>
      closePeriod(newPeriod(1, 0, TARGETS), a, resolveWeights(COUNTRY_PROFILES[country].regulator.kpiWeights))
        .composite;

    // a carbon-DIRTY but cheap network: Germany (BNetzA, carbon-lean, weight
    // 0.20) punishes it harder than India (MERC, carbon weight only 0.10).
    const cheapDirty: PeriodActuals = {
      bill: 2200,
      ci: 60,
      cml: 90,
      carbon: 550,
      curtailedFirm: 20_000,
      satisfaction: 60,
    };
    expect(scoreUnder('DE', cheapDirty)).toBeLessThan(scoreUnder('IN', cheapDirty));

    // a reliability-STAR but expensive network: India (reliability weight 0.40
    // across CI+CML) rewards it more than Germany (0.27 across CI+CML).
    const reliableExpensive: PeriodActuals = {
      bill: 3600,
      ci: 25,
      cml: 30,
      carbon: 250,
      curtailedFirm: 20_000,
      satisfaction: 62,
    };
    expect(scoreUnder('IN', reliableExpensive)).toBeGreaterThan(scoreUnder('DE', reliableExpensive));
  });
});
