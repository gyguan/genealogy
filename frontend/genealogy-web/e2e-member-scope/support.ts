import { expect, type APIResponse, type Page } from '@playwright/test';

export function requiredEnv(name: string) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`成员范围功能测试缺少环境变量 ${name}`);
  return value;
}

export function requiredNumberEnv(name: string) {
  const value = Number(requiredEnv(name));
  if (!Number.isInteger(value) || value <= 0) throw new Error(`成员范围功能测试环境变量 ${name} 必须是正整数`);
  return value;
}

export async function payload(response: APIResponse) {
  const contentType = response.headers()['content-type'] || '';
  return contentType.includes('application/json') ? response.json() : response.text();
}

export function dataOf(value: any) {
  return value?.data ?? value;
}

export async function okData(response: APIResponse) {
  const value = await payload(response);
  expect(response.ok(), JSON.stringify(value)).toBeTruthy();
  expect(value?.success).not.toBe(false);
  return dataOf(value);
}

export async function login(page: Page, username: string, password: string) {
  await page.context().clearCookies();
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  await page.locator('input#username:visible').fill(username);
  await page.locator('input#password:visible').fill(password);
  await page.locator('button#login_button:visible').click();
  await expect(page.getByRole('menuitem', { name: '族谱首页', exact: true })).toBeVisible();
}

export async function csrfHeaders(page: Page) {
  const cookies = await page.context().cookies();
  const csrfCookie = cookies.find(cookie => cookie.name === 'GENEALOGY_CSRF');
  const csrfToken = csrfCookie ? decodeURIComponent(csrfCookie.value) : '';
  expect(csrfToken, '登录后必须具备 CSRF Cookie').not.toBe('');
  return {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken
  };
}

export function recordsOf(value: any): any[] {
  const data = dataOf(value);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.records)) return data.records;
  return [];
}
