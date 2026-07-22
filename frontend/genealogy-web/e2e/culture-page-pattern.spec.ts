import { expect, test, type Page } from '@playwright/test';

function ok(data: unknown) {
  return { status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) };
}

const item = {
  id: 11,
  scope: { clanId: 1, clanName: '黄氏宗族', branchId: 2, branchName: '长沙支' },
  category: 'hall_name',
  title: '敦本堂堂号源流',
  summary: '记录敦本堂堂号的历史来源。',
  confidenceLevel: 'high',
  privacyLevel: 'clan_only',
  sensitiveLevel: 'normal',
  dataStatus: 'official',
  featuredOnHome: true,
  sourceCount: 1,
  attachmentCount: 1,
  reviewCount: 1,
  allowedActions: ['view', 'request_update'],
  updatedAt: '2026-07-14T10:00:00'
};

const migration = {
  id: 41,
  scope: { clanId: 1, clanName: '黄氏宗族', branchId: 2, branchName: '长沙支' },
  sequenceNo: 2,
  fromLocation: '江西吉安',
  toLocation: '湖南长沙',
  migrationTimeText: '明洪武年间',
  founderPersonName: '黄公讳德昌',
  confidenceLevel: 'high',
  dataStatus: 'official',
  sourceCount: 1,
  allowedActions: ['view', 'request_update'],
  updatedAt: '2026-07-15T08:00:00'
};

const site = {
  id: 61,
  scope: { clanId: 1, clanName: '黄氏宗族', branchId: 2, branchName: '长沙支' },
  siteType: 'ancestral_hall',
  name: '敦本堂宗祠',
  addressText: '湖南省长沙市某村',
  foundedPeriod: '清乾隆年间',
  confidenceLevel: 'high',
  dataStatus: 'official',
  sourceCount: 1,
  attachmentCount: 1,
  allowedActions: ['view', 'request_update'],
  updatedAt: '2026-07-15T08:00:00'
};

async function mockPatternApi(page: Page, requested: string[]) {
  await page.route('**/api/v1/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace('/api/v1', '');
    requested.push(path);
    if (path === '/auth/me') return route.fulfill(ok({ id: 7, username: 'culture_admin', displayName: '文化管理员', status: 'active' }));
    if (path === '/clans') return route.fulfill(ok({ records: [{ id: 1, clanName: '黄氏宗族', surname: '黄' }], total: 1, pageNo: 1, pageSize: 20, totalPages: 1 }));
    if (path === '/clans/1/branches') return route.fulfill(ok([{ id: 2, branchName: '长沙支', branchPath: '黄氏宗族/长沙支' }]));
    if (path === '/clans/1/culture-items') return route.fulfill(ok({ items: [item], page: { pageNo: 1, pageSize: 10, totalElements: 1, totalPages: 1 } }));
    if (path === '/clans/1/migration-events') return route.fulfill(ok({ items: [migration], page: { pageNo: 1, pageSize: 10, totalElements: 1, totalPages: 1 } }));
    if (path === '/clans/1/culture-sites') return route.fulfill(ok({ items: [site], page: { pageNo: 1, pageSize: 10, totalElements: 1, totalPages: 1 } }));
    return route.fulfill(ok({}));
  });
}

