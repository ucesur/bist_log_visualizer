/**
 * charts.js
 * Configures Chart.js defaults and provides helpers to create / destroy charts.
 *
 * Exported functions:
 *   destroyCharts()
 *   buildPriceCharts(data, symbols)
 *   buildVolCharts(data, symbols)
 *   buildSRCharts(data, symbols)
 */

/* ── Chart.js global defaults ──────────────────────────────────────────── */
Chart.defaults.color       = '#4a6070';
Chart.defaults.font.family = "'Share Tech Mono', monospace";

const GRID_CFG = {
  color: 'rgba(26,42,58,.5)',
  drawBorder: false,
};

/* ── Internal helpers ───────────────────────────────────────────────────── */

/**
 * Creates a Chart.js line chart on the canvas with the given id.
 *
 * @param {string}   id        Canvas element id.
 * @param {Array}    datasets  Chart.js dataset descriptors.
 * @param {Object}   opts      Extra options: { tooltipCb }
 * @returns {Chart}
 */
function _makeChart(id, datasets, opts = {}) {
  const ctx = document.getElementById(id).getContext('2d');
  return new Chart(ctx, {
    type: 'line',
    data: { datasets },
    options: {
      responsive:           true,
      maintainAspectRatio:  true,
      interaction:          { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: datasets.length > 1,
          labels:  { boxWidth: 10, font: { size: 10 } },
        },
        tooltip: {
          backgroundColor: 'rgba(13,21,32,.95)',
          borderColor:     'rgba(26,42,58,1)',
          borderWidth:     1,
          titleFont:       { size: 10 },
          bodyFont:        { size: 10 },
          callbacks:       opts.tooltipCb || undefined,
        },
      },
      scales: {
        x: {
          type:   'category',
          grid:   GRID_CFG,
          ticks:  { maxTicksLimit: 10, font: { size: 9 } },
        },
        y: {
          grid:   GRID_CFG,
          ticks:  { font: { size: 9 } },
        },
      },
      elements: {
        line:  { tension: .35, borderWidth: 1.8 },
        point: { radius: 2, hoverRadius: 5, borderWidth: 1.5 },
      },
    },
  });
}

/**
 * Creates a chart-card DOM node with a canvas inside and appends it to grid.
 * Returns the canvas id so the caller can pass it to _makeChart().
 */
function _createChartCard(grid, sym, color, title, canvasId) {
  const card = document.createElement('div');
  card.className = 'chart-card fade-in';
  card.innerHTML = `
    <h3><span class="dot" style="background:${color}"></span>${title}</h3>
    <canvas id="${canvasId}"></canvas>`;
  grid.appendChild(card);
}

/* ── Public API ─────────────────────────────────────────────────────────── */

/** Destroys all currently active Chart.js instances. */
function destroyCharts() {
  State.chartInstances.forEach(c => c.destroy());
  State.chartInstances = [];
}

/**
 * Builds one price chart per symbol and appends them to #priceChartsGrid.
 * @param {Object} data     Parsed data object { [sym]: entry[] }
 * @param {string[]} symbols
 */
function buildPriceCharts(data, symbols) {
  const grid = document.getElementById('priceChartsGrid');
  grid.innerHTML = '';

  symbols.forEach(sym => {
    const rows     = data[sym];
    const color    = SYM_COLOR[sym] || '#888';
    const canvasId = `priceChart_${sym}`;

    _createChartCard(grid, sym, color, `${sym} — Price (TRY)`, canvasId);

    State.chartInstances.push(_makeChart(canvasId, [{
      label:           sym,
      data:            rows.map(r => ({ x: r.time, y: r.price })),
      borderColor:     color,
      backgroundColor: color + '18',
      fill:            true,
      borderWidth:     1.8,
      pointRadius:     2,
      pointHoverRadius:5,
      tension:         .35,
    }], {
      tooltipCb: { label: c => ` ${c.parsed.y.toFixed(2)} TRY` },
    }));
  });
}

/**
 * Builds one volume-ratio chart per symbol and appends them to #volChartsGrid.
 * Includes a dashed threshold line at 1.5×.
 * @param {Object} data
 * @param {string[]} symbols
 */
function buildVolCharts(data, symbols) {
  const grid = document.getElementById('volChartsGrid');
  grid.innerHTML = '';

  symbols.forEach(sym => {
    const rows     = data[sym];
    const color    = SYM_COLOR[sym] || '#888';
    const canvasId = `volChart_${sym}`;

    _createChartCard(grid, sym, color, `${sym} — Volume Ratio`, canvasId);

    State.chartInstances.push(_makeChart(canvasId, [
      {
        label:           'Vol Ratio',
        data:            rows.map(r => ({ x: r.time, y: r.vol })),
        borderColor:     color,
        backgroundColor: color + '22',
        fill:            true,
        borderWidth:     1.6,
        pointRadius:     2,
        pointHoverRadius:5,
        tension:         .3,
      },
      {
        label:       'Threshold 1.5×',
        data:        rows.map(r => ({ x: r.time, y: 1.5 })),
        borderColor: 'rgba(255,64,96,.5)',
        borderDash:  [5, 4],
        borderWidth: 1,
        pointRadius: 0,
        tension:     0,
      },
    ], {
      tooltipCb: { label: c => ` ${c.parsed.y.toFixed(2)}x` },
    }));
  });
}

/**
 * Builds one support/resistance distance chart per symbol.
 * @param {Object} data
 * @param {string[]} symbols
 */
function buildSRCharts(data, symbols) {
  const grid = document.getElementById('srChartsGrid');
  grid.innerHTML = '';

  symbols.forEach(sym => {
    const rows     = data[sym];
    const color    = SYM_COLOR[sym] || '#888';
    const canvasId = `srChart_${sym}`;

    _createChartCard(grid, sym, color, `${sym} — Support / Resistance Distance`, canvasId);

    State.chartInstances.push(_makeChart(canvasId, [
      {
        label:           'Support (sup+)',
        data:            rows.map(r => ({ x: r.time, y: r.sup })),
        borderColor:     '#00d4aa',
        fill:            false,
        borderWidth:     1.6,
        pointRadius:     2,
        pointHoverRadius:5,
        tension:         .3,
      },
      {
        label:           'Resistance (res-)',
        data:            rows.map(r => ({ x: r.time, y: r.res })),
        borderColor:     '#ff4060',
        fill:            false,
        borderWidth:     1.6,
        pointRadius:     2,
        pointHoverRadius:5,
        tension:         .3,
      },
    ]));
  });
}
