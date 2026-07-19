// ============================================================
// filters/sharpen.js
// Classic unsharp mask: subtract a blurred copy from the original
// and add the difference back, amplified. Compact CCD cameras of
// this era applied fairly aggressive in-camera sharpening, which
// shows up as visible halos around edges — we're recreating that
// artifact deliberately, not doing a "clean" modern sharpen.
// ============================================================
import { boxBlur } from './blur.js';
import { getScratchImageData } from '../utils/image.js';
import { clamp255 } from '../utils/math.js';

export const DEFAULTS = {
  radius: 2,
  amount: 0.4,
};

export function apply(imageData, params = DEFAULTS) {
  const p = { ...DEFAULTS, ...params };
  const { width, height, data } = imageData;

  const blurred = getScratchImageData(width, height, 'sharpenBlur');
  blurred.data.set(data);
  boxBlur(blurred, p.radius, 2);
  const bd = blurred.data;

  for (let i = 0; i < data.length; i += 4) {
    data[i] = clamp255(data[i] + (data[i] - bd[i]) * p.amount);
    data[i + 1] = clamp255(data[i + 1] + (data[i + 1] - bd[i + 1]) * p.amount);
    data[i + 2] = clamp255(data[i + 2] + (data[i + 2] - bd[i + 2]) * p.amount);
  }
}
