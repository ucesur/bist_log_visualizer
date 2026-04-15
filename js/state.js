/**
 * state.js — Centralised mutable state shared between modules.
 */
const State = {
  fileHandle:     null,
  watchTimer:     null,
  countdownTimer: null,
  watchInterval:  10,
  isPaused:       false,
  lastEventCount: 0,
  cdTick:         0,
  chartInstances: [],
};
