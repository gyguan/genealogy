import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = relative => readFileSync(new URL(relative, import.meta.url), 'utf8');
const prototypeCss = read('./shared/standard-query-card.css');
const actionCss = read('../shared/ui/standard-query-actions.css');

const querySurfaces = [
  ['人物档案', read('../features/persons/PersonArchiveSearchPage.tsx'), 1],
  ['来源资料库', read('../features/sources/SourceLibraryQueryPage.tsx'), 1],
  ['修谱工作台', read('../features/workbench/EditingWorkspacePage.tsx'), 1],
  ['世系图谱（人物中心/支派全局共用）', read('../features/tree/LineageTreeTabbedPage.tsx'), 1],
  ['成员与权限', read('../features/members/MemberPage.tsx'), 1],
  ['审核中心（三个 Tab 共用）', read('../features/reviews/ReviewCenterPageContent.tsx'), 1],
  ['追踪与审计（三个查询视图）', read('../features/logs/LogPage.tsx'), 3],
  ['宗族文化·文化资料', read('../features/culture/CultureItemStandardTab.tsx'), 1],
  ['宗族文化·文化场所', read('../features/culture/CultureSiteStandardTab.tsx'), 1],
  ['宗族文化·迁徙脉络', read('../features/culture/MigrationEventStandardTab.tsx'), 1],
  ['数据导入', read('../features/imports/ImportPage.tsx'), 1]
];

function occurrences(source, token) {
  return source.split(token).length - 1;
}

test('all 13 query-card surfaces use the shared prototype component', () => {
  const total = querySurfaces.reduce((sum, [name, source, expected]) => {
    const count = occurrences(source, '<StandardQueryPanel');
    assert.equal(count, expected, `${name} should expose ${expected} StandardQueryPanel instance(s)`);
    assert.match(source, /StandardQueryGrid/, `${name} must use StandardQueryGrid`);
    assert.match(source, /StandardQueryField/, `${name} must use StandardQueryField`);
    assert.match(source, /StandardQueryActions/, `${name} must use StandardQueryActions`);
    return sum + count;
  }, 0);
  assert.equal(total, 13);
});

test('the prototype fixes the complete visual sizing contract', () => {
  assert.match(prototypeCss, /--standard-query-card-padding:\s*24px/);
  assert.match(prototypeCss, /--standard-query-control-height:\s*32px/);
  assert.match(prototypeCss, /--standard-query-column-gap:\s*16px/);
  assert.match(prototypeCss, /--standard-query-row-gap:\s*4px/);
  assert.match(prototypeCss, /--standard-query-section-gap:\s*24px/);
  assert.match(prototypeCss, /--standard-query-action-gap:\s*8px/);
  assert.match(prototypeCss, /grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(prototypeCss, /@media \(max-width:\s*1199px\)[\s\S]*repeat\(2,/);
  assert.match(prototypeCss, /@media \(max-width:\s*767px\)[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(prototypeCss, /font-size:\s*13px/);
  assert.match(prototypeCss, /font-size:\s*12px/);
  assert.match(prototypeCss, /border-radius:\s*8px/);
  assert.match(prototypeCss, /border-radius:\s*6px/);
  assert.match(prototypeCss, /min-width:\s*112px/);
  assert.match(prototypeCss, /min-width:\s*72px/);
  assert.match(prototypeCss, /min-height:\s*44px/);
});

test('query layout is centralized and page actions load the prototype once', () => {
  assert.match(actionCss, /^@import '\.\.\/\.\.\/styles\/shared\/standard-query-card\.css';/);
  assert.doesNotMatch(actionCss, /standard-query-panel__body\s*>\s*form/);
  assert.doesNotMatch(actionCss, /standard-query-panel__actions\s*\{/);
  assert.doesNotMatch(prototypeCss, /!important\b/);
  assert.doesNotMatch(prototypeCss, /#[0-9a-f]{3,8}\b/i);
});
