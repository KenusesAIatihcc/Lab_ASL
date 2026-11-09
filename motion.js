'use strict';

// SignLab motion module: a small, on-device, user-trained gesture classifier.
// J uses the pinky tip (landmark 20), Z uses the index tip (landmark 8).
// Track a short TIME SERIES; never label J/Z using a single frozen hand pose.
// This is a learning prototype, not a validated ASL assessment system.
(() => {
  const KEY = 'signlab-motion-v1';
  const LABELS = ['J', 'Z'];
  const RESAMPLED_POINTS = 24;
  const MAX_EXAMPLES = 80;
  const RECORD_MS = 1800;
  const MIN_FRAMES = 10;
  const MAX_MISSING_FRAMES = 12;
  const MAX_DISTANCE = 0.43; // unknown gestures can return '?' instead of forced matches

  function validMotionExample(e) {
    return LABELS.includes(e?.letter) && Array.isArray(e.path) &&
      e.path.length === RESAMPLED_POINTS * 2 && e.path.every(Number.isFinite) &&
      Array.isArray(e.shape) && e.shape.length === 2 && e.shape.every(Number.isFinite);
  }

  function readExamples() {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.examples)) return [];
      return parsed.examples.filter(validMotionExample).slice(-MAX_EXAMPLES);
    } catch { return []; }
  }

  let examples = readExamples();
  let recording = null;
  let latestMessage = 'Select J or Z, then record its movement a few times.';
  const $ = (id) => document.getElementById(id);
  const status = $('motion-status');
  const train = $('motion-capture-button');
  const cancel = $('motion-cancel-button');

  function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  // Converts a series of moving fingertip positions to an equally spaced
  // trajectory. Translation/scale are removed, but overall movement SHAPE is kept.
  function buildPath(points) {
    if (points.length < MIN_FRAMES) return null;
    const filtered = [points[0]];
    for (const p of points.slice(1)) {
      if (distance(filtered[filtered.length - 1], p) > .024) filtered.push(p);
    }
    if (filtered.length < 7) return null;
    let total = 0;
    const cumulative = [0];
    for (let i = 1; i < filtered.length; i++) {
      total += distance(filtered[i - 1], filtered[i]);
      cumulative.push(total);
    }
    const xs = filtered.map((p) => p.x), ys = filtered.map((p) => p.y);
    const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    if (total < .80 || span < .45) return null; // reject mostly still hands
    const out = [];
    let segment = 1;
    for (let n = 0; n < RESAMPLED_POINTS; n++) {
      const wanted = n * total / (RESAMPLED_POINTS - 1);
      while (segment < cumulative.length - 1 && cumulative[segment] < wanted) segment++;
      const previous = cumulative[segment - 1];
      const portion = (wanted - previous) / Math.max(1e-9, cumulative[segment] - previous);
      const a = filtered[segment - 1], b = filtered[segment];
      out.push([(a.x + (b.x - a.x) * portion - filtered[0].x) / span,
                (a.y + (b.y - a.y) * portion - filtered[0].y) / span]);
    }
    return out.flat();
  }

  function similarityPath(path, template) {
    // Handedness & camera mirroring can reverse the horizontal direction.
    let regular = 0, mirrored = 0;
    for (let i = 0; i < path.length; i += 2) {
      regular += (path[i] - template[i]) ** 2 + (path[i + 1] - template[i + 1]) ** 2;
      mirrored += (path[i] + template[i]) ** 2 + (path[i + 1] - template[i + 1]) ** 2;
    }
    return Math.sqrt(Math.min(regular, mirrored) / (path.length / 2));
  }

  function compareMotion(path, shape) {
    if (!path || examples.length === 0) return {letter: null, distance: null};
    let best = {letter: null, distance: Infinity};
    for (const sample of examples) {
      const shapeDifference = Math.hypot(shape[0] - sample.shape[0], shape[1] - sample.shape[1]);
      const score = similarityPath(path, sample.path) + 0.13 * shapeDifference;
      if (score < best.distance) best = {letter: sample.letter, distance: score};
    }
    return best.distance <= MAX_DISTANCE ? best : {letter: null, distance: best.distance};
  }

  function fingerRatio(points, tip, pip, mcp) {
    const tipGap = distance(points[tip], points[mcp]);
    const jointGap = distance(points[pip], points[mcp]);
    return Math.min(2.6, tipGap / Math.max(2, jointGap));
  }

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify({version: 1, examples}));
      return true;
    } catch { return false; }
  }

  function render() {
    const letter = $('letter-select')?.value;
    const motionSelected = LABELS.includes(letter);
    const count = examples.filter((e) => e.letter === letter).length;
    train.hidden = !motionSelected;
    cancel.hidden = !recording;
    train.disabled = !motionSelected || !!recording || !window.SignLabPracticeBridge?.isCameraOn() ||
      examples.length >= MAX_EXAMPLES;
    cancel.disabled = !recording;
    status.hidden = !motionSelected && !recording;
    status.textContent = recording ?
      `Recording ${recording.letter} movement… Move your ${recording.letter === 'J' ? 'pinky' : 'index'} finger through the air.` :
      `${count} motion example${count === 1 ? '' : 's'} saved for ${letter}. ${latestMessage}`;
  }

  function getCounts() {
    return Object.fromEntries(LABELS.map((letter) => [letter, examples.filter((e) => e.letter === letter).length]));
  }

  function emitTraining() {
    window.dispatchEvent(new CustomEvent('signlab:motion-training'));
    render();
  }

  function start(letter, mode = 'train') {
    if (!LABELS.includes(letter) || recording || !window.SignLabPracticeBridge?.isCameraOn()) return false;
    if (mode === 'train' && examples.length >= MAX_EXAMPLES) return false;
    recording = {
      letter, mode, start: null, firstTip: null, palm: null,
      missing: 0, points: [], pixels: [], shapes: []
    };
    render();
    window.dispatchEvent(new CustomEvent('signlab:motion-start', {detail: {letter, mode}}));
    return true;
  }

  function finish(reason = '') {
    if (!recording) return;
    const old = recording;
    recording = null;
    const path = reason ? null : buildPath(old.points);
    const shape = old.shapes.length ? [0, 1].map((n) =>
      old.shapes.reduce((sum, value) => sum + value[n], 0) / old.shapes.length) : [0, 0];
    let predictedLetter = null;
    if (path && old.mode === 'train') {
      examples.push({letter: old.letter, path, shape});
      persist();
      latestMessage = `Saved a motion example for ${old.letter}. Record a few variations for better matching.`;
      emitTraining();
    } else if (path && old.mode === 'practice') {
      predictedLetter = compareMotion(path, shape).letter;
      latestMessage = predictedLetter ? `Motion guess: ${predictedLetter}.` :
        'Motion did not closely match a trained example. Try again.';
    } else {
      latestMessage = reason || 'No clear movement recorded. Keep your hand in view and draw a larger path.';
    }
    window.dispatchEvent(new CustomEvent('signlab:motion-complete', {
      detail: {mode: old.mode, target: old.letter, predictedLetter,
               valid: Boolean(path), message: latestMessage}
    }));
    render();
  }

  function onFrame(keypoints, now) {
    if (!recording) return;
    if (!keypoints || keypoints.length < 21) {
      recording.missing++;
      if (recording.missing > MAX_MISSING_FRAMES) finish('Hand lost during recording. Try again.');
      return;
    }
    recording.missing = 0;
    const width = distance(keypoints[5], keypoints[17]);
    if (!Number.isFinite(width) || width < 4) return;
    const tip = keypoints[recording.letter === 'J' ? 20 : 8];
    if (recording.start === null) {
      recording.start = now;
      recording.firstTip = {x: tip.x, y: tip.y};
      recording.palm = width;
    }
    recording.points.push({x: (tip.x - recording.firstTip.x) / recording.palm,
                           y: (tip.y - recording.firstTip.y) / recording.palm});
    recording.pixels.push({x: tip.x, y: tip.y});
    recording.shapes.push([
      fingerRatio(keypoints, 8, 6, 5),
      fingerRatio(keypoints, 20, 18, 17)
    ]);
    if (now - recording.start >= RECORD_MS) finish();
  }

  function getTrail() { return recording ? recording.pixels : []; }
  function getTrainedMotionLetters() {
    return LABELS.filter((letter) => examples.some((example) => example.letter === letter));
  }
  function reset(letter) {
    examples = examples.filter((e) => e.letter !== letter);
    if (recording?.letter === letter) finish('Recording cancelled.');
    persist(); emitTraining();
  }
  function clear() {
    examples = [];
    if (recording) finish('Recording cancelled.');
    persist(); emitTraining();
  }
  // Used to share starter examples without copying camera frames or photos.
  function getExamples() {
    return examples.map(({letter, path, shape}) =>
      ({letter, path: [...path], shape: [...shape]}));
  }
  function replaceExamples(incoming) {
    if (!Array.isArray(incoming) || incoming.length > MAX_EXAMPLES ||
        !incoming.every(validMotionExample)) throw new Error('Invalid motion training examples.');
    if (recording) finish('Recording cancelled for import.');
    examples = incoming.map(({letter, path, shape}) =>
      ({letter, path: [...path], shape: [...shape]}));
    persist();
    emitTraining();
  }
  function cancelRecording() { if (recording) finish('Recording cancelled.'); }

  train.addEventListener('click', () => start($('letter-select').value, 'train'));
  cancel.addEventListener('click', cancelRecording);
  $('letter-select').addEventListener('change', render);
  $('start-button').addEventListener('click', () => requestAnimationFrame(render));
  $('stop-button').addEventListener('click', () => { cancelRecording(); render(); });
  window.addEventListener('signlab:frame', render);
  window.addEventListener('pagehide', cancelRecording);

  window.SignLabMotion = Object.freeze({start, onFrame, getTrail, getCounts,
    getTrainedMotionLetters, getExamples, replaceExamples, reset, clear, cancelRecording, render});
  render();
})();
