'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDaysIcon, ClipboardDocumentIcon, GiftIcon, ShoppingCartIcon, SparklesIcon } from '@heroicons/react/24/outline';
import type { DemoState } from '@/lib/demo-store';
import type { Product } from '@/lib/mock-data';
import { buildCombos, seasonFor, seasonInfo, seasonalRecommendations, upcomingEvents, type ComboSuggestion, type EventKind, type Recommendation } from '@/lib/seasonal';
import { stockStatusLabels } from '@/lib/stock';
import { money, toNumber } from '@/lib/format';

const actionLabel: Record<Recommendation['action'], string> = { reforzar: 'Reforzar stock', ofertar: 'Buen momento para ofertar', combo: 'Armar combo / promo' };
const actionClass: Record<Recommendation['action'], string> = { reforzar: 'badge-red', ofertar: 'badge-green', combo: 'badge-amber' };
const kindLabel: Record<EventKind, string> = { feriado: 'Feriado', comercial: 'Fecha comercial', regional: 'Misiones', cobro: 'Cobro' };
const kindClass: Record<EventKind, string> = { feriado: 'badge-red', comercial: 'badge-amber', regional: 'badge-green', cobro: 'badge-muted' };
const dateLabel = (iso: string) => new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${iso}T00:00:00`));

/** Today's date only after mount, so server and client renders match. */
function useToday() { const [today, setToday] = useState<Date | null>(null); useEffect(() => setToday(new Date()), []); return today; }

/** Text ready to paste in WhatsApp or print as a shelf sign. */
const comboSign = (combo: ComboSuggestion) => [`🔥 ${combo.name.toUpperCase()} · ${combo.occasion}`, ...combo.items.map((item) => `• ${item.product.name}`), `Antes ${money(combo.regularPrice)} → AHORA ${money(combo.comboPrice)}`].join('\n');

function ComboCard({ combo, onCopy }: { combo: ComboSuggestion; onCopy: (combo: ComboSuggestion) => void }) {
  const margin = combo.cost ? Math.round(((combo.comboPrice - combo.cost) / combo.comboPrice) * 100) : 0;
  return <li className="flex flex-col rounded-xl border border-amber-300/25 bg-amber-400/5 p-4">
    <div className="flex items-start justify-between gap-2"><div><div className="font-bold text-white">{combo.name}</div><div className="text-xs text-slate-400">{combo.occasion}</div></div><span className="badge-amber">-{combo.discount}%</span></div>
    <ul className="mt-3 flex-1 space-y-1 text-sm">{combo.items.map((item) => <li key={item.product.id} className="flex justify-between gap-2 text-slate-300"><span className="min-w-0 truncate">{item.product.name}{item.product.stock <= 0 && <span className="ml-1 text-xs text-red-300">(sin stock)</span>}</span><span className="shrink-0 text-slate-500">{item.cost ? money(item.price) : 'sin precio'}</span></li>)}</ul>
    {combo.missing.length > 0 && <p className="mt-2 text-xs text-amber-200">Para completarlo sumá al catálogo: {combo.missing.join(', ')}.</p>}
    <div className="mt-3 flex items-end justify-between gap-2 border-t border-white/10 pt-3"><div><div className="text-xs text-slate-500 line-through">{money(combo.regularPrice)}</div><div className="text-xl font-bold text-white">{money(combo.comboPrice)}</div><div className="text-[11px] text-slate-500">Costo {money(combo.cost)} · margen {margin}%</div></div><button type="button" className="button-secondary" onClick={() => onCopy(combo)}><ClipboardDocumentIcon className="h-4 w-4" /> Copiar cartel</button></div>
  </li>;
}

export function SeasonTab({ state, onRestock, notify = () => undefined }: { state: DemoState; onRestock: (products: Product[]) => void; notify?: (message: string) => void }) {
  const today = useToday();
  const [margin, setMargin] = useState(35);
  const [showPaydays, setShowPaydays] = useState(false);
  const recommendations = useMemo(() => today ? seasonalRecommendations(state.products, state.stockMovements, today, 24) : [], [state.products, state.stockMovements, today]);
  const calendar = useMemo(() => today ? upcomingEvents(today, 90, showPaydays) : [], [today, showPaydays]);
  const combos = useMemo(() => {
    if (!today) return [];
    const season = seasonFor(today);
    const soon = upcomingEvents(today, 45).flatMap((event) => event.combos.map((template) => ({ template, occasion: `${event.name} · ${event.daysAway === 0 ? 'hoy' : `en ${event.daysAway} días`}` })));
    const seasonal = seasonInfo(season).combos.map((template) => ({ template, occasion: `Temporada de ${season}` }));
    return buildCombos([...soon, ...seasonal], state.products, state.supplierProducts, state.suppliers, margin);
  }, [today, state.products, state.supplierProducts, state.suppliers, margin]);
  if (!today) return null;
  const season = seasonFor(today);
  const info = seasonInfo(season);
  const listed = new Set(state.restockList.map((item) => item.productId));
  const toReinforce = recommendations.filter((item) => item.action === 'reforzar' && !listed.has(item.product.id)).map((item) => item.product);
  const copy = async (combo: ComboSuggestion) => { try { await navigator.clipboard.writeText(comboSign(combo)); notify(`Cartel de ${combo.name} copiado: pegalo en WhatsApp o imprimilo`); } catch { notify('No se pudo copiar; seleccioná el texto manualmente.'); } };

  return <div className="space-y-5">
    <section className="card min-w-0 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-3"><SparklesIcon className="h-6 w-6 shrink-0 text-amber-300" /><div><h3 className="font-bold text-white first-letter:uppercase">{season}</h3><p className="mt-1 text-sm text-slate-300">{info.label}</p><p className="mt-2 text-sm text-cyan-200">💡 {info.idea}</p></div></div>{toReinforce.length > 0 && <button type="button" className="button-primary" onClick={() => onRestock(toReinforce)}><ShoppingCartIcon className="h-4 w-4" /> Pedir lo que falta para la temporada ({toReinforce.length})</button>}</div>
    </section>

    <div className="grid gap-5 xl:grid-cols-[1fr_1.4fr]">
      <section className="card min-w-0 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="flex items-center gap-2 font-bold text-white"><CalendarDaysIcon className="h-5 w-5 text-cyan-300" /> Calendario comercial · 90 días</h3><label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" className="h-4 w-4 accent-cyan-400" checked={showPaydays} onChange={(event) => setShowPaydays(event.target.checked)} /> Cobro de sueldos</label></div>
        {calendar.length ? <ol className="mt-4 space-y-2">{calendar.map((event) => <li key={`${event.id}-${event.date}`} className="flex gap-3 rounded-xl border border-white/10 p-3"><div className="w-16 shrink-0 text-center"><div className="text-lg font-bold leading-none text-white">{event.daysAway === 0 ? 'Hoy' : event.daysAway}</div><div className="text-[10px] uppercase text-slate-500">{event.daysAway === 0 ? '' : 'días'}</div></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-white">{event.name}</span><span className={kindClass[event.kind]}>{kindLabel[event.kind]}</span></div><div className="text-xs capitalize text-slate-500">{dateLabel(event.date)}</div><div className="mt-1 text-xs text-slate-400">{event.idea}</div></div></li>)}</ol> : <p className="mt-4 text-sm text-slate-400">Sin fechas especiales en los próximos 90 días.</p>}
      </section>

      <section className="card min-w-0 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="flex items-center gap-2 font-bold text-white"><GiftIcon className="h-5 w-5 text-amber-300" /> Combos sugeridos con tus productos</h3><label className="flex items-center gap-2 text-xs font-semibold text-slate-300">Margen %<input className="field w-20" type="number" inputMode="decimal" min="0" value={margin} onChange={(event) => setMargin(toNumber(event.target.value))} /></label></div>
        <p className="mt-1 text-xs text-slate-400">Precio de cada producto = costo del proveedor más barato + margen. El combo aplica el descuento sin bajar del 10% sobre el costo.</p>
        {combos.length ? <ul className="mt-4 grid gap-3 md:grid-cols-2">{combos.map((combo) => <ComboCard key={combo.name} combo={combo} onCopy={(item) => void copy(item)} />)}</ul> : <p className="mt-4 rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-slate-400">Todavía no hay productos suficientes para armar combos de esta época. Cargá productos de las categorías sugeridas (bebidas, almacén, golosinas…).</p>}
      </section>
    </div>

    <section className="card min-w-0 p-5">
      <h3 className="font-bold text-white">Productos recomendados</h3>
      <p className="mt-1 text-xs text-slate-400">Según la temporada, las fechas que se vienen y lo que más salió de tu stock en los últimos 30 días. Es una guía para planificar: revisá precios y márgenes antes de ofertar.</p>
      {recommendations.length ? <ul className="mt-4 grid gap-2 md:grid-cols-2">{recommendations.map((item) => <li key={item.product.id} className="flex items-start justify-between gap-3 rounded-xl border border-white/10 p-3">
        <div className="min-w-0"><div className="truncate font-semibold text-white">{item.product.name}</div><div className="mt-0.5 text-xs text-slate-400">{item.reasons.join(' · ')}</div><div className="mt-1 text-[11px] text-slate-500">Stock {item.product.stock} · {stockStatusLabels[item.status]}</div></div>
        <div className="flex shrink-0 flex-col items-end gap-2"><span className={actionClass[item.action]}>{actionLabel[item.action]}</span>{item.action === 'reforzar' && !listed.has(item.product.id) && <button type="button" className="link-button" onClick={() => onRestock([item.product])}>Agregar a Por pedir</button>}</div>
      </li>)}</ul> : <p className="mt-4 rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-slate-400">No hay productos del catálogo que coincidan con esta temporada. Cargá más productos o registrá salidas de stock para mejorar las sugerencias.</p>}
    </section>
  </div>;
}

/** Compact version for the home screen. */
export function SeasonHighlights({ state, onOpen }: { state: DemoState; onOpen: () => void }) {
  const today = useToday();
  const recommendations = useMemo(() => today ? seasonalRecommendations(state.products, state.stockMovements, today, 4) : [], [state.products, state.stockMovements, today]);
  if (!today) return null;
  const upcoming = upcomingEvents(today, 45).slice(0, 2);
  return <section className="card min-w-0 p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="flex items-center gap-2 font-bold text-white"><SparklesIcon className="h-5 w-5 text-amber-300" /> Recomendaciones de temporada</h3><p className="mt-1 text-xs text-slate-400 first-letter:uppercase">{seasonFor(today)}{upcoming.map((event) => ` · ${event.name} en ${event.daysAway} días`).join('')}</p></div><button type="button" className="link-button" onClick={onOpen}>Ver combos y calendario</button></div>
    {recommendations.length ? <ul className="mt-3 space-y-2">{recommendations.map((item) => <li key={item.product.id} className="flex items-center justify-between gap-3 text-sm"><span className="min-w-0 truncate text-slate-200">{item.product.name}</span><span className={actionClass[item.action]}>{actionLabel[item.action]}</span></li>)}</ul> : <p className="mt-3 text-sm text-slate-400">Cargá productos en el catálogo para recibir sugerencias.</p>}
  </section>;
}
