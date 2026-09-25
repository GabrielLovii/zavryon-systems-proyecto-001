/**
 * DOM-free helpers that turn catalog text (PDF lines, table rows, JSON records) into product fields.
 * Kept pure so they can be unit-tested in Node.
 */

export type ParsedPrice = { value: number; currency: string; raw: string };
export type ColumnRole = 'name' | 'sku' | 'price' | 'brand' | 'unit' | 'category' | 'stock';
export type ParsedProduct = { name: string; sku: string; price: ParsedPrice | null; brand: string; unit: string; category: string };

/** Parses "1.234,56", "1,234.56", "1234.5", "2.400" (thousands) and "12,5" into a number; NaN if not numeric. */
export function parseNumber(raw: string) {
  const clean = raw.replace(/[^\d.,-]/g, '');
  if (!/\d/.test(clean)) return Number.NaN;
  const lastComma = clean.lastIndexOf(',');
  const lastDot = clean.lastIndexOf('.');
  if (lastComma >= 0 && lastDot >= 0) return Number(lastComma > lastDot ? clean.replace(/\./g, '').replace(',', '.') : clean.replace(/,/g, ''));
  if (lastComma >= 0) {
    const parts = clean.split(',');
    // Several commas or exactly 3 digits after one ("1,234") mean thousands; otherwise the comma is the decimal mark ("12,5").
    if (parts.length > 2 || parts[1].length === 3) return Number(parts.join(''));
    return Number(parts.join('.'));
  }
  const parts = clean.split('.');
  if (parts.length > 2) return Number(parts.join(''));
  if (parts.length === 2 && parts[1].length === 3) return Number(parts.join(''));
  return Number(clean);
}

const CURRENCY_PRICE = /(?:(ARS|USD|U\$S|US\$|EUR|\$)\s*([\d][\d.,]*))|([\d][\d.,]*)\s*(ARS|USD|EUR)\b/i;
const TRAILING_PRICE = /(?:^|\s)(\d{1,3}(?:[.\s]\d{3})+(?:,\d{1,2})?|\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+[.,]\d{2})\s*$/;

/** Finds a price: first one marked with a currency, otherwise a price-looking number at the end of the text. */
export function findPrice(text: string): ParsedPrice | null {
  const marked = CURRENCY_PRICE.exec(text);
  if (marked) {
    const symbol = (marked[1] || marked[4] || '').toUpperCase();
    const value = parseNumber(marked[2] || marked[3]);
    if (Number.isFinite(value) && value > 0) return { value, currency: /USD|U\$S|US\$/.test(symbol) ? 'USD' : symbol === 'EUR' ? 'EUR' : 'ARS', raw: marked[0].trim() };
  }
  const trailing = TRAILING_PRICE.exec(text);
  if (trailing) {
    const value = parseNumber(trailing[1].replace(/\s/g, '.'));
    if (Number.isFinite(value) && value > 0) return { value, currency: 'ARS', raw: trailing[1].trim() };
  }
  return null;
}

/** Product/supplier codes: letter codes (LAC-001, AB1234), EAN-8/13 barcodes, or a numeric code leading the line. */
export function findSku(text: string, leading = true) {
  const coded = /\b(?=[A-Z0-9-]*\d)[A-Z]{1,5}[-_./]?\d[A-Z0-9-]{1,14}\b|\b[A-Z]{2,}[-_][A-Z0-9-]{2,}\b/.exec(text);
  if (coded) return coded[0];
  const ean = /\b\d{13}\b|\b\d{8}\b/.exec(text);
  if (ean) return ean[0];
  if (leading) { const code = /^\s*(\d{3,7})\s+(?=\D)/.exec(text); if (code) return code[1]; }
  return '';
}

/** Presentation/unit such as "1 kg", "500 g", "2,25 L", "x 12", "pack x 6". */
export function findUnit(text: string) {
  const match = /\b(?:(?:pack|caja|bolsa|bulto|display|fardo)\s*)?x\s?\d+(?:\s?(?:u|un|unid|unidades))?\b|\b\d+(?:[.,]\d+)?\s?(?:kg|kgs|g|gr|grs|l|lt|lts|ml|cc|cm|mts?|u|un|unid)\b/i.exec(text);
  return match ? match[0].replace(/\s+/g, ' ').trim() : '';
}

