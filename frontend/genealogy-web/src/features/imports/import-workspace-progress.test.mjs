import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canCreateImportBatch,
  emptyImportWorkspaceProgress,
  importStepIndex
} from '../../../.import-workbench-test/features/imports/import-workspace-progress.js';

test('steps follow target, file and preview completion', () => {
  assert.equal(importStepIndex(false, emptyImportWorkspaceProgress), 0);
  assert.equal(importStepIndex(true, emptyImportWorkspaceProgress), 1);
  assert.equal(importStepIndex(true, { hasFile: true, previewReady: false, batchCreated: false }), 2);
  assert.equal(importStepIndex(true, { hasFile: true, previewReady: true, batchCreated: false }), 3);
});

test('blocking errors prevent batch creation', () => {
  assert.equal(canCreateImportBatch({
    branchSelected: true,
    hasFile: true,
    previewReady: true,
    errorCount: 1,
    duplicateCount: 0,
    duplicatesConfirmed: false
  }), false);
});

test('duplicates require explicit confirmation', () => {
  const base = {
    branchSelected: true,
    hasFile: true,
    previewReady: true,
    errorCount: 0,
    duplicateCount: 2
  };
  assert.equal(canCreateImportBatch({ ...base, duplicatesConfirmed: false }), false);
  assert.equal(canCreateImportBatch({ ...base, duplicatesConfirmed: true }), true);
});
