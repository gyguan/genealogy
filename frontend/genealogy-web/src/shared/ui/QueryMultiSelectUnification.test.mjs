import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const queryMultiSelectSource = readFileSync(new URL('./QueryMultiSelect.tsx', import.meta.url), 'utf8');
const unifiedStyles = readFileSync(new URL('./query-multi-select.css', import.meta.url), 'utf8');
const globalStyleEntry = readFileSync(new URL('../../lineage-result-toolbar-refinement.css', import.meta.url), 'utf8');
const importWrapper = readFileSync(new URL('../../features/imports/ImportFilterMultiSelect.tsx', import.meta.url), 'utf8');
const trackingWrapper = readFileSync(new URL('../../features/logs/TrackingMultiSelect.tsx', import.meta.url), 'utf8');
const cultureWrapper = readFileSync(new URL('../../features/culture/CultureMultiSelect.tsx', import.meta.url), 'utf8');
const personArchiveSource = readFileSync(new URL('../../features/persons/PersonArchiveSearchPage.tsx', import.meta.url), 'utf8');
const workbenchSource = readFileSync(new URL('../../features/workbench/EditingWorkspacePage.tsx', import.meta.url), 'utf8');

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

test('shared and direct query selects expose the same Ant select-all option label', () => {
  assert.match(queryMultiSelectSource, /全选 \/ 取消全选/);
  assert.match(personArchiveSource, /全选 \/ 取消全选/);
  assert.match(workbenchSource, /全选 \/ 取消全选/);
});

test('global styles preserve Ant-native selector and tag states', () => {
  assert.match(globalStyleEntry, /@import '\.\/shared\/ui\/query-multi-select\.css';/);
  assert.match(unifiedStyles, /\.ant-select-multiple/);
  assert.doesNotMatch(unifiedStyles, /\.ant-select-selector\s*\{/);
  assert.doesNotMatch(unifiedStyles, /\.ant-select-selection-item\s*\{/);
  assert.doesNotMatch(unifiedStyles, /query-multi-select-popup-actions/);
});

test('legacy lineage actions are rendered with Ant option-row dimensions', () => {
  assert.match(unifiedStyles, /\.lineage-select-all-actions/);
  assert.match(unifiedStyles, /height: 32px/);
  assert.match(unifiedStyles, /padding: 5px 12px/);
  assert.match(unifiedStyles, /border-radius: 4px/);
  assert.match(unifiedStyles, /\.lineage-select-all-divider\s*\{[\s\S]*display: none/);
});
