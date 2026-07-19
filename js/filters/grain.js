// ============================================================
// filters/grain.js
// Two distinct noise sources, matching real CCD/film behavior:
//  1. Luminance grain: ONE shared noise sample applied equally to
//     R/G/B per pixel, boosted in shadows. This is monochrome by
//     construction (matches film grain, which is a density
//     variation, not a color variation) and is stronger in the
//     dark end where CCD read noise is most visible.
//  2. Chroma/sensor noise: small independent per-channel samples,
//     simulating photosite-level electronic noise.
// ============================================================
import { sharedRng } from '../utils/random.js';
import { clamp255, clamp01, luminance255 } from '../utils/math.js';

export const DEFAULTS = {
  lumaGrainAmount: 9,
  chromaNoiseAmount: 3,
  shadowBoost: 1.8,
};

export function apply(imageData, params = DEFAULTS, meta = {}) {
  const p = { ...DEFAULTS, ...params };
  const data = imageData.data;

  // Reseed per capture so grain differs shot-to-shot; without meta.seed
  // the shared generator just continues its existing sequence.
  if (meta.seed !== undefined) sharedRng.reseed(meta.seed);

  for (let i = 0; i < data.length; i += 4) {
    const l = luminance255(data[i], data[i + 1], data[i + 2]);
    const shadowFactor = 1 + (1 - clamp01(l / 255)) * (p.shadowBoost - 1);
    const lumaNoise = sharedRng.gaussian(0, p.lumaGrainAmount * shadowFactor);

    data[i] = clamp255(data[i] + lumaNoise + sharedRng.gaussian(0, p.chromaNoiseAmount));
    data[i + 1] = clamp255(data[i + 1] + lumaNoise + sharedRng.gaussian(0, p.chromaNoiseAmount));
    data[i + 2] = clamp255(data[i + 2] + lumaNoise + sharedRng.gaussian(0, p.chromaNoiseAmount));
  }
}
