import test from 'node:test';
import assert from 'node:assert/strict';
import { findPrice, findSku, findUnit, headerRoles, parseCells, parseLine, parseNumber, productsFromJson, splitColumns } from '../lib/catalog-parse.ts';

test('parseNumber understands Argentine and international formats', () => {
  assert.equal(parseNumber('1.234,56'), 1234.56);
  assert.equal(parseNumber('1,234.56'), 1234.56);
  assert.equal(parseNumber('2.400'), 2400);
  assert.equal(parseNumber('1.250.000'), 1250000);
  assert.equal(parseNumber('12,5'), 12.5);
  assert.equal(parseNumber('$ 980'), 980);
  assert.ok(Number.isNaN(parseNumber('sin precio')));
});

test('findPrice detects marked and trailing prices, ignoring sizes', () => {
  assert.deepEqual(findPrice('Leche entera ARS 2.400'), { value: 2400, currency: 'ARS', raw: 'ARS 2.400' });
  assert.equal(findPrice('Café 500g $ 8.900,50')?.value, 8900.5);
  assert.equal(findPrice('Aceite 1,5 L USD 3.20')?.currency, 'USD');
  assert.equal(findPrice('Arroz Gallo 1 kg ........ 1.450,00')?.value, 1450);
  assert.equal(findPrice('Detergente 750 ml'), null);
});

test('findSku and findUnit extract codes and presentations', () => {
  assert.equal(findSku('LAC-001 Leche entera'), 'LAC-001');
  assert.equal(findSku('7790895000997 Coca-Cola'), '7790895000997');
  assert.equal(findSku('10234 Yerba mate 1 kg'), '10234');
  assert.equal(findSku('Yerba mate 1 kg'), '');
  assert.equal(findUnit('Yerba mate 1 kg'), '1 kg');
  assert.equal(findUnit('Coca-Cola 2,25 L pack x 6'), '2,25 L');
  assert.equal(findUnit('Galletitas caja x 20'), 'caja x 20');
});

test('parseLine turns catalog lines into products and skips noise', () => {
  const product = parseLine('LAC-001   Leche entera 1L .......... $ 2.400,00');
  assert.equal(product?.name, 'Leche entera 1L');
  assert.equal(product?.sku, 'LAC-001');
  assert.equal(product?.price?.value, 2400);
  assert.equal(product?.unit, '1L');
  assert.equal(parseLine('Total general $ 150.000'), null);
  assert.equal(parseLine('Catálogo de otoño'), null);
  assert.equal(parseLine('Página 3'), null);
});

test('table rows use header roles when available', () => {
  const roles = headerRoles(['Código', 'Descripción', 'Marca', 'Presentación', 'Precio']);
  assert.deepEqual(roles, ['sku', 'name', 'brand', 'unit', 'price']);
  const row = parseCells(['A-77', 'Arroz largo fino', 'Gallo', 'Bolsa x 10', '14.500'], roles);
  assert.deepEqual({ ...row, price: row?.price?.value }, { name: 'Arroz largo fino', sku: 'A-77', price: 14500, brand: 'Gallo', unit: 'Bolsa x 10', category: '' });
  assert.equal(headerRoles(['Leche entera', '$ 2.400']), null);
  const loose = parseCells(['LAC-001', 'Leche entera 1L', '$ 2.400']);
  assert.equal(loose?.name, 'Leche entera 1L');
  assert.equal(loose?.sku, 'LAC-001');
  assert.equal(loose?.price?.value, 2400);
  assert.deepEqual(splitColumns('LAC-001\tLeche entera   2.400,00'), ['LAC-001', 'Leche entera', '2.400,00']);
});

test('productsFromJson finds product-like records at any depth', () => {
  const data = { data: { items: [{ nombre: 'Yerba 1 kg', codigo: 'YB-1', precio: '3.250,00', marca: { name: 'Rosamonte' } }, { title: 'Sin precio ni código' }] } };
  const found = productsFromJson(data);
  assert.equal(found.length, 1);
  assert.equal(found[0].product.name, 'Yerba 1 kg');
  assert.equal(found[0].product.price?.value, 3250);
  assert.equal(found[0].product.brand, 'Rosamonte');
});
