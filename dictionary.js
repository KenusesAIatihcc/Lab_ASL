'use strict';

// Demonstrates a real external API in the hosted, static web app.
// No API key required. A fallback displays when a word is missing or offline.
(() => {
  const out = document.getElementById('word-definition');
  const source = document.getElementById('word-dictionary-source');
  let activeRequest = null;

  function selectedWord() {
    return document.getElementById('word-letters')?.textContent?.replace(/[^A-Za-z]/g, '')?.toLowerCase() || '';
  }

  async function showDefinition() {
    const word = selectedWord();
    if (!word) return;
    activeRequest?.abort();
    const controller = new AbortController();
    activeRequest = controller;
    out.textContent = `Looking up “${word}”…`;
    source.textContent = 'Free Dictionary API • live request';
    const timeout = setTimeout(() => controller.abort(), 7000);
    try {
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, {
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`Definition unavailable (HTTP ${response.status})`);
      const entries = await response.json();
      const meaning = entries?.[0]?.meanings?.flatMap((m) => m.definitions || [])?.[0]?.definition;
      if (!meaning || typeof meaning !== 'string') throw new Error('No definition returned');
      if (activeRequest !== controller) return;
      out.textContent = meaning;
      source.textContent = `Live definition for “${word}” • Free Dictionary API`;
    } catch (error) {
      if (activeRequest !== controller) return;
      out.textContent = `Definition unavailable right now. You can still practice spelling “${word.toUpperCase()}”.`;
      source.textContent = 'API offline, unavailable, or word not found';
    } finally { clearTimeout(timeout); }
  }

  window.addEventListener('signlab:word-change', showDefinition);
  showDefinition();
})();
