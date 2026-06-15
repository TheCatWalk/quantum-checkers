import type { IRNG } from '@core/types';

// Mulberry32 PRNG — fast, good statistical distribution, fully seedable.
// This is the ONLY file in the project that generates random numbers.
export class RNG implements IRNG {
  private seed: number;

  constructor(seed?: number) {
    this.seed = (seed ?? Date.now()) >>> 0;
  }

  next(): number {
    this.seed = (this.seed + 0x6d2b79f5) >>> 0;
    let t = Math.imul(this.seed ^ (this.seed >>> 15), 1 | this.seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  }

  setSeed(seed: number): void {
    this.seed = seed >>> 0;
  }

  getSeed(): number {
    return this.seed;
  }
}
