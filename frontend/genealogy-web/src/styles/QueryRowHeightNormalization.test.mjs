import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = relative => readFileSync(new URL(relative, import.meta.url), 'utf8');
const patterns = read('../shared/ui/StandardPagePatterns.tsx');
const css = read('./shared/standard-query-card.css');

test('empty query hint placeholders cannot contribute row height', () => {
  assert.match(patterns, /aria-hidden="true">&nbsp;/);
  assert.match(css, /standard-query-field__hint[^}]*min-height:\s*0/s);
  assert.match(css, /standard-query-field__hint\s*>\s*span\[aria-hidden="true"\][^}]*display:\s*none/s);
  assert.match(css, /standard-query-field__hint:has[^}]*padding-top:\s*0/s);
});

test('query rows use a deterministic 56px field baseline and 4px row gap', () => {
  assert.match(css, /--standard-query-field-height:\s*56px/);
  assert.match(css, /standard-query-grid[^}]*grid-auto-rows:\s*minmax\(var\(--standard-query-field-height\),\s*auto\)/s);
  assert.match(css, /standard-query-field[^}]*min-height:\s*var\(--standard-query-field-height\)/s);
  assert.match(css, /standard-query-grid[^}]*row-gap:\s*var\(--standard-query-row-gap\)/s);
});
