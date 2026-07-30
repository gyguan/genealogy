import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const read = relative => readFileSync(new URL(relative, import.meta.url), 'utf8');
const globalEntry = read('./index.css');
const prototypeCss = read('./shared/standard-query-card.css');
const legacyActionPath = new URL('../shared-query-actions.css', import.meta.url);

const affectedPages = [
  ['修谱工作台', read('../features/workbench/EditingWorkspacePage.tsx')],
  ['成员与权限', read('../features/members/MemberPage.tsx')],
  ['追踪与审计', read('../features/logs/LogPage.tsx')],
  ['文化资料', read('../features/culture/CultureItemStandardTab.tsx')],
  ['文化场所', read('../features/culture/CultureSiteStandardTab.tsx')],
  ['迁徙脉络', read('../features/culture/MigrationEventStandardTab.tsx')]
];

test('legacy global query action stylesheet is physically retired', () => {
  assert.equal(existsSync(legacyActionPath), false);
  assert.doesNotMatch(globalEntry, /shared-query-actions\.css/);
});

test('prototype selectors are rooted strongly enough to beat Ant runtime defaults', () => {
  for (const selector of [
    'standard-query-panel',
    'standard-query-grid',
    'standard-query-field',
    'standard-query-advanced',
    'standard-query-actions'
  ]) {
    assert.match(prototypeCss, new RegExp(`\\[data-genealogy-app\\] \\.${selector}`));
  }
  assert.doesNotMatch(prototypeCss, /(^|\n)\.standard-query-/);
});

test('all reported pages render the canonical query component chain', () => {
  for (const [name, source] of affectedPages) {
    assert.match(source, /StandardQueryPanel/, `${name} must use StandardQueryPanel`);
    assert.match(source, /StandardQueryGrid/, `${name} must use StandardQueryGrid`);
    assert.match(source, /StandardQueryField/, `${name} must use StandardQueryField`);
    assert.match(source, /StandardQueryActions/, `${name} must use StandardQueryActions`);
  }
});

test('inner and outer Form variants share one row formatting context', () => {
  assert.match(prototypeCss, /standard-query-panel__body\s*>\s*form\s*\{[^}]*display:\s*contents/s);
  assert.match(prototypeCss, /standard-query-panel__body\s*\{[^}]*row-gap:\s*var\(--standard-query-row-gap\)/s);
  assert.match(prototypeCss, /standard-query-grid\s*\{[^}]*row-gap:\s*var\(--standard-query-row-gap\)/s);
  assert.match(prototypeCss, /standard-query-field__item\s*>\s*\.ant-form-item-row\s*\{[^}]*display:\s*block/s);
  assert.match(prototypeCss, /standard-query-field__item\s+\.ant-form-item-control\s*\{[^}]*max-width:\s*100%/s);
});

test('old page-specific action hooks cannot return', () => {
  assert.doesNotMatch(globalEntry, /culture-search-actions|tracking-query-actions|member-role-page|editingWorkspace/);
  assert.doesNotMatch(prototypeCss, /culture-search-actions|tracking-query-actions|member-role-page|editingWorkspace|ant-collapse-header/);
});
