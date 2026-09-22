'use client';

import { useEffect, useState } from 'react';
import { isSupabaseConfigured } from '@/lib/supabase';

type Health = { configured: boolean; connected: boolean; mode: 'supabase' | 'demo-local' };

export function SupabaseStatus() {
  const [health, setHealth] = useState<Health>({ configured: isSupabaseConfigured(), connected: false, mode: 'demo-local' });
  useEffect(() => { fetch('/api/supabase-health').then((response) => response.json() as Promise<Health>).then(setHealth).catch(() => undefined); }, []);
  const connected = health.configured && health.connected;
  return <div className={`rounded-xl border p-4 ${connected ? 'border-emerald-400/30 bg-emerald-400/10' : 'border-amber-400/30 bg-amber-400/10'}`} role="status"><div className="flex items-center justify-between gap-3"><div className="font-bold text-white">Conexión de datos</div><span className={connected ? 'badge-green' : 'badge-amber'}>{connected ? 'Supabase conectado' : 'Demo local'}</span></div><p className="mt-2 text-xs text-slate-300">{connected ? 'La API responde y RLS controla el acceso. El flujo demo sigue respaldado por localStorage.' : health.configured ? 'Supabase está configurado, pero no responde con acceso a business_settings. La app continúa en modo demo local.' : 'Faltan variables públicas de Supabase. La app continúa funcionando en modo demo local.'}</p></div>;
}
