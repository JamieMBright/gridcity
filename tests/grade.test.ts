// The lofi golden-hour colour script (ROADMAP #41/#42/#44): the day arc
// never goes harsh noon-white, dusk/night light the energized-window glow,
// storms grade dark-but-cosy with rain, and the season buckets + field
// tints select deterministically off the sim clock.

import { describe, expect, it } from 'vitest';
import {
  contrastRatio,
  dawnDuskHours,
  luminance,
  mixRgb,
  sceneGrade,
  seasonOf,
  seasonTintFor,
  type WeatherLike,
} from '../src/render/grade';
import { MIDSUMMER_MIN, MIDWINTER_MIN } from '../src/sim/events/weather';

const CALM: WeatherLike = { cloud: 0.2, wind: 0.3, regime: 'mild' };
const DAY_ONE = 0; // game starts 1 May, 00:00
const atHour = (h: number): number => DAY_ONE + h * 60;

describe('sceneGrade — the golden-hour arc (#41)', () => {
  it('midday is soft warm gold, never harsh white', () => {
    const g = sceneGrade(atHour(13), CALM);
    expect(g.glow).toBeLessThan(0.05); // no window glow at lunch
    expect(g.tint).not.toBe(0xffffff); // never an ungraded frame
    const r = (g.tint >> 16) & 0xff;
    const b = g.tint & 0xff;
    expect(r).toBeGreaterThan(b); // warm cast: red over blue
    expect(luminance(g.tint)).toBeGreaterThan(0.7); // ...but still bright day
  });

  it('night is deep navy with the window glow fully on', () => {
    const g = sceneGrade(atHour(1), CALM);
    expect(g.glow).toBe(1);
    const r = (g.tint >> 16) & 0xff;
    const b = g.tint & 0xff;
    expect(b).toBeGreaterThan(r); // cool navy wash
    // cosy night, not horror night: the multiply never crushes the city
    expect(luminance(g.tint)).toBeGreaterThan(0.2);
    expect(g.vignette).toBeGreaterThan(sceneGrade(atHour(13), CALM).vignette);
  });

  it('dusk sits between: warm sky horizon, glow rising', () => {
    const { dusk } = dawnDuskHours(DAY_ONE);
    const g = sceneGrade(atHour(dusk - 0.2), CALM);
    expect(g.glow).toBeGreaterThan(0.3);
    expect(g.glow).toBeLessThan(1);
    // sunset horizon is the warmest thing in the script
    const r = (g.skyBottom >> 16) & 0xff;
    const b = g.skyBottom & 0xff;
    expect(r).toBeGreaterThan(b + 60);
  });

  it('the arc follows the seasons: winter dusk early, summer dusk late', () => {
    const winter = dawnDuskHours(MIDWINTER_MIN);
    const summer = dawnDuskHours(MIDSUMMER_MIN);
    expect(winter.dusk).toBeLessThan(17.5);
    expect(summer.dusk).toBeGreaterThan(21);
    expect(winter.dawn).toBeGreaterThan(summer.dawn + 2);
    // 18:00 midwinter is after dark; 18:00 midsummer is broad day
    expect(sceneGrade(MIDWINTER_MIN + 18 * 60, CALM).glow).toBeGreaterThan(0.8);
    expect(sceneGrade(MIDSUMMER_MIN + 18 * 60, CALM).glow).toBeLessThan(0.1);
  });
});

