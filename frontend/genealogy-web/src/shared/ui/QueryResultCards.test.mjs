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

test('all query result pages use the approved outer and inner card structure', () => {
  for (const [relativePath, businessTitle] of files) {
    const source = readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8');
    assert.match(source, /query-result-outer-card/, `${relativePath} should mark the outer result card`);
    assert.match(source, /title="查询结果"/, `${relativePath} should use 查询结果 as outer title`);
    assert.match(source, /<BusinessResultCard/, `${relativePath} should render an inner business result card`);
    assert.ok(source.includes(businessTitle), `${relativePath} should expose business title ${businessTitle}`);
  }
});

test('member create action and review refresh action stay in outer card headers', () => {
  const member = readFileSync(new URL('../../features/members/MemberPage.tsx', import.meta.url), 'utf8');
  const review = readFileSync(new URL('../../features/reviews/ReviewCenterPageContent.tsx', import.meta.url), 'utf8');
  assert.match(member, /title="查询结果" extra=\{<Button type="primary"[^>]*>新增成员授权<\/Button>\}/);
  assert.match(review, /title="查询结果"[\s\S]*extra=\{workspace\.clanId[\s\S]*>刷新<\/Button>/);
});
