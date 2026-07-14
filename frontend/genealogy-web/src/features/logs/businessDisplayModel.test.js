import test from 'node:test';
import assert from 'node:assert/strict';
import {
  businessActorText,
  businessLogTargetText,
  trackingObjectSelection
} from './businessDisplayModel.js';

const typeLabel = value => ({
  person: '人物',
  source: '来源资料',
  review_task: '审核事项'
}[value] || '对象');

test('operation log display prefers business fields and never falls back to technical target id', () => {
  const text = businessLogTargetText({
    targetType: 'person',
    targetId: 998,
    targetDisplayName: '海靖公',
    targetBranchName: '长房',
    summary: 'person id 998 updated'
  }, typeLabel);

  assert.equal(text, '人物：海靖公（长房）');
  assert.equal(text.includes('998'), false);
});

test('unknown operator has a stable business fallback', () => {
  assert.equal(businessActorText(null), '未知操作者');
  assert.equal(businessActorText(''), '未知操作者');
  assert.equal(businessActorText('张审核员'), '张审核员');
});

test('selecting a normal object clears any review task association while retaining internal id only in state', () => {
  const result = trackingObjectSelection({
    objectType: 'person',
    objectId: 45,
    displayName: '张三',
    branchName: '长房',
    secondaryLabel: '第十二世 · 人物编码：P-0045'
  }, 7, typeLabel);

  assert.equal(result.selection.targetId, '45');
  assert.equal(result.selection.reviewTaskId, '');
  assert.equal(result.summary, '人物：张三 · 长房 · 第十二世 · 人物编码：P-0045');
  assert.equal(result.summary.includes('45'), true);
  assert.equal(result.summary.includes('objectId'), false);
});

test('selecting a review item keeps task id internally without exposing it in summary', () => {
  const result = trackingObjectSelection({
    objectType: 'review_task',
    objectId: 91,
    displayName: '审核事项：张三资料修订',
    branchName: '长房'
  }, 7, typeLabel);

  assert.equal(result.selection.reviewTaskId, '91');
  assert.equal(result.summary, '审核事项：审核事项：张三资料修订 · 长房');
  assert.equal(result.summary.includes('91'), false);
});
