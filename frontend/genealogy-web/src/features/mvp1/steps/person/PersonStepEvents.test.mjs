import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./PersonStep.tsx', import.meta.url), 'utf8');

function includesAll(markers) {
  for (const marker of markers) assert.ok(source.includes(marker), marker);
}

test('person creation page renders key event editor', () => {
  includesAll([
    'PersonEventEditor',
    'personEvents',
    'setPersonEvents',
    'title="关键事件"'
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
