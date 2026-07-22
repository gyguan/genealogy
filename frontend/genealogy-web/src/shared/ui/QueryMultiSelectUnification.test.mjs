import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const queryMultiSelectSource = readFileSync(new URL('./QueryMultiSelect.tsx', import.meta.url), 'utf8');
const unifiedStyles = readFileSync(new URL('./query-multi-select.css', import.meta.url), 'utf8');
const globalStyleEntry = readFileSync(new URL('../../lineage-result-toolbar-refinement.css', import.meta.url), 'utf8');
const importWrapper = readFileSync(new URL('../../features/imports/ImportFilterMultiSelect.tsx', import.meta.url), 'utf8');
const trackingWrapper = readFileSync(new URL('../../features/logs/TrackingMultiSelect.tsx', import.meta.url), 'utf8');
const cultureWrapper = readFileSync(new URL('../../features/culture/CultureMultiSelect.tsx', import.meta.url), 'utf8');
const lineageSource = readFileSync(new URL('../../features/tree/LineageTreeProductPage.tsx', import.meta.url), 'utf8');
const personArchiveSource = readFileSync(new URL('../../features/persons/PersonArchiveSearchPage.tsx', import.meta.url), 'utf8');
const workbenchSource = readFileSync(new URL('../../features/workbench/EditingWorkspacePage.tsx', import.meta.url), 'utf8');
const memberPageSource = readFileSync(new URL('../../features/members/MemberPage.tsx', import.meta.url), 'utf8');
const memberPermissionFilterContract = JSON.parse(readFileSync(
  new URL('../../../../../docs/api/openapi.member-permission.multiselect.json', import.meta.url),
  'utf8'
));

const wrappers = [importWrapper, trackingWrapper, cultureWrapper];

test('shared query multi-select uses native Ant Design options', () => {
  assert.match(queryMultiSelectSource, /<Select<Value\[\]>/);
  assert.match(queryMultiSelectSource, /mode="multiple"/);
  assert.match(queryMultiSelectSource, /allowClear=\{allowClear\}/);
  assert.match(queryMultiSelectSource, /showSearch=\{showSearch\}/);
  assert.match(queryMultiSelectSource, /maxTagCount=\{maxTagCount\}/);
  assert.match(queryMultiSelectSource, /SELECT_ALL_VALUE/);
  assert.match(queryMultiSelectSource, /全选 \/ 取消全选/);
  assert.match(queryMultiSelectSource, /options=\{mergedOptions\}/);
  assert.doesNotMatch(queryMultiSelectSource, /popupRender=\{|dropdownRender=\{/);
  assert.doesNotMatch(queryMultiSelectSource, /<Button|<Divider|<Space/);
});

test('feature-specific multi-selects stay thin wrappers over the shared component', () => {
  wrappers.forEach(source => {
    assert.match(source, /import \{ QueryMultiSelect \}/);
    assert.match(source, /<QueryMultiSelect/);
    assert.doesNotMatch(source, /<Select/);
    assert.doesNotMatch(source, /popupRender=\{|dropdownRender=\{/);
  });
});

test('lineage relation scope uses the same shared multi-select implementation', () => {
  assert.match(lineageSource, /import \{ QueryMultiSelect \}/);
  assert.match(lineageSource, /<QueryMultiSelect<TreeRelationScope>/);
  assert.match(lineageSource, /aria-label="关系范围"/);
  assert.match(lineageSource, /options=\{RELATION_OPTIONS\}/);
  assert.doesNotMatch(lineageSource, /lineage-select-all-actions|lineage-select-all-divider/);
  assert.doesNotMatch(lineageSource, /ALL_RELATION_SCOPES/);
});

test('shared and direct query selects expose the same Ant select-all option label', () => {
  assert.match(queryMultiSelectSource, /全选 \/ 取消全选/);
  assert.match(personArchiveSource, /全选 \/ 取消全选/);
  assert.match(workbenchSource, /全选 \/ 取消全选/);
});

test('member permission filters reuse the shared multi-select', () => {
  assert.equal((memberPageSource.match(/<QueryMultiSelect/g) || []).length, 3);
  assert.match(memberPageSource, /value=\{roleFilter\}/);
  assert.match(memberPageSource, /value=\{scopeFilter\}/);
  assert.match(memberPageSource, /value=\{statusFilter\}/);
});

test('member permission OpenAPI serializes multi-value filters as CSV arrays', () => {
  const parameters = memberPermissionFilterContract.paths['/clans/{clanId}/members'].get.parameters;
  const parameterByName = Object.fromEntries(parameters.map(parameter => [parameter.name, parameter]));

  for (const name of ['roleCode', 'scopeType', 'status']) {
    const parameter = parameterByName[name];
    assert.equal(parameter.style, 'form');
    assert.equal(parameter.explode, false);
    assert.equal(parameter.schema.type, 'array');
    assert.equal(parameter.schema.uniqueItems, true);
  }
  assert.equal(parameterByName.roleCode.schema.items.type, 'string');
  assert.equal(parameterByName.scopeType.schema.items.$ref, '#/components/schemas/MemberScopeType');
  assert.equal(parameterByName.status.schema.items.$ref, '#/components/schemas/MembershipStatus');
});

test('global styles preserve Ant-native selector and tag states', () => {
  assert.match(globalStyleEntry, /@import '\.\/shared\/ui\/query-multi-select\.css';/);
  assert.match(unifiedStyles, /\.ant-select-multiple/);
  assert.doesNotMatch(unifiedStyles, /\.ant-select-selector\s*\{/);
  assert.doesNotMatch(unifiedStyles, /\.ant-select-selection-item\s*\{/);
  assert.doesNotMatch(unifiedStyles, /query-multi-select-popup-actions/);
  assert.doesNotMatch(unifiedStyles, /lineage-select-all-actions|lineage-select-all-divider/);
});
