import type { Evidence, ExtractionResult, FieldResult, SourceCandidate, SourceCandidateFields } from './mock-data';
import { dedupeCandidates, normalizeSourceCandidate, SOURCE_LIMITS } from './source-validation';
import { headerRoles, parseCells, parseLine, parseNumber, productsFromJson, splitColumns, type ColumnRole, type ParsedPrice, type ParsedProduct } from './catalog-parse';

export const EXTRACTOR_VERSION = 'sources-2.0';

/** How much each kind of signal is trusted; anything below 0.7 is flagged for review field by field. */
const CONFIDENCE = { structured: 0.9, table: 0.8, json: 0.8, text: 0.6 } as const;
type Signal = keyof typeof CONFIDENCE;

const evidence = (label: string, excerpt: string, source: string, locator?: string): Evidence => ({ label, excerpt: excerpt.slice(0, 300), source, locator });
const field = <T>(value: T, ev: Evidence[], provenance: string, confidence: number): FieldResult<T> => ({ value, evidence: ev, provenance, confidence, needsReview: confidence < 0.7 || !ev.length });

function makeCandidate(id: string, product: ParsedProduct, ev: Evidence, signal: Signal, imageUrl = '', availability = ''): SourceCandidate {
  const confidence = CONFIDENCE[signal];
  const provenance = signal === 'structured' ? 'Datos estructurados del sitio' : signal === 'table' ? 'Tabla del documento' : signal === 'json' ? 'Respuesta JSON' : 'Línea de texto del documento';
  const fields: Partial<SourceCandidateFields> = {
    name: field(product.name, [ev], provenance, confidence),
    ...(product.sku ? { sku: field(product.sku, [ev], provenance, confidence) } : {}),
    ...(product.price ? { price: field(product.price.value, [ev], provenance, confidence), currency: field(product.price.currency, [ev], provenance, confidence) } : {}),
    ...(product.brand ? { brand: field(product.brand, [ev], provenance, confidence) } : {}),
    ...(product.unit ? { unit: field(product.unit, [ev], provenance, confidence) } : {}),
    ...(product.category ? { category: field(product.category, [ev], provenance, confidence) } : {}),
    ...(imageUrl ? { image: field(imageUrl, [ev], provenance, confidence) } : {}),
  };
  const warnings = [!product.price && 'sin precio detectado', !product.sku && 'sin código'].filter(Boolean).join(', ');
  return normalizeSourceCandidate({ id, name: product.name, sku: product.sku, brand: product.brand, unit: product.unit, category: product.category, price: product.price?.value || 0, currency: product.price?.currency || 'ARS', availability, expiry: '', imageUrl, fields: fields as SourceCandidateFields, confidence, reviewState: 'pending', extractorVersion: EXTRACTOR_VERSION, status: 'Pendiente', notes: `Detectado en ${provenance.toLowerCase()}${warnings ? ` (${warnings})` : ''}; revisar antes de confirmar.` });
}

const finish = (candidates: SourceCandidate[], emptyWarning: string, extra: string[] = []): ExtractionResult => {
  const unique = dedupeCandidates(candidates).slice(0, SOURCE_LIMITS.maxCandidates);
  const withoutPrice = unique.filter((candidate) => !candidate.price).length;
  const warnings = [...extra, ...(unique.length ? [] : [emptyWarning]), ...(withoutPrice ? [`${withoutPrice} candidato(s) sin precio: completalo antes de aprobar.`] : []), ...(candidates.length > SOURCE_LIMITS.maxCandidates ? [`Se muestran los primeros ${SOURCE_LIMITS.maxCandidates} de ${candidates.length} productos.`] : [])];
  return { status: unique.length ? 'ok' : 'manual_review', candidates: unique, warnings, extractorVersion: EXTRACTOR_VERSION };
};

// ---------- Text (PDF text layer, plain text) ----------

/** Parses text line by line. Lines laid out as columns (tabs / wide gaps) use a detected header row when present. */
function textCandidates(text: string, sourceId: string, label: string): SourceCandidate[] {
  const candidates: SourceCandidate[] = [];
  let roles: (ColumnRole | null)[] | null = null;
  text.slice(0, SOURCE_LIMITS.maxText).split(/\r?\n/).forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) return;
    const cells = splitColumns(line);
    const header = cells.length >= 2 ? headerRoles(cells) : null;
    if (header) { roles = header; return; }
    const columns: (ColumnRole | null)[] | null = roles;
    const product = columns && cells.length >= 2 ? parseCells(cells, cells.length === columns.length ? columns : null) : null;
    const parsed = product && (product.price || product.sku) ? product : parseLine(line);
    if (parsed) candidates.push(makeCandidate(`${sourceId}-text-${index}`, parsed, evidence(label, line, label, `línea ${index + 1}`), columns && parsed === product ? 'table' : 'text'));
  });
  return candidates;
}

