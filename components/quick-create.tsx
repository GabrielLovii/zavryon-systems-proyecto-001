'use client';

import { useMemo, useState } from 'react';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { DemoState } from '@/lib/demo-store';
import { paymentPreferences, type Product, type Supplier, type SupplierProduct } from '@/lib/mock-data';
import { nextInternalSku } from '@/lib/stock';
import { NumberField } from './number-field';

type Mutate = (fn: (state: DemoState) => DemoState) => void;
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

function Dialog({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }}>
    <div className="modal-card max-h-[92vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="quick-create-title">
      <div className="flex items-start justify-between gap-3"><div><h3 id="quick-create-title" className="text-lg font-bold text-white">{title}</h3>{subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}</div><button type="button" className="icon-button" aria-label="Cerrar" onClick={onClose}><XMarkIcon className="h-5 w-5" /></button></div>
      {children}
    </div>
  </div>;
}
const Label = ({ text, children, wide }: { text: string; children: React.ReactNode; wide?: boolean }) => <label className={`text-xs font-semibold text-slate-300 ${wide ? 'sm:col-span-2' : ''}`}>{text}{children}</label>;

/**
 * Creates a product (with internal code) and its price for a supplier in one step.
 * If a product with the same name already exists, it offers to link it to the supplier instead of duplicating it.
 */
export function QuickProductDialog({ state, update, supplierId: fixedSupplierId, initialName = '', userName, onClose, onCreated }: { state: DemoState; update: Mutate; supplierId?: string; initialName?: string; userName: string; onClose: () => void; onCreated: (product: Product, offer: SupplierProduct | null) => void }) {
  const [name, setName] = useState(initialName);
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [unit, setUnit] = useState('unidad');
  const [supplierId, setSupplierId] = useState(fixedSupplierId || '');
  const [supplierCode, setSupplierCode] = useState('');
  const [price, setPrice] = useState(0);
  const [stock, setStock] = useState(0);
  const [minimum, setMinimum] = useState(5);
  const [error, setError] = useState('');
  const categories = useMemo(() => Array.from(new Set(state.products.map((product) => product.category.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'es')), [state.products]);
  const existing = name.trim() ? state.products.find((product) => product.name.trim().toLowerCase() === name.trim().toLowerCase()) : undefined;
  const alreadyLinked = existing && supplierId ? state.supplierProducts.some((offer) => offer.productId === existing.id && offer.supplierId === supplierId && offer.active) : false;
  const supplierName = state.suppliers.find((supplier) => supplier.id === supplierId)?.name;

  const link = (product: Product): SupplierProduct | null => supplierId ? { id: `sp-${Date.now()}`, supplierId, productId: product.id, price, currency: 'ARS', externalCode: supplierCode.trim() || undefined, presentation: unit.trim() || product.unit, brand: brand.trim() || product.brand, category: category.trim() || product.category, active: true } : null;
  const save = () => {
    const cleanName = name.trim();
    if (!cleanName) return setError('Escribí el nombre del producto.');
    if (supplierId && !(price > 0)) return setError('Ingresá el precio de compra.');
    if (existing) {
      if (alreadyLinked) return setError(`${existing.name} ya está en la lista de ${supplierName}. Buscalo y agregalo.`);
      const offer = link(existing);
      update((current) => ({ ...current, supplierProducts: offer ? [...current.supplierProducts, offer] : current.supplierProducts }));
      onCreated(existing, offer);
      return;
    }
    const product: Product = { id: `prod-${Date.now()}`, name: cleanName, sku: nextInternalSku(state.products), brand: brand.trim() || undefined, category: category.trim(), unit: unit.trim() || 'unidad', stock, minimum, active: true, currency: 'ARS', availability: 'Disponible', stockUpdatedAt: new Date().toISOString() };
    const offer = link(product);
    update((current) => ({
      ...current,
      products: [...current.products, product],
      supplierProducts: offer ? [...current.supplierProducts, offer] : current.supplierProducts,
      stockMovements: stock ? [...current.stockMovements, { id: `mov-${Date.now()}-${product.id}`, productId: product.id, type: 'ajuste' as const, quantity: stock, before: 0, after: stock, reason: 'Alta de producto', user: userName, date: new Date().toISOString() }] : current.stockMovements,
    }));
    onCreated(product, offer);
  };

  return <Dialog title={existing ? 'Producto existente' : 'Nuevo producto'} subtitle={existing ? `Ya existe “${existing.name}” (${existing.sku}). Se vinculará${supplierName ? ` a ${supplierName}` : ''} con este precio, sin duplicarlo.` : 'Se genera un código interno único. El código del proveedor queda guardado aparte.'} onClose={onClose}>
    <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); save(); }}>
      <Label text="Producto *" wide><input className="field mt-1 w-full" autoFocus value={name} onChange={(event) => { setName(event.target.value); setError(''); }} placeholder="Ej.: Yerba mate Rosamonte 1 kg" /></Label>
      {!fixedSupplierId && <Label text="Proveedor" wide><select className="field mt-1 w-full" value={supplierId} onChange={(event) => setSupplierId(event.target.value)}><option value="">Sin proveedor por ahora</option>{state.suppliers.filter((supplier) => supplier.active).map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></Label>}
      {!existing && <>
        <Label text="Categoría"><input className="field mt-1 w-full" list="quick-categories" value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Bebidas, Almacén…" /><datalist id="quick-categories">{categories.map((item) => <option key={item} value={item} />)}</datalist></Label>
        <Label text="Marca"><input className="field mt-1 w-full" value={brand} onChange={(event) => setBrand(event.target.value)} /></Label>
      </>}
      <Label text="Presentación"><input className="field mt-1 w-full" value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="Caja x 12, 1 kg…" /></Label>
      {supplierId && <Label text="Código del proveedor"><input className="field mt-1 w-full" value={supplierCode} onChange={(event) => setSupplierCode(event.target.value)} placeholder="Opcional" /></Label>}
      {supplierId && <Label text="Precio de compra *"><NumberField className="field mt-1 w-full" value={price} onChange={setPrice} /></Label>}
      {!existing && <>
        <Label text="Stock actual"><NumberField className="field mt-1 w-full" decimals={false} value={stock} onChange={setStock} /></Label>
        <Label text="Avisar cuando queden (mínimo)"><NumberField className="field mt-1 w-full" decimals={false} value={minimum} onChange={setMinimum} /></Label>
      </>}
      {error && <p role="alert" className="text-sm text-red-300 sm:col-span-2">{error}</p>}
      <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" className="button-secondary" onClick={onClose}>Cancelar</button><button type="submit" className="button-primary"><CheckIcon className="h-4 w-4" /> {existing ? 'Vincular y agregar' : 'Crear producto'}</button></div>
    </form>
  </Dialog>;
}

