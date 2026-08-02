/**
 * Shared number/currency formatting helpers for the calculator tools.
 */

const LOCALE = 'es-VE';

/** Format a number with a fixed amount of decimals using the app locale. */
export function formatDecimal(value, digits = 2) {
  return Number(value || 0).toLocaleString(LOCALE, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Format an amount prefixed with the symbol of the given currency ('VES' | 'USD'). */
export function formatMoney(amount, currency = 'USD') {
  const symbol = currency === 'VES' ? 'Bs.' : '$';
  return `${symbol} ${formatDecimal(amount)}`;
}
