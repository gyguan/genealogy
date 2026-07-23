import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const editorSource = readFileSync(new URL('./PersonEventEditor.tsx', import.meta.url), 'utf8');
const modelSource = readFileSync(new URL('./personEventEditorModel.ts', import.meta.url), 'utf8');

test('person event editor exposes add delete and ordering actions', () => {
  assert.match(editorSource, /新增事件/);
  assert.match(editorSource, /新增第一条事件/);
  assert.match(editorSource, /aria-label="上移事件"/);
  assert.match(editorSource, /aria-label="下移事件"/);
  assert.match(editorSource, /aria-label="删除事件"/);
  assert.match(editorSource, /movePersonEvent/);
});

test('person event editor validates required title and future date', () => {
  assert.match(editorSource, /请输入事件标题/);
  assert.match(editorSource, /status=\{futureDate \? 'error'/);
  assert.match(editorSource, /aria-invalid=\{futureDate\}/);
  assert.match(editorSource, /disabledDate/);
  assert.match(editorSource, /isAfter\(dayjs\(\)\.startOf\('day'\)\)/);
  assert.match(modelSource, /isFuturePersonEventDate/);
});

test('person event payload keeps all required business fields', () => {
  for (const field of [
    'eventType',
    'eventTitle',
    'eventDate',
    'eventDatePrecision',
    'eventPlace',
    'eventDescription',
    'sortOrder'
  ]) {
    assert.match(modelSource, new RegExp(field));
  }
  assert.match(modelSource, /toReplacePersonEventsPayload/);
  assert.match(modelSource, /normalizePersonEvents/);
});
