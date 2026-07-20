import test from 'node:test';
import assert from 'node:assert/strict';
import {
  allowedImportTaskActions,
  importTaskProgress,
  importTaskStatus,
  matchesImportTask
} from '../../../.import-workbench-test/features/imports/import-task-model.js';

const baseQuery = {
  importTypes: [], statuses: [], keyword: '', createdFrom: '', createdTo: '', pageNo: 1, pageSize: 10
};

test('normalizes completed tasks with failed rows as partial success', () => {
  const job = { id: 1, executionStatus: 'completed', successCount: 9, failureCount: 1, totalCount: 10 };
  assert.equal(importTaskStatus(job), 'partial_completed');
  assert.equal(importTaskProgress(job), 100);
});

test('filters tasks by multiple types, statuses, keyword and date range', () => {
  const job = {
    id: 12,
    taskNo: 'IMP-20260720-0012',
    importType: 'person',
    originalFilename: '黄氏人物资料.xlsx',
    executionStatus: 'running',
    createdAt: '2026-07-20T08:30:00+08:00'
  };
  assert.equal(matchesImportTask(job, {
    ...baseQuery,
    importTypes: ['person', 'relationship'],
    statuses: ['running', 'queued'],
    keyword: '人物资料',
    createdFrom: '2026-07-19',
    createdTo: '2026-07-20'
  }), true);
});

test('prevents cancelling tasks after side effects exist', () => {
  assert.deepEqual(allowedImportTaskActions({ id: 1, executionStatus: 'running', processedCount: 10 }), ['pause']);
  assert.deepEqual(allowedImportTaskActions({ id: 2, executionStatus: 'running', processedCount: 0 }), ['pause', 'cancel']);
});
