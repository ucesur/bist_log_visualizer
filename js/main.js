/**
 * main.js
 * Application entry point.
 *
 * Responsibilities:
 *   - Wires all DOM events (buttons, file input, drag & drop)
 *   - Provides tryRender() — the shared "parse then render" pipeline
 *   - Provides showErr() / clearErr() UI helpers used by other modules
 */

/* ── Shared render pipeline ─────────────────────────────────────────────── */

/**
 * Parses raw log text and calls render() if any data was found.
 * Used by all input paths: file picker, one-shot input, drag-drop, paste.
 *
 * @param {string}  text      Raw log file contents.
 * @param {boolean} isUpdate  True when called from the live-watch poller.
 */
function tryRender(text, isUpdate) {
  clearErr();
  try {
    const parsed = parseLog(text);
    const total  = Object.values(parsed.data).reduce((s, v) => s + v.length, 0);

    if (!total) {
      showErr('No matching log lines found. Make sure this is a BIST Signal Bot log.');
      return;
    }

    render(parsed, isUpdate);
  } catch (err) {
    showErr('Parse error: ' + err.message);
  }
}

/* ── Error helpers ──────────────────────────────────────────────────────── */

/** Displays an error message in #errMsg. */
function showErr(msg) {
  document.getElementById('errMsg').textContent = msg;
}

/** Clears any displayed error message. */
function clearErr() {
  document.getElementById('errMsg').textContent = '';
}

/* ── Paste handler ──────────────────────────────────────────────────────── */

/** Called by the "▶ Visualize" button. */
function parsePasted() {
  const text = document.getElementById('pasteArea').value.trim();
  if (!text) { showErr('Please paste log content first.'); return; }
  tryRender(text, false);
}

/* ── DOM ready ──────────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {

  /* ── Header live-control buttons ──────────────────────────────────────── */
  document.getElementById('pauseBtn')
    .addEventListener('click', togglePause);

  document.getElementById('stopBtn')
    .addEventListener('click', stopWatch);

  document.getElementById('intervalSelect')
    .addEventListener('change', changeInterval);

  /* ── Upload zone buttons ───────────────────────────────────────────────── */
  document.getElementById('watchBtn')
    .addEventListener('click', pickAndWatch);

  document.getElementById('openOnceBtn')
    .addEventListener('click', () => document.getElementById('fileInputHidden').click());

  document.getElementById('visualizeBtn')
    .addEventListener('click', parsePasted);

  /* ── One-shot file input ───────────────────────────────────────────────── */
  document.getElementById('fileInputHidden').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => tryRender(ev.target.result, false);
    reader.readAsText(file);
  });

  /* ── Drag & drop ───────────────────────────────────────────────────────── */
  const dropZone = document.getElementById('dropZone');

  dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => tryRender(ev.target.result, false);
    reader.readAsText(file);
  });

});
