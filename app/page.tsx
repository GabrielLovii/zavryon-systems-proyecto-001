'use client';

import { useEffect, useState } from 'react';
import { Sidebar, type Section } from '@/components/sidebar';
import { Dashboard } from '@/components/dashboard';
import { NewOrder } from '@/components/new-order';
import { useDemoState } from '@/lib/demo-store';
import { currentGreeting, formatDateEs, getLocalDateISO } from '@/lib/date';

export default function Home() {
  const [section, setSection] = useState<Section>('Inicio');
  const [today, setToday] = useState('');
  const [greeting, setGreeting] = useState('');
  const demo = useDemoState();
  useEffect(() => { const now = new Date(); setToday(getLocalDateISO(now)); setGreeting(currentGreeting(now)); }, []);
  const activeUser = demo.state.users.find((user) => user.id === demo.state.activeUserId) || demo.state.users.find((user) => user.active);
  return <div className="flex min-h-screen"><Sidebar active={section} onNavigate={setSection} state={demo.state} update={demo.update} /><main className="min-w-0 flex-1"><div className="mx-auto max-w-[1500px] px-5 pt-3 lg:px-10 lg:pt-5"><header className="mb-3 flex min-h-12 items-center gap-3 border-b border-white/10 pb-3" aria-label="Identidad de la aplicación"><img src="/logo-scpr.jpg" alt="Logo SCPR" className="h-10 w-10 shrink-0 rounded-md object-contain" /><div className="min-w-0"><span className="block truncate text-sm font-bold text-white">{today ? formatDateEs(today, { dateStyle: undefined, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Fecha local'}</span><span className="block truncate text-xs text-cyan-200">{greeting}{activeUser ? `, ${activeUser.name}` : ''}</span></div></header>{section === 'Nuevo pedido' ? <NewOrder state={demo.state} update={demo.update} notify={() => undefined} onNavigate={setSection} /> : <Dashboard section={section} onNavigate={setSection} demo={demo} />}</div></main></div>;
}
