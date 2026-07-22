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

test('pages configure one fixed QueryResultCard and never assemble BusinessResultCard themselves', () => {
  for (const [relativePath, businessTitle] of files) {
    const source = readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8');
    assert.equal((source.match(/<QueryResultCard/g) || []).length, 1, `${relativePath} should render one outer result card`);
    assert.match(source, /\stotal=\{/);
    assert.match(source, /\sbusinessTitle=/);
    assert.ok(source.includes(businessTitle), `${relativePath} should expose ${businessTitle}`);
    assert.doesNotMatch(source, /BusinessResultCard/, `${relativePath} must not assemble the inner card`);
  }
});

test('QueryResultCard itself owns exactly one direct BusinessResultCard', () => {
  const source = readFileSync(new URL('./QueryResultCards.tsx', import.meta.url), 'utf8');
  const component = source.slice(source.indexOf('export function QueryResultCard'));
  assert.equal((component.match(/<BusinessResultCard/g) || []).length, 1);
  assert.match(component, /<Card[\s\S]*data-query-result-role="outer"[\s\S]*>\s*<BusinessResultCard/);
  assert.match(component, /businessTitle/);
  assert.match(component, /businessExtra/);
  assert.doesNotMatch(source, /export function BusinessResultCard/);
});

test('shared styles keep the business card as the direct child of the outer card body', () => {
  const source = readFileSync(new URL('./query-result-cards.css', import.meta.url), 'utf8');
  assert.match(source, /\.query-result-outer-card\s*>\s*\.ant-card-body\s*>\s*\.business-result-card/);
});
