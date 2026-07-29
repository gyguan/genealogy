import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../', import.meta.url);
const source = path => readFile(new URL(path, root), 'utf8');

test('migrated tree and source interaction rules stay out of the bridge', async () => {
  const bridge = await source('src/antd-bridge.css');
  assert.doesNotMatch(bridge, /\.lineage-search-results\b/);
  assert.doesNotMatch(bridge, /\.xp-source-(?:row|guide|bind)--focused\b/);
});

test('header user entry retains an explicit keyboard focus contract', async () => {
  const bridge = await source('src/antd-bridge.css');
  const menu = await source('src/features/auth/CurrentUserMenu.tsx');
  const menuStyles = await source('src/features/auth/current-user-menu.css');
  assert.match(menu, /<Button[\s\S]*className="github-user-trigger"/);
  assert.match(menu, /aria-haspopup="menu"/);
  assert.match(menu, /aria-expanded=\{menuOpen\}/);
  assert.match(menuStyles, /\.github-user-trigger\.ant-btn:focus-visible\s*\{/);
  assert.match(menuStyles, /outline:\s*2px/);
  assert.doesNotMatch(bridge, /\.github-user-trigger/);
});

test('commercial auth visuals remain isolated to the auth feature', async () => {
  const css = await source('src/auth-commercial.css');
  assert.doesNotMatch(css, /(^|\n)\s*(?:body|#root)\s*\{/m);
  assert.match(css, /\.commercial-auth-shell/);
});

test('desktop visual regression matrix covers four widths and eight representative page types', async () => {
  const spec = await source('e2e/css-desktop-viewport-matrix.spec.ts');
  assert.match(spec, /\[1920,\s*1440,\s*1366,\s*1280\]/);
  for (const key of ['home', 'mvp1Wizard', 'personArchive', 'editingWorkspace', 'treeProduct', 'sourceLibrary', 'imports', 'memberManage']) {
    assert.match(spec, new RegExp(`key: '${key}'`));
  }
  for (const contract of ['bodyScrollWidth', 'documentScrollWidth', 'github-user-trigger', 'ant-table-wrapper', 'ant-upload-wrapper', 'ant-drawer-content-wrapper']) {
    assert.match(spec, new RegExp(contract));
  }
});

test('stable local screenshot evidence covers header query wizard table and statistics', async () => {
  const spec = await source('e2e/css-desktop-viewport-matrix.spec.ts');
  assert.match(spec, /local-header\.png/);
  for (const name of ['query-bar', 'wizard', 'table', 'statistic-card']) {
    assert.match(spec, new RegExp(`name: '${name}'`));
  }
  assert.match(spec, /local-\$\{item\.name\}\.png/);
  assert.match(spec, /locator\(item\.region\)\.first\(\)/);
  assert.match(spec, /region\.screenshot/);
});
