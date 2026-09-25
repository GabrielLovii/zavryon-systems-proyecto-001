'use client';

import { useState } from 'react';
import { ArrowPathIcon, CloudArrowUpIcon, CloudIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import type { CloudStatus, CloudSync, CloudVersion } from '@/lib/cloud-sync';

export const cloudStatusLabels: Record<CloudStatus, string> = { 'no-configurado': 'Nube no configurada', 'sin-sesion': 'Solo en este dispositivo', conectando: 'Conectando…', sincronizado: 'Guardado en la nube', pendiente: 'Cambios por guardar', guardando: 'Guardando…', 'sin-conexion': 'Sin conexión · se sube al volver', conflicto: 'Revisar cambios', error: 'Error al sincronizar' };
const statusTone: Record<CloudStatus, string> = { 'no-configurado': 'text-slate-400', 'sin-sesion': 'text-amber-300', conectando: 'text-slate-300', sincronizado: 'text-emerald-300', pendiente: 'text-cyan-300', guardando: 'text-cyan-300', 'sin-conexion': 'text-amber-300', conflicto: 'text-red-300', error: 'text-red-300' };
const when = (value: string) => new Date(value).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });

/** Compact status shown in the top bar; tapping it opens Configuración. */
export function CloudBadge({ cloud, onClick }: { cloud: CloudSync; onClick: () => void }) {
  const Icon = cloud.status === 'sincronizado' ? CloudIcon : cloud.status === 'error' || cloud.status === 'conflicto' ? ExclamationTriangleIcon : CloudArrowUpIcon;
  return <button type="button" onClick={onClick} className={`icon-button border border-white/10 ${statusTone[cloud.status]}`} aria-label={`Nube: ${cloudStatusLabels[cloud.status]}`} title={cloudStatusLabels[cloud.status]}><Icon className={`h-5 w-5 ${cloud.status === 'guardando' || cloud.status === 'conectando' ? 'animate-pulse' : ''}`} /></button>;
}

