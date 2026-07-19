// ============================================================
// filters/jpegArtifacts.js
// Most people picture "JPEG artifacts" as 8x8 blockiness, but the
// actually-dominant visual signature at moderate quality is chroma
// subsampling: color (Cb/Cr) is stored at half resolution, causing
// color to bleed/smear across sharp edges. We simulate that
// directly (average 2x2 chroma blocks) rather than a full fake
// DCT, plus a coarse luma quantization step for banding.
//
// Runs once per capture (not per live-preview frame), so the
// temporary Float32Array planes allocated here are an acceptable
// one-time cost rather than a per-frame hot path.
// ============================================================
import { clamp255 } from '../utils/math.js';

export const DEFAULTS = {
  chromaSubsample: true,
  lumaQuantStep: 4,
};

function rgbToYCbCr(r, g, b) {
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  return [y, cb, cr];
}

function ycbcrToRgb(y, cb, cr) {
  const r = y + 1.402 * (cr - 128);
  const g = y - 0.344136 * (cb - 128) - 0.714136 * (cr - 128);
  const b = y + 1.772 * (cb - 128);
  return [r, g, b];
}

export function apply(imageData, params = DEFAULTS) {
  const p = { ...DEFAULTS, ...params };
  const { width, height, data } = imageData;
  const pixelCount = width * height;

  const ySrc = new Float32Array(pixelCount);
  const cbSrc = new Float32Array(pixelCount);
  const crSrc = new Float32Array(pixelCount);

  for (let idx = 0, i = 0; i < data.length; i += 4, idx++) {
    const [y, cb, cr] = rgbToYCbCr(data[i], data[i + 1], data[i + 2]);
    ySrc[idx] = y;
    cbSrc[idx] = cb;
    crSrc[idx] = cr;
  }

  if (p.chromaSubsample) {
    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        let cbSum = 0, crSum = 0, count = 0;
        for (let dy = 0; dy < 2; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            const xx = x + dx, yy = y + dy;
            if (xx < width && yy < height) {
              const idx = yy * width + xx;
              cbSum += cbSrc[idx];
              crSum += crSrc[idx];
              count++;
            }
          }
        }
        const cbAvg = cbSum / count;
        const crAvg = crSum / count;
        for (let dy = 0; dy < 2; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            const xx = x + dx, yy = y + dy;
            if (xx < width && yy < height) {
              const idx = yy * width + xx;
              cbSrc[idx] = cbAvg;
              crSrc[idx] = crAvg;
            }
          }
        }
      }
    }
  }

  const step = p.lumaQuantStep;
  for (let idx = 0; idx < ySrc.length; idx++) {
    ySrc[idx] = Math.round(ySrc[idx] / step) * step;
  }

  for (let idx = 0, i = 0; i < data.length; i += 4, idx++) {
    const [r, g, b] = ycbcrToRgb(ySrc[idx], cbSrc[idx], crSrc[idx]);
    data[i] = clamp255(r);
    data[i + 1] = clamp255(g);
    data[i + 2] = clamp255(b);
  }
}
