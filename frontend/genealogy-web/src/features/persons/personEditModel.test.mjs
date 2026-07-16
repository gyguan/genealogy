import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePersonDate,
  normalizePersonDatePrecision,
  toNullableBoolean,
  toPersonEditForm,
  toPersonUpdatePayload,
  toTriStateFormValue
} from '../../../.person-edit-test/features/persons/personEditModel.js';
import { dateByPrecision, lifeText } from '../../../.person-edit-test/features/persons/personDetailModel.js';

test('infers safe precision without inventing date parts', () => {
  assert.equal(normalizePersonDatePrecision(undefined, '1901'), 'year');
  assert.equal(normalizePersonDatePrecision(undefined, '1901-05'), 'month');
  assert.equal(normalizePersonDatePrecision(undefined, '1901-05-09'), 'day');
  assert.equal(normalizePersonDatePrecision(undefined, null), 'unknown');
});

test('normalizes dates according to declared precision', () => {
  assert.equal(normalizePersonDate('1901-05-09', 'year'), '1901');
  assert.equal(normalizePersonDate('1901-05-09', 'month'), '1901-05');
  assert.equal(normalizePersonDate('1901-05-09', 'day'), '1901-05-09');
  assert.equal(normalizePersonDate('1901-05-09', 'unknown'), null);
  assert.equal(normalizePersonDate('1901', 'month'), null);
});

test('preserves null false and true for tri-state fields', () => {
  assert.equal(toTriStateFormValue(null), '');
  assert.equal(toTriStateFormValue(false), 'false');
  assert.equal(toTriStateFormValue(true), 'true');
  assert.equal(toNullableBoolean(''), null);
  assert.equal(toNullableBoolean('false'), false);
  assert.equal(toNullableBoolean('true'), true);
});

test('round trips unknown living and descendant values as null', () => {
  const form = toPersonEditForm({
    name: '测试人物',
    birthDate: '1901',
    birthDatePrecision: 'year',
    deathDate: null,
    deathDatePrecision: 'unknown',
    isLiving: null,
    hasDescendant: null
  });
  assert.equal(form.birthDate, '1901');
  assert.equal(form.isLiving, '');
  assert.equal(form.hasDescendant, '');
  const payload = toPersonUpdatePayload(form);
  assert.equal(payload.birthDate, '1901');
  assert.equal(payload.deathDate, null);
  assert.equal(payload.isLiving, null);
  assert.equal(payload.hasDescendant, null);
});

test('keeps false values distinct in update payload', () => {
  const form = toPersonEditForm({ name: '测试人物', isLiving: false, hasDescendant: false });
  const payload = toPersonUpdatePayload(form);
  assert.equal(payload.isLiving, false);
  assert.equal(payload.hasDescendant, false);
});

test('renders dates by precision without placeholder day or month', () => {
  assert.equal(dateByPrecision('1901-01-01', 'year'), '1901年');
  assert.equal(dateByPrecision('1901-05-01', 'month'), '1901年05月');
  assert.equal(dateByPrecision('1901-05-09', 'day'), '1901年05月09日');
  assert.equal(dateByPrecision('1901-01-01', 'unknown'), '');
  assert.equal(lifeText({ birthDate: '1901-01-01', birthDatePrecision: 'year', isLiving: true }), '1901年 - 今');
});
