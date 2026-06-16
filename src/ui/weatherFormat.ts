// Pure weather-display helpers shared across the HUD: real km/h windspeeds
// and the Met-Office hazard branding (yellow → amber → red). Kept in one
// place so the always-on StormBanner / weather chip and the escalated
// SevereWeatherAlert modal read identical numbers and colours. All pure +
// unit-tested (tests/severeWeather.test.ts), no React, no snapshot types.
//
// Units doctrine (owner, 2026-06-14): express wind in real km/h, not an
// abstract "%". The sim's wind/severity is a 0..1 intensity; both the live
// regime wind and the forecast severity ride the SAME 0..1 scale (the storm
// regime sits at ~0.92), so the two converters below share an anchor.

/** Forecast peak GUST in km/h from the sim's wind-intensity `severity`
 *  (0..1). Anchored to real GB storms: Beaufort gale 62–88, storm 89–117,
 *  violent storm 103–117, hurricane-force ≥118; named UK storms commonly
 *  gust 120–160+ km/h (e.g. Éowyn 2025), a routine windy front ~60–90. We
 *  peg severity 0.85 (the sim's severe cut) ≈ 95 km/h and 1.0 ≈ 150, so
 *  named storms (0.92+) land 120–160 and routine fronts sit below. */
export function gustKmh(severity: number): number {
  return Math.round(Math.max(50, Math.min(165, 95 + (severity - 0.85) * 367)));
}

/** Live SUSTAINED (mean) windspeed in km/h from the regime wind (0..1).
 *  Distinct from gusts: gusts run ~25–35% higher than the sustained mean, so
 *  this reads lower than gustKmh at the same intensity. Anchored to Beaufort
 *  so the regime envelopes read true: calm-cold 0.1 ≈ a light air ~8 km/h,
 *  mild 0.45 ≈ a moderate breeze ~35 km/h, windy-wet 0.66 ≈ near gale
 *  ~52 km/h, storm 0.92 ≈ a violent storm ~78 km/h sustained (gusting well
 *  past hurricane force). Monotonic, clamped to a sane band. */
export function windKmh(wind: number): number {
  const w = Math.max(0, Math.min(1, wind));
  return Math.round(Math.max(3, Math.min(130, 4 + w * 84)));
}

/** Met Office-style warning level from the peak gust (km/h): YELLOW = some
 *  low-level disruption; AMBER ≈ 60–90 mph (~100–145 km/h), significant
 *  impact / danger to life; RED = exceptional, ~145+ km/h. */
export type WarnLevel = 'yellow' | 'amber' | 'red';
export function warningLevel(gust: number): WarnLevel {
  if (gust >= 145) return 'red';
  if (gust >= 100) return 'amber';
  return 'yellow';
}

/** Colour + label for a warning level (the hazardous yellow→amber→red
 *  branding the public sees). */
export const WARN_STYLE: Record<WarnLevel, { color: string; label: string }> = {
  yellow: { color: '#e9c84a', label: 'YELLOW WARNING' },
  amber: { color: '#ff8a1e', label: 'AMBER WARNING' },
  red: { color: '#e0697a', label: 'RED WARNING' },
};

/** A short Met-style severity word for a warning level (compact chips). */
export const WARN_WORD: Record<WarnLevel, string> = {
  yellow: 'YELLOW',
  amber: 'AMBER',
  red: 'RED',
};

/** Game-minutes → a friendly "1d 4h" / "5h 20m" countdown. */
export function formatEta(remainingMin: number): string {
  const m = Math.max(0, Math.round(remainingMin));
  const days = Math.floor(m / 1440);
  const hours = Math.floor((m % 1440) / 60);
  const mins = m % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}
