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

const emptyFilters = {
  taskName: '', keyword: '', taskTypes: [], risks: [], statuses: [], creator: '', createdFrom: '', createdTo: ''
};

test('reads valid workbench state with repeated filters and safely ignores invalid values', () => {
  assert.deepEqual(
    readWorkbenchUrlState('?view=editingWorkspace&clanId=12&taskName=%E5%AD%97%E8%BE%88&keyword=%E5%BC%A0%E4%B8%89&type=missing_source&type=relationship_check&risk=high&status=pending&creator=system_rule&createdFrom=2026-01-01&createdTo=2026-01-31&page=3&taskId=WB-1'),
    {
      clanId: '12', taskName: '字辈', keyword: '张三', taskTypes: ['missing_source', 'relationship_check'],
      risks: ['high'], statuses: ['pending'], creator: 'system_rule', createdFrom: '2026-01-01', createdTo: '2026-01-31',
      page: 3, taskId: 'WB-1'
    }
  );
  assert.deepEqual(
    readWorkbenchUrlState('?type=bad&risk=bad&status=bad&creator=bad&page=-1'),
    { clanId: '', ...emptyFilters, page: 1, taskId: '' }
  );
});

test('keeps compatibility with comma-separated legacy multi values', () => {
  assert.deepEqual(readWorkbenchUrlState('?type=missing_source,generation_mismatch&risk=high,low').taskTypes, ['missing_source', 'generation_mismatch']);
  assert.deepEqual(readWorkbenchUrlState('?type=missing_source,generation_mismatch&risk=high,low').risks, ['high', 'low']);
});

test('writes changed workbench parameters and preserves route context', () => {
  const next = writeWorkbenchUrlState(
    'https://example.test/?view=editingWorkspace&type=missing_source&page=2&taskId=old',
    { taskTypes: ['generation_mismatch', 'relationship_check'], risks: ['high'], page: 1, taskId: '' }
  );
  assert.equal(next, '/?view=editingWorkspace&type=generation_mismatch&type=relationship_check&risk=high');
});

test('maps KPI cards to deterministic filters', () => {
  assert.deepEqual(filtersForKpi('pending'), { ...emptyFilters, statuses: ['pending'] });
  assert.deepEqual(filtersForKpi('high'), { ...emptyFilters, risks: ['high'] });
  assert.deepEqual(filtersForKpi('source'), { ...emptyFilters, taskTypes: ['missing_source'] });
  assert.deepEqual(filtersForKpi('generation'), { ...emptyFilters, taskTypes: ['generation_mismatch'] });
});

test('builds filter labels without requiring an on-page selected-condition area', () => {
  assert.deepEqual(filterLabels({ ...emptyFilters, taskName: '补充', taskTypes: ['missing_source'], risks: ['high'], statuses: ['pending'] }), [
    { key: 'taskName', label: '任务：补充' },
    { key: 'taskTypes', label: '类型：来源证据缺失' },
    { key: 'risks', label: '优先级：高风险' },
    { key: 'statuses', label: '状态：待处理' }
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
  assert.deepEqual(workbenchEmptyState({ hasClan: true, loading: false, error: false, hasFilters: true, count: 0 }), { description: '当前筛选条件下暂无修谱任务', action: 'clear' });
  assert.deepEqual(workbenchEmptyState({ hasClan: true, loading: false, error: true, hasFilters: false, count: 0 }), { description: '任务列表加载失败', action: 'retry' });
  assert.deepEqual(workbenchEmptyState({ hasClan: true, loading: false, error: false, hasFilters: false, count: 0 }), { description: '当前宗族暂无待处理修谱任务', action: '' });
});
