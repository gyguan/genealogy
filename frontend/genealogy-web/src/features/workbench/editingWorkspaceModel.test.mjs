import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterLabels,
  filtersForKpi,
  readWorkbenchUrlState,
  summarizeBulkResults,
  workbenchEmptyState,
  workbenchTotalText,
  writeWorkbenchUrlState
} from './editingWorkspaceModel.js';

test('reads valid workbench state and safely ignores invalid values', () => {
  assert.deepEqual(
    readWorkbenchUrlState('?view=editingWorkspace&clanId=12&type=missing_source&risk=high&status=pending&page=3&taskId=WB-1'),
    { clanId: '12', taskType: 'missing_source', risk: 'high', status: 'pending', page: 3, taskId: 'WB-1' }
  );
  assert.deepEqual(
    readWorkbenchUrlState('?type=bad&risk=bad&status=bad&page=-1'),
    { clanId: '', taskType: '', risk: '', status: '', page: 1, taskId: '' }
  );
});

test('writes only changed workbench parameters and preserves route context', () => {
  const next = writeWorkbenchUrlState(
    'https://example.test/?view=editingWorkspace&type=missing_source&page=2&taskId=old',
    { risk: 'high', page: 1, taskId: '' }
  );
  assert.equal(next, '/?view=editingWorkspace&type=missing_source&risk=high');
});

test('maps KPI cards to deterministic filters', () => {
  assert.deepEqual(filtersForKpi('pending'), { taskType: '', risk: '', status: 'pending' });
  assert.deepEqual(filtersForKpi('high'), { taskType: '', risk: 'high', status: '' });
  assert.deepEqual(filtersForKpi('source'), { taskType: 'missing_source', risk: '', status: '' });
  assert.deepEqual(filtersForKpi('generation'), { taskType: 'generation_mismatch', risk: '', status: '' });
});

test('builds visible filter labels', () => {
  assert.deepEqual(filterLabels({ taskType: 'missing_source', risk: 'high', status: 'pending' }), [
    { key: 'taskType', label: '问题：来源证据缺失' },
    { key: 'risk', label: '风险：高风险' },
    { key: 'status', label: '状态：待处理' }
  ]);
});

test('formats workbench total count safely', () => {
  assert.equal(workbenchTotalText(23), '共 23 条任务');
  assert.equal(workbenchTotalText(-1), '共 0 条任务');
});

test('summarizes partial bulk operation results', () => {
  assert.deepEqual(summarizeBulkResults([
    { status: 'fulfilled', value: {} },
    { status: 'rejected', reason: new Error('conflict') },
    { status: 'fulfilled', value: {} }
  ]), { succeeded: 2, failed: 1 });
});

test('distinguishes workbench empty states', () => {
  assert.deepEqual(workbenchEmptyState({ hasClan: false, loading: false, error: false, hasFilters: false, count: 0 }), { description: '请选择宗族后查看修谱任务', action: '' });
  assert.deepEqual(workbenchEmptyState({ hasClan: true, loading: false, error: false, hasFilters: true, count: 0 }), { description: '当前筛选条件下暂无修谱问题', action: 'clear' });
  assert.deepEqual(workbenchEmptyState({ hasClan: true, loading: false, error: true, hasFilters: false, count: 0 }), { description: '任务列表加载失败', action: 'retry' });
  assert.deepEqual(workbenchEmptyState({ hasClan: true, loading: false, error: false, hasFilters: false, count: 0 }), { description: '当前宗族暂无待处理修谱任务', action: '' });
});
