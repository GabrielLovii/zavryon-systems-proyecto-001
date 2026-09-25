'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownTrayIcon, CameraIcon, CheckCircleIcon, PhotoIcon, ExclamationTriangleIcon, PlusIcon, QrCodeIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { DemoState } from '@/lib/demo-store';
import type { Product } from '@/lib/mock-data';
import { createScanDetector, findByBarcode, isValidGtin, normalizeBarcode, salePrice } from '@/lib/barcode';
import { downloadCsv, money, toNumber } from '@/lib/format';
import { UNCATEGORIZED } from '@/lib/stock';
import { QuickProductDialog } from './quick-create';
import { SearchField } from './search-field';
import { isCoarsePointer, useEscape, useWakeLock, vibrate } from '@/lib/device';
import { isBoolean, isNumber, isString, usePageHidden, usePersistentState } from '@/lib/ui-state';

type Mutate = (fn: (state: DemoState) => DemoState) => void;
type BarcodeDetectorLike = { detect: (source: CanvasImageSource | ImageBitmap) => Promise<{ rawValue: string }[]> };
const BARCODE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'qr_code'];

/** Reads a barcode from a photo (camera shot or gallery image). Returns '' when none is found. */
async function readBarcodeFromImage(file: File) {
  if (!window.BarcodeDetector) throw new Error('Este navegador no puede leer códigos en fotos. Usá Chrome en Android/PC o una lectora.');
  const bitmap = await createImageBitmap(file);
  try {
    const found = await new window.BarcodeDetector({ formats: BARCODE_FORMATS }).detect(bitmap);
    return normalizeBarcode(found[0]?.rawValue || '');
  } finally { bitmap.close(); }
}
declare global { interface Window { BarcodeDetector?: new (options?: { formats?: string[] }) => BarcodeDetectorLike } }

