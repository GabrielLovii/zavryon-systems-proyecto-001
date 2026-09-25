'use client';

import { useEffect, useState } from 'react';
import { ArchiveBoxIcon, BellAlertIcon, CalendarDaysIcon, ChartBarIcon, ClipboardDocumentListIcon, ClockIcon, Cog6ToothIcon, CubeIcon, DocumentPlusIcon, DocumentTextIcon, HomeIcon, InboxArrowDownIcon, QrCodeIcon, RectangleStackIcon, ShieldCheckIcon, TruckIcon, UsersIcon, WalletIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { DemoState } from '@/lib/demo-store';
import { DEMO_TODAY, daysUntil, effectiveStatus, latestPerSource } from '@/lib/alerts';
import { getLocalDateISO } from '@/lib/date';
import { needsRestock } from '@/lib/stock';
import { LogoMark } from './logo';

export type Section = 'Inicio' | 'Abastecimiento' | 'Pedidos' | 'Nuevo pedido' | 'Recepcion' | 'Proveedores' | 'Proveedores llegados' | 'Catalogo' | 'Codigos' | 'Fuentes' | 'Vencimientos' | 'Agenda' | 'Notificaciones' | 'Historial' | 'Economia' | 'Pagos' | 'Usuarios' | 'Configuración';

/** Human labels (with accents) for each section; the keys stay stable for navigation and deep links. */
export const sectionLabels: Record<Section, string> = { Inicio: 'Inicio', Abastecimiento: 'Abastecimiento', Pedidos: 'Pedidos', 'Nuevo pedido': 'Nuevo pedido', Recepcion: 'Recepción', Proveedores: 'Proveedores', 'Proveedores llegados': 'Proveedores llegados', Catalogo: 'Catálogo', Codigos: 'Códigos de barras', Fuentes: 'Fuentes de catálogos', Vencimientos: 'Vencimientos', Agenda: 'Agenda', Notificaciones: 'Notificaciones', Historial: 'Historial', Economia: 'Economía', Pagos: 'Pagos', Usuarios: 'Usuarios', Configuración: 'Configuración' };

const groups: { title: string; items: [Section, typeof HomeIcon][] }[] = [
  { title: 'Operación', items: [['Inicio', HomeIcon], ['Abastecimiento', RectangleStackIcon], ['Pedidos', ClipboardDocumentListIcon], ['Nuevo pedido', DocumentPlusIcon], ['Recepcion', InboxArrowDownIcon], ['Proveedores llegados', TruckIcon]] },
  { title: 'Catálogo y proveedores', items: [['Proveedores', UsersIcon], ['Catalogo', CubeIcon], ['Codigos', QrCodeIcon], ['Fuentes', DocumentTextIcon]] },
  { title: 'Seguimiento', items: [['Vencimientos', ClockIcon], ['Agenda', CalendarDaysIcon], ['Notificaciones', BellAlertIcon], ['Historial', ArchiveBoxIcon]] },
  { title: 'Finanzas', items: [['Economia', ChartBarIcon], ['Pagos', WalletIcon]] },
  { title: 'Administración', items: [['Usuarios', ShieldCheckIcon], ['Configuración', Cog6ToothIcon]] },
];
export const sections: Section[] = groups.flatMap((group) => group.items.map(([section]) => section));

export function Sidebar({ active, onNavigate, state, update, open, onClose }: { active: Section; onNavigate: (section: Section) => void; state: DemoState; update: (change: (state: DemoState) => DemoState) => void; open: boolean; onClose: () => void }) {
  const activeUser = state.users.find((user) => user.id === state.activeUserId && user.active) || state.users.find((user) => user.active);
  const [referenceDate, setReferenceDate] = useState(DEMO_TODAY);
  useEffect(() => { setReferenceDate(getLocalDateISO()); }, []);
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open, onClose]);
  const badges: Partial<Record<Section, number>> = {
    Abastecimiento: state.products.filter((product) => product.active && needsRestock(product)).length,
    Vencimientos: state.expiries.filter((expiry) => daysUntil(expiry.date, referenceDate) <= 3).length,
    Notificaciones: latestPerSource(state.alerts.filter((alert) => effectiveStatus(alert, referenceDate) === 'activa')).length,
  };
  const selectUser = (id: string) => update((current) => ({ ...current, activeUserId: id }));
  return <>
    {open && <button type="button" aria-label="Cerrar menú" className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={onClose} />}
    <aside id="app-sidebar" className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-white/10 bg-ink text-white shadow-2xl transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:translate-x-0 lg:shadow-none ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
        <LogoMark className="h-11 w-11 shrink-0" />
        <div className="min-w-0 flex-1"><div className="text-[10px] font-bold uppercase tracking-[.2em] text-cyan-300">{state.config.companyName}</div><div className="text-[15px] font-bold leading-tight">{state.config.productName}</div></div>
        <button type="button" aria-label="Cerrar menú" onClick={onClose} className="icon-button lg:hidden"><XMarkIcon className="h-6 w-6" /></button>
      </div>
      <nav aria-label="Módulos" className="scrollbar-none flex-1 overflow-y-auto px-3 py-4">
        {groups.map((group) => <div key={group.title} className="mb-4">
          <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">{group.title}</div>
          {group.items.map(([section, Icon]) => {
            const count = badges[section] || 0;
            const current = active === section;
            return <button key={section} type="button" aria-current={current ? 'page' : undefined} onClick={() => onNavigate(section)} className={`relative flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${current ? 'bg-cyan-400/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
              {current && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-1 rounded-r bg-cyan-400" />}
              <Icon aria-hidden="true" className={`h-5 w-5 shrink-0 ${current ? 'text-cyan-300' : ''}`} />
              <span className="min-w-0 flex-1 truncate">{sectionLabels[section]}</span>
              {count > 0 && <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-amber-950" aria-label={`${count} pendiente(s)`}>{count}</span>}
            </button>;
          })}
        </div>)}
      </nav>
      <div className="border-t border-white/10 p-4">
        <label className="block text-xs font-semibold text-slate-400" htmlFor="active-user">Usuario activo</label>
        <select id="active-user" className="field mt-2 w-full" value={activeUser?.id || ''} onChange={(event) => selectUser(event.target.value)}>{state.users.filter((user) => user.active).map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select>
        <div className="mt-2 text-xs text-slate-500">{activeUser?.role || 'Sin usuario activo'}</div>
      </div>
    </aside>
  </>;
}
