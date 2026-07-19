// ============================================================
// filters/exposure.js
// Simulates CCD auto-exposure: cheap compact sensors from the
// 2005-2012 era tended to bias slightly bright rather than clip
// to protect shadow detail, at the cost of blown highlights.
// ============================================================
import { clamp255 } from '../utils/math.js';

export const DEFAULTS = {
  ev: 0.12,   // exposure compensation in stops
  gain: 1.05, // additional linear gain multiplier
};

export function apply(imageData, params = DEFAULTS) {
  const { ev, gain } = { ...DEFAULTS, ...params };
  const mul = Math.pow(2, ev) * gain;
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = clamp255(data[i] * mul);
    data[i + 1] = clamp255(data[i + 1] * mul);
    data[i + 2] = clamp255(data[i + 2] * mul);
  }
}
