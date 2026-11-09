'use strict';

// SignLab: a simple nearest-example ASL handshape classifier.
// No camera frames are uploaded or stored; only normalized landmark numbers
// from examples the user explicitly chooses to save go into localStorage.
const LETTERS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
const STORAGE_KEY = 'signlab-progress-v1';
const MAX_STORED_EXAMPLES = 2000;
const WORDS = [
  'HELLO', 'LOVE', 'THANK', 'FRIEND', 'PEACE', 'SMILE', 'LEARN', 'HANDS',
  'SIGN', 'HOPE', 'BRAVE', 'KIND', 'STAR', 'BIRD', 'CLOUD', 'RAIN',
  'TREE', 'HOME', 'DREAM', 'BEAR', 'MOON', 'CAKE', 'MUSIC', 'OCEAN',
  'LIGHT', 'PLAY', 'WAVE', 'READ', 'GOOD', 'BLUE', 'WORLD', 'TACO'
];

// Bones join the 21 landmarks given by ml5's handPose detector.
const BONES = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20], [0, 17]
];

const $ = (selector) => document.querySelector(selector);
const ui = {
  start: $('#start-button'), stop: $('#stop-button'), capture: $('#capture-button'),
  clear: $('#clear-button'), resetLetter: $('#reset-letter-button'),
  letter: $('#letter-select'), selectedImage: $('#selected-image'),
  selectedPreviewLabel: $('#selected-preview-label'), selectedSummary: $('#selected-summary'),
  motionHint: $('#motion-hint'), gallery: $('#alphabet-grid'),
  trainedTotal: $('#trained-total'), exampleTotal: $('#example-total'),
  progressBar: $('#coverage-bar'), progressCaption: $('#progress-caption'),
  video: $('#video'), canvas: $('#canvas'), cameraStage: $('#camera-stage'),
  cameraPlaceholder: $('#camera-placeholder'), cameraIndicator: $('#camera-indicator'),
  status: $('#status'), prediction: $('#prediction'), predictionDetail: $('#prediction-detail'),
  storageNote: $('#storage-note'), generate: $('#generate-button'),
  nextLetter: $('#next-letter-button'), restartWord: $('#restart-word-button'),
  wordLetters: $('#word-letters'), wordPosition: $('#word-position'),
  wordImage: $('#word-image'), wordInstruction: $('#word-instruction')
};

const ctx = ui.canvas.getContext('2d');
const frame = document.createElement('canvas');
const frameCtx = frame.getContext('2d');
const galleryButtons = {};
const galleryCounts = {};
let detector;
let stream;
let loading = false;
let loopId = 0;
let features = null;
let cameraError = '';

function isValidExample(example) {
  return example && LETTERS.includes(example.letter) && !['J', 'Z'].includes(example.letter) &&
    Array.isArray(example.features) && example.features.length === 42 &&
    example.features.every((number) => typeof number === 'number' && Number.isFinite(number));
}

function loadProgress() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (data?.version === 1) {
      return {
        examples: Array.isArray(data.examples) ?
          data.examples.filter(isValidExample).slice(0, MAX_STORED_EXAMPLES) : [],
        selectedLetter: LETTERS.includes(data.selectedLetter) ? data.selectedLetter : 'A',
        word: WORDS.includes(data.word) ? data.word : 'HELLO',
        wordIndex: Number.isInteger(data.wordIndex) ? data.wordIndex : 0
      };
    }
  } catch { /* Storage may be disabled or contain malformed data. */ }
  return {examples: [], selectedLetter: 'A', word: 'HELLO', wordIndex: 0};
}
const progress = loadProgress();
const examples = progress.examples;
let selectedLetter = progress.selectedLetter;
let practiceWord = progress.word;
let wordIndex = Math.max(0, Math.min(progress.wordIndex, practiceWord.length));

function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 1, examples, selectedLetter, word: practiceWord, wordIndex
    }));
    ui.storageNote.textContent = 'Your examples save automatically on this device.';
  } catch {
    ui.storageNote.textContent = 'Browser storage is unavailable. Changes will last only this visit.';
  }
}

function imagePath(letter) { return `assets/letters/${letter.toLowerCase()}.png`; }
function setText(element, text) {
  if (element.textContent !== text) element.textContent = text;
}

// Translate 21 (x,y) hand landmarks into 42 wrist-relative values, divided
// by palm width. This reduces dependence on camera position and hand size.
function getFeatures(keypoints) {
  if (!Array.isArray(keypoints) || keypoints.length < 21) return null;
  const wrist = keypoints[0];
  const palmWidth = Math.hypot(keypoints[5].x - keypoints[17].x,
                               keypoints[5].y - keypoints[17].y);
  if (!Number.isFinite(palmWidth) || palmWidth < 1) return null;
  const values = keypoints.slice(0, 21).flatMap(({x, y}) => [
    (x - wrist.x) / palmWidth, (y - wrist.y) / palmWidth
  ]);
  return values.every(Number.isFinite) ? values : null;
}

