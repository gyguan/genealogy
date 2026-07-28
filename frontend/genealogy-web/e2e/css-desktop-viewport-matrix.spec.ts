import { expect, test, type Page } from '@playwright/test';

function ok(data: unknown) {
  return { status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) };
}

async function mockShellApi(page: Page) {
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    if (path === '/auth/me') {
      return route.fulfill(ok({ id: 7, username: 'css_guard', displayName: '样式治理验证', status: 'active' }));
    }
    if (path === '/clans') {
      return route.fulfill(ok({ records: [{ id: 1, clanName: '黄氏宗族', surname: '黄' }], total: 1, pageNo: 1, pageSize: 20, totalPages: 1 }));
    }
    if (path === '/clans/1/branches') {
      return route.fulfill(ok([{ id: 2, branchName: '长沙支', branchPath: '黄氏宗族/长沙支' }]));
    }
    if (path === '/clans/1/culture-items') {
      return route.fulfill(ok({ items: [], page: { pageNo: 1, pageSize: 10, totalElements: 0, totalPages: 0 } }));
    }
    return route.fulfill(ok({}));
  });
}

for (const width of [1920, 1440, 1366, 1280]) {
  test(`${width}px desktop shell has no horizontal overflow or action overlap`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await mockShellApi(page);
    await page.goto('/?view=culture&tab=items');

    await expect(page.getByText('宗族文化', { exact: true }).first()).toBeVisible();
    await expect(page.locator('.culture-search-card')).toBeVisible();

    const layout = await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      bodyScrollWidth: document.body.scrollWidth,
      documentScrollWidth: document.documentElement.scrollWidth
    }));
    expect(layout.bodyScrollWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
    expect(layout.documentScrollWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);

    const userTrigger = page.locator('.github-user-trigger');
    await expect(userTrigger).toBeVisible();
    await userTrigger.focus();
    await expect(userTrigger).toBeFocused();
    const focusStyle = await userTrigger.evaluate(element => {
      const style = window.getComputedStyle(element);
      return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
    });
    expect(focusStyle.outlineStyle).not.toBe('none');
    expect(Number.parseFloat(focusStyle.outlineWidth)).toBeGreaterThanOrEqual(2);

    const searchCard = page.locator('.culture-search-card');
    const cardBox = await searchCard.boundingBox();
    expect(cardBox).not.toBeNull();
    if (cardBox) {
      expect(cardBox.x).toBeGreaterThanOrEqual(0);
      expect(cardBox.x + cardBox.width).toBeLessThanOrEqual(width + 1);
    }

    const queryButton = searchCard.getByRole('button', { name: /查\s*询/ });
    const resetButton = searchCard.getByRole('button', { name: /重\s*置/ });
    await expect(queryButton).toBeVisible();
    await expect(resetButton).toBeVisible();
    const [queryBox, resetBox] = await Promise.all([queryButton.boundingBox(), resetButton.boundingBox()]);
    expect(queryBox).not.toBeNull();
    expect(resetBox).not.toBeNull();
    if (queryBox && resetBox) {
      expect(resetBox.x + resetBox.width).toBeLessThanOrEqual(queryBox.x + 1);
      expect(queryBox.x + queryBox.width).toBeLessThanOrEqual(width + 1);
    }

    await page.screenshot({ path: testInfo.outputPath(`culture-${width}.png`), fullPage: true });
  });
}
