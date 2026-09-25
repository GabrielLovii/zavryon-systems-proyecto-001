'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { config, initialExpiries, initialOrders, initialPayments, initialReceptions, initialSources, initialUsers, normalizePaymentPreference, products, supplierProducts, suppliers, today, type AppConfig, type Expiry, type Order, type Payment, type Product, type Reception, type RestockItem, type Source, type StockMovement, type Supplier, type SupplierProduct, type User } from './mock-data';
import type { AlertPreferences, AppAlert } from './alerts';
import { canImportCandidate, normalizeSourceCandidate } from './source-validation';
import { isValidLocalDateISO, isValidLocalDateTimeInput } from './date';

export const DEMO_STORAGE_KEY = 'zavryon-abastecimiento-demo-v7';
export const DEMO_SAVED_AT_KEY = 'zavryon-abastecimiento-demo-v6-saved-at';
const DEMO_BACKUP_KEY = `${DEMO_STORAGE_KEY}-backup`;
export type DemoState = { version: 7; config: AppConfig; activeUserId: string; suppliers: Supplier[]; products: Product[]; supplierProducts: SupplierProduct[]; orders: Order[]; receptions: Reception[]; expiries: Expiry[]; sources: Source[]; payments: Payment[]; users: User[]; alerts: AppAlert[]; alertPreferences: AlertPreferences; stockMovements: StockMovement[]; restockList: RestockItem[] };
export const initialDemoState = (): DemoState => ({ version: 7, config: structuredClone(config), activeUserId: initialUsers[0].id, suppliers: structuredClone(suppliers), products: structuredClone(products), supplierProducts: structuredClone(supplierProducts), orders: structuredClone(initialOrders), receptions: structuredClone(initialReceptions), expiries: structuredClone(initialExpiries), sources: structuredClone(initialSources), payments: structuredClone(initialPayments), users: structuredClone(initialUsers), alerts: [], alertPreferences: { expiries: true, deliveries: true, stock: true, browser: false, notifiedKeys: [] }, stockMovements: [], restockList: [] });
export const emptyDemoState = (): DemoState => ({ ...initialDemoState(), version: 7, config: { ...initialDemoState().config, address: '', phone: '', headerNote: 'Estado vacío seguro' }, activeUserId: 'usr-recovery-admin', suppliers: [], products: [], supplierProducts: [], orders: [], receptions: [], expiries: [], sources: [], payments: [], users: [{ id: 'usr-recovery-admin', name: 'Administrador', email: '', role: 'Administrador', active: true, createdAt: today }] });

export const normalizeOrder = (order: Partial<Order>): Order => ({
  id: String(order.id || ''), supplierId: String(order.supplierId || ''), lines: Array.isArray(order.lines) ? order.lines : [],
  expectedDate: isValidLocalDateISO(order.expectedDate) ? order.expectedDate : '', notes: String(order.notes || ''),
  responsible: String(order.responsible || ''), requester: typeof order.requester === 'string' && order.requester ? order.requester : undefined,
  requestedAt: typeof order.requestedAt === 'string' && (isValidLocalDateTimeInput(order.requestedAt) || !Number.isNaN(Date.parse(order.requestedAt))) ? order.requestedAt : undefined,
  status: order.status || 'Borrador', createdAt: String(order.createdAt || ''),
  events: Array.isArray(order.events) ? order.events.filter((event) => event && typeof event.status === 'string' && typeof event.at === 'string') : undefined,
});

/** Validates and migrates a stored or cloud snapshot (versions 5–7) into the current shape; returns null if unusable. */
export function normalizeDemoState(value: unknown): DemoState | null {
  if (!value || typeof value !== 'object') return null;
  const saved = value as Partial<DemoState>;
  if (![5, 6, 7].includes(saved.version || 0) || !Array.isArray(saved.users) || !saved.config) return null;
  return { ...initialDemoState(), ...saved, version: 7 as const, orders: (saved.orders || []).map((order) => normalizeOrder(order)), suppliers: (saved.suppliers || suppliers).map((supplier) => ({ ...supplier, terms: normalizePaymentPreference(supplier.terms) })), sources: (saved.sources || []).map((source) => ({ ...source, candidates: (source.candidates || []).map((candidate) => normalizeSourceCandidate(candidate)) })), alerts: saved.alerts || [], alertPreferences: { ...initialDemoState().alertPreferences, ...saved.alertPreferences }, stockMovements: Array.isArray(saved.stockMovements) ? saved.stockMovements.slice(-2000) : [], restockList: Array.isArray(saved.restockList) ? saved.restockList : [] };
}

