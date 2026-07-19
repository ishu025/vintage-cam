// ============================================================
// filters/whiteBalance.js
// Cheap CCD auto-white-balance rarely nails neutral gray, and
// tends to drift warm/yellow-green under mixed lighting. We bake
// in a static gain per channel plus a brightness-weighted push
// toward warm tones in the highlights (where AWB confidence is
// lowest on these sensors).
// ============================================================
import { clamp255, lerp } from '../utils/math.js';

export const DEFAULTS = {
  redGain: 1.04,
  greenGain: 1.03,
  blueGain: 0.90,
  warmHighlightStrength: 0.15,
};

export function apply(imageData, params = DEFAULTS) {
  const { redGain, greenGain, blueGain, warmHighlightStrength } = { ...DEFAULTS, ...params };
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i] * redGain;
    let g = data[i + 1] * greenGain;
    let b = data[i + 2] * blueGain;

    const brightness = (r + g + b) / 765; // 0..1
    const warmT = brightness * brightness * warmHighlightStrength;
    r = lerp(r, r * 1.08, warmT);
    g = lerp(g, g * 1.04, warmT);
    b = lerp(b, b * 0.92, warmT);

    data[i] = clamp255(r);
    data[i + 1] = clamp255(g);
    data[i + 2] = clamp255(b);
  }
}
