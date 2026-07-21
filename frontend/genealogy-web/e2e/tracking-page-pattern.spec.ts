import { expect, test, type Locator, type Page } from '@playwright/test';

function ok(data: unknown) {
  return { status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) };
}

function compactText(value: string) {
  return value.replace(/\s+/g, '');
}

async function buttonTexts(locator: Locator) {
  return (await locator.allTextContents()).map(compactText);
}

async function mockTrackingApi(page: Page) {
  await page.addInitScript(() => localStorage.setItem('genealogy.workspace.clanId', '1'));
  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace('/api/v1', '');
    if (path === '/auth/me') return route.fulfill(ok({ id: 7, username: 'audit_admin', displayName: '审计管理员', status: 'active' }));
    if (path === '/tracking/objects') return route.fulfill(ok({
      records: [{ objectType: 'person', objectId: 11, displayName: '张三', secondaryLabel: '谱名：仲明', branchName: '长沙支', summary: '人物资料已通过审核', status: 'official', changedAt: '2026-07-20T10:30:00+08:00' }],
      total: 1, pageNo: 1, pageSize: 10, totalPages: 1
    }));
    if (path === '/logs/operations') return route.fulfill(ok({
      records: [{ id: 21, actorId: 7, actorDisplayName: '审计管理员', actionType: 'person_update', targetType: 'person', targetId: 11, targetDisplayName: '张三', targetBranchName: '长沙支', resultStatus: 'success', summary: '更新人物资料', createdAt: '2026-07-20T10:32:00+08:00', detail: '字段变更' }],
      total: 1, pageNo: 1, pageSize: 10, totalPages: 1
    }));
    if (path === '/logs/risks') return route.fulfill(ok({
      records: [{ id: 31, clanId: 1, actorId: 7, actorDisplayName: '审计管理员', actionType: 'bulk_export', targetType: 'person', targetId: 11, targetDisplayName: '张三', targetBranchName: '长沙支', resultStatus: 'success', riskLevel: 'high', eventType: 'bulk_export', dispositionStatus: 'open', summary: '批量导出在世人员数据', createdAt: '2026-07-20T10:35:00+08:00' }],
      total: 1, pageNo: 1, pageSize: 10, totalPages: 1
    }));
    return route.fulfill(ok({}));
  });
}

async function expectDefaultFourFields(page: Page, labels: string[]) {
  const fields = page.locator('.tracking-query-form .tracking-query-grid > .ant-form-item');
  await expect(fields).toHaveCount(4);
  expect(await fields.locator('.ant-form-item-label label').allTextContents()).toEqual(labels);
}

test('audit tracking uses two cards and consistent expandable filters', async ({ page }) => {
  await mockTrackingApi(page);
  await page.goto('/?view=auditTrace&clanId=1');

  await expect(page.locator('.tracking-query-card')).toHaveCount(1);
  await expect(page.locator('.tracking-result-card')).toHaveCount(1);
  await expect(page.locator('.tabbed-module-intro')).toHaveCount(0);
  await expect(page.locator('.tabbed-module-tabs-card')).toHaveCount(0);
  await expect(page.locator('.tracking-query-card .ant-card')).toHaveCount(0);
  await expect(page.locator('.tracking-query-card .ant-divider')).toHaveCount(0);
  await expect(page.locator('.tracking-query-card > .ant-card-head').getByText('审计追踪', { exact: true })).toBeVisible();
  await expect(page.locator('.tracking-result-card > .ant-card-head').getByText('查询结果', { exact: true })).toBeVisible();

  const resultTitle = page.locator('.tracking-result-title');
  expect(compactText(await resultTitle.innerText())).toBe('查询结果共1条');
  expect(await resultTitle.evaluate(element => getComputedStyle(element).display)).toBe('flex');
  expect(await resultTitle.locator('h4').evaluate(element => getComputedStyle(element).fontSize)).toBe('16px');

  await expectDefaultFourFields(page, ['对象类型', '业务关键词', '业务状态', '最近变更时间']);
  const actionButtons = page.locator('.tracking-query-actions button');
  expect(await buttonTexts(actionButtons)).toEqual(['更多筛选', '重置', '查询']);

  const grid = page.locator('.tracking-query-grid');
  const beforeGap = await grid.evaluate(element => getComputedStyle(element).rowGap);
  await page.getByRole('button', { name: '更多筛选' }).click();
  await expect(page.getByRole('button', { name: '收起' })).toBeVisible();
  await expect(page.locator('.tracking-query-grid > .ant-form-item')).toHaveCount(5);
  expect(await grid.evaluate(element => getComputedStyle(element).rowGap)).toBe(beforeGap);
  expect(await buttonTexts(page.locator('.tracking-query-actions button'))).toEqual(['收起', '重置', '查询']);
  await expect(page.locator('.tracking-query-card .ant-divider')).toHaveCount(0);

  await page.getByLabel('对象类型').click();
  await expect(page.getByRole('button', { name: '全选' })).toBeVisible();
  await expect(page.getByRole('button', { name: '清空' })).toBeVisible();
  await page.keyboard.press('Escape');

  await page.getByRole('tab', { name: '操作日志' }).click();
  await expectDefaultFourFields(page, ['时间范围', '操作者', '动作分类', '对象类型']);
  await expect(page.getByText('更新人物资料')).toBeVisible();
  await page.getByRole('button', { name: '更多筛选' }).click();
  await expect(page.locator('.tracking-query-grid > .ant-form-item')).toHaveCount(6);
  expect(await buttonTexts(page.locator('.tracking-query-actions button'))).toEqual(['收起', '重置', '查询']);

  await page.getByRole('tab', { name: '风险事件' }).click();
  await expectDefaultFourFields(page, ['时间范围', '风险等级', '事件类型', '处置状态']);
  await expect(page.getByText('批量导出在世人员数据')).toBeVisible();
});

test('390px viewport keeps single-column filters and action order', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockTrackingApi(page);
  await page.goto('/?view=auditTrace&clanId=1');

  const gridColumns = await page.locator('.tracking-query-grid').evaluate(element => getComputedStyle(element).gridTemplateColumns);
  expect(gridColumns.split(' ').length).toBe(1);
  expect(await buttonTexts(page.locator('.tracking-query-actions button'))).toEqual(['更多筛选', '重置', '查询']);
  await page.getByRole('button', { name: '更多筛选' }).click();
  expect(await buttonTexts(page.locator('.tracking-query-actions button'))).toEqual(['收起', '重置', '查询']);
  expect(await page.locator('.audit-trace-page').evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBeTruthy();
});
