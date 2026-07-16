import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GENERATION_NUMBERS_MUST_BE_CONTINUOUS,
  partitionGenerationValidation,
  validateGenerationItems
} from '../../../../.generation-validation-test/features/mvp1/domain/generationValidation.js';

test('empty generation scheme is blocked', () => {
  const result = validateGenerationItems([]);
  assert.equal(result.valid, false);
  assert.equal(result.issues[0].code, 'empty_items');
});

test('one valid generation item makes scheme eligible', () => {
  const result = validateGenerationItems([{ generationNo: 1, word: '德' }]);
  assert.equal(result.valid, true);
  assert.match(result.summary, /可提交审核/);
});

test('duplicate generation number blocks submission', () => {
  const result = validateGenerationItems([
    { generationNo: 1, word: '德' },
    { generationNo: 1, word: '泽' }
  ]);
  assert.equal(result.valid, false);
  assert.equal(result.issues.some(issue => issue.code === 'duplicate_generation_no'), true);
  assert.match(result.summary, /第1世/);
});

test('duplicate word and invalid rows are reported', () => {
  const result = validateGenerationItems([
    { generationNo: 1, word: '德' },
    { generationNo: 2, word: '德' },
    { generationNo: 0, word: '' }
  ]);
  assert.equal(result.issues.some(issue => issue.code === 'duplicate_word'), true);
  assert.equal(result.issues.some(issue => issue.code === 'invalid_generation_no'), true);
  assert.equal(result.issues.some(issue => issue.code === 'empty_word'), true);
});

test('batch validation allows valid schemes while blocking invalid schemes', () => {
  const result = partitionGenerationValidation([
    { id: 'valid', items: [{ generationNo: 1, word: '德' }] },
    { id: 'empty', items: [] },
    { id: 'duplicate', items: [{ generationNo: 2, word: '泽' }, { generationNo: 2, word: '承' }] }
  ]);
  assert.deepEqual(result.eligible.map(item => item.id), ['valid']);
  assert.deepEqual(result.blocked.map(item => item.id), ['empty', 'duplicate']);
});

test('generation continuity is explicitly not required', () => {
  assert.equal(GENERATION_NUMBERS_MUST_BE_CONTINUOUS, false);
  assert.equal(validateGenerationItems([{ generationNo: 1, word: '德' }, { generationNo: 3, word: '承' }]).valid, true);
});
