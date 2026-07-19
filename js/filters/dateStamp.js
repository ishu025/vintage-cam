// ============================================================
// filters/dateStamp.js
// Unlike every other filter, a date stamp is text, not a pixel
// transform — trying to rasterize digits into ImageData by hand
// would be reinventing font rendering. This filter is "canvas-kind":
// the pipeline runs it against the CanvasRenderingContext2D after
// all pixel-kind filters have been composited, so it draws crisply
// on top of the final graded image rather than getting blurred/
// grained along with the photo content.
// ============================================================
export const DEFAULTS = {
  enabled: true,
  format: 'MM/DD/YYYY',
  color: '#f7b500',
  fontSizeRatio: 0.028, // relative to image width, stays proportional at any capture resolution
  margin: 24,
};

function formatDate(date, format) {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yyyy = date.getFullYear();
  return format.replace('MM', mm).replace('DD', dd).replace('YYYY', String(yyyy));
}

export function apply(ctx, params = DEFAULTS, meta = {}) {
  const p = { ...DEFAULTS, ...params };
  if (!p.enabled) return;

  const { width, height } = ctx.canvas;
  const date = meta.timestamp ? new Date(meta.timestamp) : new Date();
  const text = formatDate(date, p.format);
  const fontSize = Math.max(14, Math.round(width * p.fontSizeRatio));

  ctx.save();
  ctx.font = `${fontSize}px "Courier New", monospace`;
  ctx.textBaseline = 'bottom';
  ctx.textAlign = 'right';

  // Soft dark glow behind the digits, matching how real LCD date
  // stamps slightly burn into the frame beneath them.
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = fontSize * 0.15;
  ctx.fillStyle = p.color;
  ctx.fillText(text, width - p.margin, height - p.margin);
  ctx.restore();
}
