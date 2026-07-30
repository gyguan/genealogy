import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = relative => readFileSync(new URL(relative, import.meta.url), 'utf8');
const patterns = read('../shared/ui/StandardPagePatterns.tsx');
const patternCss = read('./shared/standard-page-patterns.css');
const actions = read('../shared/ui/StandardQueryActions.tsx');
const actionCss = read('../shared/ui/standard-query-actions.css');
const visualContract = read('../../../../docs/frontend/query-card-visual-contract.md');
const standardsIndex = read('../../../../docs/standards/README.md');
const personArchive = read('../features/persons/PersonArchiveSearchPage.tsx');
const sourceLibrary = read('../features/sources/SourceLibraryQueryPage.tsx');
const workbench = read('../features/workbench/EditingWorkspacePage.tsx');
const cultureItem = read('../features/culture/CultureItemStandardTab.tsx');
const cultureSite = read('../features/culture/CultureSiteStandardTab.tsx');
const migrationEvent = read('../features/culture/MigrationEventStandardTab.tsx');
const importCenter = read('../features/imports/ImportPage.tsx');

test('Issue #1026 exposes one typed query panel field and advanced-filter contract', () => {
  for (const component of ['StandardQueryPanel', 'StandardQueryGrid', 'StandardQueryField', 'StandardAdvancedFilters']) {
    assert.match(patterns, new RegExp(`export function ${component}\\b`), `${component} must remain exported`);
    assert.match(patterns, new RegExp(`export type ${component}Props\\b`), `${component} must retain typed props`);
  }
  assert.match(patterns, /title = '查询条件'/);
  assert.match(patterns, /data-query-grid-role="fields"/);
  assert.match(patterns, /data-query-field-role="field"/);
  assert.match(patterns, /data-query-advanced-role="filters"/);
  assert.match(patterns, /reserveHintSpace = true/);
  assert.match(patterns, /hidden=\{!expanded\}/);
  assert.match(patterns, /aria-hidden=\{!expanded\}/);
  assert.doesNotMatch(patterns, /if \(!expanded\) return null/);
});

test('standard query grids retain the 4 to 2 to 1 responsive column contract', () => {
  assert.match(patternCss, /\.standard-query-grid\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(patternCss, /@media \(max-width:\s*1199px\)[\s\S]*?\.standard-query-grid\s*\{[^}]*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(patternCss, /@media \(max-width:\s*767px\)[\s\S]*?\.standard-query-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.doesNotMatch(patternCss, /standard-query-grid[^}]*repeat\((3|5),/s);
});

test('query fields share exact control height and compact vertical spacing', () => {
  assert.match(patternCss, /standard-query-field__item[^}]*min-height:\s*var\(--ant-control-height\)/s);
  assert.match(patternCss, /standard-query-field__item \.ant-input[\s\S]*?height:\s*var\(--ant-control-height\)/);
  assert.match(patternCss, /standard-query-field__item \.ant-input[\s\S]*?\.ant-select-selector[\s\S]*?min-height:\s*var\(--ant-control-height\)/);
  assert.match(patternCss, /standard-query-grid[^}]*row-gap:\s*var\(--ant-margin-xs\)/s);
  assert.match(patternCss, /standard-query-advanced[^}]*margin-top:\s*var\(--ant-margin-xs\)/s);
  assert.match(patternCss, /standard-query-field__hint[^}]*min-height:\s*20px/s);
  assert.match(patternCss, /standard-query-advanced[^}]*background:\s*transparent/s);
  assert.match(patternCss, /standard-query-advanced[^}]*border:\s*0/s);
  assert.match(patternCss, /standard-query-advanced[^}]*box-shadow:\s*none/s);
  assert.doesNotMatch(patternCss, /!important\b/);
  assert.doesNotMatch(patternCss, /#[0-9a-f]{3,8}\b/i);
  assert.doesNotMatch(patternCss, /(^|[,{]\s*)\.ant-[\w-]+/m);
});

