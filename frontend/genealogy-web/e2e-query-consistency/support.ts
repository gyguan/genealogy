import { expect, type APIResponse, type Browser, type Page } from '@playwright/test';

export function requiredEnv(name: string) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`查询一致性功能测试缺少环境变量 ${name}`);
  return value;
}

export function requiredNumberEnv(name: string) {
  const value = Number(requiredEnv(name));
  if (!Number.isInteger(value) || value <= 0) throw new Error(`查询一致性环境变量 ${name} 必须是正整数`);
  return value;
}

export async function payload(response: APIResponse) {
  const contentType = response.headers()['content-type'] || '';
  return contentType.includes('application/json') ? response.json() : response.text();
}

export function dataOf(value: any) {
  const data = value?.data ?? value;
  if (data
      && !Array.isArray(data)
      && typeof data === 'object'
      && data.source
      && typeof data.source === 'object'
      && Array.isArray(data.bindingSummaries)
      && Array.isArray(data.attachmentSummaries)) {
    return { ...data.source, ...data };
  }
  return data;
}

export function recordsOf(value: any): any[] {
  const data = dataOf(value);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.content)) return data.content;
  return [];
}

export async function okData(response: APIResponse) {
  const value = await payload(response);
  expect(response.ok(), JSON.stringify(value)).toBeTruthy();
  expect(value?.success).not.toBe(false);
  return dataOf(value);
}

export async function expectError(response: APIResponse, status: number, pattern: RegExp) {
  const value = await payload(response);
  expect(response.status(), JSON.stringify(value)).toBe(status);
  expect(JSON.stringify(value)).toMatch(pattern);
  return value;
}

export async function login(page: Page, username: string, password: string) {
  await page.context().clearCookies();
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  await page.locator('input#username').fill(username);
  await page.locator('input#password').fill(password);
  await page.getByRole('button', { name: '登录系统', exact: true }).click();
  await expect(page.getByRole('menuitem', { name: '族谱首页', exact: true })).toBeVisible();
}

export async function loggedPage(browser: Browser, username: string, password: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await login(page, username, password);
  return { context, page };
}

export async function csrfHeaders(page: Page) {
  const cookies = await page.context().cookies();
  const csrfCookie = cookies.find(cookie => cookie.name === 'GENEALOGY_CSRF');
  const csrfToken = csrfCookie ? decodeURIComponent(csrfCookie.value) : '';
  expect(csrfToken, '登录后必须具备 CSRF Cookie').not.toBe('');
  return { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken };
}

export function positiveId(value: any, label: string) {
  const id = Number(value?.id ?? value?.targetId ?? value?.reviewTaskId ?? value?.taskId ?? value?.revisionId);
  expect(id, `${label} 必须返回有效 ID`).toBeGreaterThan(0);
  return id;
}

export function statusOf(value: any) {
  return String(value?.dataStatus ?? value?.verificationStatus ?? value?.bindingStatus ?? value?.status ?? '').toLowerCase();
}

export async function approveTask(page: Page, taskId: number, comment: string) {
  const headers = await csrfHeaders(page);
  const data = await okData(await page.request.post(`/api/v1/review-tasks/${taskId}/approve`, {
    headers,
    data: { reviewerId: null, comment }
  }));
  expect(statusOf(data)).toBe('approved');
  return data;
}
