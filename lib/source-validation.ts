import type { Evidence, FieldResult, SourceCandidate, SourceCandidateFields } from './mock-data';

export const SOURCE_LIMITS = { maxBytes: 5 * 1024 * 1024, maxPages: 30, maxText: 200_000, maxCandidates: 100, timeoutMs: 10_000 } as const;

const ipv4 = (value: string) => {
  const parts = value.split('.');
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part) || Number(part) > 255)) return null;
  return parts.map(Number);
};
const blockedIpv4 = (parts: number[]) => {
  const [a, b, c] = parts;
  return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 0 || b === 168)) || (a === 192 && b === 0 && c === 2) || (a === 198 && (b === 18 || b === 19 || b === 51)) || (a === 203 && b === 0 && c === 113);
};
const ipv6ToBytes = (value: string) => {
  const normalized = value.toLowerCase().replace(/^\[|\]$/g, '');
  if (!normalized.includes(':')) return null;
  const halves = normalized.split('::');
  if (halves.length > 2) return null;
  const parse = (part: string) => part ? part.split(':').flatMap((piece) => piece.includes('.') ? (ipv4(piece) || []).reduce<number[]>((out, n, index) => index % 2 ? out : [...out, (n << 8) + Number((ipv4(piece) || [])[index + 1])], []) : [/^[0-9a-f]{1,4}$/.test(piece) ? parseInt(piece, 16) : -1]).filter((n) => n >= 0) : [];
  const left = parse(halves[0]); const right = parse(halves[1] || '');
  if (left.length + right.length > 8 || (halves.length === 1 && left.length !== 8)) return null;
  return [...left, ...Array(8 - left.length - right.length).fill(0), ...right].flatMap((part) => [part >> 8, part & 255]);
};
export function isBlockedAddress(value: string): boolean {
  const v4 = ipv4(value);
  if (v4) return blockedIpv4(v4);
  const bytes = ipv6ToBytes(value);
  if (!bytes) return false;
  const mapped = bytes.slice(0, 10).every((byte) => byte === 0) && bytes[10] === 255 && bytes[11] === 255;
  if (mapped) return blockedIpv4(bytes.slice(12));
  const first = (bytes[0] << 8) | bytes[1]; const second = (bytes[2] << 8) | bytes[3];
  return bytes.every((byte) => byte === 0) || (bytes.slice(0, 15).every((byte) => byte === 0) && bytes[15] === 1) || (first >= 0xfc00 && first <= 0xfdff) || (first >= 0xfe80 && first <= 0xfebf) || first === 0xff00 || first === 0x2001 && (second === 0x0db8 || second === 0x0002 || second === 0x0010 || second === 0x0020);
}
export function assertSafeUrl(value: unknown): URL {
  if (typeof value !== 'string' || value.length > 2048) throw new Error('URL ausente o demasiado larga');
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port) throw new Error('Solo se permiten URLs http/https públicas sin credenciales ni puertos explícitos');
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (isBlockedAddress(host) || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal') || host === 'metadata.google.internal' || host === 'instance-data.ec2.internal') throw new Error('La URL apunta a localhost, metadata o una red privada y fue bloqueada');
  return url;
}
export function assertMagic(bytes: Uint8Array, contentType: string) {
  const type = contentType.toLowerCase();
  if (type.includes('pdf')) { if (!(bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46)) throw new Error('El recurso no tiene la firma PDF esperada'); return; }
  // Text formats: skip BOM/whitespace before checking the first meaningful character; binary content (NUL bytes) is rejected.
  const head = new TextDecoder().decode(bytes.slice(0, 2048)).replace(/^\ufeff/, '').trimStart();
  if (bytes.slice(0, 2048).includes(0)) throw new Error('El recurso parece binario y no es texto, HTML ni JSON');
  if (type.includes('html') && !head.startsWith('<')) throw new Error('El recurso no tiene una firma HTML válida');
  if (type.includes('json') && !head.startsWith('{') && !head.startsWith('[')) throw new Error('El recurso no tiene una firma JSON válida');
}
export const canonicalKey = (candidate: Pick<SourceCandidate, 'name' | 'sku' | 'brand'>) => (candidate.sku.trim() ? `sku:${candidate.sku.trim().toLowerCase()}` : `name:${[candidate.brand, candidate.name].filter(Boolean).join(' ').trim().toLowerCase().replace(/\s+/g, ' ')}`);
export function dedupeCandidates(candidates: SourceCandidate[]) { const seen = new Map<string, SourceCandidate>(); return candidates.map((candidate) => { const key = canonicalKey(candidate); const previous = seen.get(key); if (previous) { candidate.reviewState = 'needs_review'; candidate.notes = `${candidate.notes} Conflicto con ${previous.name}; revisar antes de importar.`; } else seen.set(key, candidate); return candidate; }); }
const candidateFields: Array<keyof SourceCandidateFields> = ['name', 'sku', 'brand', 'unit', 'category', 'price', 'currency', 'availability', 'expiry', 'image'];
const isValidConfidence = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
const manualEvidence = (field: string): Evidence => ({ label: 'Manual / user-reviewed', excerpt: `Valor de ${field} ingresado o revisado manualmente`, source: 'manual/user-reviewed', kind: 'manual' });
const manualField = <T>(value: T, field: string): FieldResult<T> => ({ value, confidence: 1, evidence: [manualEvidence(field)], provenance: 'manual/user-reviewed' });
const asField = <T>(value: T, field: string, existing?: FieldResult<T>): FieldResult<T> => existing && Array.isArray(existing.evidence) && isValidConfidence(existing.confidence) ? { ...existing, value } : manualField(value, field);

