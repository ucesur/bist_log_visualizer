/**
 * renderer.js
 * Orchestrates the full dashboard render and handles incremental updates.
 *
 * Exported functions:
 *   render(parsed, isUpdate)
 *   buildSummary(data, events, symbols, isUpdate)
 *   buildTable(events, isUpdate)
 */

/**
 * Full render entry point. Rebuilds all charts, summary cards, and the table.
 *
 * @param {{ data: Object, events: Array }} parsed   Output of parseLog().
 * @param {boolean} isUpdate  True when called from the live-watch poller.
 *                            Triggers highlight animations instead of full teardown.
 */
function render(parsed, isUpdate = false) {
  const { data, events } = parsed;
  const symbols = Object.keys(data);

  if (!symbols.length) {
    showErr('No stock data found in log.');
    return;
  }

  // Rebuild every chart from scratch (destroys old instances first)
  destroyCharts();
  buildPriceCharts(data, symbols);
  buildVolCharts(data, symbols);
  buildSRCharts(data, symbols);

  // Update cards and table (smart in-place on updates)
  buildSummary(data, events, symbols, isUpdate);
  buildTable(events, isUpdate);

  // Show dashboard, hide upload zone
  document.getElementById('dropZone').style.display  = 'none';
  document.getElementById('dashboard').style.display = 'block';

  // Update status pill
  const pill = document.getElementById('statusPill');
  pill.style.display = 'block';
  pill.textContent   = `● ${events.length} events · ${symbols.join(' · ')}`;
}

/* ── Summary cards ──────────────────────────────────────────────────────── */

/**
 * Creates or updates the summary card row.
 * On first render cards are created with a fade-in animation.
 * On updates, existing cards flash their border to signal new data.
 *
 * @param {Object}   data
 * @param {Array}    events
 * @param {string[]} symbols
 * @param {boolean}  isUpdate
 */
function buildSummary(data, events, symbols, isUpdate) {
  const bar = document.getElementById('summaryBar');
  if (!isUpdate) bar.innerHTML = '';

  symbols.forEach((sym, i) => {
    const rows    = data[sym];
    const last    = rows[rows.length - 1];
    const first   = rows[0];
    const pctChg  = ((last.price - first.price) / first.price * 100).toFixed(2);
    const cls     = pctChg >= 0 ? 'pos' : 'neg';
    const sign    = pctChg >= 0 ? '+' : '';

    // Re-use existing card on updates, create new one on first render
    let card = bar.querySelector(`.sum-card[data-sym="${sym}"]`);
    if (!card) {
      card = document.createElement('div');
      card.className = 'sum-card fade-in';
      card.dataset.sym = sym;
      card.style.animationDelay = `${i * .06}s`;
      const sessionCard = bar.querySelector('[data-sym="SESSION"]');
      bar.insertBefore(card, sessionCard || null);
    } else if (isUpdate) {
      // Retrigger border-flash animation
      card.classList.remove('updated');
      void card.offsetWidth; // force reflow
      card.classList.add('updated');
    }

    card.innerHTML = `
      <div class="sym-label">${sym} · BIST</div>
      <div class="price-big">${last.price.toFixed(2)}</div>
      <div class="sub-info">
        <span class="${cls}">${sign}${pctChg}%</span>
        <span>vol ${last.vol.toFixed(1)}x</span>
        <span>sup +${last.sup}</span>
        <span>res -${last.res}</span>
        <span>${rows.length} scans</span>
      </div>`;
  });

  // Session overview card
  let ses = bar.querySelector('[data-sym="SESSION"]');
  if (!ses) {
    ses = document.createElement('div');
    ses.className = 'sum-card fade-in';
    ses.dataset.sym = 'SESSION';
    ses.style.animationDelay = `${symbols.length * .06}s`;
    bar.appendChild(ses);
  }

  const timeRange = events.length
    ? `${events[0].ts.slice(11, 16)} – ${events[events.length - 1].ts.slice(11, 16)}`
    : '--';

  ses.innerHTML = `
    <div class="sym-label">SESSION</div>
    <div class="price-big" style="font-size:1.1rem;color:var(--text);">${timeRange}</div>
    <div class="sub-info">
      <span>${events.length} events</span>
      <span>${symbols.length} stocks</span>
      ${State.fileHandle
        ? `<span style="color:var(--accent)">↻ ${State.watchInterval}s</span>`
        : ''}
    </div>`;
}

/* ── Event table ────────────────────────────────────────────────────────── */

/**
 * Renders the scan-events table (latest 300 rows, newest first).
 * New rows added since the last render are highlighted with an animation.
 *
 * @param {Array}   events
 * @param {boolean} isUpdate
 */
function buildTable(events, isUpdate) {
  // How many rows are genuinely new since last render?
  const newCount = isUpdate ? events.length - State.lastEventCount : 0;

  const rows = [...events].reverse().slice(0, 300);

  let html = `
    <table>
      <thead>
        <tr>
          <th>TIME</th>
          <th>SYMBOL</th>
          <th>PRICE (TRY)</th>
          <th>CHG</th>
          <th>VOL</th>
          <th>SUP+</th>
          <th>RES-</th>
          <th>SIGNAL</th>
        </tr>
      </thead>
      <tbody>`;

  rows.forEach((e, idx) => {
    const symCls   = SYM_CLASS[e.sym] || '';
    const chgHtml  = e.chg !== null
      ? `<span class="${e.chg >= 0 ? 'pos' : 'neg'}">${e.chg >= 0 ? '+' : ''}${e.chg.toFixed(2)}</span>`
      : `<span style="color:var(--muted)">—</span>`;
    const badgeCls = e.signal === 'BUY'  ? 'badge-buy'
                   : e.signal === 'SELL' ? 'badge-sell'
                   : 'badge-neutral';
    const newCls   = isUpdate && idx < newCount ? ' new-row' : '';

    html += `
        <tr class="${newCls}">
          <td style="color:var(--muted)">${e.ts.slice(11, 16)}</td>
          <td class="${symCls}">${e.sym}</td>
          <td>${e.price.toFixed(2)}</td>
          <td>${chgHtml}</td>
          <td>${e.vol.toFixed(2)}x</td>
          <td class="pos">+${e.sup.toFixed(2)}</td>
          <td class="neg">-${e.res.toFixed(2)}</td>
          <td><span class="badge ${badgeCls}">${e.signal}</span></td>
        </tr>`;
  });

  html += '</tbody></table>';
  document.getElementById('logTableWrap').innerHTML = html;
}
