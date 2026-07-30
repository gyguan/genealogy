import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = relative => readFileSync(new URL(relative, import.meta.url), 'utf8');
const patterns = read('../shared/ui/StandardPagePatterns.tsx');
const actionsCss = read('../shared/ui/standard-query-actions.css');

const legacyImport = "import '../../styles/shared/standard-page-patterns.css';";
const prototypeImport = "import '../../styles/shared/standard-query-card.css';";

test('the canonical query-card prototype stylesheet loads after legacy page patterns', () => {
  const legacyIndex = patterns.indexOf(legacyImport);
  const prototypeIndex = patterns.indexOf(prototypeImport);
  assert.ok(legacyIndex >= 0, 'legacy page patterns stylesheet must remain loaded');
  assert.ok(prototypeIndex > legacyIndex, 'prototype stylesheet must load after legacy rules so it wins the cascade');
});

test('query-card prototype loading is owned by StandardPagePatterns, not query actions', () => {
  assert.doesNotMatch(actionsCss, /standard-query-card\.css/);
});