// Euclidean nearest neighbor: choose the user's saved example with the
// smallest sum of squared differences. No training data means no guess.
function guessLetter(currentFeatures) {
  if (!currentFeatures || examples.length === 0) return null;
  let bestLetter = null;
  let bestDistance = Infinity;
  for (const example of examples) {
    if (example.letter === 'J' || example.letter === 'Z') continue;
    let squaredDistance = 0;
    for (let i = 0; i < 42; i++) {
      const delta = currentFeatures[i] - example.features[i];
      squaredDistance += delta * delta;
    }
    if (squaredDistance < bestDistance) {
      bestDistance = squaredDistance;
      bestLetter = example.letter;
    }
  }
  return bestLetter;
}

function drawMotionTrail(points) {
  if (points.length < 2) return;
  ctx.save();
  ctx.strokeStyle = '#ffd76a';
  ctx.lineWidth = Math.max(4, ui.canvas.width / 125);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) ctx.lineTo(point.x, point.y);
  ctx.stroke();
  ctx.restore();
}

function drawHand(keypoints) {
  const size = ui.canvas.width / 210;
  ctx.strokeStyle = '#a5f4b3';
  ctx.fillStyle = '#aff3ca';
  ctx.lineWidth = Math.max(2, size);
  ctx.lineCap = 'round';
  for (const [from, to] of BONES) {
    ctx.beginPath();
    ctx.moveTo(keypoints[from].x, keypoints[from].y);
    ctx.lineTo(keypoints[to].x, keypoints[to].y);
    ctx.stroke();
  }
  for (const {x, y} of keypoints.slice(0, 21)) {
    ctx.beginPath();
    ctx.arc(x, y, size * 1.75, 0, 2 * Math.PI);
    ctx.fill();
  }
}

function renderLive() {
  ui.start.disabled = Boolean(stream) || loading;
  ui.stop.disabled = !stream;
  ui.capture.disabled = !stream || !features || ['J', 'Z'].includes(selectedLetter) || examples.length >= MAX_STORED_EXAMPLES;
  ui.canvas.hidden = !stream;
  ui.cameraPlaceholder.hidden = Boolean(stream);
  ui.cameraStage.classList.toggle('is-live', Boolean(stream));
  setText(ui.cameraIndicator, stream ? 'CAMERA ON' : loading ? 'CONNECTING' : 'CAMERA OFF');

  if (cameraError) setText(ui.status, cameraError);
  else if (loading) setText(ui.status, 'Loading hand tracking and requesting camera access…');
  else if (!stream) setText(ui.status, 'Camera is off. Choose Start camera.');
  else if (features) setText(ui.status, 'Hand detected. Hold your sign steady to save an example.');
  else setText(ui.status, 'Looking for one hand. Try good light and keep it in view.');

  const predicted = stream && features ? guessLetter(features) : null;
  setText(ui.prediction, !stream || !features ? '—' : predicted || '?');
  if (!stream) setText(ui.predictionDetail, 'Start the camera to see live predictions.');
  else if (!features) setText(ui.predictionDetail, 'Waiting for a visible hand.');
  else if (!predicted) setText(ui.predictionDetail, 'Save an example first to teach the model.');
  else setText(ui.predictionDetail, `Closest match from your ${examples.length} saved example${examples.length === 1 ? '' : 's'}.`);
  // The optional practice module observes predictions but cannot change the classifier.
  window.dispatchEvent(new CustomEvent('signlab:frame', {detail: {
    cameraOn: Boolean(stream), handVisible: Boolean(features), predictedLetter: predicted
  }}));
}

