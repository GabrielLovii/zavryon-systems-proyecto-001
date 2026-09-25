'use client';

import { useCallback, useEffect, useMemo, useState, type SetStateAction } from 'react';
import { ExclamationTriangleIcon, MagnifyingGlassIcon, PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { DemoState } from '@/lib/demo-store';
import type { Order, OrderLine } from '@/lib/mock-data';
import { money, toNumber } from '@/lib/format';
import { orderStage, stageLabels } from '@/lib/order-flow';
import { QuickProductDialog } from './quick-create';
import { isNullableRecord, usePersistentState } from '@/lib/ui-state';
import { stateHash } from '@/lib/cloud-sync';

type Mutate = (fn: (state: DemoState) => DemoState) => void;

export function OrderEditor({ order, state, update, onClose, notify = () => undefined, userName = '' }: { order: Order; state: DemoState; update: Mutate; onClose: () => void; notify?: (message: string) => void; userName?: string }) {
  // The unsaved draft survives a reload, but only while the order it started from is unchanged: if the order
  // was updated since (cloud pull, status change, another device) the editor starts again from the new data.
  const base = useMemo(() => stateHash(order), [order]);
  const [saved, setSaved] = usePersistentState<{ base: string; draft: Order }>(`order-editor:${order.id}`, () => ({ base, draft: order }), (value) => {
    const entry = value as { base?: unknown; draft?: unknown } | null;
    return Boolean(entry) && entry?.base === base && isNullableRecord(entry?.draft) && (entry?.draft as Order | null)?.id === order.id;
  });
  const draft = saved.draft;
  const setDraft = useCallback((next: SetStateAction<Order>) => setSaved((current) => ({ base: current.base, draft: typeof next === 'function' ? next(current.draft) : next })), [setSaved]);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const users = state.users.filter((user) => user.active);
  // Only what this supplier sells, with its price, so the order matches the supplier's list.
  const offers = useMemo(() => state.supplierProducts
    .filter((offer) => offer.supplierId === draft.supplierId && offer.active)
    .map((offer) => ({ offer, product: state.products.find((product) => product.id === offer.productId && product.active) }))
    .filter((item): item is { offer: typeof item.offer; product: NonNullable<typeof item.product> } => Boolean(item.product))
    .sort((a, b) => a.product.name.localeCompare(b.product.name, 'es')), [state.supplierProducts, state.products, draft.supplierId]);
  const results = offers.filter(({ product, offer }) => !query.trim() || `${product.name} ${product.sku} ${product.brand || ''} ${offer.externalCode || ''}`.toLowerCase().includes(query.trim().toLowerCase()));
  const offered = new Set(offers.map(({ product }) => product.id));
  const total = draft.lines.reduce((sum, line) => sum + line.quantity * line.price, 0);

  useEffect(() => { const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !creating) onClose(); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [creating, onClose]);

  const setLine = (id: string, patch: Partial<OrderLine>) => setDraft((current) => ({ ...current, lines: current.lines.map((line) => line.id === id ? { ...line, ...patch } : line) }));
  const addProduct = (productId: string, price: number) => {
    const existing = draft.lines.find((line) => line.productId === productId);
    if (existing) return setLine(existing.id, { quantity: existing.quantity + 1 });
    setDraft((current) => ({ ...current, lines: [...current.lines, { id: `ol-${Date.now()}`, productId, quantity: 1, price }] }));
  };
  const changeSupplier = (supplierId: string) => {
    const foreign = draft.lines.filter((line) => !state.supplierProducts.some((offer) => offer.supplierId === supplierId && offer.productId === line.productId && offer.active)).length;
    if (foreign && !window.confirm(`${foreign} producto(s) del pedido no están en la lista del nuevo proveedor. Se mantienen, pero revisá precios. ¿Cambiar de proveedor?`)) return;
    setDraft((current) => ({ ...current, supplierId, lines: current.lines.map((line) => { const offer = state.supplierProducts.find((item) => item.supplierId === supplierId && item.productId === line.productId && item.active); return offer ? { ...line, price: offer.price } : line; }) }));
  };
  const save = () => {
    if (!draft.supplierId) return setError('Elegí el proveedor.');
    if (!draft.responsible.trim()) return setError('Indicá el responsable.');
    if (!draft.lines.length) return setError('El pedido tiene que tener al menos un producto.');
    if (draft.lines.some((line) => line.quantity < 1 || line.price < 0)) return setError('Revisá cantidades (mínimo 1) y precios.');
    const edited: Order = { ...draft, notes: draft.notes.trim(), events: [...(draft.events || []), { status: draft.status, at: new Date().toISOString(), by: userName || draft.responsible, note: 'Pedido editado' }] };
    update((current) => ({ ...current, orders: current.orders.map((item) => item.id === draft.id ? edited : item) }));
    notify(`Pedido ${draft.id} guardado`);
    onClose();
  };

  return <div className="drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <aside className="order-drawer" role="dialog" aria-modal="true" aria-labelledby="order-editor-title">
      <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
        <div><h2 id="order-editor-title" className="text-lg font-bold text-white">Editar pedido {draft.id}</h2><p className="mt-1 text-xs text-slate-400">Estado: {stageLabels[orderStage(draft.status)]} · la recepción y los pagos se conservan.</p></div>
        <button type="button" className="icon-button" aria-label="Cerrar editor de pedido" onClick={onClose}><XMarkIcon className="h-6 w-6" /></button>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-semibold text-slate-300">Proveedor<select className="field mt-1 w-full" value={draft.supplierId} onChange={(event) => changeSupplier(event.target.value)}>{state.suppliers.filter((supplier) => supplier.active || supplier.id === draft.supplierId).map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
        <label className="text-xs font-semibold text-slate-300">Entrega prevista<input className="field mt-1 w-full" type="date" value={draft.expectedDate} onChange={(event) => setDraft({ ...draft, expectedDate: event.target.value })} /></label>
        <label className="text-xs font-semibold text-slate-300">Responsable<select className="field mt-1 w-full" value={draft.responsible} onChange={(event) => setDraft({ ...draft, responsible: event.target.value })}>{!users.some((user) => user.name === draft.responsible) && <option value={draft.responsible}>{draft.responsible || 'Sin responsable'}</option>}{users.map((user) => <option key={user.id}>{user.name}</option>)}</select></label>
        <label className="text-xs font-semibold text-slate-300">Solicitante<select className="field mt-1 w-full" value={draft.requester || ''} onChange={(event) => setDraft({ ...draft, requester: event.target.value })}>{!users.some((user) => user.name === draft.requester) && <option value={draft.requester || ''}>{draft.requester || 'Sin solicitante'}</option>}{users.map((user) => <option key={user.id}>{user.name}</option>)}</select></label>
        <label className="text-xs font-semibold text-slate-300 sm:col-span-2">Notas para el proveedor<textarea className="field mt-1 min-h-16 w-full" value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></label>
      </div>

      <div className="mt-6 rounded-xl border border-cyan-300/20 bg-ink/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold text-white">Productos de {state.suppliers.find((supplier) => supplier.id === draft.supplierId)?.name || 'este proveedor'}</h3><button type="button" className="button-secondary" onClick={() => setCreating(true)}><PlusIcon className="h-4 w-4" /> Nuevo producto</button></div>
        <label className="relative mt-3 block"><span className="sr-only">Buscar productos del proveedor</span><MagnifyingGlassIcon aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input className="field w-full pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar en la lista del proveedor…" /></label>
        <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto">{results.map(({ product, offer }) => { const inOrder = draft.lines.some((line) => line.productId === product.id); return <li key={offer.id}><button type="button" onClick={() => addProduct(product.id, offer.price)} className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-white/5"><span className="min-w-0"><span className="block truncate text-sm font-semibold text-white">{product.name}</span><span className="block truncate text-xs text-slate-500">{offer.presentation || product.unit} · {offer.externalCode || product.sku}{inOrder ? ' · ya en el pedido (+1)' : ''}</span></span><span className="shrink-0 text-sm font-bold text-cyan-200">{money(offer.price)}</span></button></li>; })}</ul>
        {!results.length && <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-400"><span>{query.trim() ? `No hay “${query.trim()}” en la lista.` : 'Este proveedor no tiene productos cargados.'}</span><button type="button" className="button-primary" onClick={() => setCreating(true)}><PlusIcon className="h-4 w-4" /> Crear {query.trim() ? `“${query.trim()}”` : 'producto'}</button></div>}
      </div>

      <div className="mt-5 space-y-3">{draft.lines.map((line) => { const product = state.products.find((item) => item.id === line.productId); return <div key={line.id} className="grid gap-3 rounded-xl border border-white/10 p-4 sm:grid-cols-[minmax(0,1fr)_100px_140px_auto] sm:items-end">
        <div className="text-sm font-semibold text-white">{product?.name || 'Producto eliminado'}<span className="mt-1 block text-xs font-normal text-slate-500">{product?.sku || 'Sin código'} · subtotal {money(line.quantity * line.price)}</span>{product && !offered.has(product.id) && <span className="mt-1 flex items-center gap-1 text-xs font-normal text-amber-300"><ExclamationTriangleIcon className="h-4 w-4" /> No está en la lista de este proveedor</span>}</div>
        <label className="text-xs font-semibold text-slate-300">Cantidad<input className="field mt-1 w-full" type="number" inputMode="numeric" min="1" value={line.quantity} onChange={(event) => setLine(line.id, { quantity: toNumber(event.target.value, 1) })} /></label>
        <label className="text-xs font-semibold text-slate-300">Precio<input className="field mt-1 w-full" type="number" inputMode="decimal" min="0" step="0.01" value={line.price} onChange={(event) => setLine(line.id, { price: toNumber(event.target.value) })} /></label>
        <button type="button" className="button-danger" aria-label={`Quitar ${product?.name || 'línea'}`} onClick={() => setDraft((current) => ({ ...current, lines: current.lines.filter((item) => item.id !== line.id) }))}><TrashIcon className="h-4 w-4" /> Quitar</button>
      </div>; })}{!draft.lines.length && <p className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-slate-400">Sin productos. Agregá desde la lista del proveedor.</p>}</div>

      <div className="sticky bottom-0 -mx-5 mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-[#102a35] px-5 py-4">
        <div><div className="text-xs uppercase tracking-wider text-slate-500">Total</div><div className="text-xl font-bold text-white">{money(total)}</div></div>
        <div className="flex gap-2"><button type="button" className="button-secondary" onClick={onClose}>Cancelar</button><button type="button" className="button-primary" onClick={save}>Guardar cambios</button></div>
        {error && <p role="alert" className="w-full text-sm text-red-300">{error}</p>}
      </div>
    </aside>
    {creating && <QuickProductDialog state={state} update={update} supplierId={draft.supplierId} initialName={query.trim()} userName={userName} onClose={() => setCreating(false)} onCreated={(product, offer) => { setCreating(false); setQuery(''); addProduct(product.id, offer?.price || 0); }} />}
  </div>;
}
