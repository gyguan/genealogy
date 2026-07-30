import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = relative => readFileSync(new URL(relative, import.meta.url), 'utf8');
const actionCss = read('../shared/ui/standard-query-actions.css');
const patternCss = read('./shared/standard-page-patterns.css');
const workbench = read('../features/workbench/EditingWorkspacePage.tsx');
const members = read('../features/members/MemberPage.tsx');
const tracking = read('../features/logs/LogPage.tsx');
const cultureItem = read('../features/culture/CultureItemStandardTab.tsx');
const cultureSite = read('../features/culture/CultureSiteStandardTab.tsx');
const migration = read('../features/culture/MigrationEventStandardTab.tsx');

function count(source, pattern) {
  return (source.match(pattern) || []).length;
}

test('all query panel DOM shapes share the same compact vertical rhythm', () => {
  assert.match(patternCss, /--standard-query-row-gap:\s*var\(--ant-margin-xxs\)/);
  assert.match(actionCss, /standard-query-panel__body > form\s*\{[^}]*display:\s*grid[^}]*row-gap:\s*var\(--standard-query-row-gap/s);
  assert.match(actionCss, /standard-query-panel__actions\s*\{[^}]*margin-top:\s*var\(--standard-query-row-gap/s);
  assert.doesNotMatch(actionCss, /standard-query-panel__actions\s*\{[^}]*margin-top:\s*var\(--ant-margin-md\)/s);
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
