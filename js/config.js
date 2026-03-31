/**
 * config.js
 * Shared constants used across all modules.
 */

/** Maps stock symbol → chart colour */
const SYM_COLOR = {
  ECILC: '#00d4aa',
  KCAER: '#f0a500',
  TTRAK: '#a78bfa',
};

/** Maps stock symbol → CSS class for colouring table cells */
const SYM_CLASS = {
  ECILC: 'sym-ecilc',
  KCAER: 'sym-kcaer',
  TTRAK: 'sym-ttrak',
};

/**
 * Full circumference of the countdown SVG arc.
 * Calculated as 2π × r where r = 9px.
 */
const ARC_LEN = 56.5;
