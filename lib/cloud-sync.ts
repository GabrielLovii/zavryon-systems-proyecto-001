'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabase';
import { downloadJson } from './format';
import { initialDemoState, normalizeDemoState, type DemoState } from './demo-store';

export type CloudStatus = 'no-configurado' | 'sin-sesion' | 'conectando' | 'sincronizado' | 'pendiente' | 'guardando' | 'sin-conexion' | 'conflicto' | 'error';
export type CloudVersion = { id: number; revision: number; savedAt: string; device: string | null };
type CloudRow = { data: unknown; revision: number; updated_at: string; device: string | null };
/** What this device last agreed with the cloud: which account, which revision and the hash of the state at that moment. */
type SyncMeta = { userId: string; revision: number; hash: string; syncedAt: string };

const META_KEY = 'zavryon-cloud-sync-v1';
const PUSH_DELAY_MS = 1500;
const TABLE = 'app_state';

/** Cheap FNV-1a hash of the serialized state, used to detect local changes without storing the whole snapshot. */
export function stateHash(state: unknown) {
  const text = JSON.stringify(state);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) { hash ^= text.charCodeAt(index); hash = Math.imul(hash, 0x01000193); }
  return `${text.length}:${(hash >>> 0).toString(16)}`;
}

const readMeta = (): SyncMeta | null => { try { const raw = window.localStorage.getItem(META_KEY); return raw ? JSON.parse(raw) as SyncMeta : null; } catch { return null; } };
const writeMeta = (meta: SyncMeta | null) => { try { if (meta) window.localStorage.setItem(META_KEY, JSON.stringify(meta)); else window.localStorage.removeItem(META_KEY); } catch { /* Storage full or blocked: sync still works for this session. */ } };
const deviceName = () => { if (typeof navigator === 'undefined') return 'desconocido'; const ua = navigator.userAgent; return /Android/i.test(ua) ? 'Android' : /iPhone|iPad/i.test(ua) ? 'iOS' : /Windows/i.test(ua) ? 'Windows' : /Mac/i.test(ua) ? 'Mac' : 'Navegador'; };
/** Alerts are regenerated on every device, so they don't count as "local changes" worth a conflict. */
const comparable = (state: DemoState) => ({ ...state, alerts: [] });
const isPristineDemo = (state: DemoState) => stateHash(comparable({ ...state, activeUserId: '' })) === stateHash(comparable({ ...initialDemoState(), activeUserId: '' }));
const errorText = (error: unknown) => error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String((error as { message: unknown }).message) : 'Error desconocido';

type Demo = { state: DemoState; hydrated: boolean; replaceState: (value: unknown) => boolean };

export type SyncDecision = 'subir-nuevo' | 'sincronizado' | 'subir' | 'bajar' | 'conflicto' | 'invalido';
/**
 * What to do after reading the cloud row. Pure so it can be unit-tested:
 * - no row → upload this device's data as the first version
 * - same content → nothing to do
 * - cloud unchanged since this device last synced → upload local edits (if any)
 * - cloud changed and this device has no unsynced edits → download
 * - both changed → ask the user
 */
export function decideSync(input: { meta: SyncMeta | null; userId: string; hasRow: boolean; rowRevision: number; localHash: string; cloudHash: string | null; localPristine: boolean }): SyncDecision {
  const { meta, userId, hasRow, rowRevision, localHash, cloudHash, localPristine } = input;
  if (!hasRow) return 'subir-nuevo';
  if (cloudHash !== null && cloudHash === localHash) return 'sincronizado';
  const sameAccount = meta?.userId === userId;
  const localChanged = sameAccount ? localHash !== meta.hash : !localPristine;
  if (sameAccount && meta.revision === rowRevision) return localChanged ? 'subir' : 'sincronizado';
  if (cloudHash === null) return 'invalido';
  return localChanged ? 'conflicto' : 'bajar';
}

