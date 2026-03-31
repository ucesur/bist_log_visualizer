/**
 * parser.js
 * Parses raw BIST Signal Bot log text into structured data.
 *
 * Exported function:
 *   parseLog(text) → { data, events }
 */

/**
 * Regular expression that matches INFO-level stock scan lines.
 *
 * Captures (in order):
 *   1  timestamp       e.g. "2026-03-31 10:05:48"
 *   2  symbol          e.g. "ECILC"
 *   3  price           e.g. "107.0"
 *   4  change (opt.)   e.g. "+0.70" or "-1.90"  (absent on first scan)
 *   5  action          e.g. "WAIT" or "BUY"
 *   6  signal          e.g. "NEUTRAL" or "BUY"
 *   7  vol ratio       e.g. "1.0"
 *   8  support dist    e.g. "7.00"
 *   9  resistance dist e.g. "8.00"
 *
 * Works for both warmup lines (⏳warmup N/5) and post-warmup lines.
 */
const LOG_LINE_RE = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) \[INFO\] ([A-Z]+): ([\d.]+) TRY(?: \(([+-][\d.]+)\))? → (\w+) \((\w+)\) \| vol ([\d.]+)x.*\| sup\+([\d.]+) res-([\d.]+)/;

/**
 * Parses a BIST Signal Bot log file.
 *
 * @param  {string} text  Raw log file contents.
 * @returns {{ data: Object, events: Array }}
 *   data   — keyed by symbol; each value is an array of scan entries.
 *   events — flat chronological array of all scan entries (with sym field).
 */
function parseLog(text) {
  const lines  = text.split('\n');
  const data   = {};   // { [symbol]: entry[] }
  const events = [];   // flat list of all entries

  for (const line of lines) {
    const m = line.match(LOG_LINE_RE);
    if (!m) continue;

    const [, ts, sym, price, chg, action, signal, vol, sup, res] = m;

    const entry = {
      /** "HH:MM" used as chart X-axis label */
      time:   ts.slice(11, 16),
      /** Full ISO-ish timestamp */
      ts,
      price:  parseFloat(price),
      /** Price change vs previous scan, or null if not present */
      chg:    chg != null ? parseFloat(chg) : null,
      action,
      signal,
      vol:    parseFloat(vol),
      /** Distance above support level (positive = above support) */
      sup:    parseFloat(sup),
      /** Distance below resistance level (positive = below resistance) */
      res:    parseFloat(res),
    };

    if (!data[sym]) data[sym] = [];
    data[sym].push(entry);
    events.push({ sym, ...entry });
  }

  return { data, events };
}
