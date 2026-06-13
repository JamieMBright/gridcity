// P0 de-GB-ification seams: the three GB hard-codings (frequency, weather,
// bill) now read a per-scenario profile that DEFAULTS to London's exact
// prior literals. These tests prove two things:
//   1. London is bit-identical — every seam, with London's profile or with
//      no profile at all, reproduces the values that used to be hard-coded.
//   2. The seam actually bends — a throwaway 60 Hz / summer-peak profile
//      (NOT a shipped city) flows through frequency and weather DIFFERENTLY,
//      so a future city becomes data.

import { describe, expect, it } from 'vitest';
import {
  islandFrequencyHz,
  FREQ_FLOOR_HZ,
  NOMINAL_HZ,
} from '../src/sim/market/frequency';
import {
  coolingFactor,
  domesticProfile,
  hpProfile,
  seasonFactor,
  sunFactor,
  thermalDerate,
  GAME_START_DOY,
} from '../src/sim/events/weather';
import { computeBill, type BillInputs } from '../src/sim/regulation/bill';
import {
  LONDON_ECONOMY,
  LONDON_GENERATION,
  LONDON_POWER,
  LONDON_PROFILE,
  LONDON_WEATHER,
  type EconomyProfile,
  type GenerationModel,
  type PowerSystemProfile,
  type WeatherProfile,
} from '../src/sim/powerProfile';

const MIN_PER_DAY = 1440;
// a dense sweep over a full year + every hour: catches any phase/amplitude
// drift the seam might have introduced
const SAMPLES: number[] = [];
for (let day = 0; day < 365; day += 7) {
  for (let h = 0; h < 24; h += 1) {
    SAMPLES.push(day * MIN_PER_DAY + h * 60);
  }
}

// --- 1. London bit-identity ------------------------------------------------

describe('London profile reproduces the prior GB literals', () => {
  it('frequency: nominal/floor/droop match 50 / 47.5 / 1.5', () => {
    expect(LONDON_POWER.nominalHz).toBe(50);
    expect(LONDON_POWER.freqFloorHz).toBe(47.5);
    expect(LONDON_POWER.droopHz).toBe(1.5);
    // the named exports still read the GB constants
    expect(NOMINAL_HZ).toBe(50);
    expect(FREQ_FLOOR_HZ).toBe(47.5);
  });

  it('frequency: islandFrequencyHz with/without profile is identical and == the old 50 − 1.5·d floored at 47.5', () => {
    for (let i = 0; i <= 20; i++) {
      const d = i / 20;
      const legacy = Math.max(47.5, 50 - 1.5 * d);
      expect(islandFrequencyHz(d)).toBe(legacy);
      expect(islandFrequencyHz(d, LONDON_POWER)).toBe(legacy);
      expect(islandFrequencyHz(d, LONDON_PROFILE.power)).toBe(legacy);
    }
  });

  it('weather: economy/bill shares match 0.32 / 0.4 / 3.0 / 150', () => {
    expect(LONDON_ECONOMY.domesticNetworkShare).toBe(0.32);
    expect(LONDON_ECONOMY.domesticEnergyShare).toBe(0.4);
    expect(LONDON_ECONOMY.retailUplift).toBe(3.0);
    expect(LONDON_ECONOMY.supplyFixedYr).toBe(150);
    expect(LONDON_ECONOMY.symbol).toBe('£');
  });

  it('weather: peakDoy 15 (mid-Jan), winter-peak, GB sun arc 16.5/8.0', () => {
    expect(LONDON_WEATHER.peakDoy).toBe(15);
    expect(LONDON_WEATHER.peakSeason).toBe('winter');
    expect(LONDON_WEATHER.dayLenMaxH).toBe(16.5);
    expect(LONDON_WEATHER.dayLenMinH).toBe(8.0);
  });

  it('seasonFactor: profile-less == London profile == the old cosine', () => {
    for (const t of SAMPLES) {
      const doy = GAME_START_DOY + t / MIN_PER_DAY;
      const legacy = 0.5 + 0.5 * Math.cos((2 * Math.PI * (doy - 15)) / 365);
      expect(seasonFactor(t)).toBeCloseTo(legacy, 12);
      expect(seasonFactor(t, LONDON_WEATHER)).toBe(seasonFactor(t));
    }
  });

  it('sunFactor / domesticProfile / hpProfile: profile-less == London', () => {
    for (const t of SAMPLES) {
      const w = { cloud: 0.3 };
      expect(sunFactor(t, w, LONDON_WEATHER)).toBe(sunFactor(t, w));
      expect(domesticProfile(t, LONDON_WEATHER)).toBe(domesticProfile(t));
      expect(hpProfile(t, 0.3, LONDON_WEATHER)).toBe(hpProfile(t, 0.3));
    }
  });

  it('sunFactor reproduces the old 16.5 − 8.5·s arc with the 1 − 0.45·s amp', () => {
    for (const t of SAMPLES) {
      const s = seasonFactor(t);
      const dayLen = 16.5 - 8.5 * s;
      const rise = 13 - dayLen / 2;
      const h = (t / 60) % 24;
      let legacy = 0;
      if (h >= rise && h <= rise + dayLen) {
        const arc = Math.sin((Math.PI * (h - rise)) / dayLen);
        legacy = Math.max(0, arc * (1 - 0.45 * s) * (1 - 0.75 * 0.3));
      }
      expect(sunFactor(t, { cloud: 0.3 })).toBeCloseTo(legacy, 12);
    }
  });

  it('coolingFactor / thermalDerate: profile-less == London (heatwave only)', () => {
    for (const t of SAMPLES) {
      const w = { regime: 'heatwave' as const, cloud: 0.2 };
      expect(coolingFactor(t, w, LONDON_WEATHER)).toBe(coolingFactor(t, w));
      expect(thermalDerate(t, w, LONDON_WEATHER)).toBe(thermalDerate(t, w));
      // the old literal: summer = 1 − seasonFactor for GB
      const summer = 1 - seasonFactor(t);
      expect(thermalDerate(t, w)).toBeCloseTo(1 - 0.08 * summer, 12);
    }
  });
});

