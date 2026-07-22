import test from 'node:test';
import assert from 'node:assert/strict';
import { savePersonWithEvents, validatePersonEvents } from '../../../.person-event-test/features/persons/personEventSaveFlow.js';

test('validates title and future date before saving person', async () => {
  const errors = validatePersonEvents([
    { eventTitle: ' ', sortOrder: 0 },
    { eventTitle: '未来事件', eventDate: '2999-01-01', sortOrder: 1 }
  ]);

  assert.deepEqual(errors.map(error => error.field), ['eventTitle', 'eventDate']);

  let personSaved = false;
  await assert.rejects(
    () => savePersonWithEvents({
      events: [{ eventTitle: '', sortOrder: 0 }],
      savePerson: async () => {
        personSaved = true;
        return { id: 1 };
      },
      saveEvents: async () => undefined
    }),
    /事件标题不能为空/
  );
  assert.equal(personSaved, false);
});

test('saves person first and then replaces events', async () => {
  const calls = [];
  const person = await savePersonWithEvents({
    events: [
      { eventTitle: '入学', eventType: 'education', eventDate: '2001-09-01', sortOrder: 1 },
      { eventTitle: '出生', eventType: 'birth', eventDate: '1990-01-01', sortOrder: 0 }
    ],
    savePerson: async () => {
      calls.push('person');
      return { id: 7, name: '测试人物' };
    },
    saveEvents: async payload => {
      calls.push('events');
      assert.deepEqual(payload.events.map(event => event.eventTitle), ['出生', '入学']);
      assert.deepEqual(payload.events.map(event => event.sortOrder), [0, 1]);
    }
  });

  assert.deepEqual(calls, ['person', 'events']);
  assert.equal(person.id, 7);
});

test('event failure rejects the complete save flow', async () => {
  await assert.rejects(
    () => savePersonWithEvents({
      events: [{ eventTitle: '出生', sortOrder: 0 }],
      savePerson: async () => ({ id: 8 }),
      saveEvents: async () => {
        throw new Error('事件保存失败');
      }
    }),
    /事件保存失败/
  );
});
