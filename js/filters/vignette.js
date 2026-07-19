// ============================================================
// filters/vignette.js
// Radial corner darkening from lens/sensor edge falloff. Isolines
// of squared distance from center are still circles (sqrt is
// monotonic), so we compare distSq directly against squared radius
// thresholds and skip a sqrt for every one of the 12M pixels.
// ============================================================
import { clamp255, smoothstep } from '../utils/math.js';

export const DEFAULTS = {
  innerRadius: 0.55, // fraction of half-diagonal where darkening begins
  outerRadius: 1.05, // fraction where darkening reaches full strength
  strength: 0.55,    // 0 = none, 1 = corners go black
};

export function apply(imageData, params = DEFAULTS) {
  const p = { ...DEFAULTS, ...params };
  const { width, height, data } = imageData;
  const cx = width / 2;
  const cy = height / 2;
  const maxDistSq = cx * cx + cy * cy;
  const innerSq = p.innerRadius * p.innerRadius * maxDistSq;
  const outerSq = p.outerRadius * p.outerRadius * maxDistSq;

  for (let y = 0; y < height; y++) {
    const dy = y - cy;
    const dy2 = dy * dy;
    const rowStart = y * width * 4;

    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const distSq = dx * dx + dy2;
      const falloff = smoothstep(innerSq, outerSq, distSq);
      const mul = 1 - falloff * p.strength;

      const i = rowStart + x * 4;
      data[i] = clamp255(data[i] * mul);
      data[i + 1] = clamp255(data[i + 1] * mul);
      data[i + 2] = clamp255(data[i + 2] * mul);
    }
  }
}
