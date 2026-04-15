/**
 * watcher.js — Live file watching via File System Access API.
 */

async function pickAndWatch() {
  if (!('showOpenFilePicker' in window)) {
    document.getElementById('noSupportBanner').style.display = 'block';
    return;
  }
  try {
    [State.fileHandle] = await window.showOpenFilePicker({
      types: [{ description: 'Log files', accept: { 'text/plain': ['.log', '.txt'] } }],
      multiple: false,
    });
    const text = await (await State.fileHandle.getFile()).text();
    const parsed = parseLog(text);
    State.lastEventCount = parsed.events.length;
    tryRender(text, false);
    startWatch();
  } catch (err) {
    if (err.name !== 'AbortError') showErr('Could not open file: ' + err.message);
  }
}

function startWatch() {
  clearInterval(State.watchTimer);
  clearInterval(State.countdownTimer);
  State.watchInterval = parseInt(document.getElementById('intervalSelect').value, 10);
  State.isPaused = false;
  document.getElementById('liveControls').style.display = 'flex';
  setLiveState('live');
  _startCountdown();
  State.watchTimer = setInterval(pollFile, State.watchInterval * 1000);
}

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

function stopWatch() {
  clearInterval(State.watchTimer);
  clearInterval(State.countdownTimer);
  State.watchTimer = State.countdownTimer = null;
  State.fileHandle = null;
  State.isPaused   = false;
  document.getElementById('liveControls').style.display  = 'none';
  document.getElementById('countdownWrap').style.display = 'none';
  document.getElementById('livePill').style.display      = 'none';
}

function togglePause() {
  State.isPaused = !State.isPaused;
  document.getElementById('pauseBtn').textContent = State.isPaused ? '▶ Resume' : '⏸ Pause';
  setLiveState(State.isPaused ? 'paused' : 'live');
}

function changeInterval() { if (State.fileHandle) startWatch(); }

function setLiveState(state) {
  const pill = document.getElementById('livePill');
  const txt  = document.getElementById('livePillText');
  pill.className    = 'pill';
  pill.style.display = 'flex';
  if (state === 'paused') pill.classList.add('paused');
  if (state === 'error')  pill.classList.add('error');
  txt.textContent = { live: 'LIVE', paused: 'PAUSED', error: 'READ ERROR' }[state] ?? 'LIVE';
}

function _startCountdown() {
  clearInterval(State.countdownTimer);
  document.getElementById('countdownWrap').style.display = 'flex';
  State.cdTick = State.watchInterval;
  _drawRing();
  State.countdownTimer = setInterval(() => {
    State.cdTick--;
    if (State.cdTick < 0) State.cdTick = State.watchInterval;
    _drawRing();
  }, 1000);
}

function _drawRing() {
  const frac = State.cdTick / State.watchInterval;
  const arc  = document.getElementById('countdownArc');
  arc.style.strokeDashoffset = ARC_LEN * (1 - frac);
  arc.style.stroke = frac > 0.3 ? 'var(--accent)' : 'var(--amber)';
  document.getElementById('countdownLabel').textContent = State.cdTick;
}
