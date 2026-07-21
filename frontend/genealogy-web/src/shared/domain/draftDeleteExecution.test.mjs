import assert from 'node:assert/strict';
import test from 'node:test';
import { DraftDeleteExecutionLock } from '../../../.draft-delete-test/shared/domain/draftDeleteExecution.js';

test('draft delete executes backend callback once while request is in flight', async () => {
  const lock = new DraftDeleteExecutionLock();
  let resolveDelete;
  let deleteCalls = 0;
  let deletedCalls = 0;
  const pendingDelete = new Promise(resolve => { resolveDelete = resolve; });

  const first = lock.run(async () => {
    deleteCalls += 1;
    await pendingDelete;
  }, async () => {
    deletedCalls += 1;
  });
  const second = lock.run(async () => {
    deleteCalls += 1;
  });

  assert.equal(lock.isRunning(), true);
  assert.equal(await second, false);
  assert.equal(deleteCalls, 1);

  resolveDelete();
  assert.equal(await first, true);
  assert.equal(deletedCalls, 1);
  assert.equal(lock.isRunning(), false);
});

test('draft delete lock is released after backend failure so user can retry', async () => {
  const lock = new DraftDeleteExecutionLock();
  let calls = 0;

  await assert.rejects(
    lock.run(async () => {
      calls += 1;
      throw new Error('delete failed');
    }),
    /delete failed/
  );

  assert.equal(lock.isRunning(), false);
  assert.equal(await lock.run(async () => { calls += 1; }), true);
  assert.equal(calls, 2);
});