export function useCloudSync(demo: Demo) {
  const supabase = getSupabaseClient();
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<CloudStatus>(supabase ? 'conectando' : 'no-configurado');
  const [error, setError] = useState('');
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [conflict, setConflict] = useState<{ cloud: DemoState; updatedAt: string; revision: number; device: string | null } | null>(null);
  const stateRef = useRef(demo.state); stateRef.current = demo.state;
  const busy = useRef(false);
  const ready = useRef(false);
  const conflictRef = useRef(conflict); conflictRef.current = conflict;
  const userId = session?.user.id;

  const markSynced = useCallback((uid: string, revision: number, state: DemoState) => {
    const meta = { userId: uid, revision, hash: stateHash(comparable(state)), syncedAt: new Date().toISOString() };
    writeMeta(meta); setLastSyncAt(meta.syncedAt); setStatus('sincronizado'); setError('');
  }, []);

  const applyCloud = useCallback((uid: string, row: CloudRow) => {
    const normalized = normalizeDemoState(row.data);
    if (!normalized || !demo.replaceState(normalized)) { setStatus('error'); setError('Los datos de la nube no tienen un formato válido. No se modificó nada local.'); return; }
    markSynced(uid, row.revision, normalized);
  }, [demo, markSynced]);

  const push = useCallback(async (): Promise<void> => {
    if (!supabase || !userId || busy.current) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) { setStatus('sin-conexion'); return; }
    const meta = readMeta();
    const snapshot = stateRef.current;
    busy.current = true; setStatus('guardando');
    try {
      if (!meta || meta.userId !== userId) {
        const { data, error: insertError } = await supabase.from(TABLE).insert({ user_id: userId, data: snapshot, revision: 1, device: deviceName() }).select('revision').single();
        if (insertError) throw insertError;
        markSynced(userId, data.revision, snapshot);
      } else {
        const { data, error: updateError } = await supabase.from(TABLE).update({ data: snapshot, revision: meta.revision + 1, device: deviceName() }).eq('user_id', userId).eq('revision', meta.revision).select('revision');
        if (updateError) throw updateError;
        if (!data.length) { busy.current = false; await pull(); return; } // Someone else saved first: reconcile.
        markSynced(userId, data[0].revision, snapshot);
      }
    } catch (cause) {
      setStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'sin-conexion' : 'error'); setError(errorText(cause));
    } finally { busy.current = false; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, userId, markSynced]);

  const pull = useCallback(async (): Promise<void> => {
    if (!supabase || !userId || busy.current) return;
    busy.current = true;
    try {
      const { data: row, error: selectError } = await supabase.from(TABLE).select('data, revision, updated_at, device').eq('user_id', userId).maybeSingle<CloudRow>();
      if (selectError) throw selectError;
      busy.current = false;
      const meta = readMeta();
      const local = stateRef.current;
      if (!row) { if (meta?.userId === userId) writeMeta(null); await push(); return; }
      const cloudState = normalizeDemoState(row.data);
      const decision = decideSync({ meta, userId, hasRow: true, rowRevision: row.revision, localHash: stateHash(comparable(local)), cloudHash: cloudState ? stateHash(comparable(cloudState)) : null, localPristine: isPristineDemo(local) });
      if (decision === 'sincronizado') { markSynced(userId, row.revision, local); return; }
      if (decision === 'subir') { await push(); return; }
      if (decision === 'bajar') { applyCloud(userId, row); return; }
      if (decision === 'invalido' || !cloudState) { setStatus('error'); setError('Los datos de la nube no tienen un formato válido. No se modificó nada local.'); return; }
      setConflict({ cloud: cloudState, updatedAt: row.updated_at, revision: row.revision, device: row.device }); setStatus('conflicto');
    } catch (cause) {
      busy.current = false; setStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'sin-conexion' : 'error'); setError(errorText(cause));
    }
  }, [supabase, userId, push, applyCloud, markSynced]);

  // Session lifecycle.
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); if (!data.session) setStatus('sin-sesion'); });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); if (!next) { ready.current = false; setStatus('sin-sesion'); setConflict(null); } });
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  // First sync once both the local data and the session are available.
  useEffect(() => {
    if (!userId || !demo.hydrated) return;
    ready.current = false; setStatus('conectando');
    void pull().then(() => { ready.current = true; });
  }, [userId, demo.hydrated, pull]);

  // Auto-save: any local change is uploaded shortly after the user stops editing.
  useEffect(() => {
    if (!userId || !ready.current || conflict) return;
    const meta = readMeta();
    if (meta?.userId === userId && meta.hash === stateHash(comparable(demo.state))) return;
    setStatus((current) => current === 'guardando' ? current : 'pendiente');
    const timer = window.setTimeout(() => { void push(); }, PUSH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [demo.state, userId, conflict, push]);

  // Catch up when coming back online or returning to the app (changes made on another device).
  useEffect(() => {
    if (!userId) return;
    // While hidden (tablet asleep, other app in front) nothing runs: no polling timer. Before going to the
    // background, unsynced edits are uploaded right away instead of waiting for the debounce.
    let interval = 0;
    const startPolling = () => { window.clearInterval(interval); interval = window.setInterval(() => { void pull(); }, 60_000); };
    const onOnline = () => { void pull(); };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') { void pull(); startPolling(); return; }
      window.clearInterval(interval);
      const meta = readMeta();
      if (ready.current && !conflictRef.current && !(meta?.userId === userId && meta.hash === stateHash(comparable(stateRef.current)))) void push();
    };
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisibility);
    if (document.visibilityState === 'visible') startPolling();
    return () => { window.removeEventListener('online', onOnline); document.removeEventListener('visibilitychange', onVisibility); window.clearInterval(interval); };
  }, [userId, pull, push]);

  const resolveConflict = useCallback(async (keep: 'nube' | 'local') => {
    if (!conflict || !userId) return;
    if (keep === 'nube') { downloadJson(`respaldo-dispositivo-${new Date().toISOString().slice(0, 16).replace(':', '-')}.json`, stateRef.current); applyCloud(userId, { data: conflict.cloud, revision: conflict.revision, updated_at: conflict.updatedAt, device: conflict.device }); setConflict(null); return; }
    writeMeta({ userId, revision: conflict.revision, hash: '', syncedAt: new Date().toISOString() });
    setConflict(null); ready.current = true; await push();
  }, [conflict, userId, applyCloud, push]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return 'La nube no está configurada';
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return signInError ? (signInError.message.includes('Invalid login') ? 'Email o contraseña incorrectos' : signInError.message.includes('Email not confirmed') ? 'Confirmá tu email con el enlace que te enviamos y volvé a entrar' : signInError.message) : null;
  }, [supabase]);
  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: 'La nube no está configurada', needsConfirmation: false };
    const { data, error: signUpError } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.origin } });
    return { error: signUpError?.message || null, needsConfirmation: !signUpError && !data.session };
  }, [supabase]);
  const resetPassword = useCallback(async (email: string) => {
    if (!supabase) return 'La nube no está configurada';
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
    return resetError?.message || null;
  }, [supabase]);
  const signOut = useCallback(async () => { await push(); await supabase?.auth.signOut(); writeMeta(null); }, [supabase, push]);

  const listVersions = useCallback(async (): Promise<CloudVersion[]> => {
    if (!supabase || !userId) return [];
    const { data } = await supabase.from('app_state_history').select('id, revision, saved_at, device').eq('user_id', userId).order('id', { ascending: false }).limit(30);
    return (data || []).map((row) => ({ id: row.id, revision: row.revision, savedAt: row.saved_at, device: row.device }));
  }, [supabase, userId]);
  const restoreVersion = useCallback(async (id: number) => {
    if (!supabase || !userId) return false;
    const { data } = await supabase.from('app_state_history').select('data').eq('id', id).eq('user_id', userId).maybeSingle<{ data: unknown }>();
    if (!data || !demo.replaceState(data.data)) return false;
    return true; // The auto-save effect uploads it as the newest revision (the current one goes to history).
  }, [supabase, userId, demo]);

  return { configured: Boolean(supabase), session, email: session?.user.email || '', status, error, lastSyncAt, conflict, syncNow: pull, resolveConflict, signIn, signUp, resetPassword, signOut, listVersions, restoreVersion };
}

export type CloudSync = ReturnType<typeof useCloudSync>;
