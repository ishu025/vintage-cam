// ============================================================
// app.js
// ------------------------------------------------------------
// Orchestration only: wires DOM events to camera.js, canvas.js,
// and pipeline.js. No pixel-processing logic lives here — every
// filter algorithm lives in filters/*.js, sequenced by pipeline.js.
// ============================================================
import CameraController from './camera.js';
import CanvasManager from './canvas.js';
import { createDefaultPipeline } from './pipeline.js';

const videoEl = document.getElementById('preview');
const captureCanvas = document.getElementById('capture-canvas');
const resultCanvas = document.getElementById('result-canvas');
const shutterBtn = document.getElementById('shutter-btn');
const switchBtn = document.getElementById('switch-btn');
const galleryBtn = document.getElementById('gallery-btn');
const statusEl = document.getElementById('status');

function showStatus(msg, timeout = 2000) {
  statusEl.hidden = false;
  statusEl.textContent = msg;
  if (timeout) setTimeout(() => { statusEl.hidden = true; }, timeout);
}

const camera = new CameraController();
const canvasManager = new CanvasManager(captureCanvas, resultCanvas);
const pipeline = createDefaultPipeline();

camera.onReady = () => showStatus('Camera ready', 1200);
camera.onError = (err) => showStatus(`Camera error: ${err.message}`, 0);
camera.init(videoEl).catch(() => {});

switchBtn.addEventListener('click', async () => {
  if (!camera.hasMultipleCameras()) return;
  await camera.switchCamera();
});

shutterBtn.addEventListener('click', async () => {
  if (!camera.isActive()) return;
  shutterBtn.disabled = true;

  try {
    const imageData = canvasManager.captureFrame(videoEl);
    const ctx = canvasManager.getResultContext(imageData.width, imageData.height);
    const now = Date.now();

    pipeline.run(imageData, ctx, { seed: now, timestamp: now });

    resultCanvas.hidden = false;
    videoEl.hidden = true;
    showStatus('Photo processed');

    await canvasManager.saveAsFile();
    showStatus('Saved to downloads');
  } catch (err) {
    showStatus(`Capture failed: ${err.message}`, 0);
  } finally {
    shutterBtn.disabled = false;
  }
});

galleryBtn.addEventListener('click', () => {
  // "Gallery" here just returns to the live preview from the result screen —
  // saved files live in the OS Downloads folder, not in-app storage.
  resultCanvas.hidden = true;
  videoEl.hidden = false;
});
