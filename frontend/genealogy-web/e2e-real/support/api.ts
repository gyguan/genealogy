import { expect, type APIResponse, type Page } from '@playwright/test';

export function requiredNumberEnv(name: string) {
  const value = Number(String(process.env[name] || '').trim());
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`真实功能测试缺少有效数字环境变量 ${name}`);
  }
  return value;
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

export async function responsePayload(response: APIResponse) {
  const contentType = response.headers()['content-type'] || '';
  return contentType.includes('application/json') ? response.json() : response.text();
}

export function responseData(payload: any) {
  return payload?.data ?? payload;
}
