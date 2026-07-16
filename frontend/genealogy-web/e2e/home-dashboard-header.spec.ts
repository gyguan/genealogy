import { expect, test, type Page, type Route } from '@playwright/test';

function ok(data: unknown) {
  return { status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) };
}

async function mockHomeApi(page: Page, requestedPaths: string[]) {
  await page.route('**/api/v1/**', async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace('/api/v1', '');
    requestedPaths.push(`${path}${url.search}`);

    if (path === '/auth/me') {
      await route.fulfill(ok({ id: 7, username: 'home_admin', displayName: '修谱管理员', status: 'active' }));
      return;
    }
    if (path === '/clans') {
      await route.fulfill(ok({
        records: [
          { id: 1, clanName: '黄氏宗族', surname: '黄', description: '黄氏宗族简介' },
          { id: 2, clanName: '林氏宗族', surname: '林', description: '林氏宗族简介' }
        ],
        total: 2,
        pageNo: 1,
        pageSize: 20,
        totalPages: 1
      }));
      return;
    }

    const clanId = path.startsWith('/clans/2/') || url.searchParams.get('clanId') === '2' ? 2 : 1;
    if (path === `/clans/${clanId}/branches`) {
      await route.fulfill(ok(clanId === 1
        ? [{ id: 11, branchName: '长沙支', status: 'active' }]
        : [{ id: 21, branchName: '福州支', status: 'active' }, { id: 22, branchName: '泉州支', status: 'active' }]));
      return;
    }
    if (path === '/persons/search') {
      await route.fulfill(ok(clanId === 1
        ? { records: [{ id: 101, name: '黄一', gender: 'male', branchId: 11 }], total: 1 }
        : { records: [{ id: 201, name: '林一', gender: 'female', branchId: 21 }, { id: 202, name: '林二', gender: 'male', branchId: 22 }], total: 2 }));
      return;
    }
    if (path === `/clans/${clanId}/sources`) {
      await route.fulfill(ok(clanId === 1 ? [{ id: 31, sourceName: '黄氏谱卷一' }] : [{ id: 41, sourceName: '林氏谱卷一' }]));
      return;
    }
    if (path === `/clans/${clanId}/review-tasks/pending`) {
      await route.fulfill(ok([]));
      return;
    }
    if (path === '/logs/operations/stats') {
      await route.fulfill(ok({ totalCount: clanId, todayCount: 0, successCount: clanId, failureCount: 0 }));
      return;
    }
    if (path === `/clans/${clanId}/culture-overview`) {
      await route.fulfill(ok({
        clanId,
        clanName: clanId === 1 ? '黄氏宗族' : '林氏宗族',
        statistics: { officialItemCount: 0, pendingReviewCount: 0, sourceCoverageRate: 0 },
        featuredItems: [],
        migrationHighlights: [],
        siteHighlights: [],
        missingHints: [],
        entries: []
      }));
      return;
    }

    await route.fulfill(ok({}));
  });
}

test('home dashboard uses a compact page header and switches clan context', async ({ page }) => {
  const requestedPaths: string[] = [];
  await page.addInitScript(() => localStorage.setItem('genealogy.workspace.clanId', '1'));
  await mockHomeApi(page, requestedPaths);
  await page.goto('/');

  await expect(page.getByRole('heading', { name: '族谱首页', exact: true })).toHaveCount(1);
  const header = page.locator('.statistics-home-page__header');
  const clanSelect = header.getByRole('combobox', { name: '当前宗族' });
  await expect(clanSelect).toBeVisible();
  await expect(page.locator('.ant-card-head').getByRole('combobox', { name: '当前宗族' })).toHaveCount(0);
  await expect(header.getByText(/数据更新于 \d{4}-\d{2}-\d{2} \d{2}:\d{2}/)).toBeVisible();
  await expect(page.getByRole('heading', { name: '黄氏宗族', level: 4 })).toBeVisible();
  await expect(page.getByText('黄氏宗族简介')).toBeVisible();
  await expect(page.getByText(/clanId|宗族\s*#\d+/i)).toHaveCount(0);

  await clanSelect.click();
  await page.getByRole('option', { name: '林氏宗族' }).click();

  await expect(page.getByRole('heading', { name: '林氏宗族', level: 4 })).toBeVisible();
  await expect(page.getByText('林氏宗族简介')).toBeVisible();
  await expect(page.getByText('黄氏宗族简介')).toHaveCount(0);
  await expect.poll(() => requestedPaths.some(path => path.startsWith('/clans/2/branches'))).toBe(true);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('genealogy.workspace.clanId'))).toBe('2');
});

test('home dashboard header keeps the clan selector touch-friendly on mobile', async ({ page }) => {
  const requestedPaths: string[] = [];
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem('genealogy.workspace.clanId', '1'));
  await mockHomeApi(page, requestedPaths);
  await page.goto('/');

  const clanSelect = page.locator('.statistics-home-page__header').getByRole('combobox', { name: '当前宗族' });
  await expect(clanSelect).toBeVisible();
  const box = await clanSelect.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  expect(box!.width).toBeGreaterThan(300);
  await expect(page.locator('.statistics-home-page__updated-at')).toBeVisible();
});
