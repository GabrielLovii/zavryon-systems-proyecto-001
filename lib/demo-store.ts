'use client';

import { useEffect, useState } from 'react';
import { config, initialExpiries, initialOrders, initialPayments, initialReceptions, initialSources, initialUsers, normalizePaymentPreference, products, supplierProducts, suppliers, today, type AppConfig, type Expiry, type Order, type Payment, type Product, type Reception, type Source, type Supplier, type SupplierProduct, type User } from './mock-data';
import type { AlertPreferences, AppAlert } from './alerts';

export const DEMO_STORAGE_KEY = 'zavryon-abastecimiento-demo-v6';
const DEMO_BACKUP_KEY = `${DEMO_STORAGE_KEY}-backup`;
export type DemoState = { version: 6; config: AppConfig; activeUserId: string; suppliers: Supplier[]; products: Product[]; supplierProducts: SupplierProduct[]; orders: Order[]; receptions: Reception[]; expiries: Expiry[]; sources: Source[]; payments: Payment[]; users: User[]; alerts: AppAlert[]; alertPreferences: AlertPreferences };
export const initialDemoState = (): DemoState => ({ version: 6, config: structuredClone(config), activeUserId: initialUsers[0].id, suppliers: structuredClone(suppliers), products: structuredClone(products), supplierProducts: structuredClone(supplierProducts), orders: structuredClone(initialOrders), receptions: structuredClone(initialReceptions), expiries: structuredClone(initialExpiries), sources: structuredClone(initialSources), payments: structuredClone(initialPayments), users: structuredClone(initialUsers), alerts: [], alertPreferences: { expiries: true, deliveries: true, browser: false, notifiedKeys: [] } });
export const emptyDemoState = (): DemoState => ({ version: 6, config: { companyName: 'ZAVRYON SYSTEMS', productName: 'Control de Abastecimiento', clientName: 'Autoservicio Don Alejo', businessName: 'Autoservicio Don Alejo', address: '', phone: '', headerNote: 'Estado vacío seguro' }, activeUserId: 'usr-recovery-admin', suppliers: [], products: [], supplierProducts: [], orders: [], receptions: [], expiries: [], sources: [], payments: [], users: [{ id: 'usr-recovery-admin', name: 'Administrador', email: '', role: 'Administrador', active: true, createdAt: today }], alerts: [], alertPreferences: { expiries: true, deliveries: true, browser: false, notifiedKeys: [] } });

export function useDemoState() {
  const [state, setState] = useState<DemoState>(initialDemoState);
  const [hydrated, setHydrated] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [persistenceStatus, setPersistenceStatus] = useState<'pendiente' | 'guardado' | 'recuperado' | 'error'>('pendiente');
  const persist = (next: DemoState) => {
    try {
      const serialized = JSON.stringify(next);
      const previous = window.localStorage.getItem(DEMO_STORAGE_KEY);
      if (previous) window.localStorage.setItem(DEMO_BACKUP_KEY, previous);
      window.localStorage.setItem(DEMO_STORAGE_KEY, serialized);
      const savedAt = new Date().toISOString();
      setLastSavedAt(savedAt);
      setPersistenceStatus('guardado');
    } catch { setPersistenceStatus('error'); }
  };
  useEffect(() => {
    const read = (key: string) => {
      const raw = window.localStorage.getItem(key);
      if (!raw) return null;
      const saved = JSON.parse(raw) as Partial<DemoState>;
      if (![5, 6].includes(saved.version || 0) || !Array.isArray(saved.users) || !saved.config) return null;
      return { ...initialDemoState(), ...saved, version: 6 as const, suppliers: (saved.suppliers || suppliers).map((supplier) => ({ ...supplier, terms: normalizePaymentPreference(supplier.terms) })), alerts: saved.alerts || [], alertPreferences: { ...initialDemoState().alertPreferences, ...saved.alertPreferences } };
    };
    try {
      const loaded = read(DEMO_STORAGE_KEY) || read(DEMO_BACKUP_KEY);
      if (loaded) { setState(loaded); setPersistenceStatus(read(DEMO_STORAGE_KEY) ? 'guardado' : 'recuperado'); }
    } catch {
      try { const recovered = read(DEMO_BACKUP_KEY); if (recovered) { setState(recovered); setPersistenceStatus('recuperado'); } else setPersistenceStatus('error'); } catch { setPersistenceStatus('error'); }
    } finally { setHydrated(true); }
  }, []);
  useEffect(() => { if (hydrated) persist(state); }, [hydrated, state]);
  const update = (change: (current: DemoState) => DemoState) => setState((current) => { const next = change(current); persist(next); return next; });
  const restoreDemo = () => { const next = initialDemoState(); setState(next); persist(next); };
  const clearLocalData = () => { const next = emptyDemoState(); setState(next); persist(next); };
  return { state, update, restoreDemo, clearLocalData, lastSavedAt, persistenceStatus };
}
