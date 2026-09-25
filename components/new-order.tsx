'use client';

import { useEffect, useState } from 'react';
import { MagnifyingGlassIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { Order } from '@/lib/mock-data';
import type { DemoState } from '@/lib/demo-store';
import type { Section } from './sidebar';
import { getLocalDateISO, getLocalDateTimeInput, isValidLocalDateISO, isValidLocalDateTimeInput } from '@/lib/date';
import { discardDraft, loadDraft, saveDraft } from '@/lib/draft-store';
import { nextSequentialId } from '@/lib/format';
import { stockStatus, stockStatusLabels, suggestedQuantity } from '@/lib/stock';
import { withStatus } from '@/lib/order-flow';
import { QuickProductDialog, QuickSupplierDialog } from './quick-create';

type DraftLine = { id: string; productId: string; quantity: number; price: number };
type Mutate = (fn: (state: DemoState) => DemoState) => void;

import { money } from '@/lib/format';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-slate-300"><span className="mb-1.5 block">{label}</span>{children}</label>;
}

export function NewOrder({ state, update, notify, onNavigate }: { state: DemoState; update: Mutate; notify: (message: string) => void; onNavigate: (section: Section) => void }) {
  const activeUsers = state.users.filter((user) => user.active);
  const activeUser = activeUsers.find((user) => user.id === state.activeUserId) || activeUsers[0];
  const activeSuppliers = state.suppliers.filter((supplier) => supplier.active);
  const [supplierId, setSupplierId] = useState(activeSuppliers[0]?.id || '');
  const [responsible, setResponsible] = useState(activeUser?.name || '');
  const [requester, setRequester] = useState(activeUser?.name || '');
  const [expectedDate, setExpectedDate] = useState(getLocalDateISO());
  const [requestedAt, setRequestedAt] = useState(getLocalDateTimeInput());
  const [expectedDateError, setExpectedDateError] = useState('');
  const [message, setMessage] = useState('');
  const supplierProducts = state.supplierProducts.filter((item) => item.supplierId === supplierId && item.active && state.products.some((product) => product.id === item.productId && product.active));
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [query, setQuery] = useState('');
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState<null | 'producto' | 'proveedor'>(null);
  const [draftInfo, setDraftInfo] = useState<{ savedAt: string | null; error?: string; recovered?: boolean }>({ savedAt: null });
  useEffect(() => { const recovered = loadDraft<{ supplierId: string; responsible: string; requester: string; expectedDate: string; requestedAt: string; lines: DraftLine[]; query: string; notes?: string }>('new-order'); if (recovered) { setNotes(recovered.data.notes || ''); setSupplierId(recovered.data.supplierId); setResponsible(recovered.data.responsible); setRequester(recovered.data.requester || recovered.data.responsible); setExpectedDate(recovered.data.expectedDate || getLocalDateISO()); setRequestedAt(recovered.data.requestedAt || getLocalDateTimeInput()); setLines(recovered.data.lines); setQuery(recovered.data.query); setDraftInfo({ savedAt: recovered.savedAt, recovered: recovered.recovered }); } }, []);
  useEffect(() => { const timer = window.setTimeout(() => { const result = saveDraft('new-order', { supplierId, responsible, requester, expectedDate, requestedAt, lines, query, notes }); setDraftInfo({ savedAt: result.savedAt, error: result.error }); }, 350); return () => window.clearTimeout(timer); }, [supplierId, responsible, requester, expectedDate, requestedAt, lines, query, notes]);
  const tell = (value: string) => { setMessage(value); notify(value); };
  const changeSupplier = (next: string) => { if (next === supplierId) return; if (lines.length && !window.confirm('Cambiar de proveedor quita los productos cargados en este pedido. ¿Continuar?')) return; setSupplierId(next); setLines([]); };

  const productResults = supplierProducts.map((supplierProduct) => {
    const product = state.products.find((item) => item.id === supplierProduct.productId && item.active);
    return product ? { product, supplierProduct } : null;
  }).filter((item): item is { product: typeof state.products[number]; supplierProduct: typeof supplierProducts[number] } => Boolean(item));
  const filteredResults = productResults.filter(({ product, supplierProduct }) => {
    const haystack = [product.name, product.sku, product.brand, product.category, supplierProduct.brand, supplierProduct.category, supplierProduct.externalCode, supplierProduct.presentation].filter(Boolean).join(' ').toLowerCase();
    return !query.trim() || haystack.includes(query.trim().toLowerCase());
  });

  const addProduct = (productId: string, price: number) => {
    setLines((current) => {
      const existing = current.find((line) => line.productId === productId);
      if (existing) {
        tell('El producto ya estaba en el pedido; se aumentó la cantidad en 1');
        return current.map((line) => line.id === existing.id ? { ...line, quantity: line.quantity + 1 } : line);
      }
      tell('Producto agregado al pedido');
      return [...current, { id: `ol-${Date.now()}-${current.length}`, productId, quantity: 1, price }];
    });
  };

  const changeLineProduct = (lineId: string, productId: string) => {
    const supplierProduct = supplierProducts.find((item) => item.productId === productId);
    if (!supplierProduct) return;
    setLines((current) => {
      const duplicate = current.find((line) => line.productId === productId && line.id !== lineId);
      if (duplicate) {
        tell('Ese producto ya estaba en el pedido; se combinaron las cantidades');
        return current.filter((line) => line.id !== lineId).map((line) => line.id === duplicate.id ? { ...line, quantity: line.quantity + (current.find((item) => item.id === lineId)?.quantity || 0) } : line);
      }
      return current.map((line) => line.id === lineId ? { ...line, productId, price: supplierProduct.price } : line);
    });
  };

  const lowStock = productResults.filter(({ product }) => stockStatus(product) !== 'ok');
  const addSuggested = (productId: string, price: number, quantity: number) => setLines((current) => current.some((line) => line.productId === productId) ? current : [...current, { id: `ol-${Date.now()}-${productId}`, productId, quantity, price }]);
  const updateLine = (id: string, patch: Partial<DraftLine>) => setLines((current) => current.map((line) => line.id === id ? { ...line, ...patch } : line));
  const total = lines.reduce((sum, line) => sum + Math.max(0, line.quantity) * Math.max(0, line.price), 0);
  const save = () => {
    if (!supplierId || !responsible || !requester || !lines.length || lines.some((line) => !line.productId || line.quantity < 1 || line.price < 0)) return tell('Completá proveedor, solicitante, responsable y las cantidades');
    if (!isValidLocalDateISO(expectedDate)) { setExpectedDateError('Ingresá una fecha de entrega válida.'); return tell('La fecha de entrega es obligatoria y válida'); }
    if (!isValidLocalDateTimeInput(requestedAt)) return tell('Ingresá una fecha y hora de solicitud válidas');
    setExpectedDateError('');
    const today = getLocalDateISO();
    const order: Order = withStatus({ id: nextSequentialId('PED', state.orders.map((item) => item.id), 1049, 4), supplierId, lines: lines.map(({ id, productId, quantity, price }) => ({ id, productId, quantity, price })), expectedDate, notes: notes.trim(), responsible, requester, requestedAt, status: 'Preparado', createdAt: today }, 'Preparado', requester, 'Pedido creado');
    const ordered = new Set(order.lines.map((line) => line.productId));
    update((current) => ({ ...current, orders: [...current.orders, order], restockList: current.restockList.filter((item) => !(item.supplierId === supplierId && ordered.has(item.productId))) }));
    discardDraft('new-order'); setDraftInfo({ savedAt: null });
    tell(`Pedido ${order.id} creado. Envialo por WhatsApp o PDF desde Pedidos.`);
    onNavigate('Pedidos');
  };

  return <section className="card min-w-0 p-4 sm:p-5">
     <div className="mb-5"><h3 className="font-bold text-white">Nuevo pedido</h3><p className="mt-1 text-xs text-slate-400">Armá el pedido con los productos del proveedor y guardalo; después lo enviás por WhatsApp o PDF.</p><p role="status" className="mt-2 text-xs text-slate-400">{draftInfo.error ? `Error de guardado: ${draftInfo.error}` : draftInfo.recovered ? 'Borrador recuperado localmente.' : draftInfo.savedAt ? `Borrador guardado ${new Date(draftInfo.savedAt).toLocaleTimeString()}` : 'Borrador local pendiente.'}</p></div>
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Proveedor"><div className="flex gap-2"><select className="field min-w-0 flex-1" value={supplierId} onChange={(event) => changeSupplier(event.target.value)}>{!activeSuppliers.length && <option value="">Sin proveedores</option>}{activeSuppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select><button type="button" className="button-secondary shrink-0" onClick={() => setCreating('proveedor')} aria-label="Crear proveedor nuevo"><PlusIcon className="h-4 w-4" /><span className="hidden sm:inline">Nuevo</span></button></div></Field>
       <Field label="Responsable"><select className="field w-full" value={responsible} onChange={(event) => setResponsible(event.target.value)}>{activeUsers.map((user) => <option key={user.id} value={user.name}>{user.name}</option>)}</select></Field>
       <Field label="Solicitante"><select className="field w-full" value={requester} onChange={(event) => setRequester(event.target.value)}>{activeUsers.map((user) => <option key={user.id} value={user.name}>{user.name}</option>)}</select></Field>
       <Field label="Entrega prevista"><input id="expected-date" className="field w-full" type="date" value={expectedDate} onChange={(event) => { setExpectedDate(event.target.value); setExpectedDateError(''); }} aria-invalid={Boolean(expectedDateError)} aria-describedby={expectedDateError ? 'expected-date-error' : undefined} required />{expectedDateError && <span id="expected-date-error" role="alert" className="mt-1 block text-xs text-red-300">{expectedDateError}</span>}</Field>
       <Field label="Solicitado el"><input className="field w-full" type="datetime-local" value={requestedAt} onChange={(event) => setRequestedAt(event.target.value)} /></Field>
    </div>
     <label className="mt-4 block text-xs font-semibold text-slate-300">Notas para el proveedor<textarea className="field mt-1.5 min-h-16 w-full" value={notes} placeholder="Ej.: Entregar por la mañana, pedir factura A…" onChange={(event) => setNotes(event.target.value)} /></label>
     {lowStock.length > 0 && <div className="mt-6 rounded-xl border border-amber-300/30 bg-amber-400/5 p-4">
       <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-bold text-white">Sugeridos para este proveedor · stock bajo</h4><button type="button" className="button-secondary" onClick={() => lowStock.forEach(({ product, supplierProduct }) => addSuggested(product.id, supplierProduct.price, suggestedQuantity(product, supplierProduct.minimum)))}>Agregar todos</button></div>
       <ul className="mt-3 flex flex-wrap gap-2">{lowStock.map(({ product, supplierProduct }) => { const inOrder = lines.some((line) => line.productId === product.id); return <li key={product.id}><button type="button" disabled={inOrder} onClick={() => addSuggested(product.id, supplierProduct.price, suggestedQuantity(product, supplierProduct.minimum))} className={`chip text-left ${inOrder ? 'opacity-50' : 'hover:border-amber-300/60'}`}><span className="block text-white">{product.name}</span><span className="block text-[11px] font-normal text-slate-400">{stockStatusLabels[stockStatus(product)]} · quedan {product.stock} · sugerido {suggestedQuantity(product, supplierProduct.minimum)}{inOrder ? ' · en el pedido' : ''}</span></button></li>; })}</ul>
     </div>}
     <div className="mt-6 rounded-xl border border-cyan-300/20 bg-ink/40 p-4">
       <label htmlFor="product-search" className="mb-2 block text-sm font-bold text-white">Buscar productos</label>
       <div className="relative">
         <MagnifyingGlassIcon aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-cyan-300" />
         <input id="product-search" className="field w-full pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre, SKU, marca, categoría o código externo" aria-controls="product-results" />
       </div>
       <div id="product-results" role="listbox" aria-label="Productos del proveedor seleccionado" className="mt-3 max-h-72 space-y-2 overflow-y-auto">
         {!supplierId && <p className="p-3 text-sm text-slate-400">Elegí un proveedor para ver sus productos.</p>}
         {supplierId && !filteredResults.length && <div className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm text-slate-400"><span>{query.trim() ? `No hay “${query.trim()}” en la lista de este proveedor.` : 'Este proveedor todavía no tiene productos cargados.'}</span><button type="button" className="button-primary" onClick={() => setCreating('producto')}><PlusIcon className="h-4 w-4" /> Crear {query.trim() ? `“${query.trim()}”` : 'producto'}</button></div>}
         {filteredResults.map(({ product, supplierProduct }) => <button type="button" role="option" aria-selected="false" aria-label={`Agregar ${product.name}`} key={supplierProduct.id} onClick={() => addProduct(product.id, supplierProduct.price)} className="flex w-full items-center justify-between gap-4 rounded-lg border border-white/10 p-3 text-left hover:border-cyan-300/60 hover:bg-cyan-300/10">
           <span className="min-w-0"><span className="block truncate font-bold text-white">{product.name}</span><span className="mt-1 block truncate text-xs text-slate-400">{supplierProduct.presentation || product.unit} · {product.sku} · {supplierProduct.externalCode || 'Sin código externo'}</span></span>
           <span className="shrink-0 text-right"><span className="block text-xs text-slate-400">{supplierProduct.brand || product.brand || 'Sin marca'} · {supplierProduct.category || product.category || 'Sin categoría'}</span><span className="mt-1 block font-bold text-cyan-200">{money(supplierProduct.price)}</span><span className="block text-[10px] text-slate-500">{activeSuppliers.find((supplier) => supplier.id === supplierId)?.name}</span></span>
         </button>)}
       </div>
       <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-slate-500">Tocá un resultado para agregarlo. ¿No está? Crealo con su precio.</p>{supplierId && <button type="button" className="button-secondary" onClick={() => setCreating('producto')}><PlusIcon className="h-4 w-4" /> Nuevo producto</button>}</div>
     </div>
     <div className="mt-6 space-y-3">
       {lines.map((line, index) => { const product = state.products.find((item) => item.id === line.productId); return <div key={line.id} className="grid gap-3 rounded-xl border border-white/10 p-4 md:grid-cols-[minmax(0,2fr)_120px_160px_120px_auto] md:items-end">
         <Field label={`Producto ${index + 1}`}><select className="field w-full" value={line.productId} onChange={(event) => changeLineProduct(line.id, event.target.value)}>{productResults.map(({ product: option }) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></Field>
         <Field label="Cantidad"><input className="field w-full" type="number" min="1" value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: Math.max(1, Number(event.target.value) || 1) })} /></Field>
         <Field label="Precio unitario"><input className="field w-full" type="number" min="0" step="0.01" value={line.price} onChange={(event) => updateLine(line.id, { price: Math.max(0, Number(event.target.value) || 0) })} /></Field>
         <div className="text-sm text-slate-300"><span className="block text-xs font-semibold text-slate-500">Subtotal</span>{money(Math.max(0, line.quantity) * Math.max(0, line.price))}<span className="mt-1 block text-xs text-slate-500">{product?.unit || 'Unidad'}</span></div>
         <button type="button" className="button-secondary" onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))}><TrashIcon className="h-4 w-4" /> Quitar</button>
       </div>; })}
       {!lines.length && <div className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-slate-400">Todavía no hay productos. Buscá o creá el primero.</div>}
     </div>
     <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5"><button type="button" className="button-secondary" onClick={() => document.getElementById('product-search')?.focus()}><PlusIcon className="h-4 w-4" /> Agregar producto</button><div className="text-right"><div className="text-xs uppercase tracking-wider text-slate-500">Subtotal / total del pedido</div><div className="text-2xl font-bold text-white">{money(total)}</div></div></div>
    <div className="mt-5 flex justify-end"><button type="button" className="button-primary" onClick={save}>Guardar pedido</button></div>
    <p className="sr-only" role="status">{message}</p>
    {creating === 'producto' && supplierId && <QuickProductDialog state={state} update={update} supplierId={supplierId} initialName={query.trim()} userName={requester || activeUser?.name || ''} onClose={() => setCreating(null)} onCreated={(product, offer) => { setCreating(null); setQuery(''); addProduct(product.id, offer?.price || 0); }} />}
    {creating === 'proveedor' && <QuickSupplierDialog state={state} update={update} onClose={() => setCreating(null)} onCreated={(supplier) => { setCreating(null); setSupplierId(supplier.id); setLines([]); tell(`Proveedor ${supplier.name} creado. Ahora cargá sus productos.`); }} />}
  </section>;
}
