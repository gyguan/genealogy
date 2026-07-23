import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./PersonEditPage.tsx', import.meta.url), 'utf8');
const serviceSource = readFileSync(new URL('./personEventService.ts', import.meta.url), 'utf8');

test('person edit page loads and renders key events', () => {
  for (const marker of ['loadPersonEvents(personId)', 'setEvents(loadedEvents)', 'PersonEventEditor', 'changeEvents']) {
    assert.ok(source.includes(marker), marker);
  }
});

test('draft person saves before replacing events', () => {
  for (const marker of ['savePersonWithEvents', 'apiClient.put<any>', 'replacePersonEvents(personId, events)']) {
    assert.ok(source.includes(marker), marker);
  }
});

test('formal person submits person and events through revision', () => {
  for (const marker of ['allowsRevisionSubmit', 'submitPersonRevisionWithEvents', '人物资料及关键事件已提交审核', 'eventEditingDisabled']) {
    assert.ok(source.includes(marker), marker);
  }
  for (const marker of ['submitPersonRevisionWithEvents', '/revision', 'toReplacePersonEventsPayload']) {
    assert.ok(serviceSource.includes(marker), marker);
  }
});

test('pending review state blocks duplicate submission', () => {
  assert.ok(source.includes('人物资料已处于待审核或不可编辑状态，不能重复提交'));
  assert.ok(source.includes("directEventSave ? '保存草稿' : '提交审核'"));
});
