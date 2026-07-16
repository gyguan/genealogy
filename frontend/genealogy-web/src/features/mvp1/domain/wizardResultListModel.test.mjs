import assert from 'node:assert/strict';
import test from 'node:test';
import { pageWizardResults, retainWizardResultsAfterRefreshFailure, wizardBatchToolbarVisible, wizardMobileListMode, wizardSelectionLabel } from '../../../../.wizard-result-list-test/features/mvp1/domain/wizardResultListModel.js';

test('person results paginate after threshold', () => {
  const result = pageWizardResults(Array.from({ length: 23 }, (_, i) => i + 1), 2);
  assert.equal(result.total, 23);
  assert.equal(result.pageCount, 3);
  assert.deepEqual(result.items, [11,12,13,14,15,16,17,18,19,20]);
});

test('batch toolbar appears only after selection', () => {
  assert.equal(wizardBatchToolbarVisible(0), false);
  assert.equal(wizardBatchToolbarVisible(2), true);
});

test('refresh failure keeps previous rows and marks stale', () => {
  const state = retainWizardResultsAfterRefreshFailure([{ id: 1 }], new Error('网络异常'));
  assert.equal(state.items.length, 1);
  assert.equal(state.stale, true);
  assert.equal(state.error, '网络异常');
});

test('selection entry has explicit accessible label', () => {
  assert.equal(wizardSelectionLabel('张三', false), '选择张三');
  assert.equal(wizardSelectionLabel('张三', true), '张三，已选择');
});

test('mobile list uses readable horizontal scroll mode', () => {
  assert.equal(wizardMobileListMode(375), 'scroll');
  assert.equal(wizardMobileListMode(1024), 'table');
});
