import { describe, expect, it } from 'vitest';
import { carbonGrade, netZeroView } from '../src/ui/netZero';
import type { PlacedAsset } from '../src/sim/assets';
import type { GenType } from '../src/sim/catalog';

function gen(id: number, g: GenType): PlacedAsset {
  return { id, kind: 'gen', gen: g, x: 0, y: 0 } as unknown as PlacedAsset;
}

describe('net-zero view (#33)', () => {
  it('mix shares sum to 1 when anything dispatches', () => {
    const assets = [gen(1, 'gasCCGT'), gen(2, 'windOffshore'), gen(3, 'nuclear')];
    const genMW: Array<[number, number]> = [
      [1, 200],
      [2, 300],
      [3, 500],
    ];
    const v = netZeroView(assets, genMW, 90);
    const sum = v.slices.reduce((s, x) => s + x.share, 0);
    expect(sum).toBeCloseTo(1, 6);
    expect(v.totalMW).toBe(1000);
  });

  it('low-carbon share counts only zero-carbon techs', () => {
    const assets = [gen(1, 'gasCCGT'), gen(2, 'windOffshore'), gen(3, 'nuclear')];
    const genMW: Array<[number, number]> = [
      [1, 200], // 390 g/kWh
      [2, 300], // 0
      [3, 500], // 0
    ];
    const v = netZeroView(assets, genMW, 90);
    expect(v.lowCarbonShare).toBeCloseTo(0.8, 6); // 800 of 1000 MW low-carbon
  });

  it('picks the dirtiest running source as worst', () => {
    const assets = [gen(1, 'gasCCGT'), gen(2, 'gasPeaker'), gen(3, 'nuclear')];
    const genMW: Array<[number, number]> = [
      [1, 100], // 390
      [2, 50], // 520 — dirtier
      [3, 900], // 0
    ];
    const v = netZeroView(assets, genMW, 60);
    expect(v.worst?.gen).toBe('gasPeaker');
    expect(v.worst?.carbonG).toBe(520);
  });

  it('reports all-green (no worst) when only zero-carbon runs', () => {
    const assets = [gen(1, 'windOffshore'), gen(2, 'nuclear')];
    const genMW: Array<[number, number]> = [
      [1, 400],
      [2, 600],
    ];
    const v = netZeroView(assets, genMW, 0);
    expect(v.worst).toBeUndefined();
    expect(v.lowCarbonShare).toBe(1);
  });

  it('ignores battery charging (negative MW) as a sink, not a source', () => {
    const assets = [gen(1, 'gasCCGT'), gen(2, 'battery')];
    const genMW: Array<[number, number]> = [
      [1, 300],
      [2, -120], // charging — excluded from the mix
    ];
    const v = netZeroView(assets, genMW, 390);
    expect(v.totalMW).toBe(300);
    expect(v.slices.length).toBe(1);
    expect(v.slices[0]!.gen).toBe('gasCCGT');
  });

  it('handles a blank grid (nothing dispatching)', () => {
    const v = netZeroView([], [], 0);
    expect(v.totalMW).toBe(0);
    expect(v.lowCarbonShare).toBe(0);
    expect(v.worst).toBeUndefined();
  });

  it('grades the glidepath: low carbon → high t, high carbon → low t', () => {
    expect(carbonGrade(30).t).toBeGreaterThan(0.9);
    expect(carbonGrade(450).t).toBeLessThan(0.2);
    expect(carbonGrade(30).label).toMatch(/net zero/i);
  });
});
