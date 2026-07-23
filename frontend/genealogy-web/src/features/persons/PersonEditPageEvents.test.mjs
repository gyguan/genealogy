import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./PersonEditPage.tsx', import.meta.url), 'utf8');
const serviceSource = readFileSync(new URL('./personEventService.ts', import.meta.url), 'utf8');

test('person edit page supports draft save and formal revision with events', () => {
  assert.ok(source.includes('loadPersonEvents(personId)'));
  assert.ok(source.includes('PersonEventEditor'));
  assert.ok(source.includes('savePersonWithEvents'));
  assert.ok(source.includes('submitPersonRevisionWithEvents'));
  assert.ok(source.includes('eventEditingDisabled'));
  assert.ok(serviceSource.includes('`/persons/${personId}/revision`'));
  assert.ok(serviceSource.includes('toReplacePersonEventsPayload'));
});
