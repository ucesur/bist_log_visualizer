/**
 * renderer.js — Dashboard render orchestrator.
 */

function render(parsed, isUpdate = false) {
  const { data, events } = parsed;
  const symbols = Object.keys(data);
  if (!symbols.length) { showErr('No stock data found in log.'); return; }

  destroyCharts();
  buildPriceCharts(data, symbols);
  buildVolCharts(data, symbols);
  buildSRCharts(data, symbols);
  buildRSICharts(data, symbols);
  buildMOMCharts(data, symbols);

  buildSummary(data, events, symbols, isUpdate);
  buildTable(events, isUpdate);

  document.getElementById('dropZone').style.display  = 'none';
  document.getElementById('dashboard').style.display = 'block';

  const pill = document.getElementById('statusPill');
  pill.style.display = 'block';
  pill.textContent   = `● ${events.length} events · ${symbols.join(' · ')}`;
}

/* ── Summary cards ──────────────────────────────────────────────────────── */

function buildSummary(data, events, symbols, isUpdate) {
  const bar = document.getElementById('summaryBar');
  if (!isUpdate) bar.innerHTML = '';

  symbols.forEach((sym, i) => {
    const rows   = data[sym];
    const last   = rows[rows.length - 1];
    const first  = rows[0];
    const pctChg = ((last.price - first.price) / first.price * 100).toFixed(2);
    const cls    = pctChg >= 0 ? 'pos' : 'neg';
    const sign   = pctChg >= 0 ? '+' : '';

    const rsiHtml = last.rsi !== null
      ? `<span class="${last.rsi >= 70 ? 'neg' : last.rsi <= 30 ? 'pos' : ''}">${last.rsi.toFixed(1)}</span>`
      : '<span style="opacity:.5">⏳</span>';
    const momHtml = last.mom !== null
      ? `<span class="${last.mom > 0 ? 'pos' : last.mom < 0 ? 'neg' : ''}">${last.mom >= 0 ? '+' : ''}${last.mom.toFixed(2)}%</span>`
      : '<span style="opacity:.5">⏳</span>';

    const signalBadge = _signalBadge(last.signal);
    const trendLabel  = last.trend ? last.trend.split('[')[0] : '—';

    let card = bar.querySelector(`.sum-card[data-sym="${sym}"]`);
    if (!card) {
      card = document.createElement('div');
      card.className = 'sum-card fade-in';
      card.dataset.sym = sym;
      card.style.animationDelay = `${i * .06}s`;
      bar.insertBefore(card, bar.querySelector('[data-sym="SESSION"]') || null);
    } else if (isUpdate) {
      card.classList.remove('updated'); void card.offsetWidth; card.classList.add('updated');
    }

    card.innerHTML = `
      <div class="sym-label">${sym} · BIST</div>
      <div class="price-big">${last.price.toFixed(2)}</div>
      <div class="sub-info">
        <span class="${cls}">${sign}${pctChg}%</span>
        <span>vol ${last.vol.toFixed(1)}x</span>
        <span>sup +${last.sup.toFixed(2)}</span>
        <span>res ${last.res >= 0 ? '-' : '+'}${Math.abs(last.res).toFixed(2)}</span>
      </div>
      <div class="indicator-row">
        <span class="ind-chip">RSI ${rsiHtml}</span>
        <span class="ind-chip">MOM ${momHtml}</span>
        <span class="ind-chip trend">${trendLabel}</span>
        ${signalBadge}
      </div>`;
  });

  // Session card
  let ses = bar.querySelector('[data-sym="SESSION"]');
  if (!ses) {
    ses = document.createElement('div');
    ses.className = 'sum-card fade-in';
    ses.dataset.sym = 'SESSION';
    ses.style.animationDelay = `${symbols.length * .06}s`;
    bar.appendChild(ses);
  }
  const tr = events.length
    ? `${events[0].ts.slice(11, 16)} – ${events[events.length - 1].ts.slice(11, 16)}`
    : '--';
  ses.innerHTML = `
    <div class="sym-label">SESSION</div>
    <div class="price-big" style="font-size:1.1rem;color:var(--text);">${tr}</div>
    <div class="sub-info">
      <span>${events.length} events</span>
      <span>${symbols.length} stocks</span>
      ${State.fileHandle ? `<span style="color:var(--accent)">↻ ${State.watchInterval}s</span>` : ''}
    </div>
    <div class="indicator-row"><span class="ind-chip">BIST Signal Bot v2.0</span></div>`;
}

