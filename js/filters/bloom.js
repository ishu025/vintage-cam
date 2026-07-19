// ============================================================
// filters/bloom.js
// CCD sensors bloom: charge overflow from saturated photosites
// bleeds into neighbors, producing a soft glow around bright
// areas. We isolate luminance above a threshold into its own
// buffer, blur only that, then screen-blend it back — this keeps
// the glow additive and non-clipping rather than just blurring
// the whole frame (which would look like defocus, not bloom).
// ============================================================
import { boxBlur } from './blur.js';
import { getScratchImageData } from '../utils/image.js';
import { clamp255, luminance255, smoothstep } from '../utils/math.js';

export const DEFAULTS = {
  threshold: 190,
  radius: 10,
  intensity: 0.35,
};

export function apply(imageData, params = DEFAULTS) {
  const p = { ...DEFAULTS, ...params };
  const { width, height, data } = imageData;

  const bright = getScratchImageData(width, height, 'bloomBright');
  const bd = bright.data;

  for (let i = 0; i < data.length; i += 4) {
    const l = luminance255(data[i], data[i + 1], data[i + 2]);
    const mask = smoothstep(p.threshold - 30, p.threshold + 30, l);
    bd[i] = data[i] * mask;
    bd[i + 1] = data[i + 1] * mask;
    bd[i + 2] = data[i + 2] * mask;
    bd[i + 3] = 255;
  }

  boxBlur(bright, p.radius, 2);

  for (let i = 0; i < data.length; i += 4) {
    data[i] = clamp255(data[i] + bd[i] * p.intensity);
    data[i + 1] = clamp255(data[i + 1] + bd[i + 1] * p.intensity);
    data[i + 2] = clamp255(data[i + 2] + bd[i + 2] * p.intensity);
  }
}
