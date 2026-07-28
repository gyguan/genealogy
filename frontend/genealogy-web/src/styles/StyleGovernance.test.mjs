import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('src');
const PROJECT_ROOT = path.resolve('.');
const mainSource = readFileSync(path.join(ROOT, 'main.tsx'), 'utf8');
const appSource = readFileSync(path.join(ROOT, 'app/App.tsx'), 'utf8');
const styleEntry = readFileSync(path.join(ROOT, 'styles/index.css'), 'utf8');
const featureLoader = readFileSync(path.join(ROOT, 'shared/styles/loadFeatureStyles.ts'), 'utf8');
const architecture = readFileSync(path.join(ROOT, 'styles/CSS_ARCHITECTURE.md'), 'utf8');
const legacyStyles = readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
const bridge = readFileSync(path.join(ROOT, 'antd-bridge.css'), 'utf8');
const overrideRegistry = JSON.parse(readFileSync(path.join(ROOT, 'styles/antd-override-exceptions.json'), 'utf8'));

function changedCssFiles() {
  const candidates = ['origin/main...HEAD', 'main...HEAD', 'HEAD^...HEAD'];
  for (const range of candidates) {
    try {
      const output = execFileSync('git', ['diff', '--name-only', '--diff-filter=AM', range, '--', '*.css'], {
        cwd: PROJECT_ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore']
      });
      return output.split(/\r?\n/)
        .filter(Boolean)
        .map(file => path.resolve(PROJECT_ROOT, file))
        .filter(file => existsSync(file));
    } catch {
      // Try the next range so the test also works in shallow/local checkouts.
    }
  }
  return [path.join(ROOT, 'styles/index.css')];
}

test('application entry only imports Ant reset and the governed style entry', () => {
  const cssImports = [...mainSource.matchAll(/import\s+['"]([^'"]+\.css)['"];?/g)].map(match => match[1]);
  assert.deepEqual(cssImports, ['antd/dist/reset.css', './styles/index.css']);
});

test('feature styles are absent from the global bundle and loaded by active module', () => {
  for (const file of ['mvp1-wizard.css', 'person-edit-page.css', 'lineage-tree.css', 'member-permission-page.css', 'audit-trace.css']) {
    assert.equal(styleEntry.includes(file), false, `${file} must not be globally loaded`);
    assert.equal(featureLoader.includes(file), true, `${file} must be owned by the feature style loader`);
  }
  for (const file of ['mvp1-wizard-layout.css', 'mvp1-wizard-generation.css', 'person-archive-layout.css', 'lineage-workbench.css', 'lineage-result-toolbar.css']) {
    assert.equal(featureLoader.includes(file), true, `${file} must have explicit feature ownership`);
  }
  assert.match(appSource, /loadFeatureStyles\(active\)/);
  assert.match(featureLoader, /const loaded = new Set/);
});

test('compatibility styles remain explicit, ordered and documented', () => {
  assert.match(styleEntry, /shell\/base/);
  assert.match(styleEntry, /shared UI responsibilities/);
  assert.match(styleEntry, /migration bridge/);
  const imports = [...styleEntry.matchAll(/@import\s+['"]([^'"]+)['"];?/g)].map(match => match[1]);
  assert.equal(imports.at(-1), '../antd-bridge.css');
  for (const file of ['shared-guidance.css', 'shared-module-title.css', 'shared-page-content.css', 'shared-query-actions.css', 'antd-bridge.css']) {
    assert.match(architecture, new RegExp(file.replace('.', '\\.')));
  }
  assert.match(architecture, /退出条件/);
  assert.match(architecture, /只减不增/);
});

test('patch-named styles are removed and replaced by owned files', () => {
  const retired = [
    'person-archive-tweaks.css',
    'lineage-workbench-overrides.css',
    'lineage-result-toolbar-refinement.css',
    'guidance-cleanup.css',
    'module-title-dedup.css',
    'page-content-cleanup.css',
    'query-button-unification.css',
    'mvp1-wizard-simplified.css',
    'mvp1-wizard-enhancements.css'
  ];
  const owned = [
    'person-archive-layout.css',
    'lineage-workbench.css',
    'lineage-result-toolbar.css',
    'shared-guidance.css',
    'shared-module-title.css',
    'shared-page-content.css',
    'shared-query-actions.css',
    'mvp1-wizard-layout.css',
    'mvp1-wizard-generation.css'
  ];
  retired.forEach(file => assert.equal(existsSync(path.join(ROOT, file)), false, `${file} must be deleted`));
  owned.forEach(file => assert.equal(existsSync(path.join(ROOT, file)), true, `${file} must exist`));
  assert.doesNotMatch(styleEntry, /cleanup|tweaks|override|unification|refinement/i);
  assert.doesNotMatch(featureLoader, /cleanup|tweaks|override|unification|refinement/i);
  assert.match(architecture, /已全部退出本次治理范围/);
});

test('legacy global styles do not target Ant Design descendants', () => {
  assert.doesNotMatch(legacyStyles, /\.field\s+span/);
  assert.doesNotMatch(legacyStyles, /\.field\s+(input|select)/);
  assert.doesNotMatch(legacyStyles, /\.actions\s+button/);
  assert.doesNotMatch(legacyStyles, /\.sidebar\s+button/);
  assert.doesNotMatch(legacyStyles, /(^|\n)\.data-table\s*\{/);
  assert.match(legacyStyles, /\.field:not\(\.ant-form-item\)/);
  assert.match(legacyStyles, /table\.data-table/);
  assert.match(legacyStyles, /\.sidebar nav > button/);
});

test('Ant Design internal overrides have an owner and exit condition registry', () => {
  assert.equal(typeof overrideRegistry.owner, 'string');
  assert.ok(overrideRegistry.exceptions.length > 0);
  for (const item of overrideRegistry.exceptions) {
    assert.ok(item.scope);
    assert.ok(item.reason);
    assert.ok(item.exitCondition);
  }
  assert.match(architecture, /antd-override-exceptions\.json/);
  const importantCount = (bridge.match(/!important/g) ?? []).length;
  assert.ok(importantCount <= 29, `antd-bridge.css contains ${importantCount} !important declarations; the baseline must only shrink`);
});

test('changed stylesheets do not introduce unscoped business selectors', () => {
  const prohibited = [
    { pattern: /(^|})\s*button\s*\{/gm, label: 'button {}' },
    { pattern: /(^|})\s*\.field\s+(?:span|input|select)\b/gm, label: 'unscoped .field descendant' },
    { pattern: /(^|})\s*\.actions\s+button\b/gm, label: 'unscoped .actions button' },
    { pattern: /(^|})\s*\.sidebar\s+button\b/gm, label: 'unscoped .sidebar button' },
    { pattern: /(^|})\s*\.data-table\s*\{/gm, label: '.data-table {}' },
    { pattern: /(^|})\s*\.ant-[\w-]+\s*\{/gm, label: 'unscoped Ant Design internal override' }
  ];
  for (const file of changedCssFiles()) {
    const source = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    if (file.endsWith('antd-bridge.css')) continue;
    for (const rule of prohibited) {
      rule.pattern.lastIndex = 0;
      assert.equal(rule.pattern.test(source), false, `${path.relative(PROJECT_ROOT, file)} contains prohibited ${rule.label}`);
    }
  }
  assert.match(architecture, /业务 class 必须带模块前缀/);
  assert.match(architecture, /Token/);
});