function renderTraining() {
  const counts = Object.fromEntries(LETTERS.map((letter) => [letter, 0]));
  for (const example of examples) {
    if (!['J', 'Z'].includes(example.letter)) counts[example.letter]++;
  }
  const motionCounts = window.SignLabMotion?.getCounts() || {J: 0, Z: 0};
  counts.J = motionCounts.J;
  counts.Z = motionCounts.Z;
  const trained = LETTERS.filter((letter) => counts[letter] > 0).length;
  ui.trainedTotal.textContent = trained;
  ui.exampleTotal.textContent = examples.filter((e) => !['J', 'Z'].includes(e.letter)).length + counts.J + counts.Z;
  ui.progressBar.value = trained;
  ui.progressCaption.textContent = trained === 26 ? 'Every letter has examples!' : `${26 - trained} to go`;
  ui.letter.value = selectedLetter;
  ui.selectedImage.src = imagePath(selectedLetter);
  ui.selectedImage.alt = `ASL handshape for ${selectedLetter}`;
  ui.selectedPreviewLabel.textContent = `Letter ${selectedLetter}`;
  ui.selectedSummary.textContent = `${counts[selectedLetter]} example${counts[selectedLetter] === 1 ? '' : 's'} saved for ${selectedLetter}`;
  ui.resetLetter.disabled = counts[selectedLetter] === 0;
  ui.clear.disabled = examples.length === 0 && counts.J + counts.Z === 0;
  ui.motionHint.hidden = !['J', 'Z'].includes(selectedLetter);
  ui.motionHint.textContent = ['J', 'Z'].includes(selectedLetter) ?
    `This is a moving letter. Use Record movement to train ${selectedLetter}; a single photo cannot recognize it.` : '';
  window.SignLabMotion?.render?.();
  for (const letter of LETTERS) {
    galleryCounts[letter].textContent = counts[letter];
    galleryButtons[letter].setAttribute('aria-pressed', String(letter === selectedLetter));
    galleryButtons[letter].classList.toggle('has-examples', counts[letter] > 0);
    galleryButtons[letter].setAttribute('aria-label',
      `Letter ${letter}, ${counts[letter]} saved example${counts[letter] === 1 ? '' : 's'}. Select for training.`);
  }
  renderLive();
  window.dispatchEvent(new CustomEvent('signlab:training', {detail: {
    trainedLetters: LETTERS.filter((letter) => counts[letter] > 0)
  }}));
}

function selectLetter(letter, persist = true) {
  if (!LETTERS.includes(letter)) return;
  selectedLetter = letter;
  renderTraining();
  if (persist) saveProgress();
}

function renderWord() {
  ui.wordLetters.replaceChildren();
  [...practiceWord].forEach((letter, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'word-character';
    if (index === wordIndex) button.classList.add('is-current');
    if (index < wordIndex) button.classList.add('is-done');
    button.textContent = letter;
    button.setAttribute('aria-label', `Practice ${letter}, position ${index + 1}`);
    button.setAttribute('aria-current', String(index === wordIndex));
    button.addEventListener('click', () => {
      wordIndex = index;
      selectLetter(letter, false);
      renderWord();
      saveProgress();
    });
    ui.wordLetters.append(button);
  });
  const finished = wordIndex >= practiceWord.length;
  ui.wordPosition.textContent = finished ? 'COMPLETE!' : `${wordIndex + 1} OF ${practiceWord.length}`;
  ui.nextLetter.disabled = finished;
  ui.nextLetter.textContent = wordIndex === practiceWord.length - 1 ? 'Finish word ✓' : 'Next letter →';
  ui.restartWord.disabled = wordIndex === 0;
  if (finished) {
    ui.wordImage.hidden = true;
    ui.wordInstruction.textContent = 'Word complete! Generate another word or start over.';
  } else {
    const target = practiceWord[wordIndex];
    ui.wordImage.hidden = false;
    ui.wordImage.src = imagePath(target);
    ui.wordImage.alt = `ASL handshape for ${target}`;
    ui.wordInstruction.textContent = `Show ${target}, then choose ${wordIndex === practiceWord.length - 1 ? 'Finish word' : 'Next letter'}.`;
  }
  window.dispatchEvent(new CustomEvent('signlab:word-change', {detail: {word: practiceWord}}));
}

function renderGallery() {
  for (const letter of LETTERS) {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'alphabet-tile';
    const image = document.createElement('img');
    image.src = imagePath(letter);
    image.alt = `ASL handshape for ${letter}`;
    image.width = 220;
    image.height = 200;
    const label = document.createElement('div');
    label.className = 'alphabet-tile-label';
    const letterLabel = document.createElement('strong');
    letterLabel.textContent = letter;
    const count = document.createElement('span');
    count.title = 'Saved examples';
    label.append(letterLabel, count);
    tile.append(image, label);
    tile.addEventListener('click', () => selectLetter(letter));
    galleryButtons[letter] = tile;
    galleryCounts[letter] = count;
    ui.gallery.append(tile);
    ui.letter.append(new Option(`Letter ${letter}`, letter));
  }
}

// Grab a live frame, find hand landmarks, normalize them, draw an overlay,
// then compare the features to locally saved examples. Repeat while live.
async function detectLoop(id) {
  while (stream && id === loopId) {
    try {
      frameCtx.drawImage(ui.video, 0, 0, frame.width, frame.height);
      const hands = await detector.detect(frame);
      if (!stream || id !== loopId) return;
      ctx.drawImage(frame, 0, 0);
      const hand = Array.isArray(hands) ? hands[0] : null;
      features = hand ? getFeatures(hand.keypoints) : null;
      if (hand && features) drawHand(hand.keypoints);
      window.SignLabMotion?.onFrame(hand && features ? hand.keypoints : null, performance.now());
      const trail = window.SignLabMotion?.getTrail() || [];
      if (trail.length) drawMotionTrail(trail);
      renderLive();
    } catch (error) {
      stopCamera();
      cameraError = 'Hand tracking stopped. Please restart the camera.';
      console.error('Hand tracking failed:', error);
      renderLive();
      return;
    }
    await new Promise(requestAnimationFrame);
  }
}