export function normalizeSourceCandidate(candidate: Partial<SourceCandidate>): SourceCandidate {
  const raw = candidate.fields as Partial<SourceCandidateFields> | undefined;
  const name = String(candidate.name ?? raw?.name?.value ?? '');
  const sku = String(candidate.sku ?? raw?.sku?.value ?? '');
  const brand = String(candidate.brand ?? raw?.brand?.value ?? '');
  const unit = String(candidate.unit ?? raw?.unit?.value ?? '');
  const category = String(candidate.category ?? raw?.category?.value ?? '');
  const price = Number.isFinite(Number(candidate.price ?? raw?.price?.value)) ? Number(candidate.price ?? raw?.price?.value) : 0;
  const currency = String(candidate.currency ?? raw?.currency?.value ?? 'ARS');
  const availability = String(candidate.availability ?? raw?.availability?.value ?? '');
  const expiry = String(candidate.expiry ?? raw?.expiry?.value ?? '');
  const imageUrl = String(candidate.imageUrl ?? raw?.image?.value ?? '');
  const fields: SourceCandidateFields = {
    name: asField(name, 'nombre', raw?.name), sku: asField(sku, 'código', raw?.sku), brand: asField(brand, 'marca', raw?.brand),
    unit: asField(unit, 'unidad', raw?.unit), category: asField(category, 'categoría', raw?.category), price: asField(price, 'precio', raw?.price),
    currency: asField(currency, 'moneda', raw?.currency), availability: asField(availability, 'disponibilidad', raw?.availability), expiry: asField(expiry, 'vencimiento', raw?.expiry), image: asField(imageUrl, 'imagen', raw?.image),
  };
  const confidence = isValidConfidence(candidate.confidence) ? candidate.confidence : Math.min(...candidateFields.map((field) => fields[field].confidence));
  return { id: String(candidate.id || ''), name, sku, brand, unit, category, price, currency, availability, expiry, imageUrl, fields, confidence, reviewState: candidate.reviewState || (candidate.status === 'Aprobado' ? 'approved' : 'pending'), extractorVersion: candidate.extractorVersion, status: candidate.status || 'Pendiente', notes: String(candidate.notes || '') };
}

export function applyCandidatePatch(candidate: SourceCandidate, patch: Partial<SourceCandidate>): SourceCandidate {
  const current = normalizeSourceCandidate(candidate);
  const next = normalizeSourceCandidate({ ...current, ...patch, fields: current.fields });
  const fields = { ...next.fields };
  (Object.keys(patch) as Array<keyof SourceCandidate>).forEach((key) => {
    const field = key === 'imageUrl' ? 'image' : key as keyof SourceCandidateFields;
    if (!candidateFields.includes(field) || key === 'fields') return;
    const value = (field === 'image' ? next.imageUrl : next[field as keyof SourceCandidate]) as never;
    fields[field] = manualField(value, field);
  });
  return { ...next, fields, reviewState: current.reviewState === 'approved' ? 'pending' : next.reviewState, status: current.reviewState === 'approved' ? 'Pendiente' : next.status };
}

export function approveCandidate(candidate: SourceCandidate): SourceCandidate | null {
  const current = normalizeSourceCandidate(candidate);
  const fieldsToValidate = candidateFields.map((key) => current.fields[key]);
  const required = [current.fields.name, current.fields.price];
  if (!current.name.trim() || !Number.isFinite(current.price) || current.price < 0 || !isValidConfidence(current.confidence) || current.confidence < 0.7 || fieldsToValidate.some((field) => !isValidConfidence(field.confidence) || field.evidence.length === 0 || field.needsReview) || required.some((field) => field.confidence < 0.7)) return null;
  return { ...current, status: 'Aprobado', reviewState: 'approved' };
}
export function canImportCandidate(candidate: SourceCandidate): boolean {
  const current = normalizeSourceCandidate(candidate);
  return current.status === 'Aprobado' && current.reviewState === 'approved' && Boolean(current.name.trim()) && Number.isFinite(current.price) && isValidConfidence(current.confidence) && current.confidence >= 0.7 && candidateFields.every((key) => isValidConfidence(current.fields[key].confidence) && current.fields[key].evidence.length > 0 && !current.fields[key].needsReview);
}
