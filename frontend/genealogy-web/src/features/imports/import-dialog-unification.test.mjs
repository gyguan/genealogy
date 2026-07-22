import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const here = dirname(fileURLToPath(import.meta.url));
const importPage = readFileSync(join(here, 'ImportPage.tsx'), 'utf8');
const selector = readFileSync(join(here, 'ImportTypeSelector.tsx'), 'utf8');
const oldModal = join(here, 'NewImportModal.tsx');

test('new import uses one drawer without modal-to-drawer transition', () => {
  assert.match(importPage, /const \[importDrawerOpen, setImportDrawerOpen\] = useState\(false\)/);
  assert.match(importPage, /open=\{importDrawerOpen\}/);
  assert.match(importPage, /title="新建导入"/);
  assert.match(importPage, /<ImportTypeSelector activeType=\{activeType\} onTypeChange=\{changeType\} \/>/);
  assert.match(importPage, /<div key=\{activeType\} className="import-active-workspace">/);
  assert.doesNotMatch(importPage, /newImportOpen|uploadWorkspaceOpen|continueToUpload|NewImportModal/);
  assert.equal(existsSync(oldModal), false);
});

test('drawer embeds all import type choices and no modal wrapper', () => {
  assert.doesNotMatch(selector, /Modal/);
  assert.match(selector, /title="1\. 选择导入对象"/);
  assert.match(selector, /value: 'person'/);
  assert.match(selector, /value: 'relationship'/);
  assert.match(selector, /value: 'source'/);
  assert.match(selector, /aria-pressed=\{activeType === option\.value\}/);
});
