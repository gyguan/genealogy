import { expect, type Page } from '@playwright/test';

type TestRole = 'ADMIN' | 'EDITOR' | 'REVIEWER' | 'VIEWER' | 'RESTRICTED';

function requiredEnv(name: string) {
  const value = String(process.env[name] || '').trim();
  if (!value) {
    throw new Error(`真实功能测试缺少环境变量 ${name}`);
  }
  return value;
}

export function credentials(role: TestRole) {
  const credentialRole = role === 'RESTRICTED' ? 'VIEWER' : role;
  return {
    username: requiredEnv(`FUNCTIONAL_TEST_${credentialRole}_USERNAME`),
    password: requiredEnv(`FUNCTIONAL_TEST_${credentialRole}_PASSWORD`)
  };
}

export async function loginThroughUi(page: Page, role: TestRole = 'ADMIN') {
  const account = credentials(role);
  await page.goto('/');
  await page.locator('input#username').fill(account.username);
  await page.locator('input#password').fill(account.password);
  await page.getByRole('button', { name: '登录系统', exact: true }).click();
  await expect(page.getByRole('menuitem', { name: '族谱首页', exact: true })).toBeVisible();
  await expect(page.getByText('当前模块', { exact: true })).toBeVisible();
  return account;
}

export function functionalRunId() {
  const configured = String(process.env.FUNCTIONAL_TEST_RUN_ID || '').trim();
  if (configured) return configured;
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
