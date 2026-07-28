import './FeatureBridgeRetirementGovernance.test.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = path.resolve('src');
const bridge = readFileSync(path.join(ROOT, 'antd-bridge.css'), 'utf8');
const styleEntry = readFileSync(path.join(ROOT, 'styles/index.css'), 'utf8');
const designSystem = readFileSync(path.join(ROOT, 'styles/design-system.css'), 'utf8');
const shell = readFileSync(path.join(ROOT, 'styles/shell/app-shell.css'), 'utf8');
const shared = readFileSync(path.join(ROOT, 'styles/shared/shared-antd-contracts.css'), 'utf8');
const memberStyles = readFileSync(path.join(ROOT, 'member-permission-page.css'), 'utf8');
const appProviders = readFileSync(path.join(ROOT, 'app/AppProviders.tsx'), 'utf8');
const currentUser = readFileSync(path.join(ROOT, 'features/auth/CurrentUserMenu.tsx'), 'utf8');
const currentUserStyles = readFileSync(path.join(ROOT, 'features/auth/current-user-menu.css'), 'utf8');

const migratedPrefixes = [
  '.antd-admin-layout',
  '.antd-main-layout',
  '.antd-sidebar',
  '.antd-brand',
  '.github-like-header',
  '.github-user-trigger',
  '.profile-center-card',
  '.antd-content',
  '.ant-card.panel',
  '.antd-field',
  '.antd-table-wrap',
  '.antd-empty',
  '.antd-detail-card',
  '.antd-toast-stack',
  '.system-management'
];

const defaultSystemColors = /#(?:1677ff|91caff|f5faff|f5f5f5|d9d9d9|f0f0f0|fafafa|ffffff)\b|rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*\.(?:88|65|45|25|03)\s*\)/i;

test('shell and shared UI styles are imported before the bridge', () => {
  assert.match(styleEntry, /shell\/app-shell\.css/);
  assert.match(styleEntry, /shared\/shared-antd-contracts\.css/);
  assert.ok(styleEntry.indexOf('shell/app-shell.css') < styleEntry.indexOf('antd-bridge.css'));
  assert.ok(styleEntry.indexOf('shared/shared-antd-contracts.css') < styleEntry.indexOf('antd-bridge.css'));
});

test('migrated responsibility domains no longer exist in the bridge', () => {
  for (const prefix of migratedPrefixes) {
    assert.equal(bridge.includes(prefix), false, `${prefix} must not return to antd-bridge.css`);
  }
  assert.doesNotMatch(bridge, /(^|})\s*\.antd-actions\s*\{/m);
  assert.match(shell, /\.github-like-header/);
  assert.match(shared, /\.antd-actions\s*\{/);
  assert.match(shared, /\.antd-table-wrap/);
  assert.match(currentUserStyles, /\.github-user-trigger\.ant-btn/);
});

test('current user menu uses an accessible Ant Design trigger', () => {
  assert.match(currentUser, /<Button[\s\S]*className="github-user-trigger"/);
  assert.match(currentUser, /aria-label=/);
  assert.match(currentUser, /aria-haspopup="menu"/);
  assert.match(currentUser, /aria-expanded=\{menuOpen\}/);
  assert.match(currentUser, /onOpenChange=\{setMenuOpen\}/);
  assert.doesNotMatch(currentUser, /<button className="github-user-trigger"/);
});

test('bridge important declarations shrink to query-grid compatibility only', () => {
  const importantCount = (bridge.match(/!important/g) ?? []).length;
  assert.equal(importantCount, 6);
  assert.doesNotMatch(bridge, /\.antd-sidebar[^}]*!important/);
  assert.doesNotMatch(bridge, /\.antd-detail-card[^}]*!important/);
});

test('Ant Design CSS variables back stable application semantics', () => {
  assert.match(appProviders, /cssVar:\s*\{\s*key:\s*'genealogy'\s*\}/);
  for (const token of ['primary', 'bg-layout', 'bg-container', 'border', 'border-secondary', 'text', 'text-secondary', 'text-tertiary']) {
    assert.match(designSystem, new RegExp(`--genealogy-color-${token}:\\s*var\\(--ant-`));
  }
});

test('standard shell, shared UI and member feature do not duplicate default system colors', () => {
  for (const [name, source] of [['app shell', shell], ['current user', currentUserStyles], ['shared UI', shared], ['member feature', memberStyles]]) {
    assert.doesNotMatch(source, defaultSystemColors, `${name} must consume semantic variables instead of fixed Ant Design defaults`);
    assert.match(source, /var\(--genealogy-/);
  }
});
