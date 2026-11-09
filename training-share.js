'use strict';

// Export the browser's trained landmark examples to a portable JSON file.
// A published file at data/starter-examples.json is downloaded on first visit
// when the browser has no existing examples. Personal training is not replaced.
(() => {
  const FORMAT = 'signlab-training';
  const VERSION = 1;
  const STARTER_URL = 'data/starter-examples.json';
  const STARTER_FLAG = 'signlab-starter-loaded-v1';
  const MAX_FILE_BYTES = 2 * 1024 * 1024;
  const MAX_STATIC = 2000;
  const MAX_MOTION = 80;
  const staticBridge = window.SignLabTrainingBridge;
  const motionBridge = window.SignLabMotion;
  const exportButton = document.getElementById('export-training-button');
  const importButton = document.getElementById('import-training-button');
  const fileInput = document.getElementById('import-training-file');
  const message = document.getElementById('share-training-status');
  if (!staticBridge || !motionBridge || !exportButton || !importButton || !fileInput || !message) return;

  function validStatic(e) {
    return e && /^[A-IK-Y]$/.test(e.letter) &&
      Array.isArray(e.features) && e.features.length === 42 &&
      e.features.every((n) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) < 200);
  }
  function validMotion(e) {
    return e && (e.letter === 'J' || e.letter === 'Z') &&
      Array.isArray(e.path) && e.path.length === 48 &&
      e.path.every((n) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) < 200) &&
      Array.isArray(e.shape) && e.shape.length === 2 &&
      e.shape.every((n) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) < 200);
  }
  function validate(data) {
    if (data?.format !== FORMAT || data?.version !== VERSION ||
        !Array.isArray(data.staticExamples) || !Array.isArray(data.motionExamples) ||
        data.staticExamples.length > MAX_STATIC || data.motionExamples.length > MAX_MOTION ||
        !data.staticExamples.every(validStatic) || !data.motionExamples.every(validMotion)) {
      throw new Error('This is not a compatible SignLab training JSON file.');
    }
    if (!data.staticExamples.length && !data.motionExamples.length) {
      throw new Error('The training JSON contains no examples yet.');
    }
    return data;
  }
  function hasTraining() {
    return staticBridge.getExamples().length > 0 || motionBridge.getExamples().length > 0;
  }
  function currentData() {
    return {format: FORMAT, version: VERSION, exportedAt: new Date().toISOString(),
      staticExamples: staticBridge.getExamples(), motionExamples: motionBridge.getExamples()};
  }
  function announce(text) { message.textContent = text; }
  function applyTraining(data, source) {
    validate(data); // fully validate both types before changing either dataset
    staticBridge.replaceExamples(data.staticExamples);
    motionBridge.replaceExamples(data.motionExamples);
    announce(`${source}: loaded ${data.staticExamples.length} still examples and ${data.motionExamples.length} motion examples. You can begin practicing!`);
  }
  function markStarterHandled() {
    try { localStorage.setItem(STARTER_FLAG, '1'); } catch { /* private browsing may block storage */ }
  }
  function starterHandled() {
    try { return localStorage.getItem(STARTER_FLAG) === '1'; } catch { return false; }
  }

  exportButton.addEventListener('click', () => {
    const data = currentData();
    if (!data.staticExamples.length && !data.motionExamples.length) {
      announce('Train some letters before exporting a starter set.');
      return;
    }
    const file = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'starter-examples.json';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    announce('Training JSON downloaded. Place it at data/starter-examples.json in your GitHub repository to share with new visitors.');
  });

  importButton.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      announce('Training file is too large (limit: 2 MB).');
      return;
    }
    try {
      const data = validate(JSON.parse(await file.text()));
      if (hasTraining() && !window.confirm('Replace your current handshape and motion training with this file? Your practice history will remain.')) return;
      applyTraining(data, 'Imported training');
      markStarterHandled();
    } catch (error) { announce(`Import failed: ${error.message}`); }
  });

  async function bootstrap() {
    if (starterHandled() || hasTraining()) {
      announce(hasTraining() ? 'Your saved training is ready. Export a JSON backup anytime.' : 'Train or import examples to get started.');
      return;
    }
    try {
      const response = await fetch(STARTER_URL, {cache: 'no-store'});
      if (!response.ok) throw new Error('starter file not published');
      const raw = await response.text();
      if (raw.length > MAX_FILE_BYTES) throw new Error('starter file too large');
      const data = validate(JSON.parse(raw));
      // Do not replace training that the visitor created while the file loaded.
      if (hasTraining()) return;
      applyTraining(data, 'Starter training');
      markStarterHandled();
    } catch {
      announce('No shared starter set installed yet. Train a few letters, or import a training JSON file.');
    }
  }
  bootstrap();
  // Allows isolated tests to exercise the format without needing a webcam.
  window.SignLabTrainingShare = Object.freeze({validate, currentData, hasTraining});
})();
