// Weather, seasons and diurnal shape. The year runs a winter↔summer cycle
// (seasonFactor) that stretches the sun arc, scales heating demand and
// loads the storm dice Oct–Mar. On top of the season sits a multi-day
// REGIME state machine (windy-wet / calm-cold / mild / heatwave fronts,
// 2–6 game-days each, seeded — saves replay identically); cloud and wind
// jitter per tick inside the active regime's envelope, mean-reverting so
// regime handovers arrive as smooth fronts, not steps. Solar output
// follows the seasonal sun under the cloud field; domestic demand keeps
// the classic morning shoulder and evening peak that the whole game's
// reinforcement pressure hangs off.

import type { Rng } from '../rng';

// ----------------------------------------------------------------------
// The calendar: 365-day years mapped straight off simTimeMin.

export const DAYS_PER_YEAR = 365;
const MIN_PER_DAY = 1440;
/** Day-of-year the scenario starts on (game day 1 ≈ 1 May): spring, so a
 *  new operator gets most of a year on their feet before the first real
 *  winter peak bites. */
export const GAME_START_DOY = 121;
/** Coldest day of the GB year (mid-January). */
const COLDEST_DOY = 15;

/** Season cycle, 0..1: 1 = deep winter (mid-January), 0 = high summer
 *  (mid-July). Smooth cosine — pure function of time, save-compatible. */
export function seasonFactor(simTimeMin: number): number {
  const doy = GAME_START_DOY + simTimeMin / MIN_PER_DAY;
  return 0.5 + 0.5 * Math.cos((2 * Math.PI * (doy - COLDEST_DOY)) / DAYS_PER_YEAR);
}

/** Sim minute of midnight on the first occurrence of a calendar
 *  day-of-year (for "typical winter/summer day" profile runs). */
export function simMinOfDoy(doy: number): number {
  return ((((doy - GAME_START_DOY) % DAYS_PER_YEAR) + DAYS_PER_YEAR) % DAYS_PER_YEAR) * MIN_PER_DAY;
}

/** Canonical coldest / warmest days for season-selected profiles. */
export const MIDWINTER_MIN = simMinOfDoy(COLDEST_DOY);
export const MIDSUMMER_MIN = simMinOfDoy(COLDEST_DOY + Math.round(DAYS_PER_YEAR / 2));

// ----------------------------------------------------------------------
// Multi-day weather regimes.

export type WeatherRegime = 'windy-wet' | 'calm-cold' | 'mild' | 'heatwave';

export interface WeatherState {
  /** 0..1 cloud cover. */
  cloud: number;
  /** 0..1 wind strength. */
  wind: number;
  /** Current multi-day regime. Optional so pre-season saves hydrate;
   *  stepWeather initializes deterministically on first step. */
  regime?: WeatherRegime;
  /** Pre-rolled next regime, so the forecast strip can read ahead. */
  nextRegime?: WeatherRegime;
  /** Sim minute the current regime hands over to the next. */
  regimeEndsMin?: number;
}

interface RegimeSpec {
  /** Wind envelope centre (plus a winter boost — Atlantic lows run
   *  harder in the cold half of the year). */
  wind: number;
  windWinterBoost: number;
  /** Cloud envelope centre. */
  cloud: number;
  /** Jitter half-widths: the per-tick walk lives inside mean ± band. */
  windBand: number;
  cloudBand: number;
}

const REGIMES: Record<WeatherRegime, RegimeSpec> = {
  // Atlantic front conveyor: gales and rain; storms live here.
  'windy-wet': { wind: 0.66, windWinterBoost: 0.12, cloud: 0.8, windBand: 0.15, cloudBand: 0.15 },
  // Winter anticyclone: still air and gloom — the dunkelflaute set-piece.
  'calm-cold': { wind: 0.1, windWinterBoost: 0, cloud: 0.55, windBand: 0.08, cloudBand: 0.2 },
  // Changeable nothing-weather; the old baseline behaviour.
  mild: { wind: 0.45, windWinterBoost: 0.05, cloud: 0.4, windBand: 0.15, cloudBand: 0.2 },
  // Summer blocking high: clear, hot, becalmed.
  heatwave: { wind: 0.18, windWinterBoost: 0, cloud: 0.06, windBand: 0.08, cloudBand: 0.06 },
};

