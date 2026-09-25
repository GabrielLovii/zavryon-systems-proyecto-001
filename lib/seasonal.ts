import type { Product, StockMovement } from './mock-data';
import { stockStatus, type StockStatus } from './stock';

/**
 * Seasonal demand hints for an Argentine store (southern hemisphere), plus the store's own recent
 * stock exits. These are heuristics to plan purchases and offers, not a sales forecast.
 */

export type Season = 'verano' | 'otoño' | 'invierno' | 'primavera';
export type SeasonalEvent = { id: string; name: string; date: string; daysAway: number; keywords: string[]; idea: string };
export type Recommendation = { product: Product; reasons: string[]; score: number; status: StockStatus; recentExits: number; action: 'reforzar' | 'ofertar' | 'combo' };

const SEASON_KEYWORDS: Record<Season, { label: string; keywords: string[]; idea: string }> = {
  verano: { label: 'Verano: calor, bebidas frías y salidas', keywords: ['gaseosa', 'coca', 'sprite', 'fanta', 'pepsi', 'agua', 'soda', 'jugo', 'cerveza', 'fernet', 'vino blanco', 'helado', 'hielo', 'bebida', 'bebidas', 'isotónic', 'repelente', 'protector', 'carbón', 'descartable', 'vaso', 'hamburguesa', 'salchicha', 'pan de pancho', 'mayonesa', 'ketchup', 'papas fritas', 'snack', 'sandía', 'limón', 'tereré', 'yerba'], idea: 'Combos de bebida fría + snack y precios por pack; exhibí bebidas cerca de la entrada.' },
  otoño: { label: 'Otoño: vuelta a la rutina y comidas de olla', keywords: ['yerba', 'café', 'té', 'mate cocido', 'galletita', 'galletitas', 'bizcocho', 'harina', 'fideos', 'arroz', 'lenteja', 'polenta', 'puré', 'tomate', 'caldo', 'aceite', 'dulce de leche', 'mermelada', 'leche', 'lácteos', 'cacao'], idea: 'Ofertas en desayuno/merienda y canasta de almacén (fideos + salsa, arroz + aceite).' },
  invierno: { label: 'Invierno: frío, infusiones y guisos', keywords: ['yerba', 'café', 'té', 'mate cocido', 'cacao', 'chocolate', 'leche', 'sopa', 'caldo', 'polenta', 'lenteja', 'garbanzo', 'poroto', 'harina', 'fideos', 'arroz', 'puré', 'salsa', 'vino tinto', 'alfajor', 'turrón', 'pañuelo', 'gas', 'garrafa', 'vela'], idea: 'Combos para guiso/locro, infusiones con galletitas y promos 2x1 en sopas.' },
  primavera: { label: 'Primavera: días más largos, picnic y limpieza', keywords: ['gaseosa', 'agua', 'jugo', 'cerveza', 'bebida', 'bebidas', 'galletita', 'galletitas', 'alfajor', 'golosina', 'golosinas', 'snack', 'detergente', 'lavandina', 'limpieza', 'desodorante', 'jabón', 'repelente', 'protector', 'fruta', 'tereré'], idea: 'Promos de limpieza de primavera y combos picnic (bebida + galletitas + snack).' },
};

/** Southern hemisphere seasons by calendar month (meteorological). */
export function seasonFor(date: Date): Season {
  const month = date.getMonth();
  return month === 11 || month <= 1 ? 'verano' : month <= 4 ? 'otoño' : month <= 7 ? 'invierno' : 'primavera';
}
export const seasonInfo = (season: Season) => SEASON_KEYWORDS[season];

