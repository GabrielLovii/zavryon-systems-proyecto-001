'use client';

import { useRef, useState } from 'react';
import { ArrowDownTrayIcon, ArrowPathIcon, ArrowUpTrayIcon, CloudIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { AppConfig } from '@/lib/mock-data';
import type { useDemoState } from '@/lib/demo-store';
import type { CloudSync } from '@/lib/cloud-sync';
import { downloadJson } from '@/lib/format';
import { CloudPanel } from './cloud-panel';

type Demo = ReturnType<typeof useDemoState>;
type Props = { demo: Demo; cloud: CloudSync; notify: (message: string) => void; installPromptAvailable: boolean; installed: boolean; onInstallPrompt: () => Promise<void> };

function Section({ title, subtitle, children, tone = 'default', icon }: { title: string; subtitle?: string; children: React.ReactNode; tone?: 'default' | 'danger' | 'accent'; icon?: React.ReactNode }) {
  const tones = { default: 'border-white/10', danger: 'border-red-400/40 bg-red-950/20', accent: 'border-cyan-300/30 bg-cyan-400/5' };
  return <section className={`rounded-2xl border p-4 sm:p-5 ${tones[tone]}`}><div className="mb-4 flex items-start gap-3">{icon}<div><h3 className="font-bold text-white">{title}</h3>{subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}</div></div>{children}</section>;
}

export function Settings({ demo, cloud, notify, installPromptAvailable, installed, onInstallPrompt }: Props) {
  const [config, setConfig] = useState<AppConfig>(demo.state.config);
  const [dialog, setDialog] = useState<null | 'borrar' | 'restaurar'>(null);
  const [confirmation, setConfirmation] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const configChanged = JSON.stringify(config) !== JSON.stringify(demo.state.config);

  const saveConfig = () => {
    if (!config.clientName.trim()) return notify('El nombre del negocio es obligatorio');
    demo.update((current) => ({ ...current, config: { ...config, clientName: config.clientName.trim(), businessName: config.businessName.trim() || config.clientName.trim() } }));
    notify('Datos del negocio guardados');
  };
  const exportBackup = () => { downloadJson(`abastecimiento-respaldo-${new Date().toISOString().slice(0, 10)}.json`, demo.state); notify('Copia de seguridad descargada'); };
  const importBackup = async (file: File | undefined) => {
    if (!file) return;
    try {
      if (file.size > 15 * 1024 * 1024) throw new Error('El archivo supera 15 MB');
      const parsed = JSON.parse(await file.text()) as unknown;
      if (!window.confirm('Importar esta copia reemplaza todos los datos actuales (y los de la nube si tenés sesión iniciada). ¿Continuar?')) return;
      if (!demo.replaceState(parsed)) throw new Error('El archivo no es una copia válida de esta aplicación');
      setConfig((parsed as { config: AppConfig }).config);
      notify('Copia de seguridad importada');
    } catch (error) { notify(`No se pudo importar: ${error instanceof Error ? error.message : 'archivo inválido'}`); }
    finally { if (fileInput.current) fileInput.current.value = ''; }
  };
  const confirmDialog = () => {
    if (dialog === 'borrar' && confirmation === 'BORRAR') { demo.clearLocalData(); notify('Datos borrados. La aplicación quedó lista para empezar de nuevo.'); }
    else if (dialog === 'restaurar' && confirmation === 'RESTAURAR') { demo.restoreDemo(); notify('Datos demo restaurados.'); }
    else return;
    setDialog(null); setConfirmation('');
  };
  const field = (key: keyof AppConfig, label: string, placeholder = '') => <label className="text-xs font-semibold text-slate-300">{label}<input className="field mt-1 w-full" value={config[key]} placeholder={placeholder} onChange={(event) => setConfig({ ...config, [key]: event.target.value })} /></label>;

  return <div className="space-y-5">
    <Section title="Guardado en la nube" subtitle="Tus datos seguros aunque cierres el navegador o cambies de dispositivo" tone="accent" icon={<CloudIcon className="h-6 w-6 shrink-0 text-cyan-300" />}><CloudPanel cloud={cloud} notify={notify} /></Section>

    <Section title="Datos del negocio" subtitle="Aparecen en el encabezado, los PDF y los mensajes a proveedores">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{field('clientName', 'Nombre del negocio *')}{field('businessName', 'Razón social')}{field('phone', 'Teléfono')}{field('address', 'Dirección')}{field('headerNote', 'Nota para PDF', 'Ej.: Horario de descarga 8 a 12 h')}</div>
      <div className="mt-4 flex flex-wrap gap-2"><button type="button" className="button-primary" disabled={!configChanged} onClick={saveConfig}>Guardar datos</button>{configChanged && <button type="button" className="button-secondary" onClick={() => setConfig(demo.state.config)}>Descartar</button>}</div>
    </Section>

    <div className="grid gap-5 lg:grid-cols-2">
      <Section title="Copia de seguridad" subtitle="Un archivo con todos los datos, para guardar o pasar a otro equipo">
        <p className="text-sm text-slate-300">{demo.lastSavedAt ? `Último guardado en este dispositivo: ${new Date(demo.lastSavedAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}` : 'Guardado en este dispositivo: pendiente'}</p>
        <div className="mt-4 flex flex-wrap gap-2"><button type="button" className="button-secondary" onClick={exportBackup}><ArrowDownTrayIcon className="h-4 w-4" /> Descargar copia</button><button type="button" className="button-secondary" onClick={() => fileInput.current?.click()}><ArrowUpTrayIcon className="h-4 w-4" /> Importar copia</button><input ref={fileInput} type="file" accept="application/json,.json" className="hidden" onChange={(event) => void importBackup(event.target.files?.[0])} /></div>
      </Section>
      <Section title="Instalar en el celular" subtitle="Funciona como una app, con acceso directo y sin barra del navegador">
        {installed ? <p className="text-sm text-emerald-200" role="status">La aplicación ya está instalada en este dispositivo.</p> : installPromptAvailable ? <button type="button" className="button-primary" onClick={() => void onInstallPrompt()}>Instalar aplicación</button> : <p className="text-sm leading-6 text-slate-300">En Chrome Android: menú <strong className="text-white">⋮</strong> → <strong className="text-white">Instalar aplicación</strong> o <strong className="text-white">Agregar a pantalla principal</strong>. En iPhone: Compartir → <strong className="text-white">Agregar a inicio</strong>.</p>}
      </Section>
    </div>

    <Section title="Zona de riesgo" subtitle="Acciones que reemplazan los datos actuales (también en la nube si hay sesión iniciada)" tone="danger" icon={<TrashIcon className="h-6 w-6 shrink-0 text-red-300" />}>
      <div className="flex flex-wrap gap-2"><button type="button" className="button-secondary" onClick={() => { setConfirmation(''); setDialog('restaurar'); }}><ArrowPathIcon className="h-4 w-4" /> Restaurar datos demo</button><button type="button" className="button-danger" onClick={() => { setConfirmation(''); setDialog('borrar'); }}><TrashIcon className="h-4 w-4" /> Borrar todos los datos</button></div>
      <p className="mt-3 text-xs text-slate-400">Consejo: descargá una copia de seguridad antes. Con sesión en la nube, la versión anterior queda en “Versiones anteriores”.</p>
    </Section>

    {dialog && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null); }}><div className="modal-card" role="alertdialog" aria-modal="true" aria-labelledby="danger-title">
      <h3 id="danger-title" className="text-lg font-bold text-white">{dialog === 'borrar' ? 'Borrar todos los datos' : 'Restaurar datos demo'}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-300">{dialog === 'borrar' ? 'Se eliminan proveedores, productos, stock, pedidos, recepciones, pagos y usuarios. Queda un administrador para seguir usando la app.' : 'Se reemplazan los datos actuales por los datos de ejemplo.'} Escribí <strong className="text-white">{dialog === 'borrar' ? 'BORRAR' : 'RESTAURAR'}</strong> para confirmar.</p>
      <input aria-label="Confirmación" className="field mt-4 w-full" value={confirmation} onChange={(event) => setConfirmation(event.target.value.toUpperCase())} autoComplete="off" autoFocus />
      <div className="mt-5 flex justify-end gap-2"><button type="button" className="button-secondary" onClick={() => setDialog(null)}>Cancelar</button><button type="button" className={dialog === 'borrar' ? 'button-danger' : 'button-primary'} disabled={confirmation !== (dialog === 'borrar' ? 'BORRAR' : 'RESTAURAR')} onClick={confirmDialog}>{dialog === 'borrar' ? 'Borrar definitivamente' : 'Restaurar demo'}</button></div>
    </div></div>}
  </div>;
}
