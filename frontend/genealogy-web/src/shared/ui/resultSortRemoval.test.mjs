import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(here, '../..');
const personSource = readFileSync(join(srcRoot, 'features/persons/PersonArchiveSearchPage.tsx'), 'utf8');
const sourceSource = readFileSync(join(srcRoot, 'features/sources/SourceLibraryQueryPage.tsx'), 'utf8');

function cssText(root) {
  return readdirSync(root, { withFileTypes: true }).map(entry => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return cssText(path);
    return entry.name.endsWith('.css') ? readFileSync(path, 'utf8') : '';
  }).join('\n');
}

const allCss = cssText(srcRoot);

test('person archive query results do not render a sort control', () => {
  assert.doesNotMatch(personSource, /aria-label="排序"/);
  assert.doesNotMatch(personSource, /person-archive-result-toolbar/);
  assert.doesNotMatch(personSource, /PERSON_SORT_OPTIONS/);
  assert.match(personSource, /new URLSearchParams\(\{ sort: criteria\.sort \}\)/);
});

test('source library query results do not render a sort control', () => {
  assert.doesNotMatch(sourceSource, /aria-label="排序方式"/);
  assert.doesNotMatch(sourceSource, /source-library-result-meta/);
  assert.doesNotMatch(sourceSource, /source-library-sort/);
  assert.doesNotMatch(sourceSource, /const sortOptions/);
  assert.doesNotMatch(sourceSource, /function changeSort/);
  assert.match(sourceSource, /sort: 'updatedAt,desc'/);
});

test('removed result sort controls leave no stale styles', () => {
  assert.doesNotMatch(allCss, /person-archive-result-toolbar/);
  assert.doesNotMatch(allCss, /source-library-result-meta/);
  assert.doesNotMatch(allCss, /source-library-sort/);
});
