import { expect, test, type Page } from '@playwright/test';

function ok(data: unknown) {
  return { status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) };
}

async function mockPersonDetailApi(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('genealogy.workspace.clanId', '4');
  });

  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace('/api/v1', '');

    if (path === '/auth/me') {
      return route.fulfill(ok({ id: 7, username: 'person_admin', displayName: '人物管理员', status: 'active' }));
    }
    if (path === '/persons/186') {
      return route.fulfill(ok({
        id: 186,
        clanId: 4,
        fullName: '黄测试',
        genealogyName: '仲明',
        branchName: '长沙支',
        generationWord: '仲',
        generationNo: 18,
        gender: 'male',
        status: 'official',
        dataStatus: 'official',
        privacyLevel: 'clan',
        isLiving: false,
        hasDescendant: true,
        updatedAt: '2026-07-24T10:00:00+08:00'
      }));
    }
    if (path === '/persons/186/events') return route.fulfill(ok([]));
    if (path === '/persons/186/relationships') return route.fulfill(ok([]));
    if (path === '/source-bindings/target/person/186') return route.fulfill(ok([]));
    if (path === '/tracking/objects/person/186/trace') {
      return route.fulfill(ok({ timeline: [], revisions: [], logs: [] }));
    }
    return route.fulfill(ok({}));
  });
}

async function measuredWidths(page: Page) {
  const pageRoot = page.locator('.person-detail-page');
  const businessRoot = page.locator('.business-page--personArchive');
  await expect(pageRoot).toBeVisible();
  const [detailWidth, businessWidth] = await Promise.all([
    pageRoot.evaluate(element => element.getBoundingClientRect().width),
    businessRoot.evaluate(element => element.getBoundingClientRect().width)
  ]);
  return { detailWidth, businessWidth };
}

test('person detail direct route expands with browser width', async ({ page }) => {
  await mockPersonDetailApi(page);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/persons/186?clanId=4&dataStatus=official&view=personArchive');
  const narrow = await measuredWidths(page);
  expect(Math.abs(narrow.detailWidth - narrow.businessWidth)).toBeLessThanOrEqual(1);

  await page.setViewportSize({ width: 1920, height: 900 });
  const wide = await measuredWidths(page);
  expect(Math.abs(wide.detailWidth - wide.businessWidth)).toBeLessThanOrEqual(1);
  expect(wide.detailWidth - narrow.detailWidth).toBeGreaterThanOrEqual(470);
  expect(wide.detailWidth).toBeGreaterThan(1500);
});
