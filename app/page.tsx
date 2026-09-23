'use client';

import { useEffect, useState } from 'react';
import { Sidebar, type Section } from '@/components/sidebar';
import { Dashboard } from '@/components/dashboard';
import { NewOrder } from '@/components/new-order';
import { OrdersWorkspace } from '@/components/order-editor';
import { useDemoState } from '@/lib/demo-store';
import { currentGreeting, formatDateEs, getLocalDateISO } from '@/lib/date';

export default function Home() {
  const [section, setSection] = useState<Section>('Inicio');
  const [today, setToday] = useState('');
  const [greeting, setGreeting] = useState('');
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const demo = useDemoState();
  useEffect(() => { const now = new Date(); setToday(getLocalDateISO(now)); setGreeting(currentGreeting(now)); }, []);
  useEffect(() => { if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => undefined); }, []);
  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    setInstalled(standalone);
    const capture = (event: Event) => { event.preventDefault(); setInstallPrompt(event as BeforeInstallPromptEvent); };
    const complete = () => { setInstalled(true); setInstallPrompt(null); };
    window.addEventListener('beforeinstallprompt', capture);
    window.addEventListener('appinstalled', complete);
    return () => { window.removeEventListener('beforeinstallprompt', capture); window.removeEventListener('appinstalled', complete); };
  }, []);
  const install = async () => {
    const prompt = installPrompt;
    if (!prompt || installed) return;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    setInstallPrompt(null);
    if (choice.outcome === 'accepted') setInstalled(true);
  };
  const activeUser = demo.state.users.find((user) => user.id === demo.state.activeUserId) || demo.state.users.find((user) => user.active);
  return <div className="flex min-h-screen"><Sidebar active={section} onNavigate={setSection} state={demo.state} update={demo.update} /><main className="min-w-0 flex-1"><div className="mx-auto max-w-[1500px] px-5 pt-3 lg:px-10 lg:pt-5"><header className="mb-3 flex min-h-12 items-center gap-3 border-b border-white/10 pb-3" aria-label="Identidad de la aplicación"><img src="/logo-scpr.jpg" alt="Logo SCPR" className="h-10 w-10 shrink-0 rounded-md object-contain" /><div className="min-w-0 flex-1"><div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-1"><span className="header-context min-w-0 max-w-full truncate text-sm font-bold text-white">{today ? formatDateEs(today, { dateStyle: undefined, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Fecha local'}</span><span className="header-context min-w-0 max-w-full truncate text-right text-sm font-bold text-white" title={demo.state.config.clientName}>{demo.state.config.clientName}</span></div><span className="block truncate text-xs text-cyan-200">{greeting}{activeUser ? `, ${activeUser.name}` : ''}</span></div></header>{section === 'Nuevo pedido' ? <NewOrder state={demo.state} update={demo.update} notify={() => undefined} onNavigate={setSection} /> : section === 'Pedidos' ? <OrdersWorkspace state={demo.state} update={demo.update} onNavigate={setSection} /> : <Dashboard section={section} onNavigate={setSection} demo={demo} installPromptAvailable={Boolean(installPrompt)} installed={installed} onInstallPrompt={install} />}</div></main></div>;
}

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }> };
