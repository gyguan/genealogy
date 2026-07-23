import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./PersonEditPage.tsx', import.meta.url), 'utf8');
const serviceSource = readFileSync(new URL('./personEventService.ts', import.meta.url), 'utf8');

test('loads person and events in the same page load', () => {
  assert.ok(source.includes('Promise.all(['));
  assert.ok(source.includes('apiClient.get<any>(`/persons/${personId}`)'));
  assert.ok(source.includes('loadPersonEvents(personId)'));
  assert.ok(source.includes('setEvents(loadedEvents)'));
});

test('renders event editor and tracks event changes', () => {
  assert.ok(source.includes('<PersonEventEditor'));
  assert.ok(source.includes('value={events}'));
  assert.ok(source.includes('onChange={changeEvents}'));
  assert.ok(source.includes('disabled={eventEditingDisabled}'));
  assert.ok(source.includes('setDirty(true)'));
});

test('saves draft person before replacing events', () => {
  assert.ok(source.includes('savePersonWithEvents({'));
  assert.ok(source.includes('savePerson: () => apiClient.put<any>'));
  assert.ok(source.includes('replacePersonEvents(personId, events)'));
  assert.ok(source.includes('setDirty(true)'));
  assert.ok(source.includes('setSaveError'));
});

test('submits formal person and events through one revision request', () => {
  assert.ok(source.includes('allowsRevisionSubmit(status)'));
  assert.ok(source.includes('submitPersonRevisionWithEvents(personId, toPersonUpdatePayload(values), events)'));
  assert.ok(source.includes("'人物资料及关键事件已提交审核'"));
  assert.ok(source.includes("['official', 'rejected']"));
  assert.ok(serviceSource.includes('submitPersonRevisionWithEvents'));
  assert.ok(serviceSource.includes('`/persons/${personId}/revision`'));
  assert.ok(serviceSource.includes('events: toReplacePersonEventsPayload(events)'));
});

test('prevents duplicate submission while review is pending', () => {
  assert.ok(source.includes('人物资料已处于待审核或不可编辑状态，不能重复提交'));
  assert.ok(source.includes('eventEditingDisabled'));
  assert.ok(source.includes("{directEventSave ? '保存草稿' : '提交审核'}"));
});
