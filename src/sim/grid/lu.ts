// Dense LU factorization with partial pivoting, for the DC power-flow
// susceptance matrix. Networks stay small (≤ ~300 buses), so dense is
// simple and fast enough; the factorization is cached between topology
// changes by the caller.

export interface LuFactors {
  n: number;
  /** Combined L (unit lower) and U, row-major. */
  lu: Float64Array;
  /** Row permutation. */
  piv: Int32Array;
}

/** Factor an n*n row-major matrix. Returns undefined if singular. */
export function luFactor(a: Float64Array, n: number): LuFactors | undefined {
  const lu = Float64Array.from(a);
  const piv = new Int32Array(n);
  for (let i = 0; i < n; i++) piv[i] = i;

  for (let k = 0; k < n; k++) {
    // pivot: largest |value| in column k at/below the diagonal
    let p = k;
    let max = Math.abs(lu[k * n + k] ?? 0);
    for (let i = k + 1; i < n; i++) {
      const v = Math.abs(lu[i * n + k] ?? 0);
      if (v > max) {
        max = v;
        p = i;
      }
    }
    if (max < 1e-10) return undefined; // singular

    if (p !== k) {
      for (let j = 0; j < n; j++) {
        const t = lu[k * n + j] ?? 0;
        lu[k * n + j] = lu[p * n + j] ?? 0;
        lu[p * n + j] = t;
      }
      const t = piv[k] ?? 0;
      piv[k] = piv[p] ?? 0;
      piv[p] = t;
    }

    const pivot = lu[k * n + k] ?? 1;
    for (let i = k + 1; i < n; i++) {
      const m = (lu[i * n + k] ?? 0) / pivot;
      lu[i * n + k] = m;
      if (m === 0) continue;
      for (let j = k + 1; j < n; j++) {
        lu[i * n + j] = (lu[i * n + j] ?? 0) - m * (lu[k * n + j] ?? 0);
      }
    }
  }
  return { n, lu, piv };
}

/** Solve A x = b using cached factors. b is not modified. */
export function luSolve(f: LuFactors, b: Float64Array): Float64Array {
  const { n, lu, piv } = f;
  const x = new Float64Array(n);
  // apply permutation, forward substitution (L has unit diagonal)
  for (let i = 0; i < n; i++) {
    let sum = b[piv[i] ?? i] ?? 0;
    for (let j = 0; j < i; j++) sum -= (lu[i * n + j] ?? 0) * (x[j] ?? 0);
    x[i] = sum;
  }
  // back substitution
  for (let i = n - 1; i >= 0; i--) {
    let sum = x[i] ?? 0;
    for (let j = i + 1; j < n; j++) sum -= (lu[i * n + j] ?? 0) * (x[j] ?? 0);
    x[i] = sum / (lu[i * n + i] ?? 1);
  }
  return x;
}
