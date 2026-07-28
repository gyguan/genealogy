import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('src');
const CROSS_PAGE_FILES = [
  'main.tsx',
  'app/App.tsx',
  'shared/navigation/urlState.ts',
  'shared/navigation/navigationEvents.ts',
  'features/persons/personDetailNavigation.ts',
  'features/persons/personEditNavigation.ts'
];

function read(relativePath) {
  return readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('cross-page navigation never fabricates popstate events', () => {
  for (const file of CROSS_PAGE_FILES) {
    const source = read(file);
    assert.equal(
      source.includes("new PopStateEvent('popstate')") || source.includes('new PopStateEvent("popstate")'),
      false,
      `${file} must use commitNavigation/subscribeNavigation instead of synthetic popstate`
    );
  }
});

test('entry and application shell never override History API methods', () => {
  for (const file of ['main.tsx', 'app/App.tsx']) {
    const source = read(file);
    assert.equal(/window\.history\.(pushState|replaceState)\s*=/.test(source), false, `${file} must not override History API methods`);
  }
});

test('public view and entity navigation use the shared navigation entry', () => {
  for (const file of [
    'shared/navigation/urlState.ts',
    'features/persons/personDetailNavigation.ts',
    'features/persons/personEditNavigation.ts'
  ]) {
    const source = read(file);
    assert.match(source, /commitNavigation/);
  }
});

test('application shell subscribes through the shared navigation contract', () => {
  const source = read('app/App.tsx');
  assert.match(source, /subscribeNavigation/);
  assert.equal(source.includes("addEventListener('popstate'"), false);
});

test('URL parameter ownership is declared centrally', () => {
  const source = read('shared/navigation/urlState.ts');
  for (const view of ['personArchive', 'sourceLibrary', 'reviewCenter', 'memberManage', 'auditTrace']) {
    assert.match(source, new RegExp(`${view}:`), `${view} must declare its URL parameter ownership`);
  }
});
