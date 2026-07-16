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

test('culture shell exposes one primary action and mounts only the active domain', async ({ page }) => {
  const requested: string[] = [];
  await mockPatternApi(page, requested);
  await page.goto('/?view=culture&tab=items');

  await expect(page.getByRole('tab', { name: '文化资料' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tab', { name: '迁徙脉络' })).toBeVisible();
  await expect(page.getByRole('tab', { name: '文化场所' })).toBeVisible();
  await expect(page.getByRole('button', { name: '新增资料' })).toHaveCount(1);
  await expect(page.getByText('敦本堂堂号源流').first()).toBeVisible();
  expect(requested.some(path => path.includes('migration-events'))).toBeFalsy();
  expect(requested.some(path => path.includes('culture-sites'))).toBeFalsy();

  await page.getByRole('tab', { name: '迁徙脉络' }).click();
  await expect(page.getByRole('button', { name: '新增迁徙事件' })).toHaveCount(1);
  await expect(page.getByText('江西吉安 → 湖南长沙').first()).toBeVisible();
  expect(requested.some(path => path.includes('culture-sites'))).toBeFalsy();

  await page.getByRole('tab', { name: '文化场所' }).click();
  await expect(page.getByRole('button', { name: '新增场所' })).toHaveCount(1);
  await expect(page.getByText('敦本堂宗祠').first()).toBeVisible();
  await expect(page).toHaveURL(/tab=sites/);
});

test('390px viewport uses responsive record cards without horizontal table scrolling', async ({ page }) => {
  const requested: string[] = [];
  await page.setViewportSize({ width: 390, height: 844 });
  await mockPatternApi(page, requested);
  await page.goto('/?view=culture&tab=items');

  await expectMobileRecordView(page, 'culture-tab-items');
  const itemAction = page.getByRole('button', { name: '新增资料' });
  expect((await itemAction.boundingBox())?.height).toBeGreaterThanOrEqual(44);

  await page.getByRole('tab', { name: '迁徙脉络' }).click();
  await expectMobileRecordView(page, 'culture-tab-migrations');
  const migrationAction = page.getByRole('button', { name: '新增迁徙事件' });
  expect((await migrationAction.boundingBox())?.height).toBeGreaterThanOrEqual(44);

  await page.getByRole('tab', { name: '文化场所' }).click();
  await expectMobileRecordView(page, 'culture-tab-sites');
  const siteAction = page.getByRole('button', { name: '新增场所' });
  expect((await siteAction.boundingBox())?.height).toBeGreaterThanOrEqual(44);
});
