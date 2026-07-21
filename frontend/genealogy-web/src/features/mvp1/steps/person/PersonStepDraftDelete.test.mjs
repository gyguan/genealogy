import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const personStepSource = readFileSync(new URL('./PersonStep.tsx', import.meta.url), 'utf8');
const personServiceSource = readFileSync(new URL('../../services/personService.ts', import.meta.url), 'utf8');
const draftDeleteButtonSource = readFileSync(new URL('../../../../shared/ui/DraftDeleteButton.tsx', import.meta.url), 'utf8');

test('wizard person list exposes the shared draft delete action', () => {
  assert.match(personStepSource, /import \{ DraftDeleteButton \}/);
  assert.match(personStepSource, /label="删除草稿"/);
  assert.match(personStepSource, /objectType="人物"/);
  assert.match(personStepSource, /onDelete=\{\(\) => deletePersonApi\(row\.id!\)\}/);
  assert.match(personStepSource, /onDeleted=\{\(\) => afterDeletePerson\(row\)\}/);
});

test('wizard person delete uses the existing person DELETE endpoint', () => {
  assert.match(personServiceSource, /apiClient\.delete\(`\/persons\/\$\{personId\}`\)/);
});

test('person delete completion clears stale selection and reloads the list', () => {
  assert.match(personStepSource, /setSelectedPersonRowKeys\(prev => prev\.filter/);
  assert.match(personStepSource, /workspace\.setPersonId\(''\)/);
  assert.match(personStepSource, /await loadPersons\(\)/);
});

test('draft delete trigger isolates its click before the table row handler', () => {
  assert.match(draftDeleteButtonSource, /<span onClick=\{event => event\.stopPropagation\(\)\}>/);
  assert.match(draftDeleteButtonSource, /onClick=\{event => \{\s*event\.stopPropagation\(\);/);
  assert.match(personStepSource, /onRow=\{row => \(\{ onClick: \(\) => selectPerson\(row\) \}\)\}/);
});