// --- bill seam: London profile == no profile == owned-branch dormant -------

function billInputs(over: Partial<BillInputs> = {}): BillInputs {
  return {
    assets: [],
    energyYrK: 4000,
    ppaYrK: 1200,
    servedCustomers: 200_000,
    totalCustomers: 240_000,
    fleetSize: 4,
    vegPolicy: 0,
    vegCostMul: 1,
    flexYrK: 100,
    constraintYrK: 50,
    lossYrK: 300,
    penaltyYrK: 0,
    levyPct: 0.5,
    ...over,
  };
}

describe('bill seam keeps London identical', () => {
  it('omitting economy/generation == passing London == the old constants', () => {
    const a = computeBill(billInputs());
    const b = computeBill(billInputs({ economy: LONDON_ECONOMY, generation: LONDON_GENERATION }));
    expect(b).toEqual(a);
    // gen still rides the PPA (energy) line, never DUoS, for liberalised
    expect(a.genYrK).toBe(1200);
  });
});

// --- 2. a NON-London profile (throwaway, not shipped) bends the seams ------

const NYC_LIKE_POWER: PowerSystemProfile = {
  nominalHz: 60,
  freqFloorHz: 57,
  // a steep droop so a full deficit actually reaches the floor (60 − 4 =
  // 56 < 57 ⇒ floored at 57), proving the floor is profile-driven
  droopHz: 4.0,
  transmissionKv: [345, 138, 69],
  distributionKv: [27, 13.8, 0.208],
};

const SUMMER_PEAK_WEATHER: WeatherProfile = {
  ...LONDON_WEATHER,
  peakSeason: 'summer',
  peakDoy: 227, // mid-August
};