export function CloudPanel({ cloud, notify }: { cloud: CloudSync; notify: (message: string) => void }) {
  const [mode, setMode] = useState<'entrar' | 'crear'>('entrar');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [versions, setVersions] = useState<CloudVersion[] | null>(null);

  if (!cloud.configured) return <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">La nube no está configurada en este despliegue (faltan las variables de Supabase). Los datos se guardan solo en este dispositivo.</div>;

  const submit = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setMessage('Ingresá un email válido');
    if (password.length < 8) return setMessage('La contraseña debe tener al menos 8 caracteres');
    setBusy(true); setMessage('');
    if (mode === 'entrar') { const error = await cloud.signIn(email, password); setMessage(error || ''); if (!error) notify('Sesión iniciada: sincronizando tus datos'); }
    else { const result = await cloud.signUp(email, password); setMessage(result.error || (result.needsConfirmation ? 'Te enviamos un email para confirmar la cuenta. Abrí el enlace y después entrá acá.' : '')); if (!result.error && !result.needsConfirmation) notify('Cuenta creada: tus datos se suben a la nube'); }
    setBusy(false);
  };
  const forgot = async () => { if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setMessage('Escribí tu email arriba para enviarte el enlace'); const error = await cloud.resetPassword(email); setMessage(error || 'Te enviamos un enlace para cambiar la contraseña.'); };
  const loadVersions = async () => { setVersions(await cloud.listVersions()); };
  const restore = async (version: CloudVersion) => { if (!window.confirm(`¿Volver a la versión guardada el ${when(version.savedAt)}? Lo actual queda en el historial.`)) return; if (await cloud.restoreVersion(version.id)) { notify('Versión restaurada; se guarda en la nube en unos segundos'); setVersions(null); } else notify('No se pudo restaurar esa versión'); };

  if (!cloud.session) return <div>
    <p className="text-sm leading-6 text-slate-300">Creá una cuenta o entrá para guardar todo en la nube. Así no perdés nada al cerrar el navegador y podés usar los mismos datos en la PC y en el celular.</p>
    <div role="tablist" className="tab-list mt-4">{(['entrar', 'crear'] as const).map((item) => <button key={item} type="button" role="tab" aria-selected={mode === item} className="tab" onClick={() => { setMode(item); setMessage(''); }}>{item === 'entrar' ? 'Entrar' : 'Crear cuenta'}</button>)}</div>
    <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <label className="text-xs font-semibold text-slate-300">Email<input className="field mt-1 w-full" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <label className="text-xs font-semibold text-slate-300">Contraseña<input className="field mt-1 w-full" type="password" autoComplete={mode === 'entrar' ? 'current-password' : 'new-password'} minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2"><button type="submit" className="button-primary" disabled={busy}>{busy ? 'Procesando…' : mode === 'entrar' ? 'Entrar y sincronizar' : 'Crear cuenta'}</button>{mode === 'entrar' && <button type="button" className="link-button" onClick={() => void forgot()}>Olvidé mi contraseña</button>}</div>
    </form>
    {message && <p role="status" className="mt-3 text-sm text-amber-200">{message}</p>}
    <p className="mt-3 text-xs text-slate-500">Al entrar por primera vez, lo que tengas en este dispositivo se sube a tu cuenta. Si la cuenta ya tiene datos, se te pregunta cuál conservar.</p>
  </div>;

  return <div>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><div className={`text-sm font-bold ${statusTone[cloud.status]}`}>{cloudStatusLabels[cloud.status]}</div><div className="mt-1 text-xs text-slate-400">Cuenta: {cloud.email}{cloud.lastSyncAt ? ` · última sincronización ${when(cloud.lastSyncAt)}` : ''}</div>{cloud.error && cloud.status === 'error' && <div className="mt-1 text-xs text-red-300">{cloud.error}</div>}</div>
      <div className="flex flex-wrap gap-2"><button type="button" className="button-secondary" onClick={() => void cloud.syncNow()}><ArrowPathIcon className="h-4 w-4" /> Sincronizar ahora</button><button type="button" className="button-secondary" onClick={() => void loadVersions()}>Versiones anteriores</button><button type="button" className="button-secondary" onClick={() => void cloud.signOut().then(() => notify('Sesión cerrada. Los datos siguen en este dispositivo y en la nube.'))}>Cerrar sesión</button></div>
    </div>
    <p className="mt-3 text-xs leading-5 text-slate-400">Cada cambio se guarda en este dispositivo al instante y se sube a la nube a los pocos segundos. Sin internet seguís trabajando; se sube solo al volver la conexión. Solo se pierden datos si restaurás la demo o borrás los datos.</p>
    {versions && <div className="mt-4 rounded-xl border border-white/10 p-3"><div className="mb-2 flex items-center justify-between"><h5 className="text-sm font-bold text-white">Versiones anteriores (últimas 30)</h5><button type="button" className="link-button" onClick={() => setVersions(null)}>Cerrar</button></div>{versions.length ? <ul className="max-h-64 space-y-1 overflow-y-auto">{versions.map((version) => <li key={version.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/5"><span className="text-slate-300">{when(version.savedAt)} <span className="text-xs text-slate-500">· v{version.revision}{version.device ? ` · ${version.device}` : ''}</span></span><button type="button" className="button-secondary" onClick={() => void restore(version)}>Restaurar</button></li>)}</ul> : <p className="text-sm text-slate-400">Todavía no hay versiones anteriores.</p>}</div>}
  </div>;
}

/** Shown when this device and the cloud both changed since the last sync. */
export function CloudConflictDialog({ cloud }: { cloud: CloudSync }) {
  if (!cloud.conflict) return null;
  const { conflict } = cloud;
  return <div className="modal-backdrop" role="presentation"><div className="modal-card" role="alertdialog" aria-modal="true" aria-labelledby="cloud-conflict-title">
    <h3 id="cloud-conflict-title" className="text-lg font-bold text-white">Hay cambios en otro dispositivo</h3>
    <p className="mt-3 text-sm leading-6 text-slate-300">La nube tiene una versión guardada el <strong className="text-white">{when(conflict.updatedAt)}</strong>{conflict.device ? ` desde ${conflict.device}` : ''}, y este dispositivo también tiene cambios sin subir. ¿Cuál querés conservar?</p>
    <p className="mt-2 text-xs text-slate-400">No se pierde nada: si usás la de la nube, se descarga un archivo de respaldo con los datos de este dispositivo (se puede importar desde Configuración); si conservás la de este dispositivo, la de la nube queda en “Versiones anteriores”.</p>
    <div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" className="button-secondary" onClick={() => void cloud.resolveConflict('local')}>Conservar la de este dispositivo</button><button type="button" className="button-primary" onClick={() => void cloud.resolveConflict('nube')}>Usar la de la nube</button></div>
  </div></div>;
}
