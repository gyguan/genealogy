import { expect, test, type Page } from '@playwright/test';
import { functionalRunId, loginThroughUi } from './support/auth';

async function expectClanWizardStep(page: Page) {
  await expect(page.getByRole('region', { name: '宗族步骤内容', exact: true })).toBeVisible();
  await expect(page.getByText('1/6 · 宗族', { exact: true })).toBeVisible();
}

async function expectBranchWizardStep(page: Page) {
  await expect(page.getByRole('region', { name: '支派步骤内容', exact: true })).toBeVisible();
  await expect(page.getByText('2/6 · 支派', { exact: true })).toBeVisible();
}

async function clanRows(page: Page) {
  const response = await page.request.get('/api/v1/clans');
  expect(response.ok(), await response.text()).toBeTruthy();
  const payload = await response.json();
  const data = payload?.data ?? payload;
  return Array.isArray(data) ? data : data?.records || data?.items || data?.content || [];
}

/**
 * 真实 E2E：禁止使用 page.route Mock 核心业务 API。
 * 测试由功能测试流水线负责启动 PostgreSQL、Spring Boot 和 Vite。
 */
test.describe('真实核心功能冒烟', () => {
  test.describe.configure({ mode: 'serial', retries: 0 });

  test('FT-AUTH-001 管理员可通过真实后端登录', async ({ page }) => {
    const account = await loginThroughUi(page, 'ADMIN');

    const meResponse = await page.request.get('/api/v1/auth/me');
    expect(meResponse.ok()).toBeTruthy();
    const mePayload = await meResponse.json();
    expect(mePayload?.success).not.toBe(false);
    expect(String(mePayload?.data?.username || mePayload?.username || '')).toBe(account.username);
  });

  test('FT-CLAN-001 创建宗族后刷新仍可从真实数据库查询', async ({ page }, testInfo) => {
    await loginThroughUi(page, 'ADMIN');
    const runId = functionalRunId();
    const clanName = `黄氏功能测试宗族-${runId}`;
    const beforeRows = await clanRows(page);
    const alreadyCreated = beforeRows.some((item: { clanName?: string }) => item.clanName === clanName);

    await page.getByRole('menuitem', { name: '建谱向导', exact: true }).click();
    if (!alreadyCreated) {
      await expectClanWizardStep(page);
      await page.getByPlaceholder('例如：江夏堂黄氏宗族').fill(clanName);
      await page.getByPlaceholder('例如：黄').fill('黄');
      await page.getByRole('button', { name: '创建宗族', exact: true }).click();
    }

    await expectBranchWizardStep(page);
    await expect(page.getByText(clanName, { exact: true })).toBeVisible();
    await testInfo.attach('created-clan', {
      body: JSON.stringify({ runId, clanName, alreadyCreated }, null, 2),
      contentType: 'application/json'
    });

    await expect(page).toHaveURL(/step=branch/);
    await page.reload();
    await expectBranchWizardStep(page);
    await expect(page.getByText(clanName, { exact: true })).toBeVisible();

    const afterRows = await clanRows(page);
    expect(afterRows.some((item: { clanName?: string }) => item.clanName === clanName)).toBeTruthy();
  });

  test('FT-NAV-001 建谱深链接在刷新后恢复', async ({ page }) => {
    await loginThroughUi(page, 'ADMIN');
    await page.goto('/?view=mvp1Wizard&step=clan');
    await expectClanWizardStep(page);
    await expect(page).toHaveURL(/view=mvp1Wizard/);
    await expect(page).toHaveURL(/step=clan/);
    await page.reload();
    await expectClanWizardStep(page);
    await expect(page).toHaveURL(/step=clan/);
  });
});
