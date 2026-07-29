import { expect, test, type Locator, type Page } from '@playwright/test';

function ok(data: unknown) {
  return { status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) };
}

export const responsiveFormalPages = [
  { key: 'home', label: '族谱首页', url: '/?view=home', shell: true },
  { key: 'mvp1Wizard', label: '建谱向导', url: '/?view=mvp1Wizard', shell: true },
  { key: 'personArchive', label: '人物档案', url: '/?view=personArchive', shell: true },
  { key: 'personDetail', label: '人物详情', url: '/persons/1', shell: true },
  { key: 'personEdit', label: '人物编辑', url: '/persons/1/edit', shell: true },
  { key: 'treeProduct', label: '世系图谱', url: '/?view=treeProduct', shell: true },
  { key: 'sourceLibrary', label: '来源资料库', url: '/?view=sourceLibrary', shell: true },
  { key: 'culture', label: '宗族文化', url: '/?view=culture', shell: true },
  { key: 'imports', label: '数据导入', url: '/?view=imports', shell: true },
  { key: 'editingWorkspace', label: '修谱工作台', url: '/?view=editingWorkspace', shell: true },
  { key: 'reviewCenter', label: '审核中心', url: '/?view=reviewCenter', shell: true },
  { key: 'memberManage', label: '成员与权限', url: '/?view=memberManage', shell: true },
  { key: 'auditTrace', label: '审计追踪', url: '/?view=auditTrace', shell: true },
  { key: 'auth', label: '登录认证', url: '/', shell: false }
] as const;

export const responsiveViewports = [
  { key: 'mobile', width: 390, height: 844 },
  { key: 'tablet', width: 768, height: 1024 },
  { key: 'landscape-tablet', width: 1024, height: 768 }
] as const;

async function mockShellApi(page: Page, authenticated = true) {
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    if (path === '/auth/me') {
      if (!authenticated) return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'unauthorized' }) });
      return route.fulfill(ok({ id: 7, username: 'responsive_guard', displayName: '响应式验证', status: 'active' }));
    }
    if (path === '/clans') return route.fulfill(ok({ records: [{ id: 1, clanName: '黄氏宗族', surname: '黄' }], total: 1, pageNo: 1, pageSize: 20, totalPages: 1 }));
    if (path === '/clans/1/branches') return route.fulfill(ok([{ id: 2, branchName: '长沙支', branchPath: '黄氏宗族/长沙支' }]));
    if (path === '/clans/1/grantable-roles') return route.fulfill(ok([]));
    if (path === '/clans/1/culture-items') return route.fulfill(ok({ items: [], page: { pageNo: 1, pageSize: 10, totalElements: 0, totalPages: 0 } }));
    if (path === '/persons/1') return route.fulfill(ok({ id: 1, personName: '黄守正', name: '黄守正', gender: 'male', status: 'official', clanId: 1, branchId: 2, allowedActions: ['view', 'edit'] }));
    if (/statistics|dashboard|summary/.test(path)) return route.fulfill(ok({ totalClans: 1, totalPersons: 18, pendingReviews: 2, totalSources: 6 }));
    if (/persons/.test(path)) return route.fulfill(ok({ records: [], items: [], total: 0, pageNo: 1, pageSize: 20, totalPages: 0 }));
    if (/reviews|tasks|logs|imports|sources|culture-items|relationships|members|roles|permissions/.test(path)) {
      return route.fulfill(ok({ records: [], items: [], content: [], total: 0, pageNo: 1, pageSize: 20, totalPages: 0 }));
    }
    return route.fulfill(ok({}));
  });
}

async function expectNoDocumentOverflow(page: Page) {
  const result = await page.evaluate(() => ({
    viewport: window.innerWidth,
    body: document.body.scrollWidth,
    document: document.documentElement.scrollWidth
  }));
  expect(result.body).toBeLessThanOrEqual(result.viewport + 1);
  expect(result.document).toBeLessThanOrEqual(result.viewport + 1);
}

async function expectInsideViewport(locator: Locator, width: number) {
  const count = await locator.count();
  for (let index = 0; index < Math.min(count, 4); index += 1) {
    const item = locator.nth(index);
    if (!(await item.isVisible())) continue;
    const box = await item.boundingBox();
    expect(box).not.toBeNull();
    if (!box) continue;
    expect(box.x).toBeGreaterThanOrEqual(-1);
    expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
  }
}

async function expectCriticalActionsReachable(page: Page, width: number) {
  const actionPattern = /查询|保存|提交|返回|取消|登录|下一步|完成|新增|上传|邀请/;
  const actions = page.getByRole('button', { name: actionPattern });
  const count = await actions.count();
  for (let index = 0; index < Math.min(count, 6); index += 1) {
    const action = actions.nth(index);
    if (!(await action.isVisible())) continue;
    await expectInsideViewport(action, width);
  }
}

async function expectShellResponsive(page: Page, width: number) {
  await expect(page.locator('.github-like-header')).toBeVisible();
  await expect(page.locator('.antd-content')).toBeVisible();
  await expectInsideViewport(page.locator('.github-like-header, .antd-content'), width);
  if (width < 992) {
    const trigger = page.locator('.ant-layout-sider-zero-width-trigger');
    await expect(trigger).toBeVisible();
    await trigger.focus();
    await expect(trigger).toBeFocused();
  }
}

async function expectRepresentativeContainers(page: Page, width: number) {
  await expectInsideViewport(page.locator('.ant-card, .ant-form, .ant-descriptions, .ant-steps, .ant-upload-wrapper, .ant-modal-content, .ant-drawer-content-wrapper'), width);
  const tables = page.locator('.ant-table-wrapper:visible');
  const tableCount = await tables.count();
  for (let index = 0; index < tableCount; index += 1) {
    const table = tables.nth(index);
    const scrollable = await table.evaluate(element => {
      const node = element as HTMLElement;
      return node.scrollWidth <= node.clientWidth + 1 || ['auto', 'scroll'].includes(getComputedStyle(node).overflowX) || Boolean(node.querySelector('.ant-table-content'));
    });
    expect(scrollable).toBe(true);
  }
}

for (const viewport of responsiveViewports) {
  for (const pageCase of responsiveFormalPages) {
    test(`${viewport.key} ${pageCase.label} responsive release contract`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await mockShellApi(page, pageCase.key !== 'auth');
      await page.goto(pageCase.url);
      if (pageCase.shell) await expectShellResponsive(page, viewport.width);
      else await expect(page.locator('.commercial-auth-shell')).toBeVisible();
      await expectNoDocumentOverflow(page);
      await expectCriticalActionsReachable(page, viewport.width);
      await expectRepresentativeContainers(page, viewport.width);
      if (viewport.key === 'mobile') {
        await page.screenshot({ path: testInfo.outputPath(`${pageCase.key}-390x844-full.png`), fullPage: true });
      }
    });
  }
}

test('representative overlays fit the mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockShellApi(page);
  await page.goto('/?view=memberManage');
  await expectNoDocumentOverflow(page);
  const buttons = page.getByRole('button');
  const candidate = buttons.filter({ hasText: /邀请|新增/ }).first();
  if (await candidate.count()) {
    await candidate.click();
    await expectInsideViewport(page.locator('.ant-modal-content, .ant-drawer-content-wrapper'), 390);
  }
});
