import test from 'node:test';
import assert from 'node:assert/strict';
import { applyReceptionToStock, buildRestockOrders, groupByCategory, preferredSupplier, registerMovement, stockStatus, suggestedQuantity } from '../lib/stock.ts';
import { canConfirm, isOrderOpen, orderMessage, orderStage, whatsappPhone, whatsappUrl, withStatus } from '../lib/order-flow.ts';
import { money, nextSequentialId, toNumber } from '../lib/format.ts';

const product = (id, stock, minimum, category = 'Bebidas') => ({ id, name: id, sku: id, category, unit: 'u', stock, minimum, active: true });
const suppliers = [{ id: 'a', name: 'A', active: true }, { id: 'b', name: 'B', active: true }, { id: 'off', name: 'Off', active: false }];

test('stock status thresholds match the business rules', () => {
  assert.equal(stockStatus(product('x', 0, 10)), 'faltante');
  assert.equal(stockStatus(product('x', 4, 10)), 'poco');
  assert.equal(stockStatus(product('x', 8, 10)), 'bajo');
  assert.equal(stockStatus(product('x', 10, 10)), 'bajo');
  assert.equal(stockStatus(product('x', 11, 10)), 'ok');
  assert.equal(stockStatus(product('x', 3, 0)), 'ok');
});

test('products are grouped by category (case-insensitive) with the most urgent first', () => {
  const groups = groupByCategory([product('b', 20, 5, 'bebidas'), product('a', 0, 5, 'Bebidas'), product('c', 1, 1, '')]);
  assert.deepEqual(groups.map((group) => [group.category, group.products.map((item) => item.id)]), [['bebidas', ['a', 'b']], ['Sin categoría', ['c']]]);
});

test('suggested quantity reaches twice the minimum and respects supplier minimums', () => {
  assert.equal(suggestedQuantity({ stock: 4, minimum: 12 }), 20);
  assert.equal(suggestedQuantity({ stock: 0, minimum: 0 }), 1);
  assert.equal(suggestedQuantity({ stock: 23, minimum: 12 }, 6), 6);
});

test('preferred supplier is the cheapest active offer', () => {
  const offers = [{ id: '1', supplierId: 'a', productId: 'p', price: 120, active: true }, { id: '2', supplierId: 'b', productId: 'p', price: 100, active: true }, { id: '3', supplierId: 'off', productId: 'p', price: 50, active: true }];
  assert.equal(preferredSupplier('p', offers, suppliers).supplierId, 'b');
});

test('restock list becomes one order per supplier with unique ids and supplier prices', () => {
  const orders = buildRestockOrders([
    { productId: 'cola', supplierId: 'a', quantity: 12, addedAt: '', addedBy: '' },
    { productId: 'arroz', supplierId: 'a', quantity: 20, addedAt: '', addedBy: '' },
    { productId: 'det', supplierId: 'b', quantity: 10, addedAt: '', addedBy: '' },
    { productId: 'huerfano', supplierId: '', quantity: 5, addedAt: '', addedBy: '' },
  ], { orderIds: ['PED-1048', 'PED-1050'], supplierProducts: [{ id: 's', supplierId: 'a', productId: 'cola', price: 21000, active: true }], responsible: 'Ana', requester: 'Ana', requestedAt: '2026-09-24T10:00', today: '2026-09-24', nextId: (ids) => nextSequentialId('PED', ids, 1049, 4) });
  assert.deepEqual(orders.map((order) => [order.id, order.supplierId, order.lines.length]), [['PED-1051', 'a', 2], ['PED-1052', 'b', 1]]);
  assert.equal(orders[0].lines[0].price, 21000);
  assert.equal(orders[0].status, 'Preparado');
});

