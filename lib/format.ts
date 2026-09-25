const moneyFormatter = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 });

/** Formats an amount as Argentine pesos, e.g. `$ 12.345,5`. Non-finite values render as `$ 0`. */
export const money = (value: number) => `$ ${moneyFormatter.format(Number.isFinite(value) ? value : 0)}`;

/** Parses a numeric input value, clamping to `min` and falling back to it when empty or invalid. */
export const toNumber = (value: string | number, min = 0) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(min, parsed) : min;
};

/**
 * Reads a number typed the Argentine way: "1.500" is one thousand five hundred, "12,50" and "1.234,5" use a
 * decimal comma. A lone dot followed by 1–2 digits ("12.5") is still read as a decimal point. Returns NaN
 * for empty or invalid text. Unlike catalog-parse's parseNumber (which guesses the format of supplier lists),
 * a comma typed by the user is always the decimal mark: "1,500" is 1.5.
 */
export function parseLocaleNumber(text: string) {
  const value = text.trim().replace(/\s|\$/g, '');
  if (!value || !/^-?[\d.,]+$/.test(value)) return Number.NaN;
  if (value.includes(',')) return Number(value.replace(/\./g, '').replace(',', '.'));
  if (/^-?\d{1,3}(\.\d{3})+$/.test(value)) return Number(value.replace(/\./g, ''));
  return Number(value);
}

/**
 * Returns the next id for a `PREFIX-NNNN` sequence based on the highest existing number,
 * so deleting records never produces a duplicate id.
 */
export function nextSequentialId(prefix: string, ids: string[], start = 1, pad = 3) {
  const pattern = new RegExp(`^${prefix}-(\\d+)$`);
  const highest = ids.reduce((max, id) => {
    const match = pattern.exec(id);
    return match ? Math.max(max, Number(match[1])) : max;
  }, start - 1);
  return `${prefix}-${String(highest + 1).padStart(pad, '0')}`;
}

/**
 * CSV for Excel set to Spanish (Argentina): semicolon between columns and decimal comma in numbers, so a
 * double click opens it in columns and 12015,5 is read as a number. No thousands separator on purpose.
 */
export function toCsv(header: string[], rows: (string | number)[][]) {
  const cell = (value: string | number) => typeof value === 'number' ? (Number.isFinite(value) ? String(value).replace('.', ',') : '') : `"${String(value).replaceAll('"', '""')}"`;
  return [header.map(cell).join(';'), ...rows.map((row) => row.map(cell).join(';'))].join('\r\n');
}

/** Builds a CSV (with UTF-8 BOM so Excel keeps accents) and triggers a download. */
export function downloadCsv(fileName: string, header: string[], rows: (string | number)[][]) {
  const csv = toCsv(header, rows);
  const url = URL.createObjectURL(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Downloads any value as a pretty-printed JSON file (used for backups). */
export function downloadJson(fileName: string, value: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
