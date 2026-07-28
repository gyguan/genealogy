import { expect, test, type Locator, type Page } from '@playwright/test';

function ok(data: unknown) {
  return { status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) };
}

const representativePages = [
  { key: 'home', label: '族谱首页', kind: 'dashboard' },
  { key: 'mvp1Wizard', label: '建谱向导', kind: 'complex-form' },
  { key: 'personArchive', label: '人物档案', kind: 'table' },
  { key: 'editingWorkspace', label: '修谱工作台', kind: 'master-detail' },
  { key: 'treeProduct', label: '世系图谱', kind: 'tree-drawer' },
  { key: 'sourceLibrary', label: '来源资料库', kind: 'card-list' },
  { key: 'imports', label: '数据导入', kind: 'upload-progress' },
  { key: 'memberManage', label: '成员与权限', kind: 'permission' }
] as const;

const snapshotOptions = {
  animations: 'disabled' as const,
  caret: 'hide' as const,
  scale: 'css' as const,
  threshold: 0.15,
  maxDiffPixelRatio: 0.001
};

async function mockShellApi(page: Page) {
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    if (path === '/auth/me') return route.fulfill(ok({ id: 7, username: 'css_guard', displayName: '样式治理验证', status: 'active' }));
    if (path === '/clans') return route.fulfill(ok({ records: [{ id: 1, clanName: '黄氏宗族', surname: '黄' }], total: 1, pageNo: 1, pageSize: 20, totalPages: 1 }));
    if (path === '/clans/1/branches') return route.fulfill(ok([{ id: 2, branchName: '长沙支', branchPath: '黄氏宗族/长沙支' }]));
    if (/statistics|dashboard|summary/.test(path)) return route.fulfill(ok({ totalClans: 1, totalPersons: 18, pendingReviews: 2, totalSources: 6 }));
    if (/persons/.test(path)) return route.fulfill(ok({ records: [], items: [], total: 0, pageNo: 1, pageSize: 20, totalPages: 0 }));
    if (/reviews|tasks|logs|imports|sources|culture-items|relationships|members|roles|permissions/.test(path)) {
      return route.fulfill(ok({ records: [], items: [], content: [], total: 0, pageNo: 1, pageSize: 20, totalPages: 0 }));
    }
    return route.fulfill(ok({}));
  });
}

async function stabilizeVisualEnvironment(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
  await page.addInitScript(() => {
    const fixedNow = new Date('2026-07-28T00:00:00.000Z').valueOf();
    Date.now = () => fixedNow;
    Math.random = () => 0.417;
  });
  await page.addStyleTag({ content: `
    *, *::before, *::after {
      animation-duration: 0s !important;
      animation-delay: 0s !important;
      transition-duration: 0s !important;
      transition-delay: 0s !important;
      caret-color: transparent !important;
    }
    html, body, button, input, select, textarea {
      font-family: Arial, "Microsoft YaHei", sans-serif !important;
    }
  ` });
}

async function openStablePage(page: Page, key: string) {
  await page.goto(`/?view=${key}`);
  await page.waitForLoadState('networkidle');
  await stabilizeVisualEnvironment(page);
  await expect(page.locator('.github-like-header')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

async function expectInsideViewport(locator: Locator, width: number) {
  if (!(await locator.count())) return;
  const box = await locator.first().boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;
  expect(box.x).toBeGreaterThanOrEqual(-1);
  expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
}

async function verifyStructure(page: Page, width: number) {
  const layout = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    bodyScrollWidth: document.body.scrollWidth,
    documentScrollWidth: document.documentElement.scrollWidth
  }));
  expect(layout.bodyScrollWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
  expect(layout.documentScrollWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);

  const header = page.locator('.github-like-header');
  const content = page.locator('.antd-content');
  await expect(header).toBeVisible();
  await expect(content).toBeVisible();
  await expectInsideViewport(header, width);
  await expectInsideViewport(content, width);

  const userTrigger = page.locator('.github-user-trigger');
  await expect(userTrigger).toBeVisible();
  await userTrigger.focus();
  await expect(userTrigger).toBeFocused();

  for (const selector of ['.ant-form', '.ant-table-wrapper', '.ant-card', '.ant-upload-wrapper', '.ant-drawer-content-wrapper']) {
    await expectInsideViewport(page.locator(selector), width);
  }

  const primaryActions = page.locator('.antd-content .ant-btn-primary:visible');
  if (await primaryActions.count()) await expectInsideViewport(primaryActions.first(), width);
}

for (const width of [1920, 1440, 1366, 1280]) {
  for (const pageCase of representativePages) {
    test(`${width}px ${pageCase.kind} ${pageCase.label} has no overflow or critical action obstruction`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await mockShellApi(page);
      await page.goto(`/?view=${pageCase.key}`);
      await expect(page.getByText(pageCase.label, { exact: true }).first()).toBeVisible();
      await verifyStructure(page, width);
      await page.screenshot({ path: testInfo.outputPath(`${pageCase.key}-${width}-full.png`), fullPage: true, animations: 'disabled' });
    });
  }
}

test('1440px stable regions match approved Chromium visual baselines', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Strict visual differences are governed by Chromium only.');
  await page.setViewportSize({ width: 1440, height: 900 });
  await mockShellApi(page);

  await openStablePage(page, 'home');
  await expect(page.locator('.github-like-header')).toHaveScreenshot('header.png', snapshotOptions);
  await expect(page.locator('.ant-statistic, .ant-card').first()).toHaveScreenshot('statistic-card.png', snapshotOptions);

  await openStablePage(page, 'personArchive');
  const queryBar = page.locator('.archive-search-form, .ant-form').first();
  await expect(queryBar).toBeVisible();
  await expect(queryBar).toHaveScreenshot('query-bar.png', snapshotOptions);

  const formRegion = page.locator('.archive-search-form .ant-form-item, .ant-form .ant-form-item').first();
  await expect(formRegion).toBeVisible();
  await expect(formRegion).toHaveScreenshot('form.png', snapshotOptions);

  const tableRegion = page.locator('.ant-table-wrapper, .antd-table-wrap').first();
  await expect(tableRegion).toBeVisible();
  await expect(tableRegion).toHaveScreenshot('table.png', snapshotOptions);
});
