import { describe, expect, it } from 'vitest';
import type { PlacedAsset } from '../src/sim/assets';
import {
  SEVERE_ETA_WINDOW_MIN,
  SEVERE_SEVERITY,
  WARN_STYLE,
  formatEta,
  gustKmh,
  isSevereStorm,
  pickSevereStorm,
  pickVegLine,
  warningLevel,
  type StormForecastRow,
} from '../src/ui/SevereWeatherAlert';

const NOW = 100_000;

function storm(over: Partial<StormForecastRow>): StormForecastRow {
  return { name: 'Storm Aoife', etaMin: NOW + 1440, severity: 0.95, ...over };
}

describe('isSevereStorm', () => {
  it('flags a named storm bearing down within the window', () => {
    expect(isSevereStorm(storm({ severity: 0.95, etaMin: NOW + 1440 }), NOW)).toBe(true);
  });

  it('rejects a routine windy-wet front below the severe band', () => {
    // windy-wet forecasts ~0.66–0.78 in the sim — below the 0.85 cut
    expect(isSevereStorm(storm({ severity: 0.74 }), NOW)).toBe(false);
    expect(isSevereStorm(storm({ severity: SEVERE_SEVERITY - 0.001 }), NOW)).toBe(false);
  });

  it('accepts exactly at the severe threshold', () => {
    expect(isSevereStorm(storm({ severity: SEVERE_SEVERITY }), NOW)).toBe(true);
  });

  it('rejects a severe storm still beyond the lead window', () => {
    expect(isSevereStorm(storm({ etaMin: NOW + SEVERE_ETA_WINDOW_MIN + 60 }), NOW)).toBe(false);
  });

  it('accepts one right at the edge of the lead window', () => {
    expect(isSevereStorm(storm({ etaMin: NOW + SEVERE_ETA_WINDOW_MIN }), NOW)).toBe(true);
  });

  it('rejects an undefined row', () => {
    expect(isSevereStorm(undefined, NOW)).toBe(false);
  });
});

describe('pickSevereStorm (once-per-storm)', () => {
  it('returns the first severe approaching storm', () => {
    const picked = pickSevereStorm([storm({ name: 'Storm Bram' })], NOW, new Set());
    expect(picked?.name).toBe('Storm Bram');
  });

  it('does not re-pick a storm already acknowledged by name', () => {
    const acked = new Set(['Storm Bram']);
    expect(pickSevereStorm([storm({ name: 'Storm Bram' })], NOW, acked)).toBeUndefined();
  });

  it('skips a routine front and an acked one to find the next severe storm', () => {
    const forecast = [
      storm({ name: 'Storm Routine', severity: 0.7 }),
      storm({ name: 'Storm Acked' }),
      storm({ name: 'Storm Fresh' }),
    ];
    const picked = pickSevereStorm(forecast, NOW, new Set(['Storm Acked']));
    expect(picked?.name).toBe('Storm Fresh');
  });

  it('returns undefined for empty / missing forecast', () => {
    expect(pickSevereStorm(undefined, NOW, new Set())).toBeUndefined();
    expect(pickSevereStorm([], NOW, new Set())).toBeUndefined();
  });
});

describe('pickVegLine', () => {
  const line = (id: number, build: 'overhead' | 'underground', len: number): PlacedAsset =>
    ({ id, kind: 'line', level: 33, build, a: 1, b: 2, lengthTiles: len, capexK: 0 }) as PlacedAsset;

  it('picks the longest overhead line', () => {
    const assets = [line(1, 'overhead', 4), line(2, 'overhead', 9), line(3, 'underground', 20)];
    expect(pickVegLine(assets)).toBe(2);
  });

  it('returns undefined when there is no overhead line', () => {
    expect(pickVegLine([line(3, 'underground', 20)])).toBeUndefined();
    expect(pickVegLine([])).toBeUndefined();
    expect(pickVegLine(undefined)).toBeUndefined();
  });
});

describe('gustKmh', () => {
  it('maps severity to realistic GB storm gusts (km/h), monotonic & clamped', () => {
    expect(gustKmh(0.85)).toBe(95); // the severe cut ≈ storm force
    expect(gustKmh(0.92)).toBeGreaterThanOrEqual(115); // named storm ≈ violent storm
    expect(gustKmh(1.0)).toBeGreaterThanOrEqual(145); // the worst ≈ hurricane force
    // monotonic increasing
    expect(gustKmh(0.9)).toBeGreaterThan(gustKmh(0.85));
    // clamped to a sane band
    expect(gustKmh(0.5)).toBeGreaterThanOrEqual(50);
    expect(gustKmh(2)).toBeLessThanOrEqual(165);
  });
});

describe('warningLevel + WARN_STYLE (Met Office hazard branding)', () => {
  it('escalates yellow → amber → red by gust speed', () => {
    expect(warningLevel(95)).toBe('yellow');
    expect(warningLevel(120)).toBe('amber');
    expect(warningLevel(150)).toBe('red');
  });
  it('a named storm reads amber-or-red, a threshold storm yellow-or-amber', () => {
    expect(['amber', 'red']).toContain(warningLevel(gustKmh(0.95)));
    expect(['yellow', 'amber']).toContain(warningLevel(gustKmh(SEVERE_SEVERITY)));
  });
  it('every level has a colour + label', () => {
    for (const lvl of ['yellow', 'amber', 'red'] as const) {
      expect(WARN_STYLE[lvl].color).toMatch(/^#/);
      expect(WARN_STYLE[lvl].label).toContain('WARNING');
    }
  });
});

describe('formatEta', () => {
  it('formats days+hours, hours+mins, and minutes', () => {
    expect(formatEta(1440 + 240)).toBe('1d 4h');
    expect(formatEta(5 * 60 + 20)).toBe('5h 20m');
    expect(formatEta(45)).toBe('45m');
    expect(formatEta(-10)).toBe('0m');
  });
});
