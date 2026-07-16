import { expect, test, type Page, type Route } from '@playwright/test';

function ok(data: unknown) {
  return { status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) };
}

function fail(status = 500, message = '接口暂时不可用') {
  return { status, contentType: 'application/json', body: JSON.stringify({ success: false, message }) };
}

type MockOptions = {
  emptyClans?: boolean;
  clansStatus?: number;
  dashboardStatus?: number;
  cultureStatus?: number;
  sourceStatus?: number;
};

function dashboardFor(clanId: number) {
  const isFirstClan = clanId === 1;
  return {
    clanId,
    asOf: '2026-07-16T10:00:00',
    peopleTotal: isFirstClan ? 201 : 2,
    branchCount: isFirstClan ? 8 : 2,
    sourceCount: isFirstClan ? 12 : 1,
    pendingReviewCount: isFirstClan ? 4 : 0,
    genderDistribution: isFirstClan
      ? [{ key: 'male', label: '男', count: 100 }, { key: 'female', label: '女', count: 100 }, { key: 'unknown', label: '未知', count: 1 }]
      : [{ key: 'male', label: '男', count: 1 }, { key: 'female', label: '女', count: 1 }, { key: 'unknown', label: '未知', count: 0 }],
    livingDistribution: isFirstClan
      ? [{ key: 'living', label: '在世', count: 180 }, { key: 'deceased', label: '已故', count: 20 }, { key: 'unknown', label: '未维护', count: 1 }]
      : [{ key: 'living', label: '在世', count: 2 }, { key: 'deceased', label: '已故', count: 0 }, { key: 'unknown', label: '未维护', count: 0 }],
    generationDistribution: isFirstClan
      ? [{ key: '1', label: '1世', count: 100 }, { key: '2', label: '2世', count: 100 }, { key: 'unmaintained', label: '未维护', count: 1 }]
      : [{ key: '1', label: '1世', count: 2 }],
    completeness: {
      generationMaintainedCount: isFirstClan ? 200 : 2,
      generationMaintainedRate: isFirstClan ? 99.5 : 100,
      vitalDatesMaintainedCount: isFirstClan ? 121 : 1,
      vitalDatesMaintainedRate: isFirstClan ? 60.2 : 50,
      biographyMaintainedCount: isFirstClan ? 91 : 0,
      biographyMaintainedRate: isFirstClan ? 45.27 : 0
    },
    branchCoverage: {
      coveredBranchCount: isFirstClan ? 7 : 2,
      totalBranchCount: isFirstClan ? 8 : 2,
      coverageRate: isFirstClan ? 87.5 : 100
    }
  };
}

