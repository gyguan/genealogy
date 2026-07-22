import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const files = [
  ['features/persons/PersonArchiveSearchPage.tsx', '人物档案'],
  ['features/sources/SourceLibraryQueryPage.tsx', '来源资料'],
  ['features/logs/LogPage.tsx', '业务对象'],
  ['features/tree/LineageTreeProductPage.tsx', '世系图谱'],
  ['features/imports/ImportPage.tsx', '导入任务'],
  ['features/workbench/EditingWorkspacePage.tsx', '修谱任务'],
  ['features/culture/CultureItemStandardTab.tsx', '文化资料'],
  ['features/culture/MigrationEventStandardTab.tsx', '迁徙脉络'],
  ['features/culture/CultureSiteStandardTab.tsx', '文化场所'],
  ['features/reviews/ReviewCenterPageContent.tsx', '审核任务'],
  ['features/members/MemberPage.tsx', '成员列表']
];

test('pages keep one shared QueryResultCard configuration', () => {
  for (const [relativePath, businessTitle] of files) {
    const source = readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8');
    assert.equal((source.match(/<QueryResultCard/g) || []).length, 1, `${relativePath} should render one result container`);
    assert.match(source, /\stotal=\{/);
    assert.match(source, /\sbusinessTitle=/);
    assert.ok(source.includes(businessTitle), `${relativePath} should expose ${businessTitle}`);
    assert.doesNotMatch(source, /BusinessResultCard/, `${relativePath} must not assemble the inner card`);
  }
});

test('QueryResultCard uses a custom outer section and directly owns one BusinessResultCard', () => {
  const source = readFileSync(new URL('./QueryResultCards.tsx', import.meta.url), 'utf8');
  const component = source.slice(source.indexOf('export function QueryResultCard'));
  assert.equal((component.match(/<BusinessResultCard/g) || []).length, 1);
  assert.match(component, /<section[\s\S]*data-query-result-role="outer"[\s\S]*>\s*<div className="query-result-outer-card__header">[\s\S]*<BusinessResultCard/);
  assert.doesNotMatch(component, /<Card[\s\S]*data-query-result-role="outer"/);
  assert.doesNotMatch(component, /ant-card-body/);
});

test('shared styles make the business card a direct child without an outer card body', () => {
  const source = readFileSync(new URL('./query-result-cards.css', import.meta.url), 'utf8');
  assert.match(source, /\.query-result-outer-card\s*>\s*\.business-result-card/);
  assert.doesNotMatch(source, /\.query-result-outer-card\s*>\s*\.ant-card-body/);
});
