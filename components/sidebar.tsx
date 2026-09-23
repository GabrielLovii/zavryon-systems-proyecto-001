'use client';

import { useEffect, useState } from 'react';
import { ArchiveBoxIcon, Bars3Icon, BellAlertIcon, CalendarDaysIcon, ChartBarIcon, ClipboardDocumentListIcon, ClockIcon, Cog6ToothIcon, CubeIcon, DocumentTextIcon, HomeIcon, ShieldCheckIcon, TruckIcon, UsersIcon, WalletIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { DemoState } from '@/lib/demo-store';
import { DEMO_TODAY, effectiveStatus } from '@/lib/alerts';
import { getLocalDateISO } from '@/lib/date';

export type Section = 'Inicio' | 'Pedidos' | 'Nuevo pedido' | 'Recepcion' | 'Proveedores' | 'Proveedores llegados' | 'Catalogo' | 'Fuentes' | 'Vencimientos' | 'Agenda' | 'Notificaciones' | 'Historial' | 'Economia' | 'Pagos' | 'Usuarios' | 'Configuración';
const nav: [Section, typeof HomeIcon][] = [['Inicio', HomeIcon], ['Pedidos', ClipboardDocumentListIcon], ['Nuevo pedido', DocumentTextIcon], ['Recepcion', TruckIcon], ['Proveedores llegados', TruckIcon], ['Proveedores', UsersIcon], ['Catalogo', CubeIcon], ['Fuentes', DocumentTextIcon], ['Vencimientos', ClockIcon], ['Agenda', CalendarDaysIcon], ['Notificaciones', BellAlertIcon], ['Historial', ArchiveBoxIcon], ['Economia', ChartBarIcon], ['Pagos', WalletIcon], ['Usuarios', ShieldCheckIcon], ['Configuración', Cog6ToothIcon]];

export function Sidebar({ active, onNavigate, state, update }: { active: Section; onNavigate: (section: Section) => void; state: DemoState; update: (change: (state: DemoState) => DemoState) => void }) {
  const [open, setOpen] = useState(true);
  const activeUser = state.users.find((user) => user.id === state.activeUserId) || state.users.find((user) => user.active);
  const [referenceDate, setReferenceDate] = useState(DEMO_TODAY);
  useEffect(() => {
    setReferenceDate(getLocalDateISO());
    if (window.innerWidth < 1024) setOpen(false);
  }, []);
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);
  const selectUser = (id: string) => update((current) => ({ ...current, activeUserId: id }));
  return <>
    <button aria-label={open ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={open} onClick={() => setOpen((current) => !current)} className="fixed left-4 top-4 z-50 rounded-lg bg-ink p-2 text-white shadow-lg"><Bars3Icon className="h-6 w-6" /></button>
    {open && <button aria-label="Cerrar menú" className="fixed inset-0 z-30 bg-ink/30 lg:hidden" onClick={() => setOpen(false)} />}
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-ink text-white shadow-2xl transition-transform lg:static lg:shadow-none ${open ? 'translate-x-0' : '-translate-x-full lg:hidden'}`}>
      <div className="flex h-24 items-center justify-between border-b border-white/10 px-7"><div><div className="text-[11px] font-bold uppercase tracking-[.2em] text-cyan-300">{state.config.companyName}</div><div className="mt-1 text-xl font-bold tracking-tight">{state.config.productName}</div><div className="mt-1 text-xs text-slate-400">{state.config.clientName}</div></div><button aria-label="Cerrar menú" onClick={() => setOpen(false)} className="lg:hidden"><XMarkIcon className="h-6 w-6" /></button></div>
      <nav aria-label="Módulos" className="scrollbar-none flex-1 space-y-1 overflow-y-auto px-3 py-6">{nav.map(([label, Icon]) => <button key={label} type="button" aria-current={active === label ? 'page' : undefined} onClick={() => { onNavigate(label); setOpen(false); }} className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm font-semibold transition ${active === label ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}><Icon className="h-5 w-5" />{label}{label === 'Vencimientos' && <span className="ml-auto rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-amber-950">{state.expiries.length}</span>}{label === 'Notificaciones' && <span className="ml-auto rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-amber-950">{state.alerts.filter((alert) => effectiveStatus(alert, referenceDate) === 'activa').length}</span>}</button>)}</nav>
      <div className="border-t border-white/10 p-5"><label className="block text-xs font-semibold text-slate-400" htmlFor="active-user">Usuario activo</label><select id="active-user" aria-label="Seleccionar usuario activo" className="field mt-2 w-full" value={activeUser?.id || ''} onChange={(event) => selectUser(event.target.value)}>{state.users.filter((user) => user.active).map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select><div className="mt-2 text-xs text-slate-500">{activeUser?.role || 'Sin usuario activo'}</div></div>
    </aside>
  </>;
}