async function startCamera() {
  if (loading || stream) return;
  loading = true;
  cameraError = '';
  renderLive();
  try {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('Camera access requires HTTPS or localhost.');
    }
    if (!window.ml5?.handPose) throw new Error('Hand tracking library could not load. Check your connection.');
    detector ??= await window.ml5.handPose();
    stream = await navigator.mediaDevices.getUserMedia({video: {facingMode: 'user'}, audio: false});
    ui.video.srcObject = stream;
    await ui.video.play();
    frame.width = ui.canvas.width = ui.video.videoWidth || 640;
    frame.height = ui.canvas.height = ui.video.videoHeight || 480;
    loading = false;
    renderLive();
    detectLoop(++loopId);
  } catch (error) {
    if (stream) stream.getTracks().forEach((track) => track.stop());
    stream = null;
    features = null;
    ui.video.srcObject = null;
    loading = false;
    cameraError = error.message.includes('HTTPS') || error.message.includes('library') ? error.message :
      'Could not open the camera. Allow permission and try again.';
    console.error('Camera setup failed:', error);
    renderLive();
  }
}

function stopCamera() {
  loopId++;
  if (stream) stream.getTracks().forEach((track) => track.stop());
  stream = null;
  features = null;
  ui.video.srcObject = null;
  cameraError = '';
  renderLive();
}

renderGallery();
ui.letter.addEventListener('change', () => selectLetter(ui.letter.value));
ui.start.addEventListener('click', startCamera);
ui.stop.addEventListener('click', stopCamera);
ui.capture.addEventListener('click', () => {
  if (!features || !stream || ['J', 'Z'].includes(selectedLetter) || examples.length >= MAX_STORED_EXAMPLES) return;
  // Capture a snapshot of the *numbers*, not a reference to live webcam data.
  examples.push({letter: selectedLetter, features: [...features]});
  renderTraining();
  saveProgress();
});
ui.resetLetter.addEventListener('click', () => {
  for (let i = examples.length - 1; i >= 0; i--) {
    if (examples[i].letter === selectedLetter) examples.splice(i, 1);
  }
  if (['J','Z'].includes(selectedLetter)) window.SignLabMotion?.reset(selectedLetter);
  renderTraining();
  saveProgress();
});
ui.clear.addEventListener('click', () => {
  if ((!examples.length && !(window.SignLabMotion?.getTrainedMotionLetters().length)) || !window.confirm('Delete all saved training examples, including J and Z motion examples? This cannot be undone.')) return;
  examples.length = 0;
  window.SignLabMotion?.clear();
  renderTraining();
  saveProgress();
});
ui.generate.addEventListener('click', () => {
  const available = WORDS.filter((word) => word !== practiceWord);
  practiceWord = available[Math.floor(Math.random() * available.length)];
  wordIndex = 0;
  selectLetter(practiceWord[0], false);
  renderWord();
  saveProgress();
});
ui.nextLetter.addEventListener('click', () => {
  if (wordIndex >= practiceWord.length) return;
  wordIndex++;
  if (wordIndex < practiceWord.length) selectLetter(practiceWord[wordIndex], false);
  renderWord();
  saveProgress();
});
ui.restartWord.addEventListener('click', () => {
  wordIndex = 0;
  selectLetter(practiceWord[0], false);
  renderWord();
  saveProgress();
});
// Training import/export bridge (only landmark numbers; never camera images).
// Data validation happens before any training examples are replaced.
window.SignLabTrainingBridge = Object.freeze({
  getExamples: () => examples.map(({letter, features}) => ({letter, features: [...features]})),
  replaceExamples: (incoming) => {
    if (!Array.isArray(incoming) || incoming.length > MAX_STORED_EXAMPLES ||
        !incoming.every(isValidExample)) throw new Error('Invalid static training examples.');
    examples.splice(0, examples.length, ...incoming.map(({letter, features}) =>
      ({letter, features: [...features]})));
    saveProgress();
    renderTraining();
  }
});
// A small read-only bridge lets practice.js use the *existing* classifier.
window.SignLabPracticeBridge = Object.freeze({
  getTrainedLetters: () => [...new Set(examples.map((example) => example.letter))],
  isCameraOn: () => Boolean(stream)
});
window.addEventListener('signlab:motion-training', renderTraining);
window.addEventListener('pagehide', stopCamera);
renderTraining();
renderWord();