const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
/** n-th weekday of a month (weekday 0 = Sunday). */
const nthWeekday = (year: number, month: number, weekday: number, n: number) => { const first = new Date(year, month, 1); return new Date(year, month, 1 + ((7 + weekday - first.getDay()) % 7) + (n - 1) * 7); };
/** Easter Sunday (Anonymous Gregorian algorithm). */
export function easter(year: number) {
  const a = year % 19; const b = Math.floor(year / 100); const c = year % 100; const d = Math.floor(b / 4); const e = b % 4; const f = Math.floor((b + 8) / 25); const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30; const i = Math.floor(c / 4); const k = c % 4; const l = (32 + 2 * e + 2 * i - h - k) % 7; const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/** Commercial dates in Argentina for a given year. */
function eventsForYear(year: number) {
  const easterDay = easter(year);
  return [
    { id: 'clases', name: 'Vuelta a clases', date: new Date(year, 1, 25), keywords: ['galletita', 'galletitas', 'alfajor', 'jugo', 'leche', 'cacao', 'yerba', 'útiles', 'golosina', 'golosinas'], idea: 'Combos de merienda escolar y packs familiares.' },
    { id: 'pascuas', name: 'Pascuas', date: easterDay, keywords: ['huevo de pascua', 'chocolate', 'rosca', 'pescado', 'atún', 'caballa', 'harina', 'huevo'], idea: 'Huevos y roscas de Pascua; conservas de pescado para Semana Santa.' },
    { id: 'padre', name: 'Día del Padre', date: nthWeekday(year, 5, 0, 3), keywords: ['fernet', 'cerveza', 'vino', 'whisky', 'carbón', 'asado', 'chorizo', 'gaseosa', 'coca', 'picada', 'queso', 'salame'], idea: 'Combos de asado y bebidas; picadas armadas.' },
    { id: 'nino', name: 'Día del Niño', date: nthWeekday(year, 7, 0, 3), keywords: ['golosina', 'golosinas', 'chocolate', 'alfajor', 'galletita', 'galletitas', 'jugo', 'gaseosa', 'snack', 'juguete'], idea: 'Bolsitas de golosinas y promos en chocolates.' },
    { id: 'primavera', name: 'Día de la Primavera y del Estudiante', date: new Date(year, 8, 21), keywords: ['gaseosa', 'cerveza', 'bebida', 'bebidas', 'snack', 'galletita', 'galletitas', 'fernet', 'agua', 'jugo'], idea: 'Combos picnic y bebidas para salidas.' },
    { id: 'madre', name: 'Día de la Madre', date: nthWeekday(year, 9, 0, 3), keywords: ['chocolate', 'bombón', 'bombones', 'vino', 'espumante', 'torta', 'café', 'té', 'perfume', 'flores'], idea: 'Cajas de bombones, vino/espumante y desayunos regalo.' },
    { id: 'fiestas', name: 'Navidad y Año Nuevo', date: new Date(year, 11, 24), keywords: ['sidra', 'espumante', 'pan dulce', 'turrón', 'garrapiñada', 'budín', 'confitura', 'cerveza', 'gaseosa', 'hielo', 'carbón', 'vitel', 'mayonesa', 'ananá'], idea: 'Canastas navideñas y combos de brindis; stock de bebidas y hielo.' },
  ];
}

/** Commercial events in the next `horizonDays` days (default 45), nearest first. */
export function upcomingEvents(today: Date, horizonDays = 45): SeasonalEvent[] {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return [...eventsForYear(start.getFullYear()), ...eventsForYear(start.getFullYear() + 1)]
    .map((event) => ({ ...event, date: iso(event.date), daysAway: Math.round((event.date.getTime() - start.getTime()) / 86400000) }))
    .filter((event) => event.daysAway >= 0 && event.daysAway <= horizonDays)
    .sort((a, b) => a.daysAway - b.daysAway);
}

const normalize = (value: string) => value.toLocaleLowerCase('es').normalize('NFD').replace(/[̀-ͯ]/g, '');
const matches = (product: Product, keywords: string[]) => { const haystack = normalize(`${product.name} ${product.category} ${product.brand || ''}`); return keywords.some((keyword) => new RegExp(`\\b${normalize(keyword)}`).test(haystack)); };

/** Units that left stock (sales, consumption) per product in the last `days` days. */
export function recentExits(movements: StockMovement[], today: Date, days = 30) {
  const since = today.getTime() - days * 86400000;
  const totals = new Map<string, number>();
  movements.filter((movement) => (movement.type === 'salida' || movement.type === 'faltante' || (movement.type === 'ajuste' && movement.quantity < 0)) && new Date(movement.date).getTime() >= since)
    .forEach((movement) => totals.set(movement.productId, (totals.get(movement.productId) || 0) + Math.abs(movement.quantity)));
  return totals;
}

/**
 * Ranks active products for the season and upcoming dates, boosted by recent stock exits.
 * Low stock + seasonal demand → "reforzar"; enough stock + seasonal demand → "ofertar"; event items → "combo".
 */
export function seasonalRecommendations(products: Product[], movements: StockMovement[], today: Date, limit = 12): Recommendation[] {
  const season = seasonFor(today);
  const info = SEASON_KEYWORDS[season];
  const events = upcomingEvents(today);
  const exits = recentExits(movements, today);
  const maxExit = Math.max(1, ...Array.from(exits.values()));
  return products.filter((product) => product.active).map((product) => {
    const reasons: string[] = [];
    let score = 0;
    if (matches(product, info.keywords)) { score += 3; reasons.push(`Temporada de ${season}`); }
    const event = events.find((item) => matches(product, item.keywords));
    if (event) { score += event.daysAway <= 14 ? 4 : 2; reasons.push(`${event.name} ${event.daysAway === 0 ? 'hoy' : `en ${event.daysAway} día(s)`}`); }
    const recent = exits.get(product.id) || 0;
    if (recent) { score += 3 * (recent / maxExit); reasons.push(`Salieron ${recent} en 30 días`); }
    const status = stockStatus(product);
    const action: Recommendation['action'] = status !== 'ok' ? 'reforzar' : event ? 'combo' : 'ofertar';
    return { product, reasons, score, status, recentExits: recent, action };
  }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name, 'es')).slice(0, limit);
}