export function extractText(text: string, sourceId: string): ExtractionResult {
  return finish(textCandidates(text, sourceId, 'Texto del documento'), 'El documento tiene texto, pero no se reconocieron productos (nombre con precio o código). Cargalos manualmente.');
}

// ---------- JSON ----------

export function extractJson(input: string, sourceId: string): ExtractionResult {
  let data: unknown;
  try { data = JSON.parse(input.slice(0, SOURCE_LIMITS.maxText)); } catch { return finish([], 'La respuesta JSON no es válida o está incompleta.'); }
  const candidates = productsFromJson(data, SOURCE_LIMITS.maxCandidates * 2).map(({ product, record }, index) => makeCandidate(`${sourceId}-json-${index}`, product, evidence('JSON', JSON.stringify(record), 'Respuesta JSON', String(index)), 'json'));
  return finish(candidates, 'El JSON no contiene registros con nombre y precio o código.');
}

// ---------- HTML ----------

const asArray = <T>(value: T | T[] | undefined | null): T[] => value === undefined || value === null ? [] : Array.isArray(value) ? value : [value];
const typeOf = (item: Record<string, unknown>) => asArray(item['@type'] as string | string[]).join(' ');
const textOf = (value: unknown): string => typeof value === 'string' || typeof value === 'number' ? String(value).trim() : value && typeof value === 'object' && 'name' in value ? textOf((value as { name: unknown }).name) : '';
const imageOf = (value: unknown): string => { const first = asArray(value as unknown[])[0]; return typeof first === 'string' ? first : first && typeof first === 'object' && 'url' in first ? String((first as { url: unknown }).url) : ''; };

