/**
 * parser.js
 * Parses raw BIST Signal Bot v2.0 log text into structured data.
 *
 * Fixes vs previous version:
 *   - Signal group changed from \(\w+\) → \([^)]+\) to handle
 *     multi-word signals like "TAKE PROFIT", "STOP LOSS", etc.
 *   - res group uses [+-]?[\d.]+ to handle negative values (stock
 *     above resistance), e.g. "res--29.50"
 *
 * Exported function:
 *   parseLog(text) → { data, events }
 */

/**
 * Regex that matches v2.0 INFO stock-scan lines.
 *
 * Key capture groups:
 *  1  timestamp         2026-04-15 10:22:34
 *  2  symbol            TTRAK
 *  3  price             494.5
 *  4  change (opt.)     +2.50
 *  5  action            SELL
 *  6  signal            TAKE PROFIT   ← [^)]+ handles multi-word
 *  7  vol ratio         0.4
 *  8  support dist      60.25
 *  9  resistance dist   -29.50        ← [+-]? handles negative
 * 10  RSI               ⏳ or 51.9
 * 11  Momentum          ⏳ or +0.8%
 * 12  trend             sideways[default]
 *
 * The optional trailing "| conf=28%[LOW]" field is intentionally ignored.
 */
const LOG_LINE_RE = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) \[INFO\] ([A-Z]+): ([\d.]+) TRY(?: \(([+-][\d.]+)\))? \u2192 (\w+) \(([^)]+)\) \| vol ([\d.]+)x.*\| sup\+([+-]?[\d.]+) res-([+-]?[\d.]+) \| RSI=(\u23f3|[\d.]+) MOM=(\u23f3|[+-]?[\d.]+%) trend=(\S+)/u;

/**
 * Parses a BIST Signal Bot v2.0 log file.
 *
 * @param  {string} text  Raw log file contents.
 * @returns {{ data: Object, events: Array }}
 */
function parseLog(text) {
  const lines  = text.split('\n');
  const data   = {};
  const events = [];

  for (const line of lines) {
    const m = line.match(LOG_LINE_RE);
    if (!m) continue;

    const [, ts, sym, price, chg, action, signal, vol, sup, res, rsiRaw, momRaw, trend] = m;

    const entry = {
      time:   ts.slice(11, 16),
      ts,
      price:  parseFloat(price),
      chg:    chg != null ? parseFloat(chg) : null,
      action,
      /** Full signal text, e.g. "NEUTRAL", "TAKE PROFIT", "STOP LOSS" */
      signal: signal.trim(),
      vol:    parseFloat(vol),
      sup:    parseFloat(sup),
      /** Positive = below resistance; negative = above (breakout) */
      res:    parseFloat(res),
      rsi:    rsiRaw === '\u23f3' ? null : parseFloat(rsiRaw),
      mom:    momRaw === '\u23f3' ? null : parseFloat(momRaw.replace('%', '')),
      trend,
    };

    if (!data[sym]) data[sym] = [];
    data[sym].push(entry);
    events.push({ sym, ...entry });
  }

  return { data, events };
}
