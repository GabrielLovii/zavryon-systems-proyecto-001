import test from 'node:test';
import assert from 'node:assert/strict';

// Minimal in-memory localStorage so the module can run under Node.
class MemoryStorage {
  #data = new Map();
  get length() { return this.#data.size; }
  key(index) { return [...this.#data.keys()][index] ?? null; }
  getItem(key) { return this.#data.has(key) ? this.#data.get(key) : null; }
  setItem(key, value) { this.#data.set(key, String(value)); }
  removeItem(key) { this.#data.delete(key); }
}
globalThis.window = { localStorage: new MemoryStorage(), scrollY: 0 };
const { UI_STATE_PREFIX, clearUiState, isNullableRecord, isStringArray, oneOf, readUiState, removeUiState, writeUiState } = await import('../lib/ui-state.ts');

test('saved screen values come back after a reload', () => {
  writeUiState('orders:query', 'coca');
  writeUiState('supply:selected', ['a', 'b']);
  assert.equal(readUiState('orders:query', ''), 'coca');
  assert.deepEqual(readUiState('supply:selected', [], isStringArray), ['a', 'b']);
});

test('missing, corrupt or invalid values fall back to the default', () => {
  assert.equal(readUiState('nothing', 'default'), 'default');
  window.localStorage.setItem(`${UI_STATE_PREFIX}broken`, '{not json');
  assert.equal(readUiState('broken', 'default'), 'default');
  writeUiState('reception:filter', 'otro');
  assert.equal(readUiState('reception:filter', 'hoy', oneOf(['hoy', 'semana'])), 'hoy');
  writeUiState('catalog:editing', { name: 'sin id' });
  assert.equal(readUiState('catalog:editing', null, isNullableRecord), null);
});

test('a closed form (null) is restored as closed', () => {
  writeUiState('users:editing', null);
  assert.equal(readUiState('users:editing', null, isNullableRecord), null);
  writeUiState('users:editing', { id: 'usr-1', name: 'Ana' });
  assert.deepEqual(readUiState('users:editing', null, isNullableRecord), { id: 'usr-1', name: 'Ana' });
  removeUiState('users:editing');
  assert.equal(readUiState('users:editing', null), null);
});

test('clearing local data drops only screen state', () => {
  window.localStorage.setItem('zavryon-abastecimiento-demo-v7', '{}');
  writeUiState('section', 'Pedidos');
  clearUiState();
  assert.equal(readUiState('section', 'Inicio'), 'Inicio');
  assert.equal(window.localStorage.getItem('zavryon-abastecimiento-demo-v7'), '{}');
});

test('oversized values are not stored', () => {
  writeUiState('huge', 'x'.repeat(300 * 1024));
  assert.equal(readUiState('huge', 'none'), 'none');
});
