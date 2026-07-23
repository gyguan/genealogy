import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const editorSource = readFileSync(new URL('./PersonEventEditor.tsx', import.meta.url), 'utf8');
const modelSource = readFileSync(new URL('./personEventEditorModel.ts', import.meta.url), 'utf8');

test('person event editor exposes maintenance and validation capabilities', () => {
  assert.ok(editorSource.includes('export function PersonEventEditor'));
  assert.ok(editorSource.includes('movePersonEvent'));
  assert.ok(editorSource.includes('disabledDate'));
  assert.ok(modelSource.includes('isFuturePersonEventDate'));
  assert.ok(modelSource.includes('toReplacePersonEventsPayload'));
  assert.ok(modelSource.includes('normalizePersonEvents'));
});
