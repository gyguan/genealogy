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

function assertNestedBusinessCard(source, relativePath) {
  const outerIndex = source.indexOf('query-result-outer-card');
  const innerIndex = source.indexOf('<BusinessResultCard', outerIndex);
  const innerCloseIndex = source.indexOf('</BusinessResultCard>', innerIndex);
  const outerCloseIndex = source.indexOf('</Card>', innerCloseIndex);

  assert.ok(outerIndex >= 0, `${relativePath} should mark the outer result card`);
  assert.ok(innerIndex > outerIndex, `${relativePath} should render the business card after the outer card opens`);
  assert.equal(
    source.slice(outerIndex, innerIndex).includes('</Card>'),
    false,
    `${relativePath} must not close the 查询结果 card before rendering the business card`
  );
  assert.ok(innerCloseIndex > innerIndex, `${relativePath} should close the business result card`);
  assert.ok(outerCloseIndex > innerCloseIndex, `${relativePath} should close the outer result card after the business card`);
}

test('all query result pages nest the business card inside the 查询结果 card', () => {
  for (const [relativePath, businessTitle] of files) {
    const source = readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8');
    assert.match(source, /title="查询结果"/, `${relativePath} should use 查询结果 as outer title`);
    assert.ok(source.includes(businessTitle), `${relativePath} should expose business title ${businessTitle}`);
    assertNestedBusinessCard(source, relativePath);
  }
});

test('shared styles keep the business card as a direct child of the outer card body', () => {
  const source = readFileSync(new URL('./query-result-cards.css', import.meta.url), 'utf8');
  assert.match(source, /\.query-result-outer-card\s*>\s*\.ant-card-body\s*>\s*\.business-result-card/);
  assert.match(source, /\.query-result-outer-card\s*>\s*\.ant-card-body\s*\{[\s\S]*background:\s*#fff/);
  assert.doesNotMatch(source, /\.query-result-outer-card\s*>\s*\.ant-card-body\s*\{[\s\S]*background:\s*#f5f7fa/);
});

test('member create action and review refresh action stay in outer card headers', () => {
  const member = readFileSync(new URL('../../features/members/MemberPage.tsx', import.meta.url), 'utf8');
  const review = readFileSync(new URL('../../features/reviews/ReviewCenterPageContent.tsx', import.meta.url), 'utf8');
  assert.match(member, /title="查询结果" extra=\{<Button type="primary"[^>]*>新增成员授权<\/Button>\}/);
  assert.match(review, /title="查询结果"[\s\S]*extra=\{workspace\.clanId[\s\S]*>刷新<\/Button>/);
});
