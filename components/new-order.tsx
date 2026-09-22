'use client';

import { useState } from 'react';
import { MagnifyingGlassIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { Order } from '@/lib/mock-data';
import type { DemoState } from '@/lib/demo-store';
import type { Section } from './sidebar';

type DraftLine = { id: string; productId: string; quantity: number; price: number };
type Mutate = (fn: (state: DemoState) => DemoState) => void;

const today = '2026-09-21';
const money = (value: number) => `$ ${value.toLocaleString('es-CO')}`;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-slate-300"><span className="mb-1.5 block">{label}</span>{children}</label>;
}

export function NewOrder({ state, update, notify, onNavigate }: { state: DemoState; update: Mutate; notify: (message: string) => void; onNavigate: (section: Section) => void }) {
  const activeUsers = state.users.filter((user) => user.active);
  const activeSuppliers = state.suppliers.filter((supplier) => supplier.active);
  const [supplierId, setSupplierId] = useState(activeSuppliers[0]?.id || '');
  const [responsible, setResponsible] = useState(activeUsers[0]?.name || '');
  const [message, setMessage] = useState('');
  const supplierProducts = state.supplierProducts.filter((item) => item.supplierId === supplierId && item.active && state.products.some((product) => product.id === item.productId && product.active));
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [query, setQuery] = useState('');
  const tell = (value: string) => { setMessage(value); notify(value); };

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

  const updateLine = (id: string, patch: Partial<DraftLine>) => setLines((current) => current.map((line) => line.id === id ? { ...line, ...patch } : line));
  const total = lines.reduce((sum, line) => sum + Math.max(0, line.quantity) * Math.max(0, line.price), 0);
  const save = () => {
    if (!supplierId || !responsible || !lines.length || lines.some((line) => !line.productId || line.quantity < 1 || line.price < 0)) return tell('Completa proveedor, responsable y todas las líneas');
    const order: Order = { id: `PED-${1048 + state.orders.length + 1}`, supplierId, lines: lines.map(({ id, productId, quantity, price }) => ({ id, productId, quantity, price })), expectedDate: today, notes: '', responsible, status: 'Preparado', createdAt: today };
    update((current) => ({ ...current, orders: [...current.orders, order] }));
    tell('Pedido creado');
    onNavigate('Pedidos');
  };

  return <section className="rounded-2xl border border-white/10 bg-petroleum-900 p-5 shadow-panel">
    <div className="mb-5"><h3 className="font-bold text-white">Nuevo pedido</h3><p className="mt-1 text-xs text-slate-400">Agrega y revisa varias líneas del mismo proveedor antes de guardar.</p></div>
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Proveedor"><select className="field w-full" value={supplierId} onChange={(event) => { setSupplierId(event.target.value); setLines([]); }}>{activeSuppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></Field>
      <Field label="Responsable"><select className="field w-full" value={responsible} onChange={(event) => setResponsible(event.target.value)}>{activeUsers.map((user) => <option key={user.id} value={user.name}>{user.name}</option>)}</select></Field>
    </div>
     <div className="mt-6 rounded-xl border border-cyan-300/20 bg-ink/40 p-4">
       <label htmlFor="product-search" className="mb-2 block text-sm font-bold text-white">Buscar productos</label>
       <div className="relative">
         <MagnifyingGlassIcon aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-cyan-300" />
         <input id="product-search" className="field w-full pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre, SKU, marca, categoría o código externo" aria-controls="product-results" />
       </div>
       <div id="product-results" role="listbox" aria-label="Productos del proveedor seleccionado" className="mt-3 max-h-72 space-y-2 overflow-y-auto">
         {!supplierId && <p className="p-3 text-sm text-slate-400">Selecciona un proveedor para buscar sus productos.</p>}
         {supplierId && !filteredResults.length && <p className="p-3 text-sm text-slate-400">No hay productos de este proveedor que coincidan.</p>}
         {filteredResults.map(({ product, supplierProduct }) => <button type="button" role="option" aria-selected="false" aria-label={`Agregar ${product.name}`} key={supplierProduct.id} onClick={() => addProduct(product.id, supplierProduct.price)} className="flex w-full items-center justify-between gap-4 rounded-lg border border-white/10 p-3 text-left hover:border-cyan-300/60 hover:bg-cyan-300/10">
           <span className="min-w-0"><span className="block truncate font-bold text-white">{product.name}</span><span className="mt-1 block truncate text-xs text-slate-400">{supplierProduct.presentation || product.unit} · {product.sku} · {supplierProduct.externalCode || 'Sin código externo'}</span></span>
           <span className="shrink-0 text-right"><span className="block text-xs text-slate-400">{supplierProduct.brand || product.brand || 'Sin marca'} · {supplierProduct.category || product.category || 'Sin categoría'}</span><span className="mt-1 block font-bold text-cyan-200">{money(supplierProduct.price)}</span><span className="block text-[10px] text-slate-500">{activeSuppliers.find((supplier) => supplier.id === supplierId)?.name}</span></span>
         </button>)}
       </div>
       <p className="mt-3 text-xs text-slate-500">Haz clic o pulsa Enter sobre un resultado. También puedes elegir el producto directamente en cada línea.</p>
     </div>
     <div className="mt-6 space-y-3">
       {lines.map((line, index) => { const product = state.products.find((item) => item.id === line.productId); return <div key={line.id} className="grid gap-3 rounded-xl border border-white/10 p-4 md:grid-cols-[minmax(0,2fr)_120px_160px_120px_auto] md:items-end">
         <Field label={`Producto ${index + 1}`}><select className="field w-full" value={line.productId} onChange={(event) => changeLineProduct(line.id, event.target.value)}>{productResults.map(({ product: option }) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></Field>
         <Field label="Cantidad"><input className="field w-full" type="number" min="1" value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: Number(event.target.value) })} /></Field>
         <Field label="Precio unitario"><input className="field w-full" type="number" min="0" step="0.01" value={line.price} onChange={(event) => updateLine(line.id, { price: Number(event.target.value) })} /></Field>
         <div className="text-sm text-slate-300"><span className="block text-xs font-semibold text-slate-500">Subtotal</span>{money(Math.max(0, line.quantity) * Math.max(0, line.price))}<span className="mt-1 block text-xs text-slate-500">{product?.unit || 'Unidad'}</span></div>
         <button type="button" className="button-secondary" onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))}><TrashIcon className="h-4 w-4" /> Quitar</button>
       </div>; })}
       {!lines.length && <div className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-slate-400">Todavía no hay líneas. Busca y agrega el primer producto.</div>}
     </div>
     <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5"><button type="button" className="button-secondary" onClick={() => document.getElementById('product-search')?.focus()}><PlusIcon className="h-4 w-4" /> Agregar producto</button><div className="text-right"><div className="text-xs uppercase tracking-wider text-slate-500">Subtotal / total del pedido</div><div className="text-2xl font-bold text-white">{money(total)}</div></div></div>
    <div className="mt-5 flex justify-end"><button type="button" className="button-primary" onClick={save}>Guardar pedido</button></div>
    {message && <div role="status" className="mt-4 rounded-xl border border-cyan-300/30 bg-ink px-4 py-3 text-sm font-semibold text-white">{message}</div>}
  </section>;
}
