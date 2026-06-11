// Deterministic seeded RNG (mulberry32). Used everywhere randomness is
// needed so saves and tests are reproducible. State is a single uint32
// that can be serialized.

export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Uniform float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Uniform integer in [0, n). */
  int(n: number): number {
    return Math.floor(this.next() * n);
  }

  /** Uniform float in [lo, hi). */
  range(lo: number, hi: number): number {
    return lo + this.next() * (hi - lo);
  }

  /** True with probability p. */
  chance(p: number): boolean {
    return this.next() < p;
  }

  getState(): number {
    return this.state;
  }

  setState(state: number): void {
    this.state = state >>> 0;
  }
}
