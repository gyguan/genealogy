import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = relative => readFileSync(new URL(relative, import.meta.url), 'utf8');
const prototypeCss = read('./shared/standard-query-card.css');
const legacyPageCss = read('./shared/standard-page-patterns.css');
const actionCss = read('../shared/ui/standard-query-actions.css');
const workbench = read('../features/workbench/EditingWorkspacePage.tsx');
const members = read('../features/members/MemberPage.tsx');
const tracking = read('../features/logs/LogPage.tsx');
const cultureItem = read('../features/culture/CultureItemStandardTab.tsx');
const cultureSite = read('../features/culture/CultureSiteStandardTab.tsx');
const migration = read('../features/culture/MigrationEventStandardTab.tsx');

function count(source, pattern) {
  return (source.match(pattern) || []).length;
}

test('all query panel DOM shapes share the prototype spacing contract', () => {
  assert.match(prototypeCss, /--standard-query-row-gap:\s*4px/);
  assert.match(prototypeCss, /--standard-query-section-gap:\s*24px/);
  assert.match(prototypeCss, /standard-query-panel__body,\s*\n\.standard-query-panel__body > form\s*\{[^}]*display:\s*grid[^}]*row-gap:\s*var\(--standard-query-row-gap/s);
  assert.match(prototypeCss, /standard-query-panel \.standard-query-panel__actions\s*\{[^}]*margin-top:\s*var\(--standard-query-section-gap/s);
});

test('prototype css is the only source of query-card dimensions and responsive layout', () => {
  assert.doesNotMatch(legacyPageCss, /\.standard-query-(panel|grid|field|advanced|actions)/);
  assert.doesNotMatch(actionCss, /data-query-action|min-width|min-height|@media|grid-template-columns/);
  assert.match(prototypeCss, /data-query-action="more"[^}]*min-width:\s*112px/s);
  assert.match(prototypeCss, /data-query-action="reset"[^}]*min-width:\s*72px/s);
  assert.match(prototypeCss, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(prototypeCss, /min-height:\s*44px/);
});

test('workbench and member permissions use the covered panel-actions structure', () => {
  for (const [name, source] of [['修谱工作台', workbench], ['成员与权限', members]]) {
    assert.match(source, /<StandardQueryPanel[\s\S]*?actions=\{/s, `${name} must expose actions through StandardQueryPanel`);
    assert.match(source, /<StandardQueryGrid>/, `${name} must use the standard query grid`);
    assert.match(source, /<StandardAdvancedFilters/, `${name} must use the standard advanced region`);
    assert.match(source, /<StandardMoreFiltersButton/, `${name} must use the shared more-filter action`);
  }
});

test('tracking covers object audit and risk forms inside the query panel', () => {
  assert.match(tracking, /<StandardQueryPanel className="tracking-query-card">/);
  assert.equal(count(tracking, /<StandardQueryGrid>/g), 3);
  assert.equal(count(tracking, /<StandardAdvancedFilters/g), 3);
  assert.equal(count(tracking, /<Form layout="vertical">/g), 3);
});

test('all three clan culture query tabs use the covered inner-form and panel-actions structure', () => {
  for (const [name, source] of [
    ['文化资料', cultureItem],
    ['文化场所', cultureSite],
    ['迁徙脉络', migration]
  ]) {
    assert.match(source, /<StandardQueryPanel[\s\S]*?actions=\{/s, `${name} must expose panel actions`);
    assert.match(source, /<Form[^>]*layout="vertical"/, `${name} must retain its form inside the query panel`);
    assert.match(source, /<StandardQueryGrid>/, `${name} must use the standard query grid`);
    assert.match(source, /<StandardAdvancedFilters/, `${name} must use the standard advanced region`);
  }
});
