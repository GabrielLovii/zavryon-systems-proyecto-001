import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCombos, easter, recentExits, seasonFor, seasonalRecommendations, upcomingEvents } from '../lib/seasonal.ts';

const product = (id, name, category, stock = 50, minimum = 10) => ({ id, name, sku: id, category, unit: 'u', stock, minimum, active: true });

test('southern hemisphere seasons and commercial dates', () => {
  assert.equal(seasonFor(new Date(2026, 0, 10)), 'verano');
  assert.equal(seasonFor(new Date(2026, 6, 10)), 'invierno');
  assert.equal(seasonFor(new Date(2026, 8, 24)), 'primavera');
  assert.equal(easter(2026).toDateString(), new Date(2026, 3, 5).toDateString());
  const events = upcomingEvents(new Date(2026, 8, 24));
  assert.equal(events[0].id, 'diversidad');
  const madre = events.find((event) => event.id === 'madre');
  assert.equal(madre.date, '2026-10-18');
  assert.equal(madre.daysAway, 24);
  assert.ok(upcomingEvents(new Date(2026, 8, 24), 10, true).some((event) => event.kind === 'cobro' && event.date === '2026-10-01'), 'salary day on the first business day');
  assert.equal(upcomingEvents(new Date(2026, 1, 1), 30).find((event) => event.id === 'carnaval').date, '2026-02-16');
});

test('recommendations mix season, upcoming dates, stock and recent exits', () => {
  const products = [product('cola', 'Coca-Cola 2,25 L', 'Bebidas', 4, 12), product('bombon', 'Bombones surtidos', 'Golosinas'), product('film', 'Film stretch', 'Embalaje'), product('yerba', 'Yerba mate 1 kg', 'Almacén')];
  const movements = [{ id: 'm', productId: 'yerba', type: 'salida', quantity: -30, before: 80, after: 50, reason: '', user: '', date: '2026-09-20T10:00:00Z' }];
  assert.equal(recentExits(movements, new Date(2026, 8, 24)).get('yerba'), 30);
  const result = seasonalRecommendations(products, movements, new Date(2026, 8, 24));
  const byId = Object.fromEntries(result.map((item) => [item.product.id, item]));
  assert.equal(byId.film, undefined, 'unrelated products are not recommended');
  assert.equal(byId.cola.action, 'reforzar');
  assert.equal(byId.bombon.action, 'combo');
  assert.match(byId.bombon.reasons.join(' '), /Día de la Madre en 24 día/);
  assert.match(byId.yerba.reasons.join(' '), /Salieron 30/);
});

test('combos use real catalog products with cost, regular and combo price', () => {
  const products = [product('yerba', 'Yerba mate 1 kg', 'Almacén'), product('galle', 'Galletitas surtidas 400 g', 'Golosinas'), product('dl', 'Dulce de leche 400 g', 'Lácteos')];
  const offers = [{ id: 'o1', supplierId: 's', productId: 'yerba', price: 3000, active: true }, { id: 'o2', supplierId: 's', productId: 'galle', price: 1000, active: true }, { id: 'o3', supplierId: 's', productId: 'dl', price: 1500, active: true }];
  const [combo] = buildCombos([{ template: { name: 'Combo matero', slots: [['yerba'], ['galletitas'], ['azúcar']], discount: 10 }, occasion: 'Yerba' }], products, offers, [{ id: 's', name: 'S', active: true }], 30, 10);
  assert.deepEqual(combo.items.map((item) => item.product.id), ['yerba', 'galle']);
  assert.deepEqual(combo.missing, ['azúcar']);
  assert.equal(combo.regularPrice, 3900 + 1300);
  assert.equal(combo.comboPrice, 4680);
  assert.equal(combo.cost, 4000);
});
