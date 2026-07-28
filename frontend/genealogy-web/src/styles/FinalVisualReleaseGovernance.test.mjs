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

test('five stable regions use strict Chromium screenshot difference assertions', async () => {
  const spec = await source('e2e/css-desktop-viewport-matrix.spec.ts');
  const config = await source('playwright.config.ts');
  const workflow = await source('../../.github/workflows/culture-page-gate.yml');
  for (const name of ['header.png', 'query-bar.png', 'form.png', 'table.png', 'statistic-card.png']) {
    assert.match(spec, new RegExp(`toHaveScreenshot\\('${name.replace('.', '\\.')}')`));
  }
  assert.match(spec, /browserName !== 'chromium'/);
  assert.match(spec, /maxDiffPixelRatio:\s*0\.001/);
  assert.match(spec, /threshold:\s*0\.15/);
  assert.match(spec, /animations:\s*'disabled'/);
  assert.match(spec, /caret:\s*'hide'/);
  assert.match(spec, /Date\.now/);
  assert.match(spec, /Math\.random/);
  assert.match(config, /deviceScaleFactor/);
  assert.match(config, /E2E_DEVICE_SCALE_FACTOR\s*\|\|\s*'1'/);
  assert.match(workflow, /spec\.ts-snapshots/);
  assert.match(workflow, /retention-days:\s*14/);
});
