// Weather and diurnal shape. Cloud cover and wind run as mean-reverting
// random walks (seeded — saves replay identically); solar output follows
// the sun through the day under the cloud field; domestic demand has the
// classic morning shoulder and evening peak that the whole game's
// reinforcement pressure hangs off.

import type { Rng } from '../rng';

export interface WeatherState {
  /** 0..1 cloud cover. */
  cloud: number;
  /** 0..1 wind strength. */
  wind: number;
}

export function newWeather(): WeatherState {
  return { cloud: 0.35, wind: 0.5 };
}

/** Mean-reverting step; dtMin is game-minutes elapsed. */
export function stepWeather(w: WeatherState, rng: Rng, dtMin: number): void {
  const k = Math.min(1, dtMin / 600); // reversion over ~10 game-hours
  w.cloud += (0.4 - w.cloud) * k + (rng.next() - 0.5) * 0.25 * Math.sqrt(k);
  w.wind += (0.5 - w.wind) * k + (rng.next() - 0.5) * 0.3 * Math.sqrt(k);
  w.cloud = Math.min(1, Math.max(0, w.cloud));
  w.wind = Math.min(1, Math.max(0, w.wind));
}

function hourOf(simTimeMin: number): number {
  return (simTimeMin / 60) % 24;
}

/** Solar capacity factor right now (0..1). */
export function sunFactor(simTimeMin: number, w: WeatherState): number {
  const h = hourOf(simTimeMin);
  if (h < 5.5 || h > 20.5) return 0;
  const arc = Math.sin((Math.PI * (h - 5.5)) / 15);
  return Math.max(0, arc * (1 - 0.75 * w.cloud));
}

/** Wind capacity factor right now (0..1); offshore runs a little harder. */
export function windFactor(w: WeatherState, offshore: boolean): number {
  const f = 0.1 + 0.85 * w.wind;
  return Math.min(1, offshore ? f * 1.2 : f);
}

/** Domestic demand multiplier (1.0 = evening peak / ADMD). */
export function domesticProfile(simTimeMin: number): number {
  const h = hourOf(simTimeMin);
  const morning = 0.2 * Math.exp(-(((h - 7.8) / 1.6) ** 2));
  const evening = 0.62 * Math.exp(-(((h - 18.4) / 2.3) ** 2));
  return 0.38 + morning + evening;
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

/** Heat-pump multiplier — cold mornings and evenings, worse under cloud. */
export function hpProfile(simTimeMin: number, cloud: number): number {
  const h = hourOf(simTimeMin);
  const morning = Math.exp(-(((h - 7) / 2.2) ** 2));
  const evening = Math.exp(-(((h - 19.5) / 2.6) ** 2));
  return 0.35 + 0.3 * morning + 0.3 * evening + 0.25 * cloud;
}
