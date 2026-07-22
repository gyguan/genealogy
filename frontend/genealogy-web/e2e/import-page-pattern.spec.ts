import { expect, test, type Page } from '@playwright/test';

function ok(data: unknown) {
  return { status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) };
}

const tasks = [
  {
    id: 101,
    taskNo: 'IMP-20260720-0101',
    importType: 'person',
    originalFilename: '黄氏人物资料.xlsx',
    branchName: '长沙支',
    executionMode: 'async',
    executionStatus: 'completed',
    executionStage: 'completed',
    totalCount: 1000,
    processedCount: 1000,
    successCount: 980,
    failureCount: 20,
    createdAt: '2026-07-20T10:30:00+08:00',
    updatedAt: '2026-07-20T10:35:00+08:00'
  },
  {
    id: 102,
    taskNo: 'IMP-20260720-0102',
    importType: 'relationship',
    originalFilename: '黄氏关系资料.xlsx',
    branchName: '长沙支',
    executionMode: 'async',
    executionStatus: 'running',
    executionStage: 'drafting',
    totalCount: 700,
    processedCount: 650,
    successCount: 620,
    failureCount: 30,
    createdAt: '2026-07-20T09:15:00+08:00',
    updatedAt: '2026-07-20T10:12:00+08:00'
  },
  {
    id: 103,
    taskNo: 'IMP-20260720-0103',
    importType: 'source',
    originalFilename: '家谱来源资料.csv',
    branchName: '长沙支',
    executionMode: 'async',
    executionStatus: 'failed',
    executionStage: 'failed',
    totalCount: 125,
    processedCount: 0,
    successCount: 0,
    failureCount: 125,
    errorSummary: '第 58 行来源编号不存在',
    createdAt: '2026-07-20T08:45:00+08:00',
    updatedAt: '2026-07-20T08:46:00+08:00'
  }
];

async function mockImportApi(page: Page) {
  await page.addInitScript(() => localStorage.setItem('genealogy.workspace.clanId', '1'));
  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace('/api/v1', '');
    if (path === '/auth/me') return route.fulfill(ok({ id: 7, username: 'import_admin', displayName: '导入管理员', status: 'active' }));
    if (path === '/clans/1/branches') return route.fulfill(ok([{ id: 2, branchName: '长沙支', status: 'active' }]));
    if (path === '/clans/1/imports') return route.fulfill(ok({ records: tasks, total: tasks.length, pageNo: 1, pageSize: 200, totalPages: 1 }));
    return route.fulfill(ok({}));
  });
}

async function expectDesktopResultHeaderSpacing(page: Page) {
  const resultCard = page.locator('.import-result-card');
  const header = resultCard.locator(':scope > .ant-card-head');
  const titleGroup = resultCard.locator(':scope > .ant-card-head .ant-card-head-title');
  const action = resultCard.getByRole('button', { name: '新建导入' });
  const [headerBox, titleGroupBox, actionBox] = await Promise.all([
    header.boundingBox(),
    titleGroup.boundingBox(),
    action.boundingBox()
  ]);
  expect(headerBox).not.toBeNull();
  expect(titleGroupBox).not.toBeNull();
  expect(actionBox).not.toBeNull();
  if (!headerBox || !titleGroupBox || !actionBox) return;
  expect(actionBox.y - headerBox.y).toBeGreaterThanOrEqual(12);
  const titleCenter = titleGroupBox.y + titleGroupBox.height / 2;
  const actionCenter = actionBox.y + actionBox.height / 2;
  expect(Math.abs(titleCenter - actionCenter)).toBeLessThanOrEqual(2);
}

async function expectBusinessCardNestedInsideOuterBody(page: Page) {
  const outerBody = page.locator('.import-result-card > .ant-card-body');
  const businessCard = outerBody.locator(':scope > .business-result-card[data-query-result-role="business"]');
  await expect(businessCard).toHaveCount(1);

  const [outerBodyBox, businessCardBox, outerBodyBackground] = await Promise.all([
    outerBody.boundingBox(),
    businessCard.boundingBox(),
    outerBody.evaluate(element => getComputedStyle(element).backgroundColor)
  ]);
  expect(outerBodyBox).not.toBeNull();
  expect(businessCardBox).not.toBeNull();
  expect(outerBodyBackground).toBe('rgb(255, 255, 255)');
  if (!outerBodyBox || !businessCardBox) return;

  expect(businessCardBox.x - outerBodyBox.x).toBeGreaterThanOrEqual(15);
  expect(businessCardBox.y - outerBodyBox.y).toBeGreaterThanOrEqual(15);
  expect(outerBodyBox.x + outerBodyBox.width - businessCardBox.x - businessCardBox.width).toBeGreaterThanOrEqual(15);
  expect(outerBodyBox.y + outerBodyBox.height - businessCardBox.y - businessCardBox.height).toBeGreaterThanOrEqual(15);
}

