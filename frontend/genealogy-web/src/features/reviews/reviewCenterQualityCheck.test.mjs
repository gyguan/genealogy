import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('./ReviewCenterPage.tsx', import.meta.url), 'utf8');

test('quality check trigger is rendered only in the review result toolbar portal', () => {
  assert.match(source, /RESULT_EXTRA_SELECTOR/);
  assert.match(source, /触发质量检查/);
  assert.doesNotMatch(source, /review-quality-detail-panel[\s\S]{0,500}触发质量检查/);
});

test('selected tasks take precedence over current query scope', () => {
  assert.match(source, /selectedTaskIdsFromTable\(\)/);
  assert.match(source, /scopeType: ids\.length \? 'TASK_IDS' : 'QUERY'/);
  assert.match(source, /reviewTaskIds: selectedTaskIds/);
  assert.match(source, /query: currentQueryScope\(\)/);
});

test('detail panel is read-only and displays server blocking result', () => {
  assert.match(source, /\/quality-check`/);
  assert.match(source, /禁止审核通过/);
  assert.match(source, /审核通过时后端将拒绝提交/);
});
