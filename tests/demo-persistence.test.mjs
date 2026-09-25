import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoPersistence, DEMO_STORAGE_KEY, initialDemoState } from '../lib/demo-store.ts';

const memory = () => { const data = new Map(); return { data, getItem: (key) => data.get(key) ?? null, setItem: (key, value) => { data.set(key, String(value)); } }; };
const saved = (storage) => JSON.parse(storage.getItem(DEMO_STORAGE_KEY));

test('regression: nothing is written before the saved data is read (reload kept reseeding the demo)', () => {
  const storage = memory();
  const userData = { ...initialDemoState(), activeUserId: 'usr-mine' };
  storage.setItem(DEMO_STORAGE_KEY, JSON.stringify(userData));
  const persistence = createDemoPersistence(() => storage);
  // A screen effect updates the (still demo) state before hydration.
  assert.equal(persistence.persist({ ...initialDemoState(), alerts: [] }), 'skipped');
  assert.equal(saved(storage).activeUserId, 'usr-mine');
});

test('after hydration every change is saved with a backup of the previous copy', () => {
  const storage = memory();
  const persistence = createDemoPersistence(() => storage, () => new Date('2026-09-25T12:00:00Z'));
  persistence.markHydrated();
  assert.equal(persistence.persist({ ...initialDemoState(), activeUserId: 'a' }), '2026-09-25T12:00:00.000Z');
  persistence.persist({ ...initialDemoState(), activeUserId: 'b' });
  assert.equal(saved(storage).activeUserId, 'b');
  assert.equal(JSON.parse(storage.getItem(`${DEMO_STORAGE_KEY}-backup`)).activeUserId, 'a');
});

test('a full or blocked storage reports an error instead of throwing', () => {
  const persistence = createDemoPersistence(() => ({ getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); } }));
  persistence.markHydrated();
  assert.equal(persistence.persist(initialDemoState()), 'error');
});
