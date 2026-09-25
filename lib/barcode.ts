import type { Product } from './mock-data';

/**
 * Barcode helpers. USB, USB-C and Bluetooth scanners work as keyboards (HID): they "type" the code very fast and
 * finish with Enter, so no drivers are needed — we only have to tell a scan apart from a person typing.
 */

export const normalizeBarcode = (raw: string) => raw.replace(/[\s\u0000-\u001f]/g, '').trim();

/** GS1 check digit validation for EAN-8, UPC-A (12), EAN-13 and GTIN-14. Other formats return null (unknown). */
export function isValidGtin(code: string): boolean | null {
  if (!/^\d+$/.test(code) || ![8, 12, 13, 14].includes(code.length)) return null;
  const digits = code.split('').map(Number);
  const check = digits.pop()!;
  const sum = digits.reverse().reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

export const findByBarcode = (products: Product[], code: string) => { const clean = normalizeBarcode(code); return clean ? products.find((product) => normalizeBarcode(product.barcode || '') === clean) : undefined; };

/** Sale price from cost and margin (%), rounded up to `step` (e.g. 10 → $ 1.234 becomes $ 1.240). */
export function salePrice(cost: number, marginPercent: number, step = 10) {
  if (!(cost > 0)) return 0;
  const raw = cost * (1 + Math.max(0, marginPercent) / 100);
  return step > 0 ? Math.ceil(raw / step) * step : Math.round(raw * 100) / 100;
}

/**
 * Detects scanner input from keydown events: printable keys arriving faster than `maxGapMs` apart and
 * finishing with Enter (or Tab), with at least `minLength` characters. People type far slower (~100–300 ms per key).
 */
export function createScanDetector({ onScan, minLength = 4, maxGapMs = 45 }: { onScan: (code: string) => void; minLength?: number; maxGapMs?: number }) {
  let buffer = '';
  let last = 0;
  return (event: { key: string; timeStamp: number; preventDefault?: () => void }) => {
    const gap = event.timeStamp - last;
    last = event.timeStamp;
    if (event.key === 'Enter' || event.key === 'Tab') {
      const code = buffer;
      buffer = '';
      if (code.length >= minLength && gap <= maxGapMs * 4) { event.preventDefault?.(); onScan(code); return true; }
      return false;
    }
    if (event.key.length !== 1) return false;
    buffer = gap <= maxGapMs ? buffer + event.key : event.key;
    return false;
  };
}
