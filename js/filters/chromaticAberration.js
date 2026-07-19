// ============================================================
// filters/chromaticAberration.js
// Cheap compact lenses fail to focus all wavelengths on the same
// plane, most visibly at the edges. We displace red outward and
// blue inward along the radius from center, scaling quadratically
// with distance (correct near center, exaggerated at corners —
// which is exactly the "cheap lens" signature, not a subtle one).
// Reads from a snapshot buffer since displacement can't safely
// read and write the same array in place.
// ============================================================
import { getScratchImageData } from '../utils/image.js';
import { clamp } from '../utils/math.js';

export const DEFAULTS = {
  strength: 1.6, // max displacement in px at the corners
};

export function apply(imageData, params = DEFAULTS) {
  const { strength } = { ...DEFAULTS, ...params };
  const { width, height, data } = imageData;

  const scratch = getScratchImageData(width, height, 'chromaticAberration');
  scratch.data.set(data); // snapshot source before we start overwriting `data`
  const src = scratch.data;

  const cx = width / 2;
  const cy = height / 2;
  const maxDist = Math.sqrt(cx * cx + cy * cy);

  for (let y = 0; y < height; y++) {
    const dy = y - cy;
    const rowStart = y * width * 4;

    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const rawDist = Math.sqrt(dx * dx + dy * dy);
      const normDist = rawDist / maxDist;
      const shift = normDist * normDist * strength;
      const invDist = rawDist > 0 ? 1 / rawDist : 0;
      const ux = dx * invDist;
      const uy = dy * invDist;

      const rx = clamp(Math.round(x + ux * shift), 0, width - 1);
      const ry = clamp(Math.round(y + uy * shift), 0, height - 1);
      const bx = clamp(Math.round(x - ux * shift), 0, width - 1);
      const by = clamp(Math.round(y - uy * shift), 0, height - 1);

      const dstI = rowStart + x * 4;
      data[dstI] = src[(ry * width + rx) * 4];         // red shifted outward
      data[dstI + 1] = src[dstI + 1];                   // green stays put (reference channel)
      data[dstI + 2] = src[(by * width + bx) * 4 + 2];  // blue shifted inward
    }
  }
}