async function expectMobileRecordView(page: Page, tabClass: string) {
  const row = page.locator(`.${tabClass} .ant-table-tbody > tr`).first();
  await expect(row).toBeVisible();
  await expect.poll(() => row.evaluate(element => getComputedStyle(element).display)).toBe('block');
  const width = await row.evaluate(element => element.getBoundingClientRect().width);
  expect(width).toBeLessThanOrEqual(390);
  const tableContent = page.locator(`.${tabClass} .ant-table-content`).first();
  expect(await tableContent.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBeTruthy();
}

async function expectMobilePrimaryAction(page: Page, name: string) {
  const action = page.getByRole('button', { name });
  const box = await action.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(40);
  expect(box?.width).toBeGreaterThanOrEqual(88);
}

async function expectDoubleCardShell(page: Page, businessTitle: string, total: string) {
  await expect(page.locator('.tabbed-module-intro')).toHaveCount(0);
  await expect(page.locator('.tabbed-module-tabs-card')).toHaveCount(0);
  await expect(page.locator('.culture-search-card')).toHaveCount(1);
  const resultCard = page.locator('.culture-result-card');
  await expect(resultCard).toHaveCount(1);
  const outerHeader = resultCard.locator(':scope > .ant-card-head');
  await expect(outerHeader.getByText('查询结果', { exact: true })).toBeVisible();
  await expect(outerHeader.getByText(total, { exact: true })).toBeVisible();
  const businessHeader = resultCard.locator('.business-result-card > .ant-card-head');
  await expect(businessHeader.getByText(businessTitle, { exact: true })).toBeVisible();
  await expect(businessHeader.getByText(total, { exact: true })).toHaveCount(0);
  await expect(page.locator('.culture-search-card .ant-card-head-title')).toHaveText('宗族文化');
  const formBorder = await page.locator('.culture-search-card form').evaluate(element => getComputedStyle(element).borderTopWidth);
  expect(formBorder).toBe('0px');
}

async function expectMoreFiltersBeforeReset(page: Page) {
  const searchCard = page.locator('.culture-search-card');
  const moreFilters = searchCard.locator('.culture-more-filters .ant-collapse-header');
  const reset = searchCard.getByRole('button', { name: /重\s*置/ });
  const query = searchCard.getByRole('button', { name: /查\s*询/ });
  await expect(moreFilters).toBeVisible();
  await expect(moreFilters).toHaveAttribute('aria-expanded', 'false');
  const [moreBox, resetBox, queryBox] = await Promise.all([
    moreFilters.boundingBox(),
    reset.boundingBox(),
    query.boundingBox()
  ]);
  expect(moreBox).not.toBeNull();
  expect(resetBox).not.toBeNull();
  expect(queryBox).not.toBeNull();
  if (!moreBox || !resetBox || !queryBox) return;
  const moreCenterY = moreBox.y + moreBox.height / 2;
  const resetCenterY = resetBox.y + resetBox.height / 2;
  expect(Math.abs(moreCenterY - resetCenterY)).toBeLessThanOrEqual(4);
  expect(moreBox.x + moreBox.width).toBeLessThanOrEqual(resetBox.x + 1);
  expect(resetBox.x + resetBox.width).toBeLessThanOrEqual(queryBox.x + 1);
}

test('culture shell uses double cards and mounts only the active domain', async ({ page }) => {
  const requested: string[] = [];
  await mockPatternApi(page, requested);
  await page.goto('/?view=culture&tab=items');

  await expectDoubleCardShell(page, '文化资料', '（共 1 条）');
  const searchCard = page.locator('.culture-search-card');
  await expect(searchCard.getByRole('tab', { name: '文化资料' })).toHaveAttribute('aria-selected', 'true');
  await expect(searchCard.getByRole('tab', { name: '迁徙脉络' })).toBeVisible();
  await expect(searchCard.getByRole('tab', { name: '文化场所' })).toBeVisible();
  await expect(page.getByRole('button', { name: '新增文化资料' })).toHaveCount(1);
  await expect(page.getByText('敦本堂堂号源流').first()).toBeVisible();
  expect(requested.some(path => path.includes('migration-events'))).toBeFalsy();
  expect(requested.some(path => path.includes('culture-sites'))).toBeFalsy();

  const defaultLabels = await searchCard.locator('form > .ant-row').first().locator('.ant-form-item-label label').allTextContents();
  expect(defaultLabels).toEqual(['宗族', '分类', '支派', '关键词']);
  await expectMoreFiltersBeforeReset(page);
  await searchCard.getByText('更多筛选', { exact: true }).click();
  await expect(searchCard.locator('.culture-more-filters .ant-collapse-header')).toHaveAttribute('aria-expanded', 'true');
  await expect(searchCard.getByLabel('状态')).toBeVisible();
  await expect(searchCard.getByLabel('可见范围')).toBeVisible();
  await expect(searchCard.getByLabel('已有来源')).toBeVisible();
  await expect(searchCard.getByLabel('首页精选')).toBeVisible();

  await searchCard.getByLabel('分类').click();
  const categoryPopup = page.locator('.ant-select-dropdown:visible');
  await expect(categoryPopup.getByText('全选 / 取消全选', { exact: true })).toBeVisible();
  await expect(categoryPopup.getByText('堂号', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');

  await searchCard.getByRole('tab', { name: '迁徙脉络' }).click();
  await expectDoubleCardShell(page, '迁徙脉络', '（共 1 条）');
  await expectMoreFiltersBeforeReset(page);
  await expect(page.getByRole('button', { name: '新增迁徙事件' })).toHaveCount(1);
  await expect(page.getByText('江西吉安 → 湖南长沙').first()).toBeVisible();
  expect(requested.some(path => path.includes('culture-sites'))).toBeFalsy();

  await page.getByRole('tab', { name: '文化场所' }).click();
  await expectDoubleCardShell(page, '文化场所', '（共 1 条）');
  await expectMoreFiltersBeforeReset(page);
  await expect(page.getByRole('button', { name: '新增文化场所' })).toHaveCount(1);
  await expect(page.getByText('敦本堂宗祠').first()).toBeVisible();
  await expect(page).toHaveURL(/tab=sites/);
});

test('390px viewport uses responsive record cards without horizontal table scrolling', async ({ page }) => {
  const requested: string[] = [];
  await page.setViewportSize({ width: 390, height: 844 });
  await mockPatternApi(page, requested);
  await page.goto('/?view=culture&tab=items');

  await expectDoubleCardShell(page, '文化资料', '（共 1 条）');
  await expectMoreFiltersBeforeReset(page);
  await expectMobileRecordView(page, 'culture-tab-items');
  await expectMobilePrimaryAction(page, '新增文化资料');

  await page.getByRole('tab', { name: '迁徙脉络' }).click();
  await expectMoreFiltersBeforeReset(page);
  await expectMobileRecordView(page, 'culture-tab-migrations');
  await expectMobilePrimaryAction(page, '新增迁徙事件');

  await page.getByRole('tab', { name: '文化场所' }).click();
  await expectMoreFiltersBeforeReset(page);
  await expectMobileRecordView(page, 'culture-tab-sites');
  await expectMobilePrimaryAction(page, '新增文化场所');
});
