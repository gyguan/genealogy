import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const modulePath = path.resolve('.api-client-test/shared/api/client.js');

function installLocalStorage(value = '') {
  const store = new Map(value ? [['genealogy.apiBase', value]] : []);
  globalThis.localStorage = {
    getItem: key => store.get(key) ?? null,
    setItem: (key, nextValue) => {
      store.set(key, String(nextValue));
    },
    removeItem: key => {
      store.delete(key);
    }
  };
}

test('normalizes historical relative api base values to absolute paths', async () => {
  installLocalStorage('api/v1');
  const { apiClient, normalizeApiBaseUrl } = await import(pathToFileURL(modulePath));

  assert.equal(normalizeApiBaseUrl('api/v1'), '/api/v1');
  assert.equal(apiClient.getBaseUrl(), '/api/v1');
});

test('keeps absolute api origins and removes trailing slash', async () => {
  installLocalStorage();
  const { normalizeApiBaseUrl } = await import(`${pathToFileURL(modulePath)}?absolute`);

  assert.equal(normalizeApiBaseUrl('https://example.com/api/v1/'), 'https://example.com/api/v1');
  assert.equal(normalizeApiBaseUrl('/api/v1/'), '/api/v1');
  assert.equal(normalizeApiBaseUrl(''), '/api/v1');
});
