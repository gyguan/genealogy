import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = path.resolve('src');
const bridge = readFileSync(path.join(ROOT, 'antd-bridge.css'), 'utf8');
const styleEntry = readFileSync(path.join(ROOT, 'styles/index.css'), 'utf8');
const shell = readFileSync(path.join(ROOT, 'styles/shell/app-shell.css'), 'utf8');
const shared = readFileSync(path.join(ROOT, 'styles/shared/shared-antd-contracts.css'), 'utf8');
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
  '.antd-actions',
  '.antd-table-wrap',
  '.antd-empty',
  '.antd-detail-card',
  '.antd-toast-stack',
  '.system-management'
];

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
  assert.match(shell, /\.github-like-header/);
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