/* ── Event table ────────────────────────────────────────────────────────── */

function buildTable(events, isUpdate) {
  const newCount = isUpdate ? events.length - State.lastEventCount : 0;
  const rows = [...events].reverse().slice(0, 300);

  let html = `<table><thead><tr>
    <th>TIME</th><th>SYMBOL</th><th>PRICE (TRY)</th><th>CHG</th>
    <th>VOL</th><th>SUP+</th><th>RES</th>
    <th>RSI</th><th>MOM</th><th>TREND</th><th>SIGNAL</th>
  </tr></thead><tbody>`;

  rows.forEach((e, idx) => {
    const symCls  = SYM_CLASS[e.sym] || '';
    const chgHtml = e.chg !== null
      ? `<span class="${e.chg >= 0 ? 'pos' : 'neg'}">${e.chg >= 0 ? '+' : ''}${e.chg.toFixed(2)}</span>`
      : `<span style="color:var(--muted)">—</span>`;
    const rsiHtml = e.rsi !== null
      ? `<span class="${e.rsi >= 70 ? 'neg' : e.rsi <= 30 ? 'pos' : ''}">${e.rsi.toFixed(1)}</span>`
      : `<span style="color:var(--muted)">⏳</span>`;
    const momHtml = e.mom !== null
      ? `<span class="${e.mom > 0 ? 'pos' : e.mom < 0 ? 'neg' : ''}">${e.mom >= 0 ? '+' : ''}${e.mom.toFixed(2)}%</span>`
      : `<span style="color:var(--muted)">⏳</span>`;
    const resHtml = e.res >= 0
      ? `<span class="neg">-${e.res.toFixed(2)}</span>`
      : `<span class="pos">+${Math.abs(e.res).toFixed(2)}</span>`;
    const trendLabel = e.trend ? e.trend.split('[')[0] : '—';
    const trendSrc   = e.trend?.match(/\[(.+)\]/)?.[1] ?? '';
    const trendCls   = trendLabel.includes('up') ? 'pos' : trendLabel.includes('down') ? 'neg' : '';
    const newCls     = isUpdate && idx < newCount ? ' new-row' : '';

    html += `<tr class="${newCls}">
      <td style="color:var(--muted)">${e.ts.slice(11, 16)}</td>
      <td class="${symCls}">${e.sym}</td>
      <td>${e.price.toFixed(2)}</td>
      <td>${chgHtml}</td>
      <td>${e.vol.toFixed(2)}x</td>
      <td class="pos">+${e.sup.toFixed(2)}</td>
      <td>${resHtml}</td>
      <td>${rsiHtml}</td>
      <td>${momHtml}</td>
      <td><span class="${trendCls}" title="${trendSrc}">${trendLabel}</span></td>
      <td>${_signalBadge(e.signal)}</td>
    </tr>`;
  });

  document.getElementById('logTableWrap').innerHTML = html + '</tbody></table>';
}

/* ── Signal badge helper ────────────────────────────────────────────────── */

/**
 * Returns an HTML badge for any signal string.
 * Handles single-word (NEUTRAL) and multi-word (TAKE PROFIT, STOP LOSS) signals.
 */
function _signalBadge(signal) {
  const s = (signal || '').toUpperCase();
  let cls = 'badge-neutral';
  if (s.includes('BUY')         || s.includes('LONG'))        cls = 'badge-buy';
  if (s.includes('SELL')        || s.includes('SHORT'))       cls = 'badge-sell';
  if (s.includes('TAKE PROFIT') || s.includes('TAKE_PROFIT')) cls = 'badge-profit';
  if (s.includes('STOP LOSS')   || s.includes('STOP_LOSS'))   cls = 'badge-stoploss';
  return `<span class="badge ${cls}">${signal}</span>`;
}
