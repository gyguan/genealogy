import assert from 'node:assert/strict';
import test from 'node:test';

import {
  allowedActionList,
  canDirectDeleteDraft,
  canRequestDelete,
  draftDeleteConfirmDescription,
  draftDeleteConfirmTitle,
  objectLifecycleStatus
} from '../../../.draft-delete-test/shared/domain/draftDeleteModel.js';

test('draft status enables direct delete when allowedActions are absent', () => {
  assert.equal(objectLifecycleStatus({ dataStatus: ' Draft ' }), 'draft');
  assert.equal(canDirectDeleteDraft({ dataStatus: 'draft' }), true);
  assert.equal(canDirectDeleteDraft({ status: 'rejected' }), false);
});

test('allowedActions remain the source of truth when provided', () => {
  assert.deepEqual(allowedActionList({ allowedActions: ['view', 'delete'] }), ['view', 'delete']);
  assert.equal(canDirectDeleteDraft({ dataStatus: 'draft', allowedActions: [] }), false);
  assert.equal(canDirectDeleteDraft({ dataStatus: 'draft', allowedActions: ['view'] }), false);
  assert.equal(canDirectDeleteDraft({ dataStatus: 'rejected', allowedActions: ['view', 'delete'] }), true);
  assert.equal(canRequestDelete({ dataStatus: 'official', allowedActions: ['request_delete'] }), true);
});

test('confirmation copy names the object and explains the review boundary', () => {
  assert.equal(draftDeleteConfirmTitle('德字辈', '字辈方案'), '确认删除字辈方案“德字辈”？');
  assert.match(draftDeleteConfirmDescription('人物'), /仅草稿人物可直接删除/);
  assert.match(draftDeleteConfirmDescription('人物'), /审核流程/);
});
