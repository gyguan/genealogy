import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = path.resolve('src');
const PROJECT_ROOT = path.resolve('.');
const styleEntry = readFileSync(path.join(ROOT, 'styles/index.css'), 'utf8');
const shell = readFileSync(path.join(ROOT, 'styles/shell/app-shell.css'), 'utf8');

function executableCss(file) {
  return readFileSync(path.join(ROOT, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').trim();
}

function jsxClassUsage(token) {
  try {
    return execFileSync('git', ['grep', '-nE', `className=.{0,160}(^|[[:space:]])${token}([[:space:]]|["'\x60}])`, '--', 'src/**/*.tsx', 'src/**/*.jsx'], {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
  } catch {
    return '';
  }
}

test('legacy and prototype bundles stay out of the global entry', () => {
  for (const file of ['styles.css', 'experience.css', 'compact-ui.css']) {
    assert.equal(styleEntry.includes(file), false, `${file} must not return to styles/index.css`);
    assert.equal(executableCss(file), '', `${file} must remain an inert retirement marker`);
  }
});

test('retired native component systems do not return to active JSX', () => {
  const retiredTokens = [
    'legacy-field',
    'legacy-actions',
    'prototype-shell',
    'prototype-hero',
    'prototype-actions',
    'prototype-layout',
    'proto-mini-nav',
    'proto-tool-buttons',
    'proto-tree-canvas',
    'modal-mask',
    'modal-panel',
    'feedback-stack',
    'toast__close',
    'data-table'
  ];
  for (const token of retiredTokens) {
    assert.equal(jsxClassUsage(token), '', `${token} must not be used as an active JSX class`);
  }
});

test('application shell owns compact content spacing without legacy overrides', () => {
  assert.match(shell, /\.antd-content\s*\{[\s\S]*padding:\s*18px 24px 24px/);
  assert.doesNotMatch(shell, /\.sidebar\s+button|\.panel\b|\.prototype-|\.xp-/);
});

test('global entry contains only explicitly named responsibilities', () => {
  const imports = [...styleEntry.matchAll(/@import\s+['"]([^'"]+)['"]/g)].map(match => match[1]);
  assert.deepEqual(imports, [
    './design-system.css',
    './shell/app-shell.css',
    '../auth-commercial.css',
    '../tabbed-module.css',
    '../entity-page-header.css',
    '../runtime-error.css',
    './shared/shared-antd-contracts.css',
    '../shared-guidance.css',
    '../shared-module-title.css',
    '../shared-page-content.css',
    '../shared-query-actions.css'
  ]);
});
