import { expect, test, type Page } from '@playwright/test';

function ok(data: unknown) {
  return { status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) };
}

async function mockApi(page: Page) {
  await page.addInitScript(() => localStorage.setItem('genealogy.workspace.clanId', '1'));
  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace('/api/v1', '');
    if (path === '/auth/me') return route.fulfill(ok({ id: 7, username: 'layout_admin', displayName: '布局管理员', status: 'active' }));
    if (path === '/clans/1/branches') return route.fulfill(ok([{ id: 2, branchName: '长沙支', status: 'active' }]));
    if (path === '/clans/1/imports') return route.fulfill(ok({ records: [], total: 0, pageNo: 1, pageSize: 10, totalPages: 0 }));
    if (path === '/tracking/objects') return route.fulfill(ok({ records: [], total: 0, pageNo: 1, pageSize: 10, totalPages: 0 }));
    if (path === '/logs/operations') return route.fulfill(ok({ records: [], total: 0, pageNo: 1, pageSize: 10, totalPages: 0 }));
    if (path === '/logs/risks') return route.fulfill(ok({ records: [], total: 0, pageNo: 1, pageSize: 10, totalPages: 0 }));
    return route.fulfill(ok({}));
  });
}

async function expectFluidWidth(page: Page, url: string, pageSelector: string, businessSelector: string) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await mockApi(page);
  await page.goto(url);
  await expect(page.locator(pageSelector)).toBeVisible();

  const compactWidth = await page.locator(pageSelector).evaluate(element => element.getBoundingClientRect().width);
  const compactBusinessWidth = await page.locator(businessSelector).evaluate(element => element.getBoundingClientRect().width);
  expect(Math.abs(compactWidth - compactBusinessWidth)).toBeLessThanOrEqual(1);

  await page.setViewportSize({ width: 1920, height: 900 });
  const wideWidth = await page.locator(pageSelector).evaluate(element => element.getBoundingClientRect().width);
  const wideBusinessWidth = await page.locator(businessSelector).evaluate(element => element.getBoundingClientRect().width);

  expect(Math.abs(wideWidth - wideBusinessWidth)).toBeLessThanOrEqual(1);
  expect(wideWidth - compactWidth).toBeGreaterThanOrEqual(470);
}

test('data import page continuously follows browser width', async ({ page }) => {
  await expectFluidWidth(page, '/?view=imports&branchId=2', '.import-center-page', '.business-page--imports');
});

test('audit tracking page continuously follows browser width', async ({ page }) => {
  await expectFluidWidth(page, '/?view=auditTrace&clanId=1', '.tracking-double-card-page', '.business-page--auditTrace');
});
