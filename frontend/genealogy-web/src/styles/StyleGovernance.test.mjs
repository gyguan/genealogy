import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('src');
const mainSource = readFileSync(path.join(ROOT, 'main.tsx'), 'utf8');
const styleEntry = readFileSync(path.join(ROOT, 'styles/index.css'), 'utf8');
const architecture = readFileSync(path.join(ROOT, 'styles/CSS_ARCHITECTURE.md'), 'utf8');

test('application entry only imports Ant reset and the governed style entry', () => {
  const cssImports = [...mainSource.matchAll(/import\s+['"]([^'"]+\.css)['"];?/g)].map(match => match[1]);
  assert.deepEqual(cssImports, ['antd/dist/reset.css', './styles/index.css']);
});

test('compatibility styles remain explicit, ordered and documented', () => {
  assert.match(styleEntry, /shell\/base/);
  assert.match(styleEntry, /feature compatibility/);
  assert.match(styleEntry, /migration bridge/);
  assert.ok(styleEntry.lastIndexOf("@import '../antd-bridge.css';") > styleEntry.lastIndexOf("@import '../member-permission-page.css';"));
  for (const file of [
    'guidance-cleanup.css',
    'module-title-dedup.css',
    'page-content-cleanup.css',
    'query-button-unification.css',
    'antd-bridge.css'
  ]) {
    assert.match(architecture, new RegExp(file.replace('.', '\\.')));
  }
  assert.match(architecture, /退出条件/);
  assert.match(architecture, /只减不增/);
});

test('style policy forbids unscoped business selectors', () => {
  assert.match(architecture, /禁止新增全局 `button \{\}`/);
  assert.match(architecture, /业务 class 必须带模块前缀/);
  assert.match(architecture, /Token/);
});
