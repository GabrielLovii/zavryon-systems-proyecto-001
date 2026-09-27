import { lookup } from 'node:dns/promises';
import { NextResponse } from 'next/server';
import { createWorker } from 'tesseract.js';
import { assertSafeUrl, isBlockedAddress, SOURCE_LIMITS } from '@/lib/source-validation';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** Magic-byte sniffing for the image formats OCR can read; content-type headers are not trusted alone. */
const IMAGE_SIGNATURES: [string, number[]][] = [
  ['image/jpeg', [0xff, 0xd8, 0xff]],
  ['image/png', [0x89, 0x50, 0x4e, 0x47]],
  ['image/gif', [0x47, 0x49, 0x46, 0x38]],
];
function sniffImage(bytes: Uint8Array): string | null {
  const byMagic = IMAGE_SIGNATURES.find(([, magic]) => magic.every((byte, index) => bytes[index] === byte));
  if (byMagic) return byMagic[0];
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp';
  return null;
}

async function readLimited(response: Response) { const declared = Number(response.headers.get('content-length') || 0); if (declared > SOURCE_LIMITS.maxImageBytes) throw new Error('La imagen supera el máximo de 8 MB'); if (!response.body) return new Uint8Array(); const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let total = 0; while (true) { const result = await reader.read(); if (result.done) break; total += result.value.byteLength; if (total > SOURCE_LIMITS.maxImageBytes) { await reader.cancel(); throw new Error('La imagen supera el máximo de 8 MB'); } chunks.push(result.value); } const bytes = new Uint8Array(total); let offset = 0; chunks.forEach((chunk) => { bytes.set(chunk, offset); offset += chunk.byteLength; }); return bytes; }
async function assertResolvedPublicUrl(url: URL) {
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (isBlockedAddress(host)) throw new Error('La URL apunta a una dirección reservada o privada y fue bloqueada');
  if (/^[\d.]+$/.test(host) || host.includes(':')) return;
  const addresses = await lookup(host, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isBlockedAddress(address))) throw new Error('El dominio resuelve a una red privada, reservada o no pudo resolverse de forma segura');
}

/** One worker per warm serverless instance: spawning it and loading the Spanish model is the slow part. */
let worker: ReturnType<typeof createWorker> | null = null;
function getWorker() { worker ??= createWorker('spa', undefined, { cachePath: '/tmp' }); return worker; }

export async function POST(request: Request) {
  try {
    const body = await request.json() as { url?: string };
    let url = assertSafeUrl(body.url);
    let response: Response | undefined;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await assertResolvedPublicUrl(url);
      response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(SOURCE_LIMITS.timeoutMs), headers: { accept: 'image/*', 'user-agent': 'Mozilla/5.0 (compatible; ZavryonCatalogReader/2.0)' } });
      if (![301, 302, 303, 307, 308].includes(response.status)) break;
      const location = response.headers.get('location');
      if (!location) throw new Error('Redirección sin destino');
      url = assertSafeUrl(new URL(location, url).toString());
    }
    if (!response?.ok) throw new Error(`El sitio respondió con HTTP ${response?.status || 'desconocido'}`);
    const bytes = await readLimited(response);
    const mime = sniffImage(bytes);
    if (!mime) throw new Error('El recurso no es una imagen reconocida (jpg, png, gif o webp)');
    const instance = await getWorker();
    const { data } = await instance.recognize(Buffer.from(bytes));
    return NextResponse.json({ text: data.text || '' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo leer la imagen';
    return NextResponse.json({ error: message, recoverable: true }, { status: 400 });
  }
}
