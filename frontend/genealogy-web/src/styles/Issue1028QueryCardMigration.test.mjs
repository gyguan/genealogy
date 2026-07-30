import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = relative => readFileSync(new URL(relative, import.meta.url), 'utf8');
const tree = read('../features/tree/LineageTreeTabbedPage.tsx');
const members = read('../features/members/MemberPage.tsx');
const reviews = read('../features/reviews/ReviewCenterPageContent.tsx');

test('Issue #1028 migrates lineage queries to the shared four-column query contract', () => {
  assert.match(tree, /StandardQueryPanel/);
  assert.match(tree, /StandardQueryGrid/);
  assert.match(tree, /StandardQueryField/);
  assert.doesNotMatch(tree, /SearchOutlined/);
  assert.doesNotMatch(tree, /title="世系图谱"/);
  assert.doesNotMatch(tree, /lineage-tab-query-grid/);
  assert.match(tree, /data-query-action="submit"/);
});

test('Issue #1028 removes manual member query labels and isolates low-frequency status', () => {
  assert.match(members, /StandardQueryPanel/);
  assert.match(members, /StandardAdvancedFilters/);
  assert.match(members, /StandardMoreFiltersButton/);
  const queryPanel = members.slice(members.indexOf('<StandardQueryPanel'), members.indexOf('<PageFeedback'));
  assert.doesNotMatch(queryPanel, /<Typography\.Text type="secondary">当前宗族/);
  assert.doesNotMatch(queryPanel, /<Row gutter=/);
  assert.match(queryPanel, /label="成员状态"/);
});

test('Issue #1028 stabilizes review tabs on the shared query grid', () => {
  assert.match(reviews, /StandardQueryPanel/);
  assert.match(reviews, /StandardQueryGrid/);
  assert.match(reviews, /StandardQueryField/);
  assert.doesNotMatch(reviews, /<Card title="审核中心">/);
  assert.match(reviews, /loading=\{loading\}/);
});
