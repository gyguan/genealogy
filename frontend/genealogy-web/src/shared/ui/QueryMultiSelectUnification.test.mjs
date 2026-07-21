import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const queryMultiSelectSource = readFileSync(new URL('./QueryMultiSelect.tsx', import.meta.url), 'utf8');
const unifiedStyles = readFileSync(new URL('./query-multi-select.css', import.meta.url), 'utf8');
const globalStyleEntry = readFileSync(new URL('../../lineage-result-toolbar-refinement.css', import.meta.url), 'utf8');
const importWrapper = readFileSync(new URL('../../features/imports/ImportFilterMultiSelect.tsx', import.meta.url), 'utf8');
const trackingWrapper = readFileSync(new URL('../../features/logs/TrackingMultiSelect.tsx', import.meta.url), 'utf8');
const cultureWrapper = readFileSync(new URL('../../features/culture/CultureMultiSelect.tsx', import.meta.url), 'utf8');

const wrappers = [importWrapper, trackingWrapper, cultureWrapper];

test('shared query multi-select uses the unified Ant Design interaction', () => {
  assert.match(queryMultiSelectSource, /<Select<Value\[\]>/);
  assert.match(queryMultiSelectSource, /mode="multiple"/);
  assert.match(queryMultiSelectSource, /allowClear=\{allowClear\}/);
  assert.match(queryMultiSelectSource, /showSearch=\{showSearch\}/);
  assert.match(queryMultiSelectSource, /maxTagCount=\{maxTagCount\}/);
  assert.match(queryMultiSelectSource, /popupRender=\{menu =>/);
  assert.match(queryMultiSelectSource, /query-multi-select-popup-actions/);
  assert.match(queryMultiSelectSource, /\{selectAllLabel\}/);
  assert.match(queryMultiSelectSource, /\{clearLabel\}/);
});

test('feature-specific multi-selects are thin wrappers over the shared component', () => {
  wrappers.forEach(source => {
    assert.match(source, /import \{ QueryMultiSelect \}/);
    assert.match(source, /<QueryMultiSelect/);
    assert.doesNotMatch(source, /<Select/);
    assert.doesNotMatch(source, /popupRender|dropdownRender/);
  });
});

test('global styles normalize all Ant Design multiple selects and legacy popup action rows', () => {
  assert.match(globalStyleEntry, /@import '\.\/shared\/ui\/query-multi-select\.css';/);
  assert.match(unifiedStyles, /\.ant-select-multiple/);
  assert.match(unifiedStyles, /\.ant-select-selection-item/);
  assert.match(unifiedStyles, /\.query-multi-select-popup-actions/);
  assert.match(unifiedStyles, /\.import-filter-popup-actions/);
  assert.match(unifiedStyles, /\.tracking-multi-popup-actions/);
  assert.match(unifiedStyles, /\.culture-multi-select-actions/);
  assert.match(unifiedStyles, /\.lineage-select-all-actions/);
});
