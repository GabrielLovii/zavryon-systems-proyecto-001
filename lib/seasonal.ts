import type { Product, StockMovement, Supplier, SupplierProduct } from './mock-data';
import { stockStatus, type StockStatus } from './stock';

/**
 * Seasonal demand hints for an Argentine store (southern hemisphere, Misiones included), plus the store's own
 * recent stock exits. These are heuristics to plan purchases, offers and combos — not a sales forecast.
 */

export type Season = 'verano' | 'otoño' | 'invierno' | 'primavera';
export type ComboTemplate = { name: string; slots: string[][]; discount: number };
export type EventKind = 'feriado' | 'comercial' | 'regional' | 'cobro';
export type SeasonalEvent = { id: string; name: string; date: string; daysAway: number; kind: EventKind; keywords: string[]; idea: string; combos: ComboTemplate[] };
export type Recommendation = { product: Product; reasons: string[]; score: number; status: StockStatus; recentExits: number; action: 'reforzar' | 'ofertar' | 'combo' };
export type ComboItem = { product: Product; cost: number; price: number };
export type ComboSuggestion = { name: string; occasion: string; items: ComboItem[]; missing: string[]; regularPrice: number; comboPrice: number; cost: number; discount: number };

const SEASON_KEYWORDS: Record<Season, { label: string; keywords: string[]; idea: string; combos: ComboTemplate[] }> = {
  verano: { label: 'Verano: calor, bebidas frías y salidas', keywords: ['gaseosa', 'coca', 'sprite', 'fanta', 'pepsi', 'agua', 'soda', 'jugo', 'cerveza', 'fernet', 'vino blanco', 'helado', 'hielo', 'bebida', 'bebidas', 'isotónic', 'repelente', 'protector', 'carbón', 'descartable', 'vaso', 'hamburguesa', 'salchicha', 'pan de pancho', 'mayonesa', 'ketchup', 'papas fritas', 'snack', 'sandía', 'limón', 'tereré', 'yerba'], idea: 'Combos de bebida fría + snack y precios por pack; exhibí bebidas y hielo cerca de la entrada.', combos: [{ name: 'Combo tereré', slots: [['yerba'], ['jugo', 'limón', 'pomelo'], ['hielo', 'agua']], discount: 10 }, { name: 'Combo pileta', slots: [['gaseosa', 'coca', 'cerveza'], ['papas fritas', 'snack', 'palitos'], ['hielo']], discount: 10 }] },
  otoño: { label: 'Otoño: vuelta a la rutina y comidas de olla', keywords: ['yerba', 'café', 'té', 'mate cocido', 'galletita', 'galletitas', 'bizcocho', 'harina', 'fideos', 'arroz', 'lenteja', 'polenta', 'puré', 'tomate', 'caldo', 'aceite', 'dulce de leche', 'mermelada', 'leche', 'lácteos', 'cacao'], idea: 'Ofertas en desayuno/merienda y canasta de almacén (fideos + salsa, arroz + aceite).', combos: [{ name: 'Combo merienda', slots: [['yerba', 'café', 'té', 'mate cocido'], ['galletita', 'galletitas', 'bizcocho'], ['leche', 'dulce de leche', 'mermelada']], discount: 10 }, { name: 'Combo almacén', slots: [['fideos', 'arroz'], ['tomate', 'salsa', 'puré'], ['aceite']], discount: 8 }] },
  invierno: { label: 'Invierno: frío, infusiones y guisos', keywords: ['yerba', 'café', 'té', 'mate cocido', 'cacao', 'chocolate', 'leche', 'sopa', 'caldo', 'polenta', 'lenteja', 'garbanzo', 'poroto', 'harina', 'fideos', 'arroz', 'puré', 'salsa', 'vino tinto', 'alfajor', 'turrón', 'pañuelo', 'gas', 'garrafa', 'vela'], idea: 'Combos para guiso/locro, infusiones con galletitas y promos 2x1 en sopas.', combos: [{ name: 'Combo guiso', slots: [['lenteja', 'arroz', 'fideos'], ['caldo', 'sopa'], ['tomate', 'puré', 'salsa']], discount: 10 }, { name: 'Combo chocolatada', slots: [['cacao', 'chocolate'], ['leche'], ['galletita', 'galletitas', 'alfajor']], discount: 10 }] },
  primavera: { label: 'Primavera: días más largos, picnic y limpieza', keywords: ['gaseosa', 'agua', 'jugo', 'cerveza', 'bebida', 'bebidas', 'galletita', 'galletitas', 'alfajor', 'golosina', 'golosinas', 'snack', 'detergente', 'lavandina', 'limpieza', 'desodorante', 'jabón', 'repelente', 'protector', 'fruta', 'tereré'], idea: 'Promos de limpieza de primavera y combos picnic (bebida + galletitas + snack).', combos: [{ name: 'Combo picnic', slots: [['gaseosa', 'coca', 'jugo', 'agua'], ['galletita', 'galletitas', 'alfajor'], ['snack', 'papas fritas', 'golosina']], discount: 10 }, { name: 'Combo limpieza', slots: [['detergente'], ['lavandina', 'limpiador'], ['esponja', 'trapo', 'jabón']], discount: 12 }] },
};

