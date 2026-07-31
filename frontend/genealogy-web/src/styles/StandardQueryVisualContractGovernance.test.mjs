import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const read = relative => readFileSync(new URL(relative, import.meta.url), 'utf8');
const patterns = read('../shared/ui/StandardPagePatterns.tsx');
const prototypeCss = read('./shared/standard-query-card.css');
const legacyPageCss = read('./shared/standard-page-patterns.css');
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

const srcRoot = fileURLToPath(new URL('..', import.meta.url));
const canonicalCssFiles = new Set([
  fileURLToPath(new URL('./shared/standard-query-card.css', import.meta.url)),
  fileURLToPath(new URL('../shared/ui/standard-query-actions.css', import.meta.url))
]);

function collectCssFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) return collectCssFiles(path);
    return entry.isFile() && path.endsWith('.css') ? [path] : [];
  });
}

test('the shared components expose one typed query-card contract', () => {
  for (const component of ['StandardQueryPanel', 'StandardQueryGrid', 'StandardQueryField', 'StandardAdvancedFilters']) {
    assert.match(patterns, new RegExp(`export function ${component}\\b`), `${component} must remain exported`);
    assert.match(patterns, new RegExp(`export type ${component}Props\\b`), `${component} must retain typed props`);
  }
  assert.match(patterns, /title = '查询条件'/);
  assert.match(patterns, /data-query-grid-role="fields"/);
  assert.match(patterns, /data-query-field-role="field"/);
  assert.match(patterns, /data-query-advanced-role="filters"/);
  assert.match(patterns, /hidden=\{!expanded\}/);
  assert.match(patterns, /aria-hidden=\{!expanded\}/);
  assert.doesNotMatch(patterns, /if \(!expanded\) return null/);
});

test('the prototype fixes card grid and responsive sizing', () => {
  assert.match(prototypeCss, /--standard-query-card-padding:\s*24px/);
  assert.match(prototypeCss, /--standard-query-control-height:\s*32px/);
  assert.match(prototypeCss, /--standard-query-column-gap:\s*16px/);
  assert.match(prototypeCss, /--standard-query-row-gap:\s*4px/);
  assert.match(prototypeCss, /--standard-query-section-gap:\s*24px/);
  assert.match(prototypeCss, /\.standard-query-grid\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(prototypeCss, /@media \(max-width:\s*1199px\)[\s\S]*?\.standard-query-grid\s*\{[^}]*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(prototypeCss, /@media \(max-width:\s*767px\)[\s\S]*?\.standard-query-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.doesNotMatch(prototypeCss, /standard-query-grid[^}]*repeat\((3|5),/s);
});

test('query fields use the detailed prototype dimensions', () => {
  assert.match(prototypeCss, /standard-query-field__item[^}]*min-height:\s*var\(--standard-query-control-height\)/s);
  assert.match(prototypeCss, /standard-query-field__item \.ant-input[\s\S]*?height:\s*var\(--standard-query-control-height\)/);
  assert.match(prototypeCss, /ant-form-item-label > label[^}]*font-size:\s*13px[^}]*font-weight:\s*500/s);
  assert.match(prototypeCss, /placeholder[^}]*font-size:\s*12px/s);
  assert.match(prototypeCss, /standard-query-field__hint:has\([^}]*display:\s*none/s);
  assert.match(prototypeCss, /standard-query-advanced[^}]*background:\s*transparent/s);
  assert.match(prototypeCss, /standard-query-advanced[^}]*border:\s*0/s);
  assert.match(prototypeCss, /standard-query-advanced[^}]*box-shadow:\s*none/s);
  assert.match(prototypeCss, /--standard-query-control-radius:\s*8px/);
  assert.match(prototypeCss, /--standard-query-button-radius:\s*6px/);
  assert.doesNotMatch(prototypeCss, /!important\b/);
  assert.doesNotMatch(prototypeCss, /#[0-9a-f]{3,8}\b/i);
});

