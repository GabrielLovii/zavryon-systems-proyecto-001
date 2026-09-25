import { SOURCE_LIMITS } from './source-validation';
import { extractText } from './source-extraction';

type PositionedText = { str: string; x: number; y: number; width: number; height: number };

/**
 * Rebuilds visual lines from pdf.js text items: items sharing a baseline form one line (left to right),
 * and wide horizontal gaps become tabs so table-like catalogs keep their columns.
 */
export function layoutLines(items: PositionedText[]) {
  const rows: { y: number; height: number; items: PositionedText[] }[] = [];
  items.filter((item) => item.str.trim()).sort((a, b) => b.y - a.y || a.x - b.x).forEach((item) => {
    const tolerance = Math.max(2, (item.height || 10) * 0.45);
    const row = rows.find((candidate) => Math.abs(candidate.y - item.y) <= tolerance);
    if (row) row.items.push(item); else rows.push({ y: item.y, height: item.height, items: [item] });
  });
  return rows.map((row) => {
    const sorted = row.items.sort((a, b) => a.x - b.x);
    return sorted.reduce((line, item, index) => {
      if (!index) return item.str;
      const previous = sorted[index - 1];
      const gap = item.x - (previous.x + previous.width);
      const charWidth = previous.width / Math.max(1, previous.str.length) || 4;
      return `${line}${gap > charWidth * 3 ? '\t' : gap > charWidth * 0.25 ? ' ' : ''}${item.str}`;
    }, '').trim();
  });
}

export async function extractPdf(file: File | Uint8Array, sourceId: string) {
  const bytes = file instanceof Uint8Array ? file : new Uint8Array(await file.arrayBuffer());
  if (bytes.length > SOURCE_LIMITS.maxBytes) throw new Error('El PDF supera el máximo de 5 MB');
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  const pdf = await pdfjs.getDocument({ data: bytes }).promise;
  if (pdf.numPages > SOURCE_LIMITS.maxPages) throw new Error(`El PDF supera el máximo de ${SOURCE_LIMITS.maxPages} páginas`);
  let text = '';
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const items = content.items.flatMap((item) => 'str' in item ? [{ str: item.str, x: item.transform[4], y: item.transform[5], width: item.width, height: item.height || Math.abs(item.transform[3]) }] : []);
    text += `${layoutLines(items).join('\n')}\n`;
    if (text.length > SOURCE_LIMITS.maxText) throw new Error('El texto del PDF supera el límite seguro de lectura');
  }
  if (!text.trim()) return { status: 'manual_review' as const, candidates: [], warnings: ['Este PDF no contiene una capa de texto utilizable (parece escaneado). No se usa OCR: pedile al proveedor la lista en PDF digital, Excel/CSV o cargá los datos manualmente.'], extractorVersion: 'sources-2.0' };
  const result = extractText(text, sourceId);
  return { ...result, warnings: [...result.warnings, 'Las imágenes de un PDF no se extraen automáticamente: agregalas desde la URL del producto si hace falta.'] };
}