function offerPrice(offers: unknown): { price: ParsedPrice | null; availability: string } {
  const offer = asArray(offers as Record<string, unknown>[])[0];
  if (!offer || typeof offer !== 'object') return { price: null, availability: '' };
  const raw = offer.price ?? offer.lowPrice ?? (offer.priceSpecification as Record<string, unknown> | undefined)?.price;
  const value = typeof raw === 'number' ? raw : raw ? parseNumber(String(raw)) : Number.NaN;
  const availability = String(offer.availability || '').replace(/^https?:\/\/schema\.org\//, '');
  return { price: Number.isFinite(value) && value > 0 ? { value, currency: String(offer.priceCurrency || 'ARS').toUpperCase(), raw: String(raw) } : null, availability: availability === 'InStock' ? 'Disponible' : availability === 'OutOfStock' ? 'Sin stock' : availability };
}

/** Collects schema.org Product nodes from JSON-LD, including @graph, ItemList and ProductGroup variants. */
function jsonLdProducts(value: unknown, out: Record<string, unknown>[] = [], depth = 0) {
  if (!value || typeof value !== 'object' || depth > 6) return out;
  if (Array.isArray(value)) { value.forEach((item) => jsonLdProducts(item, out, depth + 1)); return out; }
  const item = value as Record<string, unknown>;
  const type = typeOf(item);
  if (/\bProduct\b/i.test(type) && item.name) out.push(item);
  if (/ProductGroup/i.test(type)) jsonLdProducts(item.hasVariant, out, depth + 1);
  jsonLdProducts(item['@graph'], out, depth + 1);
  asArray(item.itemListElement as unknown[]).forEach((element) => jsonLdProducts(element && typeof element === 'object' && 'item' in element ? (element as { item: unknown }).item : element, out, depth + 1));
  return out;
}

/** DOMParser documents are not rendered, so textContent glues blocks together; add line/column breaks first. */
function visibleText(doc: Document) {
  doc.querySelectorAll('script,style,noscript,nav,header,footer,svg,template').forEach((node) => node.remove());
  doc.querySelectorAll('td,th').forEach((node) => node.append('\t'));
  doc.querySelectorAll('br,p,div,li,tr,h1,h2,h3,h4,h5,h6,section,article,dt,dd').forEach((node) => node.append('\n'));
  const body = (() => { try { return doc.body; } catch { return null; } })(); // Some parsers throw when the document has no root left.
  const text = body?.textContent?.trim() ? body.textContent : doc.documentElement?.textContent || '';
  return text.split('\n').map((line) => line.replace(/[  ]+/g, ' ').trim()).filter(Boolean).join('\n');
}

/** Resolves image URLs against the page address; only http(s) images are kept. */
const absoluteImage = (src: string | null | undefined, baseUrl?: string) => { if (!src || src.startsWith('data:')) return ''; try { const url = new URL(src.trim(), baseUrl); return /^https?:$/.test(url.protocol) ? url.href : ''; } catch { return ''; } };

export function extractHtml(input: string, sourceId: string, baseUrl?: string): ExtractionResult {
  const doc = new DOMParser().parseFromString(input.slice(0, SOURCE_LIMITS.maxText * 5), 'text/html');
  const imageFrom = (node: Element | null) => absoluteImage(node?.getAttribute('data-src') || node?.getAttribute('data-lazy') || node?.getAttribute('src') || node?.getAttribute('srcset')?.split(/[\s,]+/)[0], baseUrl);
  const candidates: SourceCandidate[] = [];

  // 1. JSON-LD (Tiendanube, WooCommerce, Shopify, VTEX and MercadoShops publish it).
  doc.querySelectorAll('script[type="application/ld+json"]').forEach((script, index) => {
    try {
      jsonLdProducts(JSON.parse(script.textContent || '')).forEach((item, productIndex) => {
        const { price, availability } = offerPrice(item.offers);
        const product: ParsedProduct = { name: textOf(item.name), sku: textOf(item.sku) || textOf(item.gtin13) || textOf(item.gtin) || textOf(item.mpn), price, brand: textOf(item.brand), unit: textOf(item.size) || textOf(item.weight), category: textOf(item.category).split('>').pop()?.trim() || '' };
        if (product.name) candidates.push(makeCandidate(`${sourceId}-jsonld-${index}-${productIndex}`, product, evidence('JSON-LD', JSON.stringify(item), 'script[type="application/ld+json"]', `${index}:${productIndex}`), 'structured', absoluteImage(imageOf(item.image), baseUrl), availability));
      });
    } catch { /* Malformed JSON-LD: continue with the other signals. */ }
  });

  // 2. Microdata (itemtype=schema.org/Product).
  if (!candidates.length) Array.from(doc.querySelectorAll('[itemtype]')).filter((node) => /schema\.org\/Product\b/i.test(node.getAttribute('itemtype') || '')).forEach((node, index) => {
    const prop = (name: string) => { const element = node.querySelector(`[itemprop="${name}"]`); return (element?.getAttribute('content') || element?.textContent || '').replace(/\s+/g, ' ').trim(); };
    const priceText = prop('price');
    const value = priceText ? parseNumber(priceText) : Number.NaN;
    const product: ParsedProduct = { name: prop('name'), sku: prop('sku') || prop('gtin13'), price: Number.isFinite(value) && value > 0 ? { value, currency: prop('priceCurrency') || 'ARS', raw: priceText } : null, brand: prop('brand'), unit: '', category: prop('category') };
    if (product.name) candidates.push(makeCandidate(`${sourceId}-micro-${index}`, product, evidence('Microdatos', node.textContent?.replace(/\s+/g, ' ').trim() || product.name, '[itemtype=Product]', String(index)), 'structured', imageFrom(node.querySelector('[itemprop="image"]') || node.querySelector('img'))));
  });

  // 3. Visible tables, mapping columns by their header.
  const skippedTables: Element[] = [];
  doc.querySelectorAll('table').forEach((table, tableIndex) => {
    let roles: (ColumnRole | null)[] | null = null;
    Array.from(table.querySelectorAll('tr')).forEach((row, rowIndex) => {
      const cells = Array.from(row.querySelectorAll('th,td')).map((cell) => cell.textContent?.replace(/\s+/g, ' ').trim() || '');
      const header = headerRoles(cells);
      if (header) { roles = header; return; }
      // A table whose header row doesn't describe products (orders, schedules…) is skipped entirely.
      const isHeaderRow = row.querySelectorAll('td').length === 0 && row.querySelectorAll('th').length > 1;
      if (isHeaderRow && !roles) { roles = []; skippedTables.push(table); return; }
      if (roles && !roles.length) return;
      const columns: (ColumnRole | null)[] | null = roles;
      const product = parseCells(cells, columns && cells.length === columns.length ? columns : null);
      if (product && (product.price || product.sku)) candidates.push(makeCandidate(`${sourceId}-table-${tableIndex}-${rowIndex}`, product, evidence('Tabla visible', cells.join(' | '), 'HTML table', `${tableIndex}:${rowIndex}`), 'table', imageFrom(row.querySelector('img'))));
    });
  });

  // 4. Fallback: visible text line by line (price lists published as plain pages).
  const extra: string[] = [];
  const looksLikeApp = Boolean(doc.querySelector('#root,#__next,#app,[data-reactroot]'));
  if (!candidates.length) {
    skippedTables.forEach((table) => table.remove());
    candidates.push(...textCandidates(visibleText(doc), sourceId, 'Texto visible'));
    if (candidates.length) extra.push('No había datos estructurados: se leyó el texto visible de la página, revisá cada candidato.');
  }
  if (!candidates.length && looksLikeApp) extra.push('La página carga los productos con JavaScript y no se pueden leer desde el servidor; probá con la lista de precios en PDF, un CSV/JSON exportado o cargalos manualmente.');
  return finish(candidates, 'No se encontraron productos en la página. Probá con la URL de una categoría o de la lista de precios, o cargalos manualmente.', extra);
}
