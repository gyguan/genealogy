import assert from 'node:assert/strict';
import test from 'node:test';
import { appendSourceBinding, deriveSourceStageState, resetSourceBindingSelection } from '../../../../.source-stage-test/features/mvp1/domain/sourceStageModel.js';

test('draft source keeps binding stage blocked', () => {
  const state = deriveSourceStageState([{ id: 1, dataStatus: 'draft' }], '1');
  assert.equal(state.bindingOpen, false);
  assert.equal(state.stageOneStatus, 'draft');
  assert.match(state.stageTwoReason, /草稿/);
});

test('official source opens binding stage', () => {
  const state = deriveSourceStageState([{ id: 2, dataStatus: 'official' }], '2');
  assert.equal(state.bindingOpen, true);
  assert.equal(state.stageOneStatus, 'official');
});

test('binding success prepends refreshed record', () => {
  const next = appendSourceBinding([{ id: 1, sourceId: 2 }], { id: 3, sourceId: 2, targetType: 'person', targetId: 9 });
  assert.equal(next[0].id, 3);
  assert.equal(next.length, 2);
});

test('switching source resets target selection', () => {
  assert.deepEqual(resetSourceBindingSelection('1', '2'), { targetType: 'person', targetId: '' });
  assert.equal(resetSourceBindingSelection('2', '2'), undefined);
});
