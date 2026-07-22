import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const clanStepSource = readFileSync(new URL('./ClanStep.tsx', import.meta.url), 'utf8');
const reviewServiceSource = readFileSync(new URL('../../services/reviewTaskService.ts', import.meta.url), 'utf8');

test('draft clan exposes a real review submission entry', () => {
  assert.match(reviewServiceSource, /ReviewTaskTargetType = 'clan' \|/);
  assert.match(clanStepSource, /targetType: 'clan'/);
  assert.match(clanStepSource, />\s*提交审核\s*<\/Button>/);
  assert.match(clanStepSource, /await loadClans\(\)/);
  assert.match(clanStepSource, /status === 'draft' \|\| status === 'rejected'/);
});

test('clan review uses a dedicated endpoint instead of generic target dispatch', () => {
  assert.match(reviewServiceSource, /export function submitClanReviewTask/);
  assert.match(reviewServiceSource, /`\/clans\/\$\{clanId\}\/submit-review`/);
  assert.match(reviewServiceSource, /diffSummary: comment/);
  assert.match(reviewServiceSource, /if \(targetType === 'clan'\)/);
  assert.match(reviewServiceSource, /submitClanReviewTask\(targetId, comment\)/);
});

test('clan step no longer claims clans are outside review flow', () => {
  assert.doesNotMatch(clanStepSource, /宗族暂不纳入审核流|宗族作为建谱容器暂不进入审核流/);
  assert.match(clanStepSource, /宗族创建后为草稿，可在下方列表提交审核/);
  assert.match(clanStepSource, /value === 'pending' \|\| value === 'pending_review'/);
  assert.match(clanStepSource, /value === 'rejected'/);
});
