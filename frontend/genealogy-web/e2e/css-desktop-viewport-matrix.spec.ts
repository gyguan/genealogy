import { expect, test, type Locator, type Page } from '@playwright/test';

function ok(data: unknown) {
  return { status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) };
}

const representativePages = [
  { key: 'home', label: '族谱首页', kind: 'dashboard', url: '/?view=home' },
  { key: 'mvp1Wizard', label: '建谱向导', kind: 'complex-form', url: '/?view=mvp1Wizard' },
  { key: 'personArchive', label: '人物档案', kind: 'table', url: '/?view=personArchive' },
  { key: 'editingWorkspace', label: '修谱工作台', kind: 'master-detail', url: '/?view=editingWorkspace' },
  { key: 'treeProduct', label: '世系图谱', kind: 'tree-drawer', url: '/?view=treeProduct' },
  { key: 'sourceLibrary', label: '来源资料库', kind: 'card-list', url: '/?view=sourceLibrary' },
  { key: 'culture', label: '宗族文化', kind: 'tabs', url: '/?view=culture' },
  { key: 'imports', label: '数据导入', kind: 'upload-progress', url: '/?view=imports' },
  { key: 'reviewCenter', label: '审核中心', kind: 'review-table', url: '/?view=reviewCenter' },
  { key: 'memberManage', label: '成员与权限', kind: 'permission', url: '/?view=memberManage' },
  { key: 'auditTrace', label: '审计追踪', kind: 'audit-table', url: '/?view=auditTrace' }
] as const;

const formalSpecialPages = [
  { key: 'personDetail', kind: 'detail', url: '/persons/1', shell: true },
  { key: 'personEdit', kind: 'edit-form', url: '/persons/1/edit', shell: true },
  { key: 'auth', kind: 'authentication', url: '/', shell: false }
] as const;

async function mockShellApi(page: Page, authenticated = true) {
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    if (path === '/auth/me') {
      if (!authenticated) return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'unauthorized' }) });
      return route.fulfill(ok({ id: 7, username: 'css_guard', displayName: '样式治理验证', status: 'active' }));
    }
    if (path === '/clans') return route.fulfill(ok({ records: [{ id: 1, clanName: '黄氏宗族', surname: '黄' }], total: 1, pageNo: 1, pageSize: 20, totalPages: 1 }));
    if (path === '/clans/1/branches') return route.fulfill(ok([{ id: 2, branchName: '长沙支', branchPath: '黄氏宗族/长沙支' }]));
    if (path === '/persons/1') return route.fulfill(ok({ id: 1, personName: '黄守正', name: '黄守正', gender: 'male', status: 'official', clanId: 1, branchId: 2, allowedActions: ['view', 'edit'] }));
    if (/statistics|dashboard|summary/.test(path)) return route.fulfill(ok({ totalClans: 1, totalPersons: 18, pendingReviews: 2, totalSources: 6 }));
    if (/persons/.test(path)) return route.fulfill(ok({ records: [], items: [], total: 0, pageNo: 1, pageSize: 20, totalPages: 0 }));
    if (/reviews|tasks|logs|imports|sources|culture-items|relationships|members|roles|permissions/.test(path)) {
      return route.fulfill(ok({ records: [], items: [], content: [], total: 0, pageNo: 1, pageSize: 20, totalPages: 0 }));
    }
    return route.fulfill(ok({}));
  });
}

async function expectInsideViewport(locator: Locator, width: number) {
  if (!(await locator.count())) return;
  const box = await locator.first().boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;
  expect(box.x).toBeGreaterThanOrEqual(-1);
  expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
}

async function expectNoDocumentOverflow(page: Page) {
  const layout = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    bodyScrollWidth: document.body.scrollWidth,
    documentScrollWidth: document.documentElement.scrollWidth
  }));
  expect(layout.bodyScrollWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
  expect(layout.documentScrollWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
}

async function verifyStructure(page: Page, width: number) {
  await expectNoDocumentOverflow(page);
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

  for (const selector of ['.ant-form', '.ant-table-wrapper', '.ant-card', '.ant-upload-wrapper', '.ant-drawer-content-wrapper', '.ant-modal-content']) {
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
      await page.goto(pageCase.url);
      await expect(page.getByText(pageCase.label, { exact: true }).first()).toBeVisible();
      await verifyStructure(page, width);
      await page.screenshot({ path: testInfo.outputPath(`${pageCase.key}-${width}-full.png`), fullPage: true });
    });
  }

  for (const pageCase of formalSpecialPages) {
    test(`${width}px ${pageCase.kind} formal page ${pageCase.key} has no document overflow`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await mockShellApi(page, pageCase.key !== 'auth');
      await page.goto(pageCase.url);
      if (pageCase.shell) await verifyStructure(page, width);
      else {
        await expect(page.locator('.commercial-auth-shell')).toBeVisible();
        await expectNoDocumentOverflow(page);
      }
      await page.screenshot({ path: testInfo.outputPath(`${pageCase.key}-${width}-full.png`), fullPage: true });
    });
  }
}

test('1440px stable regions produce reviewable local screenshot evidence', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await mockShellApi(page);

  const cases = [
    { key: 'home', region: '.ant-statistic, .ant-card', name: 'statistic-card' },
    { key: 'personArchive', region: '.ant-form, .archive-search-form', name: 'query-bar' },
    { key: 'mvp1Wizard', region: '.ant-form, .relationship-step-form-grid', name: 'form' },
    { key: 'personArchive', region: '.ant-table-wrapper, .antd-table-wrap', name: 'table' }
  ];

  await page.goto('/?view=home');
  await expect(page.locator('.github-like-header')).toBeVisible();
  await page.locator('.github-like-header').screenshot({ path: testInfo.outputPath('local-header.png') });

  for (const item of cases) {
    await page.goto(`/?view=${item.key}`);
    const region = page.locator(item.region).first();
    await expect(region).toBeVisible();
    await region.screenshot({ path: testInfo.outputPath(`local-${item.name}.png`) });
  }
});
