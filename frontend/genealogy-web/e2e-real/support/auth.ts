import { expect, type Page } from '@playwright/test';

type TestRole = 'ADMIN' | 'EDITOR' | 'REVIEWER' | 'VIEWER';

function requiredEnv(name: string) {
  const value = String(process.env[name] || '').trim();
  if (!value) {
    throw new Error(`真实功能测试缺少环境变量 ${name}`);
  }
  return value;
}

export function credentials(role: TestRole) {
  return {
    username: requiredEnv(`FUNCTIONAL_TEST_${role}_USERNAME`),
    password: requiredEnv(`FUNCTIONAL_TEST_${role}_PASSWORD`)
  };
}

export async function loginThroughUi(page: Page, role: TestRole = 'ADMIN') {
  const account = credentials(role);
  await page.goto('/');
  await page.getByLabel('账号').fill(account.username);
  await page.getByLabel('密码').fill(account.password);
  await page.getByRole('button', { name: '登录系统' }).click();
  await expect(page.getByRole('menuitem', { name: '族谱首页' })).toBeVisible();
  await expect(page.getByText('当前模块')).toBeVisible();
  return account;
}

export function functionalRunId() {
  const configured = String(process.env.FUNCTIONAL_TEST_RUN_ID || '').trim();
  if (configured) return configured;
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
