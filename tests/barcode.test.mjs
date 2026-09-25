import test from 'node:test';
import assert from 'node:assert/strict';
import { createScanDetector, findByBarcode, isValidGtin, normalizeBarcode, salePrice } from '../lib/barcode.ts';

test('GTIN check digits (EAN-13, EAN-8, UPC-A)', () => {
  assert.equal(isValidGtin('7790895000997'), true);
  assert.equal(isValidGtin('7790895000990'), false);
  assert.equal(isValidGtin('96385074'), true);
  assert.equal(isValidGtin('036000291452'), true);
  assert.equal(isValidGtin('ABC-123'), null);
});

test('barcode lookup ignores spaces', () => {
  const products = [{ id: 'a', barcode: '7790895000997' }, { id: 'b' }];
  assert.equal(findByBarcode(products, ' 7790895 000997 ').id, 'a');
  assert.equal(findByBarcode(products, ''), undefined);
  assert.equal(normalizeBarcode('77908\n'), '77908');
});

test('sale price from cost and margin, rounded up', () => {
  assert.equal(salePrice(1000, 30), 1300);
  assert.equal(salePrice(1234, 0), 1240);
  assert.equal(salePrice(999, 25, 0), 1248.75);
  assert.equal(salePrice(0, 30), 0);
});

test('scan detector: fast keys + Enter is a scan, human typing is not', () => {
  const scans = [];
  const detect = createScanDetector({ onScan: (code) => scans.push(code) });
  let t = 1000;
  for (const key of '7790895000997') detect({ key, timeStamp: (t += 8) });
  assert.equal(detect({ key: 'Enter', timeStamp: (t += 10) }), true);
  for (const key of '12345') detect({ key, timeStamp: (t += 180) });
  assert.equal(detect({ key: 'Enter', timeStamp: (t += 150) }), false);
  assert.deepEqual(scans, ['7790895000997']);
});
