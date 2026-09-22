import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('drafts and v7 saved-at remain backward compatible', () => {
  const store = read('lib/demo-store.ts');
  const drafts = read('lib/draft-store.ts');
  assert.match(store, /zavryon-abastecimiento-demo-v7/);
  assert.match(store, /zavryon-abastecimiento-demo-v6-saved-at/);
  assert.match(store, /\[5, 6, 7\]/);
  assert.match(drafts, /backup/);
  assert.match(drafts, /pdfMetadata/);
  const dashboard = read('components/dashboard.tsx');
  assert.match(dashboard, /receiving:/);
  assert.match(dashboard, /sources-review/);
});

test('new orders persist an accessible expected date and requester audit fields', () => {
  const order = read('components/new-order.tsx');
  const model = read('lib/mock-data.ts');
  const migration = read('lib/demo-store.ts');
  assert.match(order, /type="date"/);
  assert.match(order, /aria-describedby/);
  assert.match(order, /expectedDate/);
  assert.match(order, /requestedAt/);
  assert.match(model, /requester\?: string/);
  assert.match(model, /requestedAt\?: string/);
  assert.match(migration, /normalizeOrder/);
});

test('order presentation and alerts use persisted arrival dates without mutating rows', () => {
  const dashboard = read('components/dashboard.tsx');
  const pdf = read('components/order-pdf.tsx');
  const alerts = read('lib/alerts.ts');
  const agenda = read('components/alert-center.tsx');
  assert.match(dashboard, /Solicitante \/ solicitado/);
  assert.match(pdf, /Solicitado el/);
  assert.match(alerts, /isValidLocalDateISO\(order\.expectedDate\)/);
  assert.match(alerts, /alertPreferences\.deliveries/);
  assert.match(alerts, /alertPreferences\.expiries/);
  assert.match(agenda, /const orderedRows = \[\.\.\.rows\]/);
  assert.match(dashboard, /Ver detalle/);
  assert.match(dashboard, /Pagos asociados/);
});

test('critical approval, size, and requested-at contracts reject unsafe state', () => {
  const dashboard = read('components/dashboard.tsx');
  const store = read('lib/demo-store.ts');
  const validation = read('lib/source-validation.ts');
  const date = read('lib/date.ts');
  assert.match(dashboard, /canImportCandidate/);
  assert.match(validation, /reviewState: 'approved'/);
  assert.match(store, /candidate\.status === 'Aprobado' && !canImportCandidate/);
  assert.match(dashboard, /Máximo 5 MB/);
  assert.match(date, /isValidLocalDateTimeInput/);
  assert.doesNotMatch(dashboard, /document\.createElement\('button'\)/);
});

test('source approval uses one evidence-gated transition through persistence and import', () => {
  const validation = read('lib/source-validation.ts');
  const dashboard = read('components/dashboard.tsx');
  const store = read('lib/demo-store.ts');
  assert.match(validation, /function approveCandidate\(candidate: SourceCandidate\): SourceCandidate \| null/);
  assert.match(validation, /return \{ \.\.\.current, status: 'Aprobado', reviewState: 'approved' \}/);
  assert.match(validation, /field\.evidence\.length === 0/);
  assert.match(validation, /Number\.isFinite\(value\)/);
  assert.match(dashboard, /approveCandidate\(edited\)/);
  assert.doesNotMatch(dashboard, /source\.candidates\.filter\(canImportCandidate\)/);
  assert.match(dashboard, /currentSource\.candidates\.filter\(canImportCandidate\)/);
  assert.match(store, /const next = change\(current\);/);
  assert.doesNotMatch(store, /candidate\.status === 'Aprobado' \? \{ \.\.\.candidate, reviewState: 'approved'/);
});

test('manual source candidates keep edited values through approval and import', () => {
  const model = read('lib/mock-data.ts');
  const validation = read('lib/source-validation.ts');
  const dashboard = read('components/dashboard.tsx');
  const store = read('lib/demo-store.ts');
  assert.match(model, /SourceCandidateFields/);
  assert.match(model, /image: FieldResult<string>/);
  assert.match(validation, /normalizeSourceCandidate\(candidate/);
  assert.match(validation, /applyCandidatePatch/);
  assert.match(validation, /Manual \/ user-reviewed/);
  assert.match(dashboard, /normalizeSourceCandidate\(\{ id: `\$\{s\.id\}-manual/);
  assert.match(dashboard, /applyCandidatePatch\(c, patch\)/);
  assert.match(dashboard, /approveCandidate\(edited\)/);
  assert.match(dashboard, /currentSource\.candidates\.filter\(canImportCandidate\)/);
  assert.match(store, /candidates: source\.candidates\.map\(\(candidate\) => normalizeSourceCandidate\(candidate\)\)/);
});

test('all source-facing size copy matches the enforced 5 MB limit', () => {
  const dashboard = read('components/dashboard.tsx');
  const readme = read('README.md');
  assert.doesNotMatch(dashboard, /10 MB/);
  assert.doesNotMatch(readme, /PDF menor a 10 MB/);
  assert.match(dashboard, /Máximo 5 MB/);
  assert.match(readme, /PDF menor a 5 MB/);
});

test('source import gate and SSRF protections are present', () => {
  const validation = read('lib/source-validation.ts');
  const route = read('app/api/source-preview/route.ts');
  const dashboard = read('components/dashboard.tsx');
  assert.match(validation, /reviewState === 'approved'/);
  assert.match(validation, /isBlockedAddress/);
  assert.match(route, /redirect: 'manual'/);
  assert.match(route, /lookup\(host, \{ all: true/);
  assert.match(dashboard, /canImportCandidate/);
});

test('payment export is read-only and includes required fields', () => {
  const pdf = read('components/payment-pdf.tsx');
  for (const field of ['Proveedor', 'Pedido', 'Fecha', 'Importe', 'Método', 'Referencia', 'Notas']) assert.match(pdf, new RegExp(field));
  assert.match(pdf, /window\.print/);
  assert.match(pdf, /navigator\.share/);
  assert.doesNotMatch(pdf, /update\(/);
});

test('fixtures cover extraction, scanned PDF, and payment fidelity', () => {
  const source = JSON.parse(read('tests/fixtures/source-candidates.json'));
  const payment = JSON.parse(read('tests/fixtures/payment.json'));
  assert.match(source.html, /<table>/);
  assert.equal(source.scannedPdf, '');
  assert.equal(payment.reference, 'REF-TEST');
  assert.equal(payment.amount, 12345);
});
