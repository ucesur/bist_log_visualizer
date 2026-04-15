/**
 * main.js — Entry point: DOM event wiring, drag & drop, paste.
 */

function tryRender(text, isUpdate) {
  clearErr();
  try {
    const parsed = parseLog(text);
    const total  = Object.values(parsed.data).reduce((s, v) => s + v.length, 0);
    if (!total) { showErr('No matching log lines found. Make sure this is a BIST Signal Bot v2.0 log.'); return; }
    render(parsed, isUpdate);
  } catch (err) { showErr('Parse error: ' + err.message); }
}

function parsePasted() {
  const text = document.getElementById('pasteArea').value.trim();
  if (!text) { showErr('Please paste log content first.'); return; }
  tryRender(text, false);
}

function showErr(m) { document.getElementById('errMsg').textContent = m; }
function clearErr()  { document.getElementById('errMsg').textContent = ''; }

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('pauseBtn')       .addEventListener('click', togglePause);
  document.getElementById('stopBtn')        .addEventListener('click', stopWatch);
  document.getElementById('intervalSelect') .addEventListener('change', changeInterval);
  document.getElementById('watchBtn')       .addEventListener('click', pickAndWatch);
  document.getElementById('openOnceBtn')    .addEventListener('click', () => document.getElementById('fileInputHidden').click());
  document.getElementById('visualizeBtn')   .addEventListener('click', parsePasted);

  document.getElementById('fileInputHidden').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = ev => tryRender(ev.target.result, false);
    r.readAsText(file);
  });

  const dz = document.getElementById('dropZone');
  dz.addEventListener('dragover',  e => { e.preventDefault(); dz.classList.add('dragover'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
  dz.addEventListener('drop', e => {
    e.preventDefault(); dz.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = ev => tryRender(ev.target.result, false);
    r.readAsText(file);
  });
});
