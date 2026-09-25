'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Sidebar, sections, type Section } from '@/components/sidebar';
import { Dashboard } from '@/components/dashboard';
import { useDemoState } from '@/lib/demo-store';
import { useCloudSync } from '@/lib/cloud-sync';
import { readUiState, restoreScroll, saveScroll, usePageHidden, writeUiState } from '@/lib/ui-state';

const sectionFromHash = (): Section | null => {
  const value = decodeURIComponent(window.location.hash.slice(1));
  return sections.includes(value as Section) ? value as Section : null;
};

export default function Home() {
  const [section, setSection] = useState<Section>('Inicio');
  const [menuOpen, setMenuOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const demo = useDemoState();
  const cloud = useCloudSync(demo);

  // The section lives in the URL hash so reloads keep the screen and the back button works. Opening the
  // installed app without a hash (start_url) returns to the last section used on this device.
  useEffect(() => {
    const sync = () => setSection(sectionFromHash() || 'Inicio');
    const remembered = readUiState<string>('section', 'Inicio', (value) => sections.includes(value as Section));
    if (!sectionFromHash() && remembered !== 'Inicio') window.history.replaceState(null, '', `#${encodeURIComponent(remembered)}`);
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  const navigate = useCallback((next: Section) => {
    setMenuOpen(false);
    saveScroll(sectionFromHash() || 'Inicio');
    setSection(next);
    if (sectionFromHash() !== next) window.location.hash = encodeURIComponent(next);
    window.scrollTo({ top: 0 });
  }, []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  useEffect(() => { writeUiState('section', section); }, [section]);

  // Pause/resume: remember the scroll of the current screen when the app goes to the background and put it
  // back after a reload or a discarded tab. Manual restoration so the browser doesn't jump first.
  const restoredOnce = useRef(false);
  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
    if (!demo.hydrated || restoredOnce.current) return;
    restoredOnce.current = true;
    return restoreScroll(sectionFromHash() || 'Inicio');
  }, [demo.hydrated]);
  usePageHidden(() => saveScroll(sectionFromHash() || 'Inicio'));
  useEffect(() => {
    let timer = 0;
    const onScroll = () => { window.clearTimeout(timer); timer = window.setTimeout(() => saveScroll(sectionFromHash() || 'Inicio'), 400); };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.clearTimeout(timer); window.removeEventListener('scroll', onScroll); };
  }, []);

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

  return <div className="flex min-h-screen">
    <button type="button" onClick={() => document.getElementById('contenido')?.focus()} className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[90] focus:rounded-lg focus:bg-cyan-600 focus:px-4 focus:py-2 focus:font-bold focus:text-white">Saltar al contenido</button>
    <Sidebar active={section} onNavigate={navigate} state={demo.state} update={demo.update} open={menuOpen} onClose={closeMenu} />
    <Dashboard section={section} onNavigate={navigate} onOpenMenu={() => setMenuOpen(true)} demo={demo} cloud={cloud} installPromptAvailable={Boolean(installPrompt)} installed={installed} onInstallPrompt={install} />
  </div>;
}

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }> };