test('receiving adds to stock once; re-saving only applies the difference', () => {
  const order = { id: 'PED-1', supplierId: 'a', lines: [{ id: 'ol-1', productId: 'cola', quantity: 12, price: 1 }] };
  const first = { id: 'REC-1', orderId: 'PED-1', createdAt: '', arrivedAt: 'x', lines: [{ id: 'rl-1', orderLineId: 'ol-1', status: 'received', expected: 12, received: 12, expiry: '', lot: '', note: '' }] };
  const step1 = applyReceptionToStock([product('cola', 4, 12)], order, first, undefined, { user: 'Ana', date: 'd' });
  assert.equal(step1.products[0].stock, 16);
  assert.equal(step1.movements[0].quantity, 12);
  const again = applyReceptionToStock(step1.products, order, { ...step1.reception, lines: [{ ...step1.reception.lines[0], received: 10 }] }, step1.reception, { user: 'Ana', date: 'd' });
  assert.equal(again.products[0].stock, 14);
  const legacy = applyReceptionToStock([product('cola', 4, 12)], order, first, { ...first }, { user: 'Ana', date: 'd' });
  assert.equal(legacy.products[0].stock, 4, 'legacy arrived receptions are treated as already applied');
});

test('manual movements: count, entry, exit (never negative) and "se terminó"', () => {
  const base = product('det', 5, 10);
  assert.equal(registerMovement(base, 'ajuste', 2, { user: 'u', date: 'd' }).product.stock, 2);
  assert.equal(registerMovement(base, 'entrada', 3, { user: 'u', date: 'd' }).product.stock, 8);
  assert.equal(registerMovement(base, 'salida', 9, { user: 'u', date: 'd' }).product.stock, 0);
  const done = registerMovement(base, 'faltante', 0, { user: 'u', date: 'd', reason: 'Se terminó' });
  assert.deepEqual([done.product.stock, done.movement.quantity, done.movement.reason], [0, -5, 'Se terminó']);
});

test('order workflow: prepared → sent → in progress → received, with audit events', () => {
  let order = { id: 'PED-1', status: 'Preparado', lines: [], supplierId: 'a' };
  assert.equal(orderStage(order.status), 'preparado');
  order = withStatus(order, 'Enviado', 'Ana', 'WhatsApp', '2026-09-24T10:00:00Z');
  assert.ok(canConfirm(order));
  order = withStatus(order, 'En curso', 'Ana');
  assert.equal(orderStage(order.status), 'en-curso');
  assert.ok(isOrderOpen(order));
  order = withStatus(order, 'Recibido', 'Facu');
  assert.equal(isOrderOpen(order), false);
  assert.deepEqual(order.events.map((event) => event.status), ['Enviado', 'En curso', 'Recibido']);
  assert.equal(orderStage('Confirmado'), 'en-curso', 'legacy statuses keep working');
});

test('WhatsApp numbers and message for the supplier', () => {
  assert.equal(whatsappPhone('+54 11 5555 0101'), '5491155550101');
  assert.equal(whatsappPhone('011 15 5555-0101'), '5491155550101');
  assert.equal(whatsappPhone('+54 9 376 412-3456'), '5493764123456');
  const message = orderMessage({ id: 'PED-1051', supplierId: 'a', lines: [{ id: 'l', productId: 'cola', quantity: 12, price: 21000 }], expectedDate: '2026-09-25', notes: 'Entregar a la mañana' }, { clientName: 'Autoservicio Don Alejo', supplier: { contact: 'María Gómez' }, products: [{ id: 'cola', name: 'Coca-Cola 2,25 L', unit: 'pack x 6' }], supplierProducts: [], includePrices: true });
  assert.match(message, /^Hola María, te paso el pedido PED-1051 de Autoservicio Don Alejo:/);
  assert.match(message, /• 12 x Coca-Cola 2,25 L \(pack x 6\) — \$ 252\.000/);
  assert.match(message, /Notas: Entregar a la mañana/);
  assert.match(whatsappUrl('+54 11 5555 0101', 'hola'), /^https:\/\/wa\.me\/5491155550101\?text=hola$/);
});

test('formatting helpers', () => {
  assert.equal(money(1234567.5), '$ 1.234.567,5');
  assert.equal(money(Number.NaN), '$ 0');
  assert.equal(toNumber(''), 0);
  assert.equal(toNumber('-5'), 0);
  assert.equal(toNumber('abc', 1), 1);
  assert.equal(nextSequentialId('PAG', ['PAG-001', 'PAG-007', 'X-9']), 'PAG-008');
});