const HEADER_PATTERNS: [ColumnRole, RegExp][] = [
  ['sku', /^(c[oó]d(igo)?\.?|cod\.?|sku|art(\.|[ií]culo)?|ref(\.|erencia)?|ean|c[oó]digo de barras|id|item)$/i],
  ['price', /(precio|p\.?\s?unit|pvp|importe|valor|costo|lista|\$|price)/i],
  ['name', /(producto|descripci[oó]n|detalle|nombre|art[ií]culo|product|description|name|item)/i],
  ['brand', /^(marca|brand|fabricante)$/i],
  ['unit', /(unidad|presentaci[oó]n|u\.?\s?m\.?|contenido|medida|pack|bulto|unit)/i],
  ['category', /(categor[ií]a|rubro|familia|secci[oó]n|l[ií]nea|category)/i],
  ['stock', /^(stock|disponible|existencia|cantidad|cant\.?)$/i],
];

/** Maps header cells to column roles; returns null unless it looks like a real header (a name column plus another known column). */
export function headerRoles(cells: string[]): (ColumnRole | null)[] | null {
  const used = new Set<ColumnRole>();
  const roles = cells.map((cell) => {
    const text = cell.trim();
    if (!text || text.length > 40 || /\d{3,}/.test(text)) return null;
    const role = HEADER_PATTERNS.find(([candidate, pattern]) => !used.has(candidate) && pattern.test(text))?.[0] || null;
    if (role) used.add(role);
    return role;
  });
  return used.has('name') && used.size >= 2 ? roles : null;
}

/** Lines that mention prices but are not products (totals, conditions, contact data, pagination). */
const NOISE_START = /^(total|subtotal|iva|p[aá]gina|page|tel[eé]fono|tel\.|cel\.|whatsapp|cuit|fecha|vigencia|emitido|lista de precios)\b/i;
const NOISE_ANYWHERE = /\b(pedido m[ií]nimo|compra m[ií]nima|m[ií]nimo de compra|sin iva|con iva|iva incluido|precios? sujetos?|env[ií]o gratis|costo de env[ií]o|descuento del|v[aá]lido hasta|v[aá]lidos? hasta|total general|forma de pago)\b/i;

const cleanName = (value: string) => value.replace(/\.{3,}|_{3,}|-{3,}/g, ' ').replace(/\s{2,}/g, ' ').replace(/^[\s\-–•·*|]+|[\s\-–•·*|:]+$/g, '').trim();

/** Parses a row of cells, using header roles when known and heuristics otherwise. */
export function parseCells(cells: string[], roles?: (ColumnRole | null)[] | null): ParsedProduct | null {
  const values = cells.map((cell) => cell.replace(/\s+/g, ' ').trim());
  if (!values.some(Boolean)) return null;
  if (roles) {
    const get = (role: ColumnRole) => values[roles.indexOf(role)] || '';
    const name = cleanName(get('name'));
    if (!name || !/[a-záéíóúñ]/i.test(name)) return null;
    const priceCell = get('price');
    const priceValue = priceCell ? parseNumber(priceCell) : Number.NaN;
    const price = priceCell ? (findPrice(priceCell) || (Number.isFinite(priceValue) && priceValue > 0 ? { value: priceValue, currency: 'ARS', raw: priceCell } : null)) : findPrice(values.join(' '));
    return { name, sku: get('sku') || findSku(name, false), price, brand: get('brand'), unit: get('unit') || findUnit(name), category: get('category') };
  }
  // Without headers: the longest text cell is the name, a code-looking cell the SKU, the last price-looking cell the price.
  const textCells = values.filter((cell) => /[a-záéíóúñ]{3,}/i.test(cell));
  if (!textCells.length) return null;
  const name = cleanName(textCells.reduce((longest, cell) => cell.length > longest.length ? cell : longest, ''));
  const priceCell = [...values].reverse().find((cell) => cell !== name && findPrice(cell));
  const skuCell = values.find((cell) => cell !== name && /^[A-Z0-9][A-Z0-9-_.]{2,20}$/i.test(cell) && /\d/.test(cell) && !findPrice(cell)?.raw.includes(','));
  return { name, sku: skuCell || findSku(name, false), price: priceCell ? findPrice(priceCell) : null, brand: '', unit: findUnit(name), category: '' };
}

