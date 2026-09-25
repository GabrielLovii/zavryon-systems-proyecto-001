import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DOMParser } from 'linkedom';
import { extractHtml, extractJson, extractText } from '../lib/source-extraction.ts';
import { extractPdf, layoutLines } from '../lib/pdf-extractor.ts';
import { csvToText } from '../lib/catalog-parse.ts';

globalThis.DOMParser = DOMParser;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const byName = (result, name) => result.candidates.find((candidate) => candidate.name === name);

test('JSON-LD store pages (Tiendanube/WooCommerce style) give name, price, code, brand and absolute image', () => {
  const html = `<!doctype html><html><head><script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': [
    { '@type': 'Product', name: 'Yerba Mate Rosamonte 1 kg', sku: 'RM-1000', brand: { '@type': 'Brand', name: 'Rosamonte' }, image: ['/img/rosamonte.jpg'], offers: { '@type': 'Offer', price: '3250.00', priceCurrency: 'ARS', availability: 'https://schema.org/InStock' } },
    { '@type': 'ItemList', itemListElement: [{ '@type': 'ListItem', item: { '@type': 'Product', name: 'Azúcar Ledesma 1 kg', gtin13: '7792540250450', offers: { '@type': 'AggregateOffer', lowPrice: 1290, priceCurrency: 'ARS' } } }] },
  ] })}</script></head><body></body></html>`;
  const result = extractHtml(html, 'src-1', 'https://tienda.ejemplo.com.ar/productos/');
  assert.equal(result.status, 'ok');
  const yerba = byName(result, 'Yerba Mate Rosamonte 1 kg');
  assert.equal(yerba.price, 3250);
  assert.equal(yerba.sku, 'RM-1000');
  assert.equal(yerba.brand, 'Rosamonte');
  assert.equal(yerba.imageUrl, 'https://tienda.ejemplo.com.ar/img/rosamonte.jpg');
  assert.equal(yerba.availability, 'Disponible');
  assert.equal(byName(result, 'Azúcar Ledesma 1 kg').price, 1290);
  assert.equal(byName(result, 'Azúcar Ledesma 1 kg').sku, '7792540250450');
});

test('HTML tables map columns by header, keep the first data row and read lazy images', () => {
  const html = `<table><tr><td>Cód.</td><td>Artículo</td><td>Marca</td><td>Precio unitario</td><td>Foto</td></tr>
    <tr><td>A-10</td><td>Fideos tirabuzón 500 g</td><td>Lucchetti</td><td>$ 980,50</td><td><img data-src="https://cdn.ejemplo.com/fideos.png" src="data:image/gif;base64,R0lGOD"></td></tr>
    <tr><td>A-11</td><td>Aceite girasol 1,5 L</td><td>Natura</td><td>4.200</td><td></td></tr></table>`;
  const result = extractHtml(html, 'src-2', 'https://proveedor.com.ar/lista');
  assert.equal(result.candidates.length, 2);
  const fideos = byName(result, 'Fideos tirabuzón 500 g');
  assert.deepEqual([fideos.sku, fideos.brand, fideos.price, fideos.imageUrl], ['A-10', 'Lucchetti', 980.5, 'https://cdn.ejemplo.com/fideos.png']);
  assert.equal(byName(result, 'Aceite girasol 1,5 L').price, 4200);
});

test('legacy fixture table still extracts', () => {
  const fixture = JSON.parse(fs.readFileSync(path.join(root, 'tests/fixtures/source-candidates.json'), 'utf8'));
  const result = extractHtml(fixture.html, 'src-legacy');
  assert.equal(result.candidates[0].price, 2400);
  assert.equal(result.candidates[0].sku, 'LAC-001');
});

test('microdata and plain-text price pages are supported', () => {
  const micro = extractHtml('<div itemscope itemtype="http://schema.org/Product"><h2 itemprop="name">Harina 000 1 kg</h2><meta itemprop="price" content="850.00"><img itemprop="image" src="/h.jpg"></div>', 'src-3', 'https://a.com/x');
  assert.equal(micro.candidates[0].price, 850);
  assert.equal(micro.candidates[0].imageUrl, 'https://a.com/h.jpg');
  const plain = extractHtml('<body><h1>Lista de precios</h1><p>Leche La Serenísima 1 L ........ $ 1.150</p><p>Queso cremoso x kg $ 7.800,00</p><p>Horario de atención 8 a 12</p></body>', 'src-4');
  assert.deepEqual(plain.candidates.map((c) => [c.name, c.price]), [['Leche La Serenísima 1 L', 1150], ['Queso cremoso x kg', 7800]]);
  assert.match(plain.warnings.join(' '), /texto visible/);
});

test('JSON and CSV catalogs are extracted', () => {
  const json = extractJson(JSON.stringify({ productos: [{ codigo: 'P1', descripcion: 'Galletitas surtidas 400 g', precio: '1.890,00' }] }), 'src-5');
  assert.equal(json.candidates[0].price, 1890);
  const csv = extractText(csvToText('Código;Descripción;Precio\nC-1;"Café molido 250 g";"5.400,00"\nC-2;Té en saquitos x 25;1.200\n'), 'src-6');
  assert.deepEqual(csv.candidates.map((c) => [c.sku, c.name, c.price]), [['C-1', 'Café molido 250 g', 5400], ['C-2', 'Té en saquitos x 25', 1200]]);
});

test('PDF lines are rebuilt from positioned text items', () => {
  const lines = layoutLines([
    { str: '21.000,00', x: 400, y: 700, width: 50, height: 10 },
    { str: 'BEB-225', x: 40, y: 700.5, width: 45, height: 10 },
    { str: 'Coca-Cola 2,25 L', x: 120, y: 699.8, width: 90, height: 10 },
    { str: 'Página 1', x: 40, y: 40, width: 40, height: 10 },
  ]);
  assert.deepEqual(lines, ['BEB-225\tCoca-Cola 2,25 L\t21.000,00', 'Página 1']);
});

test('a real price-list PDF produces one candidate per product row', async () => {
  const bytes = new Uint8Array(fs.readFileSync(path.join(root, 'tests/fixtures/lista-precios.pdf')));
  const result = await extractPdf(bytes, 'src-pdf');
  const rows = result.candidates.map((c) => [c.sku, c.name, c.price]);
  assert.deepEqual(rows, [
    ['BEB-225', 'Coca-Cola 2,25 L', 21000],
    ['ALM-010', 'Arroz largo fino Gallo 1 kg', 14500],
    ['7790895000997', 'Yerba mate Rosamonte 1 kg', 32750.5],
    ['LIM-750', 'Detergente Brillo 750 ml', 19800],
  ]);
  assert.equal(result.candidates[0].unit, 'Pack x 6');
});
