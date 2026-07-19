// ============================================================
// canvas.js
// ------------------------------------------------------------
// Owns canvas-level I/O: pulling a frame off the live video into
// an ImageData buffer, and exporting the final result canvas as a
// downloadable file. No filter math lives here — pipeline.js and
// filters/*.js own that; this module is plumbing.
// ============================================================
export const CANVAS_CONFIG = {
  // Caps the long edge so a 12MP-class capture doesn't stall mobile
  // CPUs; raise toward 4032 for true 12MP output on capable devices.
  maxLongEdge: 4032,
};

export default class CanvasManager {
  constructor(captureCanvas, resultCanvas) {
    this.captureCanvas = captureCanvas;
    // willReadFrequently hints the browser to keep this canvas on the
    // CPU backing store, since we call getImageData every capture.
    this.captureCtx = captureCanvas.getContext('2d', { willReadFrequently: true });
    this.resultCanvas = resultCanvas;
    this.resultCtx = resultCanvas.getContext('2d');
  }

  /**
   * Draws the current video frame at (capped) native resolution and
   * reads it back as ImageData. Reuses the same canvas across captures,
   * resizing only when dimensions actually change — resizing a canvas
   * discards its backing store, so we avoid doing it every shot.
   */
  captureFrame(videoEl) {
    const vw = videoEl.videoWidth;
    const vh = videoEl.videoHeight;
    const scale = Math.min(1, CANVAS_CONFIG.maxLongEdge / Math.max(vw, vh));
    const width = Math.round(vw * scale);
    const height = Math.round(vh * scale);

    if (this.captureCanvas.width !== width || this.captureCanvas.height !== height) {
      this.captureCanvas.width = width;
      this.captureCanvas.height = height;
    }
    this.captureCtx.drawImage(videoEl, 0, 0, width, height);
    return this.captureCtx.getImageData(0, 0, width, height);
  }

  /** Sizes (only if needed) and returns the result canvas's 2D context for the pipeline to draw into. */
  getResultContext(width, height) {
    if (this.resultCanvas.width !== width || this.resultCanvas.height !== height) {
      this.resultCanvas.width = width;
      this.resultCanvas.height = height;
    }
    return this.resultCtx;
  }

  /** Exports the current result canvas as a downloadable JPEG file. */
  saveAsFile(filename = `vintage-cam-${Date.now()}.jpg`, quality = 0.92) {
    return new Promise((resolve, reject) => {
      this.resultCanvas.toBlob((blob) => {
        if (!blob) return reject(new Error('Failed to export image blob.'));
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        // Revoke on next tick — by then the browser has already handed
        // the blob off to the OS download, so it's safe to free.
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        resolve(filename);
      }, 'image/jpeg', quality);
    });
  }
}
