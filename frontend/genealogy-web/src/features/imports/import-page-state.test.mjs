import assert from 'node:assert/strict';
import test from 'node:test';
import { readImportPageUrl } from '../../../.import-workbench-test/features/imports/import-page-state.js';

test('restores supported import page state', () => {
  assert.deepEqual(readImportPageUrl('?tab=executions&type=relationship&branchId=123'), {
    tab: 'executions',
    type: 'relationship',
    branchId: '123'
  });
});

test('invalid url values safely fall back', () => {
  assert.deepEqual(readImportPageUrl('?tab=unknown&type=bad'), {
    tab: 'create',
    type: 'person',
    branchId: ''
  });
});