/** Parses one line of catalog text ("LAC-001 Leche entera 1L ....... $ 2.400,00"); null when it doesn't look like a product. */
export function parseLine(line: string): ParsedProduct | null {
  const text = line.replace(/\s+/g, ' ').trim();
  if (text.length < 3 || text.length > 300 || !/[a-záéíóúñ]{3,}/i.test(text)) return null;
  const price = findPrice(text);
  const sku = findSku(text);
  if (!price && !sku) return null;
  let name = text;
  if (price) name = name.replace(price.raw, ' ');
  if (sku) name = name.replace(sku, ' ');
  name = cleanName(name.replace(/\$\s*$/, ''));
  if (!name || !/[a-záéíóúñ]{3,}/i.test(name) || NOISE_START.test(name) || NOISE_ANYWHERE.test(name)) return null;
  return { name, sku, price, brand: '', unit: findUnit(name), category: '' };
}

/** Splits a text line into columns when it was laid out as a table (tabs or wide gaps). */
export const splitColumns = (line: string) => line.split(/\t| {3,}/).map((cell) => cell.trim()).filter(Boolean);

const JSON_KEYS: Record<Exclude<ColumnRole, 'stock'>, string[]> = {
  name: ['name', 'nombre', 'title', 'titulo', 'título', 'descripcion', 'descripción', 'description', 'producto', 'product'],
  sku: ['sku', 'codigo', 'código', 'code', 'cod', 'ean', 'barcode', 'mpn', 'ref', 'referencia'],
  price: ['price', 'precio', 'pvp', 'importe', 'valor', 'unit_price', 'precio_unitario', 'final_price', 'amount'],
  brand: ['brand', 'marca'],
  unit: ['unit', 'unidad', 'presentacion', 'presentación', 'package'],
  category: ['category', 'categoria', 'categoría', 'rubro'],
};
const pick = (record: Record<string, unknown>, role: keyof typeof JSON_KEYS) => {
  const key = Object.keys(record).find((item) => JSON_KEYS[role].includes(item.toLowerCase()));
  const value = key ? record[key] : undefined;
  if (value && typeof value === 'object' && !Array.isArray(value) && 'name' in value) return String((value as { name: unknown }).name ?? '');
  return value === undefined || value === null || typeof value === 'object' ? '' : String(value);
};

/** Walks any JSON (API responses, exported catalogs) and returns records that look like products. */
export function productsFromJson(value: unknown, limit = 100): { product: ParsedProduct; record: Record<string, unknown> }[] {
  const found: { product: ParsedProduct; record: Record<string, unknown> }[] = [];
  const visit = (node: unknown, depth: number) => {
    if (found.length >= limit || depth > 8 || !node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach((item) => visit(item, depth + 1)); return; }
    const record = node as Record<string, unknown>;
    const name = cleanName(pick(record, 'name'));
    const priceRaw = pick(record, 'price');
    if (name && /[a-záéíóúñ]{2,}/i.test(name) && (priceRaw || pick(record, 'sku'))) {
      const numeric = priceRaw ? parseNumber(priceRaw) : Number.NaN;
      found.push({ record, product: { name, sku: pick(record, 'sku'), price: Number.isFinite(numeric) && numeric > 0 ? { value: numeric, currency: String(record.currency || record.moneda || 'ARS').toUpperCase().slice(0, 3), raw: priceRaw } : null, brand: pick(record, 'brand'), unit: pick(record, 'unit') || findUnit(name), category: pick(record, 'category') } });
      return;
    }
    Object.values(record).forEach((child) => visit(child, depth + 1));
  };
  visit(value, 0);
  return found;
}

/** Converts CSV (comma, semicolon or tab separated, with quotes) into tab-separated lines for the text extractor. */
export function csvToText(csv: string) {
  const firstLine = csv.split(/\r?\n/, 1)[0] || '';
  const delimiter = [';', '\t', ','].reduce((best, candidate) => firstLine.split(candidate).length > firstLine.split(best).length ? candidate : best, ',');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    if (quoted) {
      if (char === '"' && csv[index + 1] === '"') { cell += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === delimiter) { row.push(cell); cell = ''; }
    else if (char === '\n' || char === '\r') { if (char === '\r' && csv[index + 1] === '\n') index += 1; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.map((cells) => cells.map((value) => value.replace(/[\t\r\n]+/g, ' ').trim() || '-').join('\t')).join('\n');
}
