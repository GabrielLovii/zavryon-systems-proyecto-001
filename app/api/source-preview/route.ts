import { NextResponse } from 'next/server';

const MAX_BYTES = 5 * 1024 * 1024;

function publicHttpUrl(value: unknown): URL {
  if (typeof value !== 'string') throw new Error('URL ausente');
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Solo se permiten URLs http:// o https://');
  const host = url.hostname.toLowerCase();
  const privateHost = host === 'localhost' || host.endsWith('.localhost') || host === '::1' || host === '0.0.0.0' || host === '[::1]' || /^(10|127)\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) || host.endsWith('.local') || host.endsWith('.internal');
  if (privateHost) throw new Error('La URL apunta a localhost o una red privada y fue bloqueada');
  if (host.includes(':') && (host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80'))) throw new Error('La URL apunta a una IP privada y fue bloqueada');
  return url;
}

async function readLimited(response: Response) {
  const declared = Number(response.headers.get('content-length') || 0);
  if (declared > MAX_BYTES) throw new Error('El recurso supera el máximo de 5 MB');
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    total += result.value.byteLength;
    if (total > MAX_BYTES) { await reader.cancel(); throw new Error('El recurso supera el máximo de 5 MB'); }
    chunks.push(result.value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  chunks.forEach((chunk) => { bytes.set(chunk, offset); offset += chunk.byteLength; });
  return new TextDecoder().decode(bytes);
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { url?: string };
    let url = publicHttpUrl(body.url);
    let response: Response | undefined;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(10000), headers: { accept: 'text/html,text/plain,application/pdf' } });
      if (![301, 302, 303, 307, 308].includes(response.status)) break;
      const location = response.headers.get('location');
      if (!location) throw new Error('El sitio devolvió una redirección sin destino');
      url = publicHttpUrl(new URL(location, url).toString());
    }
    if (!response || !response.ok) throw new Error(`El sitio respondió con HTTP ${response?.status || 'desconocido'}`);
    const type = response.headers.get('content-type') || '';
    if (!/(text\/|application\/pdf|application\/json)/i.test(type)) throw new Error(`Tipo de contenido no soportado: ${type || 'desconocido'}`);
    const text = await readLimited(response);
    return NextResponse.json({ text, finalUrl: url.toString(), contentType: type, size: new TextEncoder().encode(text).byteLength });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo leer la URL';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
