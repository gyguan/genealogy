import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const importCss = readFileSync(new URL('../../features/imports/import-workbench.css', import.meta.url), 'utf8');
const trackingCss = readFileSync(new URL('../../features/logs/tracking-page.css', import.meta.url), 'utf8');

function ruleBody(source, selector) {
  const start = source.indexOf(`${selector} {`);
  assert.notEqual(start, -1, `missing ${selector}`);
  const end = source.indexOf('}', start);
  return source.slice(start, end);
}

test('data import page uses all available browser width', () => {
  const body = ruleBody(importCss, '.import-center-page');
  assert.match(body, /width:\s*100%/);
  assert.doesNotMatch(body, /max-width/);
});

test('audit tracking page uses all available browser width', () => {
  const body = ruleBody(trackingCss, '.tracking-double-card-page');
  assert.match(body, /width:\s*100%/);
  assert.doesNotMatch(body, /max-width/);
});
