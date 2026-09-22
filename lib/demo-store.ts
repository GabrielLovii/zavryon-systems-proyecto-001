'use client';

import { useEffect, useState } from 'react';
import { config, initialExpiries, initialOrders, initialPayments, initialReceptions, initialSources, initialUsers, products, supplierProducts, suppliers, today, type AppConfig, type Expiry, type Order, type Payment, type Product, type Reception, type Source, type Supplier, type SupplierProduct, type User } from './mock-data';
import type { AlertPreferences, AppAlert } from './alerts';

export const DEMO_STORAGE_KEY = 'zavryon-abastecimiento-demo-v5';
export type DemoState = { version: 5; config: AppConfig; activeUserId: string; suppliers: Supplier[]; products: Product[]; supplierProducts: SupplierProduct[]; orders: Order[]; receptions: Reception[]; expiries: Expiry[]; sources: Source[]; payments: Payment[]; users: User[]; alerts: AppAlert[]; alertPreferences: AlertPreferences };
export const initialDemoState = (): DemoState => ({ version: 5, config: structuredClone(config), activeUserId: initialUsers[0].id, suppliers: structuredClone(suppliers), products: structuredClone(products), supplierProducts: structuredClone(supplierProducts), orders: structuredClone(initialOrders), receptions: structuredClone(initialReceptions), expiries: structuredClone(initialExpiries), sources: structuredClone(initialSources), payments: structuredClone(initialPayments), users: structuredClone(initialUsers), alerts: [], alertPreferences: { expiries: true, deliveries: true, browser: false, notifiedKeys: [] } });
export const emptyDemoState = (): DemoState => ({ version: 5, config: { companyName: 'ZAVRYON SYSTEMS', productName: 'Control de Abastecimiento', clientName: 'Demo local vacía', businessName: '', address: '', phone: '', headerNote: 'Estado vacío seguro' }, activeUserId: 'usr-recovery-admin', suppliers: [], products: [], supplierProducts: [], orders: [], receptions: [], expiries: [], sources: [], payments: [], users: [{ id: 'usr-recovery-admin', name: 'Administrador', email: '', role: 'Administrador', active: true, createdAt: today }], alerts: [], alertPreferences: { expiries: true, deliveries: true, browser: false, notifiedKeys: [] } });

export function useDemoState() {
  const [state, setState] = useState<DemoState>(initialDemoState);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { try { const raw = window.localStorage.getItem(DEMO_STORAGE_KEY); if (raw) { const saved = JSON.parse(raw) as Partial<DemoState>; if (saved?.version === 5 && Array.isArray(saved.users) && saved.config) setState({ ...initialDemoState(), ...saved, alerts: saved.alerts || [], alertPreferences: { ...initialDemoState().alertPreferences, ...saved.alertPreferences } }); } } catch { /* local demo storage is optional */ } finally { setHydrated(true); } }, []);
  useEffect(() => { if (hydrated) window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state)); }, [hydrated, state]);
  const update = (change: (current: DemoState) => DemoState) => setState((current) => change(current));
  return { state, update, restoreDemo: () => setState(initialDemoState()), clearLocalData: () => { window.localStorage.removeItem(DEMO_STORAGE_KEY); setState(emptyDemoState()); } };
}
