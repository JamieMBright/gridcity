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

export type WeatherRegime = 'windy-wet' | 'calm-cold' | 'mild' | 'heatwave' | 'storm';

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
  /** Dedupe key for the disaster-incident announcer (events/incidents.ts):
   *  the regimeEndsMin of the regime instance whose named incident has
   *  already been announced, so a storm/heatwave fires its banner exactly
   *  once however many ticks it spans. Additive — absent on old saves. */
  incidentKeyMin?: number;
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
  // Atlantic front conveyor: gales and rain — heavy enough to flood, but
  // it stays under the storm-fault threshold (faults.ts isStorm = 0.85).
  'windy-wet': { wind: 0.66, windWinterBoost: 0.12, cloud: 0.85, windBand: 0.15, cloudBand: 0.12 },
  // Named storm / severe windstorm: gusts well past the 0.85 fault
  // threshold (and the 0.7 severe band) with torrential rain. The
  // set-piece disaster — short and sharp.
  storm: { wind: 0.92, windWinterBoost: 0.06, cloud: 0.95, windBand: 0.06, cloudBand: 0.05 },
  // Winter anticyclone: still air and gloom — the dunkelflaute set-piece.
  'calm-cold': { wind: 0.1, windWinterBoost: 0, cloud: 0.55, windBand: 0.08, cloudBand: 0.2 },
  // Changeable nothing-weather; the old baseline behaviour.
  mild: { wind: 0.45, windWinterBoost: 0.05, cloud: 0.4, windBand: 0.15, cloudBand: 0.2 },
  // Summer blocking high: clear, hot, becalmed.
  heatwave: { wind: 0.18, windWinterBoost: 0, cloud: 0.06, windBand: 0.08, cloudBand: 0.06 },
};

/** Regimes last 2–6 game-days — but a storm blows through in 1–2 (a
 *  severe windstorm is hours-to-a-day in reality; we round up for play). */
export const REGIME_MIN_DAYS = 2;
export const REGIME_MAX_DAYS = 6;
export const STORM_MIN_DAYS = 1;
export const STORM_MAX_DAYS = 2;

function regimeDurationMin(rng: Rng, regime: WeatherRegime): number {
  return regime === 'storm'
    ? rng.range(STORM_MIN_DAYS, STORM_MAX_DAYS) * MIN_PER_DAY
    : rng.range(REGIME_MIN_DAYS, REGIME_MAX_DAYS) * MIN_PER_DAY;
}

/** Seeded regime draw, weighted by season: windy-wet fronts (and the
 *  occasional named STORM that escalates out of them) queue up Oct–Mar,
 *  calm-cold is winter-only, the heatwave is summer-only, mild fills the
 *  rest. Storms are deliberately frequent enough to actually be seen —
 *  a notable blow every couple of weeks in the stormy half of the year. */
function pickRegime(rng: Rng, winterness: number): WeatherRegime {
  // a named storm is a winter-weighted slice carved out of the windy band
  const storm = 0.04 + 0.16 * winterness;
  const windyWet = 0.13 + 0.22 * winterness;
  const calmCold = winterness > 0.55 ? (0.32 * (winterness - 0.55)) / 0.45 : 0;
  const heatwave = winterness < 0.35 ? (0.32 * (0.35 - winterness)) / 0.35 : 0;
  const mild = Math.max(0, 1 - storm - windyWet - calmCold - heatwave);
  let roll = rng.next() * (storm + windyWet + calmCold + heatwave + mild);
  if ((roll -= storm) < 0) return 'storm';
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
    w.regimeEndsMin = simTimeMin + regimeDurationMin(rng, 'mild');
    w.nextRegime = pickRegime(rng, seasonFactor(w.regimeEndsMin));
  }
  // regime turnover: the pre-rolled front moves in; queue the next one
  // (picked for the season it will actually arrive in)
  while (simTimeMin >= w.regimeEndsMin) {
    w.regime = w.nextRegime;
    w.regimeEndsMin += regimeDurationMin(rng, w.regime);
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

/** True when a regime is rain-heavy enough to pose a flood risk — the
 *  Atlantic conveyor and its escalated storms dump the rain. */
export function isWet(regime: WeatherRegime | undefined): boolean {
  return regime === 'windy-wet' || regime === 'storm';
}

/** Cooling-load multiplier on domestic demand during hot spells: a
 *  heatwave drives AC/refrigeration/fans and pushes the evening peak.
 *  Returns the EXTRA fraction of domestic demand (0 in normal weather, up
 *  to ~+0.35 at the height of a clear-sky heatwave). Pure function of
 *  weather + season — deterministic, paused-safe. */
export function coolingFactor(simTimeMin: number, w: { regime?: WeatherRegime; cloud: number }): number {
  if (w.regime !== 'heatwave') return 0;
  const summer = 1 - seasonFactor(simTimeMin); // 1 = high summer
  const h = hourOf(simTimeMin);
  // cooling load tracks the afternoon-into-evening heat, eased by cloud
  const diurnal = Math.exp(-(((h - 16) / 4) ** 2));
  return 0.35 * summer * diurnal * (1 - 0.6 * w.cloud);
}

/** Thermal rating derate during a heatwave: hot ambient air robs overhead
 *  lines and transformers of their cooling margin, so their effective
 *  rating falls. Returns a rating multiplier ≤ 1 (1 = no derate). Pure
 *  function of weather + season. */
export function thermalDerate(simTimeMin: number, w: { regime?: WeatherRegime }): number {
  if (w.regime !== 'heatwave') return 1;
  const summer = 1 - seasonFactor(simTimeMin);
  return 1 - 0.08 * summer; // up to ~8% off ratings at peak summer heat
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
