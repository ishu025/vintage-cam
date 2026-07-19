// ============================================================
// pipeline.js
// ------------------------------------------------------------
// Orchestrates filter execution order. Contains zero pixel math
// of its own — every filter is an independent function imported
// from filters/*.js; this file only sequences them and lets steps
// be enabled/disabled/reordered/re-parameterized at runtime.
// ============================================================
import * as exposure from './filters/exposure.js';
import * as whiteBalance from './filters/whiteBalance.js';
import * as ccdColor from './filters/ccdColor.js';
import * as chromaticAberration from './filters/chromaticAberration.js';
import * as blur from './filters/blur.js';
import * as bloom from './filters/bloom.js';
import * as sharpen from './filters/sharpen.js';
import * as toneCurve from './filters/toneCurve.js';
import * as vignette from './filters/vignette.js';
import * as grain from './filters/grain.js';
import * as jpegArtifacts from './filters/jpegArtifacts.js';
import * as dateStamp from './filters/dateStamp.js';

export class FilterPipeline {
  constructor() {
    this.steps = []; // { id, name, kind: 'pixel'|'canvas', fn, enabled, params }
  }

  addStep(step) {
    this.steps.push({ enabled: true, params: {}, kind: 'pixel', ...step });
  }

  removeStep(id) {
    this.steps = this.steps.filter((s) => s.id !== id);
  }

  setEnabled(id, enabled) {
    const step = this.getStep(id);
    if (step) step.enabled = enabled;
  }

  updateParams(id, params) {
    const step = this.getStep(id);
    if (step) Object.assign(step.params, params);
  }

  /** Moves the step with `id` to `newIndex` in the execution order. */
  reorder(id, newIndex) {
    const idx = this.steps.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const [step] = this.steps.splice(idx, 1);
    this.steps.splice(newIndex, 0, step);
  }

  getStep(id) {
    return this.steps.find((s) => s.id === id);
  }

  /**
   * Runs every enabled step in order. Pixel-kind steps mutate
   * `imageData` in place (no per-filter allocation at 12MP).
   * Canvas-kind steps (currently just dateStamp) run afterward,
   * against the 2D context, so they composite on top of the
   * fully-graded pixels rather than being processed as photo content.
   */
  run(imageData, ctx, meta = {}) {
    for (const step of this.steps) {
      if (!step.enabled || step.kind !== 'pixel') continue;
      step.fn(imageData, step.params, meta);
    }

    if (ctx) {
      ctx.putImageData(imageData, 0, 0);
      for (const step of this.steps) {
        if (!step.enabled || step.kind !== 'canvas') continue;
        step.fn(ctx, step.params, meta);
      }
    }

    return imageData;
  }
}

/**
 * Default vintage CCD ordering:
 * exposure/WB/color first (sensor-level), then optical artifacts
 * (chromatic aberration, softness, bloom, sharpening halo), then
 * tone/vignette (in-camera processing), then grain/compression
 * (output-stage artifacts), then the date stamp overlay last.
 */
export function createDefaultPipeline() {
  const pipeline = new FilterPipeline();
  const steps = [
    { id: 'exposure', name: 'Exposure', fn: exposure.apply, params: { ...exposure.DEFAULTS } },
    { id: 'whiteBalance', name: 'White Balance', fn: whiteBalance.apply, params: { ...whiteBalance.DEFAULTS } },
    { id: 'ccdColor', name: 'CCD Color', fn: ccdColor.apply, params: { ...ccdColor.DEFAULTS } },
    { id: 'chromaticAberration', name: 'Chromatic Aberration', fn: chromaticAberration.apply, params: { ...chromaticAberration.DEFAULTS } },
    { id: 'blur', name: 'Lens Softness', fn: blur.apply, params: { ...blur.DEFAULTS } },
    { id: 'bloom', name: 'Bloom', fn: bloom.apply, params: { ...bloom.DEFAULTS } },
    { id: 'sharpen', name: 'Sharpen Halo', fn: sharpen.apply, params: { ...sharpen.DEFAULTS } },
    { id: 'toneCurve', name: 'Tone Curve', fn: toneCurve.apply, params: { ...toneCurve.DEFAULTS } },
    { id: 'vignette', name: 'Vignette', fn: vignette.apply, params: { ...vignette.DEFAULTS } },
    { id: 'grain', name: 'Film Grain', fn: grain.apply, params: { ...grain.DEFAULTS } },
    { id: 'jpegArtifacts', name: 'JPEG Artifacts', fn: jpegArtifacts.apply, params: { ...jpegArtifacts.DEFAULTS } },
    { id: 'dateStamp', name: 'Date Stamp', kind: 'canvas', fn: dateStamp.apply, params: { ...dateStamp.DEFAULTS } },
  ];
  steps.forEach((s) => pipeline.addStep(s));
  return pipeline;
}
