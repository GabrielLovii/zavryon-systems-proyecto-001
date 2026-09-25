'use client';

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

/**
 * Screen state (tabs, filters, searches, selections, half-edited forms, scroll) kept on this device so a
 * reload, a discarded tablet tab or a paused app reopens exactly where the user left it. Business data lives
 * in demo-store; this is only "where I was and what I was typing".
 */
export const UI_STATE_PREFIX = 'zavryon-ui-v1:';
const MAX_ENTRY_BYTES = 256 * 1024;

const storage = (): Storage | null => { try { return typeof window === 'undefined' ? null : window.localStorage; } catch { return null; } };

export function readUiState<T>(key: string, fallback: T, isValid?: (value: unknown) => boolean): T {
  const store = storage();
  if (!store) return fallback;
  try {
    const raw = store.getItem(UI_STATE_PREFIX + key);
    if (raw === null) return fallback;
    const value = JSON.parse(raw) as unknown;
    if (value === null && fallback !== null) return fallback;
    if (isValid && !isValid(value)) return fallback;
    return value as T;
  } catch { return fallback; }
}

export function writeUiState(key: string, value: unknown) {
  const store = storage();
  if (!store) return;
  try {
    if (value === undefined) { store.removeItem(UI_STATE_PREFIX + key); return; }
    const serialized = JSON.stringify(value);
    if (serialized.length > MAX_ENTRY_BYTES) return;
    store.setItem(UI_STATE_PREFIX + key, serialized);
  } catch { /* Quota or private mode: the screen simply won't be restored. */ }
}

export function removeUiState(key: string) { try { storage()?.removeItem(UI_STATE_PREFIX + key); } catch { /* ignore */ } }

/** Drops every saved screen state (used when local data is wiped or replaced). */
export function clearUiState() {
  const store = storage();
  if (!store) return;
  try {
    const keys: string[] = [];
    for (let index = 0; index < store.length; index += 1) { const key = store.key(index); if (key?.startsWith(UI_STATE_PREFIX)) keys.push(key); }
    keys.forEach((key) => store.removeItem(key));
  } catch { /* ignore */ }
}

/**
 * Drop-in replacement for useState that survives reloads. Only use it in components that mount on the
 * client after navigation (section screens), so the lazy read never runs during server rendering.
 */
export function usePersistentState<T>(key: string, initial: T | (() => T), isValid?: (value: unknown) => boolean): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => readUiState(key, typeof initial === 'function' ? (initial as () => T)() : initial, isValid));
  const latest = useRef(value); latest.current = value;
  const keyRef = useRef(key);
  // A key change (e.g. another order) loads that key's saved value.
  useEffect(() => {
    if (keyRef.current === key) return;
    keyRef.current = key;
    setValue(readUiState(key, typeof initial === 'function' ? (initial as () => T)() : initial, isValid));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => { if (keyRef.current === key) writeUiState(key, value); }, [key, value]);
  return [value, setValue];
}

const SCROLL_KEY = 'scroll';
type ScrollMap = Record<string, number>;
const isScrollMap = (value: unknown) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export function saveScroll(section: string) {
  if (typeof window === 'undefined') return;
  const map = readUiState<ScrollMap>(SCROLL_KEY, {}, isScrollMap);
  map[section] = Math.max(0, Math.round(window.scrollY));
  writeUiState(SCROLL_KEY, map);
}

/** Restores the saved scroll once the section has painted enough content (retries while the page grows). */
export function restoreScroll(section: string) {
  if (typeof window === 'undefined') return () => undefined;
  const target = readUiState<ScrollMap>(SCROLL_KEY, {}, isScrollMap)[section] || 0;
  if (!target) return () => undefined;
  let tries = 0; let frame = 0; let cancelled = false;
  const attempt = () => {
    if (cancelled) return;
    window.scrollTo({ top: target });
    tries += 1;
    if (Math.abs(window.scrollY - target) > 2 && tries < 30) frame = window.setTimeout(attempt, 50);
  };
  frame = window.setTimeout(attempt, 0);
  return () => { cancelled = true; window.clearTimeout(frame); };
}

/** Calls onHide when the page goes to the background (tab switch, screen off, app switch) or is being unloaded. */
export function usePageHidden(onHide: () => void, onShow?: () => void) {
  const hide = useRef(onHide); hide.current = onHide;
  const show = useRef(onShow); show.current = onShow;
  useEffect(() => {
    const onVisibility = () => { if (document.visibilityState === 'hidden') hide.current(); else show.current?.(); };
    const onPageHide = () => hide.current();
    const onPageShow = (event: PageTransitionEvent) => { if (event.persisted) show.current?.(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('pageshow', onPageShow);
    // Chrome's lifecycle API: "freeze" fires before a background tab is suspended.
    document.addEventListener('freeze', onPageHide);
    document.addEventListener('resume', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('freeze', onPageHide);
      document.removeEventListener('resume', onVisibility);
    };
  }, []);
}