export function useDemoState() {
  const [state, setState] = useState<DemoState>(initialDemoState);
  const [hydrated, setHydrated] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [persistenceStatus, setPersistenceStatus] = useState<'pendiente' | 'guardado' | 'recuperado' | 'error'>('pendiente');
  const stateRef = useRef(state); stateRef.current = state;
  const persist = (next: DemoState) => {
    try {
      const serialized = JSON.stringify(next);
      const previous = window.localStorage.getItem(DEMO_STORAGE_KEY);
      if (previous) window.localStorage.setItem(DEMO_BACKUP_KEY, previous);
      window.localStorage.setItem(DEMO_STORAGE_KEY, serialized);
      const savedAt = new Date().toISOString();
      window.localStorage.setItem(DEMO_SAVED_AT_KEY, savedAt);
      setLastSavedAt(savedAt);
      setPersistenceStatus('guardado');
    } catch { setPersistenceStatus('error'); }
  };
  useEffect(() => {
    const read = (key: string) => {
      const raw = window.localStorage.getItem(key);
      if (!raw) return null;
      return normalizeDemoState(JSON.parse(raw));
    };
    try {
      const loaded = read(DEMO_STORAGE_KEY) || read(DEMO_BACKUP_KEY);
       if (loaded) { setState(loaded); const savedAt = window.localStorage.getItem(DEMO_SAVED_AT_KEY); setLastSavedAt(savedAt); setPersistenceStatus(read(DEMO_STORAGE_KEY) ? 'guardado' : 'recuperado'); }
    } catch {
      try { const recovered = read(DEMO_BACKUP_KEY); if (recovered) { setState(recovered); setPersistenceStatus('recuperado'); } else setPersistenceStatus('error'); } catch { setPersistenceStatus('error'); }
     } finally { setHydrated(true); }
  }, []);
  useEffect(() => { if (!hydrated) return; const timer = window.setTimeout(() => persist(state), 250); const flush = () => persist(stateRef.current); window.addEventListener('visibilitychange', flush); window.addEventListener('pagehide', flush); return () => { window.clearTimeout(timer); window.removeEventListener('visibilitychange', flush); window.removeEventListener('pagehide', flush); }; }, [hydrated, state]);
  const update = useCallback((change: (current: DemoState) => DemoState) => setState((current) => { const next = change(current); const persisted = { ...next, sources: next.sources.map((source) => ({ ...source, candidates: source.candidates.map((candidate) => normalizeSourceCandidate(candidate)) })) }; const unsafeApproved = persisted.sources.some((source) => source.candidates.some((candidate) => candidate.status === 'Aprobado' && !canImportCandidate(candidate))); if (unsafeApproved) { setPersistenceStatus('error'); return current; } persist(persisted); return persisted; }), []);
  const restoreDemo = useCallback(() => { const next = initialDemoState(); setState(next); persist(next); }, []);
  const clearLocalData = useCallback(() => { const next = emptyDemoState(); setState(next); persist(next); }, []);
  /** Replaces the whole state (cloud download, backup import). Returns false if the snapshot is invalid. */
  const replaceState = useCallback((value: unknown) => { const next = normalizeDemoState(value); if (!next) return false; setState(next); persist(next); return true; }, []);
  return useMemo(() => ({ state, hydrated, update, restoreDemo, clearLocalData, replaceState, lastSavedAt, persistenceStatus }), [state, hydrated, update, restoreDemo, clearLocalData, replaceState, lastSavedAt, persistenceStatus]);
}
