import test from 'node:test';
import assert from 'node:assert/strict';
import { easter, recentExits, seasonFor, seasonalRecommendations, upcomingEvents } from '../lib/seasonal.ts';

const product = (id, name, category, stock = 50, minimum = 10) => ({ id, name, sku: id, category, unit: 'u', stock, minimum, active: true });

test('southern hemisphere seasons and commercial dates', () => {
  assert.equal(seasonFor(new Date(2026, 0, 10)), 'verano');
  assert.equal(seasonFor(new Date(2026, 6, 10)), 'invierno');
  assert.equal(seasonFor(new Date(2026, 8, 24)), 'primavera');
  assert.equal(easter(2026).toDateString(), new Date(2026, 3, 5).toDateString());
  const events = upcomingEvents(new Date(2026, 8, 24));
  assert.equal(events[0].name, 'Día de la Madre');
  assert.equal(events[0].date, '2026-10-18');
  assert.equal(events[0].daysAway, 24);
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
