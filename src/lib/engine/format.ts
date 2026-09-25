/**
 * Number formatting shared by the engine's summaries and the page.
 */

const COUNT_FORMAT = new Intl.NumberFormat("en-US");

/**
 * Format a count with a fixed locale. `toLocaleString()` follows the machine's
 * locale, so a server set to en-IN writes "2,00,000" while the browser writes
 * "200,000" — and React discards the page when the two disagree.
 */
export function formatCount(n: number): string {
  return COUNT_FORMAT.format(n);
}
