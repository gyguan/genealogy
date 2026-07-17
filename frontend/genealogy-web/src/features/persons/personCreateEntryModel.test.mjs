import assert from 'node:assert/strict';
import test from 'node:test';
import { getPersonCreateEntryError } from '../../../.person-create-entry-test/features/persons/personCreateEntryModel.js';

test('requires a clan before entering person creation', () => {
  assert.equal(getPersonCreateEntryError({ clanId: '', branchId: '' }), '请先选择宗族后再创建人物。');
});

test('allows entering person creation without a selected branch', () => {
  assert.equal(getPersonCreateEntryError({ clanId: '100', branchId: '' }), '');
});

test('also allows entering with an existing branch for automatic prefill', () => {
  assert.equal(getPersonCreateEntryError({ clanId: '100', branchId: '200' }), '');
});
