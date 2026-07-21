import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SOURCE_BINDING_PAGE_SIZE,
  appendSourceBinding,
  deriveSourceStageState,
  paginateSourceBindings,
  resetSourceBindingSelection
} from '../../../../.source-stage-test/features/mvp1/domain/sourceStageModel.js';

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

test('source bindings are paged with ten records by default', () => {
  const rows = Array.from({ length: 23 }, (_value, index) => ({ id: index + 1 }));
  const page = paginateSourceBindings(rows, 2);

  assert.equal(SOURCE_BINDING_PAGE_SIZE, 10);
  assert.equal(page.page, 2);
  assert.equal(page.pageSize, 10);
  assert.equal(page.pageCount, 3);
  assert.equal(page.total, 23);
  assert.deepEqual(page.rows.map(row => row.id), [11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
});

test('source binding pagination clamps an out-of-range page after data shrinks', () => {
  const rows = Array.from({ length: 12 }, (_value, index) => ({ id: index + 1 }));
  const page = paginateSourceBindings(rows, 4);

  assert.equal(page.page, 2);
  assert.deepEqual(page.rows.map(row => row.id), [11, 12]);
});