async function mockHomeApi(page: Page, requestedPaths: string[], options: MockOptions = {}) {
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
      if (options.clansStatus) {
        await route.fulfill(fail(options.clansStatus, options.clansStatus === 403 ? '您暂无权限查看宗族列表' : '宗族列表加载失败'));
        return;
      }
      if (options.emptyClans) {
        await route.fulfill(ok({ records: [], total: 0, pageNo: 1, pageSize: 20, totalPages: 0 }));
        return;
      }
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
    if (path === `/clans/${clanId}/dashboard`) {
      if (options.dashboardStatus) {
        await route.fulfill(fail(options.dashboardStatus, options.dashboardStatus === 403 ? '您暂无权限查看核心指标' : '核心指标服务异常'));
        return;
      }
      await route.fulfill(ok(dashboardFor(clanId)));
      return;
    }
    if (path === `/clans/${clanId}/branches`) {
      await route.fulfill(ok(clanId === 1
        ? [{ id: 11, branchName: '长沙支', status: 'active' }]
        : [{ id: 21, branchName: '福州支', status: 'active' }, { id: 22, branchName: '泉州支', status: 'active' }]));
      return;
    }
    if (path === '/persons/search') {
      await route.fulfill(ok(clanId === 1
        ? { records: Array.from({ length: 200 }, (_item, index) => ({ id: 1000 + index, name: `黄氏第${index + 1}人`, gender: 'male', branchId: 11 })), total: 201 }
        : { records: [{ id: 201, name: '林一', gender: 'female', branchId: 21 }, { id: 202, name: '林二', gender: 'male', branchId: 22 }], total: 2 }));
      return;
    }
    if (path === `/clans/${clanId}/sources`) {
      if (options.sourceStatus) {
        await route.fulfill(fail(options.sourceStatus, '来源资料加载失败'));
        return;
      }
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
      if (options.cultureStatus) {
        await route.fulfill(fail(options.cultureStatus, options.cultureStatus === 403 ? '您暂无权限查看宗族文化摘要' : '宗族文化摘要服务异常'));
        return;
      }
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
  await expect(header.getByText('数据更新于 2026-07-16 10:00')).toBeVisible();
  await expect(page.getByRole('heading', { name: '黄氏宗族', level: 4 })).toBeVisible();
  await expect(page.getByText('黄氏宗族简介')).toBeVisible();
  await expect(page.getByText(/clanId|宗族\s*#\d+/i)).toHaveCount(0);
  await expect(page.getByText('201')).toBeVisible();
  await expect.poll(() => requestedPaths.some(path => path === '/clans/1/dashboard')).toBe(true);

  await clanSelect.click();
  await page.getByRole('option', { name: '林氏宗族' }).click();

  await expect(page.getByRole('heading', { name: '林氏宗族', level: 4 })).toBeVisible();
  await expect(page.getByText('林氏宗族简介')).toBeVisible();
  await expect(page.getByText('黄氏宗族简介')).toHaveCount(0);
  await expect.poll(() => requestedPaths.some(path => path.startsWith('/clans/2/dashboard'))).toBe(true);
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

test('home dashboard shows actionable first-use empty state for accounts without clans', async ({ page }) => {
  const requestedPaths: string[] = [];
  await mockHomeApi(page, requestedPaths, { emptyClans: true });
  await page.goto('/');

  await expect(page.getByText('当前账号尚未创建或加入可见宗族')).toBeVisible();
  await expect(page.getByText('未命名宗族')).toHaveCount(0);
  await expect(page.getByText('族人总数')).toHaveCount(0);
  await expect(page.getByText('宗族文化摘要')).toHaveCount(0);
  await expect(page.getByText('代次分布 TOP 8')).toHaveCount(0);
  await expect.poll(() => requestedPaths.some(path => path.startsWith('/clans/1/dashboard'))).toBe(false);

  await page.getByRole('button', { name: '开始建谱' }).click();
  await expect(page).toHaveURL(/view=mvp1Wizard/);
});

test('home dashboard distinguishes clan list failures from first-use empty state', async ({ page }) => {
  await mockHomeApi(page, [], { clansStatus: 500 });
  await page.goto('/');

  await expect(page.getByText('宗族列表加载失败')).toBeVisible();
  await expect(page.getByText('当前账号尚未创建或加入可见宗族')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '开始建谱' })).toHaveCount(0);
});

test('home dashboard keeps successful regions when dashboard aggregate fails', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('genealogy.workspace.clanId', '1'));
  await mockHomeApi(page, [], { dashboardStatus: 500 });
  await page.goto('/');

  await expect(page.getByText('核心指标加载失败')).toBeVisible();
  await expect(page.getByText('族人总数')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '黄氏宗族', level: 4 })).toBeVisible();
  await expect(page.getByText('宗族文化摘要')).toBeVisible();
});

test('home dashboard isolates culture and source failures without blocking core metrics', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('genealogy.workspace.clanId', '1'));
  await mockHomeApi(page, [], { cultureStatus: 500, sourceStatus: 500 });
  await page.goto('/');

  await expect(page.getByText('201')).toBeVisible();
  await expect(page.getByText('宗族文化摘要加载失败')).toBeVisible();
  await expect(page.getByText('宗族文化摘要服务异常')).toBeVisible();
  await page.getByText('来源资料').click();
  await expect(page.getByText('资料明细加载失败')).toBeVisible();
  await expect(page.getByText('共 0 条记录')).toBeVisible();
});

test('home dashboard handles forbidden clan list without exposing onboarding action', async ({ page }) => {
  await mockHomeApi(page, [], { clansStatus: 403 });
  await page.goto('/');

  await expect(page.getByText('暂无权限查看宗族列表')).toBeVisible();
  await expect(page.getByText('当前账号尚未创建或加入可见宗族')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '开始建谱' })).toHaveCount(0);
});
