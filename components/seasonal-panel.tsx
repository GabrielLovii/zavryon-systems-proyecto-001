'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDaysIcon, ShoppingCartIcon, SparklesIcon } from '@heroicons/react/24/outline';
import type { DemoState } from '@/lib/demo-store';
import type { Product } from '@/lib/mock-data';
import { seasonFor, seasonInfo, seasonalRecommendations, upcomingEvents, type Recommendation } from '@/lib/seasonal';
import { stockStatusLabels } from '@/lib/stock';

const actionLabel: Record<Recommendation['action'], string> = { reforzar: 'Reforzar stock', ofertar: 'Buen momento para ofertar', combo: 'Armar combo / promo' };
const actionClass: Record<Recommendation['action'], string> = { reforzar: 'badge-red', ofertar: 'badge-green', combo: 'badge-amber' };

/** Today's date only after mount, so server and client renders match. */
function useToday() { const [today, setToday] = useState<Date | null>(null); useEffect(() => setToday(new Date()), []); return today; }

export function SeasonTab({ state, onRestock }: { state: DemoState; onRestock: (products: Product[]) => void }) {
  const today = useToday();
  const recommendations = useMemo(() => today ? seasonalRecommendations(state.products, state.stockMovements, today, 24) : [], [state.products, state.stockMovements, today]);
  if (!today) return null;
  const season = seasonFor(today);
  const info = seasonInfo(season);
  const events = upcomingEvents(today);
  const listed = new Set(state.restockList.map((item) => item.productId));
  const toReinforce = recommendations.filter((item) => item.action === 'reforzar' && !listed.has(item.product.id)).map((item) => item.product);
  return <div className="space-y-5">
    <section className="card min-w-0 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-3"><SparklesIcon className="h-6 w-6 shrink-0 text-amber-300" /><div><h3 className="font-bold capitalize text-white">{season}</h3><p className="mt-1 text-sm text-slate-300">{info.label}</p><p className="mt-2 text-sm text-cyan-200">💡 {info.idea}</p></div></div>{toReinforce.length > 0 && <button type="button" className="button-primary" onClick={() => onRestock(toReinforce)}><ShoppingCartIcon className="h-4 w-4" /> Pedir lo que falta para la temporada ({toReinforce.length})</button>}</div>
      {events.length > 0 && <ul className="mt-4 grid gap-2 sm:grid-cols-2">{events.map((event) => <li key={event.id} className="flex gap-3 rounded-xl border border-amber-300/25 bg-amber-400/5 p-3"><CalendarDaysIcon className="h-5 w-5 shrink-0 text-amber-300" /><div><div className="text-sm font-bold text-white">{event.name} · {event.daysAway === 0 ? 'hoy' : `en ${event.daysAway} días`}</div><div className="mt-0.5 text-xs text-slate-400">{event.idea}</div></div></li>)}</ul>}
    </section>
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
  const next = upcomingEvents(today)[0];
  return <section className="card min-w-0 p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="flex items-center gap-2 font-bold text-white"><SparklesIcon className="h-5 w-5 text-amber-300" /> Recomendaciones de temporada</h3><p className="mt-1 text-xs text-slate-400 first-letter:uppercase">{seasonFor(today)}{next ? ` · ${next.name} en ${next.daysAway} días` : ''}</p></div><button type="button" className="link-button" onClick={onOpen}>Ver todas</button></div>
    {recommendations.length ? <ul className="mt-3 space-y-2">{recommendations.map((item) => <li key={item.product.id} className="flex items-center justify-between gap-3 text-sm"><span className="min-w-0 truncate text-slate-200">{item.product.name}</span><span className={actionClass[item.action]}>{actionLabel[item.action]}</span></li>)}</ul> : <p className="mt-3 text-sm text-slate-400">Cargá productos en el catálogo para recibir sugerencias.</p>}
  </section>;
}
