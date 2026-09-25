const moneyFormatter = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 });

/** Formats an amount as Argentine pesos, e.g. `$ 12.345,5`. Non-finite values render as `$ 0`. */
export const money = (value: number) => `$ ${moneyFormatter.format(Number.isFinite(value) ? value : 0)}`;

/** Parses a numeric input value, clamping to `min` and falling back to it when empty or invalid. */
export const toNumber = (value: string | number, min = 0) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(min, parsed) : min;
};

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

/** Builds a CSV (with UTF-8 BOM so Excel keeps accents) and triggers a download. */
export function downloadCsv(fileName: string, header: string[], rows: (string | number)[][]) {
  const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
  const csv = [header.map(escape).join(','), ...rows.map((row) => row.map(escape).join(','))].join('\r\n');
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
