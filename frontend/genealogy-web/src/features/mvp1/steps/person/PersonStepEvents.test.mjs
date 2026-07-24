import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./PersonStep.tsx', import.meta.url), 'utf8');
const editSource = readFileSync(new URL('../../../persons/PersonEditPage.tsx', import.meta.url), 'utf8');
const detailSource = readFileSync(new URL('../../../persons/PersonDetailPage.tsx', import.meta.url), 'utf8');
const tabSource = readFileSync(new URL('../../../persons/personArchiveUrlState.ts', import.meta.url), 'utf8');

function includesAll(markers) {
  for (const marker of markers) assert.ok(source.includes(marker), marker);
}

test('person creation page renders the life-event editor', () => {
  includesAll([
    'PersonEventEditor',
    'personEvents',
    'setPersonEvents',
    'title="生平事迹"'
  ]);
});

test('person creation saves events before optional review submission', () => {
  includesAll([
    'createPersonWithEvents',
    'replacePersonEvents(personId, events)',
    'submitReview: submit ?',
    '人物及关键事件已保存并提交审核'
  ]);
});

test('person creation resets key events with the form', () => {
  assert.ok((source.match(/setPersonEvents\(\[\]\)/g) || []).length >= 3);
  includesAll(['resetPersonFormForNext', 'resetPersonForm']);
});

test('create edit and detail pages share the unified person grouping', () => {
  const allSections = ['基本身份', '世系归属', '生卒与地域', '生平概况', '生平事迹', '墓志资料', '治理信息'];
  allSections.forEach(section => {
    assert.match(source, new RegExp(`title=\\"${section}\\"`));
    assert.match(editSource, new RegExp(`title=\\"${section}\\"`));
  });
  ['基本身份', '世系归属', '生卒与地域', '生平概况', '治理信息'].forEach(section => {
    assert.match(detailSource, new RegExp(`title=\\"${section}\\"`));
  });
  assert.match(detailSource, /key: 'events', label: '生平事迹'/);
  assert.match(detailSource, /key: 'epitaph', label: '墓志资料'/);
  assert.match(tabSource, /'epitaph'/);
});

test('create page exposes the fields previously available only during edit', () => {
  ['birthDatePrecision', 'deathDatePrecision', 'tombPlace', 'hasDescendant'].forEach(field => {
    assert.match(source, new RegExp(`personForm\\.${field}`));
  });
  assert.doesNotMatch(source, /title="传记与隐私"|title="生卒与居住"|title="世系信息"/);
  assert.doesNotMatch(editSource, /title="生平与墓志"|title="治理与展示"|title="生卒与地点"/);
  assert.doesNotMatch(detailSource, /title="身份与世系"|title="生活与治理"/);
});
