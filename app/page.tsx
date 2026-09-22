'use client';

import { useState } from 'react';
import { Sidebar, type Section } from '@/components/sidebar';
import { Dashboard } from '@/components/dashboard';
import { NewOrder } from '@/components/new-order';
import { useDemoState } from '@/lib/demo-store';

export default function Home() {
  const [section, setSection] = useState<Section>('Inicio');
  const demo = useDemoState();
  return <div className="flex min-h-screen"><Sidebar active={section} onNavigate={setSection} state={demo.state} update={demo.update} /><main className="min-w-0 flex-1"><div className="mx-auto max-w-[1500px] px-5 pt-3 lg:px-10 lg:pt-5"><header className="mb-3 flex min-h-12 items-center gap-3 border-b border-white/10 pb-3" aria-label="Identidad de la aplicación"><img src="/logo-scpr.jpg" alt="Logo SCPR" className="h-10 w-10 shrink-0 rounded-md object-contain" /><span className="truncate text-sm font-bold text-white">Control de Abastecimiento</span></header>{section === 'Nuevo pedido' ? <NewOrder state={demo.state} update={demo.update} notify={() => undefined} onNavigate={setSection} /> : <Dashboard section={section} onNavigate={setSection} demo={demo} />}</div></main></div>;
}
