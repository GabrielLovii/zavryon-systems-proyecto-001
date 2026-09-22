export const DRAFT_VERSION = 1;
const MAX_DRAFT_BYTES = 512 * 1024;
export type DraftStatus = 'idle' | 'saving' | 'saved' | 'recovered' | 'error';
export type DraftResult = { status: DraftStatus; savedAt: string | null; error?: string };

const keyFor = (form: string) => `zavryon-draft-v${DRAFT_VERSION}:${form}`;
const backupKeyFor = (form: string) => `${keyFor(form)}:backup`;

export function saveDraft<T>(form: string, data: T, pdfMetadata?: { name: string; size: number; type: string; lastModified: number }): DraftResult {
  try {
    const snapshot = { version: DRAFT_VERSION, form, savedAt: new Date().toISOString(), data, ...(pdfMetadata ? { pdfMetadata } : {}) };
    const serialized = JSON.stringify(snapshot);
    if (serialized.length > MAX_DRAFT_BYTES) return { status: 'error', savedAt: null, error: 'El borrador es demasiado grande. Guarda menos líneas o usa la copia de seguridad.' };
    const previous = window.localStorage.getItem(keyFor(form));
    if (previous) window.localStorage.setItem(backupKeyFor(form), previous);
    window.localStorage.setItem(keyFor(form), serialized);
    return { status: 'saved', savedAt: snapshot.savedAt };
  } catch (error) {
    return { status: 'error', savedAt: null, error: `No se pudo guardar localmente (${error instanceof Error ? error.message : 'almacenamiento no disponible'}). Libera espacio o exporta una copia.` };
  }
}

export function loadDraft<T>(form: string): { data: T; savedAt: string; pdfMetadata?: { name: string; size: number; type: string; lastModified: number }; recovered: boolean } | null {
  if (typeof window === 'undefined') return null;
  for (const [key, recovered] of [[keyFor(form), false], [backupKeyFor(form), true]] as const) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const value = JSON.parse(raw) as { version?: number; form?: string; savedAt?: string; data?: T; pdfMetadata?: { name: string; size: number; type: string; lastModified: number } };
      if (value.version !== DRAFT_VERSION || value.form !== form || !value.savedAt || value.data === undefined) continue;
      return { data: value.data, savedAt: value.savedAt, pdfMetadata: value.pdfMetadata, recovered };
    } catch { /* Try the backup or start a new draft. */ }
  }
  return null;
}

export function discardDraft(form: string) { if (typeof window !== 'undefined') { window.localStorage.removeItem(keyFor(form)); window.localStorage.removeItem(backupKeyFor(form)); } }
