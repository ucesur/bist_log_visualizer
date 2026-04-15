/**
 * charts.js — Chart.js setup and all chart builders.
 */

Chart.defaults.color       = '#4a6070';
Chart.defaults.font.family = "'Share Tech Mono', monospace";

const GRID_CFG = { color: 'rgba(26,42,58,.5)', drawBorder: false };

/* ── Internal helpers ───────────────────────────────────────────────────── */

function _makeChart(id, datasets, opts = {}) {
  const ctx = document.getElementById(id).getContext('2d');
  return new Chart(ctx, {
    type: 'line',
    data: { datasets },
    options: {
      responsive: true, maintainAspectRatio: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: datasets.length > 1, labels: { boxWidth: 10, font: { size: 10 } } },
        tooltip: {
          backgroundColor: 'rgba(13,21,32,.95)',
          borderColor: 'rgba(26,42,58,1)', borderWidth: 1,
          titleFont: { size: 10 }, bodyFont: { size: 10 },
          callbacks: opts.tooltipCb || undefined,
        },
      },
      scales: {
        x: { type: 'category', grid: GRID_CFG, ticks: { maxTicksLimit: 10, font: { size: 9 } } },
        y: { grid: GRID_CFG, ticks: { font: { size: 9 } }, ...(opts.yScale || {}) },
      },
      elements: {
        line:  { tension: .35, borderWidth: 1.8 },
        point: { radius: 2, hoverRadius: 5, borderWidth: 1.5 },
      },
    },
  });
}

function _createCard(grid, color, title, canvasId) {
  const card = document.createElement('div');
  card.className = 'chart-card fade-in';
  card.innerHTML = `<h3><span class="dot" style="background:${color}"></span>${title}</h3><canvas id="${canvasId}"></canvas>`;
  grid.appendChild(card);
}

function _validPoints(rows, field) {
  return rows.filter(r => r[field] !== null).map(r => ({ x: r.time, y: r[field] }));
}

/* ── Public API ─────────────────────────────────────────────────────────── */

function destroyCharts() {
  State.chartInstances.forEach(c => c.destroy());
  State.chartInstances = [];
}

function buildPriceCharts(data, symbols) {
  const grid = document.getElementById('priceChartsGrid');
  grid.innerHTML = '';
  symbols.forEach(sym => {
    const rows = data[sym], color = SYM_COLOR[sym] || '#888', id = `priceChart_${sym}`;
    _createCard(grid, color, `${sym} — Price (TRY)`, id);
    State.chartInstances.push(_makeChart(id, [{
      label: sym, data: rows.map(r => ({ x: r.time, y: r.price })),
      borderColor: color, backgroundColor: color + '18', fill: true,
      borderWidth: 1.8, pointRadius: 2, pointHoverRadius: 5, tension: .35,
    }], { tooltipCb: { label: c => ` ${c.parsed.y.toFixed(2)} TRY` } }));
  });
}

function buildVolCharts(data, symbols) {
  const grid = document.getElementById('volChartsGrid');
  grid.innerHTML = '';
  symbols.forEach(sym => {
    const rows = data[sym], color = SYM_COLOR[sym] || '#888', id = `volChart_${sym}`;
    _createCard(grid, color, `${sym} — Volume Ratio`, id);
    State.chartInstances.push(_makeChart(id, [
      { label: 'Vol Ratio', data: rows.map(r => ({ x: r.time, y: r.vol })),
        borderColor: color, backgroundColor: color + '22', fill: true,
        borderWidth: 1.6, pointRadius: 2, pointHoverRadius: 5, tension: .3 },
      { label: 'Threshold 1.5×', data: rows.map(r => ({ x: r.time, y: 1.5 })),
        borderColor: 'rgba(255,64,96,.5)', borderDash: [5, 4],
        borderWidth: 1, pointRadius: 0, tension: 0 },
    ], { tooltipCb: { label: c => ` ${c.parsed.y.toFixed(2)}x` } }));
  });
}

function buildSRCharts(data, symbols) {
  const grid = document.getElementById('srChartsGrid');
  grid.innerHTML = '';
  symbols.forEach(sym => {
    const rows = data[sym], color = SYM_COLOR[sym] || '#888', id = `srChart_${sym}`;
    _createCard(grid, color, `${sym} — Support / Resistance Distance`, id);
    State.chartInstances.push(_makeChart(id, [
      { label: 'Support (sup+)', data: rows.map(r => ({ x: r.time, y: r.sup })),
        borderColor: '#00d4aa', fill: false, borderWidth: 1.6, pointRadius: 2, pointHoverRadius: 5, tension: .3 },
      { label: 'Resistance (res)', data: rows.map(r => ({ x: r.time, y: r.res })),
        borderColor: '#ff4060', fill: false, borderWidth: 1.6, pointRadius: 2, pointHoverRadius: 5, tension: .3 },
    ]));
  });
}

function buildRSICharts(data, symbols) {
  const grid = document.getElementById('rsiChartsGrid');
  grid.innerHTML = '';
  symbols.forEach(sym => {
    const rows = data[sym], color = SYM_COLOR[sym] || '#888', id = `rsiChart_${sym}`;
    _createCard(grid, color, `${sym} — RSI (14)`, id);
    const pts = _validPoints(rows, 'rsi');
    const xLabels = rows.map(r => r.time);
    const hLine = (val, col, lbl) => ({
      label: lbl, data: xLabels.map(x => ({ x, y: val })),
      borderColor: col, borderDash: [4, 4], borderWidth: 1, pointRadius: 0, tension: 0,
    });
    State.chartInstances.push(_makeChart(id, [
      { label: 'RSI', data: pts, borderColor: color, backgroundColor: color + '15', fill: false,
        borderWidth: 1.8, pointRadius: 2, pointHoverRadius: 5, tension: .35 },
      hLine(70, 'rgba(255,64,96,.6)',  'Overbought 70'),
      hLine(50, 'rgba(74,96,112,.5)', 'Midline 50'),
      hLine(30, 'rgba(0,212,170,.6)', 'Oversold 30'),
    ], {
      yScale: { min: 0, max: 100 },
      tooltipCb: { label: c => c.dataset.label === 'RSI' ? ` RSI ${c.parsed.y.toFixed(1)}` : ` ${c.dataset.label}` },
    }));
  });
}

function buildMOMCharts(data, symbols) {
  const grid = document.getElementById('momChartsGrid');
  grid.innerHTML = '';
  symbols.forEach(sym => {
    const rows = data[sym], color = SYM_COLOR[sym] || '#888', id = `momChart_${sym}`;
    _createCard(grid, color, `${sym} — Momentum %`, id);
    const pts = _validPoints(rows, 'mom');
    const xLabels = rows.map(r => r.time);
    State.chartInstances.push(_makeChart(id, [
      { label: 'Momentum %', data: pts, borderColor: color, backgroundColor: color + '15', fill: false,
        borderWidth: 1.8, pointRadius: 2, pointHoverRadius: 5, tension: .3 },
      { label: 'Zero', data: xLabels.map(x => ({ x, y: 0 })),
        borderColor: 'rgba(74,96,112,.5)', borderDash: [4, 4], borderWidth: 1, pointRadius: 0, tension: 0 },
    ], { tooltipCb: { label: c => c.dataset.label === 'Momentum %' ? ` MOM ${c.parsed.y.toFixed(2)}%` : '' } }));
  });
}