/** Listens for scanner bursts anywhere on the page while no text field has focus. */
export function useGlobalScanner(onScan: (code: string) => void, enabled = true) {
  const handler = useRef(onScan); handler.current = onScan;
  useEffect(() => {
    if (!enabled) return;
    const detect = createScanDetector({ onScan: (code) => { vibrate(35); handler.current(normalizeBarcode(code)); } });
    const onKey = (event: KeyboardEvent) => { const target = event.target as HTMLElement | null; if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return; detect(event); };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [enabled]);
}

/** Camera scanning with the browser BarcodeDetector (Chrome/Edge on Android and desktop). */
function CameraScanner({ onDetect, onClose }: { onDetect: (code: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState('');
  const detected = useRef(onDetect); detected.current = onDetect;
  // Never keep the camera on in the background: closing unmounts this and stops every track.
  usePageHidden(onClose);
  useEscape(onClose);
  useEffect(() => {
    let stream: MediaStream | null = null; let frame = 0; let stopped = false;
    const start = async () => {
      try {
        if (!window.BarcodeDetector) throw new Error('Este navegador no puede leer códigos con la cámara. Usá Chrome en Android o una lectora.');
        const detector = new window.BarcodeDetector({ formats: BARCODE_FORMATS });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (!video.current) return;
        video.current.srcObject = stream; await video.current.play();
        const tick = async () => { if (stopped || !video.current) return; try { const codes = await detector.detect(video.current); if (codes[0]?.rawValue) { stopped = true; detected.current(normalizeBarcode(codes[0].rawValue)); return; } } catch { /* Frame not ready yet. */ } frame = window.requestAnimationFrame(() => void tick()); };
        void tick();
      } catch (cause) { setError(cause instanceof Error ? (cause.name === 'NotAllowedError' ? 'Permiso de cámara denegado. Habilitalo en el navegador.' : cause.message) : 'No se pudo abrir la cámara.'); }
    };
    void start();
    return () => { stopped = true; window.cancelAnimationFrame(frame); stream?.getTracks().forEach((track) => track.stop()); };
  }, []);
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="modal-card" role="dialog" aria-modal="true" aria-label="Escanear con la cámara">
    <div className="mb-3 flex items-center justify-between"><h3 className="font-bold text-white">Apuntá al código de barras</h3><button type="button" className="icon-button" aria-label="Cerrar cámara" onClick={onClose}><XMarkIcon className="h-5 w-5" /></button></div>
    {error ? <p className="text-sm text-amber-200">{error}</p> : <div className="relative overflow-hidden rounded-xl bg-black"><video ref={video} className="aspect-[4/3] w-full object-cover" muted playsInline /><div className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-red-500/80 shadow-[0_0_12px_rgba(239,68,68,.9)]" /></div>}
  </div></div>;
}

/** Input that receives scanner "typing" (ends with Enter) or manual entry, plus an optional camera button. */
export function ScanInput({ onScan, placeholder = 'Escaneá o escribí el código y Enter', autoFocus = true, label = 'Código de barras' }: { onScan: (code: string) => void; placeholder?: string; autoFocus?: boolean; label?: string }) {
  const [value, setValue] = useState('');
  const [camera, setCamera] = useState(false);
  const [cameraAvailable, setCameraAvailable] = useState(false);
  const [photoStatus, setPhotoStatus] = useState('');
  const [touch] = useState(isCoarsePointer);
  const input = useRef<HTMLInputElement>(null);
  const photo = useRef<HTMLInputElement>(null);
  const fromPhoto = async (file: File | undefined) => {
    if (!file) return;
    setPhotoStatus('Leyendo la foto…');
    try { const code = await readBarcodeFromImage(file); if (code) { setPhotoStatus(''); submit(code); } else setPhotoStatus('No se encontró un código en la foto. Probá más cerca, con buena luz y el código derecho.'); }
    catch (cause) { setPhotoStatus(cause instanceof Error ? cause.message : 'No se pudo leer la foto.'); }
    finally { if (photo.current) photo.current.value = ''; }
  };
  useEffect(() => { setCameraAvailable(Boolean(window.BarcodeDetector) && Boolean(navigator.mediaDevices?.getUserMedia)); }, []);
  // On tablets, refocusing would pop the on-screen keyboard over the results; only keep focus if it was there.
  const submit = (raw: string) => { const code = normalizeBarcode(raw); const hadFocus = document.activeElement === input.current; setValue(''); if (code) { vibrate(35); onScan(code); } if (!touch || hadFocus) input.current?.focus(); };
  return <div>
    <label className="block text-xs font-semibold text-slate-300" htmlFor="scan-input">{label}</label>
    <div className="mt-1 flex gap-2">
      <div className="relative min-w-0 flex-1"><QrCodeIcon aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-cyan-300" /><input id="scan-input" ref={input} className="field w-full pl-10 text-base tracking-wider" inputMode="numeric" enterKeyHint="go" autoComplete="off" autoFocus={autoFocus && !touch} value={value} placeholder={placeholder} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); submit(value); } }} /></div>
      <button type="button" className="button-secondary" onClick={() => submit(value)} disabled={!value.trim()}>OK</button>
      {cameraAvailable && <button type="button" className="button-secondary" onClick={() => setCamera(true)} aria-label="Escanear con la cámara en vivo" title="Cámara en vivo"><CameraIcon className="h-5 w-5" /></button>}
      <button type="button" className="button-secondary" onClick={() => photo.current?.click()} aria-label="Leer código desde una foto" title="Sacar o elegir una foto"><PhotoIcon className="h-5 w-5" /><span className="hidden sm:inline">Foto</span></button>
      <input ref={photo} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => void fromPhoto(event.target.files?.[0])} />
    </div>
    {photoStatus && <p role="status" className="mt-1 text-xs text-amber-200">{photoStatus}</p>}
    <p className="mt-1 text-[11px] text-slate-500">Funciona con lectoras USB, USB‑C o Bluetooth (modo teclado), con una foto{cameraAvailable ? ' o con la cámara en vivo' : ''}.</p>
    {camera && <CameraScanner onDetect={(code) => { setCamera(false); submit(code); }} onClose={() => setCamera(false)} />}
  </div>;
}

type ScanResult = { code: string; product?: Product; valid: boolean | null; at: number };

/** Barcode workspace: look up products by scanning, assign real barcodes and export a price list. */
export function BarcodeScreen({ state, update, notify, userName }: { state: DemoState; update: Mutate; notify: (message: string) => void; userName: string }) {
  const [last, setLast] = useState<ScanResult | null>(null);
  const [assignTo, setAssignTo] = useState('');
  const [query, setQuery] = usePersistentState('barcode:query', '', isString);
  const [creating, setCreating] = useState(false);
  const [margin, setMargin] = usePersistentState('barcode:margin', 35, isNumber);
  const [rounding, setRounding] = usePersistentState('barcode:rounding', 10, isNumber);
  const [onlyMissing, setOnlyMissing] = usePersistentState('barcode:only-missing', true, isBoolean);
  const products = useMemo(() => state.products.filter((product) => product.active).sort((a, b) => a.name.localeCompare(b.name, 'es')), [state.products]);
  const withCode = products.filter((product) => product.barcode).length;
  const pending = products.filter((product) => !product.barcode);
  const list = products.filter((product) => (!onlyMissing || !product.barcode) && (!query.trim() || `${product.name} ${product.sku} ${product.barcode || ''}`.toLowerCase().includes(query.trim().toLowerCase())));
  const cheapest = (product: Product) => state.supplierProducts.filter((offer) => offer.productId === product.id && offer.active).sort((a, b) => a.price - b.price)[0];

  const assign = (productId: string, code: string) => {
    const other = findByBarcode(state.products, code);
    if (other && other.id !== productId) return notify(`Ese código ya pertenece a ${other.name}`);
    update((current) => ({ ...current, products: current.products.map((product) => product.id === productId ? { ...product, barcode: code } : product) }));
    const product = state.products.find((item) => item.id === productId);
    notify(`Código ${code} asignado a ${product?.name}`);
    setLast({ code, product: product ? { ...product, barcode: code } : undefined, valid: isValidGtin(code), at: Date.now() });
    // Next product without code, so a whole shelf can be coded in a row.
    const next = pending.find((item) => item.id !== productId);
    setAssignTo(next?.id || '');
  };
  const onScan = (code: string) => {
    const product = findByBarcode(state.products, code);
    if (product) { setLast({ code, product, valid: isValidGtin(code), at: Date.now() }); return; }
    if (assignTo) return assign(assignTo, code);
    setLast({ code, valid: isValidGtin(code), at: Date.now() });
  };
  useGlobalScanner(onScan);
  useWakeLock(true);

  const exportPrices = () => {
    const rows = products.map((product) => { const offer = cheapest(product); const supplier = state.suppliers.find((item) => item.id === offer?.supplierId); return [product.barcode || '', product.sku, product.name, product.category || UNCATEGORIZED, product.brand || '', offer?.presentation || product.unit, supplier?.name || '', offer?.externalCode || '', offer?.price ?? '', margin, offer ? salePrice(offer.price, margin, rounding) : '', product.stock]; });
    downloadCsv(`lista-precios-${new Date().toISOString().slice(0, 10)}.csv`, ['Código de barras', 'Código interno', 'Producto', 'Categoría', 'Marca', 'Presentación', 'Proveedor', 'Código proveedor', 'Costo', 'Margen %', 'Precio venta', 'Stock'], rows);
    notify(`Lista de precios exportada (${rows.length} productos)`);
  };

  return <div className="space-y-5">
    <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
      <section className="card min-w-0 p-5">
        <h3 className="font-bold text-white">Escanear</h3>
        <p className="mt-1 text-xs text-slate-400">Conectá la lectora (USB, USB‑C o Bluetooth) y escaneá: si el producto existe lo muestra; si no, se lo asignás.</p>
        <div className="mt-4"><ScanInput onScan={onScan} /></div>
        <label className="mt-4 block text-xs font-semibold text-slate-300">Asignar el próximo código nuevo a<select className="field mt-1 w-full" value={assignTo} onChange={(event) => setAssignTo(event.target.value)}><option value="">— Solo buscar (no asignar) —</option>{pending.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.sku}</option>)}</select></label>
        {last && <div className={`mt-4 rounded-xl border p-4 ${last.product ? 'border-emerald-400/30 bg-emerald-400/5' : 'border-amber-400/30 bg-amber-400/5'}`} role="status">
          <div className="flex items-center gap-2 text-sm font-bold text-white">{last.product ? <CheckCircleIcon className="h-5 w-5 text-emerald-300" /> : <ExclamationTriangleIcon className="h-5 w-5 text-amber-300" />}{last.code}{last.valid === false && <span className="badge-red">Dígito verificador inválido</span>}</div>
          {last.product ? (() => { const offer = cheapest(last.product); return <div className="mt-2 text-sm text-slate-300"><div className="text-base font-semibold text-white">{last.product.name}</div><div className="text-xs text-slate-400">{last.product.sku} · {last.product.category || UNCATEGORIZED} · stock {state.products.find((item) => item.id === last.product?.id)?.stock ?? last.product.stock}</div>{offer && <div className="mt-1">Costo {money(offer.price)} ({state.suppliers.find((item) => item.id === offer.supplierId)?.name}) · venta sugerida <strong className="text-white">{money(salePrice(offer.price, margin, rounding))}</strong></div>}</div>; })()
            : <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-amber-100"><span>Código nuevo. Asignalo a un producto:</span><select aria-label="Asignar a producto" className="field" defaultValue="" onChange={(event) => { if (event.target.value) assign(event.target.value, last.code); }}><option value="">Elegí producto…</option>{pending.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select><button type="button" className="button-secondary" onClick={() => setCreating(true)}><PlusIcon className="h-4 w-4" /> Producto nuevo</button></div>}
        </div>}
      </section>
      <section className="card min-w-0 p-5">
        <h3 className="font-bold text-white">Lista de precios para exportar</h3>
        <p className="mt-1 text-xs text-slate-400">CSV con código de barras, costo del proveedor más barato y precio de venta con tu margen. Se abre en Excel o se importa en otro sistema.</p>
        <div className="mt-4 grid grid-cols-2 gap-3"><label className="text-xs font-semibold text-slate-300">Margen %<input className="field mt-1 w-full" type="number" inputMode="decimal" min="0" value={margin} onChange={(event) => setMargin(toNumber(event.target.value))} /></label><label className="text-xs font-semibold text-slate-300">Redondear a<select className="field mt-1 w-full" value={rounding} onChange={(event) => setRounding(Number(event.target.value))}><option value={0}>Sin redondeo</option><option value={10}>$ 10</option><option value={50}>$ 50</option><option value={100}>$ 100</option></select></label></div>
        <div className="mt-4 flex items-center justify-between gap-3"><span className="text-sm text-slate-300">{withCode} de {products.length} productos con código</span><button type="button" className="button-primary" onClick={exportPrices}><ArrowDownTrayIcon className="h-4 w-4" /> Exportar CSV</button></div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-cyan-400" style={{ width: `${products.length ? (withCode / products.length) * 100 : 0}%` }} /></div>
      </section>
    </div>
    <section className="card min-w-0 p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold text-white">Productos y códigos</h3><div className="flex flex-wrap items-center gap-2"><SearchField label="Buscar producto por nombre o código" className="w-full sm:w-56" placeholder="Buscar…" value={query} onChange={setQuery} /><label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" className="h-4 w-4 accent-cyan-400" checked={onlyMissing} onChange={(event) => setOnlyMissing(event.target.checked)} /> Solo sin código</label></div></div>
      {list.length ? <ul className="grid gap-2 md:grid-cols-2">{list.map((product) => <li key={product.id} className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${assignTo === product.id ? 'border-cyan-300/60 bg-cyan-400/10' : 'border-white/10'}`}><div className="min-w-0"><div className="truncate font-semibold text-white">{product.name}</div><div className="text-xs text-slate-500">{product.sku} · {product.barcode ? <span className="text-emerald-300">EAN {product.barcode}</span> : 'sin código'}</div></div>{product.barcode ? <button type="button" className="link-button" onClick={() => { if (window.confirm(`¿Quitar el código ${product.barcode} de ${product.name}?`)) update((current) => ({ ...current, products: current.products.map((item) => item.id === product.id ? { ...item, barcode: undefined } : item) })); }}>Quitar</button> : <button type="button" className={assignTo === product.id ? 'button-primary' : 'button-secondary'} onClick={() => { setAssignTo(product.id); document.getElementById('scan-input')?.focus(); }}>{assignTo === product.id ? 'Escaneá ahora…' : 'Asignar'}</button>}</li>)}</ul> : <p className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-slate-400">{onlyMissing ? '¡Todos los productos tienen código!' : 'Sin resultados.'}</p>}
    </section>
    {creating && last && <QuickProductDialog state={state} update={update} userName={userName} onClose={() => setCreating(false)} onCreated={(product) => { setCreating(false); update((current) => ({ ...current, products: current.products.map((item) => item.id === product.id ? { ...item, barcode: last.code } : item) })); setLast({ ...last, product: { ...product, barcode: last.code } }); notify(`${product.name} creado con el código ${last.code}`); }} />}
  </div>;
}
