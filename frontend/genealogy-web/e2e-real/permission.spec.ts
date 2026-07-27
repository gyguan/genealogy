import { expect, test } from '@playwright/test';
import { functionalRunId, loginThroughUi } from './support/auth';

test('FT-PERM-001 查看者不能通过真实接口创建宗族', async ({ page }) => {
  await loginThroughUi(page, 'VIEWER');
  const clanName = `越权创建-${functionalRunId()}`;

  await page.getByRole('menuitem', { name: '建谱向导' }).click();
  await expect(page.getByRole('heading', { name: '建谱向导' })).toBeVisible();
  await page.getByPlaceholder('例如：江夏堂黄氏宗族').fill(clanName);
  await page.getByPlaceholder('例如：黄').fill('黄');
  await page.getByRole('button', { name: '创建宗族' }).click();

  await expect(page.getByText(clanName, { exact: true })).toHaveCount(0);
  await expect(page.getByText(/无权|权限|禁止|FORBIDDEN|403/i).first()).toBeVisible();

  const clansResponse = await page.request.get('/api/v1/clans');
  expect(clansResponse.ok()).toBeTruthy();
  const payload = await clansResponse.json();
  const data = payload?.data ?? payload;
  const rows = Array.isArray(data) ? data : data?.records || data?.items || data?.content || [];
  expect(rows.some((item: { clanName?: string }) => item.clanName === clanName)).toBeFalsy();
});
