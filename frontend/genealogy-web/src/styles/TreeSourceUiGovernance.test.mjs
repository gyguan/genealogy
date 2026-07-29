import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const source = path => readFile(new URL(path, root), 'utf8');

test('lineage query styles contain no important overrides', async () => {
  const css = await source('lineage-workbench.css');
  assert.doesNotMatch(css, /!important/);
  assert.match(css, /\.lineage-search-grid--workbench/);
  assert.match(css, /focus-visible/);
});

test('source library interaction styles stay feature scoped', async () => {
  const css = await source('features/sources/source-library-query-page.css');
  assert.doesNotMatch(css, /!important/);
  assert.doesNotMatch(css, /(^|\})\s*\.ant-(card|table|btn|input|select|drawer)\b/m);
  assert.doesNotMatch(css, /(^|\})\s*button\b/m);
  assert.match(css, /\.source-library-query-page[\s\S]*focus-visible/);
  assert.match(css, /\.source-library-query-page[\s\S]*focus-within/);
  assert.match(css, /\.source-library-query-page[\s\S]*aria-selected/);
});

test('tree canvas visuals remain separated from query interaction styles', async () => {
  const queryCss = await source('lineage-workbench.css');
  for (const canvasMarker of ['lineage-node', 'lineage-edge', 'graph-canvas', 'tree-node']) {
    assert.doesNotMatch(queryCss, new RegExp(canvasMarker));
  }
});
