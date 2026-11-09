'use strict';

// SignLab 2.0 practice mode. The classifier lives in app.js; this file only
// checks whether its *stable guess* matches the letter on the practice card.
// A match is not proof that the user's sign is anatomically correct.
(() => {
  const bridge = window.SignLabPracticeBridge;
  if (!bridge) {
    console.warn('SignLab practice needs app.js loaded first.');
    return;
  }

  const PRACTICE_KEY = 'signlab-practice-v1';
  const MAX_HISTORY = 500;
  const REQUIRED_STABLE_FRAMES = 6;
  const REQUIRED_STABLE_MS = 450;
  // J and Z are movement-based; SignLab currently classifies one frame at a time.
  const STATIC_LETTERS = [...'ABCDEFGHIKLMNOPQRSTUVWXY'];
  const ALL_LETTERS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
  const isMotion = (letter) => letter === 'J' || letter === 'Z';
  const $ = (id) => document.getElementById(id);
  const ui = {
    target: $('quiz-target'), caption: $('quiz-target-caption'),
    hintButton: $('quiz-hint-button'), hintImage: $('quiz-hint-image'),
    liveGuess: $('quiz-live-guess'), state: $('quiz-state-label'),
    message: $('quiz-feedback-message'), eligibility: $('quiz-eligibility'),
    start: $('quiz-start-button'), check: $('quiz-check-button'),
    retry: $('quiz-retry-button'), next: $('quiz-next-button'),
    stop: $('quiz-stop-button'), clear: $('quiz-clear-history'),
    recordMotion: $('quiz-record-motion-button'),
    attempts: $('quiz-total-attempts'), matches: $('quiz-total-matches'),
    rate: $('quiz-match-rate'), storage: $('quiz-storage-note')
  };

  function safeHistory() {
    try {
      const saved = JSON.parse(localStorage.getItem(PRACTICE_KEY) || 'null');
      if (!saved || saved.version !== 1 || !Array.isArray(saved.attempts)) return [];
      return saved.attempts.filter((entry) =>
        entry && ALL_LETTERS.includes(entry.target) &&
        ALL_LETTERS.includes(entry.guess) &&
        typeof entry.matched === 'boolean' &&
        entry.matched === (entry.target === entry.guess) &&
        typeof entry.at === 'string'
      ).slice(-MAX_HISTORY);
    } catch {
      return [];
    }
  }

  let history = safeHistory();
  let active = false;
  let phase = 'idle'; // idle | waiting | checked
  let target = null;
  let lastTarget = null;
  let deck = [];
  let hintVisible = false;
  let latestFrame = {cameraOn: bridge.isCameraOn(), handVisible: false, predictedLetter: null};
  let candidate = null;
  let candidateFrames = 0;
  let candidateSince = 0;
  let stableGuess = null;
  let lastCheckedGuess = null;

  function setText(node, value) {
    if (node.textContent !== value) node.textContent = value;
  }

  function eligibleLetters() {
    const trained = new Set(bridge.getTrainedLetters());
    const motions = new Set(window.SignLabMotion?.getTrainedMotionLetters() || []);
    return ALL_LETTERS.filter((letter) => isMotion(letter) ? motions.has(letter) : trained.has(letter));
  }

  function saveHistory() {
    try {
      localStorage.setItem(PRACTICE_KEY, JSON.stringify({version: 1, attempts: history}));
      setText(ui.storage, 'Practice history saves in this browser.');
    } catch {
      setText(ui.storage, 'Storage is unavailable; history lasts only this visit.');
    }
  }

  function renderHistory() {
    const matching = history.filter((entry) => entry.matched).length;
    setText(ui.attempts, String(history.length));
    setText(ui.matches, String(matching));
    setText(ui.rate, history.length ? `${Math.round(100 * matching / history.length)}%` : '—');
    ui.clear.disabled = history.length === 0;
  }

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function pickLetter() {
    const eligible = eligibleLetters();
    if (eligible.length < 2) return null;
    if (deck.length === 0 || deck.some((letter) => !eligible.includes(letter)) ||
        deck.length > eligible.length) {
      deck = shuffle([...eligible]);
    }
    // Do not repeat a target on consecutive rounds when alternatives exist.
    if (deck.length > 1 && deck[0] === lastTarget) {
      const alternate = deck.findIndex((letter) => letter !== lastTarget);
      [deck[0], deck[alternate]] = [deck[alternate], deck[0]];
    }
    const next = deck.shift();
    lastTarget = next;
    return next;
  }

  function resetObservation() {
    candidate = null;
    candidateFrames = 0;
    candidateSince = 0;
    stableGuess = null;
  }

  function announce(message, result = '') {
    setText(ui.message, message);
    if (result) ui.message.dataset.result = result;
    else delete ui.message.dataset.result;
  }

  function renderControls() {
    const ready = eligibleLetters().length >= 2;
    ui.start.disabled = active || !ready;
    ui.check.disabled = !active || phase !== 'waiting' || !latestFrame.cameraOn || !stableGuess;
    ui.recordMotion.hidden = !active || !isMotion(target);
    ui.recordMotion.disabled = !active || phase !== 'waiting' || !latestFrame.cameraOn;
    ui.retry.disabled = !active || phase !== 'checked';
    ui.next.disabled = !active;
    ui.next.textContent = phase === 'checked' ? 'Next letter →' : 'Skip letter →';
    ui.stop.disabled = !active;
    ui.hintButton.disabled = !active;
    ui.hintButton.textContent = hintVisible ? 'Hide hint' : 'Show hint';
    ui.hintImage.hidden = !active || !hintVisible;
    setText(ui.eligibility, ready ?
      `Ready to practice ${eligibleLetters().length} trained letters, including moving letters once trained.` :
      `Teach at least two different letters. For J and Z, use Record movement in the training section.`);
  }

  function renderPractice() {
    setText(ui.target, target || '?');
    setText(ui.caption, active ? `Try signing ${target}` : 'Start practice to get a letter');
    if (active) {
      ui.hintImage.src = `assets/letters/${target.toLowerCase()}.png`;
      ui.hintImage.alt = `ASL reference handshape for ${target}`;
    }
    const displayedGuess = phase === 'checked' ? lastCheckedGuess : stableGuess;
    setText(ui.liveGuess, displayedGuess || '—');
    if (!active) setText(ui.state, 'Not started');
    else if (phase === 'checked') setText(ui.state, 'Attempt recorded');
    else if (!latestFrame.cameraOn) setText(ui.state, 'Start camera');
    else if (isMotion(target)) setText(ui.state, stableGuess ? 'Movement recorded — ready' : 'Record J/Z movement');
    else if (!latestFrame.handVisible) setText(ui.state, 'Show a hand');
    else if (!eligibleLetters().length) setText(ui.state, 'Train some letters');
    else if (stableGuess) setText(ui.state, 'Steady guess — ready');
    else setText(ui.state, 'Hold your hand steady');
    renderControls();
  }

  function newRound() {
    target = pickLetter();
    if (!target) {
      endSession('Train at least two different still letters to start.');
      return;
    }
    active = true;
    phase = 'waiting';
    hintVisible = false;
    lastCheckedGuess = null;
    resetObservation();
    announce(latestFrame.cameraOn ?
      (isMotion(target) ? 'Press Record movement, draw the letter in the air, then check the motion guess.' :
        'Show the target sign to the camera. Wait for a steady guess, then press Check sign.') :
      'Start your camera above, then sign the target letter.');
    renderPractice();
  }

  function endSession(message = 'Session ended. Your checked attempts are saved locally.') {
    active = false;
    phase = 'idle';
    target = null;
    hintVisible = false;
    deck = [];
    resetObservation();
    announce(message);
    renderPractice();
  }

  function onFrame(event) {
    latestFrame = event.detail;
    if (!active || phase !== 'waiting') return;
    if (isMotion(target)) { renderControls(); return; }
    const guess = latestFrame.cameraOn && latestFrame.handVisible ? latestFrame.predictedLetter : null;
    if (!guess) {
      if (candidate || stableGuess) {
        resetObservation();
        renderPractice();
      } else if (!latestFrame.cameraOn || !latestFrame.handVisible) {
        renderPractice();
      }
      return;
    }
    const now = performance.now();
    if (guess !== candidate) {
      candidate = guess;
      candidateFrames = 1;
      candidateSince = now;
      stableGuess = null;
      renderPractice();
      return;
    }
    candidateFrames++;
    if (!stableGuess && candidateFrames >= REQUIRED_STABLE_FRAMES &&
        now - candidateSince >= REQUIRED_STABLE_MS) {
      stableGuess = guess;
      announce(`Steady model guess: ${guess}. Press Check sign to compare it with ${target}.`);
      renderPractice();
    }
  }

  function onTrainingChange() {
    if (active && (eligibleLetters().length < 2 || !eligibleLetters().includes(target))) {
      endSession('Training changed during practice. Start a new session when you are ready.');
    }
    renderControls();
  }

  ui.start.addEventListener('click', () => {
    if (eligibleLetters().length < 2) return;
    deck = [];
    lastTarget = null;
    newRound();
  });
  ui.check.addEventListener('click', () => {
    if (!active || phase !== 'waiting' || !stableGuess || !latestFrame.cameraOn) return;
    const matched = stableGuess === target;
    lastCheckedGuess = stableGuess;
    history.push({target, guess: stableGuess, matched, at: new Date().toISOString()});
    history = history.slice(-MAX_HISTORY);
    phase = 'checked';
    saveHistory();
    renderHistory();
    window.dispatchEvent(new CustomEvent('signlab:attempt-saved', {detail: history[history.length - 1]}));
    announce(matched ?
      `Match! The model guessed ${lastCheckedGuess}, the same as the target ${target}.` :
      `Different guess: the target was ${target}, but the model guessed ${lastCheckedGuess}. You can try again.`,
    matched ? 'match' : 'different');
    renderPractice();
  });
  ui.retry.addEventListener('click', () => {
    if (!active || phase !== 'checked') return;
    phase = 'waiting';
    resetObservation();
    lastCheckedGuess = null;
    announce(isMotion(target) ? 'Press Record movement to try this letter again.' : 'Try the same letter again. Wait for a steady guess, then press Check sign.');
    renderPractice();
  });
  ui.recordMotion.addEventListener('click', () => {
    if (!active || phase !== 'waiting' || !isMotion(target) || !latestFrame.cameraOn) return;
    resetObservation();
    announce(`Recording ${target}. Trace its movement while the camera watches your hand.`);
    const started = window.SignLabMotion?.start(target, 'practice');
    if (!started) announce('Could not start recording. Check that your camera is on.');
    renderPractice();
  });
  window.addEventListener('signlab:motion-complete', (event) => {
    const result = event.detail;
    if (!active || phase !== 'waiting' || !isMotion(target) || result.mode !== 'practice' || result.target !== target) return;
    stableGuess = result.predictedLetter;
    announce(result.valid ?
      (stableGuess ? `The motion model guessed ${stableGuess}. Press Check sign to compare.` :
        'The movement did not match closely enough. Record another attempt.') : result.message);
    renderPractice();
  });

  ui.next.addEventListener('click', () => {
    if (!active) return;
    newRound(); // Skipping an unscored round does not create a practice attempt.
  });
  ui.stop.addEventListener('click', () => {
    if (!active) return;
    endSession();
  });
  ui.hintButton.addEventListener('click', () => {
    if (!active) return;
    hintVisible = !hintVisible;
    renderControls();
  });
  ui.clear.addEventListener('click', () => {
    if (!history.length || !window.confirm('Delete practice attempt history? Training examples will remain saved.')) return;
    history = [];
    saveHistory();
    renderHistory();
    window.dispatchEvent(new CustomEvent('signlab:attempts-cleared'));
    announce('Practice history cleared. Your handshape training examples are untouched.');
  });

  window.addEventListener('signlab:frame', onFrame);
  window.addEventListener('signlab:training', onTrainingChange);
  window.addEventListener('signlab:motion-training', onTrainingChange);
  renderHistory();
  renderPractice();
  saveHistory();
})();