/** Regimes last 2–6 game-days. */
export const REGIME_MIN_DAYS = 2;
export const REGIME_MAX_DAYS = 6;

function regimeDurationMin(rng: Rng): number {
  return rng.range(REGIME_MIN_DAYS, REGIME_MAX_DAYS) * MIN_PER_DAY;
}

/** Seeded regime draw, weighted by season: windy-wet fronts queue up
 *  Oct–Mar (so storms cluster there), calm-cold is winter-only, the
 *  heatwave is summer-only, mild fills the rest. */
function pickRegime(rng: Rng, winterness: number): WeatherRegime {
  const windyWet = 0.15 + 0.3 * winterness;
  const calmCold = winterness > 0.55 ? (0.35 * (winterness - 0.55)) / 0.45 : 0;
  const heatwave = winterness < 0.35 ? (0.3 * (0.35 - winterness)) / 0.35 : 0;
  const mild = Math.max(0, 1 - windyWet - calmCold - heatwave);
  let roll = rng.next() * (windyWet + calmCold + heatwave + mild);
  if ((roll -= windyWet) < 0) return 'windy-wet';
  if ((roll -= calmCold) < 0) return 'calm-cold';
  if ((roll -= heatwave) < 0) return 'heatwave';
  return 'mild';
}

export function newWeather(): WeatherState {
  // regimeEndsMin 0 ⇒ the first stepWeather rolls the opening hand
  // (deterministically, off the state RNG)
  return { cloud: 0.35, wind: 0.5, regime: 'mild', nextRegime: 'mild', regimeEndsMin: 0 };
}

/** Mean-reverting step inside the active regime's envelope; dtMin is
 *  game-minutes elapsed. Regime turnover, duration and all jitter come
 *  off the seeded RNG — same seed, same weather. */
export function stepWeather(
  w: WeatherState,
  rng: Rng,
  dtMin: number,
  simTimeMin: number,
): void {
  // pre-season saves (or a fresh newWeather) initialize lazily
  if (w.regime === undefined || w.nextRegime === undefined || w.regimeEndsMin === undefined) {
    w.regime = 'mild';
    w.regimeEndsMin = simTimeMin + regimeDurationMin(rng);
    w.nextRegime = pickRegime(rng, seasonFactor(w.regimeEndsMin));
  }
  // regime turnover: the pre-rolled front moves in; queue the next one
  // (picked for the season it will actually arrive in)
  while (simTimeMin >= w.regimeEndsMin) {
    w.regime = w.nextRegime;
    w.regimeEndsMin += regimeDurationMin(rng);
    w.nextRegime = pickRegime(rng, seasonFactor(w.regimeEndsMin));
  }

  const spec = REGIMES[w.regime];
  const s = seasonFactor(simTimeMin);
  const windMean = Math.min(1, spec.wind + spec.windWinterBoost * s);
  // reversion over ~8 game-hours: a new regime arrives as a front, the
  // walk easing toward its envelope rather than snapping
  const k = Math.min(1, dtMin / 480);
  const sq = Math.sqrt(k);
  w.cloud += (spec.cloud - w.cloud) * k + (rng.next() - 0.5) * 2 * spec.cloudBand * sq;
  w.wind += (windMean - w.wind) * k + (rng.next() - 0.5) * 2 * spec.windBand * sq;
  w.cloud = Math.min(1, Math.max(0, w.cloud));
  w.wind = Math.min(1, Math.max(0, w.wind));
}

