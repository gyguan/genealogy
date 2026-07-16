import assert from 'node:assert/strict';
import test from 'node:test';
import { readImportHistoryUrl } from '../../../.import-workbench-test/features/imports/import-history-state.js';

test('restores history filters and pagination', () => {
  assert.deepEqual(
    readImportHistoryUrl('?historyStatus=failed&historyType=source&historyFormat=xlsx&historyPage=3&historyPageSize=20'),
    { status: 'failed', type: 'source', format: 'xlsx', page: 3, pageSize: 20 }
  );
});

test('invalid history pagination safely falls back', () => {
  assert.deepEqual(
    readImportHistoryUrl('?historyPage=-2&historyPageSize=999'),
    { status: undefined, type: undefined, format: undefined, page: 1, pageSize: 10 }
  );
});
