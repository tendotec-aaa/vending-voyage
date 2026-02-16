/**
 * Shared number formatting utilities using en-US locale.
 * - fmt2: currency/totals with 2 decimal places (e.g., 14,020.20)
 * - fmt3: unit costs with 3 decimal places (e.g., 0.135)
 * - fmtInt: integers with thousands separators (e.g., 1,234)
 * - fmtPct: percentage with 1 decimal (e.g., 12.5)
 * - fmtPct0: percentage with 0 decimals (e.g., 85)
 */

const locale = "en-US";

export const fmt2 = (n: number): string =>
  n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmt3 = (n: number): string =>
  n.toLocaleString(locale, { minimumFractionDigits: 3, maximumFractionDigits: 3 });

export const fmtInt = (n: number): string =>
  n.toLocaleString(locale);

export const fmtPct = (n: number): string =>
  n.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const fmtPct0 = (n: number): string =>
  n.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