describe('sceneGrade — rain & storm (#42)', () => {
  it('a windy-wet regime with heavy cloud brings the cosy drizzle', () => {
    const wet: WeatherLike = { cloud: 0.8, wind: 0.5, regime: 'windy-wet' };
    const g = sceneGrade(atHour(13), wet);
    expect(g.rain).toBeGreaterThan(0.3);
    expect(g.storm).toBe(0);
    expect(g.wet).toBeGreaterThan(0.2);
    // rainy-day-cosy, never horror-dark
    expect(luminance(g.tint)).toBeGreaterThan(0.4);
  });

  it('storm wind grades darker with full rain + lightning band', () => {
    const storm: WeatherLike = { cloud: 0.85, wind: 0.9, regime: 'windy-wet' };
    const calm = sceneGrade(atHour(13), CALM);
    const g = sceneGrade(atHour(13), storm);
    expect(g.storm).toBeGreaterThan(0.9);
    expect(g.rain).toBeGreaterThan(0.9);
    expect(luminance(g.tint)).toBeLessThan(luminance(calm.tint));
    expect(luminance(g.skyTop)).toBeLessThan(luminance(calm.skyTop));
    // ...but the wash stays cosy
    expect(luminance(g.tint)).toBeGreaterThan(0.25);
  });

  it('clear mild weather has no rain at all', () => {
    expect(sceneGrade(atHour(13), CALM).rain).toBe(0);
  });
});

describe('seasons (#44)', () => {
  it('buckets the calendar correctly from the 1 May start', () => {
    const DAY = 1440;
    expect(seasonOf(0)).toBe('spring'); // 1 May
    expect(seasonOf(60 * DAY)).toBe('summer'); // ~30 June
    expect(seasonOf(150 * DAY)).toBe('autumn'); // ~28 Sept
    expect(seasonOf(240 * DAY)).toBe('winter'); // ~27 Dec
    expect(seasonOf(330 * DAY)).toBe('spring'); // ~27 Mar, wraps
  });

  it('field/tree families tint per season; built fabric never does', () => {
    expect(seasonTintFor('ground_field_0', 'spring')).toBeDefined();
    expect(seasonTintFor('ground_field_1', 'winter')).toBeDefined();
    expect(seasonTintFor('trees_2', 'autumn')).toBeDefined();
    expect(seasonTintFor('hedgerow_0', 'winter')).toBeDefined();
    // summer is the baked base art for crops
    expect(seasonTintFor('ground_field_0', 'summer')).toBeUndefined();
    // houses, water, pavement: untouched in every season
    for (const s of ['terrace_0', 'water_5', 'ground_pave_1', 'sky_2'] as const) {
      for (const season of ['winter', 'spring', 'summer', 'autumn'] as const) {
        expect(seasonTintFor(s, season)).toBeUndefined();
      }
    }
  });

  it('winter drabs the green out; spring keeps it; autumn runs warm', () => {
    const winter = seasonTintFor('ground_grass_0', 'winter') ?? 0;
    const spring = seasonTintFor('ground_grass_0', 'spring') ?? 0;
    // winter suppresses the green channel far below spring's flush
    expect((winter >> 8) & 0xff).toBeLessThan(((spring >> 8) & 0xff) - 50);
    expect(luminance(winter)).toBeLessThan(luminance(spring));
    const at = seasonTintFor('trees_0', 'autumn') ?? 0;
    expect((at >> 16) & 0xff).toBeGreaterThan(at & 0xff);
  });
});

describe('colour helpers', () => {
  it('mixRgb endpoints and midpoint', () => {
    expect(mixRgb(0x000000, 0xffffff, 0)).toBe(0x000000);
    expect(mixRgb(0x000000, 0xffffff, 1)).toBe(0xffffff);
    expect(mixRgb(0x204060, 0x204060, 0.5)).toBe(0x204060);
  });

  it('contrastRatio matches WCAG anchors', () => {
    expect(contrastRatio(0x000000, 0xffffff)).toBeCloseTo(21, 0);
    expect(contrastRatio(0xffffff, 0xffffff)).toBeCloseTo(1, 5);
  });

  it('UI theme text tokens clear WCAG on the panel navy', () => {
    const NAVY = 0x101630;
    expect(contrastRatio(0xf2efe8, NAVY)).toBeGreaterThan(7); // body text: AAA
    expect(contrastRatio(0xf5c469, NAVY)).toBeGreaterThan(4.5); // gold accents
    expect(contrastRatio(0x8d97b4, NAVY)).toBeGreaterThan(4.5); // muted text
  });
});
