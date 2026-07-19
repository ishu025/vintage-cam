// ============================================================
// filters/blur.js
// Separable box blur using a sliding-window running sum, so cost
// per pixel is O(1) regardless of radius — critical at 12MP where
// a naive O(radius) convolution would be far too slow on mobile.
// Three passes of box blur approximate a Gaussian via the central
// limit theorem, which is the standard cheap trick for this.
//
// Exported standalone (not just used internally) because bloom.js
// and sharpen.js both need the same primitive and should not
// duplicate it.
// ============================================================
import { getScratchImageData } from '../utils/image.js';

export const DEFAULTS = {
  radius: 1.4, // lens softness amount in px
};

function clampIndex(i, size) {
  return i < 0 ? 0 : i >= size ? size - 1 : i;
}

function boxBlurHorizontal(src, dst, width, height, r) {
  const windowSize = r * 2 + 1;
  for (let y = 0; y < height; y++) {
    const rowStart = y * width * 4;
    let rSum = 0, gSum = 0, bSum = 0, aSum = 0;

    for (let wx = -r; wx <= r; wx++) {
      const i = rowStart + clampIndex(wx, width) * 4;
      rSum += src[i]; gSum += src[i + 1]; bSum += src[i + 2]; aSum += src[i + 3];
    }

    for (let x = 0; x < width; x++) {
      const i = rowStart + x * 4;
      dst[i] = rSum / windowSize;
      dst[i + 1] = gSum / windowSize;
      dst[i + 2] = bSum / windowSize;
      dst[i + 3] = aSum / windowSize;

      // Slide the window one step right: drop the pixel leaving on the
      // left, add the pixel entering on the right.
      const leaveI = rowStart + clampIndex(x - r, width) * 4;
      const enterI = rowStart + clampIndex(x + r + 1, width) * 4;
      rSum += src[enterI] - src[leaveI];
      gSum += src[enterI + 1] - src[leaveI + 1];
      bSum += src[enterI + 2] - src[leaveI + 2];
      aSum += src[enterI + 3] - src[leaveI + 3];
    }
  }
}

function boxBlurVertical(src, dst, width, height, r) {
  const windowSize = r * 2 + 1;
  for (let x = 0; x < width; x++) {
    let rSum = 0, gSum = 0, bSum = 0, aSum = 0;

    for (let wy = -r; wy <= r; wy++) {
      const i = (clampIndex(wy, height) * width + x) * 4;
      rSum += src[i]; gSum += src[i + 1]; bSum += src[i + 2]; aSum += src[i + 3];
    }

    for (let y = 0; y < height; y++) {
      const i = (y * width + x) * 4;
      dst[i] = rSum / windowSize;
      dst[i + 1] = gSum / windowSize;
      dst[i + 2] = bSum / windowSize;
      dst[i + 3] = aSum / windowSize;

      const leaveI = (clampIndex(y - r, height) * width + x) * 4;
      const enterI = (clampIndex(y + r + 1, height) * width + x) * 4;
      rSum += src[enterI] - src[leaveI];
      gSum += src[enterI + 1] - src[leaveI + 1];
      bSum += src[enterI + 2] - src[leaveI + 2];
      aSum += src[enterI + 3] - src[leaveI + 3];
    }
  }
}

/**
 * Blurs imageData in place using a persistent scratch buffer as the
 * ping-pong target — no allocation regardless of pass count.
 */
export function boxBlur(imageData, radius, passes = 3) {
  const r = Math.max(1, Math.round(radius));
  const { width, height } = imageData;
  const scratch = getScratchImageData(width, height, 'blurScratch');
  const src = imageData.data;
  const dst = scratch.data;

  for (let p = 0; p < passes; p++) {
    boxBlurHorizontal(src, dst, width, height, r);
    boxBlurVertical(dst, src, width, height, r);
  }
}

export function apply(imageData, params = DEFAULTS) {
  const { radius } = { ...DEFAULTS, ...params };
  boxBlur(imageData, radius, 2); // 2 passes is enough for subtle lens softness
}