test('query actions uniquely decide labels icons hierarchy sizing and loading linkage', () => {
  assert.match(actions, /type="text"/);
  assert.match(actions, /type: 'default'/);
  assert.match(actions, /type: 'primary'/);
  assert.match(actions, /icon: undefined/g);
  assert.match(actions, /DownOutlined/);
  assert.match(actions, /UpOutlined/);
  assert.match(actions, /activeFilterCount/);
  assert.match(actions, /disabled: busy \|\| item\.props\.disabled/);
  assert.match(actions, /<div \{\.\.\.props\} className=/);
  assert.doesNotMatch(actions, /<Space/);

  assert.match(actionCss, /data-query-action="more"[^}]*min-width:\s*112px/s);
  assert.match(actionCss, /data-query-action="reset"[^}]*min-width:\s*72px/s);
  assert.match(actionCss, /data-query-action="submit"[^}]*min-width:\s*72px/s);
  assert.match(actionCss, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(actionCss, /data-query-action="more"[^}]*grid-column:\s*1\s*\/\s*-1/s);
  assert.match(actionCss, /min-height:\s*44px/);
  assert.doesNotMatch(actionCss, /\.ant-/);
  assert.doesNotMatch(actionCss, /!important\b/);
});

test('the visual contract is indexed as the authority for query card sizing and actions', () => {
  assert.match(standardsIndex, /查询 Card 视觉契约/);
  assert.match(standardsIndex, /docs\/frontend\/query-card-visual-contract\.md/);
  assert.match(visualContract, /4 → 2 → 1/);
  assert.match(visualContract, /默认高度使用 Ant Design `controlHeight`/);
  assert.match(visualContract, /更多筛选（N）/);
  assert.match(visualContract, /查询 \| `primary` \| 无 \| 72px/);
  assert.match(visualContract, /不使用 `Collapse` Header/);
  assert.match(visualContract, /页面特有图标/);
});

test('Issue #1027 migrates person source and workbench to the shared query contract', () => {
  for (const [name, source] of [['人物档案', personArchive], ['来源资料库', sourceLibrary], ['修谱任务', workbench]]) {
    assert.match(source, /StandardQueryPanel/, `${name} must use StandardQueryPanel`);
    assert.match(source, /<StandardQueryGrid>/, `${name} must use StandardQueryGrid`);
    assert.match(source, /<StandardAdvancedFilters/, `${name} must use StandardAdvancedFilters`);
    assert.match(source, /StandardMoreFiltersButton/, `${name} must use the standard more-filter action`);
    assert.match(source, /activeFilterCount=\{advancedFilterCount\}/, `${name} must expose hidden active-filter count`);
    assert.doesNotMatch(source, /title="(人物档案查询|来源资料查询|修谱工作台)"/, `${name} query title must not repeat the module title`);
  }
  assert.doesNotMatch(personArchive, /person-archive-advanced-collapse|\bCollapse\b/);
  assert.doesNotMatch(sourceLibrary, /source-library-more-filters|\bCollapse\b/);
  assert.doesNotMatch(workbench, /<Col[^>]+xl=\{(4|8)\}/);
  assert.doesNotMatch(workbench, /<Collapse\b/);
  assert.match(workbench, /<StandardQueryField label="创建时间"><DatePicker\.RangePicker/);
});

test('Issue #1029 migrates culture and import queries to the shared visual contract', () => {
  for (const [name, source] of [
    ['文化资料', cultureItem],
    ['文化场所', cultureSite],
    ['迁徙脉络', migrationEvent]
  ]) {
    assert.match(source, /<StandardQueryGrid>/, `${name} must use the standard four-column grid`);
    assert.match(source, /<StandardAdvancedFilters expanded=\{moreOpen\}/, `${name} must keep advanced filters in the shared region`);
    assert.match(source, /StandardQueryField label="宗族"/, `${name} must use standard field sizing`);
    assert.doesNotMatch(source, /<Row gutter=|<Col\b/, `${name} must not retain a page-specific query grid`);
  }

  assert.match(importCenter, /<StandardQueryPanel className="import-query-card"/);
  assert.match(importCenter, /<StandardQueryGrid>/);
  assert.match(importCenter, /StandardQueryField label="任务创建时间"/);
  assert.doesNotMatch(importCenter, /<Row gutter=|<Col\b|SearchOutlined/);
  assert.doesNotMatch(importCenter, /data-query-action="submit"[^>]*type="primary"/);
});