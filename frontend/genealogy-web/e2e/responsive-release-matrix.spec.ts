import { expect, test, type Locator, type Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { FORMAL_RESPONSIVE_PAGES, RESPONSIVE_VIEWPORTS } from './responsive-release-matrix';

function ok(data: unknown) {
  return { status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) };
}

async function installResponsiveApi(page: Page, authState: { authenticated: boolean }) {
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    if (path === '/auth/me') {
      if (!authState.authenticated) return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'unauthorized' }) });
      return route.fulfill(ok({ id: 946, username: 'responsive_guard', displayName: '响应式发布验证', status: 'active' }));
    }
    if (path === '/clans') return route.fulfill(ok({ records: [{ id: 1, clanName: '黄氏宗族', surname: '黄' }], total: 1, pageNo: 1, pageSize: 20, totalPages: 1 }));
    if (path === '/clans/1/branches') return route.fulfill(ok([{ id: 2, branchName: '长沙支', branchPath: '黄氏宗族/长沙支' }]));
    if (path === '/clans/1/grantable-roles') return route.fulfill(ok([]));
    if (path === '/persons/1') return route.fulfill(ok({ id: 1, personName: '黄守正', name: '黄守正', gender: 'male', status: 'official', clanId: 1, branchId: 2, allowedActions: ['view', 'edit'] }));
    if (/statistics|dashboard|summary/.test(path)) return route.fulfill(ok({ totalClans: 1, totalPersons: 18, pendingReviews: 2, totalSources: 6 }));
    if (/persons/.test(path)) return route.fulfill(ok({ records: [], items: [], total: 0, pageNo: 1, pageSize: 20, totalPages: 0 }));
    if (/reviews|tasks|logs|imports|sources|culture-items|migration-events|culture-sites|relationships|members|roles|permissions/.test(path)) {
      return route.fulfill(ok({ records: [], items: [], content: [], total: 0, pageNo: 1, pageSize: 20, totalPages: 0, page: { pageNo: 1, pageSize: 20, totalElements: 0, totalPages: 0 } }));
    }
    return route.fulfill(ok({}));
  });
}

async function boxInsideViewport(locator: Locator, width: number, height: number) {
  if (!(await locator.count()) || !(await locator.first().isVisible())) return true;
  const box = await locator.first().boundingBox();
  if (!box) return false;
  return box.x >= -1 && box.x + box.width <= width + 1 && box.y < height && box.height > 0;
}

async function documentOverflow(page: Page) {
  return page.evaluate(() => ({
    horizontal: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - window.innerWidth,
    vertical: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) - window.innerHeight
  }));
}

async function visibleCriticalAction(page: Page, patterns: RegExp[]) {
  if (!patterns.length) return true;
  for (const pattern of patterns) {
    const button = page.getByRole('button', { name: pattern }).filter({ visible: true }).first();
    if (await button.count() && await button.isVisible()) return true;
    const link = page.getByRole('link', { name: pattern }).filter({ visible: true }).first();
    if (await link.count() && await link.isVisible()) return true;
  }
  return false;
}

for (const viewport of RESPONSIVE_VIEWPORTS) {
  test(`${viewport.key} ${viewport.width}x${viewport.height} validates all 14 formal pages`, async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    const authState = { authenticated: true };
    await installResponsiveApi(page, authState);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const results: Array<Record<string, unknown>> = [];

    for (const pageCase of FORMAL_RESPONSIVE_PAGES) {
      authState.authenticated = pageCase.authenticated;
      await page.goto(pageCase.url);
      await page.waitForLoadState('domcontentloaded');

      const shell = pageCase.shell ? page.locator('.antd-content') : page.locator('.commercial-auth-shell');
      await expect.soft(shell, `${pageCase.label}: primary shell`).toBeVisible();

      const overflow = await documentOverflow(page);
      const shellContained = await boxInsideViewport(shell, viewport.width, viewport.height);
      const actionReachable = await visibleCriticalAction(page, pageCase.criticalActions);
      const headerContained = pageCase.shell
        ? await boxInsideViewport(page.locator('.github-like-header'), viewport.width, viewport.height)
        : true;

      expect.soft(overflow.horizontal, `${pageCase.label}: document horizontal overflow`).toBeLessThanOrEqual(1);
      expect.soft(shellContained, `${pageCase.label}: shell inside viewport`).toBeTruthy();
      expect.soft(headerContained, `${pageCase.label}: header inside viewport`).toBeTruthy();
      expect.soft(actionReachable, `${pageCase.label}: critical action reachable`).toBeTruthy();

      const representativeSelectors = [
        '.ant-table-wrapper:visible', '.ant-form:visible', '.ant-descriptions:visible', '.ant-card:visible',
        '.ant-upload-wrapper:visible', '.ant-steps:visible', '.ant-drawer-content-wrapper:visible', '.ant-modal-content:visible'
      ];
      const containers: Record<string, boolean> = {};
      for (const selector of representativeSelectors) {
        const locator = page.locator(selector).first();
        containers[selector] = await boxInsideViewport(locator, viewport.width, viewport.height);
        expect.soft(containers[selector], `${pageCase.label}: ${selector} boundary`).toBeTruthy();
      }

      if (viewport.key === 'mobile') {
        await page.screenshot({ path: testInfo.outputPath(`${pageCase.key}-${viewport.width}x${viewport.height}-full.png`), fullPage: true });
      }

      results.push({
        page: pageCase.key,
        label: pageCase.label,
        representative: pageCase.representative,
        viewport,
        horizontalOverflow: overflow.horizontal,
        shellContained,
        headerContained,
        criticalActionReachable: actionReachable,
        containers,
        passed: overflow.horizontal <= 1 && shellContained && headerContained && actionReachable && Object.values(containers).every(Boolean)
      });
    }

    const report = {
      issue: 946,
      browser: testInfo.project.name,
      viewport,
      pages: results.length,
      failures: results.filter(result => !result.passed).length,
      results
    };
    writeFileSync(testInfo.outputPath(`responsive-release-${viewport.key}.json`), JSON.stringify(report, null, 2));
    expect.soft(results).toHaveLength(14);
    expect.soft(report.failures, `${viewport.key}: failed formal pages`).toBe(0);
  });
}
