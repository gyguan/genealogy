import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./PersonEditPage.tsx', import.meta.url), 'utf8');

test('loads person and events together', () => {
  assert.match(source, /Promise\.all\(\[\s*apiClient\.get<any>\(`\/persons\/\$\{personId\}`\),\s*loadPersonEvents\(personId\)/s);
  assert.match(source, /setEvents\(loadedEvents\)/);
});

test('renders event editor and tracks event changes', () => {
  assert.match(source, /<PersonEventEditor\s+value=\{events\}/);
  assert.match(source, /onChange=\{changeEvents\}/);
  assert.match(source, /setDirty\(true\)/);
});

test('saves person before events through shared flow', () => {
  assert.match(source, /savePersonWithEvents\(\{/);
  assert.match(source, /savePerson:\s*\(\) => apiClient\.put<any>/);
  assert.match(source, /saveEvents:\s*async \(\) => replacePersonEvents\(personId, events\)/);
  assert.match(source, /setDirty\(true\);\s*setSaveError/s);
});

test('keeps formal person events read only until revision integration', () => {
  assert.match(source, /allowsDirectEventSave/);
  assert.match(source, /disabled=\{busy \|\| !directEventSave\}/);
  assert.match(source, /关键事件需随人物资料提交审核/);
});