test('query actions uniquely decide order hierarchy and prototype sizing', () => {
  assert.match(actions, /type="text"/);
  assert.match(actions, /type: 'default'/);
  assert.match(actions, /type: 'primary'/);
  assert.match(actions, /icon: undefined/g);
  assert.match(actions, /DownOutlined/);
  assert.match(actions, /UpOutlined/);
  assert.match(actions, /activeFilterCount/);
  assert.match(actions, /disabled: busy \|\| item\.props\.disabled/);
  assert.match(actions, /\['more', 'reset', 'submit'\]/);
  assert.doesNotMatch(actions, /<Space/);
  assert.match(actionCss, /standard-query-actions[^}]*justify-content:\s*flex-end/s);
  assert.doesNotMatch(actionCss, /data-query-action|min-width|min-height|@media|grid-template-columns|aria-controls/);
  assert.match(prototypeCss, /data-query-action="more"[^}]*min-width:\s*112px/s);
  assert.match(prototypeCss, /data-query-action="reset"[^}]*min-width:\s*72px/s);
  assert.match(prototypeCss, /data-query-action="submit"[^}]*min-width:\s*72px/s);
  assert.match(prototypeCss, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(prototypeCss, /data-query-action="more"[^}]*grid-column:\s*1\s*\/\s*-1/s);
  assert.match(prototypeCss, /min-height:\s*44px/);
});

test('legacy page styles cannot redefine any query-card selector', () => {
  assert.doesNotMatch(legacyPageCss, /\.standard-query-(panel|grid|field|advanced|actions)/);
});

test('only canonical stylesheets may own the standard query-card selectors', () => {
  const selectorPattern = /\.standard-query-(panel|grid|field|advanced|actions)\b/;
  const legacyHookPattern = /\.(person-archive-(query-card|query-actions|query-row|filter-grid|more-filter)|source-library-(query-card|query-grid|query-actions|more-filters)|workbench-(filter-grid|query-actions|more-filter|advanced-collapse)|tracking-(query-card|filter-card|filter-grid|filter-actions|query-actions)|culture-search-actions|import-query-actions)\b/;

  for (const cssFile of collectCssFiles(srcRoot)) {
    if (canonicalCssFiles.has(cssFile)) continue;
    const css = readFileSync(cssFile, 'utf8');
    assert.doesNotMatch(css, selectorPattern, `${cssFile} must not override shared StandardQuery selectors`);
    assert.doesNotMatch(css, legacyHookPattern, `${cssFile} must not retain a page-specific query-card layout hook`);
  }
});

test('the visual contract documents the prototype as the authority', () => {
  assert.match(standardsIndex, /查询 Card 视觉契约/);
  assert.match(standardsIndex, /docs\/frontend\/query-card-visual-contract\.md/);
  assert.match(visualContract, /4 → 2 → 1/);
  assert.match(visualContract, /控件高度 \| `32px`/);
  assert.match(visualContract, /Header \/ Body 桌面内边距 \| `24px`/);
  assert.match(visualContract, /字段横向间距：`16px`/);
  assert.match(visualContract, /字段纵向间距：`4px`/);
  assert.match(visualContract, /更多筛选必须紧邻重置按钮左侧/);
  assert.match(visualContract, /当前纳入契约的实际查询场景共 13 个/);
});

test('person source workbench culture and import remain on the shared skeleton', () => {
  for (const [name, source] of [['人物档案', personArchive], ['来源资料库', sourceLibrary], ['修谱任务', workbench]]) {
    assert.match(source, /StandardQueryPanel/, `${name} must use StandardQueryPanel`);
    assert.match(source, /<StandardQueryGrid>/, `${name} must use StandardQueryGrid`);
    assert.match(source, /<StandardAdvancedFilters/, `${name} must use StandardAdvancedFilters`);
    assert.match(source, /StandardMoreFiltersButton/, `${name} must use the standard more-filter action`);
  }
  for (const [name, source] of [['文化资料', cultureItem], ['文化场所', cultureSite], ['迁徙脉络', migrationEvent]]) {
    assert.match(source, /<StandardQueryGrid>/, `${name} must use StandardQueryGrid`);
    assert.match(source, /<StandardAdvancedFilters/, `${name} must use StandardAdvancedFilters`);
    assert.doesNotMatch(source, /<Row gutter=|<Col\b/, `${name} must not retain a page-specific query grid`);
  }
  assert.match(importCenter, /<StandardQueryPanel className="import-query-card"/);
  assert.match(importCenter, /<StandardQueryGrid>/);
  assert.doesNotMatch(importCenter, /<Row gutter=|<Col\b|SearchOutlined/);
});
