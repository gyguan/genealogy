import assert from 'node:assert/strict';
import test from 'node:test';
import {
  filterImportPreviewRows,
  importPreviewCounts,
  importValidationStatus
} from '../../../.import-workbench-test/features/imports/import-preview-model.js';

test('uses explicit warning status without deriving from raw data', () => {
  const rows = [
    { rowNo: 1, validationStatus: 'valid', rawData: '{}' },
    { rowNo: 2, validationStatus: 'warning', warningMessages: ['缺少日信息'] },
    { rowNo: 3, duplicated: true },
    { rowNo: 4, errorMessage: '必填缺失' }
  ];
  assert.deepEqual(importPreviewCounts({ rows }), {
    total: 4,
    valid: 1,
    warning: 1,
    duplicate: 1,
    error: 1
  });
  assert.equal(filterImportPreviewRows(rows, 'warning').length, 1);
  assert.equal(importValidationStatus(rows[0]), 'valid');
});

test('does not infer warning count from remaining totals', () => {
  assert.deepEqual(importPreviewCounts({ totalCount: 10, validCount: 7, duplicateCount: 1, errorCount: 1 }), {
    total: 10,
    valid: 7,
    warning: 0,
    duplicate: 1,
    error: 1
  });
});
