/**
 * state.js
 * Centralised mutable state shared between watcher.js and renderer.js.
 * All modules read and write through this object so there are no implicit globals.
 */

const State = {
  /** FileSystemFileHandle when live-watching a file; null otherwise. */
  fileHandle: null,

  /** setInterval handle for the file-poll loop. */
  watchTimer: null,

  /** setInterval handle for the countdown-ring tick. */
  countdownTimer: null,

  /** Current polling interval in seconds. */
  watchInterval: 10,

  /** Whether polling is suspended by the user. */
  isPaused: false,

  /**
   * Number of parsed events the last time the file was rendered.
   * Used to detect whether the file has grown since the previous poll.
   */
  lastEventCount: 0,

  /** Current countdown tick value (counts down from watchInterval to 0). */
  cdTick: 0,

  /** Chart.js instances currently rendered on the dashboard. */
  chartInstances: [],
};
