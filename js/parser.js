/**
 * parser.js
 * Parses raw BIST Signal Bot v2.0 log text into structured data.
 *
 * New fields vs v1.x:
 *   rsi   — Relative Strength Index (null while warming up, then a float)
 *   mom   — Momentum % (null while warming up, then ±N.NN)
 *   trend — EMA trend label e.g. "sideways[default]", "sideways[ema]"
 *
 * Exported function:
 *   parseLog(text) → { data, events }
 */

/**
 * Matches v2.0 INFO stock-scan lines.
 *
 * Example lines handled:
 *   ECILC: 108.1 TRY → WAIT (NEUTRAL) | vol 1.0x ⏳vol-warmup 1/5 | sup+8.10 res-6.90 | RSI=⏳ MOM=⏳ trend=sideways[default]
 *   TTRAK: 448.5 TRY (+1.00) → WAIT (NEUTRAL) | vol 1.1x | sup+18.50 res-11.50 | RSI=⏳ MOM=⏳ trend=sideways[default]
 *   TTRAK: 448.75 TRY (+0.50) → WAIT (NEUTRAL) | vol 1.2x | sup+18.75 res-11.25 | RSI=51.9 MOM=+0.1% trend=sideways[default]
 *   KCAER: 11.32 TRY (-0.01) → WAIT (NEUTRAL) | vol 0.5x | sup+1.32 res--0.12 | RSI=⏳ MOM=+1.3% trend=sideways[default]
 *
 * Notes:
 *   - res can be negative (stock above resistance) → appears as "res--0.12"
 *   - RSI is literal "⏳" during warmup, then a float like "51.9"
 *   - MOM is literal "⏳" during warmup, then "±N.NN%"
 */
const LOG_LINE_RE = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) \[INFO\] ([A-Z]+): ([\d.]+) TRY(?: \(([+-][\d.]+)\))? \u2192 (\w+) \((\w+)\) \| vol ([\d.]+)x.*\| sup\+([\d.]+) res-([+-]?[\d.]+) \| RSI=(\u23f3|[\d.]+) MOM=(\u23f3|[+-]?[\d.]+%) trend=(\S+)/u;

/**
 * Parses a BIST Signal Bot v2.0 log file.
 *
 * @param  {string} text  Raw log file contents.
 * @returns {{ data: Object, events: Array }}
 *   data   — keyed by symbol; each value is an array of scan entries.
 *   events — flat chronological array of all scan entries (with sym field).
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
      time:   ts.slice(11, 16),   // "HH:MM" for chart X-axis
      ts,
      price:  parseFloat(price),
      chg:    chg != null ? parseFloat(chg) : null,
      action,
      signal,
      vol:    parseFloat(vol),
      sup:    parseFloat(sup),
      /** Positive = below resistance; negative = above (breakout) */
      res:    parseFloat(res),
      /** RSI value, or null during warmup */
      rsi:    rsiRaw === '\u23f3' ? null : parseFloat(rsiRaw),
      /** Momentum %, stored as plain number (e.g. 1.34 for "+1.34%"), null during warmup */
      mom:    momRaw === '\u23f3' ? null : parseFloat(momRaw.replace('%', '')),
      trend,
    };

    if (!data[sym]) data[sym] = [];
    data[sym].push(entry);
    events.push({ sym, ...entry });
  }

  return { data, events };
}
