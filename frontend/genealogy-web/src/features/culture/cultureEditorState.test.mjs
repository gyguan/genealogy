import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve('.culture-shell-test/features/culture/cultureEditorState.js');
const { buildCultureEditorLocation, isSameCultureEditor, readCultureEditorLocation } = await import(pathToFileURL(modulePath).href);

test('reads create and edit editor states from direct URLs', () => {
  assert.deepEqual(
    readCultureEditorLocation('https://example.test/?view=culture&tab=migrations&cultureEditor=migration&cultureEditorMode=create'),
    { editor: { target: 'migration', mode: 'create' } }
  );
  assert.deepEqual(
    readCultureEditorLocation('https://example.test/?view=culture&tab=sites&cultureEditor=site&cultureEditorMode=edit&cultureEditorId=61'),
    { editor: { target: 'site', mode: 'edit', id: 61 } }
  );
});

test('rejects incomplete or unsupported editor URLs', () => {
  assert.deepEqual(
    readCultureEditorLocation('https://example.test/?cultureEditor=migration&cultureEditorMode=edit'),
    { editor: null }
  );
  assert.deepEqual(
    readCultureEditorLocation('https://example.test/?cultureEditor=person&cultureEditorMode=create'),
    { editor: null }
  );
});

test('writes editor state without losing tab filters, detail or hash', () => {
  const current = 'https://example.test/?view=culture&tab=migrations&migrationKeyword=%E6%B9%96%E5%B9%BF&migrationItem=41#history';
  const next = new URL(buildCultureEditorLocation(current, { target: 'migration', mode: 'edit', id: 41 }), 'https://example.test');
  assert.equal(next.searchParams.get('view'), 'culture');
  assert.equal(next.searchParams.get('tab'), 'migrations');
  assert.equal(next.searchParams.get('migrationKeyword'), '湖广');
  assert.equal(next.searchParams.get('migrationItem'), '41');
  assert.equal(next.searchParams.get('cultureEditor'), 'migration');
  assert.equal(next.searchParams.get('cultureEditorMode'), 'edit');
  assert.equal(next.searchParams.get('cultureEditorId'), '41');
  assert.equal(next.hash, '#history');
});

test('closing the editor only removes editor parameters', () => {
  const current = 'https://example.test/?view=culture&tab=sites&siteItem=61&cultureEditor=site&cultureEditorMode=edit&cultureEditorId=61';
  const next = new URL(buildCultureEditorLocation(current, null), 'https://example.test');
  assert.equal(next.searchParams.get('siteItem'), '61');
  assert.equal(next.searchParams.has('cultureEditor'), false);
  assert.equal(next.searchParams.has('cultureEditorMode'), false);
  assert.equal(next.searchParams.has('cultureEditorId'), false);
});

test('compares editor identities for browser navigation guards', () => {
  assert.equal(isSameCultureEditor({ target: 'migration', mode: 'edit', id: 41 }, { target: 'migration', mode: 'edit', id: 41 }), true);
  assert.equal(isSameCultureEditor({ target: 'migration', mode: 'edit', id: 41 }, { target: 'migration', mode: 'create' }), false);
  assert.equal(isSameCultureEditor(null, null), true);
});
