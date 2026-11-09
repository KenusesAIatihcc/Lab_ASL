'use strict';

// Persistent, on-device CRUD database for actual checked practice attempts.
// Unlike localStorage, IndexedDB is a database with transactions/object stores.
(() => {
  const DB_NAME = 'signlab-learning-v1';
  const STORE = 'attempts';
  const status = document.getElementById('db-status');
  const countNode = document.getElementById('db-total');
  const rateNode = document.getElementById('db-match-rate');
  const frequentNode = document.getElementById('db-weak-letter');
  const breakdown = document.getElementById('db-letter-breakdown');
  let db = null;

  function openDB() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('IndexedDB unavailable'));
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE)) {
          const store = database.createObjectStore(STORE, {keyPath: 'id'});
          store.createIndex('byTarget', 'target', {unique: false});
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function transaction(type, makeRequest) {
    return new Promise((resolve, reject) => {
      if (!db) return reject(new Error('Database not open'));
      const tx = db.transaction(STORE, type);
      let answer;
      tx.oncomplete = () => resolve(answer);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
      const request = makeRequest(tx.objectStore(STORE));
      if (request) request.onsuccess = () => { answer = request.result; };
    });
  }

  async function addAttempt(attempt, id) {
    if (!attempt || !/^[A-Z]$/.test(attempt.target) || !/^[A-Z]$/.test(attempt.guess)) return;
    const record = {id: id || `${attempt.at}-${attempt.target}-${attempt.guess}-${Math.random().toString(36).slice(2)}`,
      target: attempt.target, guess: attempt.guess,
      matched: Boolean(attempt.matched), at: attempt.at};
    await transaction('readwrite', (store) => store.put(record));
    return record;
  }

  function readAttempts() { return transaction('readonly', (store) => store.getAll()); }
  function deleteAllAttempts() { return transaction('readwrite', (store) => store.clear()); }

  async function migrateExistingPracticeHistory() {
    // One-time migration so existing 2.0 progress is not lost.
    const migrationFlag = 'signlab-idb-migrated-v1';
    try {
      if (localStorage.getItem(migrationFlag)) return;
      const saved = JSON.parse(localStorage.getItem('signlab-practice-v1') || 'null');
      if (Array.isArray(saved?.attempts)) {
        for (const [i, attempt] of saved.attempts.entries()) {
          if (attempt && typeof attempt.at === 'string') {
            await addAttempt(attempt, `legacy-${i}-${attempt.at}`);
          }
        }
      }
      localStorage.setItem(migrationFlag, '1');
    } catch (e) { console.warn('Practice history migration skipped:', e); }
  }

  async function render() {
    if (!db) return;
    const all = await readAttempts();
    const matches = all.filter((a) => a.matched).length;
    countNode.textContent = String(all.length);
    rateNode.textContent = all.length ? `${Math.round(100 * matches / all.length)}%` : '—';
    const summary = new Map();
    all.forEach(({target, matched}) => {
      const entry = summary.get(target) || {attempts: 0, matches: 0};
      entry.attempts++;
      if (matched) entry.matches++;
      summary.set(target, entry);
    });
    const sorted = [...summary.entries()].sort((a, b) => b[1].attempts - a[1].attempts || a[0].localeCompare(b[0]));
    frequentNode.textContent = sorted[0]?.[0] || '—';
    breakdown.replaceChildren();
    if (!sorted.length) {
      breakdown.textContent = 'No saved attempts yet. Complete a practice round to begin.';
    } else {
      for (const [letter, info] of sorted) {
        const chip = document.createElement('span');
        chip.className = 'db-letter-chip';
        chip.textContent = `${letter}: ${info.matches}/${info.attempts} matches`;
        breakdown.append(chip);
      }
    }
    status.textContent = 'IndexedDB connected — checked attempts are saved and read on this device.';
  }

  (async () => {
    try {
      db = await openDB();
      await migrateExistingPracticeHistory();
      await render();
    } catch (error) {
      status.textContent = 'On-device database unavailable in this browser. The app can still practice.';
      console.warn('IndexedDB not available:', error);
    }
  })();

  window.addEventListener('signlab:attempt-saved', async (event) => {
    if (!db) return;
    try { await addAttempt(event.detail); await render(); }
    catch (error) {status.textContent = `Could not save practice history to IndexedDB: ${error.message}`;}
  });
  window.addEventListener('signlab:attempts-cleared', async () => {
    if (!db) return;
    try { await deleteAllAttempts(); await render(); }
    catch (error) {status.textContent = `Could not clear database: ${error.message}`;}
  });
})();
