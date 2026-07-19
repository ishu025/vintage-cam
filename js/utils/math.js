// ============================================================
// utils/math.js
// ------------------------------------------------------------
// Pure numeric helpers shared across the filter pipeline.
// No DOM, no ImageData — keeps this trivially unit-testable
// and safe to call in tight per-pixel loops.
// ============================================================

/** Clamp a value into [min, max]. */
export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

/** Clamp into [0, 255] — the hot path for every pixel write. */
export function clamp255(value) {
  return value < 0 ? 0 : value > 255 ? 255 : value;
}

/** Clamp into [0, 1]. */
export function clamp01(value) {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/** Linear interpolation. */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Inverse lerp: what fraction is `value` between a and b. */
export function invLerp(a, b, value) {
  return a === b ? 0 : (value - a) / (b - a);
}

/** Remap a value from one range to another (unclamped). */
export function mapRange(value, inMin, inMax, outMin, outMax) {
  return lerp(outMin, outMax, invLerp(inMin, inMax, value));
}

/** Hermite smoothstep, useful for soft masks (vignette falloff, bloom threshold knee). */
export function smoothstep(edge0, edge1, x) {
  const t = clamp01(invLerp(edge0, edge1, x));
  return t * t * (3 - 2 * t);
}

/**
 * Perceptual luminance (Rec. 601 weights) from 0-255 RGB.
 * Used by bloom (highlight threshold), sharpen (edge detection),
 * and tone curve (contrast pivot) — kept in one place so all
 * three agree on what "brightness" means.
 */
export function luminance255(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Euclidean distance — used by vignette's radial falloff. */
export function distance(x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Squared distance — prefer this over distance() when only comparing/ranking. */
export function distanceSq(x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  return dx * dx + dy * dy;
}

// ------------------------------------------------------------
// Gaussian kernel generation, memoized.
//
// blur.js and bloom.js both need separable 1D Gaussian kernels,
// and at 12MP a full-frame box/gaussian blur runs the kernel
// per-pixel-per-channel — recomputing weights on every capture
// would be wasted work since a given (radius, sigma) pair is
// reused across frames (same filter settings). We cache by key.
// ------------------------------------------------------------
const _kernelCache = new Map();

/**
 * Returns a normalized 1D Gaussian kernel (Float32Array, length = radius*2+1).
 * Cached by "radius:sigma" so repeated calls with the same params are free.
 */
export function gaussianKernel1D(radius, sigma) {
  const key = radius + ':' + sigma;
  const cached = _kernelCache.get(key);
  if (cached) return cached;

  const size = radius * 2 + 1;
  const kernel = new Float32Array(size);
  const twoSigmaSq = 2 * sigma * sigma;
  let sum = 0;

  for (let i = 0; i < size; i++) {
    const x = i - radius;
    const w = Math.exp(-(x * x) / twoSigmaSq);
    kernel[i] = w;
    sum += w;
  }
  // Normalize so total weight is 1 (prevents the blur from dimming/brightening the image).
  for (let i = 0; i < size; i++) {
    kernel[i] /= sum;
  }

  _kernelCache.set(key, kernel);
  return kernel;
}

/** Standard deviation that gives a visually "complete" blur for a given pixel radius. */
export function sigmaForRadius(radius) {
  return Math.max(radius / 3, 0.0001);
}
