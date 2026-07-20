import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultImportTaskQuery, readImportTaskQuery } from '../../../.import-workbench-test/features/imports/import-task-query-state.js';

test('reads multi-value task filters and pagination from URL', () => {
  const state = readImportTaskQuery('?view=imports&importTypes=person,relationship&importStatuses=running,partial_completed&importKeyword=IMP-2026&importCreatedFrom=2026-07-01&importCreatedTo=2026-07-20&importPage=3&importPageSize=20');
  assert.deepEqual(state, {
    importTypes: ['person', 'relationship'],
    statuses: ['running', 'partial_completed'],
    keyword: 'IMP-2026',
    createdFrom: '2026-07-01',
    createdTo: '2026-07-20',
    pageNo: 3,
    pageSize: 20
  });
});

test('drops unsupported values and restores safe defaults', () => {
  const state = readImportTaskQuery('?importTypes=generation,unknown&importStatuses=unknown&importCreatedFrom=bad&importPage=0&importPageSize=999');
  assert.deepEqual(state, defaultImportTaskQuery);
});
