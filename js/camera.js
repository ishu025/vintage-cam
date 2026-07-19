// ============================================================
// camera.js
// ------------------------------------------------------------
// Owns the raw MediaStream: acquisition, live preview binding,
// front/back switching, torch, and lifecycle (start/stop).
// Deliberately knows nothing about canvases or pixels — that is
// canvas.js's job — so it stays testable/swappable in isolation.
// ============================================================

const CAMERA_CONFIG = {
  preferredFacingMode: 'environment', // rear camera — this is a camera app, not a selfie app
  idealWidth: 1280,
  idealHeight: 720,
  idealFrameRate: 30,
};

export default class CameraController {
  constructor() {
    this.videoEl = null;
    this.stream = null;
    this.currentFacingMode = CAMERA_CONFIG.preferredFacingMode;
    this.availableDevices = [];

    this.onReady = null; // (videoEl) => void
    this.onError = null; // (Error) => void
  }

  async init(videoElement) {
    if (!videoElement) {
      throw new Error('CameraController.init requires a <video> element');
    }
    this.videoEl = videoElement;

    // iOS Safari requires these set BEFORE the stream is attached for
    // inline (non-fullscreen), non-muted-by-force playback.
    this.videoEl.setAttribute('playsinline', '');
    this.videoEl.setAttribute('autoplay', '');
    this.videoEl.muted = true;

    await this._enumerateDevices();
    await this.start(this.currentFacingMode);
  }

  async _enumerateDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.availableDevices = devices.filter((d) => d.kind === 'videoinput');
    } catch (_err) {
      this.availableDevices = [];
    }
  }

  _buildConstraints(facingMode) {
    return {
      audio: false,
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: CAMERA_CONFIG.idealWidth },
        height: { ideal: CAMERA_CONFIG.idealHeight },
        frameRate: { ideal: CAMERA_CONFIG.idealFrameRate },
      },
    };
  }

  async start(facingMode = this.currentFacingMode) {
    this.stop(); // always release the previous stream first (avoids leaked tracks / stuck camera LED)

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const err = new Error('getUserMedia is not supported on this device/browser.');
      this._handleError(err);
      throw err;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(this._buildConstraints(facingMode));
      this.currentFacingMode = facingMode;
      this.videoEl.srcObject = this.stream;

      await new Promise((resolve) => {
        if (this.videoEl.readyState >= 2) return resolve();
        this.videoEl.onloadedmetadata = () => resolve();
      });

      await this.videoEl.play();
      if (typeof this.onReady === 'function') this.onReady(this.videoEl);
    } catch (err) {
      this._handleError(err);
      throw err;
    }
  }

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }

  async switchCamera() {
    const nextMode = this.currentFacingMode === 'environment' ? 'user' : 'environment';
    await this.start(nextMode);
    return nextMode;
  }

  hasMultipleCameras() {
    return this.availableDevices.length > 1;
  }

  async setTorch(enabled) {
    if (!this.stream) return false;
    const track = this.stream.getVideoTracks()[0];
    if (!track || typeof track.getCapabilities !== 'function') return false;

    const capabilities = track.getCapabilities();
    if (!capabilities.torch) return false;

    try {
      await track.applyConstraints({ advanced: [{ torch: !!enabled }] });
      return true;
    } catch (_err) {
      return false;
    }
  }

  getVideoElement() {
    return this.videoEl;
  }

  isActive() {
    return !!this.stream && this.stream.active;
  }

  _handleError(err) {
    console.error('[CameraController]', err);
    if (typeof this.onError === 'function') this.onError(err);
  }
}
