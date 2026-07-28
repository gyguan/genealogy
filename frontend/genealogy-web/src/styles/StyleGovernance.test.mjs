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

function executableCss(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').trim();
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
  for (const file of ['mvp1-wizard-layout.css', 'mvp1-wizard-generation.css', 'person-archive-layout.css', 'person-query-layout.css', 'lineage-workbench.css', 'lineage-result-toolbar.css']) {
    assert.equal(featureLoader.includes(file), true, `${file} must have explicit feature ownership`);
  }
  assert.match(appSource, /loadFeatureStyles\(active\)/);
  assert.match(featureLoader, /const loaded = new Set/);
});

test('global entry only contains named shell and shared contracts', () => {
  assert.match(styleEntry, /shell\/app-shell/);
  assert.match(styleEntry, /shared UI responsibilities/);
  for (const retired of ['styles.css', 'experience.css', 'compact-ui.css', 'antd-bridge.css']) {
    assert.equal(styleEntry.includes(retired), false, `${retired} must not be globally loaded`);
  }
  for (const file of ['auth-commercial.css', 'tabbed-module.css', 'entity-page-header.css', 'runtime-error.css', 'shared-guidance.css', 'shared-module-title.css', 'shared-page-content.css', 'shared-query-actions.css']) {
    assert.match(styleEntry, new RegExp(file.replace('.', '\\.')));
  }
  assert.equal(executableCss(bridge), '');
  assert.match(architecture, /Legacy.*已退出|Legacy.*退役/i);
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
    'features/persons/person-query-layout.css',
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

test('retired legacy and prototype bundles contain no executable CSS', () => {
  for (const file of ['styles.css', 'experience.css', 'compact-ui.css']) {
    const source = readFileSync(path.join(ROOT, file), 'utf8');
    assert.equal(executableCss(source), '', `${file} must remain retired`);
  }
});

test('Ant Design override ledger and bridge are empty after retirement', () => {
  assert.equal(typeof overrideRegistry.owner, 'string');
  assert.deepEqual(overrideRegistry.exceptions, []);
  assert.deepEqual(overrideRegistry.importantSnapshot, []);
  assert.equal(executableCss(bridge), '');
  assert.doesNotMatch(bridge, /!important/);
  assert.match(architecture, /antd-override-exceptions\.json/);
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
    for (const rule of prohibited) {
      rule.pattern.lastIndex = 0;
      assert.equal(rule.pattern.test(source), false, `${path.relative(PROJECT_ROOT, file)} contains prohibited ${rule.label}`);
    }
  }
  assert.match(architecture, /业务 class 必须带模块前缀/);
  assert.match(architecture, /Token/);
});