// ----------------------------------------------------------------------
// Sun, tide, wind.

function hourOf(simTimeMin: number): number {
  return (simTimeMin / 60) % 24;
}

/** Solar capacity factor right now (0..1). The arc is seasonal: ~16.5 h
 *  and full strength at midsummer, ~8 h and a low weak sun midwinter. */
export function sunFactor(simTimeMin: number, w: { cloud: number }): number {
  const s = seasonFactor(simTimeMin);
  const dayLen = 16.5 - 8.5 * s;
  const rise = 13 - dayLen / 2;
  const h = hourOf(simTimeMin);
  if (h < rise || h > rise + dayLen) return 0;
  const arc = Math.sin((Math.PI * (h - rise)) / dayLen);
  const amp = 1 - 0.45 * s; // winter sun sits low even at noon
  return Math.max(0, arc * amp * (1 - 0.75 * w.cloud));
}

/** Tidal-stream capacity factor: the estuary runs on a ~12.4 h cycle with
 *  slack water between flood and ebb — predictable, but never constant. */
export function tideFactor(simTimeMin: number): number {
  const cycle = (simTimeMin / (12.4 * 60)) * 2 * Math.PI;
  return Math.abs(Math.sin(cycle)) ** 1.5;
}

/** Wind capacity factor right now (0..1); offshore runs a little harder. */
export function windFactor(w: { wind: number }, offshore: boolean): number {
  const f = 0.1 + 0.85 * w.wind;
  return Math.min(1, offshore ? f * 1.2 : f);
}

// ----------------------------------------------------------------------
// Demand profiles. All take simTimeMin, which carries both the hour of
// day AND the date — season scaling happens inside, so every caller
// (dispatch, balance, service) gets it for free.

/** Domestic demand multiplier (1.0 ≈ evening peak / ADMD on a shoulder
 *  day). Modest seasonal swing: ×1.15 midwinter (dark evenings, heating
 *  margins), ×0.95 midsummer. */
export function domesticProfile(simTimeMin: number): number {
  const h = hourOf(simTimeMin);
  const morning = 0.2 * Math.exp(-(((h - 7.8) / 1.6) ** 2));
  const evening = 0.62 * Math.exp(-(((h - 18.4) / 2.3) ** 2));
  const season = 0.95 + 0.2 * seasonFactor(simTimeMin);
  return (0.38 + morning + evening) * season;
}

/** Industrial/glasshouse process multiplier (flatter; lights run late). */
export function processProfile(simTimeMin: number): number {
  const h = hourOf(simTimeMin);
  const daytime = Math.exp(-(((h - 13) / 5) ** 2));
  return 0.72 + 0.28 * daytime;
}

/** EV charging multiplier — everyone plugs in when they get home. The
 *  smart-charging innovation spreads the peak into the night. */
export function evProfile(simTimeMin: number, smartCharging: boolean): number {
  const h = hourOf(simTimeMin);
  const peak = Math.exp(-(((h - 19.4) / 1.9) ** 2));
  const overnight = h < 6 ? 0.35 : 0.08;
  return smartCharging ? 0.5 * peak + overnight + 0.25 : peak + overnight * 0.4;
}

/** Heat-pump multiplier — cold mornings and evenings, worse under cloud,
 *  and strongly seasonal: ×1.8 in the depth of winter (cold-weather
 *  heating load is THE winter-peak driver), ×0.3 at midsummer when only
 *  hot water runs. */
export function hpProfile(simTimeMin: number, cloud: number): number {
  const h = hourOf(simTimeMin);
  const morning = Math.exp(-(((h - 7) / 2.2) ** 2));
  const evening = Math.exp(-(((h - 19.5) / 2.6) ** 2));
  const season = 0.3 + 1.5 * seasonFactor(simTimeMin);
  return (0.35 + 0.3 * morning + 0.3 * evening + 0.25 * cloud) * season;
}
