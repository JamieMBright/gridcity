import { describe, expect, it } from 'vitest';
import { luFactor, luSolve } from '../src/sim/grid/lu';

function solve(a: number[][], b: number[]): Float64Array | undefined {
  const n = b.length;
  const flat = new Float64Array(n * n);
  a.forEach((row, i) => row.forEach((v, j) => (flat[i * n + j] = v)));
  const f = luFactor(flat, n);
  if (!f) return undefined;
  return luSolve(f, Float64Array.from(b));
}

describe('LU factorization', () => {
  it('solves a known 2x2 system', () => {
    const x = solve(
      [
        [2, 1],
        [1, 3],
      ],
      [5, 10],
    );
    expect(x).toBeDefined();
    expect(x?.[0]).toBeCloseTo(1, 10);
    expect(x?.[1]).toBeCloseTo(3, 10);
  });

  it('solves a 3x3 system requiring pivoting', () => {
    // leading zero forces a row swap
    const x = solve(
      [
        [0, 2, 1],
        [1, 1, 1],
        [2, 1, 3],
      ],
      [7, 6, 13],
    );
    expect(x).toBeDefined();
    expect(x?.[0]).toBeCloseTo(1, 10);
    expect(x?.[1]).toBeCloseTo(2, 10);
    expect(x?.[2]).toBeCloseTo(3, 10);
  });

  it('reports singular matrices', () => {
    const x = solve(
      [
        [1, 2],
        [2, 4],
      ],
      [3, 6],
    );
    expect(x).toBeUndefined();
  });

  it('round-trips a random diagonally-dominant system (A·x ≈ b)', () => {
    const n = 40;
    const a = new Float64Array(n * n);
    let s = 12345;
    const rnd = (): number => {
      s = (s * 1103515245 + 12345) % 2147483648;
      return s / 2147483648 - 0.5;
    };
    for (let i = 0; i < n; i++) {
      let rowSum = 0;
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          const v = rnd();
          a[i * n + j] = v;
          rowSum += Math.abs(v);
        }
      }
      a[i * n + i] = rowSum + 1; // diagonally dominant => nonsingular
    }
    const xTrue = Float64Array.from({ length: n }, () => rnd() * 10);
    const b = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < n; j++) sum += (a[i * n + j] ?? 0) * (xTrue[j] ?? 0);
      b[i] = sum;
    }
    const f = luFactor(a, n);
    expect(f).toBeDefined();
    if (!f) return;
    const x = luSolve(f, b);
    for (let i = 0; i < n; i++) expect(x[i]).toBeCloseTo(xTrue[i] ?? 0, 8);
  });
});
