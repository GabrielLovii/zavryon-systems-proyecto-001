'use client';

import { useMemo, useState } from 'react';
import { ArrowDownTrayIcon, CheckIcon, ClipboardDocumentListIcon, MagnifyingGlassIcon, MinusIcon, PlusIcon, ShoppingCartIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { DemoState } from '@/lib/demo-store';
import type { Product, RestockItem, StockMovementType } from '@/lib/mock-data';
import { buildRestockOrders, compareByUrgency, groupByCategory, groupRestockBySupplier, preferredSupplier, registerMovement, stockMovementLabels, stockStatus, stockStatusLabels, stockValue, suggestedQuantity, supplierOptions, UNCATEGORIZED, type StockStatus } from '@/lib/stock';
import { downloadCsv, money, nextSequentialId, toNumber } from '@/lib/format';
import { getLocalDateISO, getLocalDateTimeInput } from '@/lib/date';
import type { Section } from './sidebar';
import { SeasonTab } from './seasonal-panel';

export const openSupplyTab = (tab: Tab) => { try { window.sessionStorage.setItem(TAB_KEY, tab); } catch { /* Falls back to the default tab. */ } };

type Mutate = (fn: (state: DemoState) => DemoState) => void;
type Tab = 'stock' | 'faltantes' | 'pedir' | 'temporada' | 'movimientos';
const TAB_KEY = 'zavryon-supply-tab';
type Props = { state: DemoState; update: Mutate; notify: (message: string) => void; onNavigate: (section: Section) => void; userName: string };

const statusClass: Record<StockStatus, string> = { faltante: 'badge-red', poco: 'badge-red', bajo: 'badge-amber', ok: 'badge-green' };
const statusDot: Record<StockStatus, string> = { faltante: '🔴', poco: '🔴', bajo: '🟠', ok: '🟢' };
const tabs: { id: Tab; label: string }[] = [{ id: 'stock', label: 'Stock actual' }, { id: 'faltantes', label: 'Faltantes' }, { id: 'pedir', label: 'Por pedir' }, { id: 'temporada', label: 'Temporada' }, { id: 'movimientos', label: 'Movimientos' }];

function StatusBadge({ product }: { product: Pick<Product, 'stock' | 'minimum'> }) {
  const status = stockStatus(product);
  return <span className={statusClass[status]}><span aria-hidden="true">{statusDot[status]} </span>{stockStatusLabels[status]}</span>;
}

export function Supply({ state, update, notify, onNavigate, userName }: Props) {
  // Other screens (e.g. Inicio) can deep-link to a tab through sessionStorage.
  const [tab, setTab] = useState<Tab>(() => { try { const saved = window.sessionStorage.getItem(TAB_KEY) as Tab | null; window.sessionStorage.removeItem(TAB_KEY); return saved && tabs.some((item) => item.id === saved) ? saved : 'stock'; } catch { return 'stock'; } });
  const active = useMemo(() => state.products.filter((product) => product.active), [state.products]);
  const missing = useMemo(() => active.filter((product) => stockStatus(product) !== 'ok').sort(compareByUrgency), [active]);
  const counts = useMemo(() => active.reduce((acc, product) => ({ ...acc, [stockStatus(product)]: acc[stockStatus(product)] + 1 }), { faltante: 0, poco: 0, bajo: 0, ok: 0 } as Record<StockStatus, number>), [active]);
  const now = () => new Date().toISOString();

  const addToRestock = (products: Product[]) => {
    if (!products.length) return notify('Seleccioná al menos un producto');
    update((current) => {
      const list = [...current.restockList];
      products.forEach((product) => {
        const offer = preferredSupplier(product.id, current.supplierProducts, current.suppliers);
        const existing = list.findIndex((item) => item.productId === product.id);
        const item: RestockItem = { productId: product.id, supplierId: offer?.supplierId || '', quantity: suggestedQuantity(product, offer?.minimum), addedAt: now(), addedBy: userName };
        if (existing >= 0) list[existing] = { ...list[existing], quantity: Math.max(list[existing].quantity, item.quantity) };
        else list.push(item);
      });
      return { ...current, restockList: list };
    });
    notify(`${products.length} producto(s) en la lista Por pedir`);
  };

  const move = (product: Product, type: StockMovementType, quantity: number, reason = '') => {
    if (type !== 'faltante' && type !== 'ajuste' && quantity <= 0) return notify('Ingresá una cantidad mayor a 0');
    update((current) => {
      const target = current.products.find((item) => item.id === product.id);
      if (!target) return current;
      const result = registerMovement(target, type, quantity, { user: userName, date: now(), reason });
      return { ...current, products: current.products.map((item) => item.id === product.id ? result.product : item), stockMovements: [...current.stockMovements, result.movement].slice(-2000) };
    });
    notify(type === 'faltante' ? `${product.name} marcado como faltante` : `Stock de ${product.name} actualizado`);
  };

  return <div className="space-y-6">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <SummaryCard label="Productos" value={String(active.length)} note={`${groupByCategory(active).length} categorías`} />
      <SummaryCard label="Faltantes" value={String(counts.faltante)} note="Sin stock" tone="red" />
      <SummaryCard label="Poco / bajo" value={String(counts.poco + counts.bajo)} note="En el mínimo o debajo" tone="amber" />
      <SummaryCard label="Por pedir" value={String(state.restockList.length)} note={`${groupRestockBySupplier(state.restockList).size} proveedor(es)`} tone="cyan" />
      <SummaryCard label="Valor en stock" value={money(stockValue(active, state.supplierProducts, state.suppliers))} note="Al mejor precio de proveedor" tone="green" />
    </div>
    <div role="tablist" aria-label="Secciones de abastecimiento" className="tab-list">
      {tabs.map((item) => <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className="tab" onClick={() => setTab(item.id)}>
        {item.label}
        {item.id === 'faltantes' && missing.length > 0 && <span className="tab-count">{missing.length}</span>}
        {item.id === 'pedir' && state.restockList.length > 0 && <span className="tab-count">{state.restockList.length}</span>}
      </button>)}
    </div>
    {tab === 'stock' && <StockTab state={state} update={update} notify={notify} products={active} onMove={move} onRestock={(items) => { addToRestock(items); setTab('pedir'); }} userName={userName} />}
    {tab === 'faltantes' && <MissingTab state={state} products={missing} onRestock={(items) => { addToRestock(items); setTab('pedir'); }} onMove={move} />}
    {tab === 'pedir' && <RestockTab state={state} update={update} notify={notify} onNavigate={onNavigate} userName={userName} onGoStock={() => setTab('faltantes')} />}
    {tab === 'temporada' && <SeasonTab state={state} onRestock={(items) => { addToRestock(items); setTab('pedir'); }} />}
    {tab === 'movimientos' && <MovementsTab state={state} />}
  </div>;
}

function SummaryCard({ label, value, note, tone = 'slate' }: { label: string; value: string; note: string; tone?: 'slate' | 'red' | 'amber' | 'cyan' | 'green' }) {
  const tones = { slate: 'text-white', red: 'text-red-300', amber: 'text-amber-300', cyan: 'text-cyan-300', green: 'text-emerald-300' };
  return <div className="card p-4"><div className="text-xs font-semibold text-slate-400">{label}</div><div className={`mt-1 truncate text-xl font-bold ${tones[tone]}`}>{value}</div><div className="mt-1 text-[11px] text-slate-500">{note}</div></div>;
}

function StockTab({ state, update, notify, products, onMove, onRestock, userName }: { state: DemoState; update: Mutate; notify: (message: string) => void; products: Product[]; onMove: (product: Product, type: StockMovementType, quantity: number, reason?: string) => void; onRestock: (products: Product[]) => void; userName: string }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState<'' | StockStatus | 'alerta'>('');
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [adding, setAdding] = useState(false);
  const categories = useMemo(() => groupByCategory(products).map((group) => group.category), [products]);
  const filtered = products.filter((product) => {
    const haystack = `${product.name} ${product.sku} ${product.brand || ''} ${product.category}`.toLocaleLowerCase('es');
    const productStatus = stockStatus(product);
    return (!query.trim() || haystack.includes(query.trim().toLocaleLowerCase('es')))
      && (!category || (product.category?.trim() || UNCATEGORIZED) === category)
      && (!status || (status === 'alerta' ? productStatus !== 'ok' : productStatus === status));
  });
  const groups = groupByCategory(filtered);
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const exportStock = () => {
    downloadCsv('stock-abastecimiento.csv', ['Categoría', 'Producto', 'SKU', 'Unidad', 'Stock', 'Mínimo', 'Estado', 'Proveedor sugerido', 'Precio'], groupByCategory(products).flatMap((group) => group.products.map((product) => {
      const offer = preferredSupplier(product.id, state.supplierProducts, state.suppliers);
      return [group.category, product.name, product.sku, product.unit, product.stock, product.minimum, stockStatusLabels[stockStatus(product)], offer ? state.suppliers.find((supplier) => supplier.id === offer.supplierId)?.name || '' : '', offer?.price ?? ''];
    })));
    notify('CSV de stock descargado');
  };

  return <section className="card min-w-0 p-5">
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="font-bold text-white">Stock actual</h3><p className="mt-1 text-xs text-slate-400">Anotá lo que hay durante el día. Se agrupa por categoría y avisa cuando algo queda en el mínimo.</p></div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="button-secondary" onClick={exportStock}><ArrowDownTrayIcon className="h-4 w-4" /> CSV</button>
        <button type="button" className="button-primary" onClick={() => setAdding(true)}><PlusIcon className="h-4 w-4" /> Anotar producto</button>
      </div>
    </div>
    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px_160px]">
      <label className="relative block"><span className="sr-only">Buscar en stock</span><MagnifyingGlassIcon aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input className="field w-full pl-9" placeholder="Buscar producto, SKU, marca…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <select aria-label="Filtrar por categoría" className="field" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Todas las categorías</option>{categories.map((item) => <option key={item}>{item}</option>)}</select>
      <select aria-label="Filtrar por estado" className="field" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="">Todos los estados</option><option value="alerta">Con alerta</option><option value="faltante">Faltante</option><option value="poco">Poco</option><option value="bajo">Bajo</option><option value="ok">OK</option></select>
    </div>
    {selected.length > 0 && <div className="sticky top-2 z-10 mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cyan-300/30 bg-petroleum-950/95 p-3 backdrop-blur">
      <span className="text-sm font-semibold text-white">{selected.length} seleccionado(s)</span>
      <div className="flex gap-2"><button type="button" className="button-secondary" onClick={() => setSelected([])}>Limpiar</button><button type="button" className="button-primary" onClick={() => { onRestock(products.filter((product) => selected.includes(product.id))); setSelected([]); }}><ShoppingCartIcon className="h-4 w-4" /> Agregar a Por pedir</button></div>
    </div>}
    <div className="mt-4 space-y-5">
      {groups.map((group) => {
        const alerts = group.products.filter((product) => stockStatus(product) !== 'ok').length;
        return <div key={group.category}>
          <div className="mb-2 flex items-center justify-between gap-2 border-b border-white/10 pb-2"><h4 className="text-sm font-bold uppercase tracking-wider text-cyan-200">{group.category}</h4><span className="text-xs text-slate-400">{group.products.length} producto(s){alerts ? ` · ${alerts} con alerta` : ''}</span></div>
          <ul className="space-y-2">{group.products.map((product) => <li key={product.id} className="stock-row">
            <label className="flex min-w-0 flex-1 items-center gap-3"><input type="checkbox" className="h-5 w-5 shrink-0 accent-cyan-400" checked={selected.includes(product.id)} onChange={() => toggle(product.id)} aria-label={`Seleccionar ${product.name}`} /><span className="min-w-0"><span className="block truncate font-semibold text-white">{product.name}</span><span className="block truncate text-xs text-slate-500">{product.sku} · {product.unit || 'unidad'}{product.stockUpdatedAt ? ` · actualizado ${new Date(product.stockUpdatedAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}` : ''}</span></span></label>
            <div className="flex items-center gap-3">
              <StatusBadge product={product} />
              <div className="stepper" role="group" aria-label={`Ajustar stock de ${product.name}`}>
                <button type="button" aria-label={`Restar 1 a ${product.name}`} disabled={product.stock <= 0} onClick={() => onMove(product, 'salida', 1, 'Ajuste rápido')}><MinusIcon className="h-4 w-4" /></button>
                <span className="min-w-12 text-center"><span className="block text-lg font-bold leading-none text-white">{product.stock}</span><span className="block text-[10px] text-slate-500">mín. {product.minimum}</span></span>
                <button type="button" aria-label={`Sumar 1 a ${product.name}`} onClick={() => onMove(product, 'entrada', 1, 'Ajuste rápido')}><PlusIcon className="h-4 w-4" /></button>
              </div>
              <button type="button" className="button-secondary" onClick={() => setEditing(product)}>Registrar</button>
            </div>
          </li>)}</ul>
        </div>;
      })}
      {!groups.length && <p className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-slate-400">{products.length ? 'No hay productos que coincidan con el filtro.' : 'Todavía no hay mercadería anotada. Tocá “Anotar producto” para empezar.'}</p>}
    </div>
    {editing && <MovementDialog product={editing} onClose={() => setEditing(null)} onSave={(type, quantity, reason) => { onMove(editing, type, quantity, reason); setEditing(null); }} />}
    {adding && <QuickProductDialog state={state} categories={categories} onClose={() => setAdding(false)} onSave={(product, supplierId, price) => {
      update((current) => ({
        ...current,
        products: [...current.products, product],
        supplierProducts: supplierId ? [...current.supplierProducts, { id: `sp-${Date.now()}`, supplierId, productId: product.id, price, externalCode: product.sku, presentation: product.unit, active: true }] : current.supplierProducts,
        stockMovements: [...current.stockMovements, { id: `mov-${Date.now()}-${product.id}`, productId: product.id, type: 'ajuste' as const, quantity: product.stock, before: 0, after: product.stock, reason: 'Alta de producto', user: userName, date: new Date().toISOString() }],
      }));
      setAdding(false);
      notify(`${product.name} anotado en ${product.category || UNCATEGORIZED}`);
    }} />}
  </section>;
}

function MovementDialog({ product, onClose, onSave }: { product: Product; onClose: () => void; onSave: (type: StockMovementType, quantity: number, reason: string) => void }) {
  const [type, setType] = useState<StockMovementType>('ajuste');
  const [quantity, setQuantity] = useState(product.stock);
  const [reason, setReason] = useState('');
  const preview = type === 'entrada' ? product.stock + quantity : type === 'salida' ? Math.max(0, product.stock - quantity) : type === 'faltante' ? 0 : quantity;
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="movement-title">
      <div className="flex items-start justify-between gap-3"><div><h3 id="movement-title" className="text-lg font-bold text-white">{product.name}</h3><p className="mt-1 text-xs text-slate-400">Stock actual: {product.stock} · mínimo {product.minimum}</p></div><button type="button" className="icon-button" aria-label="Cerrar" onClick={onClose}><XMarkIcon className="h-5 w-5" /></button></div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{(['ajuste', 'entrada', 'salida', 'faltante'] as StockMovementType[]).map((option) => <button key={option} type="button" aria-pressed={type === option} className={`chip ${type === option ? 'chip-active' : ''}`} onClick={() => { setType(option); setQuantity(option === 'ajuste' ? product.stock : option === 'faltante' ? 0 : 1); }}>{option === 'ajuste' ? 'Conteo' : stockMovementLabels[option]}</button>)}</div>
      {type !== 'faltante' && <label className="mt-4 block text-xs font-semibold text-slate-300">{type === 'ajuste' ? '¿Cuántos hay ahora?' : type === 'entrada' ? '¿Cuántos entraron?' : '¿Cuántos salieron?'}<input className="field mt-1 w-full text-lg" type="number" inputMode="numeric" min="0" autoFocus value={quantity} onChange={(event) => setQuantity(toNumber(event.target.value))} /></label>}
      <label className="mt-3 block text-xs font-semibold text-slate-300">Motivo o nota (opcional)<input className="field mt-1 w-full" placeholder="Ej.: “Nos quedan 2”, venta, rotura, conteo de cierre" value={reason} onChange={(event) => setReason(event.target.value)} /></label>
      <p className="mt-3 text-sm text-slate-300">Quedará en <strong className="text-white">{preview}</strong> <StatusBadge product={{ stock: preview, minimum: product.minimum }} /></p>
      <div className="mt-5 flex justify-end gap-2"><button type="button" className="button-secondary" onClick={onClose}>Cancelar</button><button type="button" className="button-primary" onClick={() => onSave(type, quantity, reason)}><CheckIcon className="h-4 w-4" /> Guardar</button></div>
    </div>
  </div>;
}

function QuickProductDialog({ state, categories, onClose, onSave }: { state: DemoState; categories: string[]; onClose: () => void; onSave: (product: Product, supplierId: string, price: number) => void }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState('unidad');
  const [stock, setStock] = useState(0);
  const [minimum, setMinimum] = useState(5);
  const [supplierId, setSupplierId] = useState('');
  const [price, setPrice] = useState(0);
  const [error, setError] = useState('');
  const save = () => {
    const cleanName = name.trim();
    if (!cleanName) return setError('Escribí el nombre del producto.');
    if (state.products.some((product) => product.name.trim().toLocaleLowerCase('es') === cleanName.toLocaleLowerCase('es'))) return setError('Ya existe un producto con ese nombre. Buscalo en el stock y registrá el movimiento.');
    const used = new Set(state.products.map((product) => product.sku));
    let sequence = state.products.length + 1;
    let sku = '';
    do { sku = `ZAV-${String(sequence++).padStart(6, '0')}`; } while (used.has(sku));
    onSave({ id: `prod-${Date.now()}`, name: cleanName, sku, category: category.trim(), unit: unit.trim() || 'unidad', stock, minimum, active: true, currency: 'ARS', stockUpdatedAt: new Date().toISOString() }, supplierId, price);
  };
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="quick-product-title">
      <div className="flex items-start justify-between gap-3"><h3 id="quick-product-title" className="text-lg font-bold text-white">Anotar producto</h3><button type="button" className="icon-button" aria-label="Cerrar" onClick={onClose}><XMarkIcon className="h-5 w-5" /></button></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-slate-300 sm:col-span-2">Producto *<input className="field mt-1 w-full" autoFocus value={name} onChange={(event) => { setName(event.target.value); setError(''); }} placeholder="Ej.: Coca-Cola 2,25 L" /></label>
        <label className="text-xs font-semibold text-slate-300">Categoría<input className="field mt-1 w-full" list="stock-categories" value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Bebidas, Almacén…" /><datalist id="stock-categories">{categories.filter((item) => item !== UNCATEGORIZED).map((item) => <option key={item} value={item} />)}</datalist></label>
        <label className="text-xs font-semibold text-slate-300">Unidad<input className="field mt-1 w-full" value={unit} onChange={(event) => setUnit(event.target.value)} /></label>
        <label className="text-xs font-semibold text-slate-300">Stock actual<input className="field mt-1 w-full" type="number" inputMode="numeric" min="0" value={stock} onChange={(event) => setStock(toNumber(event.target.value))} /></label>
        <label className="text-xs font-semibold text-slate-300">Avisar cuando queden (mínimo)<input className="field mt-1 w-full" type="number" inputMode="numeric" min="0" value={minimum} onChange={(event) => setMinimum(toNumber(event.target.value))} /></label>
        <label className="text-xs font-semibold text-slate-300">Proveedor habitual<select className="field mt-1 w-full" value={supplierId} onChange={(event) => setSupplierId(event.target.value)}><option value="">Sin definir</option>{state.suppliers.filter((supplier) => supplier.active).map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
        <label className="text-xs font-semibold text-slate-300">Precio de compra<input className="field mt-1 w-full" type="number" inputMode="decimal" min="0" disabled={!supplierId} value={price} onChange={(event) => setPrice(toNumber(event.target.value))} /></label>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
      <div className="mt-5 flex justify-end gap-2"><button type="button" className="button-secondary" onClick={onClose}>Cancelar</button><button type="button" className="button-primary" onClick={save}><CheckIcon className="h-4 w-4" /> Guardar</button></div>
    </div>
  </div>;
}

function MissingTab({ state, products, onRestock, onMove }: { state: DemoState; products: Product[]; onRestock: (products: Product[]) => void; onMove: (product: Product, type: StockMovementType, quantity: number, reason?: string) => void }) {
  const listed = new Set(state.restockList.map((item) => item.productId));
  const pending = products.filter((product) => !listed.has(product.id));
  return <section className="card min-w-0 p-5">
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="font-bold text-white">Faltantes y stock bajo</h3><p className="mt-1 text-xs text-slate-400">Ordenados por urgencia, con la cantidad sugerida y el proveedor más conveniente.</p></div>
      <button type="button" className="button-primary" disabled={!pending.length} onClick={() => onRestock(pending)}><ShoppingCartIcon className="h-4 w-4" /> Agregar todos a Por pedir</button>
    </div>
    {products.length ? <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Producto</th><th>Categoría</th><th>Stock</th><th>Estado</th><th>Sugerido</th><th>Proveedor</th><th /></tr></thead><tbody>
      {products.map((product) => {
        const offer = preferredSupplier(product.id, state.supplierProducts, state.suppliers);
        return <tr key={product.id}>
          <td className="font-semibold text-white">{product.name}<div className="text-xs font-normal text-slate-500">{product.sku}</div></td>
          <td>{product.category || UNCATEGORIZED}</td>
          <td>{product.stock} / mín. {product.minimum}</td>
          <td><StatusBadge product={product} /></td>
          <td className="font-semibold text-white">{suggestedQuantity(product, offer?.minimum)}</td>
          <td>{offer ? <>{state.suppliers.find((supplier) => supplier.id === offer.supplierId)?.name}<div className="text-xs text-slate-500">{money(offer.price)}</div></> : <span className="text-amber-300">Sin proveedor</span>}</td>
          <td><div className="flex flex-wrap justify-end gap-2">{product.stock > 0 && <button type="button" className="button-secondary" onClick={() => onMove(product, 'faltante', 0, 'Se terminó')}>Se terminó</button>}{listed.has(product.id) ? <span className="badge-green">En lista</span> : <button type="button" className="button-primary" onClick={() => onRestock([product])}>Pedir</button>}</div></td>
        </tr>;
      })}
    </tbody></table></div> : <p className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-slate-400">🎉 No hay faltantes: todo está por encima del mínimo.</p>}
  </section>;
}

function RestockTab({ state, update, notify, onNavigate, userName, onGoStock }: { state: DemoState; update: Mutate; notify: (message: string) => void; onNavigate: (section: Section) => void; userName: string; onGoStock: () => void }) {
  const groups = Array.from(groupRestockBySupplier(state.restockList).entries()).sort(([a], [b]) => (a ? 0 : 1) - (b ? 0 : 1));
  const setItem = (productId: string, patch: Partial<RestockItem>) => update((current) => ({ ...current, restockList: current.restockList.map((item) => item.productId === productId ? { ...item, ...patch } : item) }));
  const remove = (productId: string) => update((current) => ({ ...current, restockList: current.restockList.filter((item) => item.productId !== productId) }));
  const generate = (supplierId?: string) => {
    const items = state.restockList.filter((item) => item.supplierId && (!supplierId || item.supplierId === supplierId));
    if (!items.length) return notify('Asigná un proveedor a los productos antes de generar el pedido');
    const orders = buildRestockOrders(items, { orderIds: state.orders.map((order) => order.id), supplierProducts: state.supplierProducts, responsible: userName, requester: userName, requestedAt: getLocalDateTimeInput(), today: getLocalDateISO(), nextId: (ids) => nextSequentialId('PED', ids, 1049, 4) });
    const generated = new Set(items.map((item) => item.productId));
    update((current) => ({ ...current, orders: [...current.orders, ...orders], restockList: current.restockList.filter((item) => !generated.has(item.productId)) }));
    notify(`${orders.length} pedido(s) generado(s): ${orders.map((order) => order.id).join(', ')}`);
    onNavigate('Pedidos');
  };
  if (!state.restockList.length) return <section className="card min-w-0 p-5"><h3 className="font-bold text-white">Por pedir</h3><div className="mt-4 rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-slate-400"><p>La lista está vacía. Marcá productos en Stock o Faltantes y agregalos acá.</p><button type="button" className="button-primary mt-4" onClick={onGoStock}><ClipboardDocumentListIcon className="h-4 w-4" /> Ver faltantes</button></div></section>;
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-300/20 bg-cyan-400/5 p-4"><p className="text-sm text-slate-300">Revisá cantidades y proveedor. Cada proveedor genera su propio pedido en el módulo Pedidos.</p><button type="button" className="button-primary" onClick={() => generate()}><ShoppingCartIcon className="h-4 w-4" /> Generar todos los pedidos</button></div>
    {groups.map(([supplierId, items]) => {
      const supplier = state.suppliers.find((item) => item.id === supplierId);
      const total = items.reduce((sum, item) => sum + item.quantity * (state.supplierProducts.find((offer) => offer.productId === item.productId && offer.supplierId === supplierId)?.price || 0), 0);
      return <section key={supplierId || 'none'} className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold text-white">{supplier?.name || 'Sin proveedor asignado'}</h3><p className="mt-1 text-xs text-slate-400">{items.length} producto(s){supplierId ? ` · total estimado ${money(total)}` : ' · elegí un proveedor para cada uno'}</p></div>{supplierId && <button type="button" className="button-primary" onClick={() => generate(supplierId)}>Generar pedido</button>}</div>
        <ul className="space-y-2">{items.map((item) => {
          const product = state.products.find((entry) => entry.id === item.productId);
          const offers = supplierOptions(item.productId, state.supplierProducts, state.suppliers);
          return <li key={item.productId} className="grid gap-3 rounded-xl border border-white/10 p-3 sm:grid-cols-[minmax(0,1fr)_110px_minmax(0,220px)_auto] sm:items-center">
            <div className="min-w-0"><div className="truncate font-semibold text-white">{product?.name || 'Producto eliminado'}</div><div className="text-xs text-slate-500">Stock {product?.stock ?? 0} · mín. {product?.minimum ?? 0}{product && <> · <StatusBadge product={product} /></>}</div></div>
            <label className="text-xs font-semibold text-slate-400">Cantidad<input className="field mt-1 w-full" type="number" inputMode="numeric" min="1" value={item.quantity} onChange={(event) => setItem(item.productId, { quantity: toNumber(event.target.value, 1) })} /></label>
            <label className="text-xs font-semibold text-slate-400">Proveedor<select className="field mt-1 w-full" value={item.supplierId} onChange={(event) => setItem(item.productId, { supplierId: event.target.value })}><option value="">Sin proveedor</option>{offers.map((offer) => <option key={offer.id} value={offer.supplierId}>{state.suppliers.find((entry) => entry.id === offer.supplierId)?.name} · {money(offer.price)}</option>)}{!offers.length && state.suppliers.filter((entry) => entry.active).map((entry) => <option key={entry.id} value={entry.id}>{entry.name} (sin precio)</option>)}</select></label>
            <button type="button" className="icon-button justify-self-end" aria-label={`Quitar ${product?.name || 'producto'} de la lista`} onClick={() => remove(item.productId)}><TrashIcon className="h-5 w-5" /></button>
          </li>;
        })}</ul>
      </section>;
    })}
  </div>;
}

function MovementsTab({ state }: { state: DemoState }) {
  const [productId, setProductId] = useState('');
  const [type, setType] = useState<'' | StockMovementType>('');
  const rows = [...state.stockMovements].reverse().filter((movement) => (!productId || movement.productId === productId) && (!type || movement.type === type));
  const productName = (id: string) => state.products.find((product) => product.id === id)?.name || 'Producto eliminado';
  const exportRows = () => downloadCsv('movimientos-stock.csv', ['Fecha', 'Producto', 'Tipo', 'Cambio', 'Antes', 'Después', 'Motivo', 'Usuario'], rows.map((row) => [new Date(row.date).toLocaleString('es-AR'), productName(row.productId), stockMovementLabels[row.type], row.quantity, row.before, row.after, row.reason, row.user]));
  return <section className="card min-w-0 p-5">
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="font-bold text-white">Registro de movimientos</h3><p className="mt-1 text-xs text-slate-400">Cada entrada, salida, conteo y recepción queda registrada con usuario y motivo.</p></div>
      <div className="flex flex-wrap gap-2">
        <select aria-label="Filtrar por producto" className="field" value={productId} onChange={(event) => setProductId(event.target.value)}><option value="">Todos los productos</option>{[...state.products].sort((a, b) => a.name.localeCompare(b.name, 'es')).map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select>
        <select aria-label="Filtrar por tipo" className="field" value={type} onChange={(event) => setType(event.target.value as typeof type)}><option value="">Todos los tipos</option>{Object.entries(stockMovementLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
        <button type="button" className="button-secondary" disabled={!rows.length} onClick={exportRows}><ArrowDownTrayIcon className="h-4 w-4" /> CSV</button>
      </div>
    </div>
    {rows.length ? <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th>Cambio</th><th>Stock</th><th>Motivo</th><th>Usuario</th></tr></thead><tbody>
      {rows.slice(0, 300).map((row) => <tr key={row.id}>
        <td className="whitespace-nowrap">{new Date(row.date).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</td>
        <td className="font-semibold text-white">{productName(row.productId)}</td>
        <td>{stockMovementLabels[row.type]}</td>
        <td className={row.quantity > 0 ? 'text-emerald-300' : row.quantity < 0 ? 'text-red-300' : ''}>{row.quantity > 0 ? `+${row.quantity}` : row.quantity}</td>
        <td>{row.before} → <strong className="text-white">{row.after}</strong></td>
        <td>{row.reason || '—'}</td>
        <td>{row.user}</td>
      </tr>)}
    </tbody></table>{rows.length > 300 && <p className="mt-3 text-xs text-slate-500">Mostrando los 300 más recientes. Exportá el CSV para ver todo.</p>}</div> : <p className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-slate-400">Todavía no hay movimientos registrados.</p>}
  </section>;
}
