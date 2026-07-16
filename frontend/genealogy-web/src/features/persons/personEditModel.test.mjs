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
import {
  disabledPersonStatusActionReason,
  legalPersonStatusActions,
  visiblePersonStatusActions
} from '../../../.person-edit-test/features/persons/personStatusActions.js';

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

test('ordinary update payload never carries dataStatus', () => {
  const form = toPersonEditForm({ name: '测试人物', dataStatus: 'official' });
  const payload = toPersonUpdatePayload(form);
  assert.equal(Object.hasOwn(payload, 'dataStatus'), false);
  assert.equal(Object.hasOwn(form, 'dataStatus'), false);
});

test('renders dates by precision without placeholder day or month', () => {
  assert.equal(dateByPrecision('1901-01-01', 'year'), '1901年');
  assert.equal(dateByPrecision('1901-05-01', 'month'), '1901年05月');
  assert.equal(dateByPrecision('1901-05-09', 'day'), '1901年05月09日');
  assert.equal(dateByPrecision('1901-01-01', 'unknown'), '');
  assert.equal(lifeText({ birthDate: '1901-01-01', birthDatePrecision: 'year', isLiving: true }), '1901年 - 今');
});

test('exposes only legal status transitions', () => {
  assert.deepEqual(legalPersonStatusActions('draft'), ['submit_review']);
  assert.deepEqual(legalPersonStatusActions('rejected'), ['submit_review']);
  assert.deepEqual(legalPersonStatusActions('pending_review'), ['withdraw_review']);
  assert.deepEqual(legalPersonStatusActions('official'), ['archive']);
  assert.deepEqual(legalPersonStatusActions('archived'), ['restore']);
});

test('hides unauthorized actions when allowedActions are explicit', () => {
  assert.deepEqual(visiblePersonStatusActions('draft', []), []);
  const actions = visiblePersonStatusActions('draft', ['SUBMIT_REVIEW']);
  assert.equal(actions.length, 1);
  assert.equal(actions[0].action.key, 'submit_review');
  assert.equal(actions[0].enabled, true);
});

test('shows disabled contract reason when backend capability is absent', () => {
  const actions = visiblePersonStatusActions('official', undefined);
  assert.equal(actions.length, 1);
  assert.equal(actions[0].action.key, 'archive');
  assert.equal(actions[0].enabled, false);
  assert.match(actions[0].reason, /后端尚未提供/);
  assert.match(disabledPersonStatusActionReason('restore', 'official', undefined), /当前档案状态不允许/);
});
