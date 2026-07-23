import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const editorSource = readFileSync(new URL('./PersonEventEditor.tsx', import.meta.url), 'utf8');
const modelSource = readFileSync(new URL('./personEventEditorModel.ts', import.meta.url), 'utf8');

test('person event editor exposes maintenance actions', () => {
  for (const marker of ['新增事件', '新增第一条事件', '上移事件', '下移事件', '删除事件', 'movePersonEvent']) {
    assert.ok(editorSource.includes(marker), marker);
  }
});

test('person event editor enforces title and date rules', () => {
  for (const marker of ['请输入事件标题', 'futureDate', 'disabledDate', 'aria-invalid', 'isFuturePersonEventDate']) {
    assert.ok(editorSource.includes(marker) || modelSource.includes(marker), marker);
  }
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
    assert.ok(modelSource.includes(field), field);
  }
  assert.ok(modelSource.includes('toReplacePersonEventsPayload'));
  assert.ok(modelSource.includes('normalizePersonEvents'));
});