/** Creates a supplier with the essentials to send orders (contact and WhatsApp phone). */
export function QuickSupplierDialog({ state, update, initialName = '', onClose, onCreated }: { state: DemoState; update: Mutate; initialName?: string; onClose: () => void; onCreated: (supplier: Supplier) => void }) {
  const [draft, setDraft] = useState<Supplier>({ id: `sup-${Date.now()}`, name: initialName, contact: '', phone: '', email: '', address: '', terms: 'Transferencia', notes: '', active: true });
  const [error, setError] = useState('');
  const set = (patch: Partial<Supplier>) => { setDraft((current) => ({ ...current, ...patch })); setError(''); };
  const save = () => {
    const name = draft.name.trim();
    if (!name) return setError('Escribí el nombre del proveedor.');
    const duplicate = state.suppliers.find((supplier) => supplier.name.trim().toLowerCase() === name.toLowerCase());
    if (duplicate) return setError(`Ya existe ${duplicate.name}${duplicate.active ? '' : ' (desactivado: activalo desde Proveedores)'}.`);
    if (draft.email && !EMAIL_PATTERN.test(draft.email.trim())) return setError('El email no es válido.');
    const supplier = { ...draft, name, contact: draft.contact.trim(), phone: draft.phone.trim(), email: draft.email.trim() };
    update((current) => ({ ...current, suppliers: [...current.suppliers, supplier] }));
    onCreated(supplier);
  };
  return <Dialog title="Nuevo proveedor" subtitle="Con el teléfono podés mandarle los pedidos por WhatsApp." onClose={onClose}>
    <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); save(); }}>
      <Label text="Nombre *" wide><input className="field mt-1 w-full" autoFocus value={draft.name} onChange={(event) => set({ name: event.target.value })} placeholder="Ej.: Distribuidora Misiones" /></Label>
      <Label text="Contacto"><input className="field mt-1 w-full" value={draft.contact} onChange={(event) => set({ contact: event.target.value })} placeholder="Nombre del vendedor" /></Label>
      <Label text="Teléfono / WhatsApp"><input className="field mt-1 w-full" type="tel" inputMode="tel" value={draft.phone} onChange={(event) => set({ phone: event.target.value })} placeholder="+54 376 …" /></Label>
      <Label text="Email"><input className="field mt-1 w-full" type="email" value={draft.email} onChange={(event) => set({ email: event.target.value })} /></Label>
      <Label text="Forma de pago"><select className="field mt-1 w-full" value={draft.terms} onChange={(event) => set({ terms: event.target.value })}>{paymentPreferences.map((option) => <option key={option}>{option}</option>)}</select></Label>
      {error && <p role="alert" className="text-sm text-red-300 sm:col-span-2">{error}</p>}
      <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" className="button-secondary" onClick={onClose}>Cancelar</button><button type="submit" className="button-primary"><CheckIcon className="h-4 w-4" /> Crear proveedor</button></div>
    </form>
  </Dialog>;
}
