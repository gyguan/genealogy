import assert from 'node:assert/strict';
import test from 'node:test';
import { createPersonWithEvents } from '../../../.person-event-test/features/persons/personCreateWithEventsFlow.js';

test('creates person, saves events, then submits review', async () => {
  const calls = [];
  const created = await createPersonWithEvents({
    events: [{ eventTitle: '出生', sortOrder: 0 }],
    createPerson: async () => {
      calls.push('person');
      return { id: 42, name: '测试人物' };
    },
    saveEvents: async (personId, events) => {
      calls.push('events');
      assert.equal(personId, '42');
      assert.equal(events[0].eventTitle, '出生');
    },
    submitReview: async personId => {
      calls.push('review');
      assert.equal(personId, '42');
    }
  });

  assert.deepEqual(calls, ['person', 'events', 'review']);
  assert.equal(created.id, 42);
});

test('does not submit review when event persistence fails', async () => {
  let submitted = false;
  await assert.rejects(
    () => createPersonWithEvents({
      events: [{ eventTitle: '出生', sortOrder: 0 }],
      createPerson: async () => ({ id: 43 }),
      saveEvents: async () => {
        throw new Error('事件保存失败');
      },
      submitReview: async () => {
        submitted = true;
      }
    }),
    /事件保存失败/
  );
  assert.equal(submitted, false);
});

test('validates events before creating a person', async () => {
  let created = false;
  await assert.rejects(
    () => createPersonWithEvents({
      events: [{ eventTitle: '', sortOrder: 0 }],
      createPerson: async () => {
        created = true;
        return { id: 44 };
      },
      saveEvents: async () => undefined
    }),
    /事件标题不能为空/
  );
  assert.equal(created, false);
});
