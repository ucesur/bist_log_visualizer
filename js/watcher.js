/**
 * watcher.js
 * Live-watch functionality using the File System Access API.
 * Falls back gracefully on unsupported browsers (Firefox, Safari).
 *
 * Exported functions:
 *   pickAndWatch()     — opens file picker, starts live polling
 *   startWatch()       — (re)starts the poll loop with current interval
 *   stopWatch()        — stops polling and resets live UI
 *   togglePause()      — pauses / resumes polling without losing file handle
 *   changeInterval()   — reads new interval from #intervalSelect and restarts
 */

/* ── File picker ────────────────────────────────────────────────────────── */

/**
 * Opens the native file picker, reads the chosen log file once,
 * and begins the live-watch polling loop.
 */
async function pickAndWatch() {
  if (!('showOpenFilePicker' in window)) {
    document.getElementById('noSupportBanner').style.display = 'block';
    return;
  }

  try {
    [State.fileHandle] = await window.showOpenFilePicker({
      types:    [{ description: 'Log files', accept: { 'text/plain': ['.log', '.txt'] } }],
      multiple: false,
    });

    const text   = await (await State.fileHandle.getFile()).text();
    const parsed = parseLog(text);
    State.lastEventCount = parsed.events.length;
    tryRender(text, false);
    startWatch();

  } catch (err) {
    // AbortError = user closed the picker; ignore silently
    if (err.name !== 'AbortError') showErr('Could not open file: ' + err.message);
  }
}

/* ── Poll loop ──────────────────────────────────────────────────────────── */

/**
 * (Re)starts the file-poll interval using the currently selected watch interval.
 * Clears any existing timers first to avoid duplicates.
 */
function startWatch() {
  clearInterval(State.watchTimer);
  clearInterval(State.countdownTimer);

  State.watchInterval = parseInt(document.getElementById('intervalSelect').value, 10);
  State.isPaused      = false;

  _showLiveControls();
  setLiveState('live');
  _startCountdown();

  State.watchTimer = setInterval(pollFile, State.watchInterval * 1000);
}

/**
 * Reads the watched file and re-renders if new lines have appeared.
 * Called automatically by setInterval; also safe to call manually.
 */
async function pollFile() {
  if (State.isPaused || !State.fileHandle) return;

  try {
    const text   = await (await State.fileHandle.getFile()).text();
    const parsed = parseLog(text);

    if (parsed.events.length !== State.lastEventCount) {
      const isUpdate = State.lastEventCount > 0;
      render(parsed, isUpdate);
      State.lastEventCount = parsed.events.length;
    }

    setLiveState('live');
  } catch (err) {
    console.warn('[watcher] Poll error:', err);
    setLiveState('error');
  }
}

/* ── Controls ───────────────────────────────────────────────────────────── */

/**
 * Stops the poll loop entirely, releases the file handle, and hides live UI.
 */
function stopWatch() {
  clearInterval(State.watchTimer);
  clearInterval(State.countdownTimer);
  State.watchTimer     = null;
  State.countdownTimer = null;
  State.fileHandle     = null;
  State.isPaused       = false;

  document.getElementById('liveControls').style.display  = 'none';
  document.getElementById('countdownWrap').style.display = 'none';
  document.getElementById('livePill').style.display      = 'none';
}

/**
 * Toggles the paused state. When paused, pollFile() becomes a no-op.
 */
function togglePause() {
  State.isPaused = !State.isPaused;
  document.getElementById('pauseBtn').textContent = State.isPaused ? '▶ Resume' : '⏸ Pause';
  setLiveState(State.isPaused ? 'paused' : 'live');
}

/**
 * Called when the user changes the interval selector.
 * Restarts the loop with the new duration.
 */
function changeInterval() {
  if (State.fileHandle) startWatch();
}

/* ── Live-state UI ──────────────────────────────────────────────────────── */

/**
 * Updates the #livePill badge and its CSS class.
 * @param {'live'|'paused'|'error'} state
 */
function setLiveState(state) {
  const pill = document.getElementById('livePill');
  const txt  = document.getElementById('livePillText');

  pill.className    = 'pill';   // reset modifier classes
  pill.style.display = 'flex';

  if (state === 'paused') pill.classList.add('paused');
  if (state === 'error')  pill.classList.add('error');

  txt.textContent = { live: 'LIVE', paused: 'PAUSED', error: 'READ ERROR' }[state] ?? 'LIVE';
}

/* ── Countdown ring ─────────────────────────────────────────────────────── */

/** Reveals the live-controls bar. */
function _showLiveControls() {
  document.getElementById('liveControls').style.display = 'flex';
}

/** Starts (or restarts) the one-second countdown ring ticker. */
function _startCountdown() {
  clearInterval(State.countdownTimer);

  const wrap = document.getElementById('countdownWrap');
  wrap.style.display = 'flex';

  State.cdTick = State.watchInterval;
  _drawRing();

  State.countdownTimer = setInterval(() => {
    State.cdTick--;
    if (State.cdTick < 0) State.cdTick = State.watchInterval;
    _drawRing();
  }, 1000);
}

/**
 * Redraws the SVG countdown arc and label for the current tick.
 * Arc colour transitions from accent (green) to amber as time runs out.
 */
function _drawRing() {
  const frac = State.cdTick / State.watchInterval;
  const arc  = document.getElementById('countdownArc');

  arc.style.strokeDashoffset = ARC_LEN * (1 - frac);
  arc.style.stroke = frac > 0.3 ? 'var(--accent)' : 'var(--amber)';

  document.getElementById('countdownLabel').textContent = State.cdTick;
}
