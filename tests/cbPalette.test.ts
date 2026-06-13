import { describe, expect, it } from 'vitest';
import {
  CB_MODES,
  cbDistance,
  heatPalette,
  hexNum,
  levelPalette,
  luminance,
  statusPalette,
  type CbMode,
} from '../src/ui/cbPalette';

// The three colour languages must stay DISTINGUISHABLE under each
// deficiency — not by hue alone, but the palette should still hold a clear
// perceptual gap when simulated. We assert a minimum cbDistance between
// every pair within each language, under that language's own deficiency.

const DEFICIENT: Array<Exclude<CbMode, 'off'>> = ['deuteranopia', 'protanopia', 'tritanopia'];

describe('colour-blind palettes stay distinct', () => {
  for (const mode of DEFICIENT) {
    it(`status ok/warn/danger separate under ${mode}`, () => {
      const st = statusPalette(mode);
      const cols = [hexNum(st.ok), hexNum(st.warn), hexNum(st.danger)];
      for (let i = 0; i < cols.length; i++) {
        for (let j = i + 1; j < cols.length; j++) {
          expect(cbDistance(cols[i]!, cols[j]!, mode)).toBeGreaterThan(0.15);
        }
      }
    });

    it(`voltage 400/132/33 separate under ${mode}`, () => {
      const lv = levelPalette(mode);
      const cols = [lv[400], lv[132], lv[33]];
      for (let i = 0; i < cols.length; i++) {
        for (let j = i + 1; j < cols.length; j++) {
          expect(cbDistance(cols[i]!, cols[j]!, mode)).toBeGreaterThan(0.15);
        }
      }
    });

    it(`heatmap lo/hi separate under ${mode}`, () => {
      const h = heatPalette(mode);
      expect(cbDistance(h.lo, h.hi, mode)).toBeGreaterThan(0.2);
    });

    it(`status colours keep a real LIGHTNESS gap under ${mode} (value, not hue)`, () => {
      const st = statusPalette(mode);
      const ls = [luminance(hexNum(st.ok)), luminance(hexNum(st.warn)), luminance(hexNum(st.danger))];
      // every pair differs in luminance, so a greyscale reading orders them
      for (let i = 0; i < ls.length; i++) {
        for (let j = i + 1; j < ls.length; j++) {
          expect(Math.abs(ls[i]! - ls[j]!)).toBeGreaterThan(0.05);
        }
      }
    });
  }

  it('the DEFAULT palette is the golden-hour set (off)', () => {
    expect(statusPalette('off')).toEqual({ ok: '#7bc47f', warn: '#f5c469', danger: '#e0697a' });
    expect(levelPalette('off')[400]).toBe(0x5ea3ff);
  });

  it('exposes every mode and a label-able set', () => {
    expect(CB_MODES).toContain('off');
    expect(CB_MODES).toContain('deuteranopia');
    expect(CB_MODES.length).toBe(4);
  });
});