/** Southern hemisphere seasons by calendar month (meteorological). */
export function seasonFor(date: Date): Season {
  const month = date.getMonth();
  return month === 11 || month <= 1 ? 'verano' : month <= 4 ? 'otoño' : month <= 7 ? 'invierno' : 'primavera';
}
export const seasonInfo = (season: Season) => SEASON_KEYWORDS[season];

const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const addDays = (date: Date, days: number) => { const next = new Date(date); next.setDate(date.getDate() + days); return next; };
/** n-th weekday of a month (weekday 0 = Sunday). */
const nthWeekday = (year: number, month: number, weekday: number, n: number) => { const first = new Date(year, month, 1); return new Date(year, month, 1 + ((7 + weekday - first.getDay()) % 7) + (n - 1) * 7); };
/** First Monday–Friday day of a month (salaries are usually paid around then). */
const firstBusinessDay = (year: number, month: number) => { let day = new Date(year, month, 1); while (day.getDay() === 0 || day.getDay() === 6) day = addDays(day, 1); return day; };
/** Easter Sunday (Anonymous Gregorian algorithm). */
export function easter(year: number) {
  const a = year % 19; const b = Math.floor(year / 100); const c = year % 100; const d = Math.floor(b / 4); const e = b % 4; const f = Math.floor((b + 8) / 25); const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30; const i = Math.floor(c / 4); const k = c % 4; const l = (32 + 2 * e + 2 * i - h - k) % 7; const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

type EventDef = Omit<SeasonalEvent, 'date' | 'daysAway'> & { date: Date };
const ASADO: ComboTemplate = { name: 'Combo asado', slots: [['carbón', 'leña'], ['chorizo', 'morcilla', 'carne', 'asado'], ['pan'], ['gaseosa', 'coca', 'cerveza', 'vino']], discount: 10 };
const PICADA: ComboTemplate = { name: 'Combo picada', slots: [['queso', 'salame', 'jamón'], ['aceituna', 'maní', 'papas fritas', 'snack'], ['cerveza', 'fernet', 'vino', 'gaseosa']], discount: 10 };
const LOCRO: ComboTemplate = { name: 'Combo locro', slots: [['maíz', 'maiz', 'locro'], ['poroto', 'porotos'], ['zapallo', 'calabaza'], ['chorizo', 'panceta']], discount: 10 };
const DULCE: ComboTemplate = { name: 'Combo dulce', slots: [['chocolate', 'bombón', 'bombones', 'alfajor'], ['galletita', 'galletitas', 'budín'], ['jugo', 'gaseosa', 'leche']], discount: 10 };

/** Argentine holidays, commercial dates and Misiones regional events for a given year. */
function eventsForYear(year: number): EventDef[] {
  const easterDay = easter(year);
  return [
    { id: 'reyes', name: 'Día de Reyes', date: new Date(year, 0, 6), kind: 'comercial', keywords: ['golosina', 'golosinas', 'chocolate', 'juguete', 'alfajor'], idea: 'Golosinas y regalitos para chicos.', combos: [DULCE] },
    { id: 'san-valentin', name: 'San Valentín', date: new Date(year, 1, 14), kind: 'comercial', keywords: ['chocolate', 'bombón', 'bombones', 'vino', 'espumante'], idea: 'Chocolates y vino/espumante para regalar.', combos: [{ name: 'Combo enamorados', slots: [['vino', 'espumante'], ['chocolate', 'bombón', 'bombones']], discount: 8 }] },
    { id: 'carnaval', name: 'Carnaval (feriado)', date: addDays(easterDay, -48), kind: 'feriado', keywords: ['espuma', 'gaseosa', 'cerveza', 'snack', 'hielo', 'agua'], idea: 'Fin de semana largo: bebidas, hielo y snacks.', combos: [PICADA] },
    { id: 'clases', name: 'Vuelta a clases', date: new Date(year, 1, 25), kind: 'comercial', keywords: ['galletita', 'galletitas', 'alfajor', 'jugo', 'leche', 'cacao', 'yerba', 'útiles', 'golosina', 'golosinas'], idea: 'Combos de merienda escolar y packs familiares.', combos: [{ name: 'Combo merienda escolar', slots: [['galletita', 'galletitas', 'alfajor'], ['jugo', 'leche', 'cacao']], discount: 10 }] },
    { id: 'mujer', name: 'Día de la Mujer', date: new Date(year, 2, 8), kind: 'comercial', keywords: ['chocolate', 'bombón', 'bombones', 'flores', 'vino'], idea: 'Detalles: chocolates y bombones.', combos: [] },
    { id: 'pascuas', name: 'Pascuas y Semana Santa', date: easterDay, kind: 'feriado', keywords: ['huevo de pascua', 'chocolate', 'rosca', 'pescado', 'atún', 'caballa', 'harina', 'huevo'], idea: 'Huevos y roscas de Pascua; conservas de pescado para Semana Santa.', combos: [{ name: 'Combo Semana Santa', slots: [['atún', 'caballa', 'sardina', 'pescado'], ['arroz', 'fideos'], ['aceite', 'mayonesa']], discount: 8 }] },
    { id: 'trabajador', name: 'Día del Trabajador (feriado)', date: new Date(year, 4, 1), kind: 'feriado', keywords: ['carbón', 'chorizo', 'pan', 'gaseosa', 'cerveza', 'vino'], idea: 'Día de asado: carbón, chorizos y bebidas.', combos: [ASADO] },
    { id: '25-mayo', name: '25 de Mayo (feriado)', date: new Date(year, 4, 25), kind: 'feriado', keywords: ['maíz', 'poroto', 'zapallo', 'chorizo', 'harina', 'dulce de membrillo', 'empanada', 'tapa'], idea: 'Locro, empanadas y pastelitos patrios.', combos: [LOCRO, { name: 'Combo pastelitos', slots: [['tapa', 'masa', 'hojaldre'], ['membrillo', 'batata', 'dulce'], ['aceite']], discount: 10 }] },
    { id: 'aguinaldo-junio', name: 'Cobro de aguinaldo', date: new Date(year, 5, 30), kind: 'cobro', keywords: ['vino', 'cerveza', 'fernet', 'carbón', 'chocolate'], idea: 'Más consumo: reforzá bebidas y productos de mayor ticket.', combos: [] },
    { id: 'padre', name: 'Día del Padre', date: nthWeekday(year, 5, 0, 3), kind: 'comercial', keywords: ['fernet', 'cerveza', 'vino', 'whisky', 'carbón', 'asado', 'chorizo', 'gaseosa', 'coca', 'picada', 'queso', 'salame'], idea: 'Combos de asado y bebidas; picadas armadas.', combos: [ASADO, PICADA] },
    { id: 'bandera', name: 'Día de la Bandera (feriado)', date: new Date(year, 5, 20), kind: 'feriado', keywords: ['carbón', 'gaseosa', 'snack'], idea: 'Fin de semana largo de invierno.', combos: [] },
    { id: '9-julio', name: '9 de Julio (feriado)', date: new Date(year, 6, 9), kind: 'feriado', keywords: ['maíz', 'poroto', 'zapallo', 'chorizo', 'chocolate', 'churro'], idea: 'Locro y chocolate caliente.', combos: [LOCRO, { name: 'Combo chocolate patrio', slots: [['cacao', 'chocolate'], ['leche'], ['bizcocho', 'churro', 'galletita', 'galletitas']], discount: 10 }] },
    { id: 'amigo', name: 'Día del Amigo', date: new Date(year, 6, 20), kind: 'comercial', keywords: ['fernet', 'cerveza', 'coca', 'gaseosa', 'queso', 'salame', 'maní', 'snack', 'pizza'], idea: 'Juntadas: fernet con coca, picadas y pizzas.', combos: [{ name: 'Combo fernet', slots: [['fernet'], ['coca', 'cola'], ['hielo']], discount: 8 }, PICADA] },
    { id: 'nino', name: 'Día del Niño', date: nthWeekday(year, 7, 0, 3), kind: 'comercial', keywords: ['golosina', 'golosinas', 'chocolate', 'alfajor', 'galletita', 'galletitas', 'jugo', 'gaseosa', 'snack', 'juguete'], idea: 'Bolsitas de golosinas y promos en chocolates.', combos: [DULCE] },
    { id: 'inmigrante', name: 'Fiesta Nacional del Inmigrante (Oberá)', date: nthWeekday(year, 8, 5, 1), kind: 'regional', keywords: ['cerveza', 'chorizo', 'pan', 'gaseosa'], idea: 'Misiones: movimiento de visitantes, bebidas y comidas típicas.', combos: [] },
    { id: 'primavera', name: 'Día de la Primavera y del Estudiante', date: new Date(year, 8, 21), kind: 'comercial', keywords: ['gaseosa', 'cerveza', 'bebida', 'bebidas', 'snack', 'galletita', 'galletitas', 'fernet', 'agua', 'jugo'], idea: 'Combos picnic y bebidas para salidas.', combos: [SEASON_KEYWORDS.primavera.combos[0]] },
    { id: 'diversidad', name: 'Día de la Diversidad Cultural (feriado)', date: new Date(year, 9, 12), kind: 'feriado', keywords: ['carbón', 'chorizo', 'gaseosa', 'cerveza', 'snack'], idea: 'Fin de semana largo: asado y bebidas.', combos: [ASADO] },
    { id: 'madre', name: 'Día de la Madre', date: nthWeekday(year, 9, 0, 3), kind: 'comercial', keywords: ['chocolate', 'bombón', 'bombones', 'vino', 'espumante', 'torta', 'café', 'té', 'perfume', 'flores'], idea: 'Cajas de bombones, vino/espumante y desayunos regalo.', combos: [{ name: 'Desayuno para mamá', slots: [['café', 'té', 'yerba'], ['galletita', 'galletitas', 'budín', 'alfajor'], ['mermelada', 'dulce de leche', 'leche']], discount: 10 }, { name: 'Regalo dulce', slots: [['bombón', 'bombones', 'chocolate'], ['vino', 'espumante']], discount: 8 }] },
    { id: 'halloween', name: 'Halloween', date: new Date(year, 9, 31), kind: 'comercial', keywords: ['golosina', 'golosinas', 'chupetín', 'caramelo', 'chocolate'], idea: 'Bolsas de golosinas surtidas.', combos: [] },
    { id: 'yerba', name: 'Fiesta Nacional de la Yerba Mate (Apóstoles)', date: nthWeekday(year, 10, 5, 1), kind: 'regional', keywords: ['yerba', 'termo', 'mate', 'bombilla', 'tereré'], idea: 'Misiones: destacá yerbas locales y combos matero.', combos: [{ name: 'Combo matero', slots: [['yerba'], ['bizcocho', 'galletita', 'galletitas', 'chipa'], ['azúcar', 'edulcorante']], discount: 10 }] },
    { id: 'aguinaldo-dic', name: 'Cobro de aguinaldo', date: new Date(year, 11, 18), kind: 'cobro', keywords: ['sidra', 'espumante', 'pan dulce', 'turrón', 'vino', 'cerveza'], idea: 'Previa de las Fiestas: stock de bebidas y productos navideños.', combos: [] },
    { id: 'fiestas', name: 'Navidad y Año Nuevo', date: new Date(year, 11, 24), kind: 'feriado', keywords: ['sidra', 'espumante', 'pan dulce', 'turrón', 'garrapiñada', 'budín', 'confitura', 'cerveza', 'gaseosa', 'hielo', 'carbón', 'vitel', 'mayonesa', 'ananá'], idea: 'Canastas navideñas y combos de brindis; stock de bebidas y hielo.', combos: [{ name: 'Canasta navideña', slots: [['pan dulce', 'budín'], ['turrón', 'garrapiñada', 'confitura'], ['sidra', 'espumante']], discount: 10 }, { name: 'Combo brindis', slots: [['sidra', 'espumante'], ['hielo'], ['gaseosa', 'jugo']], discount: 8 }] },
  ];
}

/** "Cobro de sueldos" on the first business day of each month (more spending the following days). */
const paydays = (year: number): EventDef[] => Array.from({ length: 12 }, (_, month) => ({ id: `sueldos-${month}`, name: 'Cobro de sueldos', date: firstBusinessDay(year, month), kind: 'cobro' as const, keywords: ['yerba', 'aceite', 'harina', 'arroz', 'fideos', 'leche', 'azúcar', 'detergente'], idea: 'Primeros días del mes: reforzá la canasta básica.', combos: [] }));

/** Events in the next `horizonDays` days (default 45), nearest first. Paydays are included only when `includePaydays`. */
export function upcomingEvents(today: Date, horizonDays = 45, includePaydays = false): SeasonalEvent[] {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const year = start.getFullYear();
  const all = [...eventsForYear(year), ...eventsForYear(year + 1), ...(includePaydays ? [...paydays(year), ...paydays(year + 1)] : [])];
  return all
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

const roundUp = (value: number, step: number) => step > 0 ? Math.ceil(value / step) * step : Math.round(value);

/**
 * Turns combo templates into concrete combos with the store's products: each slot takes the best matching active
 * product (in stock first), priced at cheapest supplier cost + margin. Combos need at least 2 matched slots.
 */
export function buildCombos(templates: { template: ComboTemplate; occasion: string }[], products: Product[], supplierProducts: SupplierProduct[], suppliers: Supplier[], marginPercent = 35, rounding = 10): ComboSuggestion[] {
  const activeSuppliers = new Set(suppliers.filter((supplier) => supplier.active).map((supplier) => supplier.id));
  const costOf = (product: Product) => supplierProducts.filter((offer) => offer.productId === product.id && offer.active && activeSuppliers.has(offer.supplierId)).sort((a, b) => a.price - b.price)[0]?.price || 0;
  const seen = new Set<string>();
  return templates.flatMap(({ template, occasion }) => {
    if (seen.has(template.name)) return [];
    seen.add(template.name);
    const used = new Set<string>();
    const items: ComboItem[] = []; const missing: string[] = [];
    template.slots.forEach((slot) => {
      const candidates = products.filter((product) => product.active && !used.has(product.id) && matches(product, slot)).sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0) || costOf(b) - costOf(a));
      const product = candidates.find((item) => costOf(item) > 0) || candidates[0];
      if (!product) { missing.push(slot[0]); return; }
      used.add(product.id);
      const cost = costOf(product);
      items.push({ product, cost, price: roundUp(cost * (1 + marginPercent / 100), rounding) });
    });
    if (items.length < 2) return [];
    const regularPrice = items.reduce((sum, item) => sum + item.price, 0);
    const cost = items.reduce((sum, item) => sum + item.cost, 0);
    const comboPrice = Math.max(roundUp(regularPrice * (1 - template.discount / 100), rounding), roundUp(cost * 1.1, rounding));
    return [{ name: template.name, occasion, items, missing, regularPrice, comboPrice, cost, discount: template.discount }];
  });
}
