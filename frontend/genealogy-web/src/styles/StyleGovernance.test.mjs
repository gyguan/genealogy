import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('src');
const mainSource = readFileSync(path.join(ROOT, 'main.tsx'), 'utf8');
const appSource = readFileSync(path.join(ROOT, 'app/App.tsx'), 'utf8');
const styleEntry = readFileSync(path.join(ROOT, 'styles/index.css'), 'utf8');
const featureLoader = readFileSync(path.join(ROOT, 'shared/styles/loadFeatureStyles.ts'), 'utf8');
const architecture = readFileSync(path.join(ROOT, 'styles/CSS_ARCHITECTURE.md'), 'utf8');

function cssFiles(directory) {
  return readdirSync(directory).flatMap(name => {
    const absolute = path.join(directory, name);
    if (statSync(absolute).isDirectory()) return cssFiles(absolute);
    return name.endsWith('.css') ? [absolute] : [];
  });
}

test('application entry only imports Ant reset and the governed style entry', () => {
  const cssImports = [...mainSource.matchAll(/import\s+['"]([^'"]+\.css)['"];?/g)].map(match => match[1]);
  assert.deepEqual(cssImports, ['antd/dist/reset.css', './styles/index.css']);
});

test('feature styles are absent from the global bundle and loaded by active module', () => {
  for (const file of [
    'mvp1-wizard.css',
    'person-edit-page.css',
    'lineage-tree.css',
    'member-permission-page.css',
    'audit-trace.css'
  ]) {
    assert.equal(styleEntry.includes(file), false, `${file} must not be globally loaded`);
    assert.equal(featureLoader.includes(file), true, `${file} must be owned by the feature style loader`);
  }
  assert.match(appSource, /loadFeatureStyles\(active\)/);
  assert.match(featureLoader, /const loaded = new Set/);
});

test('compatibility styles remain explicit, ordered and documented', () => {
  assert.match(styleEntry, /shell\/base/);
  assert.match(styleEntry, /shared patterns/);
  assert.match(styleEntry, /migration bridge/);
  const imports = [...styleEntry.matchAll(/@import\s+['"]([^'"]+)['"];?/g)].map(match => match[1]);
  assert.equal(imports.at(-1), '../antd-bridge.css');
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

test('stylesheets do not introduce unscoped base business selectors', () => {
  const prohibited = [
    { pattern: /(^|})\s*button\s*\{/gm, label: 'button {}' },
    { pattern: /(^|})\s*\.field\s+input\s*\{/gm, label: '.field input {}' },
    { pattern: /(^|})\s*\.data-table\s*\{/gm, label: '.data-table {}' }
  ];
  for (const file of cssFiles(ROOT)) {
    const source = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const rule of prohibited) {
      assert.equal(rule.pattern.test(source), false, `${path.relative(ROOT, file)} contains prohibited ${rule.label}`);
      rule.pattern.lastIndex = 0;
    }
  }
  assert.match(architecture, /业务 class 必须带模块前缀/);
  assert.match(architecture, /Token/);
});