test('data import page uses query and nested result cards with new import modal', async ({ page }) => {
  await mockImportApi(page);
  await page.goto('/?view=imports&branchId=2');

  await expect(page.locator('.import-query-card')).toHaveCount(1);
  await expect(page.locator('.import-result-card')).toHaveCount(1);
  await expect(page.locator('.tabbed-module-intro')).toHaveCount(0);
  await expect(page.locator('.tabbed-module-tabs-card')).toHaveCount(0);
  await expect(page.getByText('导入任务查询', { exact: true })).toBeVisible();
  const outerResultHeader = page.locator('.import-result-card > .ant-card-head');
  const businessResultHeader = page.locator('.import-result-card > .ant-card-body > .business-result-card > .ant-card-head');
  await expect(outerResultHeader.getByText('查询结果', { exact: true })).toBeVisible();
  await expect(businessResultHeader.getByText('导入任务', { exact: true })).toBeVisible();
  await expect(businessResultHeader.getByText('共 3 个任务', { exact: true })).toBeVisible();
  await expectDesktopResultHeaderSpacing(page);
  await expectBusinessCardNestedInsideOuterBody(page);

  const labels = await page.locator('.import-query-card .ant-form-item-label label').allTextContents();
  expect(labels).toEqual(['导入对象', '导入状态', '文件名/任务编号', '任务创建时间']);

  await page.getByLabel('导入对象').click();
  const importTypePopup = page.locator('.ant-select-dropdown:visible');
  await expect(importTypePopup.getByText('全选 / 取消全选', { exact: true })).toBeVisible();
  await expect(importTypePopup.getByText('人物', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');

  const taskTable = page.locator('.import-execution-table');
  await expect(taskTable.getByText('黄氏人物资料.xlsx')).toBeVisible();
  await expect(taskTable.getByText('IMP-20260720-0101')).toBeVisible();
  await expect(taskTable.getByText('部分成功')).toBeVisible();

  await page.getByRole('button', { name: '新建导入' }).click();
  const modal = page.getByRole('dialog', { name: '新建导入' });
  await expect(modal).toBeVisible();
  await expect(modal.getByText('人物', { exact: true })).toBeVisible();
  await expect(modal.getByRole('button', { name: '下载 XLSX 模板' })).toBeVisible();
  await expect(modal.getByRole('button', { name: '下载 CSV 模板' })).toBeVisible();
  await expect(modal.getByRole('button', { name: '上传文件并预检' })).toBeVisible();

  await modal.getByRole('button', { name: '上传文件并预检' }).click();
  await expect(page.getByText('新建人物导入', { exact: true })).toBeVisible();
  await expect(page.getByLabel('目标支派')).toBeVisible();
  await expect(page.getByText('拖拽文件到此处，或点击选择文件')).toBeVisible();
});

test('390px viewport uses task cards without horizontal scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockImportApi(page);
  await page.goto('/?view=imports&branchId=2');

  const headerWrapper = page.locator('.import-result-card > .ant-card-head > .ant-card-head-wrapper');
  const headerPadding = await headerWrapper.evaluate(element => {
    const style = getComputedStyle(element);
    return { top: style.paddingTop, bottom: style.paddingBottom };
  });
  expect(headerPadding).toEqual({ top: '16px', bottom: '16px' });
  await expectBusinessCardNestedInsideOuterBody(page);

  await expect(page.locator('.import-execution-table')).toBeHidden();
  const taskCard = page.locator('.import-execution-card-list > .ant-card').first();
  await expect(taskCard).toBeVisible();
  expect(await taskCard.evaluate(element => element.getBoundingClientRect().width)).toBeLessThanOrEqual(390);
  await expect(page.getByRole('button', { name: '新建导入' })).toBeVisible();
  expect(await page.locator('.import-center-page').evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBeTruthy();
});
