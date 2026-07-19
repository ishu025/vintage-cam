// ============================================================
// filters/ccdColor.js
// CCD sensors of this era are known for punchy, slightly
// inaccurate color: a cool/cyan cast creeping into shadows, and
// boosted saturation overall. We apply both, then protect skin
// tones from the saturation boost using a cheap hue/ratio
// heuristic (real skin sits in a narrow warm-hue, low-to-mid
// saturation band; full HSL conversion per pixel is unnecessary
// when this ratio test is a close enough proxy).
// ============================================================
import { clamp255, clamp01 } from '../utils/math.js';

export const DEFAULTS = {
  saturationBoost: 1.18,
  shadowTint: [0.96, 1.0, 1.04], // slight cyan/blue bias in shadows
  skinProtect: 0.6,               // 0 = no protection, 1 = skin fully unaffected
};

export function apply(imageData, params = DEFAULTS) {
  const p = { ...DEFAULTS, ...params };
  const [tr, tg, tb] = p.shadowTint;
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;

    const shadowT = 1 - clamp01(luma / 140);
    r *= 1 + (tr - 1) * shadowT;
    g *= 1 + (tg - 1) * shadowT;
    b *= 1 + (tb - 1) * shadowT;

    // Skin heuristic: warm ordering (r > g >= b) with a moderate,
    // bounded r-b spread. Cheap stand-in for "hue is in the skin band".
    const rb = r - b;
    const isSkinLike = r > 60 && r > g && g >= b && rb > 12 && rb < 110 && r - g < 70;
    const sat = isSkinLike ? 1 + (p.saturationBoost - 1) * (1 - p.skinProtect) : p.saturationBoost;

    r = luma + (r - luma) * sat;
    g = luma + (g - luma) * sat;
    b = luma + (b - luma) * sat;

    data[i] = clamp255(r);
    data[i + 1] = clamp255(g);
    data[i + 2] = clamp255(b);
  }
}
