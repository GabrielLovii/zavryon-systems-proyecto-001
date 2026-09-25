'use client';

import { useEffect, useState } from 'react';

/** True on touch-first devices (tablets, phones): used to avoid popping the on-screen keyboard uninvited. */
export const isCoarsePointer = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches === true;

/**
 * Copies each table header into its cells as data-label so narrow containers can show rows as labelled
 * cards (see .data-table container query in globals.css). Watches the DOM because tables re-render often.
 */
export function useTableLabels() {
  useEffect(() => {
    const label = () => document.querySelectorAll<HTMLTableElement>('table.data-table').forEach((table) => {
      const heads = Array.from(table.querySelectorAll('thead th')).map((th) => th.textContent?.trim() || '');
      table.querySelectorAll('tbody tr, tfoot tr').forEach((row) => {
        let column = 0;
        Array.from(row.children).forEach((cell) => {
          const text = heads[column] || '';
          if (cell.getAttribute('data-label') !== text) cell.setAttribute('data-label', text);
          column += (cell as HTMLTableCellElement).colSpan || 1;
        });
      });
    });
    label();
    let frame = 0;
    const observer = new MutationObserver(() => { window.cancelAnimationFrame(frame); frame = window.requestAnimationFrame(label); });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => { observer.disconnect(); window.cancelAnimationFrame(frame); };
  }, []);
}

/**
 * Number fields: tapping one selects its value so typing replaces the "0" instead of appending to it, and a
 * mouse wheel over a focused field no longer changes quantities by accident.
 */
export function useNumberFieldComfort() {
  useEffect(() => {
    const isNumber = (target: EventTarget | null): target is HTMLInputElement => target instanceof HTMLInputElement && target.type === 'number';
    const onFocus = (event: FocusEvent) => { if (isNumber(event.target)) { const field = event.target; window.setTimeout(() => { try { field.select(); } catch { /* ignore */ } }, 0); } };
    const onWheel = (event: WheelEvent) => { if (isNumber(event.target) && document.activeElement === event.target) event.target.blur(); };
    document.addEventListener('focusin', onFocus);
    document.addEventListener('wheel', onWheel, { passive: true });
    return () => { document.removeEventListener('focusin', onFocus); document.removeEventListener('wheel', onWheel); };
  }, []);
}

type WakeLockSentinelLike = { release: () => Promise<void>; released?: boolean };
type NavigatorWithWakeLock = Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> } };

/**
 * Keeps the tablet screen on while `active` (receiving goods, scanning). The browser drops the lock when the
 * page is hidden; it is requested again on return and released on unmount, so nothing runs in background.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    const nav = navigator as NavigatorWithWakeLock;
    if (!active || !nav.wakeLock) return;
    let lock: WakeLockSentinelLike | null = null; let cancelled = false;
    const acquire = async () => { if (document.visibilityState !== 'visible' || cancelled) return; try { lock = await nav.wakeLock!.request('screen'); if (cancelled) void lock.release(); } catch { /* Battery saver or unsupported: the screen just follows the system timeout. */ } };
    const onVisibility = () => { if (document.visibilityState === 'visible') void acquire(); };
    void acquire();
    document.addEventListener('visibilitychange', onVisibility);
    return () => { cancelled = true; document.removeEventListener('visibilitychange', onVisibility); if (lock && !lock.released) void lock.release().catch(() => undefined); };
  }, [active]);
}

/** Asks the browser not to evict this app's local data under storage pressure (tablets clean caches aggressively). */
export async function requestPersistentStorage(): Promise<boolean | null> {
  try {
    if (!navigator.storage?.persist) return null;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch { return null; }
}

/** Number on the installed app icon (Android/Chrome OS/Windows/macOS PWAs). */
export function setAppBadge(count: number) {
  const nav = navigator as Navigator & { setAppBadge?: (count?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
  try { if (count > 0) void nav.setAppBadge?.(count).catch(() => undefined); else void nav.clearAppBadge?.().catch(() => undefined); } catch { /* Unsupported. */ }
}

/** Short haptic feedback on devices that support it (Android tablets/phones). */
export function vibrate(pattern: number | number[]) { try { navigator.vibrate?.(pattern); } catch { /* Unsupported. */ } }

/** True once a new service worker took control: the page is running the previous version's code. */
export function useUpdateAvailable() {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const hadController = Boolean(navigator.serviceWorker.controller);
    const onChange = () => { if (hadController) setAvailable(true); };
    navigator.serviceWorker.addEventListener('controllerchange', onChange);
    return () => navigator.serviceWorker.removeEventListener('controllerchange', onChange);
  }, []);
  return available;
}
