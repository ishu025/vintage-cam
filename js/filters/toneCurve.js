// ============================================================
// filters/toneCurve.js
// Low native contrast plus a faded, lifted-black matte look —
// applied via a 256-entry lookup table so the per-pixel cost is
// a single array read regardless of curve complexity. The LUT is
// memoized by its parameter signature: at 12MP, rebuilding it
// every frame for unchanged settings would be 12M wasted branches.
// ============================================================
import { clamp255, lerp } from '../utils/math.js';

export const DEFAULTS = {
  blackLift: 18,      // shadows lifted toward gray -> "faded" look
  whiteCompress: 245, // highlights compressed instead of clipping to 255
  contrast: 0.85,     // < 1 = lower contrast
};

let _lutCache = null;
let _lutKey = '';

function buildLUT(p) {
  const key = `${p.blackLift}:${p.whiteCompress}:${p.contrast}`;
  if (_lutCache && _lutKey === key) return _lutCache;

  const lut = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) {
    let v = (i - 128) * p.contrast + 128; // contrast pivots around mid-gray
    v = lerp(p.blackLift, p.whiteCompress, v / 255); // remap into lifted/compressed range
    lut[i] = clamp255(v);
  }

  _lutCache = lut;
  _lutKey = key;
  return lut;
}

export function apply(imageData, params = DEFAULTS) {
  const p = { ...DEFAULTS, ...params };
  const lut = buildLUT(p);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    data[i] = lut[data[i]];
    data[i + 1] = lut[data[i + 1]];
    data[i + 2] = lut[data[i + 2]];
  }
}
