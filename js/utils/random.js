// ============================================================
// utils/random.js
// ------------------------------------------------------------
// Seeded pseudo-random generator. Grain/noise needs to look
// organic every shot but must not allocate per-pixel state, so
// this wraps mulberry32 (fast, tiny, good-enough distribution
// for visual noise) in a class that caches the "spare" value
// produced by the Box-Muller transform, halving the transcendental
// math calls needed for Gaussian sampling.
// ============================================================

export class RandomGenerator {
  constructor(seed = Date.now()) {
    this._state = seed >>> 0;
    this._spareGaussian = null;
  }

  reseed(seed) {
    this._state = seed >>> 0;
    this._spareGaussian = null;
  }

  /** Uniform float in [0, 1). */
  next() {
    this._state = (this._state + 0x6d2b79f5) | 0;
    let t = this._state;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Uniform float in [min, max). */
  range(min, max) {
    return min + this.next() * (max - min);
  }

  /**
   * Gaussian (normal) sample via Box-Muller. The transform naturally
   * produces two independent samples per call — we return one and
   * cache the other ("spare") for the next invocation instead of
   * discarding it, which is a ~2x reduction in Math.log/Math.cos work
   * across a 12MP grain pass.
   */
  gaussian(mean = 0, stdDev = 1) {
    if (this._spareGaussian !== null) {
      const spare = this._spareGaussian;
      this._spareGaussian = null;
      return mean + spare * stdDev;
    }
    let u, v, s;
    do {
      u = this.next() * 2 - 1;
      v = this.next() * 2 - 1;
      s = u * u + v * v;
    } while (s >= 1 || s === 0);
    const mul = Math.sqrt((-2 * Math.log(s)) / s);
    this._spareGaussian = v * mul;
    return mean + u * mul * stdDev;
  }
}

// Shared default instance — filters reseed() it per capture (see grain.js)
// rather than constructing a new generator every frame.
export const sharedRng = new RandomGenerator();
