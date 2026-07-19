// ============================================================
// utils/image.js
// ------------------------------------------------------------
// Buffer reuse layer. At 12MP, a single RGBA frame is ~48MB;
// allocating a fresh one per filter per capture would thrash GC
// on mobile. Every filter that needs a second buffer (blur,
// bloom, sharpen, chromatic aberration) pulls a named, persistent
// ImageData from getScratchImageData() instead of `new`-ing one.
// ============================================================

const _scratchImageData = new Map(); // "key:WxH" -> ImageData
const _bufferPool = new Map();       // byteLength -> Uint8ClampedArray[]

/**
 * Returns a persistent ImageData for the given (key, width, height).
 * Same key+size returns the SAME object on every call — callers must
 * fully overwrite it before reading, since it carries whatever the
 * previous filter pass left behind.
 */
export function getScratchImageData(width, height, key = 'default') {
  const cacheKey = `${key}:${width}x${height}`;
  let scratch = _scratchImageData.get(cacheKey);
  if (!scratch) {
    scratch = new ImageData(width, height);
    _scratchImageData.set(cacheKey, scratch);
  }
  return scratch;
}

/** Borrow a Uint8ClampedArray of exact length from the pool (or allocate if none free). */
export function acquireBuffer(length) {
  const list = _bufferPool.get(length);
  if (list && list.length) return list.pop();
  return new Uint8ClampedArray(length);
}

/** Return a buffer to the pool for later reuse. */
export function releaseBuffer(buffer) {
  if (!buffer) return;
  const list = _bufferPool.get(buffer.length);
  if (list) list.push(buffer);
  else _bufferPool.set(buffer.length, [buffer]);
}

/** Deep-copies an ImageData using a pooled backing buffer instead of `new Uint8ClampedArray`. */
export function cloneImageData(src) {
  const buf = acquireBuffer(src.data.length);
  buf.set(src.data);
  return new ImageData(buf, src.width, src.height);
}

/** Copies src pixels into dst in place (dst must already be the same size). */
export function copyInto(dst, src) {
  dst.data.set(src.data);
  return dst;
}

export function pixelIndex(x, y, width) {
  return (y * width + x) * 4;
}

export function clampToBounds(x, y, width, height) {
  return {
    x: x < 0 ? 0 : x >= width ? width - 1 : x,
    y: y < 0 ? 0 : y >= height ? height - 1 : y,
  };
}
