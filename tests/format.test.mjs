import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLocaleNumber, toCsv } from '../lib/format.ts';

test('numbers typed the Argentine way', () => {
  assert.equal(parseLocaleNumber('1500'), 1500);
  assert.equal(parseLocaleNumber('1.500'), 1500);
  assert.equal(parseLocaleNumber('1.234.567'), 1234567);
  assert.equal(parseLocaleNumber('12,50'), 12.5);
  assert.equal(parseLocaleNumber('1.234,5'), 1234.5);
  assert.equal(parseLocaleNumber('1,500'), 1.5);
  assert.equal(parseLocaleNumber('12.5'), 12.5);
  assert.equal(parseLocaleNumber('$ 8.900'), 8900);
});

test('empty or invalid text is not a number (the field stays empty instead of showing 0)', () => {
  assert.ok(Number.isNaN(parseLocaleNumber('')));
  assert.ok(Number.isNaN(parseLocaleNumber('  ')));
  assert.ok(Number.isNaN(parseLocaleNumber('abc')));
});

test('CSV opens in columns in Excel (es-AR): semicolons and decimal comma', () => {
  const csv = toCsv(['Producto', 'Costo', 'Venta'], [['Café "tostado"; 500g', 8900, 12015.5]]);
  assert.equal(csv, '"Producto";"Costo";"Venta"\r\n"Café ""tostado""; 500g";8900;12015,5');
});
