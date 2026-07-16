import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve('.culture-shell-test/features/culture/culturePagePattern.js');
const {
  culturePagePatterns,
  cultureTabItems,
  culturePrimaryAction,
  cultureEditorTarget,
  cultureMobileClass
} = await import(pathToFileURL(modulePath).href);

test('defines one stable short label and one page primary action for every culture tab', () => {
  assert.deepEqual(cultureTabItems, [
    { key: 'items', label: '文化资料' },
    { key: 'migrations', label: '迁徙脉络' },
    { key: 'sites', label: '文化场所' }
  ]);
  assert.equal(culturePrimaryAction('items'), '新增资料');
  assert.equal(culturePrimaryAction('migrations'), '新增迁徙事件');
  assert.equal(culturePrimaryAction('sites'), '新增场所');
  assert.ok(cultureTabItems.every(item => item.label.length >= 2 && item.label.length <= 6));
});

test('all culture domains expose standalone editor targets', () => {
  assert.equal(cultureEditorTarget('items'), 'item');
  assert.equal(cultureEditorTarget('migrations'), 'migration');
  assert.equal(cultureEditorTarget('sites'), 'site');
});

test('each tab has a unique responsive record-view class', () => {
  const classes = ['items', 'migrations', 'sites'].map(cultureMobileClass);
  assert.equal(new Set(classes).size, 3);
  assert.deepEqual(classes, ['culture-tab-items', 'culture-tab-migrations', 'culture-tab-sites']);
  assert.equal(Object.keys(culturePagePatterns).length, 3);
});