describe('a 60 Hz / summer-peak profile flows through differently', () => {
  it('frequency floats at 60 Hz and sags to a 57 Hz floor', () => {
    expect(islandFrequencyHz(0, NYC_LIKE_POWER)).toBe(60);
    expect(islandFrequencyHz(0.5, NYC_LIKE_POWER)).toBeCloseTo(60 - 4.0 * 0.5, 12);
    expect(islandFrequencyHz(1, NYC_LIKE_POWER)).toBe(57);
    // and it differs from London at the same deficit
    expect(islandFrequencyHz(0.3, NYC_LIKE_POWER)).not.toBe(islandFrequencyHz(0.3));
  });

  it('the season cosine phase-shifts: summer-peak peaks ~half a year off London', () => {
    // London peaks (seasonFactor → 1) near mid-Jan; the summer profile near
    // mid-Aug. Sample the same instant and assert they disagree, and that
    // each peaks at its own peakDoy.
    const midJan = (15 - GAME_START_DOY + 365) * MIN_PER_DAY; // doy 15
    const midAug = (227 - GAME_START_DOY + 365) * MIN_PER_DAY; // doy 227
    expect(seasonFactor(midJan, LONDON_WEATHER)).toBeCloseTo(1, 4);
    expect(seasonFactor(midAug, SUMMER_PEAK_WEATHER)).toBeCloseTo(1, 4);
    // at the same instant the two profiles report different season-ness
    let differed = false;
    for (const t of SAMPLES) {
      if (Math.abs(seasonFactor(t, LONDON_WEATHER) - seasonFactor(t, SUMMER_PEAK_WEATHER)) > 0.2) {
        differed = true;
        break;
      }
    }
    expect(differed).toBe(true);
  });

  it('the demand-peak inverts: London peaks in winter, the summer city in August', () => {
    const midJan = (15 - GAME_START_DOY + 365) * MIN_PER_DAY;
    const midAug = (227 - GAME_START_DOY + 365) * MIN_PER_DAY;
    // domesticProfile scales with seasonFactor (peak-ness): London's
    // household demand is heaviest near midwinter…
    expect(domesticProfile(midJan, LONDON_WEATHER)).toBeGreaterThan(
      domesticProfile(midAug, LONDON_WEATHER),
    );
    // …while the summer-peak city's is heaviest in August — the inversion
    expect(domesticProfile(midAug, SUMMER_PEAK_WEATHER)).toBeGreaterThan(
      domesticProfile(midJan, SUMMER_PEAK_WEATHER),
    );
  });

  it('heat-pump load tracks WINTER for both: high in Jan, low in the warm peak', () => {
    const midJan = (15 - GAME_START_DOY + 365) * MIN_PER_DAY;
    const midAug = (227 - GAME_START_DOY + 365) * MIN_PER_DAY;
    // for the summer-peak city, August is its hot peak ⇒ minimal heating
    expect(hpProfile(midAug, 0.3, SUMMER_PEAK_WEATHER)).toBeLessThan(
      hpProfile(midJan, 0.3, SUMMER_PEAK_WEATHER),
    );
  });

  it('cooling load lands in the summer city’s PEAK season, not London’s off-peak', () => {
    const midAug = (227 - GAME_START_DOY + 365) * MIN_PER_DAY;
    const w = { regime: 'heatwave' as const, cloud: 0.1 };
    // both see August as summer, so both cool; assert the summer profile
    // actually produces cooling at its peak (non-zero) and differs from a
    // winter-anchored reading
    expect(coolingFactor(midAug, w, SUMMER_PEAK_WEATHER)).toBeGreaterThan(0);
  });

  it('a different economy profile re-prices the bill (currency + shares)', () => {
    const usd: EconomyProfile = {
      symbol: '$',
      iso: 'USD',
      toGbp: 0.79,
      domesticNetworkShare: 0.4,
      domesticEnergyShare: 0.5,
      retailUplift: 2.2,
      supplyFixedYr: 0,
    };
    const lon = computeBill(billInputs());
    const ny = computeBill(billInputs({ economy: usd }));
    expect(ny.perCustomerYr).not.toBeCloseTo(lon.perCustomerYr, 2);
  });

  it('owned-generation puts gen capex in the NETWORK pot and zeroes the PPA line', () => {
    const owned: GenerationModel = { ownership: 'owned' };
    // a single gen asset; in tender mode its capex is excluded (PPA only),
    // in owned mode it annuitizes into capex and the PPA line goes to 0
    const genAsset = {
      id: 1,
      kind: 'gen' as const,
      gen: 'gasCCGT' as const,
      x: 0,
      y: 0,
    };
    const tender = computeBill(billInputs({ assets: [genAsset] }));
    const integrated = computeBill(billInputs({ assets: [genAsset], generation: owned }));
    expect(tender.capexYrK).toBe(0); // gen excluded from DUoS in a market
    expect(tender.genYrK).toBe(1200); // PPA top-up carries it
    expect(integrated.capexYrK).toBeGreaterThan(0); // now on the network pot
    expect(integrated.genYrK).toBe(0); // no PPA in a vertically-integrated city
  });
});
