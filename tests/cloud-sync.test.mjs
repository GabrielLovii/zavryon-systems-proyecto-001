import test from 'node:test';
import assert from 'node:assert/strict';
import { decideSync, stateHash } from '../lib/cloud-sync.ts';
import { initialDemoState, normalizeDemoState } from '../lib/demo-store.ts';

const base = { userId: 'u1', hasRow: true, rowRevision: 5, localHash: 'L', cloudHash: 'C', localPristine: false };
const meta = (revision, hash) => ({ userId: 'u1', revision, hash, syncedAt: '' });

test('first login uploads when the account has no cloud data', () => {
  assert.equal(decideSync({ ...base, meta: null, hasRow: false }), 'subir-nuevo');
});
test('identical content is already synced, on any device', () => {
  assert.equal(decideSync({ ...base, meta: null, localHash: 'X', cloudHash: 'X' }), 'sincronizado');
});
test('same revision: upload local edits, otherwise nothing', () => {
  assert.equal(decideSync({ ...base, meta: meta(5, 'old'), localHash: 'new' }), 'subir');
  assert.equal(decideSync({ ...base, meta: meta(5, 'L') }), 'sincronizado');
});
test('cloud changed elsewhere and no local edits → download', () => {
  assert.equal(decideSync({ ...base, meta: meta(3, 'L') }), 'bajar');
  assert.equal(decideSync({ ...base, meta: null, localPristine: true }), 'bajar', 'a fresh device takes the cloud data');
});
test('both changed → ask; invalid cloud data never overwrites local', () => {
  assert.equal(decideSync({ ...base, meta: meta(3, 'old') }), 'conflicto');
  assert.equal(decideSync({ ...base, meta: null, localPristine: false }), 'conflicto', 'a device with its own data asks before replacing');
  assert.equal(decideSync({ ...base, meta: meta(3, 'L'), cloudHash: null }), 'invalido');
});
test('state hash is stable across normalization round-trips', () => {
  const state = initialDemoState();
  const roundTrip = normalizeDemoState(JSON.parse(JSON.stringify(state)));
  assert.equal(stateHash(roundTrip), stateHash(state));
  assert.notEqual(stateHash({ ...state, products: [] }), stateHash(state));
});
